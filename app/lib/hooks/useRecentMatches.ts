'use client';

import { useState, useEffect } from 'react';
import { Match, Performance } from '../cricket-schema';
import { MOCK_MATCHES } from '../mock-data';
import { getCollection } from '@/services/firebase/operations';

export interface RecentMatchStats {
  match: Match;
  performances: Performance[];
}

/**
 * Hook to fetch recent N matches with their performances
 */
export function useRecentMatches(limit: number = 5) {
  const [matches, setMatches] = useState<RecentMatchStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use mock data - replace with Firestore when ready
        const allMatches: Match[] = MOCK_MATCHES;

        // Sort by date in descending order
        const sorted = [...allMatches].sort((a, b) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        // Get the last N matches
        const recentMatches = sorted.slice(0, limit);

        // For now, create stub performances - in production, fetch from 'performances' collection
        const recentWithPerformances: RecentMatchStats[] = recentMatches.map((match) => ({
          match,
          performances: [], // TODO: Fetch from Firestore performances collection
        }));

        setMatches(recentWithPerformances);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch recent matches'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [limit]);

  return { matches, loading, error };
}
