'use client';

import { useState, useEffect } from 'react';
import { Match } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Hook to fetch the most recent match from Firestore
 */
export function useRecentMatch(): { data: Match | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        setError(null);
        const { getRecentMatchesAction } = await import('@/app/lib/actions/stats-actions');
        const matches = await getRecentMatchesAction(1);
        if (matches && matches.length > 0) {
          setData(matches[0].match as Match);
        } else {
          setData(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch recent match'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, []);

  return { data, loading, error };
}
