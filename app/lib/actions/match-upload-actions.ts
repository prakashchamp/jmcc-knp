'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { LiveMatch, TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { createNewPlayer } from '@/app/lib/player-utils';
import * as admin from 'firebase-admin';
import { mapMatchToFirestore, mapPerformanceToFirestore, findBestBatter, findBestBowler, findTopBatters, findTopBowlers } from '@/app/lib/firestore-mapper';
import { Performance, Match } from '@/app/lib/cricket-schema';

function getISTYearMonth(dateString: string) {
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

/**
 * Server Action for manual scorecard upload (OCR/Manual Entry)
 * Ensures stats are updated and field names are mapped to snake_case.
 */
export async function uploadManualMatchAction(match: Match, performances: Performance[]) {
  const db = getFirebaseAdmin();
  const matchId = match.id;
  const { year, month } = getISTYearMonth(match.date);

  try {
    // RESOLVE TRUE PLAYER IDs BEFORE TRANSACTION
    // Targeted player lookup instead of full collection fetch
    const namesToLookup = performances.map(p => p.playerName.trim());
    const uniqueNames = Array.from(new Set(namesToLookup));
    const existingPlayers = new Map<string, string>();
    const existingNames = new Set<string>();

    if (uniqueNames.length > 0) {
      // Chunk names into groups of 30 for 'in' query
      for (let i = 0; i < uniqueNames.length; i += 30) {
        const chunk = uniqueNames.slice(i, i + 30);
        const playersSnapshot = await db.collection('players')
          .where('name', 'in', chunk)
          .get();
        
        playersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const nameKey = data.name.toLowerCase().trim();
          existingPlayers.set(nameKey, doc.id);
          existingNames.add(nameKey);
        });
      }
    }

    for (const perf of performances) {
      const nameKey = perf.playerName.toLowerCase().trim();
      const trueId = existingPlayers.get(nameKey);
      if (trueId) {
        perf.playerId = trueId;
      } else {
        // Create new player with collision handling
        const newPlayer = createNewPlayer(perf.playerName, existingNames);
        perf.playerId = newPlayer.id;
        perf.playerName = newPlayer.name; // Update name if collision occurred
        existingPlayers.set(newPlayer.name.toLowerCase().trim(), newPlayer.id);
        existingNames.add(newPlayer.name.toLowerCase().trim());
      }
      perf.id = `${matchId}_${perf.playerId}`;
    }

    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (matchDoc.exists) {
        throw new Error('Match ID already exists. Please try again.');
      }

      // Collect all stats references
      const statsToUpdate: { ref: admin.firestore.DocumentReference, perf: Performance, scope: any }[] = [];
      for (const perf of performances) {
        if (!perf.batting.didBat && !perf.bowling.didBowl) continue;

        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${year}`, year },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${month}`, month, year }
        ];

        for (const scope of scopes) {
          statsToUpdate.push({
            ref: db.collection(scope.coll).doc(scope.id),
            perf,
            scope
          });
        }
      }

      // 1. PERFORM ALL READS
      const statsDocs = statsToUpdate.length > 0 
        ? await transaction.getAll(...statsToUpdate.map(s => s.ref))
        : [];

      // Get unique players from performances
      const uniquePlayers = Array.from(new Map(performances.map(p => [p.playerId, p.playerName])).entries());
      const playerRefs = uniquePlayers.map(([id]) => db.collection('players').doc(id));
      const playerDocs = playerRefs.length > 0 ? await transaction.getAll(...playerRefs) : [];

      // Get singleton team
      const teamRef = db.collection('teams').doc('jmcc_spartans_singleton');
      const teamDoc = await transaction.get(teamRef);

      // 2. PERFORM ALL WRITES
      // Create missing players and collect them
      const newTeamPlayers: any[] = [];
      playerDocs.forEach((doc, index) => {
        if (!doc.exists) {
          const [playerId, playerName] = uniquePlayers[index];
          transaction.set(doc.ref, {
            name: playerName,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          newTeamPlayers.push({ id: playerId, name: playerName });
        }
      });

      // Update singleton team with new players
      if (newTeamPlayers.length > 0 && teamDoc.exists) {
        const teamData = teamDoc.data() as any;
        const existingPlayers = teamData.players || [];
        const existingPlayerIds = new Set(existingPlayers.map((p: any) => p.id));
        
        const playersToAdd = newTeamPlayers.filter(p => !existingPlayerIds.has(p.id));
        if (playersToAdd.length > 0) {
          transaction.update(teamRef, {
            players: [...existingPlayers, ...playersToAdd],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Calculate top batters and bowlers
      const topBatters = findTopBatters(performances);
      const topBowlers = findTopBowlers(performances);
      
      // Save match with snake_case fields
      const mappedMatch = {
        ...mapMatchToFirestore({
          id: match.id,
          createdAt: match.date,
          opponent: match.opponent,
          venue: match.venue,
          tossWonBy: match.tossWonBy,
          tossDecision: match.tossDecision,
          result: match.result,
          winMargin: match.winMargin,
          totalOvers: match.totalOvers || 20,
          status: 'complete'
        } as any),
        top_batters: topBatters,
        top_bowlers: topBowlers,
        best_batter_id: match.bestBatterId || topBatters[0]?.playerId || '',
        best_batter_name: match.bestBatterName || topBatters[0]?.playerName || '',
        best_batter_runs: match.bestBatterRuns || topBatters[0]?.runs || 0,
        best_batter_balls: match.bestBatterBalls || topBatters[0]?.balls || 0,
        best_bowler_id: match.bestBowlerId || topBowlers[0]?.playerId || '',
        best_bowler_name: match.bestBowlerName || topBowlers[0]?.playerName || '',
        best_bowler_wickets: match.bestBowlerWickets || topBowlers[0]?.wickets || 0,
        best_bowler_runs: match.bestBowlerRuns || topBowlers[0]?.runs || 0,
        first_innings_team: match.firstInningsTeam || '',
        first_innings_score: match.firstInningsScore || 0,
        team_runs: match.teamRuns || 0,
        team_wickets: match.teamWickets || 0,
        opponent_runs: match.opponentRuns || 0,
        opponent_wickets: match.opponentWickets || 0,
        created_at: match.createdAt || new Date().toISOString(),
      };
      
      transaction.set(matchRef, mappedMatch);

      // Save performances with snake_case fields
      for (const perf of performances) {
        const perfRef = db.collection('performances').doc(perf.id);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }

      // Update aggregate stats
      statsToUpdate.forEach((item, index) => {
        const doc = statsDocs[index];
        const updatedStats = calculateUpdatedStats(doc, item.perf, item.scope);
        transaction.set(item.ref, updatedStats);
      });
    });

    return { success: true, matchId };
  } catch (error: any) {
    console.error('Manual Upload Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action to upload a completed match to Firestore
 * and update all relevant statistics (player, team, monthly, yearly).
 * This ensures idempotency by checking if the match already exists.
 */
export async function uploadMatchToCloudAction(match: LiveMatch) {
  if (match.status !== 'complete') {
    throw new Error('Only completed matches can be uploaded.');
  }

  const db = getFirebaseAdmin();
  const matchId = match.id;
  const completedAt = match.completedAt || new Date().toISOString();
  const { year, month } = getISTYearMonth(completedAt);

  // 1. Calculate Performances
  const performances = calculatePerformancesFromStats(match);

  // RESOLVE TRUE PLAYER IDs BEFORE TRANSACTION
  // Targeted player lookup instead of full collection fetch
  const namesToLookup = performances.map(p => p.playerName.trim());
  const uniqueNames = Array.from(new Set(namesToLookup));
  const existingPlayers = new Map<string, string>();
  const existingNames = new Set<string>();

  if (uniqueNames.length > 0) {
    for (let i = 0; i < uniqueNames.length; i += 30) {
      const chunk = uniqueNames.slice(i, i + 30);
      const playersSnapshot = await db.collection('players')
        .where('name', 'in', chunk)
        .get();
      
      playersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const nameKey = data.name.toLowerCase().trim();
        existingPlayers.set(nameKey, doc.id);
        existingNames.add(nameKey);
      });
    }
  }

  for (const perf of performances) {
    const nameKey = perf.playerName.toLowerCase().trim();
    const trueId = existingPlayers.get(nameKey);
    if (trueId) {
      perf.playerId = trueId;
    } else {
      // Create new player with collision handling
      const newPlayer = createNewPlayer(perf.playerName, existingNames);
      perf.playerId = newPlayer.id;
      perf.playerName = newPlayer.name; // Update name if collision occurred
      existingPlayers.set(newPlayer.name.toLowerCase().trim(), newPlayer.id);
      existingNames.add(newPlayer.name.toLowerCase().trim());
    }
    perf.id = `${matchId}_${perf.playerId}`;
    
    // Also update match teamPlayers with true ID so match data is consistent
    const teamPlayer = match.teamPlayers.find(p => p.name.toLowerCase().trim() === nameKey);
    if (teamPlayer) {
      teamPlayer.id = perf.playerId;
      teamPlayer.name = perf.playerName; // Update name if collision occurred
    }
  }

  const topBatters = findTopBatters(performances);
  const topBowlers = findTopBowlers(performances);
  const bestBatter = findBestBatter(performances);
  const bestBowler = findBestBowler(performances);
  
  // Extract team and opponent scores
  const ourInnings = match.innings.find(i => i.battingTeam === 'Us');
  const opponentInnings = match.innings.find(i => i.battingTeam === 'Them');
  
  const teamRuns = ourInnings?.totalRuns || 0;
  const teamWickets = ourInnings?.totalWickets || 0;
  const opponentRuns = opponentInnings?.totalRuns || 0;
  const opponentWickets = opponentInnings?.totalWickets || 0;

  // 2. Prepare Match Data
  const matchData = {
    ...mapMatchToFirestore(match),
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
    team_runs: teamRuns,
    team_wickets: teamWickets,
    opponent_runs: opponentRuns,
    opponent_wickets: opponentWickets,
    completed_at: completedAt,
    raw_data: JSON.stringify(match),
  };

  try {
    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (matchDoc.exists) {
        throw new Error('Match already uploaded.');
      }

      // Collect all stats references to read them in one batch
      const statsToUpdate: { ref: admin.firestore.DocumentReference, perf: Performance, scope: any }[] = [];
      for (const perf of performances) {
        if (!perf.batting.didBat && !perf.bowling.didBowl) continue;

        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${year}`, year },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${month}`, month, year }
        ];

        for (const scope of scopes) {
          statsToUpdate.push({
            ref: db.collection(scope.coll).doc(scope.id),
            perf,
            scope
          });
        }
      }

      // 1. PERFORM ALL READS
      const statsDocs = statsToUpdate.length > 0 
        ? await transaction.getAll(...statsToUpdate.map(s => s.ref))
        : [];
      
      const playerRefs = match.teamPlayers.map(p => db.collection('players').doc(p.id));
      const playerDocs = playerRefs.length > 0 ? await transaction.getAll(...playerRefs) : [];

      // Get singleton team
      const teamRef = db.collection('teams').doc('jmcc_spartans_singleton');
      const teamDoc = await transaction.get(teamRef);

      // 2. PERFORM ALL WRITES
      // Create missing players and collect them
      const newTeamPlayers: any[] = [];
      playerDocs.forEach((doc, index) => {
        if (!doc.exists) {
          const player = match.teamPlayers[index];
          transaction.set(doc.ref, {
            name: player.name,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
          newTeamPlayers.push({ id: player.id, name: player.name });
        }
      });

      // Update singleton team with new players
      if (newTeamPlayers.length > 0 && teamDoc.exists) {
        const teamData = teamDoc.data() as any;
        const existingPlayers = teamData.players || [];
        const existingPlayerIds = new Set(existingPlayers.map((p: any) => p.id));
        
        const playersToAdd = newTeamPlayers.filter(p => !existingPlayerIds.has(p.id));
        if (playersToAdd.length > 0) {
          transaction.update(teamRef, {
            players: [...existingPlayers, ...playersToAdd],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      transaction.set(matchRef, matchData);

      for (const perf of performances) {
        if (!perf.batting.didBat && !perf.bowling.didBowl) continue;
        const perfRef = db.collection('performances').doc(`${matchId}_${perf.playerId}`);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }

      // Update stats based on pre-read data
      statsToUpdate.forEach((item, index) => {
        const doc = statsDocs[index];
        const updatedStats = calculateUpdatedStats(doc, item.perf, item.scope);
        transaction.set(item.ref, updatedStats);
      });
    });

    return { success: true, matchId };
  } catch (error: any) {
    console.error('Upload Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Calculate Performance objects from the aggregated batsmanStats and bowlerStats in the match object.
 */
function calculatePerformancesFromStats(match: LiveMatch): Performance[] {
  const date = match.completedAt || new Date().toISOString();
  const { year, month } = getISTYearMonth(date);

  return match.teamPlayers.map(player => {
    // Find batting stats for this player
    let batStats = match.innings.find(i => i.battingTeam === 'Us')?.batsmanStats.find(b => b.id === player.id);
    // Find bowling stats for this player
    let bowlStats = match.innings.find(i => i.battingTeam === 'Them')?.bowlerStats.find(b => b.id === player.id);

    const perf: Performance = {
      id: `${match.id}_${player.id}`,
      matchId: match.id,
      playerId: player.id,
      playerName: player.name,
      date,
      year,
      month,
      opponent: match.opponent,
      createdAt: new Date().toISOString(),
      batting: {
        didBat: !!batStats,
        innings: batStats ? 1 : 0,
        runs: batStats?.runs || 0,
        balls: batStats?.balls || 0,
        fours: batStats?.fours || 0,
        sixes: batStats?.sixes || 0,
        dismissed: batStats?.status === 'out',
        isDuck: batStats?.status === 'out' && batStats?.runs === 0,
        isThirty: (batStats?.runs || 0) >= 30 && (batStats?.runs || 0) < 50,
        isFifty: (batStats?.runs || 0) >= 50 && (batStats?.runs || 0) < 100,
        isHundred: (batStats?.runs || 0) >= 100,
        strikeRate: batStats?.strikeRate || 0,
      },
      bowling: {
        didBowl: !!bowlStats,
        innings: bowlStats ? 1 : 0,
        overs: bowlStats?.overs || 0,
        balls: 0, // Overs field already includes ball info (e.g. 3.2)
        runs: bowlStats?.runs || 0,
        wickets: bowlStats?.wickets || 0,
        maidens: bowlStats?.maidens || 0,
        isThreeFer: (bowlStats?.wickets || 0) === 3,
        isFourFer: (bowlStats?.wickets || 0) === 4,
        isFiveFer: (bowlStats?.wickets || 0) >= 5,
        economy: bowlStats?.economy || 0,
      }
    };
    return perf;
  });
}

/**
 * Update player stats in a transaction to handle max values (highest score, best bowling).
 */
/**
 * Calculate updated player stats based on current stats doc and performance.
 */
function calculateUpdatedStats(
  doc: admin.firestore.DocumentSnapshot,
  perf: Performance,
  scope: any
) {
  const stats: any = (doc.exists ? doc.data() : null) || {
    player_id: perf.playerId,
    player_name: perf.playerName,
    matches: 0,
    bat_innings: 0, bat_runs: 0, bat_balls: 0, bat_fours: 0, bat_sixes: 0, 
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
    stats.bat_fours += perf.batting.fours;
    stats.bat_sixes += perf.batting.sixes;
    if (perf.batting.dismissed) stats.bat_dismissed += 1;
    else stats.bat_not_out += 1;
    
    stats.bat_highest = Math.max(stats.bat_highest || 0, perf.batting.runs);
    if (perf.batting.isDuck) stats.bat_ducks += 1;
    if (perf.batting.isThirty) stats.bat_thirties += 1;
    if (perf.batting.isFifty) stats.bat_fifties += 1;
    if (perf.batting.isHundred) stats.bat_hundreds += 1;
    
    // Recompute average/SR
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }

  if (perf.bowling.didBowl) {
    stats.bowl_innings += 1;
    stats.bowl_runs += perf.bowling.runs;
    stats.bowl_wickets += perf.bowling.wickets;
    
    // Calculate total balls from fractional overs
    const wholeOvers = Math.floor(perf.bowling.overs);
    const extraBalls = Math.round((perf.bowling.overs % 1) * 10);
    const matchBalls = wholeOvers * 6 + extraBalls;
    
    stats.bowl_balls += matchBalls;
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens += perf.bowling.maidens;
    
    // Best Bowling logic
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

    // Recompute average/econ/SR
    stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
    const totalOvers = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
    stats.bowl_economy = totalOvers > 0 ? stats.bowl_runs / totalOvers : 0;
    stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
  }

  return stats;
}
