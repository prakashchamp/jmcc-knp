'use client';

import { useState, useMemo } from 'react';
import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface AllTimeBattingStatsTableProps {
  players: PlayerStats[];
  loading: boolean;
}

type SortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalRuns' | 'totalBalls' | 'ducks' | 'notOuts' | 'totalFours' | 'totalSixes' | 'thirties' | 'fifties' | 'bestScore' | 'strikeRate' | 'average';

const SortIcon = ({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: 'asc' | 'desc' }) => (
  <span className={`ml-0.5 ${sortField === field ? 'text-blue-400' : 'text-gray-500'}`}>
    {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
  </span>
);

export function AllTimeBattingStatsTable({ players, loading }: AllTimeBattingStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalRuns');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const battingPlayers = players.filter((p) => p.battingStats && p.battingStats.totalInnings > 0);

  const sortedPlayers = useMemo(() => {
    return [...battingPlayers].sort((a, b) => {
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
        return sortDirection === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      }
      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });
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
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="section-title text-white mb-4 sm:mb-6">Batting Statistics</h3>
        <div className="h-48 sm:h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (battingPlayers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="section-title text-white mb-4 sm:mb-6">Batting Statistics</h3>
        <p className="text-gray-400 text-center py-6 sm:py-8 text-sm sm:text-base">No batting statistics available</p>
      </div>
    );
  }

  const thClass = 'px-2 sm:px-4 py-2 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800 text-xs sm:text-sm whitespace-nowrap';
  const thClassLeft = 'px-2 sm:px-4 py-2 sm:py-3 text-left font-semibold text-blue-100 cursor-pointer hover:bg-blue-800 text-xs sm:text-sm whitespace-nowrap';
  const tdClass = 'px-2 sm:px-4 py-2 sm:py-2.5 text-center text-gray-300 text-xs sm:text-sm whitespace-nowrap';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="section-title text-white p-4 sm:p-6 pb-3 sm:pb-4">Batting Statistics</h3>
      <div className="table-scroll">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
            <tr>
              <th className={thClassLeft} onClick={() => handleSort('playerName')}>
                Player <SortIcon field="playerName" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalMatches')}>
                Mat <SortIcon field="totalMatches" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalInnings')}>
                Inn <SortIcon field="totalInnings" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalRuns')}>
                Runs <SortIcon field="totalRuns" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalBalls')}>
                Balls <SortIcon field="totalBalls" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('ducks')}>
                Ducks <SortIcon field="ducks" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('notOuts')}>
                NO <SortIcon field="notOuts" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalFours')}>
                4s <SortIcon field="totalFours" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalSixes')}>
                6s <SortIcon field="totalSixes" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('thirties')}>
                30s <SortIcon field="thirties" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('fifties')}>
                50s <SortIcon field="fifties" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('bestScore')}>
                HS <SortIcon field="bestScore" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('strikeRate')}>
                SR <SortIcon field="strikeRate" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('average')}>
                Avg <SortIcon field="average" sortField={sortField} sortDirection={sortDirection} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedPlayers.map((player, index) => {
              const stats = player.battingStats!;
              const strikeRate = stats.totalBalls > 0 ? ((stats.totalRuns / stats.totalBalls) * 100).toFixed(2) : '0.00';
              const average = stats.totalInnings > 0 ? (stats.totalRuns / stats.totalInnings).toFixed(2) : '0.00';

              return (
                <tr
                  key={player.playerId}
                  className={index % 2 === 0 ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-750 hover:bg-gray-700'}
                >
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-left font-medium text-white text-xs sm:text-sm whitespace-nowrap">{player.playerName}</td>
                  <td className={tdClass}>{stats.totalMatches}</td>
                  <td className={tdClass}>{stats.totalInnings}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center font-semibold text-blue-400 text-xs sm:text-sm whitespace-nowrap">{stats.totalRuns}</td>
                  <td className={tdClass}>{stats.totalBalls}</td>
                  <td className={tdClass}>{stats.ducks}</td>
                  <td className={tdClass}>{stats.notOuts}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center text-green-400 font-medium text-xs sm:text-sm whitespace-nowrap">{stats.totalFours}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center text-orange-400 font-medium text-xs sm:text-sm whitespace-nowrap">{stats.totalSixes}</td>
                  <td className={tdClass}>{stats.thirties}</td>
                  <td className={tdClass}>{stats.fifties}</td>
                  <td className={tdClass}>{stats.bestScore}</td>
                  <td className={tdClass}>{strikeRate}</td>
                  <td className={tdClass}>{average}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
