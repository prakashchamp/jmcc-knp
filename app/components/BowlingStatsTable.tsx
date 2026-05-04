'use client';

import { useState, useMemo } from 'react';
import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface AllTimeBowlingStatsTableProps {
  players: PlayerStats[];
  loading: boolean;
}

type BowlingSortField = 'playerName' | 'totalMatches' | 'totalInnings' | 'totalOvers' | 'totalMaidens' | 'totalWickets' | 'totalRuns' | 'threeWickets' | 'fiveWickets' | 'bestHaul' | 'economy' | 'strikeRate' | 'average';

const SortIcon = ({ field, sortField, sortDirection }: { field: BowlingSortField; sortField: BowlingSortField; sortDirection: 'asc' | 'desc' }) => (
  <span className={`ml-0.5 ${sortField === field ? 'text-yellow-300' : 'text-white/50'}`}>
    {sortField === field ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
  </span>
);

export function AllTimeBowlingStatsTable({ players, loading }: AllTimeBowlingStatsTableProps) {
  const [sortField, setSortField] = useState<BowlingSortField>('totalWickets');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const bowlingPlayers = players.filter((p) => p.bowlingStats && p.bowlingStats.totalInnings > 0);

  const sortedPlayers = useMemo(() => {
    return [...bowlingPlayers].sort((a, b) => {
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
        return sortDirection === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      }
      return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
    });
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
        <div className="h-48 sm:h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (bowlingPlayers.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 sm:p-6 border border-gray-700">
        <h3 className="section-title text-white mb-4 sm:mb-6">Bowling Statistics</h3>
        <p className="text-gray-400 text-center py-6 sm:py-8 text-sm sm:text-base">No bowling statistics available</p>
      </div>
    );
  }

  const thClass = 'px-2 sm:px-4 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 transition whitespace-nowrap';
  const thClassLeft = 'px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 cursor-pointer hover:bg-yellow-600 transition whitespace-nowrap';
  const tdClass = 'px-2 sm:px-4 py-2 sm:py-2.5 text-center text-gray-300 text-xs sm:text-sm whitespace-nowrap';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="section-title text-white p-4 sm:p-6 pb-3 sm:pb-4">Bowling Statistics</h3>
      <div className="table-scroll">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-yellow-700 to-yellow-600 text-gray-900">
              <th className={thClassLeft} onClick={() => handleSort('playerName')}>
                Player <SortIcon field="playerName" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalMatches')}>
                Mat <SortIcon field="totalMatches" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalInnings')}>
                Inn <SortIcon field="totalInnings" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalOvers')}>
                Overs <SortIcon field="totalOvers" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalMaidens')}>
                M <SortIcon field="totalMaidens" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalWickets')}>
                Wkts <SortIcon field="totalWickets" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('totalRuns')}>
                Runs <SortIcon field="totalRuns" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('economy')}>
                ECO <SortIcon field="economy" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('average')}>
                avg <SortIcon field="average" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('strikeRate')}>
                SR <SortIcon field="strikeRate" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('bestHaul')}>
                Best <SortIcon field="bestHaul" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('threeWickets')}>
                3w <SortIcon field="threeWickets" sortField={sortField} sortDirection={sortDirection} />
              </th>
              <th className={thClass} onClick={() => handleSort('fiveWickets')}>
                5w <SortIcon field="fiveWickets" sortField={sortField} sortDirection={sortDirection} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedPlayers.map((player, index) => {
              const stats = player.bowlingStats!;
              const economy = stats.totalBalls > 0 ? ((stats.totalRuns / (stats.totalBalls / 6)) * stats.totalOvers).toFixed(2) : '0.00';
              const strikeRate = stats.totalWickets > 0 ? (stats.totalBalls / stats.totalWickets).toFixed(2) : '0.00';
              const average = stats.totalWickets > 0 ? (stats.totalRuns / stats.totalWickets).toFixed(2) : '0.00';

              return (
                <tr key={player.playerId} className={index % 2 === 0 ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-750 hover:bg-gray-700'}>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm font-medium text-white whitespace-nowrap">{player.playerName}</td>
                  <td className={tdClass}>{stats.totalMatches}</td>
                  <td className={tdClass}>{stats.totalInnings}</td>
                  <td className={tdClass}>{stats.totalOvers.toFixed(1)}</td>
                  <td className={tdClass}>{stats.totalMaidens}</td>
                  <td className="px-2 sm:px-4 py-2 sm:py-2.5 text-center font-semibold text-xs sm:text-sm whitespace-nowrap">{stats.totalWickets}</td>
                  <td className={tdClass}>{stats.totalRuns}</td>
                  <td className={tdClass}>{economy}</td>
                  <td className={tdClass}>{average}</td>
                  <td className={tdClass}>{strikeRate}</td>
                  <td className={tdClass}>{stats.bestHaul}</td>
                  <td className={tdClass}>{stats.threeWickets}</td>
                  <td className={tdClass}>{stats.fiveWickets}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
