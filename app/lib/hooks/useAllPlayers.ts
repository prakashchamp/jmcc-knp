'use client';

import { useState, useEffect } from 'react';
import { getCollectionData } from '@/services/firebase/operations';
import { Performance, PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  battingStats: PlayerBattingStats | null;
  bowlingStats: PlayerBowlingStats | null;
  totalMatches: number;
}

export function useAllPlayers() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    // Skip fetching on initial load if manual fetch mode is enabled
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real performances from Firestore
        const performances = await getCollectionData<Performance>('performances');
        
        const playerMap = new Map<string, PlayerStats>();
        const playerMatchIds = new Map<string, Set<string>>();

        // Process performances (Batting & Bowling)
        performances.forEach((perf) => {
          const playerId = perf.playerId;

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              playerId,
              playerName: perf.playerName,
              battingStats: null,
              bowlingStats: null,
              totalMatches: 0,
            });
            playerMatchIds.set(playerId, new Set());
          }

          const player = playerMap.get(playerId)!;
          const matchIds = playerMatchIds.get(playerId)!;
          matchIds.add(perf.matchId);

          // Process Batting
          if (perf.batting.didBat) {
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
            
            if (!perf.batting.dismissed) {
              stats.notOuts += perf.batting.innings;
            }
            if (perf.batting.isDuck) stats.ducks += 1;
            if (perf.batting.isThirty) stats.thirties += 1;
            if (perf.batting.isFifty) stats.fifties += 1;
            if (perf.batting.isHundred) stats.hundreds += 1;
            
            stats.bestScore = Math.max(stats.bestScore, perf.batting.runs);
          }

          // Process Bowling
          if (perf.bowling.didBowl) {
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
            stats.totalRuns += perf.bowling.runs;
            stats.totalBalls += perf.bowling.balls;
            
            if (perf.bowling.wickets === 3) stats.threeWickets += 1;
            if (perf.bowling.wickets >= 5) stats.fiveWickets += 1;
            
            stats.bestHaul = Math.max(stats.bestHaul, perf.bowling.wickets);
          }
        });

        // Calculate aggregated stats per player
        playerMap.forEach((player) => {
          const matchIds = playerMatchIds.get(player.playerId)!;
          player.totalMatches = matchIds.size;

          if (player.battingStats) {
            player.battingStats.totalMatches = matchIds.size;
            
            const dismissals = player.battingStats.totalInnings - player.battingStats.notOuts;
            if (dismissals > 0) {
              player.battingStats.average = player.battingStats.totalRuns / dismissals;
            } else {
              player.battingStats.average = player.battingStats.totalRuns;
            }
            
            if (player.battingStats.totalBalls > 0) {
              player.battingStats.strikeRate = (player.battingStats.totalRuns / player.battingStats.totalBalls) * 100;
            }
          }

          if (player.bowlingStats) {
            player.bowlingStats.totalMatches = matchIds.size;
            player.bowlingStats.totalOvers = Math.floor(player.bowlingStats.totalBalls / 6);
            
            if (player.bowlingStats.totalWickets > 0) {
              player.bowlingStats.average = player.bowlingStats.totalRuns / player.bowlingStats.totalWickets;
              player.bowlingStats.strikeRate = player.bowlingStats.totalBalls / player.bowlingStats.totalWickets;
            }
            
            if (player.bowlingStats.totalOvers > 0) {
              player.bowlingStats.economy = player.bowlingStats.totalRuns / player.bowlingStats.totalOvers;
            }
          }
        });

        // Ensure all players have both batting and bowling stats
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
    };

    fetchData();
  }, [fetchTrigger, isManualFetchMode]);

  return { players, loading, error };
}
