'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats } from '../cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Hook to fetch top 3 all-time batters from Firestore
 */
export function useTopBatters(): {
  data: PlayerBattingStats[] | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PlayerBattingStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchTopBatters = async () => {
      try {
        setLoading(true);
        setError(null);

        const performancesRef = collection(db, 'performances');
        const querySnapshot = await getDocs(performancesRef);
        
        // Build stats map
        const statsMap = new Map<string, PlayerBattingStats & { matchIds: Set<string> }>();

        querySnapshot.forEach((doc) => {
          const perf = doc.data();
          if (!perf.bat_did_bat) {
            return;
          }

          const playerId = perf.player_id;

          if (!statsMap.has(playerId)) {
            statsMap.set(playerId, {
              playerId,
              playerName: perf.player_name,
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

          stats.totalInnings += (perf.bat_innings || 0);
          stats.totalRuns += (perf.bat_runs || 0);
          stats.totalBalls += (perf.bat_balls || 0);
          stats.totalFours += (perf.bat_fours || 0);
          stats.totalSixes += (perf.bat_sixes || 0);
          
          if (!perf.bat_dismissed) {
            stats.notOuts += (perf.bat_innings || 0);
          }
          if (perf.bat_is_duck) {
            stats.ducks += 1;
          }
          if (perf.bat_is_thirty) {
            stats.thirties += 1;
          }
          if (perf.bat_is_fifty) {
            stats.fifties += 1;
          }
          if (perf.bat_is_hundred) {
            stats.hundreds += 1;
          }
          
          stats.bestScore = Math.max(stats.bestScore, perf.bat_runs || 0);
          stats.matchIds.add(perf.match_id);
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
  }, [fetchTrigger, isManualFetchMode]);

  return { data, loading, error };
}
