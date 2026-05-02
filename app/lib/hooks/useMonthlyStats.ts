'use client';

import { useState, useEffect } from 'react';
import { PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { getMonthlyPlayerStatsClient } from '@/services/firebase';

export interface MonthlyPlayerStats {
  playerId: string;
  playerName: string;
  battingStats: PlayerBattingStats;
  bowlingStats: PlayerBowlingStats;
}

export function useMonthlyStats(month?: string) {
  const [players, setPlayers] = useState<MonthlyPlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!month) {
        setPlayers([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        const data = await getMonthlyPlayerStatsClient(month);
        
        const sortedPlayers = data.sort((a, b) =>
          a.playerName.localeCompare(b.playerName)
        );

        setPlayers(sortedPlayers as unknown as MonthlyPlayerStats[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [month]);

  return { players, loading, error };
}
