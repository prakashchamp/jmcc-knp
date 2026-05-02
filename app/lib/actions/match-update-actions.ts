'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance, Match } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance, mapPerformanceToFirestore, mapMatchToFirestore, findTopBatters, findTopBowlers, findBestBatter, findBestBowler } from '@/app/lib/firestore-mapper';

/**
 * Decrement stats logic (reverses calculateUpdatedStats)
 */
function calculateDecrementedStats(stats: any, perf: Performance) {
  stats.matches = Math.max(0, (stats.matches || 1) - 1);
  stats.last_updated = admin.firestore.Timestamp.now();

  if (perf.batting.didBat) {
    stats.bat_innings = Math.max(0, (stats.bat_innings || 0) - 1);
    stats.bat_runs = Math.max(0, (stats.bat_runs || 0) - perf.batting.runs);
    stats.bat_balls = Math.max(0, (stats.bat_balls || 0) - perf.batting.balls);
    stats.bat_fours = Math.max(0, (stats.bat_fours || 0) - perf.batting.fours);
    stats.bat_sixes = Math.max(0, (stats.bat_sixes || 0) - perf.batting.sixes);
    
    if (perf.batting.dismissed) {
      stats.bat_dismissed = Math.max(0, (stats.bat_dismissed || 0) - 1);
    } else {
      stats.bat_not_out = Math.max(0, (stats.bat_not_out || 0) - 1);
    }
    
    if (perf.batting.isDuck) stats.bat_ducks = Math.max(0, (stats.bat_ducks || 0) - 1);
    if (perf.batting.isThirty) stats.bat_thirties = Math.max(0, (stats.bat_thirties || 0) - 1);
    if (perf.batting.isFifty) stats.bat_fifties = Math.max(0, (stats.bat_fifties || 0) - 1);
    if (perf.batting.isHundred) stats.bat_hundreds = Math.max(0, (stats.bat_hundreds || 0) - 1);
    
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }

  if (perf.bowling.didBowl) {
    stats.bowl_innings = Math.max(0, (stats.bowl_innings || 0) - 1);
    stats.bowl_runs = Math.max(0, (stats.bowl_runs || 0) - perf.bowling.runs);
    stats.bowl_wickets = Math.max(0, (stats.bowl_wickets || 0) - perf.bowling.wickets);
    
    const wholeOvers = Math.floor(perf.bowling.overs);
    const extraBalls = Math.round((perf.bowling.overs % 1) * 10);
    const perfBalls = wholeOvers * 6 + extraBalls;

    stats.bowl_balls = Math.max(0, (stats.bowl_balls || 0) - perfBalls);
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens = Math.max(0, (stats.bowl_maidens || 0) - perf.bowling.maidens);
    
    if (perf.bowling.isThreeFer) stats.bowl_three_fers = Math.max(0, (stats.bowl_three_fers || 0) - 1);
    if (perf.bowling.isFourFer) stats.bowl_four_fers = Math.max(0, (stats.bowl_four_fers || 0) - 1);
    if (perf.bowling.isFiveFer) stats.bowl_five_fers = Math.max(0, (stats.bowl_five_fers || 0) - 1);

    stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
    const totalOvers = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
    stats.bowl_economy = totalOvers > 0 ? stats.bowl_runs / totalOvers : 0;
    stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
  }

  return stats;
}

/**
 * Compare two performances to see if stats changed
 */
function isPerformanceEqual(a: Performance, b: Performance) {
  if (!a || !b) return false;
  return (
    a.batting.runs === b.batting.runs &&
    a.batting.balls === b.batting.balls &&
    a.batting.fours === b.batting.fours &&
    a.batting.sixes === b.batting.sixes &&
    a.batting.dismissed === b.batting.dismissed &&
    a.bowling.overs === b.bowling.overs &&
    a.bowling.runs === b.bowling.runs &&
    a.bowling.wickets === b.bowling.wickets &&
    a.bowling.maidens === b.bowling.maidens &&
    a.playerId === b.playerId
  );
}

/**
 * Increment stats logic (copied/adapted from match-upload-actions.ts)
 */
function calculateIncrementedStats(stats: any, perf: Performance) {
  stats.matches = (stats.matches || 0) + 1;
  stats.last_updated = admin.firestore.Timestamp.now();

  if (perf.batting.didBat) {
    stats.bat_innings = (stats.bat_innings || 0) + 1;
    stats.bat_runs = (stats.bat_runs || 0) + perf.batting.runs;
    stats.bat_balls = (stats.bat_balls || 0) + perf.batting.balls;
    stats.bat_fours = (stats.bat_fours || 0) + perf.batting.fours;
    stats.bat_sixes = (stats.bat_sixes || 0) + perf.batting.sixes;
    if (perf.batting.dismissed) stats.bat_dismissed = (stats.bat_dismissed || 0) + 1;
    else stats.bat_not_out = (stats.bat_not_out || 0) + 1;
    
    stats.bat_highest = Math.max(stats.bat_highest || 0, perf.batting.runs);
    if (perf.batting.isDuck) stats.bat_ducks = (stats.bat_ducks || 0) + 1;
    if (perf.batting.isThirty) stats.bat_thirties = (stats.bat_thirties || 0) + 1;
    if (perf.batting.isFifty) stats.bat_fifties = (stats.bat_fifties || 0) + 1;
    if (perf.batting.isHundred) stats.bat_hundreds = (stats.bat_hundreds || 0) + 1;
    
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }

  if (perf.bowling.didBowl) {
    stats.bowl_innings = (stats.bowl_innings || 0) + 1;
    stats.bowl_runs = (stats.bowl_runs || 0) + perf.bowling.runs;
    stats.bowl_wickets = (stats.bowl_wickets || 0) + perf.bowling.wickets;
    
    const wholeOvers = Math.floor(perf.bowling.overs);
    const extraBalls = Math.round((perf.bowling.overs % 1) * 10);
    const matchBalls = wholeOvers * 6 + extraBalls;
    
    stats.bowl_balls = (stats.bowl_balls || 0) + matchBalls;
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens = (stats.bowl_maidens || 0) + perf.bowling.maidens;
    
    if (perf.bowling.wickets > (stats.bowl_best_wickets || 0)) {
      stats.bowl_best_wickets = perf.bowling.wickets;
      stats.bowl_best_runs = perf.bowling.runs;
      stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
    } else if (perf.bowling.wickets === stats.bowl_best_wickets) {
      if (perf.bowling.runs < (stats.bowl_best_runs || 999)) {
        stats.bowl_best_runs = perf.bowling.runs;
        stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
      }
    }

    if (perf.bowling.isThreeFer) stats.bowl_three_fers = (stats.bowl_three_fers || 0) + 1;
    if (perf.bowling.isFourFer) stats.bowl_four_fers = (stats.bowl_four_fers || 0) + 1;
    if (perf.bowling.isFiveFer) stats.bowl_five_fers = (stats.bowl_five_fers || 0) + 1;

    stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
    const totalOvers = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
    stats.bowl_economy = totalOvers > 0 ? stats.bowl_runs / totalOvers : 0;
    stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
  }

  return stats;
}

export async function updateMatchAction(matchId: string, updatedMatch: Match, updatedPerformances: Performance[]) {
  const db = getFirebaseAdmin();

  try {
    // 1. Fetch old performances OUTSIDE transaction to avoid wide locks
    const oldPerfsSnapshot = await db.collection('performances')
      .where('match_id', '==', matchId)
      .get();
    
    const oldPerfs = oldPerfsSnapshot.docs.map(doc => 
      mapFirestoreToPerformance({ id: doc.id, ...doc.data() })
    );

    await db.runTransaction(async (transaction) => {
      // 1. Fetch old match data to check existence and year/month
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }

      const oldMatchData = matchDoc.data();
      const oldYear = oldMatchData?.year;
      const oldMonth = oldMatchData?.month;


      const newYear = updatedMatch.year;
      const newMonth = updatedMatch.month;
      const dateChanged = oldYear !== newYear || oldMonth !== newMonth;

      // 2. Identify dirty performances (stats that actually changed)
      const perfsToReverse: Performance[] = [];
      const perfsToApply: Performance[] = [];

      // Identify what to reverse from old stats
      for (const oldPerf of oldPerfs) {
        const newPerf = updatedPerformances.find(p => p.playerId === oldPerf.playerId);
        // Reverse if: date changed OR player removed OR stats changed
        if (dateChanged || !newPerf || !isPerformanceEqual(oldPerf, newPerf)) {
          perfsToReverse.push(oldPerf);
        }
      }

      // Identify what to apply to new stats
      for (const newPerf of updatedPerformances) {
        const oldPerf = oldPerfs.find(p => p.playerId === newPerf.playerId);
        // Apply if: date changed OR player added OR stats changed
        if (dateChanged || !oldPerf || !isPerformanceEqual(oldPerf, newPerf)) {
          perfsToApply.push(newPerf);
        }
      }

      // 3. Prepare affected stats references
      const statsToReverse: { ref: admin.firestore.DocumentReference, perf: Performance, scope: any }[] = [];
      for (const perf of perfsToReverse) {
        if (!perf.batting.didBat && !perf.bowling.didBowl) continue;
        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${oldYear}`, year: oldYear },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${oldMonth}`, month: oldMonth, year: oldYear }
        ];
        for (const scope of scopes) {
          statsToReverse.push({ ref: db.collection(scope.coll).doc(scope.id), perf, scope });
        }
      }

      const statsToApply: { ref: admin.firestore.DocumentReference, perf: Performance, scope: any }[] = [];
      for (const perf of perfsToApply) {
        if (!perf.batting.didBat && !perf.bowling.didBowl) continue;
        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${newYear}`, year: newYear },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${newMonth}`, month: newMonth, year: newYear }
        ];
        for (const scope of scopes) {
          statsToApply.push({ ref: db.collection(scope.coll).doc(scope.id), perf, scope });
        }
      }

      // Unique references for reading
      const allStatsRefs = Array.from(new Set([
        ...statsToReverse.map(s => s.ref.path),
        ...statsToApply.map(s => s.ref.path)
      ])).map(path => db.doc(path));

      const statsDocs = allStatsRefs.length > 0 ? await transaction.getAll(...allStatsRefs) : [];
      const statsMap = new Map<string, any>();
      statsDocs.forEach(doc => {
        if (doc.exists) statsMap.set(doc.ref.path, doc.data());
      });

      // 3. Reverse old stats
      for (const item of statsToReverse) {
        let stats = statsMap.get(item.ref.path);
        if (stats) {
          stats = calculateDecrementedStats(stats, item.perf);
          statsMap.set(item.ref.path, stats);
        }
      }

      // 4. Apply new stats
      for (const item of statsToApply) {
        let stats = statsMap.get(item.ref.path);
        if (!stats) {
          stats = {
            player_id: item.perf.playerId,
            player_name: item.perf.playerName,
            matches: 0,
            bat_innings: 0, bat_runs: 0, bat_balls: 0, bat_fours: 0, bat_sixes: 0, 
            bat_dismissed: 0, bat_not_out: 0, bat_highest: 0, bat_ducks: 0, 
            bat_thirties: 0, bat_fifties: 0, bat_hundreds: 0,
            bowl_innings: 0, bowl_overs: 0, bowl_balls: 0, bowl_runs: 0, 
            bowl_wickets: 0, bowl_maidens: 0, bowl_best_wickets: 0, bowl_best_runs: 0,
            bowl_three_fers: 0, bowl_four_fers: 0, bowl_five_fers: 0,
          };
          if (item.scope.year) stats.year = item.scope.year;
          if (item.scope.month) stats.month = item.scope.month;
        }
        stats = calculateIncrementedStats(stats, item.perf);
        statsMap.set(item.ref.path, stats);
      }

      // 5. Commit all changes
      // Update match
      const topBatters = findTopBatters(updatedPerformances);
      const topBowlers = findTopBowlers(updatedPerformances);
      const bestBatter = findBestBatter(updatedPerformances);
      const bestBowler = findBestBowler(updatedPerformances);

      const finalMatchData = {
        ...mapMatchToFirestore(updatedMatch as any),
        top_batters: topBatters,
        top_bowlers: topBowlers,
        best_batter_id: bestBatter?.playerId || '',
        best_batter_name: bestBatter?.playerName || '',
        best_batter_runs: bestBatter?.batting.runs || 0,
        best_batter_balls: bestBatter?.batting.balls || 0,
        best_bowler_id: bestBowler?.playerId || '',
        best_bowler_name: bestBowler?.playerName || '',
        best_bowler_wickets: bestBowler?.bowling.wickets || 0,
        best_bowler_runs: bestBowler?.bowling.runs || 0,
        created_at: updatedMatch.createdAt,
      };
      transaction.set(matchRef, finalMatchData);

      // Update performances
      // Delete old ones first to handle player set changes
      oldPerfsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      for (const perf of updatedPerformances) {
        const perfRef = db.collection('performances').doc(perf.id);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }

      // Update stats docs
      statsMap.forEach((stats, path) => {
        const ref = db.doc(path);
        if (stats.matches <= 0) {
          transaction.delete(ref);
        } else {
          transaction.set(ref, stats);
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('updateMatchAction Error:', error);
    return { success: false, error: error.message || 'Failed to update match' };
  }
}
