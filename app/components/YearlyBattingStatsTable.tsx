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
        <p className="text-gray-500 text-center py-8">No batting statistics available for this period</p>
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
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-blue-50'}
              >
                <td className="px-4 py-3 font-semibold text-gray-900">{player.playerName}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.totalMatches}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.totalInnings}</td>
                <td className="px-4 py-3 text-center font-semibold text-blue-600">{player.battingStats.totalRuns}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.totalBalls}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.ducks}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.notOuts}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.totalFours}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.totalSixes}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.thirties}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.battingStats.fifties}</td>
                <td className="px-4 py-3 text-center font-semibold text-green-600">{player.battingStats.bestScore}</td>
                <td className="px-4 py-3 text-center text-orange-600">
                  {player.battingStats.strikeRate.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center text-red-600">
                  {player.battingStats.average.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
