'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { getYearlyPlayerStatsAction } from '@/app/lib/actions/stats-actions';

export interface YearlyPlayerStats {
  playerId: string;
  playerName: string;
  battingStats: PlayerBattingStats;
  bowlingStats: PlayerBowlingStats;
}

export function useYearlyStats(year?: string) {
  const [players, setPlayers] = useState<YearlyPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!year) {
        setPlayers([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        const data = await getYearlyPlayerStatsAction(year);
        
        const sortedPlayers = data.sort((a, b) =>
          a.playerName.localeCompare(b.playerName)
        );

        setPlayers(sortedPlayers as unknown as YearlyPlayerStats[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [year]);

  return { players, loading, error };
}
