'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LiveMatch, Ball, InningsState, CurrentBatsman, CurrentBowler, TeamPlayer, DismissalMode, ExtraType } from '@/app/lib/cricket-scorer-types';

/**
 * Dialog state for modals
 */
export interface DialogState {
  activeDialog: 'extra' | 'wicket' | 'stumped' | 'runOut' | 'batsmanSelect' | 'finishInnings' | 'options' | 'newBatsman' | 'newBowler' | 'bowlerRetired' | 'batsmanRetired' | 'matchDetails' | 'initialBatters' | 'startNewMatchConfirm' | 'overEnd' | 'sixPlus' | 'uploadConfirm' | 'manualBowling' | null;
  dialogData?: {
    extraType?: ExtraType;
    hasWicket?: boolean;
    dismissalMode?: DismissalMode;
    selectedBatsman?: 'striker' | 'non-striker';
    runs?: number;
    runType?: 'leg-bye' | 'bye' | 'none';
    ballType?: 'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular';
    bowlerName?: string;
    isBatsmanSwapped?: boolean;
    outBatsmanId?: string; // Tracks which batsman was marked out (for replacement)
    recordOnSelect?: boolean;
  };
}

/**
 * Snapshot for undo mechanism
 */
export interface InningsSnapshot {
  inningsState: InningsState;
  striker: CurrentBatsman | undefined;
  nonStriker: CurrentBatsman | undefined;
  currentBowler: CurrentBowler | undefined;
  timestamp: number;
}

/**
 * Main scorer state for live match
 */
export interface ScorerState {
  liveMatch: LiveMatch | null;
  currentInnings: InningsState | null;
  undoStack: InningsSnapshot[];
  dialogState: DialogState;
  loading: boolean;
  error: string | null;
  lastCompletedMatch: LiveMatch | null;
}

const initialState: ScorerState = {
  liveMatch: null,
  currentInnings: null,
  undoStack: [],
  dialogState: {
    activeDialog: null,
    dialogData: {},
  },
  loading: false,
  error: null,
  lastCompletedMatch: null,
};

/**
 * Initialize a new live match
 */
function createEmptyInnings(inningsNumber: 1 | 2, teamPlayers: TeamPlayer[]): InningsState {
  return {
    inningsNumber,
    battingTeam: 'Us',
    totalRuns: 0,
    totalWickets: 0,
    totalBalls: 0,
    ballHistory: [],
    penaltyExtras: 0,
    striker: undefined,
    nonStriker: undefined,
    currentBowler: undefined,
    dismissedBatsmen: [],
    batsmanStats: [],
    bowlerStats: [],
  };
}

function getOtherTeam(team: 'Us' | 'Them'): 'Us' | 'Them' {
  return team === 'Us' ? 'Them' : 'Us';
}

function getFirstInningsBattingTeam(
  tossWonBy: 'Us' | 'Them',
  tossDecision: 'bat' | 'field'
): 'Us' | 'Them' {
  if (tossDecision === 'bat') return tossWonBy;
  return getOtherTeam(tossWonBy);
}

function getSecondInningsBattingTeam(
  tossWonBy: 'Us' | 'Them',
  tossDecision: 'bat' | 'field'
): 'Us' | 'Them' {
  return getOtherTeam(getFirstInningsBattingTeam(tossWonBy, tossDecision));
}

function getMaxLegalBalls(totalOvers: number): number {
  return Math.max(0, totalOvers * 6);
}

function isInningsLimitReached(innings: InningsState, totalOvers: number): boolean {
  return innings.totalWickets >= 10 || innings.totalBalls >= getMaxLegalBalls(totalOvers);
}

function shouldPromptForReplacement(innings: InningsState): boolean {
  return innings.totalWickets < 10;
}

function canRecordScoringEvent(state: ScorerState): boolean {
  if (!state.liveMatch || !state.currentInnings) return false;
  if (state.liveMatch.status !== 'in-progress') return false;

  const innings = state.currentInnings;
  if (isInningsLimitReached(innings, state.liveMatch.totalOvers)) return false;

  if (state.liveMatch.currentInnings === 2) {
    const firstInningsRuns = state.liveMatch.innings?.[0]?.totalRuns;
    const target = innings.target ?? (typeof firstInningsRuns === 'number' ? firstInningsRuns + 1 : undefined);
    if (typeof target === 'number' && innings.totalRuns >= target) {
      return false;
    }
  }

  return true;
}

/**
 * Helper: Update the current partnership when a ball is recorded
 * Rules:
 * - Only add runs to individual batters when those runs actually count for the batter
 * - Wides, Byes, Leg-byes, No-balls: Only add runs to partnership total, NOT to individual batters
 * - Regular deliveries: Add runs to both batter and partnership
 * - Wides: Count runs but NOT as a ball for partnership
 * - No-balls, Byes, Leg-byes: Count as both runs AND ball for partnership
 * - Regular deliveries: Count as both runs AND ball for partnership
 */
function updateCurrentPartnership(
  innings: InningsState,
  newBall: Ball,
  isBallCounted: boolean // true if this ball counts toward balls faced
) {
  // Initialize partnership if not exists
  if (!innings.currentPartnership) {
    innings.currentPartnership = {
      batsman1: {
        name: newBall.batter.name,
        id: newBall.batter.id,
        runs: 0,
        balls: 0,
      },
      batsman2: {
        name: newBall.nonStriker.name,
        id: newBall.nonStriker.id,
        runs: 0,
        balls: 0,
      },
      partnershipRuns: 0,
      partnershipBalls: 0,
    };
  }

  const partnership = innings.currentPartnership;
  
  // Update total partnership runs (always count all runs including extras)
  partnership.partnershipRuns += newBall.runs.total;

  // Update total partnership balls (only if this ball counts)
  if (isBallCounted) {
    partnership.partnershipBalls += 1;
  }

  // Update individual batsman stats - ONLY with runs that count for the batter
  // For extras (wides, byes, leg-byes, no-balls): ball.runs.batter = 0
  // For regular deliveries: ball.runs.batter = actual runs
  const batterRuns = newBall.runs.batter;
  
  if (newBall.batter.id === partnership.batsman1.id) {
    // Only add batter-specific runs (not extras)
    partnership.batsman1.runs += batterRuns;
    if (isBallCounted) {
      partnership.batsman1.balls += 1;
    }
  } else if (newBall.batter.id === partnership.batsman2.id) {
    // Only add batter-specific runs (not extras)
    partnership.batsman2.runs += batterRuns;
    if (isBallCounted) {
      partnership.batsman2.balls += 1;
    }
  }
}

/**
 * Helper: Update batsmanStats array to keep it in sync with current batsman stats
 * Called after every ball to ensure batsmanStats reflects current player stats
 */
function updateBatsmanStats(innings: InningsState) {
  if (!innings.batsmanStats || !innings.striker || !innings.nonStriker) return;

  // Update striker's stats in batsmanStats
  const strikerIndex = innings.batsmanStats.findIndex(b => b.id === innings.striker?.id);
  if (strikerIndex >= 0) {
    innings.batsmanStats[strikerIndex] = { ...innings.striker };
  }

  // Update non-striker's stats in batsmanStats
  const nonStrikerIndex = innings.batsmanStats.findIndex(b => b.id === innings.nonStriker?.id);
  if (nonStrikerIndex >= 0) {
    innings.batsmanStats[nonStrikerIndex] = { ...innings.nonStriker };
  }
}

function replaceBatsmanInPartnership(innings: InningsState, outBatsmanId: string, newBatsman: TeamPlayer) {
  if (!innings.currentPartnership) return;

  if (innings.currentPartnership.batsman1.id === outBatsmanId) {
    innings.currentPartnership.batsman1 = {
      ...innings.currentPartnership.batsman1,
      id: newBatsman.id,
      name: newBatsman.name,
    };
  }

  if (innings.currentPartnership.batsman2.id === outBatsmanId) {
    innings.currentPartnership.batsman2 = {
      ...innings.currentPartnership.batsman2,
      id: newBatsman.id,
      name: newBatsman.name,
    };
  }
}

/**
 * Helper: Update bowlerStats array to keep it in sync with current bowler stats
 */
function updateBowlerStats(innings: InningsState) {
  if (!innings.currentBowler) return;

  const index = innings.bowlerStats.findIndex(b => b.id === innings.currentBowler?.id);
  if (index >= 0) {
    innings.bowlerStats[index] = { ...innings.currentBowler };
  } else {
    innings.bowlerStats.push({ ...innings.currentBowler });
  }
}

export const mergeInningsIntoMatch = (match: LiveMatch, currentInnings: InningsState | null): LiveMatch => {
  if (!currentInnings) return match;
  const newMatch = JSON.parse(JSON.stringify(match));
  const existingIdx = newMatch.innings.findIndex((i: any) => i.inningsNumber === currentInnings.inningsNumber);
  if (existingIdx >= 0) {
    newMatch.innings[existingIdx] = currentInnings;
  } else {
    newMatch.innings.push(currentInnings);
  }
  return newMatch;
};

export const scorerSlice = createSlice({
  name: 'scorer',
  initialState,
  reducers: {
    /**
     * Initialize a new live match
     */
    initializeLiveMatch: (state, action: PayloadAction<LiveMatch>) => {
      const match = action.payload;
      const firstInningsBattingTeam = getFirstInningsBattingTeam(match.tossWonBy, match.tossDecision);
      
      // Create first innings if not provided
      const firstInnings = match.innings && match.innings.length > 0 
        ? { ...match.innings[0], battingTeam: match.innings[0].battingTeam || firstInningsBattingTeam }
        : createEmptyInnings(1, match.teamPlayers);

      firstInnings.battingTeam = firstInningsBattingTeam;
      
      // Ensure the innings is in the match
      if (!match.innings || match.innings.length === 0) {
        match.innings = [firstInnings];
      } else {
        match.innings[0] = firstInnings;
      }

      match.currentInnings = 1;
      match.status = 'in-progress';
      match.updatedAt = new Date().toISOString();
      
      state.liveMatch = match;
      state.currentInnings = firstInnings;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
      state.error = null;
    },

    /**
     * Initialize match directly at second innings.
     * Creates a synthetic completed first innings with just the score,
     * then sets up an empty second innings with correct target.
     */
    initializeMatchAtSecondInnings: (state, action: PayloadAction<{ match: LiveMatch; firstInningsScore: number }>) => {
      const { match, firstInningsScore } = action.payload;
      const firstInningsBattingTeam = getFirstInningsBattingTeam(match.tossWonBy, match.tossDecision);
      const secondInningsBattingTeam = getSecondInningsBattingTeam(match.tossWonBy, match.tossDecision);

      // Create synthetic completed first innings
      const firstInnings = createEmptyInnings(1, match.teamPlayers);
      firstInnings.battingTeam = firstInningsBattingTeam;
      firstInnings.totalRuns = firstInningsScore;
      firstInnings.totalBalls = match.totalOvers * 6; // Mark as fully completed
      firstInnings.totalWickets = 10; // Mark as all out for simplicity

      // Create empty second innings
      const secondInnings = createEmptyInnings(2, match.teamPlayers);
      secondInnings.battingTeam = secondInningsBattingTeam;
      secondInnings.target = firstInningsScore + 1;

      match.innings = [firstInnings, secondInnings];
      match.currentInnings = 2;
      match.status = 'in-progress';
      match.updatedAt = new Date().toISOString();

      state.liveMatch = match;
      state.currentInnings = secondInnings;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
      state.error = null;
    },

    /**
     * Create snapshot for undo before recording a ball
     */
    createUndoSnapshot: (state) => {
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const snapshot: InningsSnapshot = {
        inningsState: JSON.parse(JSON.stringify(state.currentInnings)),
        striker: state.currentInnings.striker ? JSON.parse(JSON.stringify(state.currentInnings.striker)) : undefined,
        nonStriker: state.currentInnings.nonStriker ? JSON.parse(JSON.stringify(state.currentInnings.nonStriker)) : undefined,
        currentBowler: state.currentInnings.currentBowler ? JSON.parse(JSON.stringify(state.currentInnings.currentBowler)) : undefined,
        timestamp: Date.now(),
      };

      // Keep only last 50 snapshots to avoid memory bloat
      state.undoStack = [...state.undoStack, snapshot].slice(-50);
    },

    /**
     * Undo last delivery
     */
    undoLastDelivery: (state) => {
      if (state.undoStack.length === 0) return;

      const snapshot = state.undoStack.pop();
      if (!snapshot) return;

      if (state.currentInnings) {
        state.currentInnings = snapshot.inningsState;
        state.currentInnings.striker = snapshot.striker;
        state.currentInnings.nonStriker = snapshot.nonStriker;
        state.currentInnings.currentBowler = snapshot.currentBowler;
      }
    },

    /**
     * Record a batting delivery (regular runs 0-7)
     */
    recordBattingBall: (state, action: PayloadAction<{ runs: number }>) => {
      const { runs } = action.payload;
      if (!state.currentInnings || runs < 0 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: runs,
          extras: 0,
          total: runs,
        },
        isWicket: false,
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update partnership stats (regular balls always count)
      updateCurrentPartnership(innings, newBall, true);

      // Update batsman stats
      innings.striker.runs += runs;
      innings.striker.balls += 1;

      if (runs === 0) innings.striker.zeros += 1;
      if (runs === 4) innings.striker.fours += 1;
      if (runs === 6) innings.striker.sixes += 1;
      innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));

      // Update bowler stats
      innings.currentBowler.runs += runs;
      innings.currentBowler.balls += 1;
      const totalBowlerBalls = innings.currentBowler.overs * 6 + innings.currentBowler.balls;
      innings.currentBowler.economy = totalBowlerBalls > 0
        ? parseFloat((innings.currentBowler.runs / (totalBowlerBalls / 6)).toFixed(2))
        : 0;

      // Update innings stats
      innings.totalRuns += runs;
      innings.totalBalls += 1;

      // Check strike rotation (odd runs)
      if (runs % 2 === 1) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Check if over completed (6 balls)
      if (innings.totalBalls % 6 === 0) {
        // Check for maiden over
        const ballsInOver = innings.ballHistory.filter(b => b.over === currentOver);
        const runsConceded = ballsInOver.reduce((acc, b) => {
          // Bowler concedes batter runs and extras (except byes/leg-byes)
          const isExtraNotConceded = b.extra?.type === 'bye' || b.extra?.type === 'leg-bye';
          const extrasConceded = isExtraNotConceded ? 0 : b.runs.extras;
          return acc + b.runs.batter + extrasConceded;
        }, 0);

        if (runsConceded === 0) {
          innings.currentBowler.maidens += 1;
        }

        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Sync batsman stats to batsmanStats array
      updateBatsmanStats(innings);
      updateBowlerStats(innings);
    },

    /**
     * Record bye runs (1+)
     * B is a legal delivery:
     * - Counts as one ball for striker and bowler
     * - Runs count ONLY to team total, NOT to striker or bowler
     */
    recordBye: (state, action: PayloadAction<{ runs: number; hasWicket?: boolean }>) => {
      const { runs, hasWicket = false } = action.payload;
      if (!state.currentInnings || runs < 1 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record for B
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // Bye doesn't count to batter
          extras: runs, // Runs count as extras
          total: runs,
        },
        isWicket: false,
        extra: {
          type: 'bye',
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update partnership stats (byes count as both runs and balls)
      updateCurrentPartnership(innings, newBall, true);

      // B is a legal delivery - counts as one ball for both
      innings.totalBalls += 1;
      if (innings.currentBowler) {
        innings.currentBowler.balls += 1;
      }

      // Striker balls faced (B is a legal delivery)
      if (innings.striker) {
        innings.striker.balls += 1;
        innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));
      }

      // Runs count ONLY to team, NOT to striker or bowler
      innings.totalRuns += runs;

      // Check strike rotation (odd runs cause rotation)
      if (runs % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Check if over completed (6 legal balls)
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        // Check for maiden over
        const ballsInOver = innings.ballHistory.filter(b => b.over === currentOver);
        const runsConceded = ballsInOver.reduce((acc, b) => {
          const isExtraNotConceded = b.extra?.type === 'bye' || b.extra?.type === 'leg-bye';
          const extrasConceded = isExtraNotConceded ? 0 : b.runs.extras;
          return acc + b.runs.batter + extrasConceded;
        }, 0);

        if (runsConceded === 0) {
          innings.currentBowler.maidens += 1;
        }

        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Sync batsman stats to batsmanStats array
      updateBatsmanStats(innings);
      updateBowlerStats(innings);
    },

    /**
     * Record leg-bye runs (1+)
     * LB is a legal delivery:
     * - Counts as one ball for striker and bowler
     * - Runs count ONLY to team total, NOT to striker or bowler
     */
    recordLegBye: (state, action: PayloadAction<{ runs: number; hasWicket?: boolean }>) => {
      const { runs, hasWicket = false } = action.payload;
      if (!state.currentInnings || runs < 1 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record for LB
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // Leg-bye doesn't count to batter
          extras: runs, // Runs count as extras
          total: runs,
        },
        isWicket: false,
        extra: {
          type: 'leg-bye',
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update partnership stats (leg-byes count as both runs and balls)
      updateCurrentPartnership(innings, newBall, true);

      // LB is a legal delivery - counts as one ball for both
      innings.totalBalls += 1;
      if (innings.currentBowler) {
        innings.currentBowler.balls += 1;
      }

      // Striker balls faced (LB is a legal delivery)
      if (innings.striker) {
        innings.striker.balls += 1;
        innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));
      }

      // Runs count ONLY to team, NOT to striker or bowler
      innings.totalRuns += runs;

      // Check strike rotation (odd runs cause rotation)
      if (runs % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Check if over completed (6 legal balls)
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        // Check for maiden over
        const ballsInOver = innings.ballHistory.filter(b => b.over === currentOver);
        const runsConceded = ballsInOver.reduce((acc, b) => {
          const isExtraNotConceded = b.extra?.type === 'bye' || b.extra?.type === 'leg-bye';
          const extrasConceded = isExtraNotConceded ? 0 : b.runs.extras;
          return acc + b.runs.batter + extrasConceded;
        }, 0);

        if (runsConceded === 0) {
          innings.currentBowler.maidens += 1;
        }

        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Sync batsman stats to batsmanStats array
      updateBatsmanStats(innings);
      updateBowlerStats(innings);
    },

    /**
     * Record wide runs (0+)
     * WD is NOT a legal delivery:
     * - Doesn't count toward 6-ball over for team (not in totalBalls)
     * - Doesn't count to striker's balls faced
     * - Runs count to team and bowler (with +1 penalty run)
     */
    recordWide: (state, action: PayloadAction<{ runs: number; hasWicket?: boolean }>) => {
      const { runs, hasWicket = false } = action.payload;
      if (!state.currentInnings || runs < 0 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Find current over number (WD doesn't increment totalBalls, so it would be same as current)
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record for WD
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // Striker doesn't get runs counted
          extras: runs + 1, // Runs + 1 penalty counted as extras
          total: runs + 1,
        },
        isWicket: false,
        extra: {
          type: 'wide',
          isWide: true,
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update partnership stats (wides count runs but NOT as a ball)
      updateCurrentPartnership(innings, newBall, false);

      // Wides DON'T count as legal balls (not part of 6-ball over)
      // Not counted for bowler or striker balls
      // But DO accumulate penalty + runs to team total and bowler
      innings.totalRuns += runs + 1; // +1 for the wide penalty

      if (innings.currentBowler) {
        innings.currentBowler.runs += runs + 1;
        innings.currentBowler.extras += 1;
      }

      // Wides don't cause strike rotation or count to batter's balls
    },

    /**
     * Record no-ball runs (0+)
     * NB is NOT a legal delivery for team/bowler, but DOES count for striker only
     * - Doesn't count toward 6-ball over for team
     * - Doesn't count to bowler's deliveries
     * - ONLY counts to striker's balls
     * - Penalty run NOT added to striker (only actual runs)
     */
    recordNoBall: (state, action: PayloadAction<{ runs: number; hasWicket?: boolean; runType: 'leg-bye' | 'bye' | 'none' }>) => {
      const { runs, hasWicket = false, runType } = action.payload;
      if (!state.currentInnings || runs < 0 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;
      const isBye = runType === 'bye';
      const isLegBye = runType === 'leg-bye';
      const batterRuns = runType === 'none' ? runs : 0;
      const extraRuns = runType === 'none' ? 1 : runs + 1;
      const totalRuns = batterRuns + extraRuns;
      const bowlerRunsConceded = runType === 'none' ? totalRuns : 1;
      const extraType: ExtraType = isBye ? 'bye' : isLegBye ? 'leg-bye' : 'no-ball';

      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: batterRuns,
          extras: extraRuns,
          total: totalRuns,
        },
        isWicket: false,
        extra: {
          type: extraType,
          isNoBall: true,
          runType,
        },
      };

      innings.ballHistory.push(newBall);
      updateCurrentPartnership(innings, newBall, true);

      innings.totalRuns += totalRuns;

      if (innings.currentBowler) {
        innings.currentBowler.runs += bowlerRunsConceded;
        innings.currentBowler.extras += 1;
      }

      if (innings.striker) {
        innings.striker.balls += 1;
        if (batterRuns > 0) {
          innings.striker.runs += batterRuns;
          if (batterRuns === 4) innings.striker.fours += 1;
          if (batterRuns === 6) innings.striker.sixes += 1;
        } else if (runType === 'none' && runs === 0) {
          innings.striker.zeros += 1;
        }
        innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));
      }

      const totalNoballRuns = runs;
      if (totalNoballRuns % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      updateBatsmanStats(innings);
      updateBowlerStats(innings);
    },

    /**
     * Record penalty runs (5P button)
     * Adds to team total, extras count, and current partnership
     */
    recordPenaltyRuns: (state, action: PayloadAction<{ runs: number }>) => {
      const { runs } = action.payload;
      if (!state.currentInnings || runs < 1 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;

      // Penalty runs add to team total, extras, and partnership
      innings.totalRuns += runs;
      innings.penaltyExtras += runs;
      
      // Add penalty runs to current partnership
      if (innings.currentPartnership) {
        innings.currentPartnership.partnershipRuns += runs;
      }
    },

    /**
     * Record quick wicket for bowled, caught, LBW, hit wicket
     * Single button press without dialog - records 0-run ball + wicket
     * 
     * Updates:
     * - Add ball to striker (0 runs, +1 ball)
     * - Add ball to bowler overs
     * - Mark striker as out
     * - Add wicket to bowler
     * - Reset partnership (next batsman will start at 0/0)
     */
    recordQuickWicket: (state, action: PayloadAction<{ dismissalMode: 'bowled' | 'caught' | 'lbw' | 'hit-wicket' }>) => {
      const { dismissalMode } = action.payload;
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Save striker ID before any potential modifications
      const strikerId = innings.striker.id;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record with 0 runs and mark as wicket
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // 0 runs for wicket
          extras: 0,
          total: 0,
        },
        isWicket: true,
        dismissal: {
          mode: dismissalMode,
          playerOut: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update striker stats - add 0-run ball
      innings.striker.balls += 1;
      innings.striker.strikeRate = innings.striker.balls > 0 
        ? parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2))
        : 0;

      // Update bowler stats - add wicket and ball
      innings.currentBowler.balls += 1;
      innings.currentBowler.wickets += 1;
      innings.currentBowler.economy = innings.currentBowler.balls > 0
        ? parseFloat((innings.currentBowler.runs / (innings.currentBowler.balls / 6)).toFixed(2))
        : 0;

      // Update innings stats
      innings.totalRuns += 0; // 0-run ball for quick wicket
      innings.totalBalls += 1;
      innings.totalWickets += 1;

      // Mark batsman as out
      innings.striker.status = 'out';
      innings.striker.dismissal = {
        mode: dismissalMode,
        description: dismissalMode,
      };
      innings.dismissedBatsmen.push({ ...innings.striker });

      // Update batsmanStats to mark batsman as out and sync stats
      const outBatsmanIndex = innings.batsmanStats.findIndex(b => b.id === strikerId);
      if (outBatsmanIndex >= 0) {
        innings.batsmanStats[outBatsmanIndex].status = 'out';
        innings.batsmanStats[outBatsmanIndex].dismissal = innings.striker.dismissal;
        innings.batsmanStats[outBatsmanIndex].runs = innings.striker.runs;
        innings.batsmanStats[outBatsmanIndex].balls = innings.striker.balls;
        innings.batsmanStats[outBatsmanIndex].fours = innings.striker.fours;
        innings.batsmanStats[outBatsmanIndex].sixes = innings.striker.sixes;
        innings.batsmanStats[outBatsmanIndex].zeros = innings.striker.zeros;
        innings.batsmanStats[outBatsmanIndex].strikeRate = innings.striker.strikeRate;
      }

      // Reset partnership when wicket falls (next batsman will start at 0/0)
      innings.currentPartnership = undefined;

      // Check if over completed (6 balls)
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Sync batsman stats to batsmanStats array (single source of truth)
      updateBatsmanStats(innings);
      updateBowlerStats(innings);

      // Auto-open batsman selection dialog for replacement, unless innings is all-out.
      if (shouldPromptForReplacement(innings)) {
        state.dialogState.activeDialog = 'batsmanSelect';
        state.dialogState.dialogData = {
          dismissalMode,
          outBatsmanId: strikerId, // Use original striker ID before any rotation
        };
      } else {
        state.dialogState = { activeDialog: null, dialogData: {} };
      }
    },

    /**
     * Record stumped wicket off a wide ball
     * Combines WD (wide) ball recording + wicket + bowler stats
     * 
     * Updates:
     * - Record as wide ball (1 run penalty added to team, not to striker, not to bowler's deliveries)
     * - Mark striker as out (stumped)
     * - Add wicket to bowler (but NOT to bowler's balls - wide doesn't count)
     * - Reset partnership (next batsman will start at 0/0)
     */
    recordStumpedWide: (state, action: PayloadAction<{ runs: number }>) => {
      const { runs } = action.payload;
      if (!state.currentInnings || runs < 0 || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Save striker ID before any potential modifications
      const strikerIdWide = innings.striker.id;

      // Find current over number (WD doesn't increment totalBalls, so it would be same as current)
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record for WD with stumped dismissal
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // Striker doesn't get runs counted
          extras: runs + 1, // Runs + 1 penalty counted as extras
          total: runs + 1,
        },
        isWicket: true,
        dismissal: {
          mode: 'stumped',
          playerOut: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
        },
        extra: {
          type: 'wide',
          isWide: true,
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Wides DON'T count as legal balls (not part of 6-ball over for team or bowler)
      // Not counted for bowler deliveries, but DO add runs and wicket
      innings.totalRuns += runs + 1; // +1 for the wide penalty

      if (innings.currentBowler) {
        innings.currentBowler.runs += runs + 1;
        innings.currentBowler.extras += 1;
        innings.currentBowler.wickets += 1;
        // NOTE: currentBowler.balls NOT incremented (WD doesn't count to bowler's deliveries)
      }

      // Update innings stats
      innings.totalWickets += 1;

      // Mark batsman as out
      innings.striker.status = 'out';
      innings.striker.dismissal = {
        mode: 'stumped',
        description: 'stumped',
      };
      innings.dismissedBatsmen.push({ ...innings.striker });

      // Update batsmanStats to mark batsman as out and sync stats
      const outBatsmanIndexWide = innings.batsmanStats.findIndex(b => b.id === strikerIdWide);
      if (outBatsmanIndexWide >= 0) {
        innings.batsmanStats[outBatsmanIndexWide].status = 'out';
        innings.batsmanStats[outBatsmanIndexWide].dismissal = innings.striker.dismissal;
        innings.batsmanStats[outBatsmanIndexWide].runs = innings.striker.runs;
        innings.batsmanStats[outBatsmanIndexWide].balls = innings.striker.balls;
        innings.batsmanStats[outBatsmanIndexWide].fours = innings.striker.fours;
        innings.batsmanStats[outBatsmanIndexWide].sixes = innings.striker.sixes;
        innings.batsmanStats[outBatsmanIndexWide].zeros = innings.striker.zeros;
        innings.batsmanStats[outBatsmanIndexWide].strikeRate = innings.striker.strikeRate;
      }

      // Reset partnership when wicket falls (next batsman will start at 0/0)
      innings.currentPartnership = undefined;

      // Wides don't cause strike rotation or count to batter's balls or overs

      // Auto-open batsman selection dialog for replacement, unless innings is all-out.
      if (shouldPromptForReplacement(innings)) {
        state.dialogState.activeDialog = 'batsmanSelect';
        state.dialogState.dialogData = {
          dismissalMode: 'stumped',
          outBatsmanId: strikerIdWide, // Striker is out - needs replacement
        };
      } else {
        state.dialogState = { activeDialog: null, dialogData: {} };
      }
    },

    /**
     * Record stumped wicket off a regular (non-wide) ball
     * Similar to recordQuickWicket but for stumped dismissals
     * 
     * Updates:
     * - Record as 0-run ball
     * - Mark striker as out (stumped)
     * - Add wicket to bowler stats
     * - Reset partnership (next batsman will start at 0/0)
     */
    recordStumpedRegular: (state) => {
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Save striker ID before any potential modifications
      const strikerId = innings.striker.id;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Create ball record with 0 runs and mark as wicket
      const newBall: Ball = {
        id: `ball_${Date.now()}_${Math.random()}`,
        over: currentOver,
        ball: ballInOver,
        timestamp: Date.now(),
        bowler: {
          id: innings.currentBowler.id,
          name: innings.currentBowler.name,
        },
        batter: {
          id: innings.striker.id,
          name: innings.striker.name,
        },
        nonStriker: {
          id: innings.nonStriker?.id || '',
          name: innings.nonStriker?.name || '',
        },
        runs: {
          batter: 0, // 0 runs for wicket
          extras: 0,
          total: 0,
        },
        isWicket: true,
        dismissal: {
          mode: 'stumped',
          playerOut: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
        },
      };

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update striker stats - add 0-run ball
      innings.striker.balls += 1;
      innings.striker.strikeRate = innings.striker.balls > 0 
        ? parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2))
        : 0;

      // Update bowler stats - add wicket and ball
      innings.currentBowler.balls += 1;
      innings.currentBowler.wickets += 1;
      innings.currentBowler.economy = innings.currentBowler.balls > 0
        ? parseFloat((innings.currentBowler.runs / (innings.currentBowler.balls / 6)).toFixed(2))
        : 0;

      // Update innings stats
      innings.totalRuns += 0; // 0-run ball for stumped regular
      innings.totalBalls += 1;
      innings.totalWickets += 1;

      // Mark batsman as out
      innings.striker.status = 'out';
      innings.striker.dismissal = {
        mode: 'stumped',
        description: 'stumped',
      };
      innings.dismissedBatsmen.push({ ...innings.striker });

      // Update batsmanStats to mark batsman as out and sync stats
      const outBatsmanIndexStumped = innings.batsmanStats.findIndex(b => b.id === strikerId);
      if (outBatsmanIndexStumped >= 0) {
        innings.batsmanStats[outBatsmanIndexStumped].status = 'out';
        innings.batsmanStats[outBatsmanIndexStumped].dismissal = innings.striker.dismissal;
        innings.batsmanStats[outBatsmanIndexStumped].runs = innings.striker.runs;
        innings.batsmanStats[outBatsmanIndexStumped].balls = innings.striker.balls;
        innings.batsmanStats[outBatsmanIndexStumped].fours = innings.striker.fours;
        innings.batsmanStats[outBatsmanIndexStumped].sixes = innings.striker.sixes;
        innings.batsmanStats[outBatsmanIndexStumped].zeros = innings.striker.zeros;
        innings.batsmanStats[outBatsmanIndexStumped].strikeRate = innings.striker.strikeRate;
      }

      // Reset partnership when wicket falls (next batsman will start at 0/0)
      innings.currentPartnership = undefined;

      // Check if over completed (6 balls)
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Auto-open batsman selection dialog for replacement, unless innings is all-out.
      if (shouldPromptForReplacement(innings)) {
        state.dialogState.activeDialog = 'batsmanSelect';
        state.dialogState.dialogData = {
          dismissalMode: 'stumped',
          outBatsmanId: strikerId, // Use original striker ID before any rotation
        };
      } else {
        state.dialogState = { activeDialog: null, dialogData: {} };
      }
    },

    /**
     * Record run-out, handling the ball, or obstructing the field
     * Combines ball recording (WD/B/LB/NB/regular) + run-out dismissal
     * 
     * Key difference from wickets: NO wicket is added to bowler
     * 
     * Updates:
     * - Records ball based on ballType (wide, bye, leg-bye, no-ball, or regular)
     * - Marks chosen batsman as out (NOT to bowler's wicket count)
     * - Adds to innings.totalWickets only
     * - Reset partnership (next batsman will start at 0/0)
     * 
     * Parameters:
     * - dismissalMode: 'run-out' | 'handled-ball' | 'obstructing-field'
     * - ballType: 'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular'
     * - runs: actual runs (0-7)
     * - batsmanIdToMarkOut: ID of batsman being marked out (striker or non-striker)
     */
    recordRunOutBall: (state, action: PayloadAction<{ dismissalMode: 'run-out' | 'handled-ball' | 'obstructing-field'; ballType: 'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular'; runs: number; batsmanIdToMarkOut: string }>) => {
      const { dismissalMode, ballType, runs, batsmanIdToMarkOut } = action.payload;
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Find current over number BEFORE incrementing totalBalls
      const currentOver = Math.floor(innings.totalBalls / 6);
      const ballInOver = innings.totalBalls % 6;

      // Find which batsman to mark out and get their reference
      let batsmanToMarkOut = null;
      if (innings.striker?.id === batsmanIdToMarkOut) {
        batsmanToMarkOut = innings.striker;
      } else if (innings.nonStriker?.id === batsmanIdToMarkOut) {
        batsmanToMarkOut = innings.nonStriker;
      } else {
        return; // Batsman not found
      }

      let newBall: Ball;
      let extraType: ExtraType | undefined;
      let totalRunsToAdd = runs;
      let bowlerRunsToAdd = runs;

      // Determine ball specifics based on ballType
      if (ballType === 'wide') {
        extraType = 'wide';
        totalRunsToAdd = runs + 1; // +1 penalty
        bowlerRunsToAdd = runs + 1;
        
        newBall = {
          id: `ball_${Date.now()}_${Math.random()}`,
          over: currentOver,
          ball: ballInOver,
          timestamp: Date.now(),
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
          batter: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          nonStriker: {
            id: innings.nonStriker?.id || '',
            name: innings.nonStriker?.name || '',
          },
          runs: {
            batter: 0,
            extras: runs + 1,
            total: runs + 1,
          },
          isWicket: true,
          dismissal: {
            mode: dismissalMode,
            playerOut: {
              id: batsmanToMarkOut.id,
              name: batsmanToMarkOut.name,
            },
            bowler: {
              id: innings.currentBowler.id,
              name: innings.currentBowler.name,
            },
          },
          extra: {
            type: 'wide',
            isWide: true,
          },
        };

        // WD doesn't count as legal ball for team or bowler
        innings.totalRuns += totalRunsToAdd;
        if (innings.currentBowler) {
          innings.currentBowler.runs += bowlerRunsToAdd;
          innings.currentBowler.extras += 1;
          // NO bowler.balls increment for wide
        }
      } else if (ballType === 'bye') {
        extraType = 'bye';
        // Bye is legal delivery, runs count only to team
        totalRunsToAdd = runs;
        bowlerRunsToAdd = 0;

        newBall = {
          id: `ball_${Date.now()}_${Math.random()}`,
          over: currentOver,
          ball: ballInOver,
          timestamp: Date.now(),
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
          batter: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          nonStriker: {
            id: innings.nonStriker?.id || '',
            name: innings.nonStriker?.name || '',
          },
          runs: {
            batter: 0,
            extras: runs,
            total: runs,
          },
          isWicket: true,
          dismissal: {
            mode: dismissalMode,
            playerOut: {
              id: batsmanToMarkOut.id,
              name: batsmanToMarkOut.name,
            },
            bowler: {
              id: innings.currentBowler.id,
              name: innings.currentBowler.name,
            },
          },
          extra: {
            type: 'bye',
          },
        };

        // B is legal delivery - counts for striker and bowler
        innings.totalRuns += runs;
        if (innings.currentBowler) {
          innings.currentBowler.balls += 1;
        }
        if (innings.striker) {
          innings.striker.balls += 1;
        }
      } else if (ballType === 'leg-bye') {
        extraType = 'leg-bye';
        // LB is legal delivery, runs count only to team
        totalRunsToAdd = runs;
        bowlerRunsToAdd = 0;

        newBall = {
          id: `ball_${Date.now()}_${Math.random()}`,
          over: currentOver,
          ball: ballInOver,
          timestamp: Date.now(),
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
          batter: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          nonStriker: {
            id: innings.nonStriker?.id || '',
            name: innings.nonStriker?.name || '',
          },
          runs: {
            batter: 0,
            extras: runs,
            total: runs,
          },
          isWicket: true,
          dismissal: {
            mode: dismissalMode,
            playerOut: {
              id: batsmanToMarkOut.id,
              name: batsmanToMarkOut.name,
            },
            bowler: {
              id: innings.currentBowler.id,
              name: innings.currentBowler.name,
            },
          },
          extra: {
            type: 'leg-bye',
          },
        };

        // LB is legal delivery - counts for striker and bowler
        innings.totalRuns += runs;
        if (innings.currentBowler) {
          innings.currentBowler.balls += 1;
        }
        if (innings.striker) {
          innings.striker.balls += 1;
        }
      } else if (ballType === 'no-ball') {
        extraType = 'no-ball';
        // NB is legal for striker only, runs + penalty
        totalRunsToAdd = runs + 1;
        bowlerRunsToAdd = runs + 1;

        newBall = {
          id: `ball_${Date.now()}_${Math.random()}`,
          over: currentOver,
          ball: ballInOver,
          timestamp: Date.now(),
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
          batter: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          nonStriker: {
            id: innings.nonStriker?.id || '',
            name: innings.nonStriker?.name || '',
          },
          runs: {
            batter: runs,
            extras: runs + 1,
            total: runs + 1,
          },
          isWicket: true,
          dismissal: {
            mode: dismissalMode,
            playerOut: {
              id: batsmanToMarkOut.id,
              name: batsmanToMarkOut.name,
            },
            bowler: {
              id: innings.currentBowler.id,
              name: innings.currentBowler.name,
            },
          },
          extra: {
            type: 'no-ball',
            isNoBall: true,
          },
        };

        // NB is legal for striker only
        innings.totalRuns += runs + 1;
        if (innings.striker) {
          innings.striker.balls += 1;
          if (runs > 0) {
            innings.striker.runs += runs;
            if (runs === 4) innings.striker.fours += 1;
            if (runs === 6) innings.striker.sixes += 1;
          }
        }
        if (innings.currentBowler) {
          innings.currentBowler.runs += runs + 1;
          innings.currentBowler.extras += 1;
          // NO bowler.balls for no-ball
        }
      } else {
        // Regular delivery - completed runs count to the batting side
        totalRunsToAdd = runs;
        bowlerRunsToAdd = runs;

        newBall = {
          id: `ball_${Date.now()}_${Math.random()}`,
          over: currentOver,
          ball: ballInOver,
          timestamp: Date.now(),
          bowler: {
            id: innings.currentBowler.id,
            name: innings.currentBowler.name,
          },
          batter: {
            id: innings.striker.id,
            name: innings.striker.name,
          },
          nonStriker: {
            id: innings.nonStriker?.id || '',
            name: innings.nonStriker?.name || '',
          },
          runs: {
            batter: runs,
            extras: 0,
            total: runs,
          },
          isWicket: true,
          dismissal: {
            mode: dismissalMode,
            playerOut: {
              id: batsmanToMarkOut.id,
              name: batsmanToMarkOut.name,
            },
            bowler: {
              id: innings.currentBowler.id,
              name: innings.currentBowler.name,
            },
          },
        };

        innings.totalRuns += totalRunsToAdd;

        // Regular delivery - legal ball (counts to striker and bowler)
        if (innings.striker) {
          innings.striker.balls += 1;
          if (runs > 0) {
            innings.striker.runs += runs;
            if (runs === 4) innings.striker.fours += 1;
            if (runs === 6) innings.striker.sixes += 1;
          }
        }
        if (innings.currentBowler) {
          innings.currentBowler.runs += bowlerRunsToAdd;
          innings.currentBowler.balls += 1;
        }
      }

      // Add to ball history
      innings.ballHistory.push(newBall);

      // Update innings stats - add wicket to team (NOT to bowler)
      innings.totalWickets += 1;

      // Mark batsman as out (but DON'T add to bowler.wickets)
      batsmanToMarkOut.status = 'out';
      batsmanToMarkOut.dismissal = {
        mode: dismissalMode,
        description: dismissalMode,
      };
      innings.dismissedBatsmen.push({ ...batsmanToMarkOut });

      // Update batsmanStats to mark batsman as out and sync stats
      const outBatsmanIndexRunOut = innings.batsmanStats.findIndex(b => b.id === batsmanIdToMarkOut);
      if (outBatsmanIndexRunOut >= 0) {
        innings.batsmanStats[outBatsmanIndexRunOut].status = 'out';
        innings.batsmanStats[outBatsmanIndexRunOut].dismissal = batsmanToMarkOut.dismissal;
        // Only sync runs/balls if striker is the one dismissed
        // Non-striker run-outs don't count the ball to the non-striker
        if (innings.striker?.id === batsmanIdToMarkOut) {
          innings.batsmanStats[outBatsmanIndexRunOut].runs = batsmanToMarkOut.runs;
          innings.batsmanStats[outBatsmanIndexRunOut].balls = batsmanToMarkOut.balls;
          innings.batsmanStats[outBatsmanIndexRunOut].fours = batsmanToMarkOut.fours;
          innings.batsmanStats[outBatsmanIndexRunOut].sixes = batsmanToMarkOut.sixes;
          innings.batsmanStats[outBatsmanIndexRunOut].zeros = batsmanToMarkOut.zeros;
          innings.batsmanStats[outBatsmanIndexRunOut].strikeRate = batsmanToMarkOut.strikeRate || 0;
        }
      }

      // Reset partnership when wicket falls (next batsman will start at 0/0)
      innings.currentPartnership = undefined;

      // Update bowler economy if we adjusted balls/runs
      if (innings.currentBowler) {
        const totalBowlerBalls = innings.currentBowler.overs * 6 + innings.currentBowler.balls;
        innings.currentBowler.economy = totalBowlerBalls > 0
          ? parseFloat((innings.currentBowler.runs / (totalBowlerBalls / 6)).toFixed(2))
          : 0;
      }

      // For legal deliveries (B, LB, regular), update total balls and check for over completion
      if (ballType === 'bye' || ballType === 'leg-bye' || ballType === 'regular') {
        innings.totalBalls += 1;

        // Check strike rotation (odd runs) - but only if striker is not dismissed
        if (innings.striker?.id !== batsmanIdToMarkOut && runs % 2 === 1) {
          const temp = innings.striker;
          innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
          innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
        }

        // Check if over completed (6 balls)
        if (innings.totalBalls % 6 === 0) {
          // Check for maiden over
          const ballsInOver = innings.ballHistory.filter(b => b.over === currentOver);
          const runsConceded = ballsInOver.reduce((acc, b) => {
            const isExtraNotConceded = b.extra?.type === 'bye' || b.extra?.type === 'leg-bye';
            const extrasConceded = isExtraNotConceded ? 0 : b.runs.extras;
            return acc + b.runs.batter + extrasConceded;
          }, 0);

          if (runsConceded === 0 && innings.currentBowler) {
            innings.currentBowler.maidens += 1;
          }

          innings.currentBowler.overs += 1;
          innings.currentBowler.balls = 0;

          // Always rotate strike at end of over (but only if striker not just dismissed)
          if (innings.striker?.id !== batsmanIdToMarkOut) {
            const temp = innings.striker;
            innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
            innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
          }
        }
      }

      // Sync batsman stats to batsmanStats array (single source of truth)
      updateBatsmanStats(innings);
      updateBowlerStats(innings);

      // Partnership resets when new batsman comes in (they will have 0 runs/0 balls)

      // Auto-open batsman selection dialog for replacement, unless innings is all-out.
      if (shouldPromptForReplacement(innings)) {
        state.dialogState.activeDialog = 'batsmanSelect';
        state.dialogState.dialogData = {
          dismissalMode,
          outBatsmanId: batsmanIdToMarkOut, // The selected batsman who was marked out
        };
      } else {
        state.dialogState = { activeDialog: null, dialogData: {} };
      }
    },

    /**
     * Record retired out dismissal
     * Similar to a wicket but:
     * - Don't update batsman balls or runs
     * - Don't add wicket to bowler
     * - But DO mark as out and update team wickets
     * 
     * Updates:
     * - Mark striker as out
     * - Add to dismissed batsmen
     * - Update team wickets only
     * - Reset partnership
     */
    recordRetiredOut: (state) => {
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker) return;

      // Save striker ID before any potential modifications
      const strikerId = innings.striker.id;

      // Mark batsman as out
      innings.striker.status = 'out';
      innings.striker.dismissal = {
        mode: 'retired-out',
        description: 'retired out',
      };
      innings.dismissedBatsmen.push({ ...innings.striker });

      // Update batsmanStats to mark batsman as out and sync stats
      const outBatsmanIndexRetired = innings.batsmanStats.findIndex(b => b.id === strikerId);
      if (outBatsmanIndexRetired >= 0) {
        innings.batsmanStats[outBatsmanIndexRetired].status = 'out';
        innings.batsmanStats[outBatsmanIndexRetired].dismissal = innings.striker.dismissal;
        innings.batsmanStats[outBatsmanIndexRetired].runs = innings.striker.runs;
        innings.batsmanStats[outBatsmanIndexRetired].balls = innings.striker.balls;
        innings.batsmanStats[outBatsmanIndexRetired].fours = innings.striker.fours;
        innings.batsmanStats[outBatsmanIndexRetired].sixes = innings.striker.sixes;
        innings.batsmanStats[outBatsmanIndexRetired].zeros = innings.striker.zeros;
        innings.batsmanStats[outBatsmanIndexRetired].strikeRate = innings.striker.strikeRate;
      }

      // Reset partnership when wicket falls (next batsman will start at 0/0)
      innings.currentPartnership = undefined;

      // Update only team wickets (NOT balls or runs or bowler stats)
      innings.totalWickets += 1;

      // Check if over completed (6 balls) - for strike rotation only
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Auto-open batsman selection dialog for replacement, unless innings is all-out.
      if (shouldPromptForReplacement(innings)) {
        state.dialogState.activeDialog = 'batsmanSelect';
        state.dialogState.dialogData = {
          dismissalMode: 'retired-out',
          outBatsmanId: strikerId, // Striker is out - needs replacement
        };
      } else {
        state.dialogState = { activeDialog: null, dialogData: {} };
      }
    },

    /**
     * Record retired hurt dismissal
     * Special case:
     * - Don't mark as out
     * - Don't update wickets, runs, or balls
     * - Just reset partnership and replace batsman
     * 
     * This is technically not a wicket, just a batsman substitution
     */
    recordRetiredHurt: (state) => {
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;
      if (!innings.striker) return;

      // Don't mark as out and don't update any stats
      // The batsman is simply being replaced due to injury
      
      // Check if over completed (6 balls) - for strike rotation only
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Always rotate strike at end of every over
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Auto-open batsman selection dialog for replacement
      // No outBatsmanId since this is NOT an out - just a substitution
      state.dialogState.activeDialog = 'batsmanSelect';
      state.dialogState.dialogData = {
        dismissalMode: 'retired-hurt',
        // No outBatsmanId - batsman is not out, just retiring
      };
    },

    /**
     * Record wicket with dismissal mode
     */
    recordWicket: (state, action: PayloadAction<{ dismissalMode: DismissalMode; batsmanId: string }>) => {
      const { dismissalMode, batsmanId } = action.payload;
      if (!state.currentInnings || !canRecordScoringEvent(state)) return;

      const innings = state.currentInnings;

      // Mark batsman as out
      if (innings.striker?.id === batsmanId) {
        innings.striker.status = 'out';
        innings.striker.dismissal = {
          mode: dismissalMode,
          description: dismissalMode,
        };
        innings.dismissedBatsmen.push({ ...innings.striker });
        innings.totalWickets += 1;
        
        // Update batsmanStats to mark batsman as out and sync stats
        const outBatsmanIndexWicket = innings.batsmanStats.findIndex(b => b.id === batsmanId);
        if (outBatsmanIndexWicket >= 0) {
          innings.batsmanStats[outBatsmanIndexWicket].status = 'out';
          innings.batsmanStats[outBatsmanIndexWicket].dismissal = innings.striker.dismissal;
          innings.batsmanStats[outBatsmanIndexWicket].runs = innings.striker.runs;
          innings.batsmanStats[outBatsmanIndexWicket].balls = innings.striker.balls;
          innings.batsmanStats[outBatsmanIndexWicket].fours = innings.striker.fours;
          innings.batsmanStats[outBatsmanIndexWicket].sixes = innings.striker.sixes;
          innings.batsmanStats[outBatsmanIndexWicket].zeros = innings.striker.zeros;
          innings.batsmanStats[outBatsmanIndexWicket].strikeRate = innings.striker.strikeRate;
        }

        // Reset partnership when wicket falls (next batsman will start at 0/0)
        innings.currentPartnership = undefined;
      } else if (innings.nonStriker?.id === batsmanId) {
        innings.nonStriker.status = 'out';
        innings.nonStriker.dismissal = {
          mode: dismissalMode,
          description: dismissalMode,
        };
        innings.dismissedBatsmen.push({ ...innings.nonStriker });
        innings.totalWickets += 1;
        
        // Update batsmanStats to mark batsman as out and sync stats
        const outBatsmanIndexWicketNS = innings.batsmanStats.findIndex(b => b.id === batsmanId);
        if (outBatsmanIndexWicketNS >= 0) {
          innings.batsmanStats[outBatsmanIndexWicketNS].status = 'out';
          innings.batsmanStats[outBatsmanIndexWicketNS].dismissal = innings.nonStriker.dismissal;
          innings.batsmanStats[outBatsmanIndexWicketNS].runs = innings.nonStriker.runs;
          innings.batsmanStats[outBatsmanIndexWicketNS].balls = innings.nonStriker.balls;
          innings.batsmanStats[outBatsmanIndexWicketNS].fours = innings.nonStriker.fours;
          innings.batsmanStats[outBatsmanIndexWicketNS].sixes = innings.nonStriker.sixes;
          innings.batsmanStats[outBatsmanIndexWicketNS].zeros = innings.nonStriker.zeros;
          innings.batsmanStats[outBatsmanIndexWicketNS].strikeRate = innings.nonStriker.strikeRate;
        }

        // Reset partnership when wicket falls (next batsman will start at 0/0)
        innings.currentPartnership = undefined;
      }
    },

    /**
     * Replace dismissed batsman with new batsman
     */
    replaceBatsman: (state, action: PayloadAction<{ outBatsmanId: string; newBatsman: TeamPlayer; isStriker: boolean; isChangeBatsman?: boolean }>) => {
      const { outBatsmanId, newBatsman, isStriker, isChangeBatsman = false } = action.payload;
      if (!state.currentInnings) return;

      const innings = state.currentInnings;
      const outBatsmanIndex = innings.batsmanStats.findIndex(b => b.id === outBatsmanId);
      const outBatsman = outBatsmanIndex >= 0 ? innings.batsmanStats[outBatsmanIndex] : undefined;

      const isRetiredHurtReturning = innings.batsmanStats.findIndex(b => b.id === newBatsman.id) >= 0 && 
        innings.batsmanStats[innings.batsmanStats.findIndex(b => b.id === newBatsman.id)].dismissal?.mode === 'retired-hurt';

      let newBatsmanObj: CurrentBatsman;

      if (isRetiredHurtReturning) {
        const existingBatsmanIndex = innings.batsmanStats.findIndex(b => b.id === newBatsman.id);
        const existingBatsman = innings.batsmanStats[existingBatsmanIndex];
        newBatsmanObj = {
          ...existingBatsman,
          role: isStriker ? 'striker' : 'non-striker',
          status: 'batting',
          dismissal: undefined,
        };
        innings.batsmanStats[existingBatsmanIndex] = newBatsmanObj;
      } else {
        const maxOrder = Math.max(...innings.batsmanStats.map(b => b.batsmanOrder || 0), 0);
        let nextBatsmanOrder = Math.min(maxOrder + 1, 11);

        if (isChangeBatsman && outBatsman && outBatsman.batsmanOrder) {
          nextBatsmanOrder = outBatsman.batsmanOrder;
        }

        newBatsmanObj = {
          id: newBatsman.id,
          name: newBatsman.name,
          jerseyNumber: newBatsman.jerseyNumber,
          role: isStriker ? 'striker' : 'non-striker',
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
          zeros: 0,
          status: 'batting',
          strikeRate: 0,
          batsmanOrder: nextBatsmanOrder,
        };

        if (isChangeBatsman && outBatsman && outBatsman.balls === 0 && outBatsman.runs === 0) {
          if (outBatsmanIndex >= 0) {
            innings.batsmanStats.splice(outBatsmanIndex, 1);
          }
          replaceBatsmanInPartnership(innings, outBatsmanId, newBatsman);
        } else {
          if (outBatsmanIndex >= 0) {
            innings.batsmanStats[outBatsmanIndex].status = 'out';
          }
        }

        innings.batsmanStats.push(newBatsmanObj);
      }

      if (isStriker) {
        innings.striker = newBatsmanObj;
      } else {
        innings.nonStriker = newBatsmanObj;
      }
    },

    /**
     * Replace striker for retired hurt (special case - NOT a wicket)
     * Marks the retired hurt batsman with dismissal mode but NOT as "out"
     * Allows them to bat again later if needed
     */
    replaceStrikerForRetiredHurt: (state, action: PayloadAction<{ retiredHurtBatsmanId: string; newBatsman: TeamPlayer }>) => {
      const { retiredHurtBatsmanId, newBatsman } = action.payload;
      if (!state.currentInnings) return;

      const innings = state.currentInnings;

      // Mark retired hurt batsman with dismissal status but NOT "out"
      const retiredIndex = innings.batsmanStats.findIndex(b => b.id === retiredHurtBatsmanId);
      if (retiredIndex >= 0) {
        innings.batsmanStats[retiredIndex].dismissal = {
          mode: 'retired-hurt',
          description: 'retired hurt',
        };
        // Keep status as 'batting' - NOT marked as 'out'
        // This allows them to bat again later if another wicket occurs
      }

      // Calculate next batsman order (find max order + 1, cap at 11)
      const maxOrder = Math.max(...innings.batsmanStats.map(b => b.batsmanOrder || 0), 0);
      const nextBatsmanOrder = Math.min(maxOrder + 1, 11);

      const newBatsmanObj: CurrentBatsman = {
        id: newBatsman.id,
        name: newBatsman.name,
        jerseyNumber: newBatsman.jerseyNumber,
        role: 'striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        zeros: 0,
        status: 'batting',
        strikeRate: 0,
        batsmanOrder: nextBatsmanOrder,
      };

      // Add new batsman to batsmanStats
      innings.batsmanStats.push(newBatsmanObj);

      // Replace striker
      innings.striker = newBatsmanObj;
    },

    /**
     * Swap striker and non-striker positions
     */
    swapBatsmen: (state) => {
      if (!state.currentInnings) return;
      const innings = state.currentInnings;
      const temp = innings.striker;
      innings.striker = innings.nonStriker ? { ...innings.nonStriker, role: 'striker' } : undefined;
      innings.nonStriker = temp ? { ...temp, role: 'non-striker' } : undefined;

      // Sync batsman stats to batsmanStats array
      updateBatsmanStats(innings);
      updateBowlerStats(innings);
    },

    /**
     * Set initial batters and bowler at start of innings
     */
    setInitialBattersAndBowler: (state, action: PayloadAction<{ striker: TeamPlayer; nonStriker: TeamPlayer; bowler?: TeamPlayer }>) => {
      if (!state.currentInnings || !state.liveMatch) return;
      
      const { striker: strikerPlayer, nonStriker: nonStrikerPlayer, bowler: bowlerPlayer } = action.payload;
      const innings = state.currentInnings;

      // Defensive check: ensure we're not receiving the same player twice
      if (strikerPlayer.id === nonStrikerPlayer.id) {
        console.error('ERROR: Same player selected for both striker and non-striker!', strikerPlayer);
        return;
      }

      // Set striker (Batsman Order 1)
      innings.striker = {
        id: strikerPlayer.id,
        name: strikerPlayer.name,
        jerseyNumber: strikerPlayer.jerseyNumber,
        role: 'striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        zeros: 0,
        status: 'batting',
        strikeRate: 0,
        batsmanOrder: 1,
      };

      // Set non-striker (Batsman Order 2)
      innings.nonStriker = {
        id: nonStrikerPlayer.id,
        name: nonStrikerPlayer.name,
        jerseyNumber: nonStrikerPlayer.jerseyNumber,
        role: 'non-striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        zeros: 0,
        status: 'batting',
        strikeRate: 0,
        batsmanOrder: 2,
      };

      // Add both batsmen to batsmanStats array
      innings.batsmanStats = [
        { ...innings.striker },
        { ...innings.nonStriker },
      ];

      // Verify objects are distinct
      if (innings.striker.id === innings.nonStriker.id) {
        console.error('ERROR: Striker and non-striker have same ID after initialization!');
        return;
      }

      // Set bowler (default to first player if not provided)
      const bowler = bowlerPlayer || state.liveMatch.teamPlayers[0];
      if (bowler) {
        innings.currentBowler = {
          id: bowler.id,
          name: bowler.name,
          jerseyNumber: bowler.jerseyNumber,
          runs: 0,
          wickets: 0,
          balls: 0,
          overs: 0,
          maidens: 0,
          economy: 0,
          extras: 0,
        };
      }
    },

    /**
     * Open dialog
     */
    openDialog: (state, action: PayloadAction<{ dialog: DialogState['activeDialog']; data?: DialogState['dialogData'] }>) => {
      state.dialogState.activeDialog = action.payload.dialog;
      state.dialogState.dialogData = action.payload.data || {};
    },

    /**
     * Close dialog
     */
    closeDialog: (state) => {
      state.dialogState.activeDialog = null;
      state.dialogState.dialogData = {};
    },

    /**
     * Update dialog data
     */
    updateDialogData: (state, action: PayloadAction<Partial<DialogState['dialogData']>>) => {
      state.dialogState.dialogData = { ...state.dialogState.dialogData, ...action.payload };
    },

    /**
     * Set error message
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Clear match and reset to initial state
     */
    clearMatch: (state) => {
      if (state.liveMatch) {
        // If match is still in progress, mark it as abandoned/manually completed before saving to history
        if (state.liveMatch.status === 'in-progress') {
          const matchToSave = mergeInningsIntoMatch(state.liveMatch, state.currentInnings);
          matchToSave.status = 'complete';
          matchToSave.result = 'abandoned';
          matchToSave.winMargin = 'Match manually completed';
          matchToSave.completedAt = matchToSave.completedAt || new Date().toISOString();
          state.lastCompletedMatch = matchToSave;
        } else {
          // If already complete, just ensure it's in the lastCompletedMatch slot
          state.lastCompletedMatch = mergeInningsIntoMatch(state.liveMatch, state.currentInnings);
        }
      }
      state.liveMatch = null;
      state.currentInnings = null;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
      state.error = null;
    },

    /**
     * Complete an over: swap batsmen and prepare for next over
     */
    completeOver: (state, action: PayloadAction<{ bowlerId: string; bowlerName: string; isBatsmanSwapped: boolean }>) => {
      if (!state.currentInnings || !state.liveMatch || state.liveMatch.status !== 'in-progress') return;
      
      const { bowlerId, bowlerName } = action.payload;
      
      // Set new bowler — restore existing accumulated stats if bowler already bowled
      if (bowlerName && state.currentInnings) {
        const existingStats = state.currentInnings.bowlerStats.find(b => b.id === bowlerId);
        state.currentInnings.currentBowler = existingStats
          ? { ...existingStats }
          : {
              id: bowlerId,
              name: bowlerName,
              overs: 0,
              balls: 0,
              runs: 0,
              wickets: 0,
              maidens: 0,
              economy: 0,
              extras: 0,
            };
      }

      // Reset undo stack at the end of over - UNDO only works within an over
      state.undoStack = [];

      state.liveMatch.updatedAt = new Date().toISOString();
    },

    /**
     * Start second innings from saved first-innings state.
     */
    startSecondInnings: (state) => {
      if (!state.liveMatch || !state.currentInnings || state.liveMatch.status !== 'in-progress') return;

      const match = state.liveMatch;
      const firstInnings = state.currentInnings;
      if (match.currentInnings !== 1) return;
      if (!isInningsLimitReached(firstInnings, match.totalOvers)) return;

      // Keep liveMatch innings array synchronized with currentInnings before switching.
      match.innings[0] = firstInnings;

      const secondInningsBattingTeam = getSecondInningsBattingTeam(match.tossWonBy, match.tossDecision);
      const secondInnings = createEmptyInnings(2, match.teamPlayers);
      secondInnings.battingTeam = secondInningsBattingTeam;
      secondInnings.target = firstInnings.totalRuns + 1;

      if (match.innings.length > 1) {
        match.innings[1] = secondInnings;
      } else {
        match.innings.push(secondInnings);
      }

      match.currentInnings = 2;
      match.updatedAt = new Date().toISOString();
      state.currentInnings = secondInnings;
      state.undoStack = [];
      state.dialogState = { activeDialog: 'initialBatters', dialogData: {} };
    },

    /**
     * Mark match as complete after first innings (manual completion).
     */
    completeMatchAfterFirstInnings: (state) => {
      if (!state.liveMatch || !state.currentInnings || state.liveMatch.status !== 'in-progress') return;

      const match = state.liveMatch;
      const firstInnings = state.currentInnings;
      if (match.currentInnings !== 1) return;
      if (!isInningsLimitReached(firstInnings, match.totalOvers)) return;

      match.innings[0] = firstInnings;
      match.result = 'no_result';
      match.winMargin = 'Match completed after 1st innings';
      match.status = 'complete';
      match.completedAt = match.completedAt || new Date().toISOString();
      match.updatedAt = new Date().toISOString();
      const finalMatch = mergeInningsIntoMatch(match, state.currentInnings);
      state.liveMatch = finalMatch;
      state.lastCompletedMatch = finalMatch;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
    },

    /**
     * End second innings and mark the result when innings limit is reached.
     */
    finishCurrentInnings: (state) => {
      if (!state.liveMatch || !state.currentInnings || state.liveMatch.status !== 'in-progress') return;

      const match = state.liveMatch;
      const innings = state.currentInnings;
      if (match.currentInnings !== 2) return;
      if (!isInningsLimitReached(innings, match.totalOvers)) return;

      const firstInnings = match.innings[0];
      if (!firstInnings) return;

      const chaseTarget = firstInnings.totalRuns + 1;
      const secondInningsRuns = innings.totalRuns;

      if (secondInningsRuns >= chaseTarget) {
        const winner = innings.battingTeam;
        const wicketsRemaining = Math.max(0, 10 - innings.totalWickets);
        match.result = winner === 'Us' ? 'won' : 'lost';
        match.winMargin = `${winner === 'Us' ? 'JMCC' : match.opponent} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      } else if (secondInningsRuns === firstInnings.totalRuns) {
        match.result = 'tie';
        match.winMargin = 'Match tied';
      } else {
        const winner = firstInnings.battingTeam;
        const runMargin = firstInnings.totalRuns - secondInningsRuns;
        match.result = winner === 'Us' ? 'won' : 'lost';
        match.winMargin = `${winner === 'Us' ? 'JMCC' : match.opponent} won by ${runMargin} run${runMargin === 1 ? '' : 's'}`;
      }

      match.status = 'complete';
      match.completedAt = match.completedAt || new Date().toISOString();
      match.updatedAt = new Date().toISOString();
      const finalMatch = mergeInningsIntoMatch(match, state.currentInnings);
      state.liveMatch = finalMatch;
      state.lastCompletedMatch = finalMatch;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
    },

    /**
     * Complete match immediately when chase target is reached.
     */
    completeMatchOnTargetReached: (state) => {
      if (!state.liveMatch || !state.currentInnings || state.liveMatch.status !== 'in-progress') return;
      if (state.liveMatch.currentInnings !== 2) return;

      const match = state.liveMatch;
      const secondInnings = state.currentInnings;
      const firstInnings = match.innings[0];
      if (!firstInnings) return;

      const chaseTarget = firstInnings.totalRuns + 1;
      if (secondInnings.totalRuns < chaseTarget) return;

      const wicketsRemaining = Math.max(0, 10 - secondInnings.totalWickets);
      const winner = secondInnings.battingTeam;

      match.result = winner === 'Us' ? 'won' : 'lost';
      match.winMargin = `${winner === 'Us' ? 'JMCC' : match.opponent} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? '' : 's'}`;
      match.status = 'complete';
      match.completedAt = match.completedAt || new Date().toISOString();
      match.updatedAt = new Date().toISOString();
      const finalMatch = mergeInningsIntoMatch(match, state.currentInnings);
      state.liveMatch = finalMatch;
      state.lastCompletedMatch = finalMatch;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
    },

    /**
     * Change bowler mid-over (e.g., bowler retired hurt, change bowler option)
     * Updates the current bowler but preserves ball count and stats for current over
     */
    changeBowler: (state, action: PayloadAction<{ bowlerId: string; bowlerName: string }>) => {
      if (!state.currentInnings) return;

      const { bowlerId, bowlerName } = action.payload;
      
      // Inherit current over's in-progress stats from the outgoing bowler
      const currentBalls = state.currentInnings.currentBowler?.balls || 0;
      const currentRuns = state.currentInnings.currentBowler?.runs || 0;
      const currentWickets = state.currentInnings.currentBowler?.wickets || 0;
      const currentExtras = state.currentInnings.currentBowler?.extras || 0;

      // Restore incoming bowler's accumulated stats (overs, maidens) from bowlerStats
      const existingStats = state.currentInnings.bowlerStats.find(b => b.id === bowlerId);

      state.currentInnings.currentBowler = {
        id: bowlerId,
        name: bowlerName,
        overs: existingStats?.overs || 0,
        balls: currentBalls,
        runs: (existingStats?.runs || 0) + currentRuns,
        wickets: (existingStats?.wickets || 0) + currentWickets,
        maidens: existingStats?.maidens || 0,
        economy: 0, // Recomputed after next ball
        extras: (existingStats?.extras || 0) + currentExtras,
      };
    },

    /**
     * Update high-level match metadata while scoring is in progress
     */
    updateMatchDetails: (state, action: PayloadAction<{
      opponent: string;
      venue: string;
      tossWonBy: 'Us' | 'Them';
      tossDecision: 'bat' | 'field';
      totalOvers: number;
    }>) => {
      if (!state.liveMatch) return;

      state.liveMatch = {
        ...state.liveMatch,
        ...action.payload,
        updatedAt: new Date().toISOString(),
      };

      // Update first innings batting team based on toss winner + decision
      const firstInningsBattingTeam = getFirstInningsBattingTeam(
        action.payload.tossWonBy,
        action.payload.tossDecision
      );

      if (state.liveMatch.innings && state.liveMatch.innings.length > 0) {
        state.liveMatch.innings[0].battingTeam = firstInningsBattingTeam;
      }

      if (state.currentInnings && state.currentInnings.inningsNumber === 1) {
        state.currentInnings.battingTeam = firstInningsBattingTeam;
      }
    },

    /**
     * Add a new player to the team during match
     */
    addNewTeamPlayer: (state, action: PayloadAction<{ name: string; id?: string }>) => {
      if (!state.liveMatch) return;

      const { name, id } = action.payload;
      const newPlayer: TeamPlayer = {
        id: id || `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
      };

      state.liveMatch.teamPlayers.push(newPlayer);
    },

    /**
     * Add manual bowling stats to the innings where opponent bats
     */
    addManualBowlingStats: (state, action: PayloadAction<CurrentBowler[]>) => {
      if (!state.liveMatch) return;
      
      // Find the innings where 'Them' bat
      let themInnings = state.liveMatch.innings.find(i => i.battingTeam === 'Them');
      
      if (!themInnings) {
        // If not found, create it (e.g. if only 1st innings was recorded)
        themInnings = createEmptyInnings(2, state.liveMatch.teamPlayers);
        themInnings.battingTeam = 'Them';
        state.liveMatch.innings.push(themInnings);
      }
      
      themInnings.bowlerStats = action.payload;
      state.liveMatch.updatedAt = new Date().toISOString();
    },

    /**
     * Rehydrate scorer state from persisted storage
     */
    rehydrateScorer: (state, action: PayloadAction<ScorerState>) => {
      return action.payload;
    },

    /**
     * Set a previously completed match as the active match to view its result
     */
    viewCompletedMatch: (state, action: PayloadAction<LiveMatch>) => {
      state.liveMatch = action.payload;
      state.currentInnings = action.payload.innings[action.payload.innings.length - 1];
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
    },
  },
});

export const {
  initializeLiveMatch,
  initializeMatchAtSecondInnings,
  createUndoSnapshot,
  undoLastDelivery,
  recordBattingBall,
  recordBye,
  recordLegBye,
  recordWide,
  recordNoBall,
  recordPenaltyRuns,
  recordQuickWicket,
  recordStumpedWide,
  recordStumpedRegular,
  recordRunOutBall,
  recordRetiredOut,
  recordRetiredHurt,
  recordWicket,
  replaceBatsman,
  replaceStrikerForRetiredHurt,
  swapBatsmen,
  setInitialBattersAndBowler,
  openDialog,
  closeDialog,
  updateDialogData,
  setError,
  setLoading,
  clearMatch,
  completeOver,
  startSecondInnings,
  completeMatchAfterFirstInnings,
  finishCurrentInnings,
  completeMatchOnTargetReached,
  changeBowler,
  updateMatchDetails,
  addNewTeamPlayer,
  rehydrateScorer,
  viewCompletedMatch,
  addManualBowlingStats,
} = scorerSlice.actions;

export default scorerSlice.reducer;
