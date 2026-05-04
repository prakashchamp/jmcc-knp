import { LiveMatch } from './cricket-scorer-types';

export interface StoredMatch {
  id: string;
  match: LiveMatch;
  completedAt: string;
}

const DB_NAME = 'JMCC_Scorer_DB';
const STORE_NAME = 'completed_matches';
const DB_VERSION = 1;

/**
 * Open the IndexedDB database
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save a completed match to IndexedDB
 */
export async function saveMatchToIndexedDB(match: LiveMatch): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const storedMatch: StoredMatch = {
      id: match.id,
      match,
      completedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(storedMatch);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save match to IndexedDB:', error);
  }
}

/**
 * Get all completed matches from IndexedDB
 */
export async function getAllMatchesFromIndexedDB(): Promise<StoredMatch[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get matches from IndexedDB:', error);
    return [];
  }
}

/**
 * Cleanup matches older than 5 days
 */
export async function cleanupOldMatches(): Promise<void> {
  try {
    const matches = await getAllMatchesFromIndexedDB();
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const storedMatch of matches) {
      const completedAt = new Date(storedMatch.completedAt);
      if (completedAt < fiveDaysAgo) {
        store.delete(storedMatch.id);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old matches in IndexedDB:', error);
  }
}

/**
 * Get a specific match by ID
 */
export async function getMatchFromIndexedDB(id: string): Promise<LiveMatch | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const result = request.result as StoredMatch;
        resolve(result ? result.match : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get match from IndexedDB:', error);
    return null;
  }
}
