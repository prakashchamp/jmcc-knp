'use client';

import { ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { rehydrateScorer } from './slices/scorerSlice';
import { rehydrateTeam } from './slices/teamSlice';
import { loadStateFromLocalStorage } from './store';

/**
 * Redux Provider Wrapper
 * Wraps the entire application to provide Redux state management
 * Rehydrates state from localStorage on client-side mount
 */
export function ReduxProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Rehydrate Redux state from localStorage on client mount
    const savedState = loadStateFromLocalStorage();
    if (savedState) {
      if (savedState.team) {
        store.dispatch(rehydrateTeam(savedState.team));
      }
      if (savedState.scorer) {
        store.dispatch(rehydrateScorer(savedState.scorer));
      }
    }
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
