'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { MonthlyBattingStatsTable } from '@/app/components/MonthlyBattingStatsTable';
import { MonthlyBowlingStatsTable } from '@/app/components/MonthlyBowlingStatsTable';
import { CustomSelect } from '@/app/components/CustomSelect';
import { useMonthlyStats } from '@/app/lib/hooks/useMonthlyStats';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { fetchAllMatches } from '@/app/lib/redux/slices/statsSlice';

export default function MonthlyStatsPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const dispatch = useDispatch<AppDispatch>();
  const { availableMonths } = useSelector((state: RootState) => state.stats);

  useEffect(() => {
    dispatch(fetchAllMatches(false));
  }, [dispatch]);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);

  const { players, loading, error } = useMonthlyStats(selectedMonth);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title text-white">Monthly Statistics</h1>
          <p className="hint-text mt-1 sm:mt-2">Detailed player statistics by month</p>
        </div>

        {/* Month Dropdown */}
        <div className="mb-4 sm:mb-8">
          <div className="w-full max-w-xs">
            <CustomSelect
              id="month-select"
              label="Select Month"
              options={availableMonths}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
            <p className="font-semibold">Error loading stats</p>
            <p>{error}</p>
          </div>
        )}

        {/* Batting Stats Table */}
        <div className="mb-8 sm:mb-12">
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
