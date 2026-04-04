'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { useState } from 'react';

interface ScorerLandingPageProps {
  onStartNewMatch: (matchDetails: {
    opponent: string;
    venue: 'Home' | 'Away' | 'Neutral';
    tossWonBy: 'Us' | 'Them';
    tossDecision: 'bat' | 'field';
    totalOvers: number;
  }) => void;
  onResumeMatch: () => void;
  hasMatchToResume: boolean;
}

export function ScorerLandingPage({ onStartNewMatch, onResumeMatch, hasMatchToResume }: ScorerLandingPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    opponent: '',
    venue: 'Neutral' as 'Home' | 'Away' | 'Neutral',
    tossWonBy: 'Us' as 'Us' | 'Them',
    tossDecision: 'bat' as 'bat' | 'field',
    totalOvers: '20',
  });

  const handleStartNewMatch = () => {
    setShowForm(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.opponent.trim()) {
      alert('Please enter opponent name');
      return;
    }

    onStartNewMatch({
      opponent: formData.opponent,
      venue: formData.venue,
      tossWonBy: formData.tossWonBy,
      tossDecision: formData.tossDecision,
      totalOvers: parseInt(formData.totalOvers),
    });
  };

  if (showForm) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Start New Match</h1>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Opponent Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Opponent Team Name</label>
              <input
                type="text"
                value={formData.opponent}
                onChange={(e) => setFormData({ ...formData, opponent: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-teal-600"
                placeholder="e.g., Delhi, Mumbai, etc."
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Venue</label>
              <select
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value as 'Home' | 'Away' | 'Neutral' })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-teal-600"
              >
                <option value="Home">Home</option>
                <option value="Away">Away</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>

            {/* Toss Won By */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Toss Won By</label>
              <select
                value={formData.tossWonBy}
                onChange={(e) => setFormData({ ...formData, tossWonBy: e.target.value as 'Us' | 'Them' })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-teal-600"
              >
                <option value="Us">JMCC (Us)</option>
                <option value="Them">Opponent (Them)</option>
              </select>
            </div>

            {/* Toss Decision */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Toss Decision</label>
              <select
                value={formData.tossDecision}
                onChange={(e) => setFormData({ ...formData, tossDecision: e.target.value as 'bat' | 'field' })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-teal-600"
              >
                <option value="bat">Bat</option>
                <option value="field">Field</option>
              </select>
            </div>

            {/* Total Overs */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Overs Per Innings</label>
              <input
                type="number"
                value={formData.totalOvers}
                onChange={(e) => setFormData({ ...formData, totalOvers: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-teal-600"
                placeholder="20"
                min="1"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    opponent: '',
                    venue: 'Neutral',
                    tossWonBy: 'Us',
                    tossDecision: 'bat',
                    totalOvers: '20',
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-semibold transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded font-semibold transition-colors"
              >
                Proceed
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-12">Cricket Live Scorer</h1>

        <div className="space-y-4 max-w-sm">
          {/* Start New Match Button */}
          <button
            onClick={handleStartNewMatch}
            className="w-full px-6 py-4 bg-teal-700 hover:bg-teal-600 text-white text-lg font-bold rounded-lg transition-colors"
          >
            🆕 Start New Match
          </button>

          {/* Resume Match Button */}
          {hasMatchToResume && (
            <button
              onClick={onResumeMatch}
              className="w-full px-6 py-4 bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold rounded-lg transition-colors"
            >
              ▶ Resume Match
            </button>
          )}

          {!hasMatchToResume && (
            <button
              disabled
              className="w-full px-6 py-4 bg-gray-700 text-gray-500 text-lg font-bold rounded-lg cursor-not-allowed opacity-50"
            >
              ▶ Resume Match (No match available)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
