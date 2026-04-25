'use client';

import { useState, useEffect } from 'react';
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
        const { getAllPerformancesAction } = await import('@/app/lib/actions/stats-actions');
        const performances = await getAllPerformancesAction();
        
        const playerMap = new Map<string, PlayerStats>();
        const playerMatchIds = new Map<string, Set<string>>();

        // Process performances (Batting & Bowling)
        performances.forEach((perf: any) => {
          const playerId = perf.player_id || perf.playerId;
          const playerName = perf.player_name || perf.playerName;
          const matchId = perf.match_id || perf.matchId;

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              playerId,
              playerName: playerName,
              battingStats: null,
              bowlingStats: null,
              totalMatches: 0,
            });
            playerMatchIds.set(playerId, new Set());
          }

          const player = playerMap.get(playerId)!;
          const matchIds = playerMatchIds.get(playerId)!;
          matchIds.add(matchId);

          // Process Batting
          const batDidBat = perf.bat_did_bat !== undefined ? perf.bat_did_bat : perf.batting?.didBat;
          if (batDidBat) {
            if (!player.battingStats) {
              player.battingStats = {
                playerId,
                playerName: playerName,
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
            const batInnings = perf.bat_innings !== undefined ? perf.bat_innings : perf.batting?.innings || 0;
            const batRuns = perf.bat_runs !== undefined ? perf.bat_runs : perf.batting?.runs || 0;
            const batBalls = perf.bat_balls !== undefined ? perf.bat_balls : perf.batting?.balls || 0;
            const batFours = perf.bat_fours !== undefined ? perf.bat_fours : perf.batting?.fours || 0;
            const batSixes = perf.bat_sixes !== undefined ? perf.bat_sixes : perf.batting?.sixes || 0;
            const batDismissed = perf.bat_dismissed !== undefined ? perf.bat_dismissed : perf.batting?.dismissed;
            const batIsDuck = perf.bat_is_duck !== undefined ? perf.bat_is_duck : perf.batting?.isDuck;
            const batIsThirty = perf.bat_is_thirty !== undefined ? perf.bat_is_thirty : perf.batting?.isThirty;
            const batIsFifty = perf.bat_is_fifty !== undefined ? perf.bat_is_fifty : perf.batting?.isFifty;
            const batIsHundred = perf.bat_is_hundred !== undefined ? perf.bat_is_hundred : perf.batting?.isHundred;

            stats.totalInnings += batInnings;
            stats.totalRuns += batRuns;
            stats.totalBalls += batBalls;
            stats.totalFours += batFours;
            stats.totalSixes += batSixes;
            
            if (!batDismissed) {
              stats.notOuts += batInnings;
            }
            if (batIsDuck) stats.ducks += 1;
            if (batIsThirty) stats.thirties += 1;
            if (batIsFifty) stats.fifties += 1;
            if (batIsHundred) stats.hundreds += 1;
            
            stats.bestScore = Math.max(stats.bestScore, batRuns);
          }

          // Process Bowling
          const bowlDidBowl = perf.bowl_did_bowl !== undefined ? perf.bowl_did_bowl : perf.bowling?.didBowl;
          if (bowlDidBowl) {
            if (!player.bowlingStats) {
              player.bowlingStats = {
                playerId,
                playerName: playerName,
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
            const bowlInnings = perf.bowl_innings !== undefined ? perf.bowl_innings : perf.bowling?.innings || 0;
            const bowlWickets = perf.bowl_wickets !== undefined ? perf.bowl_wickets : perf.bowling?.wickets || 0;
            const bowlRuns = perf.bowl_runs !== undefined ? perf.bowl_runs : perf.bowling?.runs || 0;
            const bowlBalls = perf.bowl_balls !== undefined ? perf.bowl_balls : perf.bowling?.balls || 0;

            stats.totalInnings += bowlInnings;
            stats.totalWickets += bowlWickets;
            stats.totalRuns += bowlRuns;
            stats.totalBalls += bowlBalls;
            
            if (bowlWickets === 3) stats.threeWickets += 1;
            if (bowlWickets >= 5) stats.fiveWickets += 1;
            
            stats.bestHaul = Math.max(stats.bestHaul, bowlWickets);
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
