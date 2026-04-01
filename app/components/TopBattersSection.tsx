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
      <div className="bg-white rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Top Batters</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-red-700 font-semibold">Error loading top batters</p>
      </div>
    );
  }

  if (!batters || batters.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600">No batting data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Top Batters (All Time)</h2>
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
