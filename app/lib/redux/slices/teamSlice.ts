import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Team } from '@/app/lib/cricket-schema';

interface TeamState {
  team: Team | null;
  loading: boolean;
  error: string | null;
  savedToRedux: boolean;
  pendingCloudPush: boolean;
}

const initialState: TeamState = {
  team: null,
  loading: false,
  error: null,
  savedToRedux: false,
  pendingCloudPush: false,
};

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    setTeam: (state, action: PayloadAction<Team>) => {
      state.team = action.payload;
      state.error = null;
    },
    saveToRedux: (state, action: PayloadAction<Team>) => {
      state.team = action.payload;
      state.savedToRedux = true;
      state.pendingCloudPush = true;
      state.error = null;
    },
    setPendingCloudPush: (state, action: PayloadAction<boolean>) => {
      state.pendingCloudPush = action.payload;
    },
    clearTeam: (state) => {
      state.team = null;
      state.savedToRedux = false;
      state.pendingCloudPush = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    rehydrateTeam: (state, action: PayloadAction<TeamState>) => {
      return action.payload;
    },
  },
});

export const { setTeam, saveToRedux, setPendingCloudPush, clearTeam, setLoading, setError, rehydrateTeam } = teamSlice.actions;
export default teamSlice.reducer;
