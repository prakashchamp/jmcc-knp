'use client';

import { useState, useEffect } from 'react';
import { Performance, PlayerBattingStats, PlayerBowlingStats } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { getAllTimePlayerStatsClient } from '@/services/firebase';

export interface PlayerStats {
  playerId: string;
  playerName: string;
  battingStats: PlayerBattingStats | null;
  bowlingStats: PlayerBowlingStats | null;
  totalMatches: number;
}

export function useAllPlayers(forceRefresh = false) {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await getAllTimePlayerStatsClient(forceRefresh);
        
        const sortedPlayers = data.sort((a, b) =>
          a.playerName.localeCompare(b.playerName)
        );

        const uniquePlayers = new Map<string, PlayerStats>();
        sortedPlayers.forEach((player) => {
          const normalizedName = player.playerName.trim().toLowerCase().replace(/\s+/g, ' ');
          if (!uniquePlayers.has(normalizedName)) {
            uniquePlayers.set(normalizedName, player);
          }
        });

        setPlayers(Array.from(uniquePlayers.values()) as unknown as PlayerStats[]);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { players, loading, error };
}
