'use client';

import { useState, useMemo } from 'react';
import { calcEconomy } from '../lib/bowling-stats-utils';
import { MonthlyPlayerStats } from '../lib/hooks/useMonthlyStats';

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalMaidens' | 'totalWickets' | 'totalRuns' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

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
      } else if (sortField === 'totalMaidens') {
        aVal = a.bowlingStats.totalMaidens;
        bVal = b.bowlingStats.totalMaidens;
      } else if (sortField === 'totalWickets') {
        aVal = a.bowlingStats.totalWickets;
        bVal = b.bowlingStats.totalWickets;
      } else if (sortField === 'totalRuns') {
        aVal = a.bowlingStats.totalRuns;
        bVal = b.bowlingStats.totalRuns;
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
        aVal = calcEconomy(a.bowlingStats.totalRuns, a.bowlingStats.totalBalls);
        bVal = calcEconomy(b.bowlingStats.totalRuns, b.bowlingStats.totalBalls);
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
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="section-title text-white mb-4 sm:mb-6">Bowling Statistics</h3>
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (bowlingPlayers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Bowling Statistics</h3>
        <p className="text-gray-400 text-center py-8 text-xs sm:text-sm">No bowling statistics available for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="section-title text-white p-4 sm:p-6 pb-2 sm:pb-4">Bowling Statistics</h3>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-yellow-700 to-yellow-600 border-b border-gray-700">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('playerName')}>
                Player {sortField === 'playerName' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'playerName' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalMatches')}>
                Mat {sortField === 'totalMatches' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalMatches' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalInnings')}>
                Inn {sortField === 'totalInnings' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalInnings' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalOvers')}>
                Overs {sortField === 'totalOvers' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalOvers' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalMaidens')}>
                M {sortField === 'totalMaidens' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalMaidens' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalWickets')}>
                Wkts {sortField === 'totalWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalWickets' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('totalRuns')}>
                Runs {sortField === 'totalRuns' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'totalRuns' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('economy')}>
                ECO {sortField === 'economy' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'economy' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('average')}>
                Avg {sortField === 'average' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'average' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('strikeRate')}>
                SR {sortField === 'strikeRate' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'strikeRate' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('bestHaul')}>
                Best {sortField === 'bestHaul' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'bestHaul' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('threeWickets')}>
                3w {sortField === 'threeWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'threeWickets' && '⇅'}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600" onClick={() => handleSort('fiveWickets')}>
                5w {sortField === 'fiveWickets' && (sortDirection === 'asc' ? '↑' : '↓')}{sortField !== 'fiveWickets' && '⇅'}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <tr
                key={player.playerId}
                className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700 hover:bg-red-900/40'}
              >
                  <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-white truncate max-w-[100px] sm:max-w-none">{player.playerName}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalMatches}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalInnings}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalOvers}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalMaidens}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-300">{player.bowlingStats.totalWickets}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalRuns}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-green-400">
                  {calcEconomy(player.bowlingStats.totalRuns, player.bowlingStats.totalBalls).toFixed(1)}
                </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-red-400">
                  {player.bowlingStats.average.toFixed(1)}
                </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-orange-400">
                  {player.bowlingStats.strikeRate.toFixed(1)}
                </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-purple-400">{player.bowlingStats.bestHaul}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.threeWickets}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.fiveWickets}</td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
