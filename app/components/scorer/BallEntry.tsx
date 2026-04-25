'use client';

import { useState } from 'react';
import { Ball, TeamPlayer, DismissalMode, ExtraType } from '@/app/lib/cricket-scorer-types';

interface BallEntryProps {
  onBallAdd: (ball: Ball) => boolean;
  onUndo: () => boolean;
  teamPlayers: TeamPlayer[];
  ballHistory: Ball[];
  ballCount: number; // Current ball count (0-5)
  overCount: number;
}

/**
 * Ball Entry Component
 * UI for entering individual balls during live scoring
 * Handles:
 * - Runs (0-6)
 * - Extras (wide, no-ball, byes, leg-byes)
 * - Wickets with dismissal modes
 * - Runs on extras
 */
export function BallEntry({ onBallAdd, onUndo, teamPlayers, ballHistory, ballCount, overCount }: BallEntryProps) {
  // Get current batter and bowler from UI
  const [batter, setBatter] = useState<string>(teamPlayers[0]?.name || '');
  const [bowler, setBowler] = useState('Bowler 1');
  const [runs, setRuns] = useState('0');
  const [hasExtra, setHasExtra] = useState(false);
  const [extraType, setExtraType] = useState<ExtraType>('wide');
  const [extraRuns, setExtraRuns] = useState('0');
  const [hasWicket, setHasWicket] = useState(false);
  const [wicketPlayer, setWicketPlayer] = useState<string>(batter || '');
  const [dismissalMode, setDismissalMode] = useState<DismissalMode>('bowled');
  const [wicketFielder, setWicketFielder] = useState('');

  const handleAddBall = () => {
    if (!batter.trim()) {
      alert('Select a batter');
      return;
    }

    try {
      const runsBall = parseInt(runs) || 0;
      const extraRunsValue = hasExtra ? (parseInt(extraRuns) || 0) : undefined;

      const ball: Ball = {
        id: `over-${overCount}-ball-${ballCount + 1}`,
        over: overCount,
        ball: ballCount + 1,
        timestamp: Date.now(),
        batter: {
          id: batter,
          name: batter,
        },
        nonStriker: {
          id: '',
          name: '',
        },
        bowler: {
          id: bowler.trim() || 'Bowler',
          name: bowler.trim() || 'Bowler',
        },
        runs: {
          batter: runsBall,
          extras: extraRunsValue || 0,
          total: runsBall + (extraRunsValue || 0),
        },
        isWicket: hasWicket,
        ...(hasExtra && { extra: { type: extraType, isWide: extraType === 'wide', isNoBall: extraType === 'no-ball' } }),
        ...(hasWicket && {
          dismissal: {
            mode: dismissalMode,
            playerOut: { id: wicketPlayer, name: wicketPlayer },
            fielder: wicketFielder ? { id: wicketFielder, name: wicketFielder } : undefined,
          },
        }),
      };

      const success = onBallAdd(ball);

      if (success) {
        // Reset form
        setRuns('0');
        setExtraType('wide');
        setExtraRuns('0');
        setHasWicket(false);
        setWicketFielder('');
        setDismissalMode('bowled');
      } else {
        alert('Failed to add ball');
      }
    } catch (err) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleUndo = () => {
    const success = onUndo();
    if (!success) {
      alert('No balls to undo');
    }
  };

  // Quick run buttons
  const handleQuickRun = (value: number) => {
    setRuns(value.toString());
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold">
          Over {overCount}.{ballCount} {ballCount === 6 ? '(Complete)' : ''}
        </h3>
        <span className="text-sm text-slate-400">Total balls: {ballHistory.length}</span>
      </div>

      <div className="space-y-4">
        {/* Batter and Bowler */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Batter</label>
            <select
              value={batter}
              onChange={(e) => setBatter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select Batter</option>
              {teamPlayers.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Bowler</label>
            <input
              type="text"
              value={bowler}
              onChange={(e) => setBowler(e.target.value)}
              placeholder="e.g., Bowler 1"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Runs */}
        <div>
          <label className="block text-sm font-semibold mb-2">Runs on Ball</label>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <button
                key={r}
                onClick={() => handleQuickRun(r)}
                className={`p-2 rounded-lg font-semibold transition-colors ${
                  runs === r.toString()
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Extras */}
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="hasExtra"
              checked={hasExtra}
              onChange={(e) => setHasExtra(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="hasExtra" className="text-sm font-semibold">
              Has Extras?
            </label>
          </div>

          {hasExtra && (
            <div className="grid grid-cols-2 gap-4 bg-slate-700 p-3 rounded-lg">
              <div>
                <label className="block text-xs font-semibold mb-1">Extra Type</label>
                <select
                  value={extraType}
                  onChange={(e) => setExtraType(e.target.value as ExtraType)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="wide">Wide</option>
                  <option value="no-ball">No Ball</option>
                  <option value="byes">Byes</option>
                  <option value="leg-byes">Leg Byes</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Extra Runs</label>
                <input
                  type="number"
                  min="0"
                  value={extraRuns}
                  onChange={(e) => setExtraRuns(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Wicket */}
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="hasWicket"
              checked={hasWicket}
              onChange={(e) => setHasWicket(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="hasWicket" className="text-sm font-semibold">
              Wicket?
            </label>
          </div>

          {hasWicket && (
            <div className="space-y-3 bg-slate-700 p-3 rounded-lg">
              <div>
                <label className="block text-xs font-semibold mb-1">Player Out</label>
                <select
                  value={wicketPlayer}
                  onChange={(e) => setWicketPlayer(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  {teamPlayers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Dismissal Mode</label>
                <select
                  value={dismissalMode}
                  onChange={(e) => setDismissalMode(e.target.value as DismissalMode)}
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="bowled">Bowled</option>
                  <option value="lbw">LBW</option>
                  <option value="caught">Caught</option>
                  <option value="run-out">Run-out</option>
                  <option value="stumped">Stumped</option>
                  <option value="handled-ball">Handled Ball</option>
                  <option value="obstructing-field">Obstructing Field</option>
                </select>
              </div>

              {dismissalMode === 'caught' || dismissalMode === 'run-out' ? (
                <div>
                  <label className="block text-xs font-semibold mb-1">Fielder Name (optional)</label>
                  <input
                    type="text"
                    value={wicketFielder}
                    onChange={(e) => setWicketFielder(e.target.value)}
                    placeholder="e.g., Fielder 1"
                    className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button
            onClick={handleAddBall}
            className="flex-1 p-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors"
          >
            Add Ball
          </button>

          <button
            onClick={handleUndo}
            disabled={ballHistory.length === 0}
            className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );
}
