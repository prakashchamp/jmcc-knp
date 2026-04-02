'use client';

import { TeamStats } from '@/app/lib/cricket-schema';

interface TeamStatsCardProps {
  stats: TeamStats | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Team Stats Card Component
 * Displays overall team statistics in a 4-column grid
 */
export function TeamStatsCard({ stats, loading, error }: TeamStatsCardProps) {
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-8 backdrop-blur-sm border border-gray-700">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900 rounded-lg p-6 border border-red-700">
        <p className="text-red-200 font-semibold">Error loading team stats</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-800 rounded-lg p-6 border border-blue-700 shadow-lg">
        <p className="text-gray-300">No stats available</p>
      </div>
    );
  }

  const statsList = [
    { label: 'Total Matches', value: stats.totalMatches, color: 'from-blue-600 to-blue-700' },
    { label: 'Wins', value: stats.wins, color: 'from-green-500 to-green-600' },
    { label: 'Losses', value: stats.losses, color: 'from-red-500 to-red-600' },
    { label: 'No Results', value: stats.noResults, color: 'from-gray-500 to-gray-600' },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-8 backdrop-blur-sm border border-gray-700 shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">Team Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsList.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="text-4xl font-bold mb-2">{stat.value}</div>
            <p className="text-sm font-medium opacity-90">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
