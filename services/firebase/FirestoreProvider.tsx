'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react';
import { FirestoreDocument, QueryCondition } from './types';
import { getDocument, getCollection } from './operations';

/**
 * Firestore context for caching and sharing data across components
 */
interface FirestoreContextType {
  cache: Map<string, FirestoreDocument<any>>;
  collectionCache: Map<string, FirestoreDocument<any>[]>;
  loadDocument: <T extends Record<string, any>>(
    collection: string,
    docId: string
  ) => Promise<FirestoreDocument<T> | null>;
  loadCollection: <T extends Record<string, any>>(
    collection: string,
    conditions?: QueryCondition[]
  ) => Promise<FirestoreDocument<T>[]>;
  clearCache: () => void;
  getCachedDocument: (collection: string, docId: string) => FirestoreDocument<any> | null;
  getCachedCollection: (collection: string) => FirestoreDocument<any>[] | null;
}

const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

/**
 * Provider component that wraps your app or specific subtrees
 * Enables shared caching of Firestore data
 */
export function FirestoreProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState(new Map<string, FirestoreDocument<any>>());
  const [collectionCache, setCollectionCache] = useState(
    new Map<string, FirestoreDocument<any>[]>()
  );

  const getCacheKey = (collection: string, docId?: string) =>
    docId ? `${collection}/${docId}` : collection;

  const getCachedDocument = useCallback(
    (collection: string, docId: string) => {
      return cache.get(getCacheKey(collection, docId)) || null;
    },
    [cache]
  );

  const getCachedCollection = useCallback(
    (collection: string) => {
      return collectionCache.get(collection) || null;
    },
    [collectionCache]
  );

  const loadDocument = useCallback(
    async <T extends Record<string, any>>(
      collection: string,
      docId: string
    ): Promise<FirestoreDocument<T> | null> => {
      const cacheKey = getCacheKey(collection, docId);
      const cached = cache.get(cacheKey);

      if (cached) {
        return cached as FirestoreDocument<T>;
      }

      try {
        const doc = await getDocument<T>(collection, docId);
        if (doc) {
          setCache((prev) => new Map(prev).set(cacheKey, doc));
        }
        return doc;
      } catch (error) {
        console.error('Error loading document in context:', error);
        return null;
      }
    },
    [cache]
  );

  const loadCollection = useCallback(
    async <T extends Record<string, any>>(
      collection: string,
      conditions?: QueryCondition[]
    ): Promise<FirestoreDocument<T>[]> => {
      const cacheKey = getCacheKey(collection);
      const cached = collectionCache.get(cacheKey);

      // Only return cache if no conditions specified (conditions may vary)
      if (cached && !conditions) {
        return cached as FirestoreDocument<T>[];
      }

      try {
        const docs = await getCollection<T>(collection, conditions);
        if (!conditions) {
          setCollectionCache((prev) => new Map(prev).set(cacheKey, docs));
        }
        return docs;
      } catch (error) {
        console.error('Error loading collection in context:', error);
        return [];
      }
    },
    [collectionCache]
  );

  const clearCache = useCallback(() => {
    setCache(new Map());
    setCollectionCache(new Map());
  }, []);

  const value: FirestoreContextType = {
    cache,
    collectionCache,
    loadDocument,
    loadCollection,
    clearCache,
    getCachedDocument,
    getCachedCollection,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
}

/**
 * Hook to access Firestore context
 * Throws error if used outside FirestoreProvider
 */
export function useFirestoreContext() {
  const context = useContext(FirestoreContext);
  if (!context) {
    throw new Error('useFirestoreContext must be used within FirestoreProvider');
  }
  return context;
}
