'use client';

import { useState, useMemo } from 'react';
import { YearlyPlayerStats } from '../lib/hooks/useYearlyStats';

interface YearlyBattingStatsTableProps {
  players: YearlyPlayerStats[];
  loading: boolean;
}

type SortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalRuns' | 'totalBalls' | 'ducks' | 'notOuts' | 'totalFours' | 'totalSixes' | 'thirties' | 'fifties' | 'bestScore' | 'strikeRate' | 'average';

export function YearlyBattingStatsTable({ players, loading }: YearlyBattingStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalRuns');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter players who have batted (totalInnings > 0) - must be before useMemo
  const battingPlayers = players.filter((p) => p.battingStats.totalInnings > 0);

  // Sort players based on selected field and direction - all hooks must be called before conditionals
  const sortedPlayers = useMemo(() => {
    const sorted = [...battingPlayers].sort((a, b) => {
      const aStats = a.battingStats;
      const bStats = b.battingStats;

      let aValue: string | number;
      let bValue: string | number;

      if (sortField === 'playerName') {
        aValue = a.playerName;
        bValue = b.playerName;
      } else {
        aValue = aStats[sortField as keyof typeof aStats] as number;
        bValue = bStats[sortField as keyof typeof bStats] as number;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue);
      }

      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [battingPlayers, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Now conditional returns can happen after all hooks
  // Now conditional returns can happen after all hooks
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="section-title text-white mb-4 sm:mb-6">Batting Statistics</h3>
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (battingPlayers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Batting Statistics</h3>
        <p className="text-gray-400 text-center py-8 text-xs sm:text-sm">No batting statistics available for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="section-title text-white p-4 sm:p-6 pb-2 sm:pb-4">Batting Statistics</h3>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-left font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('playerName')}>
                Player
                {sortField === 'playerName' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalMatches')}>
                Mat
                {sortField === 'totalMatches' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalInnings')}>
                Inn
                {sortField === 'totalInnings' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalRuns')}>
                Runs
                {sortField === 'totalRuns' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalBalls')}>
                Balls
                {sortField === 'totalBalls' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('strikeRate')}>
                SR
                {sortField === 'strikeRate' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('average')}>
                Avg
                {sortField === 'average' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalFours')}>
                4s
                {sortField === 'totalFours' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('totalSixes')}>
                6s
                {sortField === 'totalSixes' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('bestScore')}>
                HS
                {sortField === 'bestScore' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('thirties')}>
                30s
                {sortField === 'thirties' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('fifties')}>
                50s
                {sortField === 'fifties' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800" onClick={() => handleSort('ducks')}>
                Ducks
                {sortField === 'ducks' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={idx % 2 === 0 ? 'bg-gray-800 text-gray-100' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}
              >
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-white truncate max-w-[100px] sm:max-w-none">{player.playerName}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.totalMatches}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.totalInnings}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-400">{player.battingStats.totalRuns}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.totalBalls}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-orange-400">
                  {player.battingStats.strikeRate.toFixed(1)}
                </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-red-400">
                  {player.battingStats.average.toFixed(1)}
                </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.totalFours}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.totalSixes}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-green-400">{player.battingStats.bestScore}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.thirties}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.fifties}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.battingStats.ducks}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
