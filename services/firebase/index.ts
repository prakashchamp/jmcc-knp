/**
 * Firebase Firestore Module
 * Complete Firestore integration for Next.js with React hooks
 */

// Configuration and initialization
export { app } from './config';
export { db } from './db';

// Core operations
export {
  getDocument,
  getCollection,
  setDocument,
  updateDocument,
  deleteDocument,
  batchWrite,
  runTransactionOperation,
  getDocumentData,
  getCollectionData,
} from './operations';

// React hooks
export {
  useDocument,
  useCollection,
  useFirestoreWrite,
  useDocumentMutate,
  useCollectionMutate,
} from './hooks';

// Context and provider
export {
  FirestoreProvider,
  useFirestoreContext,
} from './FirestoreProvider';

// Types
export type {
  FirestoreDocument,
  HookState,
  QueryCondition,
  WriteOptions,
  BatchOperation,
  WriteResult,
  UseFirestoreWriteReturn,
  DocumentValidator,
} from './types';

// Utilities
export {
  createLoadingState,
  createSuccessState,
  createErrorState,
  createSuccessResult,
  createErrorResult,
  firestoreTimestampToDate,
  dateToFirestoreTimestamp,
  validateRequiredFields,
  deepClone,
  mergeObjects,
} from './utils';
