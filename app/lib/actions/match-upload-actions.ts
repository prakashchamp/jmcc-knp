'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { LiveMatch, TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { createNewPlayer } from '@/app/lib/player-utils';
import * as admin from 'firebase-admin';
import { mapMatchToFirestore, mapPerformanceToFirestore, findBestBatter, findBestBowler, findTopBatters, findTopBowlers } from '@/app/lib/firestore-mapper';
import { Performance, Match } from '@/app/lib/cricket-schema';
import { sendMatchUpdateNotification } from './notification-actions';
import { recomputeStatsForPlayers } from './recompute-actions';

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
    // RESOLVE TRUE PLAYER IDs FROM TEAM
    // Fetch JMCC team and get players from team.players
    const teamDoc = await db.collection('teams').doc('jmcc_spartans_singleton').get();
    const teamData = teamDoc.data();
    const teamPlayers = teamData?.players || [];
    const existingPlayers = new Map<string, string>();
    const existingNames = new Set<string>();

    teamPlayers.forEach((player: any) => {
      const nameKey = player.name.toLowerCase().trim();
      existingPlayers.set(nameKey, player.id);
      existingNames.add(nameKey);
    });

    // Add new players to team if needed
    const newPlayersToAdd: any[] = [];
    for (const perf of performances) {
      const nameKey = perf.playerName.toLowerCase().trim();
      let trueId = existingPlayers.get(nameKey);

      // If name didn't match, check if the provided playerId exists
      if (!trueId && perf.playerId) {
        const playerById = teamPlayers.find((p: any) => p.id === perf.playerId);
        if (playerById) {
          trueId = playerById.id;
        }
      }

      if (!trueId) {
        // Create new player
        const newPlayer = createNewPlayer(perf.playerName, existingNames);
        perf.playerId = newPlayer.id;
        perf.playerName = newPlayer.name;
        existingPlayers.set(newPlayer.name.toLowerCase().trim(), newPlayer.id);
        existingNames.add(newPlayer.name.toLowerCase().trim());
        newPlayersToAdd.push(newPlayer);
      } else {
        perf.playerId = trueId;
      }
      perf.id = `${matchId}_${perf.playerId}`;
    }

    // Update team with new players if any
    if (newPlayersToAdd.length > 0) {
      const updatedPlayers = [...teamPlayers, ...newPlayersToAdd].map(p => {
        const clean: any = { id: p.id, name: p.name };
        if (p.jerseyNumber !== undefined) clean.jerseyNumber = p.jerseyNumber;
        return clean;
      });
      await db.collection('teams').doc('jmcc_spartans_singleton').update({
        players: updatedPlayers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (matchDoc.exists) {
        throw new Error('Match ID already exists. Please try again.');
      }

      // Get singleton team
      const teamRef = db.collection('teams').doc('jmcc_spartans_singleton');
      const teamDoc = await transaction.get(teamRef);

      // 2. PERFORM ALL WRITES

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
          teamOversPlayed: match.teamOversPlayed,
          opponentOversPlayed: match.opponentOversPlayed,
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
    });

    // Run unified recompute for affected players
    const affectedPlayerIds = Array.from(new Set(performances.map(p => p.playerId)));
    await recomputeStatsForPlayers(affectedPlayerIds);

    try {
      await sendMatchUpdateNotification(
        'New Match Data!',
        `Match against ${match.opponent} has been uploaded.`,
        { type: 'MATCH_UPDATE' }
      );
    } catch (e) {
      console.error('Notification Error:', e);
    }

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

  // RESOLVE TRUE PLAYER IDs FROM TEAM
  // Fetch JMCC team and get players from team.players
  const teamDoc = await db.collection('teams').doc('jmcc_spartans_singleton').get();
  const teamData = teamDoc.data();
  const teamPlayers = teamData?.players || [];
  const existingPlayers = new Map<string, string>();
  const existingNames = new Set<string>();

  teamPlayers.forEach((player: any) => {
    const nameKey = player.name.toLowerCase().trim();
    existingPlayers.set(nameKey, player.id);
    existingNames.add(nameKey);
  });

  // Add new players to team if needed
  const newPlayersToAdd: any[] = [];
  for (const perf of performances) {
    const nameKey = perf.playerName.toLowerCase().trim();
    const trueId = existingPlayers.get(nameKey);
    if (!trueId) {
      // Create new player
      const newPlayer = createNewPlayer(perf.playerName, existingNames);
      perf.playerId = newPlayer.id;
      perf.playerName = newPlayer.name;
      existingPlayers.set(newPlayer.name.toLowerCase().trim(), newPlayer.id);
      existingNames.add(newPlayer.name.toLowerCase().trim());
      newPlayersToAdd.push(newPlayer);
    } else {
      perf.playerId = trueId;
    }
    perf.id = `${matchId}_${perf.playerId}`;

    // Also update match teamPlayers with true ID so match data is consistent
    const teamPlayer = match.teamPlayers.find(p => p.name.toLowerCase().trim() === nameKey);
    if (teamPlayer) {
      teamPlayer.id = perf.playerId;
      teamPlayer.name = perf.playerName; // Update name if collision occurred
    }
  }

  // Update team with new players if any
  if (newPlayersToAdd.length > 0) {
    const updatedPlayers = [...teamPlayers, ...newPlayersToAdd].map(p => {
      const clean: any = { id: p.id, name: p.name };
      if (p.jerseyNumber !== undefined) clean.jerseyNumber = p.jerseyNumber;
      return clean;
    });
    await db.collection('teams').doc('jmcc_spartans_singleton').update({
      players: updatedPlayers,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  const topBatters = findTopBatters(performances);
  const topBowlers = findTopBowlers(performances);
  const bestBatter = findBestBatter(performances);
  const bestBowler = findBestBowler(performances);

  // Extract team and opponent scores
  const ourInnings = match.innings.find(i => i.battingTeam === 'Us');
  const opponentInnings = match.innings.find(i => i.battingTeam === 'Them');

  const teamRuns = (match as any).teamRuns !== undefined ? (match as any).teamRuns : (ourInnings?.totalRuns || 0);
  const teamWickets = (match as any).teamWickets !== undefined ? (match as any).teamWickets : (ourInnings?.totalWickets || 0);
  const opponentRuns = (match as any).opponentRuns !== undefined ? (match as any).opponentRuns : (opponentInnings?.totalRuns || 0);
  const opponentWickets = (match as any).opponentWickets !== undefined ? (match as any).opponentWickets : (opponentInnings?.totalWickets || 0);

  // 2. Prepare Match Data
  const firstInnings = match.innings.find(i => i.inningsNumber === 1);
  const derivedFirstInningsTeam = firstInnings?.battingTeam === 'Us' ? 'JMCC Spartans' : match.opponent;
  const derivedFirstInningsScore = firstInnings?.totalRuns || 0;

  const matchData = {
    ...mapMatchToFirestore(match),
    top_batters: topBatters,
    top_bowlers: topBowlers,
    best_batter_id: bestBatter?.playerId || '',
    best_batter_name: bestBatter?.playerName || '',
    best_batter_runs: bestBatter?.batting?.runs || 0,
    best_batter_balls: bestBatter?.batting?.balls || 0,
    best_bowler_id: bestBowler?.playerId || '',
    best_bowler_name: bestBowler?.playerName || '',
    best_bowler_wickets: bestBowler?.bowling?.wickets || 0,
    best_bowler_runs: bestBowler?.bowling?.runs || 0,
    team_runs: teamRuns,
    team_wickets: teamWickets,
    opponent_runs: opponentRuns,
    opponent_wickets: opponentWickets,
    first_innings_team: (match as any).firstInningsTeam || derivedFirstInningsTeam,
    first_innings_score: (match as any).firstInningsScore !== undefined ? (match as any).firstInningsScore : derivedFirstInningsScore,
    completed_at: completedAt,
    // Do not persist ball-by-ball raw data to Firestore.
    // Live scorer keeps ball-by-ball state in Redux for scoring review,
    // but aggregate stats and review screens use derived performance data.
  };

  try {
    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (matchDoc.exists) {
        throw new Error('Match already uploaded.');
      }

      // Get singleton team
      const teamRef = db.collection('teams').doc('jmcc_spartans_singleton');
      const teamDoc = await transaction.get(teamRef);

      // 2. PERFORM ALL WRITES

      transaction.set(matchRef, matchData);

      for (const perf of performances) {
        const perfRef = db.collection('performances').doc(`${matchId}_${perf.playerId}`);
        transaction.set(perfRef, mapPerformanceToFirestore(perf));
      }
    });

    // Run unified recompute for affected players
    const affectedPlayerIds = Array.from(new Set(performances.map(p => p.playerId)));
    await recomputeStatsForPlayers(affectedPlayerIds);

    try {
      await sendMatchUpdateNotification(
        'Match Updated!',
        `Match against ${match.opponent} has been saved.`,
        { type: 'MATCH_UPDATE' }
      );
    } catch (e) {
      console.error('Notification Error:', e);
    }

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
        zeros: batStats?.zeros || 0,
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
        overs: (bowlStats?.overs || 0) + ((bowlStats?.balls || 0) / 10),
        balls: ((bowlStats?.overs || 0) * 6) + (bowlStats?.balls || 0),
        runs: bowlStats?.runs || 0,
        wickets: bowlStats?.wickets || 0,
        maidens: bowlStats?.maidens || 0,
        isThreeFer: (bowlStats?.wickets || 0) === 3,
        isFourFer: (bowlStats?.wickets || 0) === 4,
        isFiveFer: (bowlStats?.wickets || 0) >= 5,
        zeros: bowlStats?.zeros || 0,
        economy: bowlStats?.economy || 0,
      }
    };
    return perf;
  });
}

