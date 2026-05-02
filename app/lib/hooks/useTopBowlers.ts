'use client';

import { useState, useEffect } from 'react';
import { PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

import { getTopBowlersClient } from '@/services/firebase';

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

  useEffect(() => {
    const fetchTopBowlers = async () => {
      try {
        setLoading(true);
        setError(null);
        const bowlers = await getTopBowlersClient();
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
