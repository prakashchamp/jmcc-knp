'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/app/components/Header';
import { TeamMatchDetails } from '@/app/components/TeamMatchDetails';
import { Match } from '@/app/lib/cricket-schema';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { fetchAllMatches } from '@/app/lib/redux/slices/statsSlice';
import { CustomSelect } from '@/app/components/CustomSelect';

export default function TeamStatsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { matches, availableMonths, availableYears, status, error: statsError } = useSelector((state: RootState) => state.stats);
  const loading = status === 'loading' || status === 'idle';
  const [selectedResult, setSelectedResult] = useState<string>('all');
  const [activeView, setActiveView] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [currentYearPage, setCurrentYearPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const handleResultChange = (result: string) => {
    setSelectedResult(result);
    setCurrentYearPage(0);
  };

  // Load matches from Firestore via Redux
  useEffect(() => {
    dispatch(fetchAllMatches(false));
  }, [dispatch]);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[0].value);
    }
  }, [availableMonths, selectedMonth]);

  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[0].value);
    }
  }, [availableYears, selectedYear]);

  // Filter matches based on selected result
  const getFilteredMatches = (matchesToFilter: Match[]) => {
    return selectedResult === 'all' 
      ? matchesToFilter 
      : matchesToFilter.filter(match => match.result === selectedResult);
  };

  // Month view - filter by selected month
  const monthMatches = matches.filter(m => {
    return m.month === selectedMonth;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900">
      <Header />

      <div className="page-container">
        {/* Title and View Toggle */}
        <div className="page-header">
          <h1 className="page-title text-white mb-3 sm:mb-6">Team Statistics</h1>

          {/* View Toggle Tabs */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-slate-700 p-1 rounded-lg w-fit border border-green-600">
            <button
              onClick={() => setActiveView('month')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeView === 'month'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setActiveView('year')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeView === 'year'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              By Year
            </button>
          </div>

          {/* Month Selector for Month View */}
          {activeView === 'month' && availableMonths.length > 0 && (
            <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3 w-64">
              <label htmlFor="month-select" className="text-xs sm:text-sm font-medium text-gray-300 shrink-0">
                Select Month:
              </label>
              <div className="flex-1">
                <CustomSelect
                  id="month-select"
                  options={availableMonths}
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                />
              </div>
            </div>
          )}

          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-2 sm:p-4 border border-green-500 shadow-sm text-white text-center sm:text-left">
              <p className="text-green-100 text-[10px] sm:text-sm font-medium">Total Matches</p>
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
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-2 sm:p-4 border border-green-500 shadow-sm text-white text-center sm:text-left col-span-2 md:col-span-1">
              <p className="text-green-100 text-[10px] sm:text-sm font-medium">Win Rate</p>
              <p className="text-xl sm:text-3xl font-bold text-white mt-0.5 sm:mt-1">{winRate}%</p>
            </div>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleResultChange('all')} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedResult === 'all' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-700 text-gray-100 border border-green-600 hover:bg-green-600'}`}>
              All ({stats.total})
            </button>
            <button onClick={() => handleResultChange('won')} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedResult === 'won' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}>
              Wins ({stats.won})
            </button>
            <button onClick={() => handleResultChange('lost')} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedResult === 'lost' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}>
              Losses ({stats.lost})
            </button>
            <button onClick={() => handleResultChange('tie')} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedResult === 'tie' ? 'bg-yellow-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}>
              Ties ({stats.tied})
            </button>
            <button onClick={() => handleResultChange('no_result')} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors ${selectedResult === 'no_result' ? 'bg-gray-600 text-white shadow-md' : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'}`}>
              NR ({stats.noResult})
            </button>
          </div>
        </div>

        {/* Matches List - Month View */}
        {activeView === 'month' && (
          <>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
                <p className="mt-4 text-gray-400">Loading matches...</p>
              </div>
            ) : filteredMonthMatches.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <p className="text-gray-400 text-lg">No matches found for the selected filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMonthMatches.map((match) => (
                  <TeamMatchDetails key={match.id} match={match} />
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
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
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
                    <TeamMatchDetails key={match.id} match={match} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-6 sm:mt-8">
                    <button
                      onClick={() => setCurrentYearPage(Math.max(0, currentYearPage - 1))}
                      disabled={currentYearPage === 0}
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-gray-600 font-medium text-xs sm:text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentYearPage(idx)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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
                      className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-gray-600 font-medium text-xs sm:text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                    <span className="hint-text w-full text-center sm:w-auto sm:ml-2">
                      Page {currentYearPage + 1} of {totalPages} ({filteredYearMatches.length} total)
                    </span>
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
