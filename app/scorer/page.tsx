'use client';

import { Provider } from 'react-redux';
import { store } from '@/app/lib/redux/store';
import { LiveScorer } from '@/app/components/scorer/LiveScorer';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';

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
  // Demo team (can be replaced with actual team from API/props)
  const demoTeamPlayers: TeamPlayer[] = [
    { id: 'p1', name: 'Rohit Sharma', role: 'batsman', jerseyNumber: 1 },
    { id: 'p2', name: 'Virat Kohli', role: 'batsman', jerseyNumber: 18 },
    { id: 'p3', name: 'Suryakumar Yadav', role: 'batsman', jerseyNumber: 63 },
    { id: 'p4', name: 'Hardik Pandya', role: 'allrounder', jerseyNumber: 31 },
    { id: 'p5', name: 'Rishabh Pant', role: 'batsman', jerseyNumber: 17 },
    { id: 'p6', name: 'Jasprit Bumrah', role: 'bowler', jerseyNumber: 93 },
    { id: 'p7', name: 'Mohammed Siraj', role: 'bowler', jerseyNumber: 25 },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <LiveScorer teamPlayers={demoTeamPlayers} />
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
