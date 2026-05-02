'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

import { getTopBattersClient } from '@/services/firebase';

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

  useEffect(() => {
    const fetchTopBatters = async () => {
      try {
        setLoading(true);
        setError(null);
        const batters = await getTopBattersClient();
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
