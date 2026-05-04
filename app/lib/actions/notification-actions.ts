'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';
import * as admin from 'firebase-admin';

/**
 * Send a push notification to all users subscribed to the 'match_updates' topic.
 */
export async function sendMatchUpdateNotification(title: string, body: string, data?: Record<string, string>) {
  return { success: true, message: 'Push notifications temporarily disabled' };
  try {
    getFirebaseAdmin(); // Ensure initialized
    const messaging = admin.messaging();

    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type: 'MATCH_UPDATE',
        ...data,
      },
      topic: 'match_updates',
    };

    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return { success: true, response };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error };
  }
}

/**
 * Subscribe a token to the 'match_updates' topic.
 */
export async function subscribeToMatchUpdates(token: string) {
  try {
    getFirebaseAdmin(); // Ensure initialized
    const messaging = admin.messaging();

    const response = await messaging.subscribeToTopic(token, 'match_updates');
    console.log('Successfully subscribed to topic:', response);
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return { success: false, error };
  }
}
