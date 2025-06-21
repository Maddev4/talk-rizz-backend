import firebase from "firebase-admin";
import { Profile } from '../models/profile.model';

// Initialize Firebase Admin SDK if not already initialized
let admin: firebase.app.App;
if (!firebase.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? 
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : 
    require("../../firebase-service-account.json");
  
  admin = firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
  });
} else {
  admin = firebase.apps[0]!;
}

export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    // Find user's profile to get their device token
    const profile = await Profile.findOne({ userId });
    
    if (!profile?.deviceToken) {
      console.log(`User ${userId} has no registered device token`);
      return false;
    }

    // Handle notifications differently based on platform
    if (profile.devicePlatform === 'android') {
      return await sendFCMNotification(profile.deviceToken, title, body, data);
    } else {
      // Default iOS notification format (using FCM for iOS)
      return await sendAPNNotification(profile.deviceToken, title, body, data);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    return false;
  }
};

// Send notification via FCM to Android devices
const sendFCMNotification = async (
  token: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Standard Android action
      },
      android: {
        priority: 'high' as 'high', // Explicitly type as 'high'
        notification: {
          sound: 'default',
          channelId: 'chat-messages',
          priority: 'high' as 'high', // Type as literal 'high'
          defaultSound: true,
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent:', response);
    return true;
  } catch (error) {
    console.error('Error sending FCM notification:', error);
    return false;
  }
};

// Send notification to iOS devices
const sendAPNNotification = async (
  token: string,
  title: string,
  body: string,
  data: any = {}
) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data,
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title,
              body,
            },
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('APN notification sent:', response);
    return true;
  } catch (error) {
    console.error('Error sending APN notification:', error);
    return false;
  }
};

export default admin; 