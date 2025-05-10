import json
import logging
from datetime import datetime
from pymongo import MongoClient
import os
import requests
# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# MongoDB connection string
MONGO_URI = os.environ.get('MONGO_URI')

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
        for request in pendingRequests:
            # Update the request with a new field 'processed' set to True
            randomUserId = request["userId"]
            # Find other profiles excluding the requesting user and those they already have chatrooms with
            other_profiles = list(profilesCollection.aggregate([
                {
                    "$match": {"userId": {"$ne": randomUserId}}
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
                                            {"$in": [randomUserId, "$participants"]}
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
                    "$project": {
                        "existingChatrooms": 0
                    }
                }
            ]))

            if not other_profiles:
                logger.info(f"No matching profiles found for user {randomUserId}")
                continue

            # Select a random profile from the available matches
            import random
            matched_profile = random.choice(other_profiles)
            randomUserId = matched_profile["userId"]
            requestsCollection.update_one(
                {"requestType": "surpriseMe", "status": "pending", "userId": request["userId"]},
                {'$set': {'status': 'matched', "matchedAt": datetime.now(), "matchedUserId": randomUserId}}
            )
            # Create a new chatroom
            chatroom = {
                "participants": [request["userId"], randomUserId],
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
