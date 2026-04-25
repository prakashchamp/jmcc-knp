'use client';

import { useState, useEffect } from 'react';
import { Ball, TeamPlayer, InningsState } from '@/app/lib/cricket-scorer-types';
import { formatBallDisplay, getBallColor } from '@/app/lib/ball-display-utils';
import { OverEndPopup } from './OverEndPopup';

interface LiveScorerUIProps {
  innings: InningsState;
  teamPlayers: TeamPlayer[];
  onAddBall: (ball: Ball) => void;
  onUndo: () => void;
  matchInfo: {
    opponent: string;
    inningNumber: number;
    venue: string;
  };
}

interface BallSnapshot {
  teamScore: number;
  wickets: number;
  ballsInOver: number;
  totalBalls: number;
  striker: any;
  nonStriker: any;
  thisOverBalls: Ball[];
}

/**
 * Cricket Live Scorer UI - Mobile First
 * Complete Cricket Scoring Rules Implementation
 */
export function LiveScorerUI({
  innings,
  teamPlayers,
  onAddBall,
  onUndo,
  matchInfo,
}: LiveScorerUIProps) {
  // Popup & Modal States
  const [showOverEndPopup, setShowOverEndPopup] = useState(false);
  const [overEndData, setOverEndData] = useState({
    overNumber: 0,
    currentScore: 0,
    totalRunsInOver: 0,
    wicketsInOver: 0,
  });
  const [lastOverShown, setLastOverShown] = useState(-1);
  const [showNewBatsmanModal, setShowNewBatsmanModal] = useState(false);
  const [dismissalType, setDismissalType] = useState<string | null>(null);
  
  // Dialog States
  const [showExtraDialog, setShowExtraDialog] = useState<'wide' | 'no-ball' | null>(null);
  const [showByesDialog, setShowByesDialog] = useState<'byes' | 'leg-byes' | null>(null);
  const [showWicketMenu, setShowWicketMenu] = useState(false);
  const [showCustomScore, setShowCustomScore] = useState(false);
  const [customScore, setCustomScore] = useState('');
  const [showExtrasPanel, setShowExtrasPanel] = useState(false);
  const [showPartnershipsPanel, setShowPartnershipsPanel] = useState(false);
  
  // Undo Stack
  const [ballSnapshots, setBallSnapshots] = useState<BallSnapshot[]>([]);

  // Calculate overs and balls
  const totalOvers = Math.floor(innings.totalBalls / 6);
  const ballsInCurrentOver = innings.totalBalls % 6;

  // Calculate runs in current over
  const currentOverBalls = innings.ballHistory.filter(
    (b) => b.over === totalOvers
  );
  const runsThisOver = currentOverBalls.reduce((sum, b) => sum + b.runs.total, 0);

  // Calculate CRR
  const crr = innings.totalBalls > 0
    ? (innings.totalRuns / (innings.totalBalls / 6)).toFixed(2)
    : '0.00';

  /**
   * Calculate number of zero-run balls (dots) faced by a batsman
   */
  const calculateZeros = (batterId: string): number => {
    if (!innings.ballHistory) return 0;
    return innings.ballHistory.filter(
      (ball) => ball.batter.id === batterId && ball.runs.batter === 0
    ).length;
  };

  // Create ball snapshot for undo
  const createSnapshot = (): BallSnapshot => ({
    teamScore: innings.totalRuns,
    wickets: innings.totalWickets,
    ballsInOver: ballsInCurrentOver,
    totalBalls: innings.totalBalls,
    striker: innings.striker ? { ...innings.striker } : null,
    nonStriker: innings.nonStriker ? { ...innings.nonStriker } : null,
    thisOverBalls: [...currentOverBalls],
  });

  // Record a legal batting ball (0-6 runs)
  const recordBattingBall = (runs: number) => {
    if (!innings.striker || !innings.nonStriker) return;

    const snapshot = createSnapshot();
    setBallSnapshots([...ballSnapshots, snapshot]);

    const newBall: Ball = {
      id: `over-${totalOvers}-ball-${ballsInCurrentOver}`,
      over: totalOvers,
      ball: ballsInCurrentOver,
      timestamp: Date.now(),
      bowler: {
        id: 'current-bowler',
        name: 'Bowler',
      },
      batter: {
        id: innings.striker.id,
        name: innings.striker.name,
      },
      nonStriker: {
        id: innings.nonStriker.id,
        name: innings.nonStriker.name,
      },
      runs: {
        batter: runs,
        extras: 0,
        total: runs,
      },
      isWicket: false,
    };

    onAddBall(newBall);
  };

  // Record a wide
  const recordWide = (extraRuns: number) => {
    if (!innings.striker || !innings.nonStriker) return;

    const snapshot = createSnapshot();
    setBallSnapshots([...ballSnapshots, snapshot]);

    const totalRuns = 1 + extraRuns; // 1 penalty + extras

    const newBall: Ball = {
      id: `over-${totalOvers}-ball-${ballsInCurrentOver}`,
      over: totalOvers,
      ball: ballsInCurrentOver,
      timestamp: Date.now(),
      bowler: {
        id: 'current-bowler',
        name: 'Bowler',
      },
      batter: {
        id: innings.striker.id,
        name: innings.striker.name,
      },
      nonStriker: {
        id: innings.nonStriker.id,
        name: innings.nonStriker.name,
      },
      runs: {
        batter: 0, // No runs to batter on wide
        extras: totalRuns,
        total: totalRuns,
      },
      isWicket: false,
      extra: {
        type: 'wide',
        isWide: true,
        isNoBall: false,
      },
    };

    onAddBall(newBall);
    setShowExtraDialog(null);
  };

  // Record a no ball
  const recordNoBall = (batRuns: number) => {
    if (!innings.striker || !innings.nonStriker) return;

    const snapshot = createSnapshot();
    setBallSnapshots([...ballSnapshots, snapshot]);

    const totalRuns = 1 + batRuns; // 1 penalty + runs off bat

    const newBall: Ball = {
      id: `over-${totalOvers}-ball-${ballsInCurrentOver}`,
      over: totalOvers,
      ball: ballsInCurrentOver,
      timestamp: Date.now(),
      bowler: {
        id: 'current-bowler',
        name: 'Bowler',
      },
      batter: {
        id: innings.striker.id,
        name: innings.striker.name,
      },
      nonStriker: {
        id: innings.nonStriker.id,
        name: innings.nonStriker.name,
      },
      runs: {
        batter: batRuns,
        extras: 1, // penalty
        total: totalRuns,
      },
      isWicket: false,
      extra: {
        type: 'no-ball',
        isWide: false,
        isNoBall: true,
      },
    };

    onAddBall(newBall);
    setShowExtraDialog(null);
  };

  // Record byes or leg byes
  const recordExtraRuns = (type: 'byes' | 'leg-byes', runs: number) => {
    if (!innings.striker || !innings.nonStriker) return;

    const snapshot = createSnapshot();
    setBallSnapshots([...ballSnapshots, snapshot]);

    const newBall: Ball = {
      id: `over-${totalOvers}-ball-${ballsInCurrentOver}`,
      over: totalOvers,
      ball: ballsInCurrentOver,
      timestamp: Date.now(),
      bowler: {
        id: 'current-bowler',
        name: 'Bowler',
      },
      batter: {
        id: innings.striker.id,
        name: innings.striker.name,
      },
      nonStriker: {
        id: innings.nonStriker.id,
        name: innings.nonStriker.name,
      },
      runs: {
        batter: 0,
        extras: runs,
        total: runs,
      },
      isWicket: false,
      extra: {
        type: type === 'byes' ? 'bye' : 'leg-bye',
        isWide: false,
        isNoBall: false,
      },
    };

    onAddBall(newBall);
    setShowByesDialog(null);
  };

  // Record a wicket
  const recordWicket = (dismissalMode: string) => {
    if (!innings.striker || !innings.nonStriker) return;

    const snapshot = createSnapshot();
    setBallSnapshots([...ballSnapshots, snapshot]);

    const newBall: Ball = {
      id: `over-${totalOvers}-ball-${ballsInCurrentOver}`,
      over: totalOvers,
      ball: ballsInCurrentOver,
      timestamp: Date.now(),
      bowler: {
        id: 'current-bowler',
        name: 'Bowler',
      },
      batter: {
        id: innings.striker.id,
        name: innings.striker.name,
      },
      nonStriker: {
        id: innings.nonStriker.id,
        name: innings.nonStriker.name,
      },
      runs: {
        batter: 0,
        extras: 0,
        total: 0,
      },
      isWicket: true,
      dismissal: {
        mode: dismissalMode as any,
        playerOut: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
      },
    };

    onAddBall(newBall);
    setShowWicketMenu(false);
    setDismissalType(null);
    setShowNewBatsmanModal(true);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-2">
      <div className="w-full max-w-md bg-white">
        {/* Header - Compact */}
        <div className="flex justify-between items-start mb-4 px-4 py-3">
          <div>
            <h1 className="text-base font-semibold text-gray-800">
              {matchInfo.opponent}, {matchInfo.inningNumber === 1 ? '1st' : '2nd'} inning
            </h1>
          </div>
        </div>

        {/* Main Score Display - Compact */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-2 mb-2 flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-gray-800">
              {innings.totalRuns}-{innings.totalWickets}
              <span className="text-sm text-gray-600"> ({totalOvers}.{ballsInCurrentOver})</span>
            </p>
          </div>
        </div>

        {/* Batsmen Table - Compact */}
        <div className="border-2 border-gray-300 rounded-lg mb-2 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left px-2 py-1 font-semibold text-gray-700">Batsman</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-6">R</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-6">B</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-6">0s</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-6">4s</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-6">6s</th>
                <th className="text-center px-1 py-1 font-semibold text-gray-700 w-8">SR</th>
              </tr>
            </thead>
            <tbody>
              {innings.striker && (
                <tr className="border-b border-gray-200">
                  <td className="px-2 py-1 font-medium text-gray-800 text-xs">
                    {innings.striker.name}*
                  </td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.striker.runs}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.striker.balls}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{calculateZeros(innings.striker.id)}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.striker.fours}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.striker.sixes}</td>
                  <td className="text-center px-1 py-1 text-gray-700 text-xs">{innings.striker.strikeRate.toFixed(1)}</td>
                </tr>
              )}
              {innings.nonStriker && (
                <tr className="border-b border-gray-200">
                  <td className="px-2 py-1 font-medium text-gray-800 text-xs">
                    {innings.nonStriker.name}
                  </td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.nonStriker.runs}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.nonStriker.balls}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{calculateZeros(innings.nonStriker.id)}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.nonStriker.fours}</td>
                  <td className="text-center px-1 py-1 text-gray-700">{innings.nonStriker.sixes}</td>
                  <td className="text-center px-1 py-1 text-gray-700 text-xs">{innings.nonStriker.strikeRate.toFixed(1)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* This Over - Compact */}
        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-600 mb-1">This over: {runsThisOver}</p>
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => {
              const ball = currentOverBalls.find((b) => b.ball === i);
              const isShown = i < ballsInCurrentOver;
              return (
                <div
                  key={i}
                  className={`flex-1 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                    isShown && ball
                      ? getBallColor(ball as any)
                      : 'bg-gray-100 text-gray-400 border border-gray-300'
                  }`}
                >
                  {isShown && ball ? formatBallDisplay(ball as any) : '-'}
                </div>
              );
            })}
          </div>
        </div>

        {/* Checkbox Options - Row 1 */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <CheckboxButton 
            label="Wide" 
            onClick={() => setShowExtraDialog('wide')} 
          />
          <CheckboxButton 
            label="No Ball" 
            onClick={() => setShowExtraDialog('no-ball')} 
          />
        </div>

        {/* Checkbox Options - Row 2 */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <CheckboxButton 
            label="Byes" 
            onClick={() => setShowByesDialog('byes')} 
          />
          <CheckboxButton 
            label="Leg Byes" 
            onClick={() => setShowByesDialog('leg-byes')} 
          />
        </div>

        {/* Wicket Checkbox */}
        <div className="mb-2">
          <CheckboxButton 
            label="Wicket" 
            onClick={() => setShowWicketMenu(true)} 
            fullWidth 
          />
        </div>

        {/* Green Buttons - Row 1 */}
        <div className="grid grid-cols-2 gap-1 mb-2">
          <GreenButton label="Retire" onClick={() => {}} />
          <GreenButton label="Swap" onClick={() => {}} />
        </div>

        {/* Green Buttons - Row 2 */}
        <div className="grid grid-cols-3 gap-1 mb-2">
          <GreenButton 
            label="Undo" 
            onClick={() => {
              if (ballSnapshots.length > 0) {
                onUndo();
                setBallSnapshots(ballSnapshots.slice(0, -1));
              }
            }}
            disabled={ballSnapshots.length === 0}
          />
          <GreenButton label="Partnerships" onClick={() => setShowPartnershipsPanel(true)} />
          <GreenButton label="Extras" onClick={() => setShowExtrasPanel(true)} />
        </div>

        {/* Number Pad - Compact */}
        <div className="border-2 border-gray-300 rounded-lg p-2">
          {/* Row 1 */}
          <div className="grid grid-cols-4 gap-1 mb-1">
            {[0, 1, 2, 3].map((num) => (
              <NumberButton key={num} value={num} onClick={() => recordBattingBall(num)} />
            ))}
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-4 gap-1">
            {[4, 5, 6].map((num) => (
              <NumberButton key={num} value={num} onClick={() => recordBattingBall(num)} />
            ))}
            <button 
              onClick={() => setShowCustomScore(true)}
              className="h-8 rounded-full border-2 border-gray-400 text-gray-400 font-bold text-sm hover:bg-gray-100"
            >
              ...
            </button>
          </div>
        </div>
      </div>

      {/* Over End Popup */}
      <OverEndPopup
        isOpen={showOverEndPopup}
        overNumber={overEndData.overNumber}
        currentScore={overEndData.currentScore}
        totalRunsInOver={overEndData.totalRunsInOver}
        wicketsInOver={overEndData.wicketsInOver}
        onClose={() => setShowOverEndPopup(false)}
      />

      {/* Wide Dialog */}
      {showExtraDialog === 'wide' && (
        <ExtraRunsDialog
          title="Runs on Wide?"
          options={[0, 1, 2, 3, 4, 5, 6]}
          onSelect={(runs) => recordWide(runs)}
          onClose={() => setShowExtraDialog(null)}
        />
      )}

      {/* No Ball Dialog */}
      {showExtraDialog === 'no-ball' && (
        <ExtraRunsDialog
          title="Runs off No Ball?"
          options={[0, 1, 2, 3, 4, 5, 6]}
          onSelect={(runs) => recordNoBall(runs)}
          onClose={() => setShowExtraDialog(null)}
        />
      )}

      {/* Byes Dialog */}
      {showByesDialog === 'byes' && (
        <ExtraRunsDialog
          title="How many byes?"
          options={[1, 2, 3, 4]}
          onSelect={(runs) => recordExtraRuns('byes', runs)}
          onClose={() => setShowByesDialog(null)}
        />
      )}

      {/* Leg Byes Dialog */}
      {showByesDialog === 'leg-byes' && (
        <ExtraRunsDialog
          title="How many leg byes?"
          options={[1, 2, 3, 4]}
          onSelect={(runs) => recordExtraRuns('leg-byes', runs)}
          onClose={() => setShowByesDialog(null)}
        />
      )}

      {/* Wicket Menu */}
      {showWicketMenu && (
        <WicketMenu
          onSelect={(mode) => recordWicket(mode)}
          onClose={() => setShowWicketMenu(false)}
        />
      )}

      {/* Custom Score Dialog */}
      {showCustomScore && (
        <CustomScoreDialog
          onSubmit={(runs) => {
            recordBattingBall(runs);
            setShowCustomScore(false);
            setCustomScore('');
          }}
          onClose={() => {
            setShowCustomScore(false);
            setCustomScore('');
          }}
        />
      )}

      {/* New Batsman Selection Modal */}
      {showNewBatsmanModal && (
        <NewBatsmanModal
          teamPlayers={teamPlayers}
          dismissedPlayers={innings.dismissedBatsmen.map(b => b.id)}
          currentStrikerId={innings.striker?.id}
          currentNonStrikerId={innings.nonStriker?.id}
          onClose={() => setShowNewBatsmanModal(false)}
        />
      )}

      {/* Extras Panel */}
      {showExtrasPanel && (
        <ExtrasPanel
          innings={innings}
          onClose={() => setShowExtrasPanel(false)}
        />
      )}

      {/* Partnerships Panel */}
      {showPartnershipsPanel && (
        <PartnershipsPanel
          innings={innings}
          onClose={() => setShowPartnershipsPanel(false)}
        />
      )}
    </div>
  );
}

// Dialog and Modal Components - Separate functions

interface ExtraRunsDialogProps {
  title: string;
  options: number[];
  onSelect: (runs: number) => void;
  onClose: () => void;
}

function ExtraRunsDialog({ title, options, onSelect, onClose }: ExtraRunsDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {options.map((num) => (
            <button
              key={num}
              onClick={() => {
                onSelect(num);
                onClose();
              }}
              className="h-12 bg-green-700 hover:bg-green-800 text-white font-bold text-lg rounded transition-colors"
            >
              {num}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface WicketMenuProps {
  onSelect: (mode: string) => void;
  onClose: () => void;
}

function WicketMenu({ onSelect, onClose }: WicketMenuProps) {
  const dismissalModes = [
    'Bowled',
    'Caught',
    'LBW',
    'Run Out',
    'Stumped',
    'Hit Wicket',
    'Other',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">How Out?</h2>
        <div className="space-y-2 mb-4">
          {dismissalModes.map((mode) => (
            <button
              key={mode}
              onClick={() => {
                onSelect(mode.toLowerCase().replace(' ', '-'));
                onClose();
              }}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm transition-colors"
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface CustomScoreDialogProps {
  onSubmit: (runs: number) => void;
  onClose: () => void;
}

function CustomScoreDialog({ onSubmit, onClose }: CustomScoreDialogProps) {
  const [value, setValue] = useState('');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Enter Runs</h2>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded mb-4 text-lg font-semibold"
          placeholder="0"
          min="0"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (value !== '') onSubmit(parseInt(value));
            }}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded font-semibold transition-colors"
          >
            OK
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewBatsmanModalProps {
  teamPlayers: TeamPlayer[];
  dismissedPlayers: string[];
  currentStrikerId?: string;
  currentNonStrikerId?: string;
  onClose: () => void;
}

function NewBatsmanModal({
  teamPlayers,
  dismissedPlayers,
  currentStrikerId,
  currentNonStrikerId,
  onClose,
}: NewBatsmanModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Select New Batsman</h2>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {teamPlayers
            .filter(
              (p) =>
                p.id !== currentStrikerId &&
                p.id !== currentNonStrikerId &&
                !dismissedPlayers.includes(p.id)
            )
            .map((player) => (
              <button
                key={player.id}
                onClick={onClose}
                className="w-full px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded font-semibold text-sm transition-colors"
              >
                {player.name} ({player.jerseyNumber})
              </button>
            ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

interface ExtrasPanelProps {
  innings: InningsState;
  onClose: () => void;
}

function ExtrasPanel({ innings, onClose }: ExtrasPanelProps) {
  // Calculate extras from ballHistory
  let widesTotal = 0;
  let noBallsTotal = 0;
  let byesTotal = 0;
  let legByesTotal = 0;

  innings.ballHistory.forEach((ball) => {
    if (ball.extra?.type === 'wide') widesTotal += ball.runs.extras;
    else if (ball.extra?.type === 'no-ball') noBallsTotal += ball.runs.extras;
    else if (ball.extra?.type === 'bye') byesTotal += ball.runs.extras;
    else if (ball.extra?.type === 'leg-bye') legByesTotal += ball.runs.extras;
  });

  const totalExtras = widesTotal + noBallsTotal + byesTotal + legByesTotal;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Extras Breakdown</h2>
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span>Wides:</span>
            <span className="font-semibold">{widesTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>No Balls:</span>
            <span className="font-semibold">{noBallsTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Byes:</span>
            <span className="font-semibold">{byesTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Leg Byes:</span>
            <span className="font-semibold">{legByesTotal}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
            <span>Total Extras:</span>
            <span>{totalExtras}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

interface PartnershipsPanelProps {
  innings: InningsState;
  onClose: () => void;
}

function PartnershipsPanel({ innings, onClose }: PartnershipsPanelProps) {
  const partnerships: Array<{ batter1: string; batter2: string; runs: number }> = [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-4 max-w-sm w-full shadow-lg">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Partnerships</h2>
        <div className="space-y-2 mb-4 text-sm max-h-60 overflow-y-auto">
          {partnerships.length === 0 ? (
            <p className="text-gray-600">No partnerships to display yet.</p>
          ) : (
            partnerships.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.batter1} & {p.batter2}</span>
                <span className="font-semibold">{p.runs}</span>
              </div>
            ))
          )}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-semibold text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Checkbox Button Component - Compact (Orange border, no-fill checkbox style)
 */
interface CheckboxButtonProps {
  label: string;
  onClick: () => void;
  fullWidth?: boolean;
}

function CheckboxButton({ label, onClick, fullWidth }: CheckboxButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`h-8 rounded border-2 border-orange-500 bg-white text-orange-500 font-semibold text-xs hover:bg-orange-50 transition-colors ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Green Button Component - Compact
 */
interface GreenButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}

function GreenButton({ label, onClick, disabled = false, fullWidth = false }: GreenButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-8 rounded font-semibold text-xs transition-colors ${
        disabled
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-green-700 hover:bg-green-800 text-white'
      } ${fullWidth ? 'w-full' : ''}`}
    >
      {label}
    </button>
  );
}

/**
 * Number Button Component - Compact
 */
interface NumberButtonProps {
  value: number;
  onClick: () => void;
}

function NumberButton({ value, onClick }: NumberButtonProps) {
  return (
    <button
      onClick={onClick}
      className="h-8 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-sm transition-colors"
    >
      {value}
    </button>
  );
}
