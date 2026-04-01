'use client';

import { useState, useEffect } from 'react';
import { Match, TeamStats } from '../cricket-schema';
import { MOCK_MATCHES } from '../mock-data';

/**
 * Hook to fetch and aggregate team statistics
 * Currently uses mock data - replace with Firestore queries when ready
 */
export function useTeamStats(): { data: TeamStats | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use mock data instead of Firestore
        const matches = MOCK_MATCHES;

        const stats: TeamStats = {
          totalMatches: matches.length,
          wins: 0,
          losses: 0,
          noResults: 0,
          ties: 0,
        };

        matches.forEach((match: Match) => {
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
  }, []);

  return { data, loading, error };
}
