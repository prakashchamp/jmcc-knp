'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { YearlyBattingStatsTable } from '@/app/components/YearlyBattingStatsTable';
import { YearlyBowlingStatsTable } from '@/app/components/YearlyBowlingStatsTable';
import { CustomSelect } from '@/app/components/CustomSelect';
import { useYearlyStats } from '@/app/lib/hooks/useYearlyStats';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { fetchAllMatches } from '@/app/lib/redux/slices/statsSlice';

export default function YearlyStatsPage() {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const dispatch = useDispatch<AppDispatch>();
  const { availableYears } = useSelector((state: RootState) => state.stats);

  useEffect(() => {
    dispatch(fetchAllMatches(false));
  }, [dispatch]);

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0].value);
    }
  }, [availableYears, selectedYear]);

  const { players, loading, error } = useYearlyStats(selectedYear);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        <div className="page-header">
          <h1 className="page-title text-white">Yearly Statistics</h1>
          <p className="hint-text mt-1 sm:mt-2">Detailed player statistics by year</p>
        </div>

        {/* Year Dropdown */}
        <div className="mb-4 sm:mb-8">
          <div className="w-full max-w-xs">
            <CustomSelect
              id="year-select"
              label="Select Year"
              options={availableYears}
              value={selectedYear}
              onChange={setSelectedYear}
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
