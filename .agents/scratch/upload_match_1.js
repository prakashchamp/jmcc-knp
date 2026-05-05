const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// --- UTILS FROM APP ---
function getISTYearMonth(dateString) {
  const dateObj = new Date(dateString);
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  });
  const parts = istFormatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value || dateObj.getUTCFullYear().toString();
  const monthRaw = parts.find(p => p.type === 'month')?.value || (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  return { year, month: `${year}-${monthRaw}` };
}

function mapMatchToFirestore(match) {
  return {
    opponent: match.opponent,
    venue: match.venue,
    toss_won_by: match.tossWonBy,
    toss_decision: match.tossDecision,
    result: match.result,
    win_margin: match.winMargin,
    total_overs: match.totalOvers,
    team_overs_played: match.teamOversPlayed,
    opponent_overs_played: match.opponentOversPlayed,
    status: match.status || 'complete',
    created_at: match.createdAt || new Date().toISOString()
  };
}

function mapPerformanceToFirestore(perf) {
  return {
    match_id: perf.matchId,
    player_id: perf.playerId,
    player_name: perf.playerName,
    date: perf.date,
    year: perf.year,
    month: perf.month,
    opponent: perf.opponent,
    batting: {
      did_bat: perf.batting.didBat,
      innings: perf.batting.innings,
      runs: perf.batting.runs,
      balls: perf.batting.balls,
      zeros: perf.batting.zeros || 0,
      fours: perf.batting.fours,
      sixes: perf.batting.sixes,
      dismissed: perf.batting.dismissed,
      is_duck: perf.batting.isDuck,
      is_thirty: perf.batting.isThirty,
      is_fifty: perf.batting.isFifty,
      is_hundred: perf.batting.isHundred,
      strike_rate: perf.batting.strikeRate,
    },
    bowling: {
      did_bowl: perf.bowling.didBowl,
      innings: perf.bowling.innings,
      overs: perf.bowling.overs,
      balls: perf.bowling.balls,
      runs: perf.bowling.runs,
      wickets: perf.bowling.wickets,
      maidens: perf.bowling.maidens,
      is_three_fer: perf.bowling.isThreeFer,
      is_four_fer: perf.bowling.isFourFer,
      is_five_fer: perf.bowling.isFiveFer,
      economy: perf.bowling.economy,
    },
    created_at: perf.createdAt || new Date().toISOString()
  };
}

function calculateUpdatedStats(doc, perf, scope) {
  const stats = (doc.exists ? doc.data() : null) || {
    player_id: perf.playerId,
    player_name: perf.playerName,
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
    const matchBalls = wholeOvers * 6 + extraBalls;

    stats.bowl_balls += matchBalls;
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens += perf.bowling.maidens;

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

// --- DATA FOR THIS MATCH ---
const matchId = `match_${Date.now()}`;
const matchDate = '2026-02-01T03:30:00.000Z'; // 09:00 AM IST
const { year, month } = getISTYearMonth(matchDate);

const matchData = {
  id: matchId,
  date: matchDate,
  year,
  month,
  opponent: 'Kuppandagoundanur',
  venue: 'Home',
  tossWonBy: 'Opponent',
  tossDecision: 'bat',
  result: 'won',
  winMargin: '8 wickets',
  teamRuns: 91,
  teamWickets: 2,
  teamOversPlayed: 13.4,
  opponentRuns: 90,
  opponentWickets: 10,
  opponentOversPlayed: 18.0,
  totalOvers: 20,
  firstInningsTeam: 'Kuppandagoundanur',
  firstInningsScore: 90,
  createdAt: new Date().toISOString(),
  status: 'complete'
};

const performances = [
  {
    playerId: '17260021-36f7-4180-87a4-8df656a8770c',
    playerName: 'Karthi',
    batting: { didBat: true, innings: 1, runs: 12, balls: 26, fours: 1, sixes: 0, dismissed: true, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 46.2 },
    bowling: { didBowl: false, innings: 0, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 0 }
  },
  {
    playerId: '9910b125-2ce8-41fe-ab5e-35e333e852da',
    playerName: 'Elango',
    batting: { didBat: true, innings: 1, runs: 31, balls: 24, fours: 6, sixes: 0, dismissed: true, isDuck: false, isThirty: true, isFifty: false, isHundred: false, strikeRate: 129.2 },
    bowling: { didBowl: false, innings: 0, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 0 }
  },
  {
    playerId: '6c709323-89db-4ec3-a6dc-4c3024d2cabd',
    playerName: 'Prakash',
    batting: { didBat: true, innings: 1, runs: 31, balls: 24, fours: 6, sixes: 0, dismissed: false, isDuck: false, isThirty: true, isFifty: false, isHundred: false, strikeRate: 129.2 },
    bowling: { didBowl: true, innings: 1, overs: 2.0, balls: 12, runs: 10, wickets: 0, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 5.0 }
  },
  {
    playerId: '73396929-d6ca-4fed-8c1f-7c79188db50f',
    playerName: 'Tamil',
    batting: { didBat: true, innings: 1, runs: 3, balls: 10, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 30.0 },
    bowling: { didBowl: false, innings: 0, overs: 0, balls: 0, runs: 0, wickets: 0, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 0 }
  },
  {
    playerId: 'f99be862-499e-409a-9057-5f1e43c78dd0',
    playerName: 'Madhan',
    batting: { didBat: false, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 0 },
    bowling: { didBowl: true, innings: 1, overs: 3.0, balls: 18, runs: 29, wickets: 2, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 9.67 }
  },
  {
    playerId: 'ce0a8465-a62c-4eff-8e69-cfd1bb04a860',
    playerName: 'Kavi',
    batting: { didBat: false, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 0 },
    bowling: { didBowl: true, innings: 1, overs: 3.0, balls: 18, runs: 11, wickets: 1, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 3.67 }
  },
  {
    playerId: 'fb774338-e506-4152-9ff2-710247871658',
    playerName: 'Siva Sankar',
    batting: { didBat: false, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 0 },
    bowling: { didBowl: true, innings: 1, overs: 4.0, balls: 24, runs: 20, wickets: 2, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 5.0 }
  },
  {
    playerId: '31f97fae-3f64-4009-9245-9a22477d3574',
    playerName: 'Giri',
    batting: { didBat: false, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 0 },
    bowling: { didBowl: true, innings: 1, overs: 3.0, balls: 18, runs: 9, wickets: 2, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 3.0 }
  },
  {
    playerId: 'f616d001-c852-4eb2-a0ce-a9796e676166',
    playerName: 'Nagaraj',
    batting: { didBat: false, innings: 0, runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false, isDuck: false, isThirty: false, isFifty: false, isHundred: false, strikeRate: 0 },
    bowling: { didBowl: true, innings: 1, overs: 3.0, balls: 18, runs: 7, wickets: 1, maidens: 0, isThreeFer: false, isFourFer: false, isFiveFer: false, economy: 2.33 }
  }
].map(p => ({
  ...p,
  id: `${matchId}_${p.playerId}`,
  matchId,
  date: matchDate,
  year,
  month,
  opponent: matchData.opponent,
  createdAt: new Date().toISOString()
}));

// --- EXECUTION ---
async function uploadMatch() {
  const serviceAccount = {
    project_id: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID,
    client_email: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
    private_key: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  try {
    await db.runTransaction(async (transaction) => {
      // 1. COLLECT ALL READS
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);
      if (matchDoc.exists) throw new Error('Match already exists');

      const statsToRead = [];
      for (const perf of performances) {
        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${year}`, year },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${month}`, month, year }
        ];
        for (const scope of scopes) {
          statsToRead.push({ ref: db.collection(scope.coll).doc(scope.id), perf, scope });
        }
      }

      const statsDocs = await Promise.all(statsToRead.map(s => transaction.get(s.ref)));

      // 2. COLLECT ALL WRITES
      const topBatters = performances
        .filter(p => p.batting.didBat)
        .sort((a, b) => b.batting.runs - a.batting.runs)
        .slice(0, 3)
        .map(p => ({ playerId: p.playerId, playerName: p.playerName, runs: p.batting.runs, balls: p.batting.balls }));

      const topBowlers = performances
        .filter(p => p.bowling.didBowl)
        .sort((a, b) => b.bowling.wickets - a.bowling.wickets || a.bowling.runs - b.bowling.runs)
        .slice(0, 3)
        .map(p => ({ playerId: p.playerId, playerName: p.playerName, wickets: p.bowling.wickets, runs: p.bowling.runs }));

      const mappedMatch = {
        ...mapMatchToFirestore(matchData),
        top_batters: topBatters,
        top_bowlers: topBowlers,
        best_batter_id: topBatters[0]?.playerId || '',
        best_batter_name: topBatters[0]?.playerName || '',
        best_batter_runs: topBatters[0]?.runs || 0,
        best_batter_balls: topBatters[0]?.balls || 0,
        best_bowler_id: topBowlers[0]?.playerId || '',
        best_bowler_name: topBowlers[0]?.playerName || '',
        best_bowler_wickets: topBowlers[0]?.wickets || 0,
        best_bowler_runs: topBowlers[0]?.runs || 0,
        first_innings_team: matchData.firstInningsTeam,
        first_innings_score: matchData.firstInningsScore,
        team_runs: matchData.teamRuns,
        team_wickets: matchData.teamWickets,
        opponent_runs: matchData.opponentRuns,
        opponent_wickets: matchData.opponentWickets,
      };

      transaction.set(matchRef, mappedMatch);

      for (const perf of performances) {
        const perfRef = db.collection('performances').doc(perf.id);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }

      statsToRead.forEach((item, index) => {
        const doc = statsDocs[index];
        const updatedStats = calculateUpdatedStats(doc, item.perf, item.scope);
        transaction.set(item.ref, updatedStats);
      });
    });

    console.log(`Match uploaded successfully: ${matchId}`);
  } catch (error) {
    console.error('Upload Error:', error);
  }
}

uploadMatch().catch(console.error);
