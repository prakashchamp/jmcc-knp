'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { TeamMatchCard } from '@/app/components/TeamMatchCard';
import { Match } from '@/app/lib/cricket-schema';
import { db } from '@/services/firebase/db';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

export default function TeamStatsPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { isManualFetchMode, fetchTrigger } = useSelector((state: RootState) => state.dev);
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [activeView, setActiveView] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [currentYearPage, setCurrentYearPage] = useState(0);
  const [itemsPerPage] = useState(10);

  // Load matches from Firestore
  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        
        const fetchedMatches = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as unknown as Match));

        setMatches(fetchedMatches);

        // Extract unique months
        const monthsMap = new Map<string, string>();
        fetchedMatches.forEach(match => {
          const date = (match as any).createdAt?.toDate?.() || new Date((match as any).createdAt);
          const monthKey = date.toLocaleString('default', { month: 'long' });
          const yearKey = date.getFullYear().toString();
          const value = monthKey; // Or whatever key is used for filtering
          const label = `${monthKey} ${yearKey}`;
          monthsMap.set(value, label);
        });
        
        const sortedMonths = Array.from(monthsMap.entries()).map(([value, label]) => ({
          value,
          label
        }));
        
        setAvailableMonths(sortedMonths);
        if (sortedMonths.length > 0) {
          setSelectedMonth(sortedMonths[0].value);
        }

        // Extract unique years
        const years = Array.from(new Set(fetchedMatches.map((m) => {
          const date = (m as any).createdAt?.toDate?.() || new Date((m as any).createdAt);
          return date.getFullYear().toString();
        }))).sort().reverse();
        setAvailableYears(years);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [fetchTrigger, isManualFetchMode]);

  // Filter matches based on selected result
  const getFilteredMatches = (matchesToFilter: Match[]) => {
    return selectedResult === 'all' 
      ? matchesToFilter 
      : matchesToFilter.filter(match => match.result === selectedResult);
  };

  // Month view - filter by selected month
  const monthMatches = matches.filter(m => {
    const date = (m as any).createdAt?.toDate?.() || new Date((m as any).createdAt);
    const monthKey = date.toLocaleString('default', { month: 'long' });
    return monthKey === selectedMonth;
  });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <Header />

      <div className="max-w-6xl mx-auto px-2 sm:px-6 py-4 sm:py-8">
        {/* Title and View Toggle */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4 sm:mb-6">Team Statistics</h1>

          {/* View Toggle Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-slate-700 p-1 rounded-lg w-fit border border-blue-600">
            <button
              onClick={() => setActiveView('month')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeView === 'month'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setActiveView('year')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeView === 'year'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              By Year
            </button>
          </div>

          {/* Month Selector for Month View */}
          {activeView === 'month' && availableMonths.length > 0 && (
            <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
              <label htmlFor="month-select" className="text-xs sm:text-sm font-medium text-gray-300">
                Select Month:
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1 sm:px-4 sm:py-2 border border-gray-600 rounded-lg bg-gray-800 text-white text-xs sm:text-sm font-medium hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 sm:p-4 border border-blue-500 shadow-sm text-white text-center sm:text-left">
              <p className="text-blue-100 text-[10px] sm:text-sm font-medium">Total Matches</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-2 sm:p-4 border border-green-400 shadow-sm text-white text-center sm:text-left">
              <p className="text-green-100 text-[10px] sm:text-sm font-medium">Wins</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{stats.won}</p>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-2 sm:p-4 border border-red-400 shadow-sm text-white text-center sm:text-left">
              <p className="text-red-100 text-[10px] sm:text-sm font-medium">Losses</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{stats.lost}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-700 to-yellow-800 rounded-lg p-2 sm:p-4 border border-yellow-600 shadow-sm text-white text-center sm:text-left">
              <p className="text-yellow-100 text-[10px] sm:text-sm font-medium">Ties</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{stats.tied}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-2 sm:p-4 border border-blue-500 shadow-sm text-white text-center sm:text-left col-span-2 md:col-span-1">
              <p className="text-blue-100 text-[10px] sm:text-sm font-medium">Win Rate</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{winRate}%</p>
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
                  : 'bg-slate-700 text-gray-100 border border-blue-600 hover:bg-blue-600'
              }`}
            >
              All Matches ({stats.total})
            </button>
            <button
              onClick={() => setSelectedResult('won')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'won'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              Wins ({stats.won})
            </button>
            <button
              onClick={() => setSelectedResult('lost')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'lost'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              Losses ({stats.lost})
            </button>
            <button
              onClick={() => setSelectedResult('tie')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'tie'
                  ? 'bg-yellow-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
              }`}
            >
              Ties ({stats.tied})
            </button>
            <button
              onClick={() => setSelectedResult('no_result')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedResult === 'no_result'
                  ? 'bg-gray-600 text-white shadow-md'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
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
                <p className="mt-4 text-gray-400">Loading matches...</p>
              </div>
            ) : filteredMonthMatches.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <p className="text-gray-400 text-lg">No matches found for the selected filter</p>
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
                <p className="mt-4 text-gray-400">Loading matches...</p>
              </div>
            ) : filteredYearMatches.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <p className="text-gray-400 text-lg">No matches found for the selected filter</p>
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
                      className="px-4 py-2 rounded-lg border border-gray-600 font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                              ? 'bg-green-600 text-white shadow-md'
                              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-green-900'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentYearPage(Math.min(totalPages - 1, currentYearPage + 1))}
                      disabled={currentYearPage === totalPages - 1}
                      className="px-4 py-2 rounded-lg border border-gray-600 font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                    <div className="text-gray-400 ml-4">
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
