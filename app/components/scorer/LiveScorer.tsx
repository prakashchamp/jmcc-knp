'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import {
  initializeLiveMatch,
  openDialog,
  closeDialog,
  recordBattingBall,
  createUndoSnapshot,
  undoLastDelivery,
  swapBatsmen,
} from '@/app/lib/redux/slices/scorerSlice';
import type { LiveMatch, TeamPlayer } from '@/app/lib/cricket-scorer-types';

// Dialog Components
import { ExtraDialog } from './dialogs/ExtraDialog';
import { WicketDialog } from './dialogs/WicketDialog';
import { RunOutDialog } from './dialogs/RunOutDialog';
import { StumpedDialog } from './dialogs/StumpedDialog';
import { BatsmanSelectionModal } from './dialogs/BatsmanSelectionModal';
import { OptionsDialog } from './dialogs/OptionsDialog';
import { NewBatsmanDialog } from './dialogs/NewBatsmanDialog';
import { NewBowlerDialog } from './dialogs/NewBowlerDialog';
import { BowlerRetiredDialog } from './dialogs/BowlerRetiredDialog';
import { BatsmanRetiredDialog } from './dialogs/BatsmanRetiredDialog';
import { MatchDetailsDialog } from './dialogs/MatchDetailsDialog';

interface LiveScorerProps {
  opponent: string;
  venue: 'Home' | 'Away' | 'Neutral';
  teamPlayers: TeamPlayer[];
  format: 'T20' | 'ODI' | 'Custom';
  totalOvers: number;
  tossWonBy?: 'Us' | 'Them';
  tossDecision?: 'bat' | 'field';
  onMatchComplete?: (finalMatch: LiveMatch) => void;
}

/**
 * LiveScorer Main Container Component
 * 
 * Orchestrates live cricket match scoring with:
 * - Real-time display of scores, batsmen, bowler stats
 * - Ball-by-ball entry with visual feedback
 * - Dialog-based scoring flows (extras, wickets, run-outs)
 * - Redux state management with localStorage persistence
 * - Undo capability for last delivery
 * 
 * Layout:
 * - Top: Score display (teams, overs, CRR/RRR)
 * - Middle: Batsmen stats, current bowler, this over grid
 * - Bottom: Control buttons for ball entry
 * - Overlays: Modals for extras, wickets, batsman selection
 */
export function LiveScorer(props: LiveScorerProps) {
  const {
    opponent,
    venue,
    teamPlayers,
    format,
    totalOvers,
    tossWonBy = 'Us',
    tossDecision = 'bat',
  } = props;

  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings, dialogState, loading, error } = useSelector(
    (state: RootState) => state.scorer
  );
  const [hasInitialized, setHasInitialized] = useState(false);
  const [positionedBatsman1, setPositionedBatsman1] = useState<any>(null);
  const [positionedBatsman2, setPositionedBatsman2] = useState<any>(null);

  // Initialize match only once on component mount
  useEffect(() => {
    if (!hasInitialized) {
      const newMatch: LiveMatch = {
        id: `match_${Date.now()}`,
        opponent,
        venue,
        tossWonBy,
        tossDecision,
        format,
        totalOvers,
        teamPlayers,
        currentInnings: 1,
        innings: [],
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dispatch(initializeLiveMatch(newMatch));
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Initialize positioned batsmen when innings data becomes available
  useEffect(() => {
    if (currentInnings && !positionedBatsman1 && !positionedBatsman2) {
      setPositionedBatsman1(currentInnings.striker);
      setPositionedBatsman2(currentInnings.nonStriker);
    }
  }, [currentInnings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-800">Loading match...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-100">
        <div className="text-center">
          <div className="text-xl font-bold text-red-800">Error</div>
          <div className="text-red-700">{error}</div>
        </div>
      </div>
    );
  }

  if (!liveMatch) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-xl font-bold">No match initialized</div>
        </div>
      </div>
    );
  }

  // Use firstInnings if current is not available
  const innings = currentInnings || (liveMatch.innings && liveMatch.innings[0]);

  if (!innings) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-xl font-bold">Initializing innings...</div>
        </div>
      </div>
    );
  }

  /**
   * Calculate number of zero-run balls (dots) faced by a batsman
   */
  const calculateZeros = (batterId: string): number => {
    if (!innings.ballHistory) return 0;
    return innings.ballHistory.filter(
      (ball) => ball.batter.id === batterId && ball.runs.batter === 0
    ).length;
  };

  // Calculate current over balls
  const currentOversCount = Math.floor(innings.totalBalls / 6);
  const currentOverBalls = innings.ballHistory ? innings.ballHistory.filter(
    (b) => b.over === currentOversCount
  ) : [];

  // Calculate CRR (Current Run Rate)
  const totalOversPlayed = innings.totalBalls / 6;
  const crr = totalOversPlayed > 0 ? (innings.totalRuns / totalOversPlayed).toFixed(2) : '0.00';

  // Calculate RRR and runs required (treat as second innings for now)
  const dummyTarget = 150; // TODO: Remove once first innings target is set
  const target = innings.target || dummyTarget;
  const runsRequired = Math.max(0, target - innings.totalRuns);
  const ballsRemaining = Math.max(0, (liveMatch.totalOvers * 6) - innings.totalBalls);
  const oversRemaining = ballsRemaining / 6;
  const rrr = oversRemaining > 0 ? (runsRequired / oversRemaining).toFixed(2) : '0.00';

  // Dummy data for This Over section
  const dummyBalls = ['0', '4', '2WD', '6NB', '3', 'W', '1+W', 'WD+W', '1B'];
  const ballsToDisplay = currentOverBalls.length > 0 ? currentOverBalls : dummyBalls;

  // Helper function to determine box color based on ball value
  const getBallColor = (ball: any): string => {
    const ballStr = typeof ball === 'string' ? ball : '';
    
    // Priority 1: Wicket (W but not WD - highest priority - always red)
    // Using regex to match W not followed by D
    if (ballStr.match(/W(?!D)/)) return 'bg-red-800 border-red-700';
    
    // Priority 2: 6 (always green)
    if (ballStr.includes('6')) return 'bg-green-800 border-green-700';
    
    // Priority 3: 4 (always blue)
    if (ballStr.includes('4')) return 'bg-blue-800 border-blue-700';
    
    // Priority 4: Extras (amber - but only if no 4, 6, or W)
    if (ballStr.includes('WD') || ballStr.includes('B') || ballStr.includes('LB') || ballStr.includes('NB')) {
      return 'bg-amber-700 border-amber-600';
    }
    
    // Default: 0, 1, 2, 3 and other numbers - all gray
    return 'bg-gray-700 border-gray-600';
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      {/* Score Section */}
      <div className="bg-teal-700 px-3 py-2 text-white flex-shrink-0">
        {/* Teams Container */}
        <div className="bg-teal-800 rounded py-1.5 px-2 mb-1">
          {/* YOUR TEAM Row - Current Batting Team */}
          <div className="bg-emerald-900 bg-opacity-25 -mx-2 px-2 py-1 flex items-center justify-between text-xs mb-1">
            <p className="text-xs font-semibold">YOUR TEAM</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base">{innings.totalRuns}/{innings.totalWickets}</p>
              <p className="text-teal-100">[{Math.floor(innings.totalBalls / 6)}.{innings.totalBalls % 6} / {liveMatch.totalOvers}]</p>
            </div>
          </div>
          {/* OPPONENT Row */}
          <div className="flex items-center justify-between text-xs">
            <p className="text-xs font-semibold">OPPONENT</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base">0/0</p>
              <p className="text-teal-100">[0.0 / {liveMatch.totalOvers}]</p>
            </div>
          </div>
        </div>

        {/* CRR and RRR Row */}
        <div className="bg-teal-800 flex gap-2 justify-center items-center mt-1 py-1 rounded">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">CRR:</p>
            <p className="font-bold text-sm">{crr}</p>
          </div>
          <div className="w-px h-5 bg-teal-600"></div>
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">RRR:</p>
            <p className="font-bold text-sm">{rrr}</p>
          </div>
        </div>

        {/* Runs Required / Balls Remaining Row */}
        <div className="bg-teal-800 flex gap-2 justify-center items-center mt-1 py-1 rounded">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">{runsRequired} runs required</p>
          </div>
          <div className="w-px h-5 bg-teal-600"></div>
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">{ballsRemaining} balls remaining</p>
          </div>
        </div>
      </div>

      {/* Batsmen Section */}
      <div className="p-2 border-b border-gray-700 flex-shrink-0">
        <div className="text-xs">
          {/* Header */}
          <div className="flex items-center font-bold text-gray-400 px-2 mb-1">
            <div className="w-6 flex justify-center text-sm ml-1">🏏</div>
            <div className="w-36 ml-2">Batsman</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">0s</div>
            <div className="w-10 text-center">4s</div>
            <div className="w-10 text-center">6s</div>
            <div className="w-14 text-center">SR</div>
          </div>
          
          {/* Row 1 - Position 1 Batsman */}
          <div className={`flex items-center p-2 rounded mb-2 font-bold border-l-4 transition-colors ${
            innings.striker?.id === positionedBatsman1?.id 
              ? 'bg-gray-700 border-yellow-400' 
              : 'bg-gray-800 border-gray-600'
          }`}>
            <button
              onClick={() => dispatch(swapBatsmen())}
              className="w-6 flex justify-center hover:scale-110 transition-transform cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                innings.striker?.id === positionedBatsman1?.id
                  ? 'border-yellow-400 bg-yellow-400'
                  : 'border-gray-500 bg-gray-600'
              }`}></div>
            </button>
            <div className="w-36 text-white truncate ml-2">{positionedBatsman1?.name || 'Batsman 1'}</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">{positionedBatsman1 ? calculateZeros(positionedBatsman1.id) : 0}</div>
            <div className="w-10 text-center">{positionedBatsman1?.fours || 0}</div>
            <div className="w-10 text-center">{positionedBatsman1?.sixes || 0}</div>
            <div className="w-14 text-center text-green-400">{positionedBatsman1?.strikeRate.toFixed(2) || 0}</div>
          </div>
          
          {/* Row 2 - Position 2 Batsman */}
          <div className={`flex items-center p-2 rounded font-bold border-l-4 transition-colors ${
            innings.striker?.id === positionedBatsman2?.id 
              ? 'bg-gray-700 border-yellow-400' 
              : 'bg-gray-800 border-gray-600'
          }`}>
            <button
              onClick={() => dispatch(swapBatsmen())}
              className="w-6 flex justify-center hover:scale-110 transition-transform cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                innings.striker?.id === positionedBatsman2?.id
                  ? 'border-yellow-400 bg-yellow-400'
                  : 'border-gray-500 bg-gray-600'
              }`}></div>
            </button>
            <div className="w-36 text-white truncate ml-2">{positionedBatsman2?.name || 'Batsman 2'}</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">{positionedBatsman2 ? calculateZeros(positionedBatsman2.id) : 0}</div>
            <div className="w-10 text-center">{positionedBatsman2?.fours || 0}</div>
            <div className="w-10 text-center">{positionedBatsman2?.sixes || 0}</div>
            <div className="w-14 text-center text-green-400">{positionedBatsman2?.strikeRate.toFixed(2) || 0}</div>
          </div>
        </div>
      </div>

      {/* Bowler Section */}
      <div className="p-2 border-b border-gray-700 flex-shrink-0">
        <div className="text-xs">
          {/* Header */}
          <div className="flex items-center font-bold text-gray-400 px-2 mb-1">
            <div className="w-6 flex justify-center text-sm ml-1">🎯</div>
            <div className="w-36 ml-2">Bowler</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">O</div>
            <div className="w-10 text-center">R</div>
            <div className="w-10 text-center">W</div>
            <div className="w-14 text-center">ECO</div>
          </div>
          
          {/* Current Bowler Row */}
          <div className="flex items-center bg-gray-700 p-2 rounded font-bold border-l-4 border-yellow-400">
            <div className="w-6 flex justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-yellow-400 bg-yellow-400"></div>
            </div>
            <div className="w-36 text-white truncate ml-2">{innings.currentBowler?.name || 'Trent Boult'}</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">{Math.floor((innings.currentBowler?.balls || 0) / 6)}.{(innings.currentBowler?.balls || 0) % 6}</div>
            <div className="w-10 text-center">{innings.currentBowler?.runs || 0}</div>
            <div className="w-10 text-center">{innings.currentBowler?.wickets || 0}</div>
            <div className="w-14 text-center text-green-400">{innings.currentBowler?.economy.toFixed(2) || '0.00'}</div>
          </div>
        </div>
      </div>

      {/* This Over */}
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <div className="text-xs">
          {/* Header */}
          <div className="flex items-center font-bold text-gray-400 px-2 mb-2">
            <div className="w-6 flex justify-center text-sm ml-1">🎲</div>
            <div className="w-36 ml-2">This Over</div>
          </div>
          
          {/* Ball Results */}
          <div className="flex gap-2 pl-8 overflow-x-auto overflow-y-hidden pb-1">
            {ballsToDisplay.map((ball, index) => {
              let ballLabel = '';
              
              // Handle dummy string data
              if (typeof ball === 'string') {
                ballLabel = ball;
              } else {
                // Handle real Ball object data
                if (ball.runs.batter === 0 && ball.runs.extras === 0) {
                  ballLabel = '0';
                } else if (ball.runs.extras > 0) {
                  const extraType = ball.extra?.type ? ball.extra.type.slice(0, 2).toUpperCase() : '';
                  ballLabel = `${ball.runs.total}${extraType}`;
                } else if (ball.isWicket || ball.dismissal) {
                  ballLabel = 'W';
                } else {
                  ballLabel = ball.runs.total.toString();
                }
              }
              
              return (
                <div
                  key={index}
                  className={`${getBallColor(ball)} border rounded px-3 py-1 flex items-center justify-center text-xs font-semibold text-white whitespace-nowrap`}
                  title={`Ball ${index + 1}`}
                >
                  {ballLabel}
                </div>
              );
            })}
            
            {/* Empty slots for remaining balls in over - only show if no dummy data */}
            {typeof ballsToDisplay[0] !== 'string' && ballsToDisplay.length < 6 && (
              [...Array(Math.max(0, 6 - ballsToDisplay.length))].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-1 flex items-center justify-center text-xs"
                >
                  -
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Button Pad */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        {/* Row 1: 0 1 2 3 */}
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map(runs => (
            <ScorerButton key={runs} label={runs.toString()} onClick={() => handleNumberClick(runs)} />
          ))}
        </div>

        {/* Row 2: 4 6 W */}
        <div className="grid grid-cols-3 gap-1">
          <ScorerButton label="4" onClick={() => handleNumberClick(4)} className="bg-blue-800 hover:bg-blue-800/80" />
          <ScorerButton label="6" onClick={() => handleNumberClick(6)} className="bg-green-800 hover:bg-green-800/80" />
          <ScorerButton label="W" onClick={() => handleWicketClick()} className="bg-red-800 hover:bg-red-800/80" />
        </div>

        {/* Row 3: B LB WD NB */}
        <div className="grid grid-cols-4 gap-1">
          <ScorerButton label="B" onClick={() => handleExtraClick('bye')} className="bg-amber-700 hover:bg-amber-700/80" />
          <ScorerButton label="LB" onClick={() => handleExtraClick('leg-bye')} className="bg-amber-700 hover:bg-amber-700/80" />
          <ScorerButton label="WD" onClick={() => handleExtraClick('wide')} className="bg-amber-700 hover:bg-amber-700/80" />
          <ScorerButton label="NB" onClick={() => handleExtraClick('no-ball')} className="bg-amber-700 hover:bg-amber-700/80" />
        </div>

        {/* Row 4: 5 7 ... UNDO */}
        <div className="grid grid-cols-4 gap-1">
          <ScorerButton label="5" onClick={() => handleNumberClick(5)} />
          <ScorerButton label="7" onClick={() => handleNumberClick(7)} />
          <ScorerButton label="..." onClick={() => dispatch(openDialog({ dialog: 'options' }))} className="bg-gray-700 hover:bg-gray-700/80" />
          <ScorerButton label="UNDO" onClick={() => handleUndo()} className="bg-purple-800 hover:bg-purple-800/80" />
        </div>
      </div>

      {/* Dialogs */}
      {dialogState.activeDialog === 'extra' && <ExtraDialog />}
      {dialogState.activeDialog === 'wicket' && <WicketDialog />}
      {dialogState.activeDialog === 'stumped' && <StumpedDialog />}
      {dialogState.activeDialog === 'runOut' && <RunOutDialog />}
      {dialogState.activeDialog === 'batsmanSelect' && <BatsmanSelectionModal />}
      {dialogState.activeDialog === 'options' && <OptionsDialog />}
      {dialogState.activeDialog === 'newBatsman' && <NewBatsmanDialog />}
      {dialogState.activeDialog === 'newBowler' && <NewBowlerDialog />}
      {dialogState.activeDialog === 'bowlerRetired' && <BowlerRetiredDialog />}
      {dialogState.activeDialog === 'batsmanRetired' && <BatsmanRetiredDialog />}
      {dialogState.activeDialog === 'matchDetails' && <MatchDetailsDialog />}
    </div>
  );

  function handleNumberClick(runs: number) {
    dispatch(createUndoSnapshot());
    dispatch(recordBattingBall({ runs }));
  }

  function handleExtraClick(type: 'bye' | 'leg-bye' | 'wide' | 'no-ball') {
    dispatch(createUndoSnapshot());
    dispatch(openDialog({ dialog: 'extra', data: { extraType: type } }));
  }

  function handleWicketClick() {
    dispatch(openDialog({ dialog: 'wicket' }));
  }

  function handleUndo() {
    dispatch(undoLastDelivery());
  }
}

// Simple Button Component
function ScorerButton({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-3 rounded font-bold text-white ${className || 'bg-gray-700 hover:bg-gray-800'} active:scale-95 transition-all`}
    >
      {label}
    </button>
  );
}

export default LiveScorer;
