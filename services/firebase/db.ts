import { getFirestore, Firestore } from 'firebase/firestore';
import { app } from './config';

/**
 * Get Firestore instance (singleton)
 * Firestore is lazily initialized when first accessed
 */
export const db: Firestore = getFirestore(app);

export default db;
