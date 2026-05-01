'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { validateAdminPassword } from '@/app/lib/actions/admin-actions';

const ADMIN_OPTIONS = [
  {
    label: 'Team Setup',
    href: '/admin/team-setup',
    description: 'Create and manage your team roster',
  },
  {
    label: 'Manage Data',
    href: '/admin/manage-data',
    description: 'Review and delete match records',
  },
  {
    label: 'Manual Entry',
    href: '/admin/manual-entry',
    description: 'Upload scorecard manually or via screenshot',
  },
  {
    label: 'Live Scorer',
    href: '/scorer',
    description: 'Open the live scoring interface',
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const auth = window.sessionStorage.getItem('adminAuthenticated');
    setIsAuthenticated(auth === 'true');
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const isValid = await validateAdminPassword(password);
    setIsSubmitting(false);

    if (isValid) {
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('adminAuthenticated', 'true');
      }
      setIsAuthenticated(true);
      setPassword('');
      return;
    }

    setError('Incorrect password.');
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('adminAuthenticated');
    }
    setIsAuthenticated(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      <main className="page-container">
        <div className="page-header mb-8">
          <h1 className="page-title text-white">Admin</h1>
          <p className="hint-text mt-1 sm:mt-2">Password-protected access to admin tools.</p>
        </div>

        {isAuthenticated ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Admin Dashboard</h2>
                <p className="text-slate-400">Select a tool below.</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors"
              >
                Logout
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ADMIN_OPTIONS.map((option) => (
                <button
                  key={option.href}
                  onClick={() => router.push(option.href)}
                  className="text-left rounded-3xl border border-slate-700 bg-slate-800/70 p-5 shadow-xl shadow-black/20 hover:border-blue-500 hover:bg-slate-700 transition-all"
                >
                  <h3 className="text-white text-lg font-semibold mb-2">{option.label}</h3>
                  <p className="text-slate-400 text-sm">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-slate-800/80 border border-slate-700 rounded-3xl p-8 shadow-xl shadow-black/30">
            <h2 className="text-xl font-semibold mb-2">Enter Admin Password</h2>
            <p className="text-slate-400 mb-6">Access team setup, data manage, manual entry, and live scorer.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-200">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-white font-semibold hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Checking...' : 'Unlock Admin'}
              </button>

            </form>
          </div>
        )}
      </main>
    </div>
  );
}
