'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LiveMatch, Ball, InningsState, CurrentBatsman, CurrentBowler, TeamPlayer, DismissalMode, ExtraType } from '@/app/lib/cricket-scorer-types';

/**
 * Dialog state for modals
 */
export interface DialogState {
  activeDialog: 'extra' | 'wicket' | 'runOut' | 'batsmanSelect' | 'finishInnings' | null;
  dialogData?: {
    extraType?: ExtraType;
    hasWicket?: boolean;
    dismissalMode?: DismissalMode;
    selectedBatsman?: 'striker' | 'non-striker';
    runs?: number;
    runType?: 'leg-bye' | 'bye' | 'none';
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
};

/**
 * Initialize a new live match
 */
function createEmptyInnings(inningsNumber: 1 | 2, teamPlayers: TeamPlayer[]): InningsState {
  const striker: CurrentBatsman = {
    id: teamPlayers[0]?.id || '',
    name: teamPlayers[0]?.name || 'Batsman 1',
    jerseyNumber: teamPlayers[0]?.jerseyNumber,
    role: 'striker',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    status: 'batting',
    strikeRate: 0,
  };

  const nonStriker: CurrentBatsman = {
    id: teamPlayers[1]?.id || '',
    name: teamPlayers[1]?.name || 'Batsman 2',
    jerseyNumber: teamPlayers[1]?.jerseyNumber,
    role: 'non-striker',
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    status: 'batting',
    strikeRate: 0,
  };

  return {
    inningsNumber,
    battingTeam: 'Us',
    totalRuns: 0,
    totalWickets: 0,
    totalBalls: 0,
    ballHistory: [],
    striker,
    nonStriker,
    dismissedBatsmen: [],
  };
}

const scorerSlice = createSlice({
  name: 'scorer',
  initialState,
  reducers: {
    /**
     * Initialize a new live match
     */
    initializeLiveMatch: (state, action: PayloadAction<LiveMatch>) => {
      const match = action.payload;
      
      // Create first innings if not provided
      const firstInnings = match.innings && match.innings.length > 0 
        ? match.innings[0]
        : createEmptyInnings(1, match.teamPlayers);
      
      // Ensure the innings is in the match
      if (!match.innings || match.innings.length === 0) {
        match.innings = [firstInnings];
      }
      
      state.liveMatch = match;
      state.currentInnings = firstInnings;
      state.undoStack = [];
      state.dialogState = { activeDialog: null, dialogData: {} };
      state.error = null;
    },

    /**
     * Create snapshot for undo before recording a ball
     */
    createUndoSnapshot: (state) => {
      if (!state.currentInnings) return;

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
      if (!state.currentInnings || runs < 0 || runs > 7) return;

      const innings = state.currentInnings;
      if (!innings.striker || !innings.currentBowler) return;

      // Update batsman stats
      innings.striker.runs += runs;
      innings.striker.balls += 1;

      if (runs === 4) innings.striker.fours += 1;
      if (runs === 6) innings.striker.sixes += 1;
      innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));

      // Update bowler stats
      innings.currentBowler.runs += runs;
      innings.currentBowler.balls += 1;
      innings.currentBowler.economy = parseFloat((innings.currentBowler.runs / (innings.currentBowler.balls / 6)).toFixed(2)) || 0;

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
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;

        // Rotate strike at over end (even delivery always rotates)
        if (innings.totalBalls % 12 !== 0) {
          const temp = innings.striker;
          innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
          innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
        }
      }
    },

    /**
     * Record bye runs (1-7)
     */
    recordBye: (state, action: PayloadAction<{ runs: number; hasWicket: boolean }>) => {
      const { runs, hasWicket } = action.payload;
      if (!state.currentInnings || runs < 1 || runs > 7) return;

      const innings = state.currentInnings;

      // Byes count as legal deliveries (increment bowler ball count)
      innings.totalBalls += 1;
      if (innings.currentBowler) {
        innings.currentBowler.balls += 1;
      }

      innings.totalRuns += runs;

      // Check strike rotation
      if (runs % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Check if over completed
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;
      }
    },

    /**
     * Record leg-bye runs (1-7)
     */
    recordLegBye: (state, action: PayloadAction<{ runs: number; hasWicket: boolean }>) => {
      const { runs, hasWicket } = action.payload;
      if (!state.currentInnings || runs < 1 || runs > 7) return;

      const innings = state.currentInnings;

      // Leg-byes count as legal deliveries
      innings.totalBalls += 1;
      if (innings.currentBowler) {
        innings.currentBowler.balls += 1;
      }

      innings.totalRuns += runs;

      // Check strike rotation
      if (runs % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }

      // Check if over completed
      if (innings.totalBalls % 6 === 0 && innings.currentBowler) {
        innings.currentBowler.overs += 1;
        innings.currentBowler.balls = 0;
      }
    },

    /**
     * Record wide runs (0-7) - doesn't count as bowler ball
     */
    recordWide: (state, action: PayloadAction<{ runs: number; hasWicket: boolean }>) => {
      const { runs, hasWicket } = action.payload;
      if (!state.currentInnings || runs < 0 || runs > 7) return;

      const innings = state.currentInnings;

      // Wides DON'T count as legal balls for bowler
      // But DO count toward total runs
      innings.totalRuns += runs + 1; // +1 for the wide penalty

      if (innings.currentBowler) {
        innings.currentBowler.runs += runs + 1;
        innings.currentBowler.extras += 1;
      }

      // Wides don't cause strike rotation
    },

    /**
     * Record no-ball runs (0-7) - doesn't count as bowler ball
     */
    recordNoBall: (state, action: PayloadAction<{ runs: number; hasWicket: boolean; runType: 'leg-bye' | 'bye' | 'none' }>) => {
      const { runs, hasWicket, runType } = action.payload;
      if (!state.currentInnings || runs < 0 || runs > 7) return;

      const innings = state.currentInnings;

      // No-balls DON'T count as legal balls for bowler
      // But DO count penalty run + any additional runs
      innings.totalRuns += runs + 1; // +1 for penalty

      if (innings.currentBowler) {
        innings.currentBowler.runs += runs + 1;
        innings.currentBowler.extras += 1;
      }

      // No-balls to batter count as 1 ball
      if (innings.striker) {
        innings.striker.balls += 1;
        if (runs > 0) {
          innings.striker.runs += runs;
          if (runs === 4) innings.striker.fours += 1;
          if (runs === 6) innings.striker.sixes += 1;
          innings.striker.strikeRate = parseFloat(((innings.striker.runs / innings.striker.balls) * 100).toFixed(2));
        }
      }

      // Check strike rotation for odd runs (even runs from no-ball)
      const totalNoballRuns = runs;
      if (totalNoballRuns % 2 === 1 && !hasWicket) {
        const temp = innings.striker;
        innings.striker = { ...innings.nonStriker, role: 'striker' } as CurrentBatsman;
        innings.nonStriker = { ...temp, role: 'non-striker' } as CurrentBatsman;
      }
    },

    /**
     * Record wicket with dismissal mode
     */
    recordWicket: (state, action: PayloadAction<{ dismissalMode: DismissalMode; batsmanId: string }>) => {
      const { dismissalMode, batsmanId } = action.payload;
      if (!state.currentInnings) return;

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
      } else if (innings.nonStriker?.id === batsmanId) {
        innings.nonStriker.status = 'out';
        innings.nonStriker.dismissal = {
          mode: dismissalMode,
          description: dismissalMode,
        };
        innings.dismissedBatsmen.push({ ...innings.nonStriker });
        innings.totalWickets += 1;
      }
    },

    /**
     * Replace dismissed batsman with new batsman
     */
    replaceBatsman: (state, action: PayloadAction<{ outBatsmanId: string; newBatsman: TeamPlayer; isStriker: boolean }>) => {
      const { outBatsmanId, newBatsman, isStriker } = action.payload;
      if (!state.currentInnings) return;

      const innings = state.currentInnings;

      const newBatsmanObj: CurrentBatsman = {
        id: newBatsman.id,
        name: newBatsman.name,
        jerseyNumber: newBatsman.jerseyNumber,
        role: isStriker ? 'striker' : 'non-striker',
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        status: 'batting',
        strikeRate: 0,
      };

      if (isStriker) {
        innings.striker = newBatsmanObj;
      } else {
        innings.nonStriker = newBatsmanObj;
      }
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
     * Rehydrate scorer state from persisted storage
     */
    rehydrateScorer: (state, action: PayloadAction<ScorerState>) => {
      return action.payload;
    },
  },
});

export const {
  initializeLiveMatch,
  createUndoSnapshot,
  undoLastDelivery,
  recordBattingBall,
  recordBye,
  recordLegBye,
  recordWide,
  recordNoBall,
  recordWicket,
  replaceBatsman,
  swapBatsmen,
  openDialog,
  closeDialog,
  updateDialogData,
  setError,
  setLoading,
  rehydrateScorer,
} = scorerSlice.actions;

export default scorerSlice.reducer;
