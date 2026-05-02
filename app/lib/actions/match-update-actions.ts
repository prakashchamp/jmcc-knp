'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance, Match } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance, mapPerformanceToFirestore, mapMatchToFirestore, findTopBatters, findTopBowlers, findBestBatter, findBestBowler } from '@/app/lib/firestore-mapper';
import { sendMatchUpdateNotification } from './notification-actions';
import { recomputeBestForPlayers } from '@/app/api/recompute-best/route';

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
/**
 * Aggregates a list of performances into a stats object
 */
function aggregateStats(performances: Performance[], playerName: string, playerId: string, extras: any = {}) {
  const stats: any = {
    player_id: playerId,
    player_name: playerName,
    matches: performances.length,
    bat_innings: 0, bat_runs: 0, bat_balls: 0, bat_fours: 0, bat_sixes: 0, 
    bat_dismissed: 0, bat_not_out: 0, bat_highest: 0, bat_ducks: 0, 
    bat_thirties: 0, bat_fifties: 0, bat_hundreds: 0,
    bowl_innings: 0, bowl_overs: 0, bowl_balls: 0, bowl_runs: 0, 
    bowl_wickets: 0, bowl_maidens: 0, bowl_best_wickets: 0, bowl_best_runs: 0, bowl_best: '',
    bowl_three_fers: 0, bowl_four_fers: 0, bowl_five_fers: 0,
    last_updated: admin.firestore.Timestamp.now(),
    ...extras
  };

  for (const perf of performances) {
    if (perf.batting.didBat) {
      stats.bat_innings += (perf.batting.innings || 0);
      stats.bat_runs += perf.batting.runs;
      stats.bat_balls += perf.batting.balls;
      stats.bat_fours += (perf.batting.fours || 0);
      stats.bat_sixes += (perf.batting.sixes || 0);
      if (perf.batting.dismissed) stats.bat_dismissed += 1;
      else stats.bat_not_out += 1;
      
      stats.bat_highest = Math.max(stats.bat_highest, perf.batting.runs);
      if (perf.batting.isDuck) stats.bat_ducks += 1;
      if (perf.batting.isThirty) stats.bat_thirties += 1;
      if (perf.batting.isFifty) stats.bat_fifties += 1;
      if (perf.batting.isHundred) stats.bat_hundreds += 1;
    }

    if (perf.bowling.didBowl) {
      stats.bowl_innings += (perf.bowling.innings || 0);
      stats.bowl_runs += perf.bowling.runs;
      stats.bowl_wickets += perf.bowling.wickets;
      
      const wholeOvers = Math.floor(perf.bowling.overs);
      const extraBalls = Math.round((perf.bowling.overs % 1) * 10);
      const matchBalls = wholeOvers * 6 + extraBalls;
      
      stats.bowl_balls = (stats.bowl_balls || 0) + matchBalls;
      stats.bowl_maidens += (perf.bowling.maidens || 0);
      
      if (perf.bowling.wickets > stats.bowl_best_wickets) {
        stats.bowl_best_wickets = perf.bowling.wickets;
        stats.bowl_best_runs = perf.bowling.runs;
        stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
      } else if (perf.bowling.wickets === stats.bowl_best_wickets) {
        if (perf.bowling.runs < (stats.bowl_best_runs || 999)) {
          stats.bowl_best_runs = perf.bowling.runs;
          stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
        }
      }

      if (perf.bowling.isThreeFer) stats.bowl_three_fers += 1;
      if (perf.bowling.isFourFer) stats.bowl_four_fers += 1;
      if (perf.bowling.isFiveFer) stats.bowl_five_fers += 1;
    }
  }

  // Derived fields
  if (stats.bat_innings > 0) {
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }

  if (stats.bowl_innings > 0) {
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
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

    const affectedPlayerIds = Array.from(new Set([
      ...oldPerfs.map(p => p.playerId),
      ...updatedPerformances.map(p => p.playerId)
    ]));

    // Fetch ALL performances for affected players to ensure accurate Best fields
    const allAffectedPerfsSnapshot = await db.collection('performances')
      .where('player_id', 'in', affectedPlayerIds)
      .get();
    
    const allAffectedPerfs = allAffectedPerfsSnapshot.docs.map(doc => 
      mapFirestoreToPerformance({ id: doc.id, ...doc.data() })
    );

    // Filter out the OLD performances for THIS match from the list, then add the NEW ones
    const basePerfs = allAffectedPerfs.filter(p => p.matchId !== matchId);

    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }

      const oldMatchData = matchDoc.data();
      const oldYear: string = oldMatchData?.year ?? updatedMatch.year;
      const oldMonth: string = oldMatchData?.month ?? updatedMatch.month;
      const newYear = updatedMatch.year;
      const newMonth = updatedMatch.month;

      // Identify affected (playerId, scope) keys
      const affectedKeys = new Set<string>();
      affectedPlayerIds.forEach(pid => {
        affectedKeys.add(`alltime:${pid}`);
        affectedKeys.add(`yearly:${pid}_${oldYear}`);
        affectedKeys.add(`yearly:${pid}_${newYear}`);
        affectedKeys.add(`monthly:${pid}_${oldMonth}`);
        affectedKeys.add(`monthly:${pid}_${newMonth}`);
      });

      const statsMap = new Map<string, any>();

      for (const pid of affectedPlayerIds) {
        const playerPerfs = [
          ...basePerfs.filter(p => p.playerId === pid),
          ...updatedPerformances.filter(p => p.playerId === pid)
        ];
        
        const playerName = updatedPerformances.find(p => p.playerId === pid)?.playerName || 
                           oldPerfs.find(p => p.playerId === pid)?.playerName || 'Unknown';

        // All-time
        if (playerPerfs.length > 0) {
          statsMap.set(`player_stats_alltime/${pid}`, aggregateStats(playerPerfs, playerName, pid));
        } else {
          statsMap.set(`player_stats_alltime/${pid}`, null); // Delete
        }

        // Yearly & Monthly (for both old and new dates)
        const years = Array.from(new Set([oldYear, newYear]));
        const months = Array.from(new Set([oldMonth, newMonth]));

        for (const year of years) {
          const yearlyPerfs = playerPerfs.filter(p => p.year === year);
          const id = `${pid}_${year}`;
          if (yearlyPerfs.length > 0) {
            statsMap.set(`player_stats_yearly/${id}`, aggregateStats(yearlyPerfs, playerName, pid, { year }));
          } else {
            statsMap.set(`player_stats_yearly/${id}`, null);
          }
        }

        for (const month of months) {
          const monthlyPerfs = playerPerfs.filter(p => p.month === month);
          const id = `${pid}_${month}`;
          if (monthlyPerfs.length > 0) {
            const [y, m] = month.split('-');
            statsMap.set(`player_stats_monthly/${id}`, aggregateStats(monthlyPerfs, playerName, pid, { month, year: y }));
          } else {
            statsMap.set(`player_stats_monthly/${id}`, null);
          }
        }
      }

      // 5. Commit all changes
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
      oldPerfsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));
      for (const perf of updatedPerformances) {
        const perfRef = db.collection('performances').doc(perf.id);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }

      // Update stats docs
      statsMap.forEach((stats, key) => {
        const [coll, id] = key.split('/');
        const ref = db.collection(coll).doc(id);
        if (stats === null) {
          transaction.delete(ref);
        } else {
          transaction.set(ref, stats);
        }
      });
      // 2. WRITES completed
    });

    // Fire background job: recompute bowl_best / bat_highest (can't decrement)
    // Scans ALL years/months from perf history for each affected player.
    recomputeBestForPlayers(affectedPlayerIds).catch(e => 
      console.error('[recompute-best] Background job failed:', e)
    );

    // Trigger Push Notification & Cache Clearing
    try {
      await sendMatchUpdateNotification(
        'Stats Corrected!',
        `Match against ${updatedMatch.opponent} was updated by Admin.`,
        { type: 'MATCH_UPDATE' }
      );
    } catch (e) {
      console.error('Notification Error:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateMatchAction Error:', error);
    return { success: false, error: error.message || 'Failed to update match' };
  }
}
