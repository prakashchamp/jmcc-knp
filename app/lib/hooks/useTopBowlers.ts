'use client';

import { useState, useEffect } from 'react';
import { PlayerBowlingStats } from '../cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Hook to fetch top 3 all-time bowlers from Firestore
 */
export function useTopBowlers(): {
  data: PlayerBowlingStats[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PlayerBowlingStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchTopBowlers = async () => {
      try {
        setLoading(true);
        setError(null);

        const performancesRef = collection(db, 'performances');
        const querySnapshot = await getDocs(performancesRef);
        
        // Build stats map
        const statsMap = new Map<string, PlayerBowlingStats & { matchIds: Set<string> }>();

        querySnapshot.forEach((doc) => {
          const perf = doc.data();
          if (!perf.bowl_did_bowl) {
            return;
          }

          const playerId = perf.player_id;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, {
              playerId,
              playerName: perf.player_name,
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

          stats.totalInnings += (perf.bowl_innings || 0);
          stats.totalWickets += (perf.bowl_wickets || 0);
          stats.totalRuns = (stats.totalRuns || 0) + (perf.bowl_runs || 0);
          stats.totalBalls += (perf.bowl_balls || 0);
          
          if (perf.bowl_is_three_fer) {
            stats.threeWickets += 1;
          }
          if (perf.bowl_is_five_fer) {
            stats.fiveWickets += 1;
          }
          
          stats.bestHaul = Math.max(stats.bestHaul, perf.bowl_wickets || 0);
          stats.matchIds.add(perf.match_id);
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
  }, [fetchTrigger, isManualFetchMode]);

  return { data, loading, error };
}
