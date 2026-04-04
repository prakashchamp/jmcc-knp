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
        ignoredActions: ['scorer/createUndoSnapshot', 'scorer/undoLastDelivery'],
        ignoredActionPaths: ['payload.dialogData', 'payload.undoStack'],
      },
    }).concat([
      // localStorage persistence middleware
      (store) => (next) => (action) => {
        const result = next(action);

        // Auto-save scorer and match state to localStorage after every action
        if (typeof window !== 'undefined') {
          try {
            const state = store.getState();
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
      },
    ]),
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
  } catch (err) {
    console.warn('Failed to clear match data from localStorage:', err);
  }
};
