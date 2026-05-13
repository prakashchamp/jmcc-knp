'use client';

import React from 'react';
import { InningsScorecard } from '@/app/lib/pwa-cricket-types';

interface EndOfInningsScreenProps {
  innings: InningsScorecard;
  isSecondInnings: boolean;
  target?: number;
  onContinue: () => void;
  isLoading?: boolean;
}

export const EndOfInningsScreen: React.FC<EndOfInningsScreenProps> = ({
  innings,
  isSecondInnings,
  target,
  onContinue,
  isLoading = false,
}) => {
  const totalExtras =
    innings.extras.wides +
    innings.extras.noBalls +
    innings.extras.byes +
    innings.extras.legByes;

  const oversDisplay = (overs: number) => {
    const fullOvers = Math.floor(overs);
    const balls = overs % 1 === 0 ? 0 : Math.round((overs % 1) * 10);
    return balls === 0 ? fullOvers : `${fullOvers}.${balls}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Innings {innings.inningsNumber} Summary</h1>
          <p className="text-slate-400">
            {innings.battingTeam} batting • {innings.totalRuns} runs, {innings.totalWickets} out
          </p>
        </div>

        {/* Score Card */}
        <div className="space-y-6">
          {/* Main Score */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="flex justify-between items-baseline mb-4">
              <div>
                <p className="text-slate-400 text-sm mb-1">Total Score</p>
                <p className="text-5xl font-bold text-emerald-400">
                  {innings.totalRuns}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm mb-1">Wickets</p>
                <p className="text-4xl font-bold text-orange-400">
                  {innings.totalWickets}
                </p>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-sm mb-1">Overs</p>
                <p className="text-3xl font-bold text-green-400">
                  {oversDisplay(innings.totalOversPlayed)}
                </p>
              </div>
            </div>

            {/* Target (if 2nd innings) */}
            {isSecondInnings && target && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-1">Target</p>
                <p className="text-2xl font-bold text-yellow-400">{target}</p>
              </div>
            )}
          </div>

          {/* Batsmen Summary */}
          <div>
            <h2 className="text-lg font-bold mb-3">Batting</h2>
            <div className="space-y-2">
              {innings.batsmen.map((batsman) => (
                <div
                  key={batsman.id}
                  className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <div>
                    <p className="font-semibold">{batsman.name}</p>
                    <p className="text-xs text-slate-400">{batsman.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{batsman.runs}</p>
                    <p className="text-xs text-slate-400">
                      {batsman.balls} balls @ {batsman.strikeRate.toFixed(2)} SR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bowlers Summary */}
          <div>
            <h2 className="text-lg font-bold mb-3">Bowling</h2>
            <div className="space-y-2">
              {innings.bowlers.map((bowler) => (
                <div
                  key={bowler.id}
                  className="flex justify-between items-center p-3 bg-slate-800 rounded-lg border border-slate-700"
                >
                  <div>
                    <p className="font-semibold">{bowler.name}</p>
                    <p className="text-xs text-slate-400">
                      {oversDisplay(bowler.overs)} overs
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {bowler.runs} runs, {bowler.wickets}W
                    </p>
                    <p className="text-xs text-slate-400">
                      Economy: {bowler.balls > 0 ? (bowler.runs / (bowler.balls / 6)).toFixed(2) : '0.00'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Extras */}
          {totalExtras > 0 && (
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <p className="font-semibold mb-2">Extras Breakdown</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {innings.extras.wides > 0 && (
                  <p className="text-slate-400">
                    Wides: <span className="text-white font-semibold">{innings.extras.wides}</span>
                  </p>
                )}
                {innings.extras.noBalls > 0 && (
                  <p className="text-slate-400">
                    No Balls: <span className="text-white font-semibold">{innings.extras.noBalls}</span>
                  </p>
                )}
                {innings.extras.byes > 0 && (
                  <p className="text-slate-400">
                    Byes: <span className="text-white font-semibold">{innings.extras.byes}</span>
                  </p>
                )}
                {innings.extras.legByes > 0 && (
                  <p className="text-slate-400">
                    Leg Byes: <span className="text-white font-semibold">{innings.extras.legByes}</span>
                  </p>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-600">
                <p className="text-slate-400">
                  Total Extras: <span className="text-white font-semibold">{totalExtras}</span>
                </p>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="w-full mt-8 py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors min-h-[48px] text-lg"
          >
            {isLoading
              ? 'Loading...'
              : isSecondInnings
              ? 'View Match Result'
              : 'Start 2nd Innings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndOfInningsScreen;
