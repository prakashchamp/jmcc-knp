'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { PlayersList } from '@/app/components/PlayersList';
import { PlayerStatsDetail } from '@/app/components/PlayerStatsDetail';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';

export default function PlayerStatsPage() {
  const { players, loading, error } = useAllPlayers();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const selectedPlayer = players.find((p) => p.playerId === selectedPlayerId) || null;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Player Statistics</h1>
          <p className="text-gray-400 mt-2">Click on a player to view their all-time statistics</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading players</p>
            <p>{error}</p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Players List */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-lg font-semibold text-white mb-4">Players</h2>
              <PlayersList
                players={players}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                loading={loading}
              />
            </div>
          </div>

          {/* Player Details */}
          <div className="lg:col-span-2">
            <PlayerStatsDetail player={selectedPlayer} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
