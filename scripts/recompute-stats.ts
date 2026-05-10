import { getFirebaseAdmin } from '../services/firebase/server-config';
import { Performance } from '../app/lib/cricket-schema';
import { mapFirestoreToPerformance } from '../app/lib/firestore-mapper';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

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
      
      stats.bowl_balls += matchBalls;
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

async function run() {
  console.log('Fetching all performances...');
  const db = getFirebaseAdmin();
  const perfsSnapshot = await db.collection('performances').get();
  
  const allPerfs = perfsSnapshot.docs.map(doc => 
    mapFirestoreToPerformance({ id: doc.id, ...doc.data() })
  );

  console.log(`Found ${allPerfs.length} performances.`);

  // Group by player
  const playerPerfs = new Map<string, { name: string, perfs: Performance[] }>();
  for (const perf of allPerfs) {
    if (!playerPerfs.has(perf.playerId)) {
      playerPerfs.set(perf.playerId, { name: perf.playerName, perfs: [] });
    }
    playerPerfs.get(perf.playerId)!.perfs.push(perf);
  }

  const batch = db.batch();
  let count = 0;

  for (const [pid, { name, perfs }] of Array.from(playerPerfs.entries())) {
    // 1. All Time
    const allTimeRef = db.collection('player_stats_alltime').doc(pid);
    batch.set(allTimeRef, aggregateStats(perfs, name, pid));
    count++;

    // 2. Yearly
    const perfsByYear = new Map<string, Performance[]>();
    for (const p of perfs) {
      if (!perfsByYear.has(p.year)) perfsByYear.set(p.year, []);
      perfsByYear.get(p.year)!.push(p);
    }
    for (const [year, yPerfs] of Array.from(perfsByYear.entries())) {
      const yRef = db.collection('player_stats_yearly').doc(`${pid}_${year}`);
      batch.set(yRef, aggregateStats(yPerfs, name, pid, { year }));
      count++;
    }

    // 3. Monthly
    const perfsByMonth = new Map<string, Performance[]>();
    for (const p of perfs) {
      if (!perfsByMonth.has(p.month)) perfsByMonth.set(p.month, []);
      perfsByMonth.get(p.month)!.push(p);
    }
    for (const [month, mPerfs] of Array.from(perfsByMonth.entries())) {
      const year = month.split('-')[0];
      const mRef = db.collection('player_stats_monthly').doc(`${pid}_${month}`);
      batch.set(mRef, aggregateStats(mPerfs, name, pid, { month, year }));
      count++;
    }
  }

  console.log(`Committing ${count} updated stats documents...`);
  await batch.commit();
  console.log('Done! All stats are completely synchronized.');
}

run().catch(console.error);
