import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Team, TeamPlayer } from '@/app/lib/cricket-schema';
import { RootState } from '@/app/lib/redux/store';
import { getServerCollection, getServerDocument, syncTeamAndCascade } from '@/app/lib/actions/firebase-actions';

export const SINGLETON_TEAM_ID = 'jmcc_spartans_singleton';

/**
 * Fetch the primary team from Firestore
 * Uses Server Action to bypass rules
 */
export const fetchTeam = createAsyncThunk(
  'team/fetchTeam',
  async (_, { rejectWithValue }) => {
    try {
      const result = await getServerDocument<Team>('teams', SINGLETON_TEAM_ID);
      if (result) {
        return {
          ...result.data,
          id: result.id,
        };
      }
      return null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch team');
    }
  }
);

/**
 * Sync team data to Firestore with cascade
 * Uses Server Action to bypass rules and perform DB transactions
 */
export const syncTeam = createAsyncThunk(
  'team/syncTeam',
  async (team: Team, { rejectWithValue }) => {
    try {
      const result = await syncTeamAndCascade(team);
      if (result.success) {
        return team;
      }
      return rejectWithValue(result.error || 'Failed to sync team');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to sync team');
    }
  }
);

/**
 * Add a player to the team and sync to Firestore
 */
export const addPlayerAndSync = createAsyncThunk(
  'team/addPlayerAndSync',
  async (player: TeamPlayer, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as RootState;
    const team = state.team.team as Team | null;
    
    if (!team) return rejectWithValue('No team loaded');
    
    const updatedTeam = {
      ...team,
      players: [...(team.players || []), player],
      updatedAt: new Date().toISOString(),
    };
    
    try {
      const result = await dispatch(syncTeam(updatedTeam)).unwrap();
      return result;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


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
    addPlayerLocal: (state, action: PayloadAction<TeamPlayer>) => {
      if (state.team) {
        state.team.players = [...(state.team.players || []), action.payload];
        state.team.updatedAt = new Date().toISOString();
        state.savedToRedux = true;
        state.pendingCloudPush = true;
      }
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
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeam.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.team = action.payload;
      })
      .addCase(fetchTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(syncTeam.pending, (state) => {
        state.loading = true;
      })
      .addCase(syncTeam.fulfilled, (state, action) => {
        state.loading = false;
        state.team = action.payload;
        state.pendingCloudPush = false;
        state.savedToRedux = true;
      })
      .addCase(syncTeam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setTeam, saveToRedux, addPlayerLocal, setPendingCloudPush, clearTeam, setLoading, setError, rehydrateTeam } = teamSlice.actions;
export default teamSlice.reducer;
