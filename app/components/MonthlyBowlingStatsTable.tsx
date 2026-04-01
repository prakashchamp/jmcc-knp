'use client';

import { useState, useMemo } from 'react';
import { MonthlyPlayerStats } from '../lib/hooks/useMonthlyStats';

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalWickets' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

interface MonthlyBowlingStatsTableProps {
  players: MonthlyPlayerStats[];
  loading: boolean;
}

export function MonthlyBowlingStatsTable({ players, loading }: MonthlyBowlingStatsTableProps) {
  const [sortField, setSortField] = useState<BowlingSortField>('totalWickets');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Filter players who have bowled (totalInnings > 0)
  const bowlingPlayers = players.filter((p) => p.bowlingStats.totalInnings > 0);

  const sortedPlayers = useMemo(() => {
    const sorted = [...bowlingPlayers].sort((a, b) => {
      let aVal: number | string = '';
      let bVal: number | string = '';

      if (sortField === 'playerName') {
        aVal = a.playerName || '';
        bVal = b.playerName || '';
      } else if (sortField === 'totalMatches') {
        aVal = a.bowlingStats.totalMatches;
        bVal = b.bowlingStats.totalMatches;
      } else if (sortField === 'totalInnings') {
        aVal = a.bowlingStats.totalInnings;
        bVal = b.bowlingStats.totalInnings;
      } else if (sortField === 'totalOvers') {
        aVal = a.bowlingStats.totalOvers;
        bVal = b.bowlingStats.totalOvers;
      } else if (sortField === 'totalWickets') {
        aVal = a.bowlingStats.totalWickets;
        bVal = b.bowlingStats.totalWickets;
      } else if (sortField === 'threeWickets') {
        aVal = a.bowlingStats.threeWickets;
        bVal = b.bowlingStats.threeWickets;
      } else if (sortField === 'fiveWickets') {
        aVal = a.bowlingStats.fiveWickets;
        bVal = b.bowlingStats.fiveWickets;
      } else if (sortField === 'bestHaul') {
        aVal = a.bowlingStats.bestHaul || '';
        bVal = b.bowlingStats.bestHaul || '';
      } else if (sortField === 'economy') {
        aVal = a.bowlingStats.economy;
        bVal = b.bowlingStats.economy;
      } else if (sortField === 'strikeRate') {
        aVal = a.bowlingStats.strikeRate;
        bVal = b.bowlingStats.strikeRate;
      } else if (sortField === 'average') {
        aVal = a.bowlingStats.average;
        bVal = b.bowlingStats.average;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
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
              <th className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('playerName')}>
                Player {sortField === 'playerName' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'playerName' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('totalMatches')}>
                Mat {sortField === 'totalMatches' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalMatches' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('totalInnings')}>
                Inn {sortField === 'totalInnings' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalInnings' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('totalOvers')}>
                Overs {sortField === 'totalOvers' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalOvers' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('totalWickets')}>
                Wkts {sortField === 'totalWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalWickets' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('threeWickets')}>
                3W {sortField === 'threeWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'threeWickets' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('fiveWickets')}>
                5W {sortField === 'fiveWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'fiveWickets' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('bestHaul')}>
                Best {sortField === 'bestHaul' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'bestHaul' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('economy')}>
                Econ {sortField === 'economy' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'economy' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('strikeRate')}>
                SR {sortField === 'strikeRate' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'strikeRate' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-red-200" onClick={() => handleSort('average')}>
                Avg {sortField === 'average' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'average' && '⇅'}
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
