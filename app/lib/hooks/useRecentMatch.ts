'use client';

import { useState, useEffect } from 'react';
import { Match } from '../cricket-schema';
import { MOCK_MATCHES } from '../mock-data';

/**
 * Hook to fetch the most recent match
 * Currently uses mock data - replace with Firestore queries when ready
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

        // Use mock data instead of Firestore
        const matches = MOCK_MATCHES;

        if (matches.length === 0) {
          setData(null);
          return;
        }

        // Sort by date in descending order and get the most recent
        const sorted = [...matches].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        setData(sorted[0]);
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
