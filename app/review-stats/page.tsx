'use client';

import { useState } from 'react';
import { Header } from '@/app/components/Header';
import { useRecentMatches } from '@/app/lib/hooks/useRecentMatches';
import { RecentMatchesResult } from '@/app/components/review-stats/RecentMatchesResult';
import { RecentMatchesBatting } from '@/app/components/review-stats/RecentMatchesBatting';
import { RecentMatchesBowling } from '@/app/components/review-stats/RecentMatchesBowling';

export default function ReviewStatsPage() {
  const [matchLimit, setMatchLimit] = useState<number | ''>(5);
  const [appliedLimit, setAppliedLimit] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'team' | 'batting' | 'bowling'>('team');
  const { matches, loading, error } = useRecentMatches(appliedLimit);

  const matchesData = matches.map((m) => m.match);
  const allPerformances = matches.flatMap((m) => m.performances);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        {/* Page Title */}
        <div className="page-header">
          <h1 className="page-title text-white">Review Statistics</h1>
          <p className="hint-text mt-1 sm:mt-2">View recent match results and player performances</p>
        </div>

        {/* Match Limit Selector */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <label className="text-sm sm:text-base text-gray-300 font-semibold">Show last matches (1-10):</label>
          <div className="flex items-center gap-4">
            <div className="relative w-28 sm:w-32">
              <input
                type="number"
                min={1}
                max={10}
                value={matchLimit}
                placeholder="1"
                onFocus={() => setMatchLimit('')}
                onBlur={() => {
                  if (matchLimit === '' || (typeof matchLimit === 'number' && matchLimit < 1)) setMatchLimit(1);
                }}
                onChange={(e) => {
                  if (e.target.value === '') {
                    setMatchLimit('');
                  } else {
                    setMatchLimit(Math.min(10, parseInt(e.target.value)));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAppliedLimit(typeof matchLimit === 'number' ? Math.max(1, matchLimit) : 1);
                  }
                }}
                className="input-base w-full pr-10 text-center font-bold"
              />
              <button 
                onClick={() => setAppliedLimit(typeof matchLimit === 'number' ? Math.max(1, matchLimit) : 1)}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-all hover:bg-blue-500 active:scale-95"
                title="Search"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              </button>
            </div>
            <span className="text-gray-500 text-xs sm:text-sm italic">Showing {matches.length} matches</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-6 text-sm">
            <p className="font-semibold">Error loading stats</p>
            <p>{error.message}</p>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab('batting')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'batting'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            Batting
          </button>
          <button
            onClick={() => setActiveTab('bowling')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'bowling'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            Bowling
          </button>
        </div>

        {/* Sections */}
        <div>
          {activeTab === 'team' && (
            <RecentMatchesResult matches={matchesData} loading={loading} />
          )}

          {activeTab === 'batting' && (
            <RecentMatchesBatting matches={matchesData} performances={allPerformances} loading={loading} />
          )}

          {activeTab === 'bowling' && (
            <RecentMatchesBowling matches={matchesData} performances={allPerformances} loading={loading} />
          )}
        </div>
      </main>
    </div>
  );
}
