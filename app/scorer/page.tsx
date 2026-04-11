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
function ScorecardPageContent() {
  // Use JMCC team for scoring
  const teamPlayers = JMCC_TEAM_PLAYERS;

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
