'use client';

import { useState, useEffect } from 'react';
import { Match, Performance } from '../cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from 'firebase/firestore';
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

        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, orderBy('createdAt', 'desc'), firestoreLimit(limitCount));
        const querySnapshot = await getDocs(q);

        const matchIds = querySnapshot.docs.map(doc => doc.id);
        
        if (matchIds.length === 0) {
          setMatches([]);
          return;
        }

        // Fetch performances for these matches
        const performancesRef = collection(db, 'performances');
        const perfSnapshot = await getDocs(performancesRef);
        const allPerfs = perfSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as Performance));

        const recentMatches: RecentMatchStats[] = querySnapshot.docs.map(doc => {
          const matchId = doc.id;
          return {
            match: { id: matchId, ...doc.data() } as unknown as Match,
            performances: allPerfs.filter(p => (p as any).match_id === matchId),
          };
        });

        setMatches(recentMatches);
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
