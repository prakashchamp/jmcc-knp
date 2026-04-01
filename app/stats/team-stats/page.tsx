'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { TeamMatchCard } from '@/app/components/TeamMatchCard';
import { MOCK_MATCHES } from '@/app/lib/mock-data';
import { Match } from '@/app/lib/cricket-schema';

export default function TeamStatsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [activeView, setActiveView] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentYearPage, setCurrentYearPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Load matches on component mount
  useEffect(() => {
    setLoading(true);
    try {
      // Sort matches by date (newest first)
      const sortedMatches = [...MOCK_MATCHES].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setMatches(sortedMatches);

      // Extract unique months and sort descending
      const months = new Set(sortedMatches.map((m) => m.month));
      const sortedMonths = Array.from(months)
        .sort()
        .reverse()
        .map((monthStr) => {
          const [year, month] = monthStr.split('-');
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
          ];
          const monthName = monthNames[parseInt(month) - 1];
          return {
            value: monthStr,
            label: `${monthName} ${year}`,
          };
        });
      
      setAvailableMonths(sortedMonths);
      if (sortedMonths.length > 0) {
        setSelectedMonth(sortedMonths[0].value);
      }

      // Extract unique years and sort descending
      const years = Array.from(new Set(sortedMatches.map((m) => m.year))).sort().reverse();
      setAvailableYears(years);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter matches based on selected result
  const getFilteredMatches = (matchesToFilter: Match[]) => {
    return selectedResult === 'all' 
      ? matchesToFilter 
      : matchesToFilter.filter(match => match.result === selectedResult);
  };

  // Month view - filter by selected month
  const monthMatches = matches.filter(m => m.month === selectedMonth);
  const filteredMonthMatches = getFilteredMatches(monthMatches);

  // Year view - get all matches for pagination
  const yearMatches = matches;
  const filteredYearMatches = getFilteredMatches(yearMatches);
  const totalPages = Math.ceil(filteredYearMatches.length / itemsPerPage);
  const paginatedMatches = filteredYearMatches.slice(
    currentYearPage * itemsPerPage,
    (currentYearPage + 1) * itemsPerPage
  );

  // Reset page when view changes
  useEffect(() => {
    setCurrentYearPage(0);
  }, [activeView]);

  // Calculate statistics based on current view
  const getStats = (matchesToUse: Match[]) => {
    return {
      total: matchesToUse.length,
      won: matchesToUse.filter(m => m.result === 'won').length,
      lost: matchesToUse.filter(m => m.result === 'lost').length,
      tied: matchesToUse.filter(m => m.result === 'tie').length,
      noResult: matchesToUse.filter(m => m.result === 'no_result').length,
    };
  };

  const stats = activeView === 'month' ? getStats(monthMatches) : getStats(yearMatches);
  const winRate = stats.total > 0 ? ((stats.won / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Title and View Toggle */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Team Statistics</h1>

          {/* View Toggle Tabs */}
          <div className="flex gap-2 mb-6 bg-gray-200 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveView('month')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setActiveView('year')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeView === 'year'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              By Year
            </button>
          </div>

          {/* Month Selector for Month View */}
          {activeView === 'month' && availableMonths.length > 0 && (
            <div className="mb-6 flex items-center gap-3">
              <label htmlFor="month-select" className="font-medium text-gray-700">
                Select Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <p className="text-gray-600 text-sm font-medium">Total Matches</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
              <p className="text-green-700 text-sm font-medium">Wins</p>
              <p className="text-3xl font-bold text-green-900 mt-1">{stats.won}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200 shadow-sm">
              <p className="text-red-700 text-sm font-medium">Losses</p>
              <p className="text-3xl font-bold text-red-900 mt-1">{stats.lost}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 shadow-sm">
              <p className="text-yellow-700 text-sm font-medium">Ties</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">{stats.tied}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
              <p className="text-blue-700 text-sm font-medium">Win Rate</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{winRate}%</p>
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedResult('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Matches ({stats.total})
            </button>
            <button
              onClick={() => setSelectedResult('won')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'won'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Wins ({stats.won})
            </button>
            <button
              onClick={() => setSelectedResult('lost')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'lost'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Losses ({stats.lost})
            </button>
            <button
              onClick={() => setSelectedResult('tie')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'tie'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Ties ({stats.tied})
            </button>
            <button
              onClick={() => setSelectedResult('no_result')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'no_result'
                  ? 'bg-gray-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              No Result ({stats.noResult})
            </button>
          </div>
        </div>

        {/* Matches List - Month View */}
        {activeView === 'month' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading matches...</p>
              </div>
            ) : filteredMonthMatches.length === 0 ? (
              <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
                <p className="text-gray-600 text-lg">No matches found for the selected filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMonthMatches.map((match) => (
                  <TeamMatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Matches List - Year View with Pagination */}
        {activeView === 'year' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading matches...</p>
              </div>
            ) : filteredYearMatches.length === 0 ? (
              <div className="bg-white rounded-lg p-12 border border-gray-200 text-center">
                <p className="text-gray-600 text-lg">No matches found for the selected filter</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {paginatedMatches.map((match) => (
                    <TeamMatchCard key={match.id} match={match} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => setCurrentYearPage(Math.max(0, currentYearPage - 1))}
                      disabled={currentYearPage === 0}
                      className="px-4 py-2 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentYearPage(idx)}
                          className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                            currentYearPage === idx
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentYearPage(Math.min(totalPages - 1, currentYearPage + 1))}
                      disabled={currentYearPage === totalPages - 1}
                      className="px-4 py-2 rounded-lg border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                    <div className="text-gray-600 ml-4">
                      Page {currentYearPage + 1} of {totalPages} ({filteredYearMatches.length} total)
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
