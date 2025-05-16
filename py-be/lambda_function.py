import json
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
import requests
# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# MongoDB connection string
# MONGO_URI = os.environ.get('MONGO_URI')
MONGO_URI = "mongodb+srv://racewonder74:xlUxha1xlsbtJpJf@rizz.c3phar4.mongodb.net/test"

def lambda_handler(event, context):
    """
    AWS Lambda function that runs at 6 PM daily
    """
    try:
        # Get current time
        current_time = datetime.now()
        logger.info(f"Function executed at: {current_time}")

        logger.info(f"Attempting to connect to MongoDB with URI: {MONGO_URI}")
        
        # Connect to MongoDB with SSL configuration
        client = MongoClient(MONGO_URI)

        # Select the database and collection
        db = client.get_database()  # This will use the database specified in the connection string
        requestsCollection = db.connectrequests  # Replace 'profiles' with your actual collection name
        profilesCollection = db.profiles
        chatroomsCollection = db.chatrooms

        pendingRequests = list(requestsCollection.find({"requestType": "surpriseMe", "status": "pending"}))
        
        logger.info(f"Processing {len(pendingRequests)} requests")
        
        # Process requests
        processedChatrooms = []
        randomMatchedUsers = {}
        for request in pendingRequests:
            # Update the request with a new field 'processed' set to True
            requestedUserId = request["userId"]
            if requestedUserId in randomMatchedUsers:
                requestsCollection.update_one(
                    {"requestType": "surpriseMe", "status": "pending", "userId": requestedUserId},
                    {'$set': {'status': 'matched', "matchedAt": datetime.now(), "matchedUserId": randomMatchedUsers[requestedUserId]}}
                )   
                continue
            # Find other profiles excluding the requesting user and those they already have chatrooms with
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

            if not other_profiles:
                logger.info(f"No matching profiles found for user {requestedUserId}")
                continue

            # Select a random profile from the available matches
            import random
            matched_profile = random.choice(other_profiles)
            matchedUserId = matched_profile["userId"]
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
            chatroomsCollection.insert_one(chatroom)
            processedChatrooms.append(chatroom)

        client.close()

        logger.info(f"Processed {len(processedChatrooms)} chatrooms")
        # Make HTTP POST request to Node.js backend
        
        node_backend_url = "https://rizz-be.racewonder.cam/api/lambda"  # Update with actual URL

        print(processedChatrooms)

        # Get all userIds from processed chatrooms
        processed_user_ids = set()
        for chatroom in processedChatrooms:
            processed_user_ids.update(chatroom["participants"])
            
        # Find pending requests that weren't matched and mark them as expired
        unmatched_user_ids = [req["userId"] for req in pendingRequests if req["userId"] not in processed_user_ids]
        
        if unmatched_user_ids:
            forty_hours_ago = datetime.now() - timedelta(hours=40)
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
        
        try:
            # Convert ObjectId to string before serializing to JSON
            serializable_chatrooms = []
            for chatroom in processedChatrooms:
                chatroom_copy = chatroom.copy()
                if '_id' in chatroom_copy:
                    chatroom_copy['_id'] = str(chatroom_copy['_id'])
                serializable_chatrooms.append(chatroom_copy)
                
            response = requests.post(
                node_backend_url,
                json={"chatrooms": serializable_chatrooms},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to notify Node backend: {response.text}")

            logger.info(f"Successfully notified Node backend")
                
        except Exception as e:
            logger.error(f"Error notifying Node backend: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
