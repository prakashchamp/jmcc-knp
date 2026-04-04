'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LiveMatch, InningsState } from '@/app/lib/cricket-scorer-types';

/**
 * Partnership data for visualization
 */
export interface Partnership {
  bat1Id: string;
  bat1Name: string;
  bat2Id: string;
  bat2Name: string;
  runs: number;
  balls: number;
  isActive: boolean;
}

/**
 * Match state including match history for review screens
 */
export interface MatchState {
  currentMatch: LiveMatch | null;
  currentInningNumber: 1 | 2;
  partnerships: Partnership[];
  wicketLog: Array<{
    wicketNumber: number;
    runsAt: number;
    overAt: {
      overs: number;
      balls: number;
    };
    batsmanOut: string;
    bowler: string;
    dismissalMode: string;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: MatchState = {
  currentMatch: null,
  currentInningNumber: 1,
  partnerships: [],
  wicketLog: [],
  loading: false,
  error: null,
};

const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    /**
     * Initialize match for review
     */
    initializeMatchForReview: (state, action: PayloadAction<LiveMatch>) => {
      state.currentMatch = action.payload;
      state.currentInningNumber = 1;
      state.partnerships = [];
      state.wicketLog = [];
      state.error = null;
    },

    /**
     * Switch active inning for review
     */
    switchInningForReview: (state, action: PayloadAction<1 | 2>) => {
      state.currentInningNumber = action.payload;
    },

    /**
     * Update partnerships (called during ball recording)
     */
    updatePartnerships: (state, action: PayloadAction<Partnership[]>) => {
      state.partnerships = action.payload;
    },

    /**
     * Add wicket to log
     */
    addWicketToLog: (state, action: PayloadAction<{
      wicketNumber: number;
      runsAt: number;
      overAt: { overs: number; balls: number };
      batsmanOut: string;
      bowler: string;
      dismissalMode: string;
    }>) => {
      state.wicketLog.push(action.payload);
    },

    /**
     * Clear wicket log (for new innings)
     */
    clearWicketLog: (state) => {
      state.wicketLog = [];
    },

    /**
     * Set error
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Set loading
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    /**
     * Clear match data
     */
    clearMatch: (state) => {
      state.currentMatch = null;
      state.currentInningNumber = 1;
      state.partnerships = [];
      state.wicketLog = [];
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  initializeMatchForReview,
  switchInningForReview,
  updatePartnerships,
  addWicketToLog,
  clearWicketLog,
  setError,
  setLoading,
  clearMatch,
} = matchSlice.actions;

export default matchSlice.reducer;
