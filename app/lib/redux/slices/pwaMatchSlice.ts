'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PWAMatch, MatchSetupData, InningsSetupData, BallDelivery, BatsmanScorecard, BowlerScorecard, InningsScorecard } from '@/app/lib/pwa-cricket-types';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';

interface PWAMatchState {
  currentMatch: PWAMatch | null;
  loading: boolean;
  error: string | null;
}

const initialState: PWAMatchState = {
  currentMatch: null,
  loading: false,
  error: null,
};

const pwaMatchSlice = createSlice({
  name: 'pwaMatch',
  initialState,
  reducers: {
    // Initialize match from pre-match form
    initializeMatch: (
      state,
      action: PayloadAction<{
        setupData: MatchSetupData;
        abcTeamPlayers: TeamPlayer[];
      }>
    ) => {
      const { setupData, abcTeamPlayers } = action.payload;
      const abcBatsFirst = setupData.tossWonBy === 'ABC' 
        ? setupData.decision === 'bat' 
        : setupData.decision === 'bowl';

      state.currentMatch = {
        id: `match_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        abcTeam: abcTeamPlayers,
        opponentName: setupData.opponentName,
        venue: setupData.venue,
        tossWonBy: setupData.tossWonBy === 'ABC' ? 'ABC' : 'Opponent',
        decision: setupData.decision,
        oversPerMatch: setupData.oversPerMatch,
        currentInnings: 1,
        inningsData: {
          innings1: {
            inningsNumber: 1,
            battingTeam: abcBatsFirst ? 'ABC' : 'Opponent',
            totalRuns: 0,
            totalWickets: 0,
            totalOversPlayed: 0,
            batsmen: [],
            bowlers: [],
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          },
        },
        lastBowlerId: undefined,
        maxOversPerBowler: Math.floor(setupData.oversPerMatch / 5),
        matchCompleted: false,
      };
    },

    // Setup innings
    setupInnings: (
      state,
      action: PayloadAction<{
        inningsNumber: 1 | 2;
        battingTeam: 'ABC' | 'Opponent';
        striker: BatsmanScorecard;
        nonStriker: BatsmanScorecard;
        bowler: BowlerScorecard;
      }>
    ) => {
      if (!state.currentMatch) return;

      const inningsData: InningsScorecard = {
        inningsNumber: action.payload.inningsNumber,
        battingTeam: action.payload.battingTeam,
        totalRuns: 0,
        totalWickets: 0,
        totalOversPlayed: 0,
        batsmen: [action.payload.striker, action.payload.nonStriker],
        bowlers: [action.payload.bowler],
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      };

      if (action.payload.inningsNumber === 1) {
        state.currentMatch.inningsData.innings1 = inningsData;
      } else {
        state.currentMatch.inningsData.innings2 = inningsData;
        // Set target from 1st innings
        inningsData.target = state.currentMatch.inningsData.innings1.totalRuns + 1;
      }
    },

    // Add ball delivery
    addBall: (
      state,
      action: PayloadAction<{
        ball: BallFormData;
        innings: 1 | 2;
      }>
    ) => {
      if (!state.currentMatch) return;
      
      const inningsKey = action.payload.innings === 1 ? 'innings1' : 'innings2';
      const innings = state.currentMatch.inningsData[inningsKey as keyof typeof state.currentMatch.inningsData];
      if (!innings) return;

      // Process ball and update scorecard
      processBallDelivery(innings, action.payload.ball);
    },

    // Mark batsman as out
    markBatsmanOut: (
      state,
      action: PayloadAction<{
        inningsNumber: 1 | 2;
        batsmanId: string;
        dismissalInfo: string;
      }>
    ) => {
      if (!state.currentMatch) return;

      const inningsKey = action.payload.inningsNumber === 1 ? 'innings1' : 'innings2';
      const innings = state.currentMatch.inningsData[inningsKey as keyof typeof state.currentMatch.inningsData];
      if (!innings) return;

      const batsman = innings.batsmen.find((b) => b.id === action.payload.batsmanId);
      if (batsman) {
        batsman.status = 'out';
        batsman.dismissalInfo = action.payload.dismissalInfo;
        innings.totalWickets++;
      }
    },

    // End of innings
    completeInnings: (state) => {
      if (!state.currentMatch) return;
      if (state.currentMatch.currentInnings === 1) {
        state.currentMatch.currentInnings = 2;
      }
    },

    // Complete match
    completeMatch: (
      state,
      action: PayloadAction<{
        winner: 'ABC' | 'Opponent' | 'Tie';
        margin: string;
      }>
    ) => {
      if (!state.currentMatch) return;
      state.currentMatch.matchCompleted = true;
      state.currentMatch.winner = action.payload.winner;
      state.currentMatch.winningMargin = action.payload.margin;
    },

    // Update last bowler (for consecutive over tracking)
    updateLastBowler: (state, action: PayloadAction<string>) => {
      if (state.currentMatch) {
        state.currentMatch.lastBowlerId = action.payload;
      }
    },

    // Set loading
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear match
    clearMatch: (state) => {
      state.currentMatch = null;
      state.error = null;
    },
  },
});

// Helper function to process ball delivery
function processBallDelivery(innings: InningsScorecard, ballData: BallFormData) {
  // This will be implemented based on cricket rules
  // Updates batsmen, bowlers, extras etc.
}

// Placeholder for BallFormData
export interface BallFormData {
  type: string;
  runs?: number;
  extras?: number;
}

export const {
  initializeMatch,
  setupInnings,
  addBall,
  markBatsmanOut,
  completeInnings,
  completeMatch,
  updateLastBowler,
  setLoading,
  setError,
  clearMatch,
} = pwaMatchSlice.actions;

export default pwaMatchSlice.reducer;
