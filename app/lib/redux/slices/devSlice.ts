import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DevState {
  isManualFetchMode: boolean;
  fetchTrigger: number; // Increment this to trigger fetches
}

const initialState: DevState = {
  isManualFetchMode: true, // Default to true as requested
  fetchTrigger: 0,
};

const devSlice = createSlice({
  name: 'dev',
  initialState,
  reducers: {
    setManualFetchMode: (state, action: PayloadAction<boolean>) => {
      state.isManualFetchMode = action.payload;
    },
    triggerFetch: (state) => {
      state.fetchTrigger += 1;
    },
  },
});

export const { setManualFetchMode, triggerFetch } = devSlice.actions;
export default devSlice.reducer;
