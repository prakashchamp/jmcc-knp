'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { YearlyBattingStatsTable } from '@/app/components/YearlyBattingStatsTable';
import { YearlyBowlingStatsTable } from '@/app/components/YearlyBowlingStatsTable';
import { useYearlyStats } from '@/app/lib/hooks/useYearlyStats';
import { MOCK_PERFORMANCES } from '@/app/lib/mock-data';

export default function YearlyStatsPage() {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<{ value: string; label: string }[]>([]);

  // Extract unique years from mock data and sort descending
  useEffect(() => {
    const years = new Set(MOCK_PERFORMANCES.map((perf) => perf.year));
    const sortedYears = Array.from(years)
      .sort()
      .reverse() // Most recent first
      .map((yearStr) => ({
        value: yearStr,
        label: yearStr,
      }));

    setAvailableYears(sortedYears);
    // Set default to most recent year
    if (sortedYears.length > 0) {
      setSelectedYear(sortedYears[0].value);
    }
  }, []);

  const { players, loading, error } = useYearlyStats(selectedYear);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Yearly Statistics</h1>
          <p className="text-gray-400 mt-2">Detailed player statistics by year</p>
        </div>

        {/* Year Dropdown */}
        <div className="mb-8">
          <div className="max-w-xs">
            <label htmlFor="year-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white font-medium shadow-sm hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableYears.map((year) => (
                <option key={year.value} value={year.value}>
                  {year.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading stats</p>
            <p>{error}</p>
          </div>
        )}

        {/* Batting Stats Table */}
        <div className="mb-12">
          <YearlyBattingStatsTable players={players} loading={loading} />
        </div>

        {/* Bowling Stats Table */}
        <div>
          <YearlyBowlingStatsTable players={players} loading={loading} />
        </div>
      </main>
    </div>
  );
}
