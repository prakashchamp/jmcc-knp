'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import {
  initializeLiveMatch,
  initializeMatchAtSecondInnings,
  openDialog,
  recordBattingBall,
  createUndoSnapshot,
  undoLastDelivery,
  swapBatsmen,
  setInitialBattersAndBowler,
  clearMatch,
  recordPenaltyRuns,
  recordQuickWicket,
  finishCurrentInnings,
  completeMatchOnTargetReached,
  viewCompletedMatch,
} from '@/app/lib/redux/slices/scorerSlice';
import type { Ball, LiveMatch, TeamPlayer, InningsState } from '@/app/lib/cricket-scorer-types';
import { getCurrentBowlerStats } from '@/app/lib/bowling-stats-utils';
import { formatBallDisplay, getBallColor as getDisplayBallColor } from '@/app/lib/ball-display-utils';
import { useTheme } from '../ThemeProvider';

// Landing Page Component
import { ScorerLandingPage } from './ScorerLandingPage';

// Dialog Components
import { ExtraDialog } from './dialogs/ExtraDialog';
import { WicketDialog } from './dialogs/WicketDialog';
import { RunOutDialog } from './dialogs/RunOutDialog';
import { StumpedDialog } from './dialogs/StumpedDialog';
import { BatsmanSelectionModal } from './dialogs/BatsmanSelectionModal';
import { OptionsDialog } from './dialogs/OptionsDialog';
import { UploadConfirmDialog } from './dialogs/UploadConfirmDialog';
import { ManualBowlingStatsDialog } from './dialogs/ManualBowlingStatsDialog';
import { NewBatsmanDialog } from './dialogs/NewBatsmanDialog';
import { NewBowlerDialog } from './dialogs/NewBowlerDialog';
import { BowlerRetiredDialog } from './dialogs/BowlerRetiredDialog';
import { BatsmanRetiredDialog } from './dialogs/BatsmanRetiredDialog';
import { MatchDetailsDialog } from './dialogs/MatchDetailsDialog';
import { InitialBattersDialog } from './dialogs/InitialBattersDialog';
import { StartNewMatchConfirmDialog } from './dialogs/StartNewMatchConfirmDialog';
import { OverEndPopup } from './dialogs/OverEndPopup';
import { SixPlusDialog } from './dialogs/SixPlusDialog';
import { FinishInningsDialog } from './dialogs/FinishInningsDialog';
import { ScorerMenu } from './ScorerMenu';
import { BattingScorecard } from './review-screens/BattingScorecard';
import { BowlingScorecard } from './review-screens/BowlingScorecard';
import { OversHistory } from './review-screens/OversHistory';
import { FallOfWickets } from './review-screens/FallOfWickets';
import { Partnerships } from './review-screens/Partnerships';
import { MatchDetails } from './review-screens/MatchDetails';
import { MatchResultPanel } from './review-screens/MatchResultPanel';

interface LiveScorerProps {
  teamPlayers: TeamPlayer[];
  currentView?: 'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details';
  onViewChange?: (view: 'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details') => void;
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
  const { teamPlayers, currentView, onViewChange } = props;
  const [internalView, setInternalView] = useState<'scorer' | 'batting' | 'bowling' | 'overs' | 'wickets' | 'partnerships' | 'details'>('scorer');

  // Use provided view or fall back to internal state
  const view = currentView || internalView;
  const handleViewChange = onViewChange || setInternalView;

  const dispatch = useDispatch<AppDispatch>();
  const liveMatch = useSelector((state: RootState) => state.scorer.liveMatch);
  const currentInnings = useSelector((state: RootState) => state.scorer.currentInnings);
  const dialogState = useSelector((state: RootState) => state.scorer.dialogState);
  const loading = useSelector((state: RootState) => state.scorer.loading);
  const error = useSelector((state: RootState) => state.scorer.error);
  const lastCompletedMatch = useSelector((state: RootState) => state.scorer.lastCompletedMatch);
  const teamName = useSelector((state: RootState) => state.team.team?.name || 'JMCC');
  const [positionedBatsman1Id, setPositionedBatsman1Id] = useState<string | null>(null);
  const [positionedBatsman2Id, setPositionedBatsman2Id] = useState<string | null>(null);
  const [previousOverNumber, setPreviousOverNumber] = useState(0);

  const { theme, toggleTheme } = useTheme();
  const viewTitles: Record<typeof view, string> = {
    scorer: 'Live Scorer',
    batting: 'Batting',
    bowling: 'Bowling',
    overs: 'Overs',
    wickets: 'Wickets',
    partnerships: 'Partnerships',
    details: 'Match Info',
  };
  const showResultScreen = Boolean(liveMatch?.status === 'complete' && view === 'scorer');
  const headerTitle = showResultScreen ? 'Match Result' : viewTitles[view];

  // Keep batter rows stable across strike rotation.
  // Row 1 starts with the first-ball striker, and after a wicket the surviving batter stays/moves to row 1.
  useEffect(() => {
    if (!currentInnings?.striker || !currentInnings?.nonStriker) return;

    const currentPairIds = [currentInnings.striker.id, currentInnings.nonStriker.id];

    // At the start of an innings, always honor the user's selected striker/non-striker order.
    if (currentInnings.totalBalls === 0) {
      if (
        positionedBatsman1Id !== currentInnings.striker.id ||
        positionedBatsman2Id !== currentInnings.nonStriker.id
      ) {
        setPositionedBatsman1Id(currentInnings.striker.id);
        setPositionedBatsman2Id(currentInnings.nonStriker.id);
      }
      return;
    }

    if (!positionedBatsman1Id || !positionedBatsman2Id) {
      setPositionedBatsman1Id(currentInnings.striker.id);
      setPositionedBatsman2Id(currentInnings.nonStriker.id);
      return;
    }

    const batsman1StillBatting = currentPairIds.includes(positionedBatsman1Id);
    const batsman2StillBatting = currentPairIds.includes(positionedBatsman2Id);

    if (batsman1StillBatting && batsman2StillBatting) {
      return;
    }

    if (!batsman1StillBatting && batsman2StillBatting) {
      const newBatsmanId = currentPairIds.find((id) => id !== positionedBatsman2Id) || null;
      setPositionedBatsman1Id(positionedBatsman2Id);
      setPositionedBatsman2Id(newBatsmanId);
      return;
    }

    if (batsman1StillBatting && !batsman2StillBatting) {
      const newBatsmanId = currentPairIds.find((id) => id !== positionedBatsman1Id) || null;
      setPositionedBatsman2Id(newBatsmanId);
      return;
    }

    setPositionedBatsman1Id(currentInnings.striker.id);
    setPositionedBatsman2Id(currentInnings.nonStriker.id);
  }, [currentInnings?.striker?.id, currentInnings?.nonStriker?.id, positionedBatsman1Id, positionedBatsman2Id]);

  // Helper to get batsman data from innings by ID (always the current updated stats)
  const getBatsmanById = (id: string | null, inningsData: InningsState | undefined) => {
    if (!id || !inningsData) return null;
    if (inningsData.striker?.id === id) return inningsData.striker;
    if (inningsData.nonStriker?.id === id) return inningsData.nonStriker;
    return null;
  };

  // Show initial batters selection dialog when match starts
  useEffect(() => {
    if (
      liveMatch?.status === 'in-progress' &&
      currentInnings &&
      currentInnings.totalBalls === 0 &&
      !currentInnings.striker &&
      !currentInnings.nonStriker &&
      !currentInnings.currentBowler
    ) {
      if (dialogState.activeDialog !== 'initialBatters') {
        dispatch(openDialog({ dialog: 'initialBatters' }));
      }
    }
  }, [currentInnings, dialogState.activeDialog, dispatch, liveMatch?.status]);

  // Match lifecycle: innings transition and result completion
  useEffect(() => {
    if (!liveMatch || !currentInnings || liveMatch.status !== 'in-progress') return;

    const maxBalls = liveMatch.totalOvers * 6;
    const inningsLimitReached = currentInnings.totalWickets >= 10 || currentInnings.totalBalls >= maxBalls;
    const firstInnings = liveMatch.innings[0];
    const secondInningsTarget = currentInnings.target ?? (firstInnings ? firstInnings.totalRuns + 1 : undefined);

    if (
      liveMatch.currentInnings === 2 &&
      typeof secondInningsTarget === 'number' &&
      currentInnings.totalRuns >= secondInningsTarget
    ) {
      dispatch(completeMatchOnTargetReached());
      return;
    }

    if (!inningsLimitReached) return;

    if (liveMatch.currentInnings === 1) {
      if (dialogState.activeDialog !== 'finishInnings') {
        dispatch(openDialog({ dialog: 'finishInnings' }));
      }
      return;
    }

    dispatch(finishCurrentInnings());
  }, [
    liveMatch,
    currentInnings?.totalBalls,
    currentInnings?.totalRuns,
    currentInnings?.totalWickets,
    currentInnings?.target,
    dialogState.activeDialog,
    dispatch,
  ]);

  // Detect when an over ends (6 legal deliveries)
  useEffect(() => {
    if (!currentInnings || !liveMatch || liveMatch.status !== 'in-progress') return;
    
    const currentOverNumber = Math.floor(currentInnings.totalBalls / 6);
    const inningsLimitReached =
      currentInnings.totalWickets >= 10 ||
      currentInnings.totalBalls >= liveMatch.totalOvers * 6;

    // If the last ball was undone, allow the over-end popup to trigger again.
    if (currentOverNumber < previousOverNumber) {
      setPreviousOverNumber(currentOverNumber);
      return;
    }
    
    // Check if we've completed a new over (totalBalls is a multiple of 6 and greater than before)
    if (
      !inningsLimitReached &&
      currentInnings.totalBalls > 0 &&
      currentInnings.totalBalls % 6 === 0 &&
      currentOverNumber > previousOverNumber
    ) {
      setPreviousOverNumber(currentOverNumber);
      
      // Show over end popup - only if not already showing
      if (dialogState.activeDialog === null) {
        dispatch(openDialog({ dialog: 'overEnd' }));
      }
    }
  }, [currentInnings?.totalBalls, previousOverNumber, dispatch, dialogState.activeDialog, liveMatch, currentInnings]);

  // Keep the active ball slot centered so previous/current/next remain visible
  const ballsContainerRef = useRef<HTMLDivElement>(null);
  const currentBallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentBallRef.current) {
      currentBallRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentInnings?.ballHistory, currentInnings?.totalBalls]);

  const handleStartNewMatch = (matchDetails: {
    opponent: string;
    venue: string;
    tossWonBy: 'Us' | 'Them';
    tossDecision: 'bat' | 'field';
    totalOvers: number;
    striker?: TeamPlayer;
    nonStriker?: TeamPlayer;
    bowler?: TeamPlayer;
    startFromSecondInnings?: boolean;
    firstInningsScore?: number;
  }) => {
    const newMatch: LiveMatch = {
      id: `match_${Date.now()}`,
      opponent: matchDetails.opponent,
      venue: matchDetails.venue,
      tossWonBy: matchDetails.tossWonBy,
      tossDecision: matchDetails.tossDecision,
      format: 'Custom',
      totalOvers: matchDetails.totalOvers,
      teamPlayers,
      currentInnings: 1,
      innings: [],
      status: 'in-progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (matchDetails.startFromSecondInnings && typeof matchDetails.firstInningsScore === 'number') {
      // Start directly from 2nd innings
      dispatch(initializeMatchAtSecondInnings({
        match: newMatch,
        firstInningsScore: matchDetails.firstInningsScore,
      }));
    } else {
      dispatch(initializeLiveMatch(newMatch));
    }

    // If we have striker and bowler, set them immediately
    if (matchDetails.striker && matchDetails.nonStriker && matchDetails.bowler) {
      dispatch(setInitialBattersAndBowler({
        striker: matchDetails.striker,
        nonStriker: matchDetails.nonStriker,
        bowler: matchDetails.bowler,
      }));
    }
  };

  const handleResumeMatch = () => {
    // Match is already in Redux, just show the scoring interface
    // This would trigger opening the initial batters dialog if needed
  };

  // Show landing page if no match is initialized
  if (!liveMatch) {
    return (
      <ScorerLandingPage 
        onStartNewMatch={handleStartNewMatch}
        onResumeMatch={handleResumeMatch}
        hasMatchToResume={false} // Match is already handled by liveMatch !== null above
        lastCompletedMatch={lastCompletedMatch}
        onViewCompletedMatch={(match) => dispatch(viewCompletedMatch(match))}
        teamPlayers={teamPlayers}
      />
    );
  }

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

  // Now that innings is defined, we can safely call our helper
  const displayBatsman1 = getBatsmanById(positionedBatsman1Id, innings);
  const displayBatsman2 = getBatsmanById(positionedBatsman2Id, innings);
  const currentBowlerStats = getCurrentBowlerStats(innings, innings.currentBowler);

  /**
   * Calculate number of zero-run balls (dots) faced by a batsman
   * Excludes WD as they don't count as balls faced
   * Includes NB (no-balls count as balls for striker)
   */
  const calculateZeros = (batterId: string): number => {
    if (!innings.ballHistory) return 0;
    return innings.ballHistory.filter(
      (ball) => ball.batter.id === batterId && ball.runs.batter === 0 && ball.extra?.type !== 'wide'
    ).length;
  };

  // Calculate CRR (Current Run Rate)
  const totalOversPlayed = innings.totalBalls / 6;
  const crr = totalOversPlayed > 0 ? (innings.totalRuns / totalOversPlayed).toFixed(2) : '0.00';

  // Calculate RRR and runs required (treat as second innings for now)
  const firstInnings = liveMatch.innings?.[0];
  const target = innings.inningsNumber === 2
    ? innings.target ?? (firstInnings ? firstInnings.totalRuns + 1 : undefined)
    : undefined;
  const runsRequired = innings.inningsNumber === 2 && typeof target === 'number'
    ? Math.max(0, target - innings.totalRuns)
    : 0;
  const ballsRemaining = Math.max(0, (liveMatch.totalOvers * 6) - innings.totalBalls);
  const oversRemaining = ballsRemaining / 6;
  const rrr = innings.inningsNumber === 2 && oversRemaining > 0 ? (runsRequired / oversRemaining).toFixed(2) : '0.00';
  const scoringLocked = liveMatch.status !== 'in-progress';
  const usInnings = innings.battingTeam === 'Us'
    ? innings
    : liveMatch.innings.find((entry) => entry.battingTeam === 'Us');
  const themInnings = innings.battingTeam === 'Them'
    ? innings
    : liveMatch.innings.find((entry) => entry.battingTeam === 'Them');

  // Calculate total extras (from balls + penalty runs)
  const ballExtras = innings.ballHistory ? innings.ballHistory.reduce((sum, ball) => sum + (ball.runs.extras || 0), 0) : 0;
  const totalExtras = ballExtras + (innings.penaltyExtras || 0);

  // Get current partnership data from Redux state (tracked incrementally as balls are recorded)
  const partnershipRuns = innings.currentPartnership?.partnershipRuns || 0;
  const partnershipBalls = innings.currentPartnership?.partnershipBalls || 0;

  // Calculate current over number and get balls from this over
  const totalOversNumber = Math.floor(innings.totalBalls / 6);
  const currentOverBalls = innings.ballHistory ? innings.ballHistory.filter((b) => b.over === totalOversNumber) : [];

  const ballsToDisplay = currentOverBalls;
  const legalBallsThisOver = ballsToDisplay.filter((ball) => {
    return !(ball.extra?.type === 'wide' || ball.extra?.type === 'no-ball' || ball.extra?.isNoBall);
  });
  const remainingBallSlots = Math.max(0, 6 - legalBallsThisOver.length);
  const thisOverSlots = [
    ...ballsToDisplay.map((ball, index: number) => ({
      key: `ball-${index}`,
      type: 'ball' as const,
      ball,
    })),
    ...Array.from({ length: remainingBallSlots }, (_, index) => ({
      key: `empty-${index}`,
      type: 'empty' as const,
    })),
  ];
  const currentBallIndex = remainingBallSlots > 0
    ? ballsToDisplay.length
    : Math.max(0, thisOverSlots.length - 1);

  // Helper function to determine box color based on ball value
  const getBallColor = (ball: Ball | string): string => {
    let ballStr = '';
    
    // Handle Ball object
    if (typeof ball !== 'string') {
      return getDisplayBallColor(ball as any).replace('border ', '');
    }
    
    // Handle string data
    ballStr = ball;
    
    // Priority 1: Wicket (W but not WD - highest priority - always red)
    // Using regex to match W not followed by D
    if (ballStr.match(/W(?!D)/)) return 'bg-red-600 border-red-500';
    
    // Priority 2: B, LB, and WD - ALWAYS yellow (no override)
    if ((ballStr.includes('B') && !ballStr.includes('NB')) || ballStr.includes('WD')) {
      return 'bg-yellow-600 border-yellow-500'; // B, LB, or WD - always yellow
    }
    
    // Priority 3: NB with special run colors
    if (ballStr.includes('NB')) {
      const runMatch = ballStr.match(/^(\d+)/);
      if (runMatch) {
        const runs = parseInt(runMatch[1]);
        // Exactly 7 runs on NB - green
        if (runs === 7) {
          return 'bg-green-600 border-green-500'; // 7NB - green
        }
        // Exactly 5 runs on NB - blue
        if (runs === 5) {
          return 'bg-blue-600 border-blue-500'; // 5NB - blue
        }
      }
      // All other runs on NB - amber
      return 'bg-amber-600 border-amber-500'; // 0-4NB, 6NB, 8+NB - amber
    }
    
    // Priority 7: 6+ runs (7, 8, 9, etc. - violet)
    if (ballStr.match(/^[7-9]$/) || parseInt(ballStr) > 6) {
      return 'bg-violet-600 border-violet-500';
    }
    
    // Priority 8: 6 (always green)
    if (ballStr.includes('6')) return 'bg-green-600 border-green-500';
    
    // Priority 9: 4 (always blue)
    if (ballStr.includes('4')) return 'bg-blue-600 border-blue-500';
    
    // Default: 0, 1, 2, 3 and other numbers - all gray
    return 'bg-background border border-border opacity-40';
  };

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden flex flex-col">
      {/* Top Header - Menu left, title center, back right */}
      <div className="bg-card px-4 py-2 flex-shrink-0 border-b border-border">
        <div className="relative flex items-center justify-between">
          <div className="w-20 flex justify-start">
            <ScorerMenu currentView={view} onViewChange={handleViewChange} />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <h1 className="text-base font-bold">{headerTitle}</h1>
          </div>

          <div className="w-20 flex justify-end gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-background text-foreground transition-all hover:border-blue-500 active:scale-90 shadow-sm"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            {view !== 'scorer' && (
              <button
                onClick={() => handleViewChange('scorer')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-border bg-background text-foreground transition-all hover:border-blue-500 active:scale-90 shadow-sm"
                title="Back"
                aria-label="Back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7 7-7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 12h11a7 7 0 017 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {showResultScreen && (
          <MatchResultPanel
            liveMatch={liveMatch}
            onStartNewMatch={() => dispatch(clearMatch())}
            onOpenView={(nextView) => handleViewChange(nextView)}
          />
        )}

        {!showResultScreen && view === 'scorer' && (
          <div className="h-full flex flex-col">
          {/* Score Section */}
      <div className="bg-background/50 px-3 py-2 flex-shrink-0">
        {liveMatch.status === 'complete' && (
          <div className="mb-2 rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-center text-xs font-semibold text-emerald-100">
            {liveMatch.winMargin || 'Match complete'}
          </div>
        )}
        {/* Teams Container */}
        <div className="bg-card rounded py-1.5 px-2 mb-1 border border-blue-500/30">
          {/* JMCC Row */}
          <div className={`-mx-2 px-2 py-1 flex items-center justify-between text-xs mb-1 rounded ${innings.battingTeam === 'Us' ? 'bg-blue-500/10 border-l-4 border-blue-500' : 'bg-card border-l-4 border-transparent'}`}>
            <p className="text-xs font-semibold">{teamName}</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base">{usInnings?.totalRuns ?? 0}/{usInnings?.totalWickets ?? 0}</p>
              <p className="opacity-60">[{Math.floor((usInnings?.totalBalls ?? 0) / 6)}.{(usInnings?.totalBalls ?? 0) % 6} / {liveMatch.totalOvers}]</p>
            </div>
          </div>
          {/* OPPONENT Row */}
          <div className={`flex items-center justify-between text-xs rounded px-0 ${innings.battingTeam === 'Them' ? 'bg-blue-500/10 border-l-4 border-blue-500 -mx-2 px-2 py-1' : ''}`}>
            <p className="text-xs font-semibold">{liveMatch.opponent}</p>
            <div className="flex items-center gap-2">
              <p className="font-bold text-base">{themInnings?.totalRuns ?? 0}/{themInnings?.totalWickets ?? 0}</p>
              <p className="opacity-60">[{Math.floor((themInnings?.totalBalls ?? 0) / 6)}.{(themInnings?.totalBalls ?? 0) % 6} / {liveMatch.totalOvers}]</p>
            </div>
          </div>
        </div>

        {/* CRR, RRR, and Extras Row */}
        <div className="bg-card flex justify-between items-center mt-1 py-1 px-3 rounded border border-blue-500/30">
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">CRR:</p>
            <p className="font-bold text-sm">{crr}</p>
          </div>
          {innings.inningsNumber === 2 && (
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold">RRR:</p>
              <p className="font-bold text-sm">{rrr}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            <p className="text-xs font-semibold">Extras:</p>
            <p className="font-bold text-sm">{totalExtras}</p>
          </div>
        </div>

        {/* Runs Required / Balls Remaining Row - Only for 2nd Innings */}
        {innings.inningsNumber === 2 && (
          <div className="bg-card flex gap-2 justify-center items-center mt-1 py-1 rounded border border-blue-500/30">
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold">{runsRequired} runs required</p>
            </div>
            <div className="w-px h-5 bg-border"></div>
            <div className="flex items-center gap-1">
              <p className="text-xs font-semibold">{ballsRemaining} balls remaining</p>
            </div>
          </div>
        )}
      </div>

      {/* Batsmen Section */}
      <div className="p-2 border-b border-border flex-shrink-0">
        <div className="text-xs">
          {/* Header */}
          <div className="flex items-center font-bold opacity-40 px-2 mb-1">
            <div className="w-6"></div>
            <div className="w-36">Batsman</div>
            <div className="flex-1"></div>
            <div className="w-12 text-center">R</div>
            <div className="w-12 text-center">B</div>
            <div className="w-10 text-center">0s</div>
            <div className="w-10 text-center">4s</div>
            <div className="w-10 text-center">6s</div>
            <div className="w-14 text-center">SR</div>
          </div>
          
          {/* Row 1 - Batsman 1 */}
          <div className={`flex items-center p-2 rounded mb-2 font-bold border-l-4 transition-colors ${
            innings.striker?.id === positionedBatsman1Id 
              ? 'bg-blue-500/10 border-blue-500' 
              : 'bg-card border-transparent'
          }`}>
            <button
              onClick={() => dispatch(swapBatsmen())}
              className="w-6 flex justify-center hover:scale-110 transition-transform cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                innings.striker?.id === positionedBatsman1Id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-border bg-card'
              }`}></div>
            </button>
            <div className="w-36 truncate ml-2">{displayBatsman1?.name || 'Batsman 1'}</div>
            <div className="flex-1"></div>
            <div className="w-12 text-center">{displayBatsman1?.runs || 0}</div>
            <div className="w-12 text-center">{displayBatsman1?.balls || 0}</div>
            <div className="w-10 text-center">{displayBatsman1 ? calculateZeros(displayBatsman1.id) : 0}</div>
            <div className="w-10 text-center">{displayBatsman1?.fours || 0}</div>
            <div className="w-10 text-center">{displayBatsman1?.sixes || 0}</div>
            <div className="w-14 text-center">{displayBatsman1?.strikeRate.toFixed(2) || 0}</div>
          </div>
          
          {/* Row 2 - Batsman 2 */}
          <div className={`flex items-center p-2 rounded font-bold border-l-4 transition-colors ${
            innings.striker?.id === positionedBatsman2Id 
              ? 'bg-blue-500/10 border-blue-500' 
              : 'bg-card border-transparent'
          }`}>
            <button
              onClick={() => dispatch(swapBatsmen())}
              className="w-6 flex justify-center hover:scale-110 transition-transform cursor-pointer"
            >
              <div className={`w-4 h-4 rounded-full border-2 ${
                innings.striker?.id === positionedBatsman2Id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-border bg-card'
              }`}></div>
            </button>
            <div className="w-36 truncate ml-2">{displayBatsman2?.name || 'Batsman 2'}</div>
            <div className="flex-1"></div>
            <div className="w-12 text-center">{displayBatsman2?.runs || 0}</div>
            <div className="w-12 text-center">{displayBatsman2?.balls || 0}</div>
            <div className="w-10 text-center">{displayBatsman2 ? calculateZeros(displayBatsman2.id) : 0}</div>
            <div className="w-10 text-center">{displayBatsman2?.fours || 0}</div>
            <div className="w-10 text-center">{displayBatsman2?.sixes || 0}</div>
            <div className="w-14 text-center">{displayBatsman2?.strikeRate.toFixed(2) || 0}</div>
          </div>

          {/* Partnership Row */}
          <div className="flex items-center p-2 rounded text-xs mt-2">
            <div className="w-36 opacity-60">Current Partnership</div>
            <div className="flex-1"></div>
            <div className="opacity-60 w-24 text-right">
              {partnershipRuns} ({partnershipBalls})
            </div>
          </div>
        </div>
      </div>

      {/* Bowler Section */}
      <div className="p-2 border-b border-border flex-shrink-0">
        <div className="text-xs">
          {/* Header */}
          <div className="flex items-center font-bold opacity-40 px-2 mb-1">
            <div className="w-6"></div>
            <div className="w-36">Bowler</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">O</div>
            <div className="w-10 text-center">R</div>
            <div className="w-10 text-center">W</div>
            <div className="w-14 text-center">ECO</div>
          </div>
          
          {/* Current Bowler Row */}
          <div className="flex items-center bg-blue-500/10 p-2 rounded font-bold border-l-4 border-blue-500">
            <div className="w-6 flex justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-500"></div>
            </div>
            <div className="w-36 truncate ml-2">{currentBowlerStats?.name || innings.currentBowler?.name || 'Bowler 1'}</div>
            <div className="flex-1"></div>
            <div className="w-10 text-center">{currentBowlerStats?.overs ?? innings.currentBowler?.overs ?? 0}.{currentBowlerStats ? currentBowlerStats.balls % 6 : innings.currentBowler?.balls || 0}</div>
            <div className="w-10 text-center">{currentBowlerStats?.runs ?? innings.currentBowler?.runs ?? 0}</div>
            <div className="w-10 text-center">{currentBowlerStats?.wickets ?? innings.currentBowler?.wickets ?? 0}</div>
            <div className="w-14 text-center">{(currentBowlerStats?.economy ?? innings.currentBowler?.economy ?? 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* This Over */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <div className="text-xs flex items-center gap-2">
          {/* Fixed Label */}
          <div className="font-bold opacity-40 whitespace-nowrap flex-shrink-0">This Over</div>

          {/* Ball Results Container */}
          <div
            ref={ballsContainerRef}
            className="flex gap-2 pl-4 overflow-x-auto overflow-y-hidden flex-1 scrollbar-hide items-center scroll-smooth snap-x snap-mandatory"
          >
            {thisOverSlots.map((slot, index) => {
              const isCurrentBall = index === currentBallIndex;

              if (slot.type === 'ball') {
                const ball = slot.ball;
                const ballLabel = formatBallDisplay(ball as any);

                return (
                  <div
                    key={slot.key}
                    ref={isCurrentBall ? currentBallRef : null}
                    className={`${getBallColor(ball)} w-fit h-8 border rounded px-2 py-1 flex items-center justify-center text-xs font-semibold text-white whitespace-nowrap snap-center`}
                  >
                    {ballLabel === '0' ? (
                      <span className="inline-block h-2 w-2 rounded-full bg-white" aria-label="dot ball" />
                    ) : (
                      ballLabel
                    )}
                  </div>
                );
              }

              return (
                  <div
                    key={slot.key}
                    ref={isCurrentBall ? currentBallRef : null}
                    className="w-fit min-w-8 h-8 border rounded px-2 py-1 flex items-center justify-center text-xs snap-center bg-card border-border opacity-40"
                  >
                  -
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Button Pad */}
      <div className="p-2 space-y-1 flex-1 overflow-y-auto">
        {/* Row 1: 0 1 2 3 */}
        <div className="grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map(runs => (
            <ScorerButton key={runs} label={runs.toString()} onClick={() => handleNumberClick(runs)} disabled={scoringLocked} />
          ))}
        </div>

        {/* Row 2: 5 4 6 W */}
        <div className="grid grid-cols-4 gap-1">
          <ScorerButton label="5" onClick={() => handleNumberClick(5)} disabled={scoringLocked} />
          <ScorerButton label="4" onClick={() => handleNumberClick(4)} className="bg-blue-600 hover:bg-blue-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="6" onClick={() => handleNumberClick(6)} className="bg-green-600 hover:bg-green-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="W" onClick={() => handleWicketClick()} className="bg-red-600 hover:bg-red-700 text-white border-transparent" disabled={scoringLocked} />
        </div>

        {/* Row 3: B LB WD NB */}
        <div className="grid grid-cols-4 gap-1">
          <ScorerButton label="B" onClick={() => handleExtraClick('bye')} className="bg-yellow-600 hover:bg-yellow-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="LB" onClick={() => handleExtraClick('leg-bye')} className="bg-yellow-600 hover:bg-yellow-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="WD" onClick={() => handleExtraClick('wide')} className="bg-yellow-600 hover:bg-yellow-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="NB" onClick={() => handleExtraClick('no-ball')} className="bg-amber-600 hover:bg-amber-700 text-white border-transparent" disabled={scoringLocked} />
        </div>

        {/* Row 4: 5P 6+ ... UNDO */}
        <div className="grid grid-cols-4 gap-1">
          <ScorerButton label="5P" onClick={() => handlePenaltyRuns(5)} className="bg-violet-600 hover:bg-violet-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="6+" onClick={() => handleSixPlusClick()} className="bg-violet-600 hover:bg-violet-700 text-white border-transparent" disabled={scoringLocked} />
          <ScorerButton label="..." onClick={() => dispatch(openDialog({ dialog: 'options' }))} className="bg-background border border-border text-foreground hover:bg-blue-500/10" disabled={scoringLocked} />
          <ScorerButton label="UNDO" onClick={() => handleUndo()} className="bg-purple-600 hover:bg-purple-700 text-white border-transparent" disabled={scoringLocked} />
        </div>
      </div>
          </div>
        )}

        {view === 'batting' && <BattingScorecard />}
        {view === 'bowling' && <BowlingScorecard />}
        {view === 'overs' && <OversHistory />}
        {view === 'wickets' && <FallOfWickets />}
        {view === 'partnerships' && <Partnerships />}
        {view === 'details' && <MatchDetails />}
      </div>

      {/* Dialogs */}
      {dialogState.activeDialog === 'extra' && <ExtraDialog />}
      {dialogState.activeDialog === 'wicket' && <WicketDialog />}
      {dialogState.activeDialog === 'stumped' && <StumpedDialog />}
      {dialogState.activeDialog === 'runOut' && <RunOutDialog />}
      {dialogState.activeDialog === 'batsmanSelect' && <BatsmanSelectionModal />}
      {dialogState.activeDialog === 'options' && <OptionsDialog />}
      {dialogState.activeDialog === 'uploadConfirm' && <UploadConfirmDialog />}
      {dialogState.activeDialog === 'newBatsman' && <NewBatsmanDialog />}
      {dialogState.activeDialog === 'newBowler' && <NewBowlerDialog />}
      {dialogState.activeDialog === 'bowlerRetired' && <BowlerRetiredDialog />}
      {dialogState.activeDialog === 'batsmanRetired' && <BatsmanRetiredDialog />}
      {dialogState.activeDialog === 'matchDetails' && <MatchDetailsDialog />}
      {dialogState.activeDialog === 'initialBatters' && <InitialBattersDialog />}
      {dialogState.activeDialog === 'startNewMatchConfirm' && <StartNewMatchConfirmDialog />}
      {dialogState.activeDialog === 'overEnd' && <OverEndPopup />}
      {dialogState.activeDialog === 'finishInnings' && <FinishInningsDialog />}
      {dialogState.activeDialog === 'sixPlus' && <SixPlusDialog />}
      {dialogState.activeDialog === 'manualBowling' && <ManualBowlingStatsDialog />}
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

  function handlePenaltyRuns(runs: number) {
    dispatch(createUndoSnapshot());
    dispatch(recordPenaltyRuns({ runs }));
  }

  function handleSixPlusClick() {
    dispatch(openDialog({ dialog: 'sixPlus' }));
  }

  function handleUndo() {
    dispatch(undoLastDelivery());
  }
}

// Simple Button Component
function ScorerButton({ label, onClick, className = '', disabled = false }: { label: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3 rounded-xl font-black border-2 ${className || 'bg-background border-border text-foreground hover:bg-blue-600/5'} ${disabled ? 'opacity-40 cursor-not-allowed hover:bg-inherit' : 'active:scale-95 shadow-md active:shadow-sm'} transition-all`}
    >
      {label}
    </button>
  );
}

export default LiveScorer;
