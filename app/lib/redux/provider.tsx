'use client';

import { ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { rehydrateScorer } from './slices/scorerSlice';
import { rehydrateTeam, setTeam, fetchTeam } from './slices/teamSlice';
import { loadStateFromLocalStorage } from './store';
import { getPrimaryTeamFromIndexedDB } from '../indexed-db';

/**
 * Redux Provider Wrapper
 * Wraps the entire application to provide Redux state management
 * Rehydrates state from localStorage on client-side mount
 */
export function ReduxProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const restoreState = async () => {
      const savedState = loadStateFromLocalStorage();
      if (savedState) {
        if (savedState.team) {
          store.dispatch(rehydrateTeam(savedState.team));
        }
        if (savedState.scorer) {
          store.dispatch(rehydrateScorer(savedState.scorer));
        }
        return;
      }

      const indexedTeam = await getPrimaryTeamFromIndexedDB();
      if (indexedTeam) {
        store.dispatch(setTeam({ team: indexedTeam, skipSync: true }));
      }
    };

    restoreState().then(() => {
      // After restore, check if team is missing and online, fetch from Firestore
      if (!store.getState().team.team && navigator.onLine) {
        store.dispatch(fetchTeam());
      }
    });
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
