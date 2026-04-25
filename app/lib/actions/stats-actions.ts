'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { 
  PlayerBattingStats, 
  PlayerBowlingStats, 
  Match, 
  Performance 
} from '@/app/lib/cricket-schema';

/**
 * Server Action to fetch top 3 all-time batters
 */
export async function getTopBattersAction(): Promise<PlayerBattingStats[]> {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection('performances').get();
    const statsMap = new Map<string, PlayerBattingStats & { matchIds: Set<string>; notOuts: number }>();

    querySnapshot.forEach((doc) => {
      const perf = doc.data();
      if (!perf.bat_did_bat) return;

      const playerId = perf.player_id;
      if (!playerId) return;

      if (!statsMap.has(playerId)) {
        statsMap.set(playerId, {
          playerId,
          playerName: perf.player_name || 'Unknown',
          totalMatches: 0,
          totalInnings: 0,
          notOuts: 0,
          totalRuns: 0,
          bestScore: 0,
          average: 0,
          totalBalls: 0,
          strikeRate: 0,
          totalFours: 0,
          totalSixes: 0,
          thirties: 0,
          fifties: 0,
          hundreds: 0,
          ducks: 0,
          matchIds: new Set(),
        });
      }

      const stats = statsMap.get(playerId)!;
      stats.totalInnings += (perf.bat_innings || 0);
      stats.totalRuns += (perf.bat_runs || 0);
      stats.totalBalls += (perf.bat_balls || 0);
      stats.totalFours += (perf.bat_fours || 0);
      stats.totalSixes += (perf.bat_sixes || 0);
      
      if (!perf.bat_dismissed) {
        stats.notOuts += (perf.bat_innings || 0);
      }
      if (perf.bat_is_duck) stats.ducks += 1;
      if (perf.bat_is_thirty) stats.thirties += 1;
      if (perf.bat_is_fifty) stats.fifties += 1;
      if (perf.bat_is_hundred) stats.hundreds += 1;
      
      stats.bestScore = Math.max(stats.bestScore, perf.bat_runs || 0);
      if (perf.match_id) stats.matchIds.add(perf.match_id);
    });

    let batters = Array.from(statsMap.values()).map(({ matchIds, notOuts, ...stat }) => {
      const dismissals = stat.totalInnings - notOuts;
      return {
        ...stat,
        notOuts,
        totalMatches: matchIds.size,
        average: dismissals > 0 ? stat.totalRuns / dismissals : stat.totalRuns,
        strikeRate: stat.totalBalls > 0 ? (stat.totalRuns / stat.totalBalls) * 100 : 0,
      };
    });

    return batters.sort((a, b) => b.totalRuns - a.totalRuns).slice(0, 3);
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
    const querySnapshot = await db.collection('performances').get();
    const statsMap = new Map<string, PlayerBowlingStats & { matchIds: Set<string>; totalInnings: number }>();

    querySnapshot.forEach((doc) => {
      const perf = doc.data();
      if (!perf.bowl_did_bowl) return;

      const playerId = perf.player_id;
      if (!playerId) return;

      if (!statsMap.has(playerId)) {
        statsMap.set(playerId, {
          playerId,
          playerName: perf.player_name || 'Unknown',
          totalMatches: 0,
          totalInnings: 0,
          totalWickets: 0,
          totalRuns: 0,
          bestHaul: 0,
          totalBalls: 0,
          totalOvers: 0,
          average: 0,
          strikeRate: 0,
          economy: 0,
          threeWickets: 0,
          fiveWickets: 0,
          matchIds: new Set(),
        });
      }

      const stats = statsMap.get(playerId)!;
      stats.totalInnings += (perf.bowl_innings || 0);
      stats.totalWickets += (perf.bowl_wickets || 0);
      stats.totalRuns += (perf.bowl_runs || 0);
      stats.totalBalls += (perf.bowl_balls || 0);
      
      if (perf.bowl_is_three_fer) stats.threeWickets += 1;
      if (perf.bowl_is_five_fer) stats.fiveWickets += 1;
      
      stats.bestHaul = Math.max(stats.bestHaul, perf.bowl_wickets || 0);
      if (perf.match_id) stats.matchIds.add(perf.match_id);
    });

    let bowlers = Array.from(statsMap.values()).map(({ matchIds, totalInnings, ...stat }) => {
      const totalOversDec = stat.totalOvers + (stat.totalBalls / 6);
      return {
        ...stat,
        totalInnings,
        totalMatches: matchIds.size,
        economy: totalOversDec > 0 ? stat.totalRuns / totalOversDec : 0,
        average: stat.totalWickets > 0 ? stat.totalRuns / stat.totalWickets : 0,
        strikeRate: stat.totalWickets > 0 ? stat.totalBalls / stat.totalWickets : 0,
      };
    });

    return bowlers.sort((a, b) => b.totalWickets - a.totalWickets).slice(0, 3);
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
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();

    if (matchesSnapshot.empty) return [];

    const perfsSnapshot = await db.collection('performances').get();
    const allPerfs = perfsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return matchesSnapshot.docs.map(doc => {
      const matchId = doc.id;
      return {
        match: { id: matchId, ...doc.data() } as Match,
        performances: allPerfs.filter(p => (p as any).match_id === matchId) as Performance[],
      };
    });
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
    const db = getFirebaseAdmin();
    const matchDoc = await db.collection('matches').doc(matchId).get();
    
    if (!matchDoc.exists) return null;

    const perfsSnapshot = await db.collection('performances')
      .where('match_id', '==', matchId)
      .get();

    return {
      match: { id: matchId, ...matchDoc.data() } as Match,
      performances: perfsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Performance[],
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
    return perfsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Performance[];
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
    const matchesSnapshot = await db.collection('matches').orderBy('createdAt', 'desc').get();
    return matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Match[];
  } catch (error) {
    console.error('getAllMatchesAction Error:', error);
    throw error;
  }
}
