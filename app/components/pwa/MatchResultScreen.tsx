'use client';

import React, { useState } from 'react';
import { PWAMatch } from '@/app/lib/pwa-cricket-types';

interface MatchResultScreenProps {
  match: PWAMatch;
  onNewMatch: () => void;
  onSaveMatch?: () => void;
  isLoading?: boolean;
}

export const MatchResultScreen: React.FC<MatchResultScreenProps> = ({
  match,
  onNewMatch,
  onSaveMatch,
  isLoading = false,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (onSaveMatch) {
      setIsSaving(true);
      await onSaveMatch();
      setIsSaving(false);
    }
  };

  const innings1 = match.inningsData.innings1;
  const innings2 = match.inningsData.innings2;

  const oversDisplay = (overs: number) => {
    const fullOvers = Math.floor(overs);
    const balls = overs % 1 === 0 ? 0 : Math.round((overs % 1) * 10);
    return balls === 0 ? fullOvers : `${fullOvers}.${balls}`;
  };

  const getWinnerColor = (winner: string | undefined) => {
    if (winner === 'ABC') return 'text-emerald-400';
    if (winner === 'Opponent') return 'text-blue-400';
    return 'text-yellow-400';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Match Result</h1>
          <p className="text-slate-400 mb-6">
            {match.opponentName} vs ABC • {match.venue}
          </p>
        </div>

        {/* Winner Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-6 border-2 border-emerald-600 mb-8">
          <p className="text-slate-400 text-sm mb-2">WINNER</p>
          <p className={`text-4xl font-bold mb-3 ${getWinnerColor(match.winner)}`}>
            {match.winner === 'ABC' ? 'ABC' : match.winner || 'TIE'}
          </p>
          {match.winningMargin && (
            <p className="text-lg font-semibold text-slate-300">
              {match.winningMargin}
            </p>
          )}
        </div>

        {/* Match Summary */}
        <div className="space-y-4 mb-8">
          {/* Innings 1 */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="text-slate-400 text-sm">1st Innings</p>
                <p className="font-bold text-lg">
                  {innings1.battingTeam === 'ABC' ? 'ABC' : match.opponentName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-emerald-400">
                  {innings1.totalRuns}
                </p>
                <p className="text-slate-400 text-sm">
                  {innings1.totalWickets}/{innings1.totalWickets + (10 - innings1.totalWickets)}
                </p>
                <p className="text-slate-500 text-xs">
                  ({oversDisplay(innings1.totalOversPlayed)} ov)
                </p>
              </div>
            </div>

            {/* Top Batsman */}
            {innings1.batsmen.length > 0 && (
              <div className="p-2 bg-slate-700/50 rounded text-sm">
                <p className="text-slate-400">
                  Top: {innings1.batsmen[0].name} {innings1.batsmen[0].runs}(
                  {innings1.batsmen[0].balls})
                </p>
              </div>
            )}
          </div>

          {/* Innings 2 */}
          {innings2 && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="text-slate-400 text-sm">2nd Innings</p>
                  <p className="font-bold text-lg">
                    {innings2.battingTeam === 'ABC' ? 'ABC' : match.opponentName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-blue-400">
                    {innings2.totalRuns}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {innings2.totalWickets}/{innings2.totalWickets + (10 - innings2.totalWickets)}
                  </p>
                  <p className="text-slate-500 text-xs">
                    ({oversDisplay(innings2.totalOversPlayed)} ov)
                  </p>
                  {innings2.target && (
                    <p className="text-yellow-400 text-xs mt-1">
                      Target: {innings2.target}
                    </p>
                  )}
                </div>
              </div>

              {/* Top Batsman */}
              {innings2.batsmen.length > 0 && (
                <div className="p-2 bg-slate-700/50 rounded text-sm">
                  <p className="text-slate-400">
                    Top: {innings2.batsmen[0].name} {innings2.batsmen[0].runs}(
                    {innings2.batsmen[0].balls})
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Match Details */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-8">
          <p className="font-semibold mb-3">Match Details</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Toss Won By:</span>
              <span className="font-semibold">{match.tossWonBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Decision:</span>
              <span className="font-semibold capitalize">{match.decision}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Overs Per Innings:</span>
              <span className="font-semibold">{match.oversPerMatch}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Venue:</span>
              <span className="font-semibold">{match.venue}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-8">
          <p className="font-semibold mb-3">Key Stats</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-1">Highest Score (1st)</p>
              <p className="font-bold text-lg text-emerald-400">
                {innings1.batsmen[0]?.runs || 0}
              </p>
            </div>
            {innings2 && (
              <div>
                <p className="text-slate-400 mb-1">Highest Score (2nd)</p>
                <p className="font-bold text-lg text-blue-400">
                  {innings2.batsmen[0]?.runs || 0}
                </p>
              </div>
            )}
            <div>
              <p className="text-slate-400 mb-1">Total Runs (1st)</p>
              <p className="font-bold text-lg">{innings1.totalRuns}</p>
            </div>
            {innings2 && (
              <div>
                <p className="text-slate-400 mb-1">Total Runs (2nd)</p>
                <p className="font-bold text-lg">{innings2.totalRuns}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            disabled={isLoading || isSaving || !onSaveMatch}
            className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors min-h-[48px] text-lg"
          >
            {isSaving ? 'Saving...' : 'Save Match'}
          </button>
          <button
            onClick={onNewMatch}
            disabled={isLoading}
            className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors min-h-[48px] text-lg"
          >
            New Match
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchResultScreen;
