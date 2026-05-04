import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { uploadMatchToCloudAction } from '@/app/lib/actions/match-upload-actions';
import { mergeInningsIntoMatch } from '../slices/scorerSlice';
import { syncTeam } from '../slices/teamSlice';

/**
 * Thunk to upload a completed match to Firestore.
 * Uses the robust uploadMatchToCloudAction server action.
 */
export const uploadMatchToFirestore = createAsyncThunk(
  'scorer/uploadMatchToFirestore',
  async (overrides: Partial<import('@/app/lib/cricket-schema').Match> | undefined, { dispatch, getState, rejectWithValue }) => {
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
        if (overrides.venue) matchToUpload.venue = overrides.venue as any;
        if (overrides.tossWonBy) matchToUpload.tossWonBy = overrides.tossWonBy as any;
        if (overrides.result) matchToUpload.result = overrides.result as any;
        if (overrides.winMargin !== undefined) matchToUpload.winMargin = overrides.winMargin;
        if (overrides.teamRuns !== undefined) (matchToUpload as any).teamRuns = overrides.teamRuns;
        if (overrides.teamWickets !== undefined) (matchToUpload as any).teamWickets = overrides.teamWickets;
        if (overrides.opponentRuns !== undefined) (matchToUpload as any).opponentRuns = overrides.opponentRuns;
        if (overrides.opponentWickets !== undefined) (matchToUpload as any).opponentWickets = overrides.opponentWickets;
        if ((overrides as any).firstInningsTeam) (matchToUpload as any).firstInningsTeam = (overrides as any).firstInningsTeam;
        if ((overrides as any).firstInningsScore !== undefined) (matchToUpload as any).firstInningsScore = (overrides as any).firstInningsScore;
      }

      // Call the server action
      const result = await uploadMatchToCloudAction(matchToUpload);
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to upload match');
      }

      // Sync team if we have pending local players
      if (state.team.pendingCloudPush && state.team.team) {
        await dispatch(syncTeam(state.team.team)).unwrap().catch(err => {
          console.error("Failed to sync team after match upload", err);
        });
      }

      return { matchId: matchToUpload.id };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error during upload');
    }
  }
);
