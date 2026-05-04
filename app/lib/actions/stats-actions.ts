'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { 
  PlayerBattingStats, 
  PlayerBowlingStats, 
  Match, 
  Performance 
} from '@/app/lib/cricket-schema';
import { mapFirestoreToMatch, mapFirestoreToPerformance } from '@/app/lib/firestore-mapper';

/**
 * Server Action to fetch top 3 all-time batters
 */
export async function getTopBattersAction(): Promise<PlayerBattingStats[]> {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('player_stats_alltime')
      .orderBy('bat_runs', 'desc')
      .limit(3)
      .get();

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        playerId: data.player_id,
        playerName: data.player_name || 'Unknown',
        totalMatches: data.matches || 0,
        totalInnings: data.bat_innings || 0,
        notOuts: data.bat_not_out || 0,
        totalRuns: data.bat_runs || 0,
        bestScore: data.bat_highest || 0,
        average: data.bat_average || 0,
        totalBalls: data.bat_balls || 0,
        strikeRate: data.bat_strike_rate || 0,
        totalFours: data.bat_fours || 0,
        totalSixes: data.bat_sixes || 0,
        thirties: data.bat_thirties || 0,
        fifties: data.bat_fifties || 0,
        hundreds: data.bat_hundreds || 0,
        ducks: data.bat_ducks || 0,
        totalZeros: data.bat_zeros || 0,
      };
    });
  } catch (error) {
    console.error('getTopBattersAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch top 3 all-time bowlers
 */
export async function getTopBowlersAction(): Promise<PlayerBowlingStats[]> {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('player_stats_alltime')
      .orderBy('bowl_wickets', 'desc')
      .limit(3)
      .get();

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        playerId: data.player_id,
        playerName: data.player_name || 'Unknown',
        totalMatches: data.matches || 0,
        totalInnings: data.bowl_innings || 0,
        totalWickets: data.bowl_wickets || 0,
        totalRuns: data.bowl_runs || 0,
        bestHaul: data.bowl_best_wickets || 0,
        totalBalls: data.bowl_balls || 0,
        totalOvers: data.bowl_overs || 0,
        average: data.bowl_average || 0,
        strikeRate: data.bowl_strike_rate || 0,
        economy: data.bowl_economy || 0,
        threeWickets: data.bowl_three_fers || 0,
        fiveWickets: data.bowl_five_fers || 0,
        totalMaidens: data.bowl_maidens || 0,
      };
    });
  } catch (error) {
    console.error('getTopBowlersAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch recent matches with performances
 */
export async function getRecentMatchesAction(limitCount: number = 5) {
  try {
    const db = getFirebaseAdmin();
    const matchesSnapshot = await db.collection('matches')
      .orderBy('created_at', 'desc')
      .limit(limitCount)
      .get();

    if (matchesSnapshot.empty) return [];

    const results = await Promise.all(matchesSnapshot.docs.map(async (doc) => {
      const matchId = doc.id;
      const perfsSnapshot = await db.collection('performances')
        .where('match_id', '==', matchId)
        .get();
      
      return {
        match: mapFirestoreToMatch({ id: matchId, ...doc.data() }),
        performances: perfsSnapshot.docs.map((pDoc) => mapFirestoreToPerformance({ id: pDoc.id, ...pDoc.data() })),
      };
    }));

    return results;
  } catch (error) {
    console.error('getRecentMatchesAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch match details and performances
 */
export async function getMatchDetailsAction(matchId: string) {
  try {
    if (!matchId || typeof matchId !== 'string') {
      console.warn('getMatchDetailsAction: Invalid matchId provided');
      return null;
    }
    const db = getFirebaseAdmin();
    const matchDoc = await db.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) return null;

    const perfsSnapshot = await db.collection('performances')
      .where('match_id', '==', matchId)
      .get();

    return {
      match: mapFirestoreToMatch({ id: matchId, ...matchDoc.data() }),
      performances: perfsSnapshot.docs.map((doc) => mapFirestoreToPerformance({ id: doc.id, ...doc.data() })),
    };
  } catch (error) {
    console.error('getMatchDetailsAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch all performances for aggregation
 */
export async function getAllPerformancesAction() {
  try {
    const db = getFirebaseAdmin();
    const perfsSnapshot = await db.collection('performances').get();
    return perfsSnapshot.docs.map((doc) => mapFirestoreToPerformance({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getAllPerformancesAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch all matches
 */
export async function getAllMatchesAction() {
  try {
    const db = getFirebaseAdmin();
    const matchesSnapshot = await db.collection('matches').orderBy('created_at', 'desc').get();
    return matchesSnapshot.docs.map((doc) => mapFirestoreToMatch({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('getAllMatchesAction Error:', error);
    throw error;
  }
}

/**
 * Helper to map firestore stats doc to PlayerBattingStats and PlayerBowlingStats
 */
function mapToPlayerStatsFormat(data: any) {
  const playerId = data.player_id;
  const playerName = data.player_name || 'Unknown';
  const totalMatches = data.matches || 0;

  const battingStats = {
    playerId,
    playerName,
    totalMatches,
    totalInnings: data.bat_innings || 0,
    notOuts: data.bat_not_out || 0,
    totalRuns: data.bat_runs || 0,
    bestScore: data.bat_highest || 0,
    average: data.bat_average || 0,
    totalBalls: data.bat_balls || 0,
    strikeRate: data.bat_strike_rate || 0,
    totalFours: data.bat_fours || 0,
    totalSixes: data.bat_sixes || 0,
    thirties: data.bat_thirties || 0,
    fifties: data.bat_fifties || 0,
    hundreds: data.bat_hundreds || 0,
    ducks: data.bat_ducks || 0,
    totalZeros: data.bat_zeros || 0,
  };

  const bowlingStats = {
    playerId,
    playerName,
    totalMatches,
    totalInnings: data.bowl_innings || 0,
    totalWickets: data.bowl_wickets || 0,
    bestHaul: data.bowl_best_wickets || 0,
    totalRuns: data.bowl_runs || 0,
    totalBalls: data.bowl_balls || 0,
    totalOvers: data.bowl_overs || 0,
    average: data.bowl_average || 0,
    strikeRate: data.bowl_strike_rate || 0,
    economy: data.bowl_economy || 0,
    threeWickets: data.bowl_three_fers || 0,
    fiveWickets: data.bowl_five_fers || 0,
    totalMaidens: data.bowl_maidens || 0,
  };

  return { playerId, playerName, battingStats, bowlingStats, totalMatches };
}

/**
 * Server Action to fetch monthly stats from player_stats_monthly
 */
export async function getMonthlyPlayerStatsAction(month: string) {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('player_stats_monthly').where('month', '==', month).get();
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error('getMonthlyPlayerStatsAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch yearly stats from player_stats_yearly
 */
export async function getYearlyPlayerStatsAction(year: string) {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('player_stats_yearly').where('year', '==', year).get();
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error('getYearlyPlayerStatsAction Error:', error);
    throw error;
  }
}

/**
 * Server Action to fetch all-time stats from player_stats_alltime
 */
export async function getAllTimePlayerStatsAction() {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('player_stats_alltime').get();
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error('getAllTimePlayerStatsAction Error:', error);
    throw error;
  }
}
