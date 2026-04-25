'use client';

import { Provider } from 'react-redux';
import { store } from '@/app/lib/redux/store';
import { LiveScorer } from '@/app/components/scorer/LiveScorer';
import { JMCC_TEAM_PLAYERS } from '@/app/lib/team-constants';

/**
 * PHASE 9: Scorer Main Page - Final Integration
 * 
 * Integrates live scorer with complete review screens
 * Users can switch between:
 * - Live scoring (real-time ball-by-ball entry)
 * - Match details (overall match info)
 * - Batting scorecard (batter statistics)
 * - Bowling scorecard (bowler statistics)
 * - Overs history (ball-by-ball breakdown)
 * - Fall of wickets (dismissals)
 * - Partnerships (partnership runs)
 * 
 * All data persists in localStorage automatically via Redux middleware
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { fetchTeam } from '@/app/lib/redux/slices/teamSlice';

function ScorecardPageContent() {
  const dispatch = useDispatch<AppDispatch>();
  const team = useSelector((state: RootState) => state.team.team);
  const loading = useSelector((state: RootState) => state.team.loading);

  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      return;
    }
    dispatch(fetchTeam());
  }, [dispatch, fetchTrigger, isManualFetchMode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white font-bold animate-pulse text-lg">Loading team players...</div>
      </div>
    );
  }

  // Use Firestore team players if available, otherwise fallback to constants
  const teamPlayers = team?.players || JMCC_TEAM_PLAYERS;

  return (
    <div className="min-h-screen bg-gray-100">
      <LiveScorer teamPlayers={teamPlayers} />
    </div>
  );
}

export default function ScorerPage() {
  return (
    <Provider store={store}>
      <ScorecardPageContent />
    </Provider>
  );
}
