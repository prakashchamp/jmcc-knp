'use client';

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Match } from '@/app/lib/cricket-schema';
import { getAllMatchesAction } from '@/app/lib/actions/stats-actions';

export interface StatsState {
  matches: Match[];
  availableMonths: { value: string; label: string }[];
  availableYears: { value: string; label: string }[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetchedAt: number | null;
}

const initialState: StatsState = {
  matches: [],
  availableMonths: [],
  availableYears: [],
  status: 'idle',
  error: null,
  lastFetchedAt: null,
};

export const fetchAllMatches = createAsyncThunk(
  'stats/fetchAllMatches',
  async (force: boolean = false, { getState }) => {
    const state = getState() as { stats: StatsState };
    const statsState = state.stats;
    
    // Simple cache invalidation (e.g. 5 minutes) or force refresh
    const CACHE_TTL = 5 * 60 * 1000;
    const now = Date.now();
    
    if (
      !force && 
      statsState.matches.length > 0 && 
      statsState.lastFetchedAt && 
      (now - statsState.lastFetchedAt < CACHE_TTL)
    ) {
      return statsState.matches;
    }
    
    const matches = await getAllMatchesAction();
    return matches;
  }
);

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMatches.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllMatches.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.matches = action.payload;
        state.lastFetchedAt = Date.now();
        
        // Extract months and years
        const monthsMap = new Map<string, string>(); // value -> label
        const yearsSet = new Set<string>();
        
        action.payload.forEach(match => {
          if (match.month) {
            // Format "2024-03" to "March 2024"
            const [y, m] = match.month.split('-');
            const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long' });
            monthsMap.set(match.month, `${monthName} ${y}`);
          } else if ((match as any).created_at) {
            const date = new Date((match as any).created_at);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthName = date.toLocaleString('default', { month: 'long' });
            monthsMap.set(monthKey, `${monthName} ${date.getFullYear()}`);
          }

          if (match.year) {
            yearsSet.add(match.year);
          } else if ((match as any).created_at) {
            yearsSet.add(new Date((match as any).created_at).getFullYear().toString());
          }
        });
        
        state.availableMonths = Array.from(monthsMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0])) // Most recent month first
          .map(([value, label]) => ({
            value,
            label
          }));
        
        state.availableYears = Array.from(yearsSet).sort().reverse().map(year => ({
          value: year,
          label: year
        }));
      })
      .addCase(fetchAllMatches.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch matches';
      });
  },
});

export default statsSlice.reducer;
