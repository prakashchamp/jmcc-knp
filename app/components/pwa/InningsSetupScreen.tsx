'use client';

import React, { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { BatsmanScorecard, BowlerScorecard } from '@/app/lib/pwa-cricket-types';

interface InningsSetupScreenProps {
  inningsNumber: 1 | 2;
  abcBatsFirst: boolean;
  abcTeamPlayers: TeamPlayer[];
  onSubmit: (data: {
    striker: BatsmanScorecard;
    nonStriker: BatsmanScorecard;
    bowler: BowlerScorecard;
  }) => void;
  isLoading?: boolean;
}

export const InningsSetupScreen: React.FC<InningsSetupScreenProps> = ({
  inningsNumber,
  abcBatsFirst,
  abcTeamPlayers,
  onSubmit,
  isLoading = false,
}) => {
  const battingTeam = inningsNumber === 1 ? abcBatsFirst : !abcBatsFirst;
  const isABCBatting = battingTeam; // true if ABC is batting

  const [striker, setStriker] = useState<string>('');
  const [nonStriker, setNonStriker] = useState<string>('');
  const [bowler, setBowler] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  const validateSelection = (): boolean => {
    const newErrors: string[] = [];

    if (isABCBatting) {
      if (!striker) newErrors.push('Please select striker');
      if (!nonStriker) newErrors.push('Please select non-striker');
      if (striker === nonStriker) newErrors.push('Striker and non-striker must be different');
    }

    if (!bowler) newErrors.push('Please select bowler');

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSelection()) return;

    const strikerPlayer = abcTeamPlayers.find((p) => p.id === striker);
    const nonStrikerPlayer = abcTeamPlayers.find((p) => p.id === nonStriker);
    const bowlerPlayer = abcTeamPlayers.find((p) => p.id === bowler);

    if (!striker || !bowler) return;

    const submitData: any = {
      striker: {
        id: striker,
        name: strikerPlayer?.name || 'Player 1',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: 'not-out',
        strikeRate: 0,
      },
      bowler: {
        id: bowler,
        name: bowlerPlayer?.name || 'Bowler',
        overs: 0,
        maidens: 0,
        runs: 0,
        wickets: 0,
        economy: 0,
        balls: 0,
      },
    };

    if (nonStriker) {
      submitData.nonStriker = {
        id: nonStriker,
        name: nonStrikerPlayer?.name || 'Player 2',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: 'not-out',
        strikeRate: 0,
      };
    }

    onSubmit(submitData);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Innings {inningsNumber}</h1>
          <p className="text-slate-400">
            {isABCBatting ? 'ABC Batting' : 'ABC Bowling'}
          </p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            {errors.map((error, idx) => (
              <p key={idx} className="text-red-400 text-sm">
                • {error}
              </p>
            ))}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ABC Batting Setup */}
          {isABCBatting && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Striker (on strike)
                </label>
                <select
                  value={striker}
                  onChange={(e) => {
                    setStriker(e.target.value);
                    setErrors([]);
                  }}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  disabled={isLoading}
                >
                  <option value="">Select striker</option>
                  {abcTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} (#{player.jerseyNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Non-Striker (at other end)
                </label>
                <select
                  value={nonStriker}
                  onChange={(e) => {
                    setNonStriker(e.target.value);
                    setErrors([]);
                  }}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
                  disabled={isLoading}
                >
                  <option value="">Select non-striker</option>
                  {abcTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} (#{player.jerseyNumber})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* ABC Bowling Setup */}
          {!isABCBatting && (
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Opening Batsmen:</p>
              <p className="text-white font-semibold">Opponent Player 1 (Striker)</p>
              <p className="text-white font-semibold text-opacity-70 mt-1">
                Opponent Player 2 (Non-Striker)
              </p>
            </div>
          )}

          {/* Bowler Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Opening Bowler
            </label>
            <select
              value={bowler}
              onChange={(e) => {
                setBowler(e.target.value);
                setErrors([]);
              }}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
              disabled={isLoading}
            >
              <option value="">Select opening bowler</option>
              {abcTeamPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} (#{player.jerseyNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-slate-800 rounded-lg border border-slate-700">
            <p className="text-sm text-slate-400 mb-3">Ready to Start:</p>
            <div className="space-y-2 text-sm">
              {isABCBatting && (
                <>
                  <p className="text-emerald-400">
                    ✓ Striker: {striker ? abcTeamPlayers.find(p => p.id === striker)?.name : 'Not selected'}
                  </p>
                  <p className="text-emerald-400">
                    ✓ Non-Striker: {nonStriker ? abcTeamPlayers.find(p => p.id === nonStriker)?.name : 'Not selected'}
                  </p>
                </>
              )}
              <p className="text-emerald-400">
                ✓ Bowler: {bowler ? abcTeamPlayers.find(p => p.id === bowler)?.name : 'Not selected'}
              </p>
            </div>
          </div>

          {/* Start Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors min-h-[48px] text-lg"
          >
            {isLoading ? 'Starting Innings...' : 'Start Innings'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InningsSetupScreen;
