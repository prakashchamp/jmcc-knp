'use client';

import { useState, useEffect } from 'react';
import { MOCK_PERFORMANCES, MOCK_MATCHES } from '../mock-data';
import { Performance, PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';

export interface YearlyPlayerStats {
  playerId: string;
  playerName: string;
  playerRole: string;
  battingStats: PlayerBattingStats;
  bowlingStats: PlayerBowlingStats;
}

export function useYearlyStats(year?: string) {
  const [players, setPlayers] = useState<YearlyPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const playerMap = new Map<string, YearlyPlayerStats>();
      const playerMatchIds = new Map<string, Set<string>>();

      // Filter performances by year if specified
      const filterByYear = year ? (perf: Performance) => perf.year === year : () => true;
      const filteredPerformances = MOCK_PERFORMANCES.filter(filterByYear);

      // Process batting performances
      filteredPerformances.filter((perf) => perf.batting.didBat).forEach((perf) => {
        const playerId = perf.playerId;

        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            playerId,
            playerName: perf.playerName,
            playerRole: perf.playerRole,
            battingStats: {
              playerId,
              playerName: perf.playerName,
              totalMatches: 0,
              totalInnings: 0,
              notOuts: 0,
              totalRuns: 0,
              bestScore: 0,
              average: 0,
              totalBalls: 0,
              strikeRate: 0,
              totalFours: 0,
              totalSixes: 0,
              thirties: 0,
              fifties: 0,
              hundreds: 0,
              ducks: 0,
            },
            bowlingStats: {
              playerId,
              playerName: perf.playerName,
              totalMatches: 0,
              totalInnings: 0,
              totalWickets: 0,
              bestHaul: 0,
              totalRuns: 0,
              totalBalls: 0,
              totalOvers: 0,
              average: 0,
              strikeRate: 0,
              economy: 0,
              threeWickets: 0,
              fiveWickets: 0,
            },
          });
          playerMatchIds.set(playerId, new Set());
        }

        const player = playerMap.get(playerId)!;
        const matchIds = playerMatchIds.get(playerId)!;
        matchIds.add(perf.matchId);

        const stats = player.battingStats;
        stats.totalInnings += perf.batting.innings;
        stats.totalRuns += perf.batting.runs;
        stats.totalBalls += perf.batting.balls;
        stats.totalFours += perf.batting.fours;
        stats.totalSixes += perf.batting.sixes;

        if (!perf.batting.dismissed) {
          stats.notOuts += perf.batting.innings;
        }
        if (perf.batting.isDuck) {
          stats.ducks += 1;
        }
        if (perf.batting.isThirty) {
          stats.thirties += 1;
        }
        if (perf.batting.isFifty) {
          stats.fifties += 1;
        }
        if (perf.batting.isHundred) {
          stats.hundreds += 1;
        }

        stats.bestScore = Math.max(stats.bestScore, perf.batting.runs);
      });

      // Process bowling performances
      filteredPerformances.filter((perf) => perf.bowling.didBowl).forEach((perf) => {
        const playerId = perf.playerId;

        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            playerId,
            playerName: perf.playerName,
            playerRole: perf.playerRole,
            battingStats: {
              playerId,
              playerName: perf.playerName,
              totalMatches: 0,
              totalInnings: 0,
              notOuts: 0,
              totalRuns: 0,
              bestScore: 0,
              average: 0,
              totalBalls: 0,
              strikeRate: 0,
              totalFours: 0,
              totalSixes: 0,
              thirties: 0,
              fifties: 0,
              hundreds: 0,
              ducks: 0,
            },
            bowlingStats: {
              playerId,
              playerName: perf.playerName,
              totalMatches: 0,
              totalInnings: 0,
              totalWickets: 0,
              bestHaul: 0,
              totalRuns: 0,
              totalBalls: 0,
              totalOvers: 0,
              average: 0,
              strikeRate: 0,
              economy: 0,
              threeWickets: 0,
              fiveWickets: 0,
            },
          });
          playerMatchIds.set(playerId, new Set());
        }

        const player = playerMap.get(playerId)!;
        const matchIds = playerMatchIds.get(playerId)!;
        matchIds.add(perf.matchId);

        const stats = player.bowlingStats;
        stats.totalInnings += perf.bowling.innings;
        stats.totalWickets += perf.bowling.wickets;
        stats.totalRuns = (stats.totalRuns || 0) + perf.bowling.runs;
        stats.totalBalls += perf.bowling.balls;

        if (perf.bowling.isThreeFer) {
          stats.threeWickets += 1;
        }
        if (perf.bowling.isFiveFer) {
          stats.fiveWickets += 1;
        }

        stats.bestHaul = Math.max(stats.bestHaul, perf.bowling.wickets);
      });

      // Calculate aggregated stats per player
      playerMap.forEach((player) => {
        const matchIds = playerMatchIds.get(player.playerId)!;
        player.battingStats.totalMatches = matchIds.size;
        player.bowlingStats.totalMatches = matchIds.size;

        const battingStats = player.battingStats;
        const dismissals = battingStats.totalInnings - battingStats.notOuts;
        if (dismissals > 0) {
          battingStats.average = battingStats.totalRuns / dismissals;
        } else if (battingStats.totalInnings > 0) {
          battingStats.average = battingStats.totalRuns;
        }

        if (battingStats.totalBalls > 0) {
          battingStats.strikeRate = (battingStats.totalRuns / battingStats.totalBalls) * 100;
        }

        const bowlingStats = player.bowlingStats;
        bowlingStats.totalOvers = Math.floor(bowlingStats.totalBalls / 6);

        if (bowlingStats.totalWickets > 0) {
          bowlingStats.average = bowlingStats.totalRuns / bowlingStats.totalWickets;
          bowlingStats.strikeRate = bowlingStats.totalBalls / bowlingStats.totalWickets;
        }

        if (bowlingStats.totalOvers > 0) {
          bowlingStats.economy = bowlingStats.totalRuns / bowlingStats.totalOvers;
        }
      });

      const sortedPlayers = Array.from(playerMap.values()).sort((a, b) =>
        a.playerName.localeCompare(b.playerName)
      );

      setPlayers(sortedPlayers);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      setLoading(false);
    }
  }, [year]);

  return { players, loading, error };
}
