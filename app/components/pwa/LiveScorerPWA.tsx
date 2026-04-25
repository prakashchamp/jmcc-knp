'use client';

import React, { useState } from 'react';
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
  // ── UI state ──────────────────────────────────────────────────────────────
  const [currentBalls, setCurrentBalls] = useState<any[]>([]);
  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [selectedExtra, setSelectedExtra] = useState<string | null>(null);
  const [ballsInOver, setBallsInOver] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  // ── Innings state (copy from prop so mutations trigger re-renders) ────────
  const [batsmen, setBatsmen] = useState<BatsmanScorecard[]>(() => innings.batsmen.map(b => ({ ...b })));
  const [bowlers, setBowlers] = useState<BowlerScorecard[]>(() => innings.bowlers.map(b => ({ ...b })));
  // strikerIndex: 0 → batsmen[0] on strike; 1 → batsmen[1] on strike
  const [strikerIndex, setStrikerIndex] = useState(0);
  const [totalRuns, setTotalRuns] = useState(innings.totalRuns);
  const [totalWickets, setTotalWickets] = useState(innings.totalWickets);
  const [totalOversPlayed, setTotalOversPlayed] = useState(innings.totalOversPlayed);
  const [extras, setExtras] = useState({ ...innings.extras });

  // Derived current players
  const striker = batsmen[strikerIndex];
  const nonStriker = batsmen[strikerIndex === 0 ? 1 : 0];
  const bowler = bowlers[bowlers.length - 1];

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const rotateStrike = () => setStrikerIndex(idx => (idx === 0 ? 1 : 0));

  // ── Ball handlers ─────────────────────────────────────────────────────────
  const handleRunBall = (runs: number) => {
    if (!striker) {
      showToast('No striker selected', 'warning');
      return;
    }

    // Update striker stats
    setBatsmen(prev => {
      const next = prev.map(b => ({ ...b }));
      const s = next[strikerIndex];
      s.runs += runs;
      s.balls += 1;
      s.strikeRate = (s.runs / s.balls) * 100;
      if (runs === 4) s.fours += 1;
      if (runs === 6) s.sixes += 1;
      return next;
    });

    setTotalRuns(r => r + runs);

    const newBallsInOver = ballsInOver + 1;
    setCurrentBalls(prev => [...prev, { type: 'run', runs }]);
    setBallsInOver(newBallsInOver);

    // Rotate strike on odd runs
    const oddRuns = runs % 2 === 1;
    if (oddRuns) rotateStrike();

    // End of over: rotate strike
    if (newBallsInOver >= 6) {
      handleOverEnd();
    }

    onBallDelivery({ type: 'run', runs });
    showToast(`${runs} runs`, 'success');
  };

  const handleExtraBall = (extraType: 'wide' | 'no-ball' | 'bye' | 'leg-bye', runs: number = 1) => {
    setTotalRuns(r => r + runs);

    setExtras(prev => {
      const next = { ...prev };
      if (extraType === 'wide') next.wides += 1;
      else if (extraType === 'no-ball') next.noBalls += 1;
      else if (extraType === 'bye') next.byes += 1;
      else if (extraType === 'leg-bye') next.legByes += 1;
      return next;
    });

    // Bye/leg-bye: striker faces the delivery
    if (extraType !== 'wide' && extraType !== 'no-ball') {
      setBatsmen(prev => {
        const next = prev.map(b => ({ ...b }));
        next[strikerIndex].balls += 1;
        next[strikerIndex].strikeRate =
          next[strikerIndex].balls > 0
            ? (next[strikerIndex].runs / next[strikerIndex].balls) * 100
            : 0;
        return next;
      });
    }

    setCurrentBalls(prev => [...prev, { type: 'extra', extraType, runs }]);

    // Wide / no-ball = illegal delivery → does NOT count toward over
    if (extraType !== 'wide' && extraType !== 'no-ball') {
      const newBallsInOver = ballsInOver + 1;
      setBallsInOver(newBallsInOver);
      if (newBallsInOver >= 6) handleOverEnd(false);
    }

    onBallDelivery({ type: 'extra', extraType, runs });
    showToast(`${extraType} (+${runs})`, 'success');
    setShowExtrasModal(false);
    setSelectedExtra(null);
  };

  const handleWicket = () => {
    if (!striker) {
      showToast('No striker selected', 'warning');
      return;
    }

    // Mark striker out
    const newWickets = totalWickets + 1;
    setTotalWickets(newWickets);

    // Find next JMCC player not yet in batsmen list
    const nextBatsman = abcTeamPlayers.find(
      p => !batsmen.some(b => b.id === p.id)
    );

    setBatsmen(prev => {
      const next = prev.map(b => ({ ...b }));
      next[strikerIndex].status = 'out';
      if (nextBatsman) {
        next[strikerIndex] = {
          id: nextBatsman.id,
          name: nextBatsman.name,
          runs: 0, balls: 0, fours: 0, sixes: 0, status: 'not-out', strikeRate: 0,
        };
      }
      return next;
    });

    const newBallsInOver = ballsInOver + 1;
    setCurrentBalls(prev => [...prev, { type: 'wicket' }]);
    setBallsInOver(newBallsInOver);

    if (newWickets >= 10) {
      handleInningsEnd();
    } else if (newBallsInOver >= 6) {
      handleOverEnd(false);
    }

    onBallDelivery({ type: 'wicket' });
    showToast(`Wicket! ${striker.name} is out`, 'warning');
    setShowWicketModal(false);
  };

  /**
   * Called at end of each over.
   * @param oddRunsAlreadySwapped - if true, mid-ball odd-run swap already happened;
   *   skip the end-of-over swap so we don't double-rotate.
   */
  const handleOverEnd = () => {
    rotateStrike();

    const completedOver = Math.floor(totalOversPlayed) + 1;
    setTotalOversPlayed(completedOver);
    setCurrentBalls([]);
    setBallsInOver(0);

    showToast(`End of Over ${completedOver}!`, 'info');
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
    showToast('Undo not yet implemented', 'info');
  };

  // ── Display helpers ───────────────────────────────────────────────────────
  const oversDisplay = (overs: number) => {
    const full = Math.floor(overs);
    const balls = Math.round((overs % 1) * 10);
    return balls === 0 ? `${full}` : `${full}.${balls}`;
  };

  return (
    <div className="h-screen bg-white text-slate-900 flex flex-col p-4">
      {/* Match Header */}
      <div className="text-center mb-4 pb-3 border-b-2 border-slate-200">
        <p className="text-sm font-semibold text-slate-600">
          {innings.battingTeam === 'ABC' ? 'JMCC' : innings.battingTeam}, {innings.inningsNumber}
          {innings.inningsNumber === 1 ? 'st' : 'nd'} innings
        </p>
        <div className="flex justify-between items-baseline mt-2">
          <div className="text-left">
            <p className="text-3xl font-bold text-slate-900">
              {totalRuns} - {totalWickets}
            </p>
            <p className="text-xs text-slate-500">
              ({oversDisplay(totalOversPlayed)} ov)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">CRR</p>
            <p className="text-lg font-bold text-slate-900">
              {(totalRuns / (totalOversPlayed || 1)).toFixed(2)}
            </p>
          </div>
        </div>
        {innings.target && (
          <p className="text-sm text-blue-600 font-semibold mt-1">
            Target: {innings.target} • Need {innings.target - totalRuns} from{' '}
            {(oversPerMatch - totalOversPlayed).toFixed(1)} ov
          </p>
        )}
      </div>

      {/* Stats Tables */}
      <div className="space-y-3 mb-4 overflow-y-auto flex-1">
        {/* Batsman Stats */}
        {striker && (
          <div className="text-sm">
            <p className="font-semibold text-slate-700 mb-2">Batsmen</p>
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
                  <th className="text-center py-1 px-1 font-semibold">O</th>
                  <th className="text-center py-1 px-1 font-semibold">M</th>
                  <th className="text-center py-1 px-1 font-semibold">R</th>
                  <th className="text-center py-1 px-1 font-semibold">W</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="py-1 px-1">{bowler.name}</td>
                  <td className="text-center py-1 px-1">{bowler.overs}</td>
                  <td className="text-center py-1 px-1">{bowler.maidens}</td>
                  <td className="text-center py-1 px-1">{bowler.runs}</td>
                  <td className="text-center py-1 px-1">{bowler.wickets}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* This Over */}
        {currentBalls.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-200">
            <p className="font-semibold text-slate-700 mb-2">
              This over: {currentBalls.map(b => b.type === 'wicket' ? 'W' : (b.runs ?? 'E')).join(' ')}
            </p>
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
                      : currentBalls[idx].runs ?? 'E'
                    : idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extras summary */}
        <div className="mt-2 text-xs text-slate-500">
          Extras: {Object.values(extras).reduce((a, b) => a + b, 0)}
          {' '}(W {extras.wides}, NB {extras.noBalls}, B {extras.byes}, LB {extras.legByes})
        </div>
      </div>

      {/* Ball Input - Bottom Section */}
      <div className="border-t-2 border-slate-200 pt-4 space-y-3">
        {/* Dismissal Checkboxes */}
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => showToast('Retire not yet implemented', 'info')}
            disabled={isLoading}
            className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Retire
          </button>
          <button
            onClick={rotateStrike}
            disabled={isLoading}
            className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded text-sm transition-colors"
          >
            Swap Batsmen
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
            <p className="font-bold mb-4 text-lg text-white">Select Extra Type</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleExtraBall('wide', 1)}
                className="py-4 px-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg min-h-[48px]">
                Wide (+1)
              </button>
              <button onClick={() => handleExtraBall('no-ball', 1)}
                className="py-4 px-3 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg min-h-[48px]">
                No Ball (+1)
              </button>
              <button onClick={() => handleExtraBall('bye', 1)}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg min-h-[48px]">
                Bye (+1)
              </button>
              <button onClick={() => handleExtraBall('leg-bye', 1)}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg min-h-[48px]">
                Leg Bye (+1)
              </button>
            </div>
            <button
              onClick={() => { setShowExtrasModal(false); setSelectedExtra(null); }}
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
            <p className="font-bold mb-4 text-lg text-white">
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
          className={`fixed bottom-24 left-4 right-4 p-3 rounded-lg text-center font-semibold text-white ${
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
