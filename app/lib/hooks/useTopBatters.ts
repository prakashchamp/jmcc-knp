'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats } from '../cricket-schema';
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
        const { getTopBattersAction } = await import('@/app/lib/actions/stats-actions');
        const batters = await getTopBattersAction();
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
