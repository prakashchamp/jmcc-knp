'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { MonthlyBattingStatsTable } from '@/app/components/MonthlyBattingStatsTable';
import { MonthlyBowlingStatsTable } from '@/app/components/MonthlyBowlingStatsTable';
import { useMonthlyStats } from '@/app/lib/hooks/useMonthlyStats';
import { MOCK_PERFORMANCES } from '@/app/lib/mock-data';

export default function MonthlyStatsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);

  // Extract unique months from mock data and sort descending
  useEffect(() => {
    const months = new Set(MOCK_PERFORMANCES.map((perf) => perf.month));
    const sortedMonths = Array.from(months)
      .sort()
      .reverse() // Most recent first
      .map((monthStr) => {
        const [year, month] = monthStr.split('-');
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const monthName = monthNames[parseInt(month) - 1];
        return {
          value: monthStr,
          label: `${monthName} ${year}`,
        };
      });

    setAvailableMonths(sortedMonths);
    // Set default to most recent month
    if (sortedMonths.length > 0) {
      setSelectedMonth(sortedMonths[0].value);
    }
  }, []);

  const { players, loading, error } = useMonthlyStats(selectedMonth);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white">Monthly Statistics</h1>
          <p className="text-gray-400 mt-2">Detailed player statistics by month</p>
        </div>

        {/* Month Dropdown */}
        <div className="mb-8">
          <div className="max-w-xs">
            <label htmlFor="month-select" className="block text-sm font-medium text-gray-300 mb-2">
              Select Month
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white font-medium shadow-sm hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading stats</p>
            <p>{error}</p>
          </div>
        )}

        {/* Batting Stats Table */}
        <div className="mb-12">
          <MonthlyBattingStatsTable players={players} loading={loading} />
        </div>

        {/* Bowling Stats Table */}
        <div>
          <MonthlyBowlingStatsTable players={players} loading={loading} />
        </div>
      </main>
    </div>
  );
}
