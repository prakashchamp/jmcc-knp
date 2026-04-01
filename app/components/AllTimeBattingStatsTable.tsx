'use client';

import { useState, useMemo } from 'react';
import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface AllTimeBattingStatsTableProps {
  players: PlayerStats[];
  loading: boolean;
}

type SortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalRuns' | 'totalBalls' | 'ducks' | 'notOuts' | 'totalFours' | 'totalSixes' | 'thirties' | 'fifties' | 'bestScore' | 'strikeRate' | 'average';

export function AllTimeBattingStatsTable({ players, loading }: AllTimeBattingStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalRuns');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter players who have batted (totalInnings > 0) - must be before useMemo
  const battingPlayers = players.filter((p) => p.battingStats && p.battingStats.totalInnings > 0);

  // Sort players based on selected field and direction - all hooks must be called before conditionals
  const sortedPlayers = useMemo(() => {
    const sorted = [...battingPlayers].sort((a, b) => {
      const aStats = a.battingStats!;
      const bStats = b.battingStats!;

      let aValue: string | number;
      let bValue: string | number;

      if (sortField === 'playerName') {
        aValue = a.playerName;
        bValue = b.playerName;
      } else if (sortField === 'strikeRate') {
        aValue = aStats.totalBalls > 0 ? (aStats.totalRuns / aStats.totalBalls) * 100 : 0;
        bValue = bStats.totalBalls > 0 ? (bStats.totalRuns / bStats.totalBalls) * 100 : 0;
      } else if (sortField === 'average') {
        aValue = aStats.totalInnings > 0 ? aStats.totalRuns / aStats.totalInnings : 0;
        bValue = bStats.totalInnings > 0 ? bStats.totalRuns / bStats.totalInnings : 0;
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
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Batting Statistics</h3>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (battingPlayers.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Batting Statistics</h3>
        <p className="text-gray-500 text-center py-8">No batting statistics available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <h3 className="text-2xl font-bold text-gray-900 p-6 pb-4">Batting Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('playerName')}>
                Player
                {sortField === 'playerName' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalMatches')}>
                Mat
                {sortField === 'totalMatches' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalInnings')}>
                Inn
                {sortField === 'totalInnings' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalRuns')}>
                Runs
                {sortField === 'totalRuns' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalBalls')}>
                Balls
                {sortField === 'totalBalls' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('ducks')}>
                Ducks
                {sortField === 'ducks' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('notOuts')}>
                NO
                {sortField === 'notOuts' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalFours')}>
                4s
                {sortField === 'totalFours' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('totalSixes')}>
                6s
                {sortField === 'totalSixes' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('thirties')}>
                30s
                {sortField === 'thirties' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('fifties')}>
                50s
                {sortField === 'fifties' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('bestScore')}>
                HS
                {sortField === 'bestScore' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('strikeRate')}>
                SR
                {sortField === 'strikeRate' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-blue-200" onClick={() => handleSort('average')}>
                Avg
                {sortField === 'average' ? (
                  <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => {
              const stats = player.battingStats!;
              const strikeRate =
                stats.totalBalls > 0 ? ((stats.totalRuns / stats.totalBalls) * 100).toFixed(2) : '0.00';
              const average =
                stats.totalInnings > 0 ? (stats.totalRuns / stats.totalInnings).toFixed(2) : '0.00';

              return (
                <tr
                  key={player.playerId}
                  className={index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}
                >
                  <td className="px-4 py-3 text-left font-medium text-gray-900">{player.playerName}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.totalMatches}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.totalInnings}</td>
                  <td className="px-4 py-3 text-center font-semibold text-blue-600">{stats.totalRuns}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.totalBalls}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.ducks}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.notOuts}</td>
                  <td className="px-4 py-3 text-center text-green-600 font-medium">{stats.totalFours}</td>
                  <td className="px-4 py-3 text-center text-orange-600 font-medium">{stats.totalSixes}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.thirties}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.fifties}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{stats.bestScore}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{strikeRate}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{average}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
