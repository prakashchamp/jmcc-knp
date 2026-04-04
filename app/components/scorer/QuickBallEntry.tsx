'use client';

import { useState } from 'react';
import { Ball, TeamPlayer, ExtraType, DismissalMode, CurrentBatsman } from '@/app/lib/cricket-scorer-types';

interface QuickBallEntryProps {
  onBallAdd: (ball: Ball) => void;
  onUndo: () => void;
  striker?: CurrentBatsman;
  nonStriker?: CurrentBatsman;
  bowler?: { id: string; name: string };
  teamPlayers: TeamPlayer[];
  canUndo: boolean;
  ballNumber: number; // 0-5
  overNumber: number;
  ballHistory: Ball[];
}

export function QuickBallEntry({
  onBallAdd,
  onUndo,
  striker,
  nonStriker,
  bowler,
  teamPlayers,
  canUndo,
  ballNumber,
  overNumber,
  ballHistory,
}: QuickBallEntryProps) {
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [selectedExtra, setSelectedExtra] = useState<ExtraType>('wide');
  const [selectedDismissal, setSelectedDismissal] = useState<DismissalMode>('bowled');
  const [extraRuns, setExtraRuns] = useState(0);

  if (!striker || !nonStriker || !bowler) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Loading match data...</p>
      </div>
    );
  }

  const handleRunClick = (runs: number) => {
    const ball: Ball = {
      id: `${overNumber}-${ballNumber}`,
      over: overNumber,
      ball: ballNumber,
      timestamp: Date.now(),
      bowler,
      batter: striker,
      nonStriker,
      runs: {
        batter: runs,
        extras: 0,
        total: runs,
      },
      isWicket: false,
    };
    onBallAdd(ball);
  };

  const handleExtraClick = () => {
    setShowExtrasModal(true);
  };

  const handleWicketClick = () => {
    setShowWicketModal(true);
  };

  const addExtra = () => {
    const isWide = selectedExtra === 'wide';
    const isNoBall = selectedExtra === 'no-ball';
    const totalExtraRuns = extraRuns + (isWide || isNoBall ? 1 : 0);

    const ball: Ball = {
      id: `${overNumber}-${ballNumber}`,
      over: overNumber,
      ball: ballNumber,
      timestamp: Date.now(),
      bowler,
      batter: striker,
      nonStriker,
      runs: {
        batter: 0,
        extras: totalExtraRuns,
        total: totalExtraRuns,
      },
      isWicket: false,
      extra: {
        type: selectedExtra,
        isWide,
        isNoBall,
      },
    };
    onBallAdd(ball);
    setShowExtrasModal(false);
    setExtraRuns(0);
  };

  const addWicket = () => {
    const ball: Ball = {
      id: `${overNumber}-${ballNumber}`,
      over: overNumber,
      ball: ballNumber,
      timestamp: Date.now(),
      bowler,
      batter: striker,
      nonStriker,
      runs: {
        batter: 0,
        extras: 0,
        total: 0,
      },
      isWicket: true,
      dismissal: {
        mode: selectedDismissal,
        playerOut: striker,
        bowler,
      },
    };
    onBallAdd(ball);
    setShowWicketModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Batsmen Stats Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase mb-3 px-2">Batsmen</h3>
        <div className="space-y-2">
          <div className="bg-green-900/20 border border-green-600 rounded px-3 py-2">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-green-400">{striker.name}*</span>
              <span className="text-slate-400">{striker.runs}({striker.balls})</span>
            </div>
            <div className="flex gap-3 text-xs text-slate-400">
              <span>4s: {striker.fours}</span>
              <span>6s: {striker.sixes}</span>
              <span>SR: {striker.strikeRate.toFixed(1)}</span>
            </div>
          </div>
          <div className="bg-blue-900/20 border border-blue-600 rounded px-3 py-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-blue-400">{nonStriker.name}</span>
              <span className="text-slate-400">{nonStriker.runs}({nonStriker.balls})</span>
            </div>
          </div>
        </div>
      </div>

      {/* This Over */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase mb-3">This Over: {overNumber + 1}</h3>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const ball = ballHistory.find(
              (b) => b.over === overNumber && b.ball === i
            );
            const runs = ball?.runs.total || 0;
            const isWicket = ball?.isWicket;
            return (
              <div
                key={i}
                className={`flex-1 aspect-square rounded flex items-center justify-center font-bold text-sm ${
                  i < ballNumber
                    ? isWicket
                      ? 'bg-red-700 text-white'
                      : 'bg-slate-600 text-yellow-300'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {i < ballNumber ? (isWicket ? 'W' : runs) : '-'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Status */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        <div className="grid grid-cols-2 gap-2 mb-3 text-center text-xs">
          <div className="bg-green-900/30 border border-green-600 rounded p-2">
            <p className="text-green-400 font-semibold">STRIKER</p>
            <p className="text-xs text-white mt-1">{striker.name}</p>
          </div>
          <div className="bg-blue-900/30 border border-blue-600 rounded p-2">
            <p className="text-blue-400 font-semibold">NON-STRIKER</p>
            <p className="text-xs text-white mt-1">{nonStriker.name}</p>
          </div>
        </div>
        <div className="text-center bg-orange-900/30 border border-orange-600 rounded p-2">
          <p className="text-xs text-orange-400 font-semibold">BOWLER</p>
          <p className="text-xs text-white mt-1">{bowler.name}</p>
        </div>
      </div>

      {/* Main Ball Entry Buttons */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase">Ball {ballNumber + 1} of 6</h3>

        {/* Runs Buttons - Large Grid */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRunClick(runs)}
              className="bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg p-3 text-center font-bold text-white transition-all hover:scale-105 active:scale-95"
            >
              <div className="text-2xl">{runs}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[3, 4, 6].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRunClick(runs)}
              className={`border rounded-lg p-3 text-center font-bold transition-all hover:scale-105 active:scale-95 ${
                runs === 4
                  ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-white'
                  : runs === 6
                    ? 'bg-red-600 hover:bg-red-500 border-red-400 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-white'
              }`}
            >
              <div className="text-2xl">{runs}</div>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExtraClick}
            className="bg-purple-700 hover:bg-purple-600 border border-purple-600 rounded-lg p-3 font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
          >
            + EXTRA
          </button>
          <button
            onClick={handleWicketClick}
            className="bg-red-800 hover:bg-red-700 border border-red-600 rounded-lg p-3 font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
          >
            Wicket
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="bg-orange-700 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed border border-orange-600 rounded-lg p-3 font-bold text-white text-sm transition-all hover:scale-105 active:scale-95"
          >
            ↶ UNDO
          </button>
          <button
            className="bg-slate-700 border border-slate-600 rounded-lg p-3 font-bold text-white text-sm text-slate-400 cursor-not-allowed"
          >
            Swap Batsman
          </button>
        </div>
      </div>

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-white mb-4">How is {striker.name} out?</h2>

            <div className="space-y-2 mb-6">
              {[
                'bowled',
                'caught',
                'lbw',
                'run-out',
                'stumped',
                'hit-wicket',
              ].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedDismissal(mode as DismissalMode)}
                  className={`w-full text-left px-4 py-2 rounded border transition-all ${
                    selectedDismissal === mode
                      ? 'bg-red-600 border-red-400 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowWicketModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-4 py-2 text-white"
              >
                Cancel
              </button>
              <button
                onClick={addWicket}
                className="flex-1 bg-red-600 hover:bg-red-700 border border-red-500 rounded px-4 py-2 text-white font-bold"
              >
                Confirm Wicket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extras Modal */}
      {showExtrasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold text-white mb-4">Select Extra Type</h2>

            <div className="space-y-2 mb-6">
              {['wide', 'no-ball', 'bye', 'leg-bye'].map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedExtra(type as ExtraType)}
                  className={`w-full text-left px-4 py-2 rounded border transition-all ${
                    selectedExtra === type
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            {['wide', 'no-ball'].includes(selectedExtra) && (
              <div className="mb-6">
                <label className="block text-sm text-slate-300 mb-2">
                  Additional Runs (besides the {selectedExtra === 'wide' ? 'wide' : 'no-ball'})
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={extraRuns}
                  onChange={(e) => setExtraRuns(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowExtrasModal(false);
                  setExtraRuns(0);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-4 py-2 text-white"
              >
                Cancel
              </button>
              <button
                onClick={addExtra}
                className="flex-1 bg-purple-600 hover:bg-purple-700 border border-purple-500 rounded px-4 py-2 text-white font-bold"
              >
                Add Extra
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
