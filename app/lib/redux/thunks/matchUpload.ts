import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { batchWrite } from '@/services/firebase/operations';
import { calculatePerformances } from '@/app/lib/stats-calculator';
import { 
  mapMatchToFirestore, 
  mapPerformanceToFirestore, 
  findBestBatter, 
  findBestBowler 
} from '@/app/lib/firestore-mapper';
import { BatchOperation } from '@/services/firebase/types';

export const uploadMatchToFirestore = createAsyncThunk(
  'scorer/uploadMatchToFirestore',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { liveMatch, currentInnings } = state.scorer;
      
      if (!liveMatch) {
        return rejectWithValue('No live match found');
      }

      // 1. Get all balls from history
      // We need to make sure we have all innings
      const allInnings = [...liveMatch.innings];
      // If currentInnings is not in liveMatch.innings (e.g. still in progress or just finished), add/update it
      if (currentInnings) {
        const idx = allInnings.findIndex(inn => inn.inningsNumber === currentInnings.inningsNumber);
        if (idx >= 0) {
          allInnings[idx] = currentInnings;
        } else {
          allInnings.push(currentInnings);
        }
      }

      const allBalls = allInnings.flatMap(inn => inn.ballHistory);

      // 2. Calculate performances for JMCC players
      // Assuming 'Us' is JMCC
      const jmccPlayers = liveMatch.teamPlayers;
      const performances = calculatePerformances(
        allBalls,
        jmccPlayers,
        liveMatch.id,
        liveMatch.opponent,
        liveMatch.createdAt || new Date().toISOString(),
        liveMatch.currentInnings
      );

      // 3. Find best performers for match summary
      const bestBatter = findBestBatter(performances);
      const bestBowler = findBestBowler(performances);

      // 4. Prepare batch operations
      const operations: BatchOperation[] = [];

      // Match document
      const matchData = mapMatchToFirestore(liveMatch);
      const enrichedMatchData = {
        ...matchData,
        best_batter_id: bestBatter?.playerId || '',
        best_batter_name: bestBatter?.playerName || '',
        best_batter_runs: bestBatter?.batting.runs || 0,
        best_batter_balls: bestBatter?.batting.balls || 0,
        best_bowler_id: bestBowler?.playerId || '',
        best_bowler_name: bestBowler?.playerName || '',
        best_bowler_wickets: bestBowler?.bowling.wickets || 0,
        best_bowler_runs: bestBowler?.bowling.runs || 0,
      };

      operations.push({
        type: 'set',
        collection: 'matches',
        docId: liveMatch.id,
        data: enrichedMatchData,
      });

      // Performance documents
      performances.forEach(perf => {
        operations.push({
          type: 'set',
          collection: 'performances',
          docId: `${liveMatch.id}_${perf.playerId}`,
          data: mapPerformanceToFirestore(perf),
        });
      });

      // 5. Execute batch write
      const results = await batchWrite(operations);
      
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        return rejectWithValue(`Failed to upload ${failed.length} documents`);
      }

      return { matchId: liveMatch.id, count: operations.length };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error during upload');
    }
  }
);
