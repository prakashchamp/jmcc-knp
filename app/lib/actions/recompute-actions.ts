'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance } from '@/app/lib/firestore-mapper';

/**
 * Aggregates a list of performances into a unified stats object.
 * This is the sole source of truth for stats calculation.
 */
export async function aggregateStats(performances: Performance[], playerName: string, playerId: string, extras: any = {}) {
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

  // Derived fields (Safe to keep in DB so we don't break frontend expectations)
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

/**
 * Completely rebuilds all stats for a set of players using chunked batch writes.
 * Supports up to thousands of players without hitting the 500-doc Firestore limit.
 */
export async function recomputeStatsForPlayers(playerIds: string[]) {
  if (!playerIds || playerIds.length === 0) return 0;
  
  const db = getFirebaseAdmin();
  
  // 1. Fetch ALL performances for affected players
  // Chunk playerIds to bypass the 30-item 'in' limit
  const CHUNK = 30;
  const idChunks: string[][] = [];
  for (let i = 0; i < playerIds.length; i += CHUNK) {
    idChunks.push(playerIds.slice(i, i + CHUNK));
  }

  const allPerfs: Performance[] = [];
  for (const chunk of idChunks) {
    const snap = await db.collection('performances').where('player_id', 'in', chunk).get();
    snap.docs.forEach(d => allPerfs.push(mapFirestoreToPerformance({ id: d.id, ...d.data() })));
  }

  // Group by playerId
  const playerPerfs = new Map<string, { name: string, perfs: Performance[] }>();
  // Initialize with empty arrays so even players with 0 performances get processed (deleted)
  for (const pid of playerIds) {
    playerPerfs.set(pid, { name: 'Unknown', perfs: [] });
  }

  for (const perf of allPerfs) {
    if (!playerPerfs.has(perf.playerId)) {
      playerPerfs.set(perf.playerId, { name: perf.playerName, perfs: [] });
    }
    const record = playerPerfs.get(perf.playerId)!;
    record.name = perf.playerName; // take the latest name
    record.perfs.push(perf);
  }

  // 2. Prepare chunked batches for writes
  let currentBatch = db.batch();
  let operationCount = 0;
  let totalWrites = 0;

  const commitBatchIfNeeded = async (force = false) => {
    if (operationCount >= 400 || (force && operationCount > 0)) {
      await currentBatch.commit();
      currentBatch = db.batch();
      totalWrites += operationCount;
      operationCount = 0;
    }
  };

  const queueWrite = async (ref: admin.firestore.DocumentReference, data: any | null) => {
    if (data === null) {
      currentBatch.delete(ref);
    } else {
      currentBatch.set(ref, data);
    }
    operationCount++;
    await commitBatchIfNeeded();
  };

  // 3. Compute and Queue all writes
  for (const [pid, { name, perfs }] of Array.from(playerPerfs.entries())) {
    
    // --- All Time ---
    const allTimeRef = db.collection('player_stats_alltime').doc(pid);
    if (perfs.length > 0) {
      await queueWrite(allTimeRef, await aggregateStats(perfs, name, pid));
    } else {
      await queueWrite(allTimeRef, null); // Delete if 0 matches left
    }

    // --- Yearly ---
    // First, find all unique years this player has EVER played in
    // Note: We don't delete empty years easily here because we only know the years they *currently* have.
    // However, if a match was just deleted, they might have 0 matches in a year.
    // To be perfectly robust, we'd fetch existing yearly docs. But a quick fix is to always overwrite whatever is in DB.
    // Since we are moving completely to recompute, we can fetch their existing stat docs and see what needs deleting.
    const yearlySnap = await db.collection('player_stats_yearly').where('player_id', '==', pid).get();
    const existingYears = new Set(yearlySnap.docs.map(d => d.data().year as string).filter(Boolean));
    
    const perfsByYear = new Map<string, Performance[]>();
    for (const p of perfs) {
      if (!perfsByYear.has(p.year)) perfsByYear.set(p.year, []);
      perfsByYear.get(p.year)!.push(p);
      existingYears.add(p.year);
    }
    
    for (const year of Array.from(existingYears)) {
      const yRef = db.collection('player_stats_yearly').doc(`${pid}_${year}`);
      const yPerfs = perfsByYear.get(year) || [];
      if (yPerfs.length > 0) {
        await queueWrite(yRef, await aggregateStats(yPerfs, name, pid, { year }));
      } else {
        await queueWrite(yRef, null);
      }
    }

    // --- Monthly ---
    const monthlySnap = await db.collection('player_stats_monthly').where('player_id', '==', pid).get();
    const existingMonths = new Set(monthlySnap.docs.map(d => d.data().month as string).filter(Boolean));

    const perfsByMonth = new Map<string, Performance[]>();
    for (const p of perfs) {
      if (!perfsByMonth.has(p.month)) perfsByMonth.set(p.month, []);
      perfsByMonth.get(p.month)!.push(p);
      existingMonths.add(p.month);
    }
    
    for (const month of Array.from(existingMonths)) {
      const mRef = db.collection('player_stats_monthly').doc(`${pid}_${month}`);
      const mPerfs = perfsByMonth.get(month) || [];
      if (mPerfs.length > 0) {
        const year = month.split('-')[0];
        await queueWrite(mRef, await aggregateStats(mPerfs, name, pid, { month, year }));
      } else {
        await queueWrite(mRef, null);
      }
    }
  }

  // Commit remaining
  await commitBatchIfNeeded(true);
  
  return totalWrites;
}
