/**
 * Generic Firestore document type with automatic id field
 */
export interface FirestoreDocument<T = any> {
  id: string;
  data: T;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Hook state for async operations
 */
export interface HookState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Query condition for filtering Firestore collections
 */
export interface QueryCondition {
  field: string;
  operator: '==' | '<' | '<=' | '>' | '>=' | '!=' | 'in' | 'array-contains' | 'array-contains-any';
  value: any;
}

/**
 * Options for write operations
 */
export interface WriteOptions {
  merge?: boolean;
  transactions?: boolean;
}

/**
 * Batch write operation
 */
export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: any;
  options?: WriteOptions;
}

/**
 * Write result with operation status
 */
export interface WriteResult {
  success: boolean;
  docId?: string;
  error?: Error;
}

/**
 * Hook for write operations
 */
export interface UseFirestoreWriteReturn {
  write: (operation: BatchOperation | BatchOperation[]) => Promise<WriteResult | WriteResult[]>;
  loading: boolean;
  error: Error | null;
}

/**
 * Validation context for documents
 */
export interface DocumentValidator<T = any> {
  (data: any): data is T;
}
