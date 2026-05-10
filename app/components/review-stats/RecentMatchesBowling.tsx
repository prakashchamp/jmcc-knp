'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { calcEconomy } from '@/app/lib/bowling-stats-utils';

interface RecentMatchesBowlingProps {
  matches: Match[];
  performances: Performance[];
  loading: boolean;
}

interface ConsolidatedBowlingStats {
  playerName: string;
  playerId: string;
  matchesPlayed: number;
  totalOvers: number;
  totalBalls: number;
  totalWickets: number;
  totalRuns: number;
  economy: number;
  totalMaidens: number;
}

type SortField = 'playerName' | 'matchesPlayed' | 'totalOvers' | 'totalWickets' | 'totalRuns' | 'economy' | 'totalMaidens';

export function RecentMatchesBowling({ matches, performances, loading }: RecentMatchesBowlingProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('totalWickets');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter performances for matching matches and with bowling data
  const relevantPerformances = performances.filter((perf) => {
    const matchFound = matches.find((m) => m.id === perf.matchId);
    return matchFound && perf.bowling.didBowl;
  });

  // Consolidate stats by player
  const playerStatsMap = useMemo(() => {
    const map = new Map<string, ConsolidatedBowlingStats>();

    relevantPerformances.forEach((perf) => {
      const existing = map.get(perf.playerName) || {
        playerName: perf.playerName,
        playerId: perf.playerId,
        matchesPlayed: 0,
        totalOvers: 0,
        totalBalls: 0,
        totalWickets: 0,
        totalRuns: 0,
        economy: 0,
        totalMaidens: 0,
      };

      existing.matchesPlayed += 1;
      existing.totalOvers += perf.bowling.overs;
      existing.totalBalls += perf.bowling.balls || 0;
      existing.totalWickets += perf.bowling.wickets;
      existing.totalRuns += perf.bowling.runs;
      existing.totalMaidens += perf.bowling.maidens;

      map.set(perf.playerName, existing);
    });

    // Calculate economy rates
    map.forEach((stats) => {
      stats.economy = calcEconomy(stats.totalRuns, stats.totalBalls);
    });

    return map;
  }, [relevantPerformances]);

  // Sort consolidated stats
  const sortedStats = useMemo(() => {
    const statsArray = Array.from(playerStatsMap.values()).sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'playerName') {
        aVal = a.playerName;
        bVal = b.playerName;
      } else if (sortField === 'matchesPlayed') {
        aVal = a.matchesPlayed;
        bVal = b.matchesPlayed;
      } else if (sortField === 'totalOvers') {
        aVal = a.totalOvers;
        bVal = b.totalOvers;
      } else if (sortField === 'totalWickets') {
        aVal = a.totalWickets;
        bVal = b.totalWickets;
      } else if (sortField === 'totalRuns') {
        aVal = a.totalRuns;
        bVal = b.totalRuns;
      } else if (sortField === 'economy') {
        aVal = a.economy;
        bVal = b.economy;
      } else if (sortField === 'totalMaidens') {
        aVal = a.totalMaidens;
        bVal = b.totalMaidens;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return statsArray;
  }, [playerStatsMap, sortField, sortDirection]);

  const handlePlayerClick = (playerId: string) => {
    router.push(`/player-stats?playerId=${playerId}`);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <h3 className="text-lg sm:text-2xl font-bold text-white p-4 sm:p-6 pb-2 sm:pb-4">Bowling Statistics</h3>
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (sortedStats.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Bowling Statistics</h3>
        <p className="text-gray-400 text-center py-8 text-xs sm:text-sm">No bowling data available</p>
      </div>
    );
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return <span className="text-yellow-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    }
    return <span className="text-gray-500 ml-1">⇅</span>;
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <h3 className="section-title text-white p-4 sm:p-6 border-b border-gray-700">Recent Matches Bowling Stats</h3>
      <div className="table-scroll">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-gray-700/50">
            <tr className="text-gray-400">
              <th
                className="px-4 py-3 text-left font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('playerName')}
              >
                Player
                {renderSortIndicator('playerName')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('matchesPlayed')}
              >
                Mat
                {renderSortIndicator('matchesPlayed')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('totalOvers')}
              >
                Overs
                {renderSortIndicator('totalOvers')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('totalWickets')}
              >
                Wkts
                {renderSortIndicator('totalWickets')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('totalRuns')}
              >
                Runs
                {renderSortIndicator('totalRuns')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('economy')}
              >
                Econ
                {renderSortIndicator('economy')}
              </th>
              <th
                className="px-3 py-3 text-center font-semibold cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => handleSort('totalMaidens')}
              >
                Mdn
                {renderSortIndicator('totalMaidens')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedStats.map((stats) => (
              <tr
                key={stats.playerName}
                className="hover:bg-gray-700/30 transition-colors"
              >
                <td 
                  className="px-4 py-3 font-bold text-white cursor-pointer hover:text-blue-400 transition-colors truncate max-w-[120px] sm:max-w-none"
                  onClick={() => handlePlayerClick(stats.playerId)}
                >
                  {stats.playerName}
                </td>
                <td className="px-3 py-3 text-center text-gray-400 font-medium">{stats.matchesPlayed}</td>
                <td className="px-3 py-3 text-center text-gray-500">{stats.totalOvers}</td>
                <td className="px-3 py-3 text-center font-bold text-red-400">{stats.totalWickets}</td>
                <td className="px-3 py-3 text-center text-gray-500">{stats.totalRuns}</td>
                <td className="px-3 py-3 text-center text-green-400 font-bold">
                  {stats.economy > 0 ? stats.economy.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-3 text-center text-gray-500">{stats.totalMaidens}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
