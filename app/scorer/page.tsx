'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/app/lib/redux/store';
import LiveScorer from '@/app/components/scorer/LiveScorer';
import { BattingScorecard } from '@/app/components/scorer/review-screens/BattingScorecard';
import { BowlingScorecard } from '@/app/components/scorer/review-screens/BowlingScorecard';
import { OversHistory } from '@/app/components/scorer/review-screens/OversHistory';
import { FallOfWickets } from '@/app/components/scorer/review-screens/FallOfWickets';
import { Partnerships } from '@/app/components/scorer/review-screens/Partnerships';
import { MatchDetails } from '@/app/components/scorer/review-screens/MatchDetails';
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
  const [view, setView] = useState<'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details'>(
    'scorer'
  );

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
      {/* Header with Navigation */}
      <div className="sticky top-0 z-40 bg-white shadow-md border-b-4 border-teal-600">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">🏏 Live Cricket Scorer</h1>
            <a href="/" className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
              ← Back Home
            </a>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setView('scorer')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'scorer'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              📊 Scorer
            </button>

            <button
              onClick={() => setView('details')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'details'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              ℹ️ Match Info
            </button>

            <button
              onClick={() => setView('batting')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'batting'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              🏏 Batting
            </button>

            <button
              onClick={() => setView('bowling')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'bowling'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              🎳 Bowling
            </button>

            <button
              onClick={() => setView('overs')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'overs'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              📈 Overs
            </button>

            <button
              onClick={() => setView('wickets')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'wickets'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              🔪 Wickets
            </button>

            <button
              onClick={() => setView('partnerships')}
              className={`px-4 py-2 rounded-t-lg font-semibold whitespace-nowrap transition-colors ${
                view === 'partnerships'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              🤝 Partnerships
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {view === 'scorer' && (
          <div>
            <LiveScorer
              opponent="Test Opponent"
              venue="Home"
              teamPlayers={demoTeamPlayers}
              format="T20"
              totalOvers={20}
              tossWonBy="Us"
              tossDecision="bat"
            />
          </div>
        )}

        {view === 'details' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <MatchDetails />
          </div>
        )}

        {view === 'batting' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BattingScorecard />
          </div>
        )}

        {view === 'bowling' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <BowlingScorecard />
          </div>
        )}

        {view === 'overs' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <OversHistory />
          </div>
        )}

        {view === 'wickets' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <FallOfWickets />
          </div>
        )}

        {view === 'partnerships' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <Partnerships />
          </div>
        )}
      </div>
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
