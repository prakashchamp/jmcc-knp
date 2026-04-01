'use client';

import { useState, useMemo } from 'react';
import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface AllTimeBowlingStatsTableProps {
  players: PlayerStats[];
  loading: boolean;
}

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalWickets' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

export function AllTimeBowlingStatsTable({ players, loading }: AllTimeBowlingStatsTableProps) {
  const [sortField, setSortField] = useState<BowlingSortField>('totalWickets');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const bowlingPlayers = players.filter((p) => p.bowlingStats && p.bowlingStats.totalInnings > 0);

  // Sort players based on selected field and direction - all hooks must be called before conditionals
  const sortedPlayers = useMemo(() => {
    const sorted = [...bowlingPlayers].sort((a, b) => {
      const aStats = a.bowlingStats!;
      const bStats = b.bowlingStats!;

      let aValue: string | number;
      let bValue: string | number;

      if (sortField === 'playerName') {
        aValue = a.playerName;
        bValue = b.playerName;
      } else if (sortField === 'economy') {
        aValue = aStats.totalBalls > 0 ? (aStats.totalRuns / (aStats.totalBalls / 6)) * aStats.totalOvers : 0;
        bValue = bStats.totalBalls > 0 ? (bStats.totalRuns / (bStats.totalBalls / 6)) * bStats.totalOvers : 0;
      } else if (sortField === 'strikeRate') {
        aValue = aStats.totalWickets > 0 ? aStats.totalBalls / aStats.totalWickets : 0;
        bValue = bStats.totalWickets > 0 ? bStats.totalBalls / bStats.totalWickets : 0;
      } else if (sortField === 'average') {
        aValue = aStats.totalWickets > 0 ? aStats.totalRuns / aStats.totalWickets : 0;
        bValue = bStats.totalWickets > 0 ? bStats.totalRuns / bStats.totalWickets : 0;
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
  }, [bowlingPlayers, sortField, sortDirection]);

  const handleSort = (field: BowlingSortField) => {
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading bowling statistics...</p>
        </div>
      </div>
    );
  }

  if (bowlingPlayers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-center h-32">
          <p className="text-gray-500">No bowling statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Header */}
          <thead>
            <tr className="bg-gradient-to-r from-red-600 to-red-500 text-white cursor-pointer">
              <th className="px-6 py-3 text-left text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('playerName')}>
                Player
                {sortField === 'playerName' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('totalMatches')}>
                Mat
                {sortField === 'totalMatches' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('totalInnings')}>
                Inn
                {sortField === 'totalInnings' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('totalOvers')}>
                Overs
                {sortField === 'totalOvers' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('totalWickets')}>
                Wkts
                {sortField === 'totalWickets' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('threeWickets')}>
                3W
                {sortField === 'threeWickets' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('fiveWickets')}>
                5W
                {sortField === 'fiveWickets' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('bestHaul')}>
                Best
                {sortField === 'bestHaul' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('economy')}>
                Econ
                {sortField === 'economy' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('strikeRate')}>
                SR
                {sortField === 'strikeRate' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
              <th className="px-6 py-3 text-center text-sm font-semibold hover:bg-red-700 transition" onClick={() => handleSort('average')}>
                Avg
                {sortField === 'average' ? (
                  <span className="text-yellow-300 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-white/50 ml-1">⇅</span>
                )}
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200">
            {sortedPlayers.map((player, index) => {
              const stats = player.bowlingStats!;
              const economy = stats.totalBalls > 0 ? ((stats.totalRuns / (stats.totalBalls / 6)) * stats.totalOvers).toFixed(2) : '0.00';
              const strikeRate = stats.totalWickets > 0 ? (stats.totalBalls / stats.totalWickets).toFixed(2) : '0.00';
              const average = stats.totalWickets > 0 ? (stats.totalRuns / stats.totalWickets).toFixed(2) : '0.00';

              return (
                <tr
                  key={player.playerId}
                  className={index % 2 === 0 ? 'bg-white hover:bg-red-50' : 'bg-gray-50 hover:bg-red-50'}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{player.playerName}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.totalMatches}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.totalInnings}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.totalOvers.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center text-sm font-semibold text-red-600">{stats.totalWickets}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.threeWickets}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.fiveWickets}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{stats.bestHaul}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{economy}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{strikeRate}</td>
                  <td className="px-6 py-4 text-center text-sm text-gray-700">{average}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
