'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { MonthlyBattingStatsTable } from '@/app/components/MonthlyBattingStatsTable';
import { MonthlyBowlingStatsTable } from '@/app/components/MonthlyBowlingStatsTable';
import { useMonthlyStats } from '@/app/lib/hooks/useMonthlyStats';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export default function MonthlyStatsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);

  // Extract unique months from Firestore matches
  useEffect(() => {
    if (isManualFetchMode && fetchTrigger === 0) {
      return;
    }
    const fetchAvailableMonths = async () => {
      try {
        const { getAllMatchesAction } = await import('@/app/lib/actions/stats-actions');
        const matches = await getAllMatchesAction();
        
        const monthsMap = new Map<string, string>();
        matches.forEach(match => {
          const date = new Date(match.createdAt);
          const monthKey = date.toLocaleString('default', { month: 'long' });
          const yearKey = date.getFullYear().toString();
          const label = `${monthKey} ${yearKey}`;
          monthsMap.set(monthKey, label);
        });

        const sortedMonths = Array.from(monthsMap.entries()).map(([value, label]) => ({
          value,
          label
        }));

        setAvailableMonths(sortedMonths);
        if (sortedMonths.length > 0 && !selectedMonth) {
          setSelectedMonth(sortedMonths[0].value);
        }
      } catch (err) {
        console.error('Error fetching months:', err);
      }
    };

    fetchAvailableMonths();
  }, [fetchTrigger, isManualFetchMode, selectedMonth]);

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
