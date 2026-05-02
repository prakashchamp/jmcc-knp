'use client';

import { useState, useEffect } from 'react';
import { Match, Performance } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export interface RecentMatchStats {
  match: Match;
  performances: Performance[];
}

import { getRecentMatchesClient } from '@/services/firebase';

/**
 * Hook to fetch recent N matches from Firestore
 */
export function useRecentMatches(limitCount: number = 5) {
  const [matches, setMatches] = useState<RecentMatchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        const recentMatches = await getRecentMatchesClient(limitCount);
        setMatches(recentMatches as RecentMatchStats[]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch recent matches'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [limitCount]);

  return { matches, loading, error };
}
