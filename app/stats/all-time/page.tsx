'use client';

import { Header } from '@/app/components/Header';
import { AllTimeBattingStatsTable } from '@/app/components/AllTimeBattingStatsTable';
import { AllTimeBowlingStatsTable } from '@/app/components/AllTimeBowlingStatsTable';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';

export default function AllTimeStatsPage() {
  const { players, loading, error } = useAllPlayers();

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title text-white">All-Time Statistics</h1>
          <p className="hint-text mt-1 sm:mt-2">Complete career statistics for all players</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
            <p className="font-semibold">Error loading stats</p>
            <p>{error}</p>
          </div>
        )}

        {/* Batting Stats Table */}
        <div className="mb-8 sm:mb-12">
          <AllTimeBattingStatsTable players={players} loading={loading} />
        </div>

        {/* Bowling Stats Table */}
        <div>
          <AllTimeBowlingStatsTable players={players} loading={loading} />
        </div>
      </main>
    </div>
  );
}
