'use client';

import { useState, useMemo } from 'react';
import { MonthlyPlayerStats } from '../lib/hooks/useMonthlyStats';

type SortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalRuns' | 'totalBalls' | 'ducks' | 'notOuts' | 'totalFours' | 'totalSixes' | 'thirties' | 'fifties' | 'bestScore' | 'strikeRate' | 'average';

interface MonthlybattingstatsTableProps {
  players: MonthlyPlayerStats[];
  loading: boolean;
}

export function MonthlyBattingStatsTable({ players, loading }: MonthlybattingstatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalRuns');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // Filter players who have batted (totalInnings > 0)
  const battingPlayers = players.filter((p) => p.battingStats.totalInnings > 0);

  const sortedPlayers = useMemo(() => {
    const sorted = [...battingPlayers].sort((a, b) => {
      let aVal: number | string = '';
      let bVal: number | string = '';

      if (sortField === 'playerName') {
        aVal = a.playerName || '';
        bVal = b.playerName || '';
      } else if (sortField === 'totalMatches') {
        aVal = a.battingStats.totalMatches;
        bVal = b.battingStats.totalMatches;
      } else if (sortField === 'totalInnings') {
        aVal = a.battingStats.totalInnings;
        bVal = b.battingStats.totalInnings;
      } else if (sortField === 'totalRuns') {
        aVal = a.battingStats.totalRuns;
        bVal = b.battingStats.totalRuns;
      } else if (sortField === 'totalBalls') {
        aVal = a.battingStats.totalBalls;
        bVal = b.battingStats.totalBalls;
      } else if (sortField === 'ducks') {
        aVal = a.battingStats.ducks;
        bVal = b.battingStats.ducks;
      } else if (sortField === 'notOuts') {
        aVal = a.battingStats.notOuts;
        bVal = b.battingStats.notOuts;
      } else if (sortField === 'totalFours') {
        aVal = a.battingStats.totalFours;
        bVal = b.battingStats.totalFours;
      } else if (sortField === 'totalSixes') {
        aVal = a.battingStats.totalSixes;
        bVal = b.battingStats.totalSixes;
      } else if (sortField === 'thirties') {
        aVal = a.battingStats.thirties;
        bVal = b.battingStats.thirties;
      } else if (sortField === 'fifties') {
        aVal = a.battingStats.fifties;
        bVal = b.battingStats.fifties;
      } else if (sortField === 'bestScore') {
        aVal = a.battingStats.bestScore;
        bVal = b.battingStats.bestScore;
      } else if (sortField === 'strikeRate') {
        aVal = a.battingStats.strikeRate;
        bVal = b.battingStats.strikeRate;
      } else if (sortField === 'average') {
        aVal = a.battingStats.average;
        bVal = b.battingStats.average;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
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

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6">Batting Statistics</h3>
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (battingPlayers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6">Batting Statistics</h3>
        <p className="text-gray-400 text-center py-8">No batting statistics available for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="text-2xl font-bold text-white p-6 pb-4">Batting Statistics</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('playerName')}>
                Player {sortField === 'playerName' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'playerName' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalMatches')}>
                Mat {sortField === 'totalMatches' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalMatches' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalInnings')}>
                Inn {sortField === 'totalInnings' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalInnings' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalRuns')}>
                Runs {sortField === 'totalRuns' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalRuns' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalBalls')}>
                Balls {sortField === 'totalBalls' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalBalls' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('ducks')}>
                Ducks {sortField === 'ducks' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'ducks' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('notOuts')}>
                NO {sortField === 'notOuts' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'notOuts' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalFours')}>
                4s {sortField === 'totalFours' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalFours' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('totalSixes')}>
                6s {sortField === 'totalSixes' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalSixes' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('thirties')}>
                30s {sortField === 'thirties' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'thirties' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('fifties')}>
                50s {sortField === 'fifties' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'fifties' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('bestScore')}>
                HS {sortField === 'bestScore' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'bestScore' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('strikeRate')}>
                SR {sortField === 'strikeRate' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'strikeRate' && '⇅'}
              </th>
              <th className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800" onClick={() => handleSort('average')}>
                Avg {sortField === 'average' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'average' && '⇅'}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={idx % 2 === 0 ? 'bg-gray-800 text-gray-100' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}
              >
                <td className="px-4 py-3 font-semibold text-white">{player.playerName}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.totalMatches}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.totalInnings}</td>
                <td className="px-4 py-3 text-center font-semibold text-blue-400">{player.battingStats.totalRuns}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.totalBalls}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.ducks}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.notOuts}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.totalFours}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.totalSixes}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.thirties}</td>
                <td className="px-4 py-3 text-center text-gray-300">{player.battingStats.fifties}</td>
                <td className="px-4 py-3 text-center font-semibold text-green-400">{player.battingStats.bestScore}</td>
                <td className="px-4 py-3 text-center text-orange-400">
                  {player.battingStats.strikeRate.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center text-red-400">
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
