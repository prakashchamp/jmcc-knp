import * as admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK only once
 * Returns the Firestore instance
 */
export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      // Admin SDK requires snake_case keys for the certificate
      const serviceAccount = {
        project_id: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID,
        client_email: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
        private_key: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      };

      if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('Missing Firebase Admin environment variables: NEXT_PRIVATE_FIREBASE_PROJECT_ID, NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL, or NEXT_PRIVATE_FIREBASE_PRIVATE_KEY');
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      console.log('Firebase Admin initialized');
    } catch (error) {
      console.error('Firebase Admin init error:', error);
      throw error;
    }
  }
  return admin.firestore();
}
