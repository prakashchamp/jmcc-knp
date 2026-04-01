'use client';

import { useState, useMemo } from 'react';
import { YearlyPlayerStats } from '../lib/hooks/useYearlyStats';

interface YearlyBowlingStatsTableProps {
  players: YearlyPlayerStats[];
  loading: boolean;
}

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalWickets' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

export function YearlyBowlingStatsTable({ players, loading }: YearlyBowlingStatsTableProps) {
  const [sortField, setSortField] = useState<BowlingSortField>('totalWickets');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const bowlingPlayers = players.filter((p) => p.bowlingStats.totalInnings > 0);

  const sortedPlayers = useMemo(() => {
    const sorted = [...bowlingPlayers].sort((a, b) => {
      const aStats = a.bowlingStats;
      const bStats = b.bowlingStats;

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
  }, [bowlingPlayers, sortField, sortDirection]);

  const handleSort = (field: BowlingSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Bowling Statistics</h3>
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (bowlingPlayers.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Bowling Statistics</h3>
        <p className="text-gray-500 text-center py-8">No bowling statistics available for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <h3 className="text-2xl font-bold text-gray-900 p-6 pb-4">Bowling Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-red-50 to-red-100 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('playerName')}>
                Player
                {sortField === 'playerName' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('totalMatches')}>
                Mat
                {sortField === 'totalMatches' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('totalInnings')}>
                Inn
                {sortField === 'totalInnings' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('totalOvers')}>
                Overs
                {sortField === 'totalOvers' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('totalWickets')}>
                Wkts
                {sortField === 'totalWickets' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('threeWickets')}>
                3W
                {sortField === 'threeWickets' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('fiveWickets')}>
                5W
                {sortField === 'fiveWickets' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('bestHaul')}>
                Best
                {sortField === 'bestHaul' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('economy')}>
                Econ
                {sortField === 'economy' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('strikeRate')}>
                SR
                {sortField === 'strikeRate' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-400 ml-1">⇅</span>
                )}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-red-200" onClick={() => handleSort('average')}>
                Avg
                {sortField === 'average' ? (
                  <span className="text-red-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
                className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-red-50'}
              >
                <td className="px-4 py-3 font-semibold text-gray-900">{player.playerName}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.bowlingStats.totalMatches}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.bowlingStats.totalInnings}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.bowlingStats.totalOvers}</td>
                <td className="px-4 py-3 text-center font-semibold text-red-600">{player.bowlingStats.totalWickets}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.bowlingStats.threeWickets}</td>
                <td className="px-4 py-3 text-center text-gray-700">{player.bowlingStats.fiveWickets}</td>
                <td className="px-4 py-3 text-center font-semibold text-purple-600">{player.bowlingStats.bestHaul}</td>
                <td className="px-4 py-3 text-center text-blue-600">
                  {player.bowlingStats.economy.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center text-orange-600">
                  {player.bowlingStats.strikeRate.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center text-red-600">
                  {player.bowlingStats.average.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
