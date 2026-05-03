'use client';

import { useState, useMemo } from 'react';
import { YearlyPlayerStats } from '../lib/hooks/useYearlyStats';

interface YearlyBowlingStatsTableProps {
  players: YearlyPlayerStats[];
  loading: boolean;
}

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalWickets' | 'totalRuns' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

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
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('playerName')}>
                Player
                {sortField === 'playerName' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('totalMatches')}>
                Mat
                {sortField === 'totalMatches' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('totalInnings')}>
                Inn
                {sortField === 'totalInnings' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('totalOvers')}>
                Overs
                {sortField === 'totalOvers' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('totalWickets')}>
                Wkts
                {sortField === 'totalWickets' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('totalRuns')}>
                Runs
                {sortField === 'totalRuns' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('economy')}>
                ECO
                {sortField === 'economy' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('average')}>
                Avg
                {sortField === 'average' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('strikeRate')}>
                SR
                {sortField === 'strikeRate' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('bestHaul')}>
                Best
                {sortField === 'bestHaul' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('threeWickets')}>
                3w
                {sortField === 'threeWickets' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
              </th>
              <th className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 select-none" onClick={() => handleSort('fiveWickets')}>
                5w
                {sortField === 'fiveWickets' ? (
                  <span className="text-red-400 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                ) : (
                  <span className="text-gray-500 ml-1">⇅</span>
                )}
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
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-gray-300">{player.bowlingStats.totalWickets}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{player.bowlingStats.totalRuns}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-blue-400">
                  {player.bowlingStats.economy.toFixed(1)}
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
