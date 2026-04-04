'use client';

import { useRouter } from 'next/navigation';

interface StatCardProps {
  rank: 1 | 2 | 3;
  playerName: string;
  playerId?: string;
  stats: Array<{ label: string; value: string | number }>;
}

/**
 * StatCard Component
 * Reusable card for displaying individual player stats (batting or bowling)
 * Shows rank, player name, and stat grid
 */
export function StatCard({ rank, playerName, playerId, stats }: StatCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (playerId) {
      router.push(`/player-stats?playerId=${playerId}`);
    }
  };

  const rankColors = {
    1: 'from-yellow-400 to-yellow-500',
    2: 'from-gray-300 to-gray-400',
    3: 'from-orange-400 to-orange-500',
  };

  const rankBadges = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return (
    <div 
      onClick={handleClick}
      className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 hover:shadow-md transition-shadow ${playerId ? 'cursor-pointer hover:border-blue-500' : ''}`}
    >
      <div className="flex items-center gap-4 mb-4">
        {/* Rank Badge */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${rankColors[rank]} flex items-center justify-center`}
        >
          <span className="text-2xl font-bold text-white">{rank}</span>
        </div>

        {/* Player Name */}
        <div>
          <p className={`text-lg font-bold ${playerId ? 'text-blue-400 hover:text-blue-300' : 'text-white'}`}>{playerName}</p>
          <p className="text-xs text-gray-400">{rankBadges[rank]} All-time rank</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-700 rounded p-3">
            <p className="text-xs text-gray-400 font-medium uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
