import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { uploadMatchToCloudAction } from '@/app/lib/actions/match-upload-actions';
import { mergeInningsIntoMatch } from '../slices/scorerSlice';

/**
 * Thunk to upload a completed match to Firestore.
 * Uses the robust uploadMatchToCloudAction server action.
 */
export const uploadMatchToFirestore = createAsyncThunk(
  'scorer/uploadMatchToFirestore',
  async (overrides: Partial<import('@/app/lib/cricket-schema').Match> | undefined, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { liveMatch, currentInnings } = state.scorer;
      
      if (!liveMatch) {
        return rejectWithValue('No live match found');
      }

      // Merge current innings into liveMatch to ensure we have the latest state
      const matchToUpload = mergeInningsIntoMatch(liveMatch, currentInnings);

      if (matchToUpload.status !== 'complete') {
        return rejectWithValue('Match must be completed before uploading.');
      }

      // Apply overrides from the confirm dialog
      if (overrides) {
        if (overrides.date) matchToUpload.completedAt = overrides.date;
        if (overrides.opponent) matchToUpload.opponent = overrides.opponent;
        if (overrides.tossWonBy) matchToUpload.tossWonBy = overrides.tossWonBy as any;
        if (overrides.winMargin) matchToUpload.winMargin = overrides.winMargin;
        if (overrides.firstInningsTeam) (matchToUpload as any).firstInningsTeam = overrides.firstInningsTeam;
        if (overrides.firstInningsScore !== undefined) (matchToUpload as any).firstInningsScore = overrides.firstInningsScore;
      }

      // Call the server action
      const result = await uploadMatchToCloudAction(matchToUpload);
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to upload match');
      }

      return { matchId: matchToUpload.id };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error during upload');
    }
  }
);
