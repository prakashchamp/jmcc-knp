import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// ─── Exact mirror of calculateUpdatedStats ────────────────────────────────────
function calculateUpdatedStats(doc: admin.firestore.DocumentSnapshot, perf: any, scope: any) {
  const stats: any = (doc.exists ? { ...doc.data() } : null) || {
    player_id: perf.playerId, player_name: perf.playerName,
    matches: 0,
    bat_innings: 0, bat_runs: 0, bat_balls: 0, bat_zeros: 0, bat_fours: 0, bat_sixes: 0,
    bat_dismissed: 0, bat_not_out: 0, bat_highest: 0, bat_ducks: 0,
    bat_thirties: 0, bat_fifties: 0, bat_hundreds: 0,
    bowl_innings: 0, bowl_overs: 0, bowl_balls: 0, bowl_runs: 0,
    bowl_wickets: 0, bowl_maidens: 0, bowl_best_wickets: 0, bowl_best_runs: 0,
    bowl_three_fers: 0, bowl_four_fers: 0, bowl_five_fers: 0,
  };
  if (scope.year) stats.year = scope.year;
  if (scope.month) stats.month = scope.month;
  stats.matches += 1;
  stats.last_updated = admin.firestore.Timestamp.now();
  if (perf.batting.didBat) {
    stats.bat_innings += 1;
    stats.bat_runs += perf.batting.runs;
    stats.bat_balls += perf.batting.balls;
    stats.bat_zeros += perf.batting.zeros || 0;
    stats.bat_fours += perf.batting.fours;
    stats.bat_sixes += perf.batting.sixes;
    if (perf.batting.dismissed) stats.bat_dismissed += 1;
    else stats.bat_not_out += 1;
    stats.bat_highest = Math.max(stats.bat_highest || 0, perf.batting.runs);
    if (perf.batting.isDuck) stats.bat_ducks += 1;
    if (perf.batting.isThirty) stats.bat_thirties += 1;
    if (perf.batting.isFifty) stats.bat_fifties += 1;
    if (perf.batting.isHundred) stats.bat_hundreds += 1;
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }
  if (perf.bowling.didBowl) {
    stats.bowl_innings += 1;
    stats.bowl_runs += perf.bowling.runs;
    stats.bowl_wickets += perf.bowling.wickets;
    const wholeOvers = Math.floor(perf.bowling.overs);
    const extraBalls = Math.round((perf.bowling.overs % 1) * 10);
    stats.bowl_balls += wholeOvers * 6 + extraBalls;
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens += perf.bowling.maidens;
    if (perf.bowling.wickets > (stats.bowl_best_wickets || 0)) {
      stats.bowl_best_wickets = perf.bowling.wickets;
      stats.bowl_best_runs = perf.bowling.runs;
      stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
    } else if (perf.bowling.wickets === stats.bowl_best_wickets && perf.bowling.runs < (stats.bowl_best_runs || 999)) {
      stats.bowl_best_runs = perf.bowling.runs;
      stats.bowl_best = `${perf.bowling.wickets}/${perf.bowling.runs}`;
    }
    if (perf.bowling.isThreeFer) stats.bowl_three_fers += 1;
    if (perf.bowling.isFourFer) stats.bowl_four_fers += 1;
    if (perf.bowling.isFiveFer) stats.bowl_five_fers += 1;
    stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
    const totalOvers = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
    stats.bowl_economy = totalOvers > 0 ? stats.bowl_runs / totalOvers : 0;
    stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
  }
  return stats;
}

function buildPerformances(rawPerfs: any[], roster: any[], matchId: string, matchDate: string, year: string, month: string, opponent: string) {
  return rawPerfs.map((rp) => {
    const player = roster.find((p: any) => p.name.toLowerCase() === rp.name.toLowerCase());
    const playerId = player?.id || `player_${rp.name.toLowerCase().replace(/\s+/g, '_')}`;
    if (!player) console.log(`  New player: ${rp.name} → ${playerId}`);
    const bat = rp.bat;
    const bowl = rp.bowl;
    const bowlBalls = Math.floor(bowl.overs) * 6 + Math.round((bowl.overs % 1) * 10);
    return {
      id: `${matchId}_${playerId}`,
      matchId, playerId, playerName: rp.name,
      date: matchDate, year, month, opponent,
      batting: {
        didBat: bat.didBat, innings: bat.didBat ? 1 : 0,
        runs: bat.runs, balls: bat.balls,
        zeros: bat.zeros ?? (bat.didBat ? Math.max(0, bat.balls - bat.fours - bat.sixes) : 0),
        fours: bat.fours, sixes: bat.sixes, dismissed: bat.dismissed,
        isDuck: bat.didBat && bat.runs === 0 && bat.dismissed,
        isThirty: bat.runs >= 30 && bat.runs < 50,
        isFifty: bat.runs >= 50 && bat.runs < 100,
        isHundred: bat.runs >= 100,
        strikeRate: bat.balls > 0 ? (bat.runs / bat.balls) * 100 : 0,
      },
      bowling: {
        didBowl: bowl.didBowl, innings: bowl.didBowl ? 1 : 0,
        overs: bowl.overs, balls: bowlBalls,
        runs: bowl.runs, wickets: bowl.wickets, maidens: bowl.maidens ?? 0,
        isThreeFer: bowl.wickets === 3, isFourFer: bowl.wickets === 4, isFiveFer: bowl.wickets >= 5,
        economy: bowl.overs > 0 ? bowl.runs / bowl.overs : 0,
      },
      createdAt: new Date().toISOString(),
    };
  });
}

async function uploadMatch(config: { matchDate: string; year: string; month: string; rawMatch: any; rawPerformances: any[] }) {
  const { matchDate, year, month, rawMatch, rawPerformances } = config;
  const rosterSnap = await db.collection('jmcc_spartans_singleton').doc('roster').get();
  const roster = rosterSnap.data()?.players || [];
  const matchId = `match_${Date.now()}`;
  const matchData = { ...rawMatch, id: matchId, date: matchDate, year, month, created_at: new Date().toISOString() };
  const performances = buildPerformances(rawPerformances, roster, matchId, matchDate, year, month, rawMatch.opponent);

  await db.runTransaction(async (transaction) => {
    const statsToUpdate: { ref: admin.firestore.DocumentReference; perf: any; scope: any }[] = [];
    for (const perf of performances) {
      for (const scope of [
        { coll: 'player_stats_alltime', id: perf.playerId },
        { coll: 'player_stats_yearly',  id: `${perf.playerId}_${year}`, year },
        { coll: 'player_stats_monthly', id: `${perf.playerId}_${month}`, month, year },
      ]) statsToUpdate.push({ ref: db.collection(scope.coll).doc(scope.id), perf, scope });
    }
    const statsDocs = statsToUpdate.length > 0 ? await transaction.getAll(...statsToUpdate.map(s => s.ref)) : [];
    transaction.set(db.collection('matches').doc(matchId), matchData);
    for (const perf of performances) {
      transaction.set(db.collection('performances').doc(perf.id), {
        match_id: perf.matchId, player_id: perf.playerId, player_name: perf.playerName,
        date: perf.date, year: perf.year, month: perf.month, opponent: perf.opponent,
        bat_did_bat: perf.batting.didBat, bat_innings: perf.batting.innings,
        bat_runs: perf.batting.runs, bat_balls: perf.batting.balls, bat_zeros: perf.batting.zeros,
        bat_fours: perf.batting.fours, bat_sixes: perf.batting.sixes,
        bat_dismissed: perf.batting.dismissed, bat_is_duck: perf.batting.isDuck,
        bat_is_thirty: perf.batting.isThirty, bat_is_fifty: perf.batting.isFifty,
        bat_is_hundred: perf.batting.isHundred, bat_strike_rate: perf.batting.strikeRate,
        bowl_did_bowl: perf.bowling.didBowl, bowl_innings: perf.bowling.innings,
        bowl_overs: perf.bowling.overs, bowl_balls: perf.bowling.balls,
        bowl_runs: perf.bowling.runs, bowl_wickets: perf.bowling.wickets,
        bowl_maidens: perf.bowling.maidens, bowl_is_three_fer: perf.bowling.isThreeFer,
        bowl_is_four_fer: perf.bowling.isFourFer, bowl_is_five_fer: perf.bowling.isFiveFer,
        bowl_economy: perf.bowling.economy, created_at: perf.createdAt,
      });
    }
    statsToUpdate.forEach((item, i) => transaction.set(item.ref, calculateUpdatedStats(statsDocs[i], item.perf, item.scope)));
  });
  console.log(`✓ Uploaded: ${rawMatch.opponent} (${matchDate.slice(0, 10)})`);
  // small delay to avoid same matchId timestamp
  await new Promise(r => setTimeout(r, 100));
}

async function deleteCollection(collName: string) {
  const snap = await db.collection(collName).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  cleared: ${collName} (${snap.size} docs)`);
}

// MATCH 13 — Vadasithur | May 3, 2026 | Home | Won by 13 runs
uploadMatch({
  matchDate: '2026-05-03T09:00:00.000Z', year: '2026', month: '2026-05',
  rawMatch: {
    opponent: 'Vadasithur', venue: 'Home', result: 'won', winMargin: '13 runs',
    teamRuns: 104, teamWickets: 5, teamOversPlayed: 17.0,
    opponentRuns: 91, opponentWickets: 8, opponentOversPlayed: 17.0,
    totalOvers: 17, tossWonBy: 'Vadasithur', tossDecision: 'Bowl',
  },
  rawPerformances: [
    { name: 'Karthi',       bat: { didBat: true,  runs: 0,  balls: 2,  zeros: 1,  fours: 0, sixes: 0, dismissed: true  }, bowl: { didBowl: false, overs: 0,   runs: 0,  wickets: 0, maidens: 0 } },
    { name: 'Nagaraj',      bat: { didBat: true,  runs: 14, balls: 14, zeros: 7,  fours: 2, sixes: 0, dismissed: true  }, bowl: { didBowl: true,  overs: 1.0, runs: 7,  wickets: 1, maidens: 0 } },
    { name: 'Prakash',      bat: { didBat: true,  runs: 3,  balls: 12, zeros: 8,  fours: 0, sixes: 0, dismissed: true  }, bowl: { didBowl: false, overs: 0,   runs: 0,  wickets: 0, maidens: 0 } },
    { name: 'Tamil',        bat: { didBat: true,  runs: 18, balls: 25, zeros: 12, fours: 1, sixes: 0, dismissed: true  }, bowl: { didBowl: false, overs: 0,   runs: 0,  wickets: 0, maidens: 0 } },
    { name: 'Nithish',      bat: { didBat: true,  runs: 29, balls: 23, zeros: 11, fours: 2, sixes: 2, dismissed: true  }, bowl: { didBowl: true,  overs: 4.0, runs: 11, wickets: 1, maidens: 2 } },
    { name: 'Elango',       bat: { didBat: true,  runs: 19, balls: 21, zeros: 12, fours: 1, sixes: 1, dismissed: false }, bowl: { didBowl: false, overs: 0,   runs: 0,  wickets: 0, maidens: 0 } },
    { name: 'Jeeva',        bat: { didBat: true,  runs: 12, balls: 6,  zeros: 2,  fours: 0, sixes: 1, dismissed: false }, bowl: { didBowl: false, overs: 0,   runs: 0,  wickets: 0, maidens: 0 } },
    { name: 'Siva Shankar', bat: { didBat: false, runs: 0,  balls: 0,  zeros: 0,  fours: 0, sixes: 0, dismissed: false }, bowl: { didBowl: true,  overs: 3.0, runs: 13, wickets: 0, maidens: 1 } },
    { name: 'Kavi',         bat: { didBat: false, runs: 0,  balls: 0,  zeros: 0,  fours: 0, sixes: 0, dismissed: false }, bowl: { didBowl: true,  overs: 2.0, runs: 28, wickets: 1, maidens: 0 } },
    { name: 'Giri',         bat: { didBat: false, runs: 0,  balls: 0,  zeros: 0,  fours: 0, sixes: 0, dismissed: false }, bowl: { didBowl: true,  overs: 4.0, runs: 19, wickets: 3, maidens: 0 } },
    { name: 'Madhan',       bat: { didBat: false, runs: 0,  balls: 0,  zeros: 0,  fours: 0, sixes: 0, dismissed: false }, bowl: { didBowl: true,  overs: 3.0, runs: 13, wickets: 2, maidens: 0 } },
  ],
}).catch(console.error);

