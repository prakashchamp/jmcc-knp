import { createAsyncThunk } from '@reduxjs/toolkit';
import { addNewTeamPlayer } from '../slices/scorerSlice';
import { addPlayerAndSync } from '../slices/teamSlice';
import { TeamPlayer } from '../../cricket-schema';
import { generatePlayerId } from '../../player-utils';

/**
 * Thunk to add a player to both the live match and the global team roster
 */
export const addNewPlayerToTeamAndMatch = createAsyncThunk(
  'scorer/addNewPlayerToTeamAndMatch',
  async (payload: { name: string }, { dispatch }) => {
    const { name } = payload;
    
    const newPlayer: TeamPlayer = {
      id: generatePlayerId(),
      name: name.trim(),
    };

    // 1. Add to live match state (local Redux)
    // We pass the same ID to keep them in sync
    dispatch(addNewTeamPlayer({ ...newPlayer }));
    
    // 2. Add to global team roster (Firestore + local Redux team state)
    await dispatch(addPlayerAndSync(newPlayer));
    
    return newPlayer;
  }
);
