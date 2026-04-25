'use client';

import { useState, useMemo } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';

interface RecentMatchesBattingProps {
  matches: Match[];
  performances: Performance[];
  loading: boolean;
}

interface ConsolidatedBattingStats {
  playerName: string;
  matches: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

type SortField = 'playerName' | 'matches' | 'runs' | 'balls' | 'fours' | 'sixes' | 'strikeRate';

export function RecentMatchesBatting({ matches, performances, loading }: RecentMatchesBattingProps) {
  const [sortField, setSortField] = useState<SortField>('runs');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter performances for matching matches and with batting data
  const relevantPerformances = performances.filter((perf) => {
    const matchFound = matches.find((m) => m.id === perf.matchId);
    return matchFound && perf.batting.didBat;
  });

  // Consolidate stats by player
  const playerStatsMap = useMemo(() => {
    const map = new Map<string, ConsolidatedBattingStats>();

    relevantPerformances.forEach((perf) => {
      const existing = map.get(perf.playerName) || {
        playerName: perf.playerName,
        matches: 0,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        strikeRate: 0,
      };

      existing.matches += 1;
      existing.runs += perf.batting.runs;
      existing.balls += perf.batting.balls;
      existing.fours += perf.batting.fours;
      existing.sixes += perf.batting.sixes;

      map.set(perf.playerName, existing);
    });

    // Calculate consolidated strike rates
    map.forEach((stats) => {
      stats.strikeRate = stats.balls > 0 ? (stats.runs / stats.balls) * 100 : 0;
    });

    return map;
  }, [relevantPerformances]);

  // Sort performances
  const sortedStats = useMemo(() => {
    const statsArray = Array.from(playerStatsMap.values()).sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'playerName') {
        aVal = a.playerName;
        bVal = b.playerName;
      } else if (sortField === 'matches') {
        aVal = a.matches;
        bVal = b.matches;
      } else if (sortField === 'runs') {
        aVal = a.runs;
        bVal = b.runs;
      } else if (sortField === 'balls') {
        aVal = a.balls;
        bVal = b.balls;
      } else if (sortField === 'fours') {
        aVal = a.fours;
        bVal = b.fours;
      } else if (sortField === 'sixes') {
        aVal = a.sixes;
        bVal = b.sixes;
      } else if (sortField === 'strikeRate') {
        aVal = a.strikeRate;
        bVal = b.strikeRate;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return statsArray;
  }, [playerStatsMap, sortField, sortDirection]);

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
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <h3 className="text-2xl font-bold text-white p-6 pb-4">Recent Matches Batting Stats</h3>
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (sortedStats.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6">Recent Matches Batting Stats</h3>
        <p className="text-gray-400 text-center py-8">No batting data available</p>
      </div>
    );
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    }
    return <span className="text-gray-500 ml-1">⇅</span>;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <h3 className="text-2xl font-bold text-white p-6 pb-4">Recent Matches Batting Stats</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
            <tr>
              <th
                className="px-4 py-3 text-left font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('playerName')}
              >
                Player
                {renderSortIndicator('playerName')}
              </th>
              <th
                className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('matches')}
              >
                Matches
                {renderSortIndicator('matches')}
              </th>
              <th
                className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('runs')}
              >
                Runs
                {renderSortIndicator('runs')}
              </th>
              <th
                className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('balls')}
              >
                Balls
                {renderSortIndicator('balls')}
              </th>
              <th
                className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('fours')}
              >
                4s
                {renderSortIndicator('fours')}
              </th>
              <th
                className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('sixes')}
              >
                6s
                {renderSortIndicator('sixes')}
              </th>
              <th
                className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-100 cursor-pointer hover:bg-blue-800"
                onClick={() => handleSort('strikeRate')}
              >
                SR
                {renderSortIndicator('strikeRate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStats.map((stats, idx) => (
              <tr
                key={stats.playerName}
                className={
                  idx % 2 === 0 ? 'bg-gray-800 text-gray-100' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                }
              >
                <td className="px-2 py-2 sm:px-4 sm:py-3 font-semibold text-white">{stats.playerName}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{stats.matches}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center font-semibold text-blue-400">{stats.runs}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{stats.balls}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{stats.fours}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-gray-300">{stats.sixes}</td>
                <td className="px-2 py-2 sm:px-4 sm:py-3 text-center text-orange-400">
                  {stats.strikeRate > 0 ? stats.strikeRate.toFixed(1) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
