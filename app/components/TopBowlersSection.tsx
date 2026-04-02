'use client';

import { useTopBowlers } from '@/app/lib/hooks/useTopBowlers';
import { StatCard } from './StatCard';

/**
 * Top Bowlers Section Component
 * Displays top 3 all-time bowlers with their statistics
 */
export function TopBowlersSection() {
  const { data: bowlers, loading, error } = useTopBowlers();

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">Top Bowlers</h2>
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
        <p className="text-red-200 font-semibold">Error loading top bowlers</p>
      </div>
    );
  }

  if (!bowlers || bowlers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-lg">
        <p className="text-gray-400">No bowling data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-700">
      <h2 className="text-2xl font-bold text-gray-100 mb-6">Top Bowlers (All Time)</h2>
      <div className="space-y-4">
        {bowlers.map((bowler, index) => (
          <StatCard
            key={bowler.playerId}
            rank={(index + 1) as 1 | 2 | 3}
            playerName={bowler.playerName}
            stats={[
              { label: 'Matches', value: bowler.totalMatches },
              { label: 'Innings', value: bowler.totalInnings },
              { label: 'Wickets', value: bowler.totalWickets },
              { label: 'Best Haul', value: bowler.bestHaul },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
