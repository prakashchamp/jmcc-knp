'use client';

import { useState, useEffect } from 'react';
import { Performance, PlayerBattingStats } from '../cricket-schema';
import { MOCK_PERFORMANCES } from '../mock-data';

/**
 * Hook to fetch top 3 all-time batters
 * Currently uses mock data - replace with Firestore queries when ready
 */
export function useTopBatters(): {
  data: PlayerBattingStats[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PlayerBattingStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopBatters = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use mock data instead of Firestore
        const performances = MOCK_PERFORMANCES;

        // Build stats map
        const statsMap = new Map<string, PlayerBattingStats & { matchIds: Set<string> }>();

        performances.forEach((perf: Performance) => {
          if (!perf.batting.didBat) {
            return;
          }

          const playerId = perf.playerId;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, {
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
              matchIds: new Set(),
            });
          }

          const stats = statsMap.get(playerId)!;

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
          stats.matchIds.add(perf.matchId);
        });

        // Convert to array and calculate aggregates
        let batters = Array.from(statsMap.values()).map(({ matchIds, ...stat }) => {
          const dismissals = stat.totalInnings - stat.notOuts;
          return {
            ...stat,
            totalMatches: matchIds.size,
            average: dismissals > 0 ? stat.totalRuns / dismissals : stat.totalRuns,
            strikeRate: stat.totalBalls > 0 ? (stat.totalRuns / stat.totalBalls) * 100 : 0,
          };
        });

        // Sort by total runs descending and take top 3
        batters = batters.sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 3);

        setData(batters);
      } catch (err) {
        console.error('Error fetching top batters:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBatters();
  }, []);

  return { data, loading, error };
}
