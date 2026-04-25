import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import teamReducer from './slices/teamSlice';
import scorerReducer from './slices/scorerSlice';
import matchReducer from './slices/matchSlice';

export const store = configureStore({
  reducer: {
    team: teamReducer,
    scorer: scorerReducer,
    match: matchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Disable serializable state check in development for performance
        // It's always disabled in production builds
        warnAfter: process.env.NODE_ENV === 'production' ? 128 : Infinity,
        ignoredActions: ['scorer/createUndoSnapshot', 'scorer/undoLastDelivery'],
        ignoredActionPaths: ['payload.dialogData', 'payload.undoStack'],
        ignoredPaths: [
          // Ignore large state paths that accumulate over time
          'scorer.currentInnings.ballHistory',
          'scorer.undoStack',
        ],
      },
    }).concat((storeApi: any) => (next: any) => (action: any) => {
        const result = next(action);

        // Auto-save scorer and match state to localStorage after every action
        if (typeof window !== 'undefined') {
          try {
            const state = storeApi.getState();
            const persistedState = {
              scorer: state.scorer,
              match: state.match,
            };
            localStorage.setItem('jmcc_match_state', JSON.stringify(persistedState));
          } catch (error) {
            console.warn('Failed to save state to localStorage:', error);
          }
        }

        return result;
      }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;

/**
 * localStorage persistence utilities
 */
const STORAGE_KEY = 'jmcc_match_state';

export const saveStateToLocalStorage = (state: Pick<RootState, 'scorer' | 'match'>) => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('Failed to save Redux state to localStorage:', err);
  }
};

export const loadStateFromLocalStorage = (): Pick<RootState, 'scorer' | 'match'> | undefined => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return undefined;
    return JSON.parse(serialized) as Pick<RootState, 'scorer' | 'match'>;
  } catch (err) {
    console.warn('Failed to load Redux state from localStorage:', err);
    return undefined;
  }
};

/**
 * Clear match data from localStorage (called on match submission)
 */
export const clearMatchDataFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✓ Match data cleared from localStorage');
  } catch (err) {
    console.warn('Failed to clear match data from localStorage:', err);
  }
};

/**
 * Validate and optionally clear corrupted state from localStorage
 * Use this if you see duplicate batters or other state corruption issues
 */
export const validateAndClearCorruptedState = () => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) {
      console.log('ℹ No match data in localStorage');
      return;
    }

    const state = JSON.parse(serialized) as any;
    const currentInnings = state.scorer?.currentInnings;

    // Check for corrupted state
    if (currentInnings?.striker && currentInnings?.nonStriker) {
      const strikerIsSame = currentInnings.striker.id === currentInnings.nonStriker.id;
      if (strikerIsSame) {
        console.warn('⚠ Corrupted state detected: Striker and non-striker are the same player.');
        clearMatchDataFromStorage();
        return 'cleared';
      }
    }

    if (currentInnings?.striker && currentInnings?.striker.name === 'JMCC 10' &&
        currentInnings?.nonStriker && currentInnings?.nonStriker.name === 'JMCC 10') {
      console.warn('⚠ Corrupted state detected: Both batters are JMCC 10.');
      clearMatchDataFromStorage();
      return 'cleared';
    }

    console.log('✓ State validation passed');
    return 'valid';
  } catch (err) {
    console.warn('Failed to validate localStorage state:', err);
    clearMatchDataFromStorage();
    return 'error';
  }
};
