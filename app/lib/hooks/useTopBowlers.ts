'use client';

import { useState, useEffect } from 'react';
import { Performance, PlayerBowlingStats } from '../cricket-schema';
import { MOCK_PERFORMANCES } from '../mock-data';

/**
 * Hook to fetch top 3 all-time bowlers
 * Currently uses mock data - replace with Firestore queries when ready
 */
export function useTopBowlers(): {
  data: PlayerBowlingStats[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PlayerBowlingStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTopBowlers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use mock data instead of Firestore
        const performances = MOCK_PERFORMANCES;

        // Build stats map
        const statsMap = new Map<string, PlayerBowlingStats & { matchIds: Set<string> }>();

        performances.forEach((perf: Performance) => {
          if (!perf.bowling.didBowl) {
            return;
          }

          const playerId = perf.playerId;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, {
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
              matchIds: new Set(),
            });
          }

          const stats = statsMap.get(playerId)!;

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
          stats.matchIds.add(perf.matchId);
        });

        // Convert to array and calculate aggregates
        let bowlers = Array.from(statsMap.values()).map(({ matchIds, ...stat }) => {
          const totalOvers = Math.floor(stat.totalBalls / 6);
          return {
            ...stat,
            totalMatches: matchIds.size,
            totalOvers,
            average: stat.totalWickets > 0 ? stat.totalRuns / stat.totalWickets : 0,
            strikeRate: stat.totalWickets > 0 ? stat.totalBalls / stat.totalWickets : 0,
            economy: totalOvers > 0 ? stat.totalRuns / totalOvers : 0,
          };
        });

        // Sort by total wickets descending and take top 3
        bowlers = bowlers.sort((a, b) => b.totalWickets - a.totalWickets).slice(0, 3);

        setData(bowlers);
      } catch (err) {
        console.error('Error fetching top bowlers:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopBowlers();
  }, []);

  return { data, loading, error };
}
