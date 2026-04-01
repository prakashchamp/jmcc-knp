import { initializeApp, getApps, getApp } from 'firebase/app';

/**
 * Firebase configuration from environment variables
 * These should be set in .env.local file
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Validate that all required Firebase configuration is present
 */
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ] as const;

  const missing = requiredFields.filter((field) => !firebaseConfig[field]);

  if (missing.length > 0) {
    console.warn(
      `Missing Firebase configuration: ${missing.join(', ')}. ` +
        'Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.'
    );
  }
}

// Validate config on module load (development warning only)
if (typeof window !== 'undefined') {
  validateFirebaseConfig();
}

/**
 * Initialize Firebase app (singleton pattern)
 * Returns existing app if already initialized, otherwise creates new one
 */
export function initializeFirebase() {
  const apps = getApps();
  if (apps.length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

/**
 * Get the initialized Firebase app
 */
export const app = initializeFirebase();

export default app;
