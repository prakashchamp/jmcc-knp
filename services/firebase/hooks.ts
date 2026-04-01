'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDocument,
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  batchWrite,
} from './operations';
import {
  FirestoreDocument,
  HookState,
  QueryCondition,
  BatchOperation,
  UseFirestoreWriteReturn,
} from './types';
import {
  createLoadingState,
  createSuccessState,
  createErrorState,
} from './utils';

/**
 * Hook to fetch a single document
 * Auto-fetches on mount and when dependencies change
 * @param collectionName - Name of the collection
 * @param docId - Document ID (if null, skips fetching)
 * @returns HookState with data, loading, and error
 */
export function useDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string | null
): HookState<FirestoreDocument<T> | null> {
  const [state, setState] = useState<HookState<FirestoreDocument<T> | null>>(createLoadingState());

  useEffect(() => {
    if (!docId) {
      setState(createSuccessState(null));
      return;
    }

    const fetchDocument = async () => {
      setState(createLoadingState());
      try {
        const doc = await getDocument<T>(collectionName, docId);
        setState(createSuccessState(doc));
      } catch (error) {
        setState(createErrorState(error as Error));
      }
    };

    fetchDocument();
  }, [collectionName, docId]);

  return state;
}

/**
 * Hook to fetch a collection of documents
 * Auto-fetches on mount and when conditions change
 * @param collectionName - Name of the collection
 * @param conditions - Optional query conditions
 * @returns HookState with array of documents, loading, and error
 */
export function useCollection<T extends Record<string, any>>(
  collectionName: string,
  conditions?: QueryCondition[]
): HookState<FirestoreDocument<T>[]> {
  const [state, setState] = useState<HookState<FirestoreDocument<T>[]>>(createLoadingState());

  useEffect(() => {
    const fetchCollection = async () => {
      setState(createLoadingState());
      try {
        const docs = await getCollection<T>(collectionName, conditions);
        setState(createSuccessState(docs));
      } catch (error) {
        setState(createErrorState(error as Error));
      }
    };

    fetchCollection();
  }, [collectionName, JSON.stringify(conditions)]);

  return state;
}

/**
 * Hook for writing data to Firestore
 * Provides a write function and loading/error states
 * @returns Object with write function and states
 */
export function useFirestoreWrite(): UseFirestoreWriteReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const write = useCallback(async (operations: BatchOperation | BatchOperation[]) => {
    setLoading(true);
    setError(null);

    try {
      const operationsList = Array.isArray(operations) ? operations : [operations];

      if (operationsList.length === 1) {
        const op = operationsList[0];
        switch (op.type) {
          case 'set':
            return await setDocument(op.collection, op.docId, op.data || {}, op.options?.merge);
          case 'update':
            return await updateDocument(op.collection, op.docId, op.data || {});
          case 'delete':
            return await deleteDocument(op.collection, op.docId);
        }
      } else {
        return await batchWrite(operationsList);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { write, loading, error };
}

/**
 * Hook for reading and writing a specific document with optimistic updates
 * Combines useDocument and write capability
 * @param collectionName - Name of the collection
 * @param docId - Document ID
 * @returns Object with document state, mutate function, and write states
 */
export function useDocumentMutate<T extends Record<string, any>>(
  collectionName: string,
  docId: string | null
) {
  const documentState = useDocument<T>(collectionName, docId);
  const writeState = useFirestoreWrite();

  const mutate = useCallback(
    async (data: Partial<T>, type: 'update' | 'set' = 'update') => {
      if (!docId) throw new Error('Document ID is required for mutation');

      const operation: BatchOperation = {
        type,
        collection: collectionName,
        docId,
        data,
      };

      return writeState.write(operation);
    },
    [collectionName, docId, writeState]
  );

  return {
    ...documentState,
    mutate,
    mutating: writeState.loading,
    mutateError: writeState.error,
  };
}

/**
 * Hook for reading and writing to a collection with optimistic updates
 * @param collectionName - Name of the collection
 * @param conditions - Optional query conditions
 * @returns Object with collection state, mutate function, and write states
 */
export function useCollectionMutate<T extends Record<string, any>>(
  collectionName: string,
  conditions?: QueryCondition[]
) {
  const collectionState = useCollection<T>(collectionName, conditions);
  const writeState = useFirestoreWrite();

  const add = useCallback(
    async (data: T) => {
      const docId = Date.now().toString();
      const operation: BatchOperation = {
        type: 'set',
        collection: collectionName,
        docId,
        data,
      };
      return writeState.write(operation);
    },
    [collectionName, writeState]
  );

  const update = useCallback(
    async (docId: string, data: Partial<T>) => {
      const operation: BatchOperation = {
        type: 'update',
        collection: collectionName,
        docId,
        data,
      };
      return writeState.write(operation);
    },
    [collectionName, writeState]
  );

  const remove = useCallback(
    async (docId: string) => {
      const operation: BatchOperation = {
        type: 'delete',
        collection: collectionName,
        docId,
      };
      return writeState.write(operation);
    },
    [collectionName, writeState]
  );

  return {
    ...collectionState,
    add,
    update,
    remove,
    mutating: writeState.loading,
    mutateError: writeState.error,
  };
}
