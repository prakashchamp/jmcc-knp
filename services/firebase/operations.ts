import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  Query,
  QueryDocumentSnapshot,
  DocumentData,
  Transaction,
  runTransaction,
} from 'firebase/firestore';
import { db } from './db';
import { FirestoreDocument, QueryCondition, BatchOperation, WriteResult } from './types';
import { createSuccessResult, createErrorResult, deepClone } from './utils';

/**
 * Fetch a single document from Firestore
 * @param collectionName - Name of the collection
 * @param docId - Document ID
 * @returns Document data with id, or null if not found
 */
export async function getDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string
): Promise<FirestoreDocument<T> | null> {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnapshot = await getDoc(docRef);

    if (!docSnapshot.exists()) {
      return null;
    }

    return {
      id: docSnapshot.id,
      data: docSnapshot.data() as T,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error(`Error fetching document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Fetch multiple documents from a collection
 * @param collectionName - Name of the collection
 * @param conditions - Array of query conditions
 * @returns Array of documents matching conditions
 */
export async function getCollection<T extends Record<string, any>>(
  collectionName: string,
  conditions?: QueryCondition[]
): Promise<FirestoreDocument<T>[]> {
  try {
    const collectionRef = collection(db, collectionName);

    let q: Query;
    if (conditions && conditions.length > 0) {
      const whereConditions = conditions.map((condition) =>
        where(condition.field, condition.operator as any, condition.value)
      );
      q = query(collectionRef, ...whereConditions);
    } else {
      q = query(collectionRef);
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((document) => ({
      id: document.id,
      data: document.data() as T,
      updatedAt: new Date(),
    }));
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Create or overwrite a document
 * @param collectionName - Name of the collection
 * @param docId - Document ID
 * @param data - Document data
 * @param merge - If true, merge with existing data; if false, overwrite
 * @returns Write result with success status and docId
 */
export async function setDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T,
  merge = false
): Promise<WriteResult> {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleanedData = deepClone(data);
    const dataWithTimestamp = {
      ...cleanedData,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, dataWithTimestamp, { merge });
    return createSuccessResult(docId);
  } catch (error) {
    console.error(`Error setting document in ${collectionName}:`, error);
    return createErrorResult(error as Error);
  }
}

/**
 * Update specific fields in a document
 * @param collectionName - Name of the collection
 * @param docId - Document ID
 * @param data - Partial data to update
 * @returns Write result with success status
 */
export async function updateDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: Partial<T>
): Promise<WriteResult> {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleanedData = deepClone(data);
    const dataWithTimestamp = {
      ...cleanedData,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(docRef, dataWithTimestamp);
    return createSuccessResult(docId);
  } catch (error) {
    console.error(`Error updating document in ${collectionName}:`, error);
    return createErrorResult(error as Error);
  }
}

/**
 * Delete a document
 * @param collectionName - Name of the collection
 * @param docId - Document ID
 * @returns Write result with success status
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<WriteResult> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return createSuccessResult(docId);
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return createErrorResult(error as Error);
  }
}

/**
 * Perform multiple write operations in a single batch
 * Atomic: all operations succeed or all fail
 * @param operations - Array of batch operations
 * @returns Array of write results
 */
export async function batchWrite(operations: BatchOperation[]): Promise<WriteResult[]> {
  try {
    const batch = writeBatch(db);

    operations.forEach((op) => {
      const docRef = doc(db, op.collection, op.docId);

      switch (op.type) {
        case 'set':
          batch.set(docRef, { ...deepClone(op.data), updatedAt: new Date().toISOString() }, { merge: op.options?.merge });
          break;
        case 'update':
          batch.update(docRef, { ...deepClone(op.data), updatedAt: new Date().toISOString() });
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });

    await batch.commit();
    return operations.map((op) => createSuccessResult(op.docId));
  } catch (error) {
    console.error('Error executing batch write:', error);
    return operations.map(() => createErrorResult(error as Error));
  }
}

/**
 * Run a transaction (read-modify-write atomic operation)
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
export async function runTransactionOperation<T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<T> {
  try {
    return await runTransaction(db, callback);
  } catch (error) {
    console.error('Error running transaction:', error);
    throw error;
  }
}

/**
 * Convenience: get a document by ID and return just the data
 * Useful when you're confident the document exists
 */
export async function getDocumentData<T extends Record<string, any>>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  const doc = await getDocument<T>(collectionName, docId);
  return doc?.data || null;
}

/**
 * Convenience: get all collection documents as raw data (without id wrapper)
 */
export async function getCollectionData<T extends Record<string, any>>(
  collectionName: string,
  conditions?: QueryCondition[]
): Promise<T[]> {
  const docs = await getCollection<T>(collectionName, conditions);
  return docs.map((doc) => doc.data);
}
