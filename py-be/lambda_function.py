import json
import logging
from datetime import datetime
from pymongo import MongoClient
import os
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
        profiles_collection = db.profiles  # Replace 'profiles' with your actual collection name

        # # Fetch profiles
        profiles = list(profiles_collection.find())
        
        logger.info(f"Processing {len(profiles)} profiles")
        
        # Process profiles
        processed_profiles = process_profiles(profiles)
        
        client.close()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Profiles processed successfully',
                'timestamp': current_time.isoformat(),
                'profiles_count': len(processed_profiles),
                'profiles': processed_profiles
            }, default=str)  # Use default=str to handle non-serializable objects like ObjectId
        }
        
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }

def process_profiles(profiles):
    """
    Process the profiles fetched from MongoDB.
    """
    processed_profiles = []
    for profile in profiles:
        processed_profile = {
            'name': profile.get('name', ''),
            'age': profile.get('age', 0),
            'bio': profile.get('bio', ''),
            'processed_at': datetime.now().isoformat()
        }
        processed_profiles.append(processed_profile)
    
    return processed_profiles