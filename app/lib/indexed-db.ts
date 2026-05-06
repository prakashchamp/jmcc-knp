import { LiveMatch } from './cricket-scorer-types';
import type { Team } from './cricket-schema';

export interface StoredMatch {
  id: string;
  match: LiveMatch;
  completedAt: string;
}

const DB_NAME = 'JMCC_Scorer_DB';
const MATCH_STORE = 'completed_matches';
const TEAM_STORE = 'team_roster';
const DB_VERSION = 1;

/**
 * Open the IndexedDB database
 */
export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MATCH_STORE)) {
        db.createObjectStore(MATCH_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TEAM_STORE)) {
        db.createObjectStore(TEAM_STORE, { keyPath: 'id' });
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
    const transaction = db.transaction(MATCH_STORE, 'readwrite');
    const store = transaction.objectStore(MATCH_STORE);

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

export async function saveTeamToIndexedDB(team: Team): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(TEAM_STORE, 'readwrite');
    const store = transaction.objectStore(TEAM_STORE);

    return new Promise((resolve, reject) => {
      const request = store.put(team);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to save team to IndexedDB:', error);
  }
}

/**
 * Get all completed matches from IndexedDB
 */
export async function getAllMatchesFromIndexedDB(): Promise<StoredMatch[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(MATCH_STORE, 'readonly');
    const store = transaction.objectStore(MATCH_STORE);

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

export async function getPrimaryTeamFromIndexedDB(): Promise<Team | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(TEAM_STORE, 'readonly');
    const store = transaction.objectStore(TEAM_STORE);

    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (cursor) {
          resolve(cursor.value as Team);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get team from IndexedDB:', error);
    return null;
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
    const transaction = db.transaction(MATCH_STORE, 'readwrite');
    const store = transaction.objectStore(MATCH_STORE);

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
    const transaction = db.transaction(MATCH_STORE, 'readonly');
    const store = transaction.objectStore(MATCH_STORE);

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
