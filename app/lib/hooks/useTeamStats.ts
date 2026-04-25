'use client';

import { useState, useEffect } from 'react';
import { TeamStats } from '../cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Hook to fetch and aggregate team statistics from Firestore
 */
export function useTeamStats(): { data: TeamStats | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const matchesRef = collection(db, 'matches');
        const querySnapshot = await getDocs(matchesRef);

        const stats: TeamStats = {
          totalMatches: querySnapshot.size,
          wins: 0,
          losses: 0,
          noResults: 0,
          ties: 0,
        };

        querySnapshot.forEach((doc) => {
          const match = doc.data();
          switch (match.result) {
            case 'won':
              stats.wins++;
              break;
            case 'lost':
              stats.losses++;
              break;
            case 'no_result':
              stats.noResults++;
              break;
            case 'tie':
              stats.ties++;
              break;
          }
        });

        setData(stats);
      } catch (err) {
        console.error('Error fetching team stats:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [fetchTrigger, isManualFetchMode]);

  return { data, loading, error };
}
