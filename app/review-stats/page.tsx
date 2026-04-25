'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { useRecentMatches } from '@/app/lib/hooks/useRecentMatches';
import { RecentMatchesResult } from '@/app/components/review-stats/RecentMatchesResult';
import { RecentMatchesBatting } from '@/app/components/review-stats/RecentMatchesBatting';
import { RecentMatchesBowling } from '@/app/components/review-stats/RecentMatchesBowling';

export default function ReviewStatsPage() {
  const [matchLimit, setMatchLimit] = useState(5);
  const { matches, loading, error } = useRecentMatches(matchLimit);

  const matchesData = matches.map((m) => m.match);
  const allPerformances = matches.flatMap((m) => m.performances);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Title */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white">Review Statistics</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-base">View recent match results and player performances</p>
        </div>

        {/* Match Limit Selector */}
        <div className="mb-8 flex items-center gap-4">
          <label className="text-white font-semibold">Show last:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={matchLimit}
            onChange={(e) => {
              const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
              setMatchLimit(val);
            }}
            className="w-20 px-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500"
          />
          <span className="text-gray-300">matches (1-10)</span>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading stats</p>
            <p>{error.message}</p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-8">
          {/* Recent Match Results */}
          <RecentMatchesResult matches={matchesData} loading={loading} />

          {/* Recent Match Batting Stats */}
          <RecentMatchesBatting matches={matchesData} performances={allPerformances} loading={loading} />

          {/* Recent Match Bowling Stats */}
          <RecentMatchesBowling matches={matchesData} performances={allPerformances} loading={loading} />
        </div>
      </main>
    </div>
  );
}
