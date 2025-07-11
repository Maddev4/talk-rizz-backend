import json
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
import requests
import copy

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# MongoDB connection string
MONGO_URI = "mongodb+srv://racewonder74:xlUxha1xlsbtJpJf@rizz.c3phar4.mongodb.net/test"

def process_mongodb_operations():
    """
    Function to handle all MongoDB operations and return the results
    This ensures all MongoDB operations are completed before the client is closed
    """
    result = {
        'processedChatrooms': [],
        'pendingRequests': [],
        'error': None
    }
    
    client = None
    try:
        print("[DEBUG] Creating MongoDB client for all operations")
        client = MongoClient(MONGO_URI)
        
        # Select the database and collection
        db = client.get_database()
        requestsCollection = db.connectrequests
        profilesCollection = db.profiles
        chatroomsCollection = db.chatrooms
        
        # Get all pending requests
        pendingRequests = list(requestsCollection.find({"requestType": "surpriseMe", "status": "pending"}))
        result['pendingRequests'] = copy.deepcopy(pendingRequests)  # Make a deep copy to avoid reference issues
        print(f"[DEBUG] Found {len(pendingRequests)} pending requests")
        
        # Process requests
        processedChatrooms = []
        randomMatchedUsers = {}
        
        for request in pendingRequests:
            try:
                requestedUserId = request["userId"]
                print(f"[DEBUG] Processing request for userId: {requestedUserId}")
                
                if requestedUserId in randomMatchedUsers:
                    print(f"[DEBUG] User {requestedUserId} already matched, updating request status.")
                    requestsCollection.update_one(
                        {"requestType": "surpriseMe", "status": "pending", "userId": requestedUserId},
                        {'$set': {'status': 'matched', "matchedAt": datetime.now(), "matchedUserId": randomMatchedUsers[requestedUserId]}}
                    )   
                    continue
                    
                # Find other profiles excluding the requesting user and those they already have chatrooms with
                print(f"[DEBUG] Aggregating other profiles for userId: {requestedUserId}")
                other_profiles = list(profilesCollection.aggregate([
                    {
                        "$match": {"userId": {"$ne": requestedUserId}}
                    },
                    {
                        "$lookup": {
                            "from": "chatrooms",
                            "let": {"profileUserId": "$userId"},
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {"$in": ["$$profileUserId", "$participants"]},
                                                {"$in": [requestedUserId, "$participants"]}
                                            ]
                                        }
                                    }
                                }
                            ],
                            "as": "existingChatrooms"
                        }
                    },
                    {
                        "$match": {
                            "existingChatrooms": {"$size": 0}
                        }
                    },
                    {
                        "$lookup": {
                            "from": "connectrequests",
                            "let": {"profileUserId": "$userId"},
                            "pipeline": [
                                {
                                    "$match": {
                                        "$expr": {
                                            "$and": [
                                                {"$eq": ["$userId", "$$profileUserId"]},
                                                {"$eq": ["$requestType", "surpriseMe"]},
                                                {"$eq": ["$status", "pending"]}
                                            ]
                                        }
                                    }
                                }
                            ],
                            "as": "connectRequest"
                        }
                    },
                    {
                        "$match": {
                            "connectRequest": {"$not": {"$size": 0}}
                        }
                    },
                    {
                        "$project": {
                            "existingChatrooms": 0,
                            "connectRequest": 0
                        }
                    }
                ]))
                print(f"[DEBUG] Found {len(other_profiles)} other profiles for userId: {requestedUserId}")

                if not other_profiles:
                    logger.info(f"No matching profiles found for user {requestedUserId}")
                    print(f"[DEBUG] No matching profiles found for user {requestedUserId}")
                    continue

                # Select a random profile from the available matches
                import random
                matched_profile = random.choice(other_profiles)
                matchedUserId = matched_profile["userId"]
                print(f"[DEBUG] Matched userId {matchedUserId} for userId {requestedUserId}")
                randomMatchedUsers[matchedUserId] = requestedUserId
                
                requestsCollection.update_one(
                    {"requestType": "surpriseMe", "status": "pending", "userId": request["userId"]},
                    {'$set': {'status': 'matched', "matchedAt": datetime.now(), "matchedUserId": matchedUserId}}
                )
                
                # Create a new chatroom
                chatroom = {
                    "participants": [requestedUserId, matchedUserId],
                    "type": "direct",
                    "category": "surprise-me"
                }
                
                insert_result = chatroomsCollection.insert_one(chatroom)
                chatroom_copy = chatroom.copy()
                chatroom_copy['_id'] = str(insert_result.inserted_id)  # Convert ObjectId to string
                print(f"[DEBUG] Inserted new chatroom: {chatroom_copy}")
                processedChatrooms.append(chatroom_copy)
                
            except Exception as process_exc:
                print(f"[ERROR] Exception while processing request for userId {request.get('userId')}: {process_exc}")
                logger.error(f"Exception while processing request for userId {request.get('userId')}: {process_exc}")
        
        # Get all userIds from processed chatrooms
        processed_user_ids = set()
        for chatroom in processedChatrooms:
            processed_user_ids.update(chatroom["participants"])
        
        # Find pending requests that weren't matched and mark them as expired
        unmatched_user_ids = [req["userId"] for req in pendingRequests if req["userId"] not in processed_user_ids]
        
        if unmatched_user_ids:
            forty_hours_ago = datetime.now() - timedelta(hours=40)
            print(f"[DEBUG] Marking unmatched requests older than 40 hours as expired. Time threshold: {forty_hours_ago}")
            
            requestsCollection.update_many(
                {
                    "userId": {"$in": unmatched_user_ids},
                    "status": "pending", 
                    "requestType": "surpriseMe",
                    "createdAt": {"$lt": forty_hours_ago}
                },
                {
                    "$set": {
                        "status": "expired"
                    }
                }
            )
            logger.info(f"Marked {len(unmatched_user_ids)} unmatched requests older than 40 hours as expired")
        
        # Store processed chatrooms in result
        result['processedChatrooms'] = processedChatrooms
        
    except Exception as e:
        print(f"[ERROR] Exception in MongoDB operations: {str(e)}")
        result['error'] = str(e)
    finally:
        # Always close the client
        if client:
            print("[DEBUG] Closing MongoDB client")
            client.close()
    
    return result

def lambda_handler(event, context):
    """
    AWS Lambda function that runs at 6 PM daily
    """
    try:
        # Get current time
        current_time = datetime.now()
        logger.info(f"Function executed at: {current_time}")
        print(f"[DEBUG] Function executed at: {current_time}")

        logger.info(f"Attempting to connect to MongoDB with URI: {MONGO_URI}")
        print(f"[DEBUG] Attempting to connect to MongoDB with URI: {MONGO_URI}")
        
        # Process all MongoDB operations in a separate function
        # This ensures all operations are completed before the client is closed
        mongo_result = process_mongodb_operations()
        
        if mongo_result['error']:
            raise Exception(f"MongoDB operations failed: {mongo_result['error']}")
            
        processedChatrooms = mongo_result['processedChatrooms']
        pendingRequests = mongo_result['pendingRequests']
        
        logger.info(f"Processed {len(processedChatrooms)} chatrooms")
        print(f"[DEBUG] Processed {len(processedChatrooms)} chatrooms")
        
        # Make HTTP POST request to Node.js backend
        node_backend_url = "https://rizz-be.racewonder.cam/api/lambda"  # Update with actual URL
        print(f"[DEBUG] Processed chatrooms: {processedChatrooms}")
        
        try:
            # Chatrooms are already serialized (ObjectId converted to string)
            print(f"[DEBUG] Notifying Node backend at {node_backend_url} with chatrooms: {processedChatrooms}")
            
            response = requests.post(
                node_backend_url,
                json={"chatrooms": processedChatrooms},
                headers={"Content-Type": "application/json"}
            )
            print(f"[DEBUG] Node backend response status: {response.status_code}")
            print(f"[DEBUG] Node backend response text: {response.text}")
            
            if response.status_code != 200:
                logger.error(f"Failed to notify Node backend: {response.text}")
                print(f"[ERROR] Failed to notify Node backend: {response.text}")
            else:
                logger.info(f"Successfully notified Node backend")
                print(f"[DEBUG] Successfully notified Node backend")
                
        except Exception as e:
            logger.error(f"Error notifying Node backend: {str(e)}")
            print(f"[ERROR] Exception while notifying Node backend: {str(e)}")
        
        # Return success response
        print(f"[DEBUG] Function completed successfully. Returning success response.")
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Lambda function executed successfully',
                'timestamp': current_time.isoformat(),
                'processed_chatrooms': len(processedChatrooms),
                'pending_requests': len(pendingRequests)
            })
        }
        
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        print(f"[ERROR] Exception in lambda_handler: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
