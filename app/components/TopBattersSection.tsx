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
      <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-8 backdrop-blur-sm border border-gray-700">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-100 mb-4 sm:mb-6">Top Batters</h2>
        <div className="animate-pulse space-y-3 sm:space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 sm:h-24 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 rounded-lg p-3 sm:p-6 border border-red-700">
        <p className="text-red-200 text-xs sm:text-base font-semibold">Error loading top batters</p>
      </div>
    );
  }

  if (!batters || batters.length === 0 || !batters.some(b => b.totalInnings > 0)) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-4 sm:p-8 backdrop-blur-sm border border-gray-700">
      <h2 className="text-lg sm:text-2xl font-bold text-gray-100 mb-4 sm:mb-6">Top Batters (All Time)</h2>
      <div className="space-y-3 sm:space-y-4">
        {batters.filter(b => b.totalInnings > 0).map((batter, index) => (
          <StatCard
            key={batter.playerId}
            rank={(index + 1) as 1 | 2 | 3}
            playerName={batter.playerName}
            playerId={batter.playerId}
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
