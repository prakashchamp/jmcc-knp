'use client';

import { useState, useEffect } from 'react';
import { MOCK_PERFORMANCES, MOCK_MATCHES } from '../mock-data';
import { Performance, PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  playerRole: string;
  battingStats: PlayerBattingStats | null;
  bowlingStats: PlayerBowlingStats | null;
  totalMatches: number;
}

export function useAllPlayers() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const playerMap = new Map<string, PlayerStats>();
      const playerMatchIds = new Map<string, Set<string>>();

      // Process batting performances
      MOCK_PERFORMANCES.filter((perf) => perf.batting.didBat).forEach((perf) => {
        const playerId = perf.playerId;

        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            playerId,
            playerName: perf.playerName,
            playerRole: perf.playerRole,
            battingStats: null,
            bowlingStats: null,
            totalMatches: 0,
          });
          playerMatchIds.set(playerId, new Set());
        }

        const player = playerMap.get(playerId)!;
        const matchIds = playerMatchIds.get(playerId)!;
        matchIds.add(perf.matchId);

        if (!player.battingStats) {
          player.battingStats = {
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
          };
        }

        const stats = player.battingStats!;
        stats.totalInnings += perf.batting.innings;
        stats.totalRuns += perf.batting.runs;
        stats.totalBalls += perf.batting.balls;
        stats.totalFours += perf.batting.fours;
        stats.totalSixes += perf.batting.sixes;
        
        // Track milestones
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
      MOCK_PERFORMANCES.filter((perf) => perf.bowling.didBowl).forEach((perf) => {
        const playerId = perf.playerId;

        if (!playerMap.has(playerId)) {
          playerMap.set(playerId, {
            playerId,
            playerName: perf.playerName,
            playerRole: perf.playerRole,
            battingStats: null,
            bowlingStats: null,
            totalMatches: 0,
          });
          playerMatchIds.set(playerId, new Set());
        }

        const player = playerMap.get(playerId)!;
        const matchIds = playerMatchIds.get(playerId)!;
        matchIds.add(perf.matchId);

        if (!player.bowlingStats) {
          player.bowlingStats = {
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
          };
        }

        const stats = player.bowlingStats!;
        stats.totalInnings += perf.bowling.innings;
        stats.totalWickets += perf.bowling.wickets;
        stats.totalRuns = (stats.totalRuns || 0) + perf.bowling.runs;
        stats.totalBalls += perf.bowling.balls;
        
        // Track milestone wickets
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
        player.totalMatches = matchIds.size;

        if (player.battingStats) {
          player.battingStats.totalMatches = matchIds.size;
          
          // Calculate average (runs / (innings - notOuts))
          const dismissals = player.battingStats.totalInnings - player.battingStats.notOuts;
          if (dismissals > 0) {
            player.battingStats.average = player.battingStats.totalRuns / dismissals;
          } else {
            player.battingStats.average = player.battingStats.totalRuns; // Not out in all matches
          }
          
          // Calculate strike rate
          if (player.battingStats.totalBalls > 0) {
            player.battingStats.strikeRate = (player.battingStats.totalRuns / player.battingStats.totalBalls) * 100;
          }
        }

        if (player.bowlingStats) {
          player.bowlingStats.totalMatches = matchIds.size;
          player.bowlingStats.totalOvers = Math.floor(player.bowlingStats.totalBalls / 6);
          
          // Calculate bowling average (runs / wickets) and strike rate
          if (player.bowlingStats.totalWickets > 0) {
            player.bowlingStats.average = player.bowlingStats.totalRuns / player.bowlingStats.totalWickets;
            player.bowlingStats.strikeRate = player.bowlingStats.totalBalls / player.bowlingStats.totalWickets;
          }
          
          // Calculate economy (runs / overs)
          if (player.bowlingStats.totalOvers > 0) {
            player.bowlingStats.economy = player.bowlingStats.totalRuns / player.bowlingStats.totalOvers;
          }
        }
      });

      // Ensure all players have both batting and bowling stats (initialize empty ones with 0 values)
      playerMap.forEach((player) => {
        const matchIds = playerMatchIds.get(player.playerId)!;

        if (!player.battingStats) {
          player.battingStats = {
            playerId: player.playerId,
            playerName: player.playerName,
            totalMatches: matchIds.size,
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
          };
        }

        if (!player.bowlingStats) {
          player.bowlingStats = {
            playerId: player.playerId,
            playerName: player.playerName,
            totalMatches: matchIds.size,
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
          };
        }
      });

      const sortedPlayers = Array.from(playerMap.values()).sort((a, b) =>
        a.playerName.localeCompare(b.playerName)
      );

      setPlayers(sortedPlayers);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
      setLoading(false);
    }
  }, []);

  return { players, loading, error };
}
