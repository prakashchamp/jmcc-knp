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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">All-Time Statistics</h1>
          <p className="text-gray-400 mt-2">Complete career statistics for all players</p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading stats</p>
            <p>{error}</p>
          </div>
        )}

        {/* Batting Stats Table */}
        <div className="mb-12">
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
