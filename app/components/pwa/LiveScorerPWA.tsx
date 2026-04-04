'use client';

import React, { useState, useEffect } from 'react';
import { BatsmanScorecard, BowlerScorecard, InningsScorecard } from '@/app/lib/pwa-cricket-types';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';

interface LiveScorerPWAProps {
  innings: InningsScorecard;
  abcBatsFirst: boolean;
  abcTeamPlayers: TeamPlayer[];
  oversPerMatch: number;
  onBallDelivery: (ballData: any) => void;
  onInningsComplete: () => void;
  isLoading?: boolean;
}

export const LiveScorerPWA: React.FC<LiveScorerPWAProps> = ({
  innings,
  abcBatsFirst,
  abcTeamPlayers,
  oversPerMatch,
  onBallDelivery,
  onInningsComplete,
  isLoading = false,
}) => {
  const [currentBalls, setCurrentBalls] = useState<any[]>([]);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null);
  const [ballsInOver, setBallsInOver] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // Get current strike info
  const getCurrentStrike = () => {
    return {
      striker: innings.batsmen[0],
      nonStriker: innings.batsmen[1],
      bowler: innings.bowlers[0],
    };
  };

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRunBall = (runs: number) => {
    const { striker } = getCurrentStrike();

    if (!striker) {
      showToast('No striker selected', 'warning');
      return;
    }

    // Add runs to striker
    striker.runs += runs;
    striker.balls += 1;

    // Update strike rate
    striker.strikeRate = (striker.runs / striker.balls) * 100;

    // Count fours and sixes
    if (runs === 4) striker.fours += 1;
    if (runs === 6) striker.sixes += 1;

    // Apply strike rotation for odd runs
    if (runs % 2 === 1) {
      // Rotate strike
      const temp = innings.batsmen[0];
      innings.batsmen[0] = innings.batsmen[1];
      innings.batsmen[1] = temp;
    }

    // Update ball tracking
    const newBalls = [...currentBalls, { type: 'run', runs }];
    setCurrentBalls(newBalls);
    setBallsInOver(ballsInOver + 1);

    // Update innings totals
    innings.totalRuns += runs;

    // Check if over complete
    if (ballsInOver + 1 >= 6) {
      handleOverEnd();
    }

    onBallDelivery({ type: 'run', runs });
    showToast(`${runs} runs • ${striker.name}`, 'success');
  };

  const handleExtraBall = (extraType: 'wide' | 'no-ball' | 'bye' | 'leg-bye', runs: number = 1) => {
    const { striker } = getCurrentStrike();

    innings.totalRuns += runs;

    // Add to extras
    if (extraType === 'wide') {
      innings.extras.wides += 1;
    } else if (extraType === 'no-ball') {
      innings.extras.noBalls += 1;
    } else if (extraType === 'bye') {
      innings.extras.byes += 1;
    } else if (extraType === 'leg-bye') {
      innings.extras.legByes += 1;
    }

    // For bye/leg-bye, runs go to extras not batter
    if (extraType !== 'bye' && extraType !== 'leg-bye' && striker) {
      striker.balls += 1;
      striker.strikeRate = (striker.runs / striker.balls) * 100;
    }

    const newBalls = [...currentBalls, { type: 'extra', extraType, runs }];
    setCurrentBalls(newBalls);

    // No-ball and wide don't count as legal balls (don't increment over)
    if (extraType !== 'wide' && extraType !== 'no-ball') {
      setBallsInOver(ballsInOver + 1);

      if (ballsInOver + 1 >= 6) {
        handleOverEnd();
      }
    }

    onBallDelivery({ type: 'extra', extraType, runs });
    showToast(`${extraType} (${runs} runs)`, 'success');
    setShowExtrasModal(false);
    setSelectedExtra(null);
  };

  const handleWicket = () => {
    const { striker } = getCurrentStrike();

    if (!striker) {
      showToast('No striker selected', 'warning');
      return;
    }

    // Mark as out
    striker.status = 'out';
    innings.totalWickets += 1;

    // Get next available batsman
    const nextBatsman = abcTeamPlayers.find(
      (p) => !innings.batsmen.some((b) => b.id === p.id)
    );

    if (nextBatsman) {
      // Replace striker with next batsman
      innings.batsmen[0] = {
        id: nextBatsman.id,
        name: nextBatsman.name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: 'not-out',
        strikeRate: 0,
      };
    }

    // Ball counts as legal
    const newBalls = [...currentBalls, { type: 'wicket' }];
    setCurrentBalls(newBalls);
    setBallsInOver(ballsInOver + 1);

    // Check if innings over
    if (innings.totalWickets >= 10) {
      handleInningsEnd();
    } else if (ballsInOver + 1 >= 6) {
      handleOverEnd();
    }

    onBallDelivery({ type: 'wicket' });
    showToast(`Wicket! ${striker.name} is out`, 'warning');
    setShowWicketModal(false);
  };

  const handleOverEnd = () => {
    // Rotate strike
    const temp = innings.batsmen[0];
    innings.batsmen[0] = innings.batsmen[1];
    innings.batsmen[1] = temp;

    // Update overs played
    innings.totalOversPlayed = (Math.floor(innings.totalOversPlayed) + 1) +
      (innings.totalOversPlayed % 1);

    // Reset balls and show over selection modal
    setCurrentBalls([]);
    setBallsInOver(0);

    showToast(`End of Over ${Math.floor(innings.totalOversPlayed)}!`, 'info');

    // Would show bowler selection here in full implementation
  };

  const handleInningsEnd = () => {
    showToast('Innings Complete!', 'success');
    setTimeout(() => {
      onInningsComplete();
    }, 1500);
  };

  const handleUndo = () => {
    if (currentBalls.length === 0) {
      showToast('No balls to undo', 'warning');
      return;
    }

    // TODO: Implement proper undo with state rollback
    showToast('Undo not yet implemented', 'info');
  };

  const { striker, nonStriker, bowler } = getCurrentStrike();
  const oversDisplay = (overs: number) => {
    const fullOvers = Math.floor(overs);
    const balls = overs % 1 === 0 ? 0 : Math.round((overs % 1) * 10);
    return balls === 0 ? fullOvers : `${fullOvers}.${balls}`;
  };

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col p-4">
      {/* Match Header */}
      <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
        <p className="text-sm font-semibold text-slate-600">{innings.battingTeam === 'ABC' ? 'ABC' : 'West Indies'}, {innings.inningsNumber}{innings.inningsNumber === 1 ? 'st' : 'nd'} inning</p>
        <div className="flex justify-between items-baseline mt-2">
          <div className="text-left">
            <p className="text-3xl font-bold text-slate-900">
              {innings.totalRuns} - {innings.totalWickets}
            </p>
            <p className="text-xs text-slate-500">
              ({oversDisplay(innings.totalOversPlayed)})
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">CRR</p>
            <p className="text-lg font-bold text-slate-900">
              {(innings.totalRuns / (innings.totalOversPlayed || 1)).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Tables */}
      <div className="space-y-3 mb-4 overflow-y-auto flex-1">
        {/* Batsman Stats */}
        {striker && (
          <div className="text-sm">
            <p className="font-semibold text-slate-700 mb-2">Batsman</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-1 px-1 font-semibold">Name</th>
                  <th className="text-center py-1 px-1 font-semibold">R</th>
                  <th className="text-center py-1 px-1 font-semibold">B</th>
                  <th className="text-center py-1 px-1 font-semibold">4s</th>
                  <th className="text-center py-1 px-1 font-semibold">6s</th>
                  <th className="text-center py-1 px-1 font-semibold">SR</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200 text-emerald-600 font-semibold">
                  <td className="py-1 px-1">{striker.name}*</td>
                  <td className="text-center py-1 px-1">{striker.runs}</td>
                  <td className="text-center py-1 px-1">{striker.balls}</td>
                  <td className="text-center py-1 px-1">{striker.fours}</td>
                  <td className="text-center py-1 px-1">{striker.sixes}</td>
                  <td className="text-center py-1 px-1">{striker.strikeRate.toFixed(2)}</td>
                </tr>
                {nonStriker && (
                  <tr className="border-b border-slate-200">
                    <td className="py-1 px-1">{nonStriker.name}</td>
                    <td className="text-center py-1 px-1">{nonStriker.runs}</td>
                    <td className="text-center py-1 px-1">{nonStriker.balls}</td>
                    <td className="text-center py-1 px-1">{nonStriker.fours}</td>
                    <td className="text-center py-1 px-1">{nonStriker.sixes}</td>
                    <td className="text-center py-1 px-1">{nonStriker.strikeRate.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Bowler Stats */}
        {bowler && (
          <div className="text-sm mt-4">
            <p className="font-semibold text-slate-700 mb-2">Bowler</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="text-left py-1 px-1 font-semibold">Name</th>
                  <th className="text-center py-1 px-1 font-semibold">M</th>
                  <th className="text-center py-1 px-1 font-semibold">R</th>
                  <th className="text-center py-1 px-1 font-semibold">W</th>
                  <th className="text-center py-1 px-1 font-semibold">ER</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1 px-1">{bowler.name}</td>
                  <td className="text-center py-1 px-1">{bowler.maidens}</td>
                  <td className="text-center py-1 px-1">{bowler.runs}</td>
                  <td className="text-center py-1 px-1">{bowler.wickets}</td>
                  <td className="text-center py-1 px-1">{bowler.economy.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* This Over */}
        {(currentBalls.length > 0 || ballsInOver > 0) && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="font-semibold text-slate-700 mb-2">This over: {currentBalls.map(b => b.type === 'wicket' ? 'W' : (b.runs || 'E')).join(' ')}</p>
            <div className="flex gap-1">
              {[...Array(6)].map((_, idx) => (
                <div
                  key={idx}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold border ${
                    idx < currentBalls.length
                      ? currentBalls[idx].type === 'wicket'
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-yellow-300 text-slate-900 border-yellow-400'
                      : 'bg-slate-200 text-slate-400 border-slate-300'
                  }`}
                >
                  {idx < currentBalls.length
                    ? currentBalls[idx].type === 'wicket'
                      ? 'W'
                      : currentBalls[idx].runs || 'E'
                    : idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ball Input - Bottom Section */}
      <div className="border-t-2 border-slate-200 pt-4 space-y-3">
        {/* Dismissal Checkboxes */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" onChange={() => handleExtraBall('wide', 1)} />
              <span className="text-sm font-medium">Wide</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" onChange={() => handleExtraBall('no-ball', 1)} />
              <span className="text-sm font-medium">No Ball</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" onChange={() => handleExtraBall('bye', 1)} />
              <span className="text-sm font-medium">Byes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" onChange={() => handleExtraBall('leg-bye', 1)} />
              <span className="text-sm font-medium">Leg Byes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4" onChange={() => setShowWicketModal(true)} />
              <span className="text-sm font-medium">Wicket</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleUndo}
            disabled={isLoading}
            className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Retire
          </button>
          <button
            onClick={() => {
              const temp = innings.batsmen[0];
              innings.batsmen[0] = innings.batsmen[1];
              innings.batsmen[1] = temp;
            }}
            disabled={isLoading}
            className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Swap batsman
          </button>
        </div>

        {/* Green Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={handleUndo}
            disabled={isLoading || currentBalls.length === 0}
            className="py-2 px-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => showToast('Partnerships view', 'info')}
            disabled={isLoading}
            className="py-2 px-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Partnerships
          </button>
          <button
            onClick={() => setShowExtrasModal(true)}
            disabled={isLoading}
            className="py-2 px-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Extras
          </button>
        </div>

        {/* Run Buttons - 2x4 Grid */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((runs) => (
            <button
              key={runs}
              onClick={() => handleRunBall(runs)}
              disabled={isLoading}
              className={`py-3 px-2 rounded font-bold text-lg transition-colors min-h-[48px] ${
                runs === 6
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : runs === 4
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-700'
              } disabled:bg-slate-400 disabled:cursor-not-allowed`}
            >
              {runs}
            </button>
          ))}
        </div>
      </div>

      {/* Extras Modal */}
      {showExtrasModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="w-full bg-slate-800 border-t border-slate-700 p-4 rounded-t-lg">
            <p className="font-bold mb-4 text-lg">Select Extra Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleExtraBall('wide', 1)}
                className="py-4 px-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg min-h-[48px]"
              >
                Wide (+1)
              </button>
              <button
                onClick={() => handleExtraBall('no-ball', 1)}
                className="py-4 px-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg min-h-[48px]"
              >
                No Ball (+1)
              </button>
              <button
                onClick={() => handleExtraBall('bye', 1)}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg min-h-[48px]"
              >
                Bye (+1)
              </button>
              <button
                onClick={() => handleExtraBall('leg-bye', 1)}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg min-h-[48px]"
              >
                Leg Bye (+1)
              </button>
            </div>
            <button
              onClick={() => {
                setShowExtrasModal(false);
                setSelectedExtra(null);
              }}
              className="w-full mt-3 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg min-h-[48px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Wicket Modal */}
      {showWicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="w-full bg-slate-800 border-t border-slate-700 p-4 rounded-t-lg">
            <p className="font-bold mb-4 text-lg">
              Confirm Wicket: {striker?.name}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleWicket}
                className="py-4 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-lg min-h-[48px]"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowWicketModal(false)}
                className="py-4 px-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg text-lg min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-24 left-4 right-4 p-3 rounded-lg text-center font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-600'
              : toast.type === 'warning'
              ? 'bg-orange-600'
              : 'bg-blue-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default LiveScorerPWA;
