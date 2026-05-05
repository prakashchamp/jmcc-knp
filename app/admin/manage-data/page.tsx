'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { getAllMatchesAction } from '@/app/lib/actions/stats-actions';
import { deleteMatchAction } from '@/app/lib/actions/match-delete-actions';
import { Match } from '@/app/lib/cricket-schema';
import { CustomSelect } from '@/app/components/CustomSelect';
import { BackToAdminButton } from '@/app/components/admin/BackToAdminButton';
import { formatDate } from '@/app/lib/date-utils';

export default function ManageDataPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllMatchesAction();
      setMatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>(); // value -> label
    
    matches.forEach(match => {
      if (match.month) {
        const [y, m] = match.month.split('-');
        const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long' });
        monthsMap.set(match.month, `${monthName} ${y}`);
      } else if ((match as any).created_at) {
        const date = new Date((match as any).created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleString('default', { month: 'long' });
        monthsMap.set(monthKey, `${monthName} ${date.getFullYear()}`);
      }
    });

    return Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
      .map(([value, label]) => ({ value, label }));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (selectedMonth === 'all') return matches;
    return matches.filter(m => {
      const matchMonth = m.month;
      return matchMonth === selectedMonth;
    });
  }, [matches, selectedMonth]);

  const handleDelete = async (matchId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this match? This will irreversibly remove its stats from all player records.');
    if (!confirmed) return;

    try {
      setDeletingId(matchId);
      const result = await deleteMatchAction(matchId);
      if (!result.success) {
        throw new Error(result.error);
      }
      alert('Match deleted successfully');
      fetchMatches();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <main className="page-container">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="page-title text-white">Manage Data</h1>
            <p className="hint-text mt-1">Review and delete match records.</p>
          </div>
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Back to Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <label className="text-gray-300 font-semibold shrink-0">Filter by Month:</label>
            <div className="w-full sm:w-64">
              <CustomSelect
                id="manage-month-select"
                options={[{ value: 'all', label: 'All Time' }, ...availableMonths]}
                value={selectedMonth}
                onChange={setSelectedMonth}
              />
            </div>
          </div>

          <div className="table-scroll">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-700/50">
                <tr className="text-gray-400">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Opponent</th>
                  <th className="px-4 py-3 font-semibold">Venue</th>
                  <th className="px-4 py-3 font-semibold">Result</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="animate-pulse">Loading matches...</div>
                    </td>
                  </tr>
                ) : filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No matches found.
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map(match => (
                    <tr key={match.id} className="hover:bg-gray-700/30 transition-colors group">
                      <td className="px-4 py-3 text-white">
                        {formatDate(match.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-medium">
                        {match.opponent || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {match.venue || 'Home'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          match.result === 'won' ? 'bg-green-900/50 text-green-400' :
                          match.result === 'lost' ? 'bg-red-900/50 text-red-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {match.result ? match.result.toUpperCase() : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/admin/manage-data/edit/${match.id}`)}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(match.id)}
                            disabled={deletingId === match.id}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === match.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
