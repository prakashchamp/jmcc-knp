'use client';

import { useState, useEffect } from 'react';
import { Match } from '../cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Hook to fetch the most recent match from Firestore
 */
export function useRecentMatch(): { data: Match | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      setLoading(false);
      return;
    }
    const fetchMatch = async () => {
      try {
        setLoading(true);
        setError(null);

        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, orderBy('createdAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setData(null);
          return;
        }

        const doc = querySnapshot.docs[0];
        setData({ id: doc.id, ...doc.data() } as unknown as Match);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch recent match'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [fetchTrigger, isManualFetchMode]);

  return { data, loading, error };
}
