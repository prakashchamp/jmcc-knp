'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { PlayersList } from '@/app/components/PlayersList';
import { PlayerStatsDetail } from '@/app/components/PlayerStatsDetail';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';
import { Suspense } from 'react';

function PlayerStatsContent() {
  const searchParams = useSearchParams();
  const { players, loading, error } = useAllPlayers();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const playerId = searchParams.get('playerId');
    if (playerId) {
      setSelectedPlayerId(playerId);
      setShowDetail(true);
    }
  }, [searchParams]);

  const selectedPlayer = players.find((p) => p.playerId === selectedPlayerId) || null;

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    setShowDetail(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        {/* Page Title */}
        <div className="page-header">
          <h1 className="page-title text-white">Player Statistics</h1>
          <p className="hint-text mt-1 sm:mt-2">Select a player to view their all-time statistics</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
            <p className="font-semibold">Error loading players</p>
            <p>{error}</p>
          </div>
        )}

        {/* Mobile: show list or detail, toggle with back button */}
        <div className="block lg:hidden">
          {!showDetail ? (
            <div>
              <h2 className="card-title text-white mb-3">Players</h2>
              <PlayersList
                players={players}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={handleSelectPlayer}
                loading={loading}
              />
            </div>
          ) : (
            <div>
              <button
                onClick={() => setShowDetail(false)}
                className="flex items-center gap-1.5 text-green-400 text-sm font-medium mb-4 hover:text-green-300 transition-colors"
              >
                ← Back to Players
              </button>
              <PlayerStatsDetail player={selectedPlayer} loading={loading} />
            </div>
          )}
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="card-title text-white mb-4">Players</h2>
              <PlayersList
                players={players}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={setSelectedPlayerId}
                loading={loading}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <PlayerStatsDetail player={selectedPlayer} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlayerStatsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white"></div>
      </div>
    }>
      <PlayerStatsContent />
    </Suspense>
  );
}
