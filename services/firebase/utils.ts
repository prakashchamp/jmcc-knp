import { HookState, WriteResult } from './types';

/**
 * Create initial loading state
 */
export function createLoadingState<T = null>(): HookState<T> {
  return {
    data: null as unknown as T,
    loading: true,
    error: null,
  };
}

/**
 * Create success state with data
 */
export function createSuccessState<T>(data: T): HookState<T> {
  return {
    data,
    loading: false,
    error: null,
  };
}

/**
 * Create error state
 */
export function createErrorState<T = null>(error: Error): HookState<T> {
  return {
    data: null as unknown as T,
    loading: false,
    error,
  };
}

/**
 * Create success write result
 */
export function createSuccessResult(docId: string): WriteResult {
  return {
    success: true,
    docId,
  };
}

/**
 * Create error write result
 */
export function createErrorResult(error: Error): WriteResult {
  return {
    success: false,
    error,
  };
}

/**
 * Convert Firestore timestamp to JavaScript Date
 */
export function firestoreTimestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date();
}

/**
 * Convert JavaScript Date to ISO string for Firestore
 */
export function dateToFirestoreTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * Validate required fields in document data
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: any,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every((field) => data[field] !== undefined && data[field] !== null);
}

/**
 * Deep clone object to avoid mutations
 */
export function deepClone<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge two objects deeply (for update operations)
 */
export function mergeObjects<T extends Record<string, any>>(
  original: T,
  updates: Partial<T>
): T {
  return {
    ...original,
    ...updates,
  };
}
