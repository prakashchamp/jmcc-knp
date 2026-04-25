'use client';

import { useState, useEffect } from 'react';
import { Match, Performance } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export interface RecentMatchStats {
  match: Match;
  performances: Performance[];
}

/**
 * Hook to fetch recent N matches from Firestore
 */
export function useRecentMatches(limitCount: number = 5) {
  const [matches, setMatches] = useState<RecentMatchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const { getRecentMatchesAction } = await import('@/app/lib/actions/stats-actions');
        const recentMatches = await getRecentMatchesAction(limitCount);
        setMatches(recentMatches as RecentMatchStats[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch recent matches'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [limitCount, fetchTrigger, isManualFetchMode]);

  return { matches, loading, error };
}
