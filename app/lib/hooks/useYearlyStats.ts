'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export interface YearlyPlayerStats {
  playerId: string;
  playerName: string;
  battingStats: PlayerBattingStats;
  bowlingStats: PlayerBowlingStats;
}

export function useYearlyStats(year?: string) {
  const [players, setPlayers] = useState<YearlyPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const { getAllMatchesAction, getAllPerformancesAction } = await import('@/app/lib/actions/stats-actions');
        
        // 1. Fetch matches to filter by year
        const matches = await getAllMatchesAction();
        
        const validMatchIds = new Set<string>();
        matches.forEach((match) => {
          const createdAt = new Date(match.createdAt);
          const matchYear = createdAt.getFullYear().toString();
          
          if (!year || matchYear === year) {
            validMatchIds.add(match.id);
          }
        });

        if (validMatchIds.size === 0) {
          setPlayers([]);
          setLoading(false);
          return;
        }

        // 2. Fetch performances for these matches
        const allPerformances = await getAllPerformancesAction();
        
        const playerMap = new Map<string, YearlyPlayerStats>();
        const playerMatchIds = new Map<string, Set<string>>();

        allPerformances.forEach((perf: any) => {
          const matchId = perf.match_id || perf.matchId;
          if (!validMatchIds.has(matchId)) return;

          const playerId = perf.player_id || perf.playerId;
          const playerName = perf.player_name || perf.playerName;

          if (!playerMap.has(playerId)) {
            playerMap.set(playerId, {
              playerId,
              playerName: playerName,
              battingStats: {
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
              },
              bowlingStats: {
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
              },
            });
            playerMatchIds.set(playerId, new Set());
          }

          const player = playerMap.get(playerId)!;
          const matchIds = playerMatchIds.get(playerId)!;
          matchIds.add(matchId);

          // Batting
          if (perf.bat_did_bat) {
            const stats = player.battingStats;
            stats.totalInnings += (perf.bat_innings || 0);
            stats.totalRuns += (perf.bat_runs || 0);
            stats.totalBalls += (perf.bat_balls || 0);
            stats.totalFours += (perf.bat_fours || 0);
            stats.totalSixes += (perf.bat_sixes || 0);

            if (!perf.bat_dismissed) {
              stats.notOuts += (perf.bat_innings || 0);
            }
            if (perf.bat_is_duck) stats.ducks += 1;
            if (perf.bat_is_thirty) stats.thirties += 1;
            if (perf.bat_is_fifty) stats.fifties += 1;
            if (perf.bat_is_hundred) stats.hundreds += 1;

            stats.bestScore = Math.max(stats.bestScore, perf.bat_runs || 0);
          }

          // Bowling
          if (perf.bowl_did_bowl) {
            const stats = player.bowlingStats;
            stats.totalInnings += (perf.bowl_innings || 0);
            stats.totalWickets += (perf.bowl_wickets || 0);
            stats.totalRuns = (stats.totalRuns || 0) + (perf.bowl_runs || 0);
            stats.totalBalls += (perf.bowl_balls || 0);

            if (perf.bowl_is_three_fer) stats.threeWickets += 1;
            if (perf.bowl_is_five_fer) stats.fiveWickets += 1;

            stats.bestHaul = Math.max(stats.bestHaul, perf.bowl_wickets || 0);
          }
        });

        // 3. Final calculations
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [year, fetchTrigger, isManualFetchMode]);

  return { players, loading, error };
}
