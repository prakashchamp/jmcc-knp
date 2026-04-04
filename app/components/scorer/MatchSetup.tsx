'use client';

import { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';

interface MatchSetupProps {
  onMatchStart: (data: {
    opponent: string;
    venue: 'Home' | 'Away' | 'Neutral';
    tossWonBy: 'Us' | 'Them';
    tossDecision: 'bat' | 'field';
    format: 'T20' | 'ODI' | 'Custom';
    totalOvers: number;
    players: TeamPlayer[];
  }) => void;
  teamPlayers: TeamPlayer[];
  loading?: boolean;
}

/**
 * Match Setup Form Component
 * Collects match details before starting the scorer
 */
export function MatchSetup({ onMatchStart, teamPlayers, loading }: MatchSetupProps) {
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away' | 'Neutral'>('Home');
  const [tossWonBy, setTossWonBy] = useState<'Us' | 'Them'>('Us');
  const [tossDecision, setTossDecision] = useState<'bat' | 'field'>('bat');
  const [format, setFormat] = useState<'T20' | 'ODI' | 'Custom'>('T20');
  const [totalOvers, setTotalOvers] = useState('20');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent.trim()) {
      alert('Please enter opponent team name');
      return;
    }

    if (teamPlayers.length === 0) {
      alert('No players found in team');
      return;
    }

    onMatchStart({
      opponent: opponent.trim(),
      venue,
      tossWonBy,
      tossDecision,
      format,
      totalOvers: parseInt(totalOvers) || 20,
      players: teamPlayers,
    });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-2xl font-bold mb-6">Match Setup</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Opponent */}
        <div>
          <label className="block text-sm font-semibold mb-1">Opponent Team Name</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g., City Tigers"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Venue */}
        <div>
          <label className="block text-sm font-semibold mb-1">Venue</label>
          <select
            value={venue}
            onChange={(e) => setVenue(e.target.value as any)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="Home">Home</option>
            <option value="Away">Away</option>
            <option value="Neutral">Neutral</option>
          </select>
        </div>

        {/* Toss */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Toss Won By</label>
            <select
              value={tossWonBy}
              onChange={(e) => setTossWonBy(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="Us">Us</option>
              <option value="Them">Opponent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Toss Decision</label>
            <select
              value={tossDecision}
              onChange={(e) => setTossDecision(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="bat">Bat</option>
              <option value="field">Field</option>
            </select>
          </div>
        </div>

        {/* Format and Overs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as any)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="T20">T20</option>
              <option value="ODI">ODI</option>
              <option value="Custom">Custom</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Total Overs</label>
            <input
              type="number"
              value={totalOvers}
              onChange={(e) => setTotalOvers(e.target.value)}
              placeholder="20"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Player Count */}
        <div className="p-3 bg-slate-700 rounded-lg text-sm">
          <span className="text-slate-300">Team players: </span>
          <span className="font-semibold">{teamPlayers.length}</span>
        </div>

        {/* Start Button */}
        <button
          type="submit"
          disabled={loading || !opponent.trim()}
          className="w-full p-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Loading...' : 'Start Scoring'}
        </button>
      </form>
    </div>
  );
}
