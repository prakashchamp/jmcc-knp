'use client';

import { useTopBatters } from '@/app/lib/hooks/useTopBatters';
import { StatCard } from './StatCard';

/**
 * Top Batters Section Component
 * Displays top 3 all-time batters with their statistics
 */
export function TopBattersSection() {
  const { data: batters, loading, error } = useTopBatters();

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Top Batters</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 rounded-lg p-6 border border-red-700">
        <p className="text-red-200 font-semibold">Error loading top batters</p>
      </div>
    );
  }

  if (!batters || batters.length === 0) {
    return (
      <div className="bg-gray-700 rounded-lg p-6 border border-gray-600">
        <p className="text-gray-400">No batting data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-700">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Top Batters (All Time)</h2>
      <div className="space-y-4">
        {batters.map((batter, index) => (
          <StatCard
            key={batter.playerId}
            rank={(index + 1) as 1 | 2 | 3}
            playerName={batter.playerName}
            stats={[
              { label: 'Matches', value: batter.totalMatches },
              { label: 'Innings', value: batter.totalInnings },
              { label: 'Runs', value: batter.totalRuns },
              { label: 'Best', value: batter.bestScore },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
