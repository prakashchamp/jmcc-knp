import { LiveMatch } from './cricket-scorer-types';
import { Performance } from './cricket-schema';

/**
 * Maps Redux LiveMatch to Firestore 'matches' collection schema
 */
export function mapMatchToFirestore(match: LiveMatch) {
  const players = match.teamPlayers || [];
  
  // Find best performers from current match state
  // This assumes the performances have already been calculated or we calculate them here
  // For simplicity in the mapper, we'll take best performers as arguments or calculate them outside
  
  return {
    date: match.createdAt, // Will be converted to Timestamp by Firestore if passed as Date/ISO
    year: match.createdAt ? new Date(match.createdAt).getUTCFullYear().toString() : new Date().getUTCFullYear().toString(),
    month: match.createdAt ? new Date(match.createdAt).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7),
    opponent: match.opponent,
    venue: match.venue,
    toss_won_by: match.tossWonBy,
    toss_decision: match.tossDecision,
    result: match.result || 'no_result',
    win_margin: match.winMargin || '',
    match_format: match.format || 'Custom',
    total_overs: match.totalOvers,
    created_at: match.createdAt || new Date().toISOString(),
  };
}

/**
 * Maps Redux Performance to Firestore 'performances' collection schema
 */
export function mapPerformanceToFirestore(perf: Performance) {
  return {
    match_id: perf.matchId,
    player_id: perf.playerId,
    player_name: perf.playerName,
    date: perf.date,
    year: perf.year,
    month: perf.month,
    opponent: perf.opponent,
    
    // Batting
    bat_did_bat: perf.batting.didBat,
    bat_innings: perf.batting.innings,
    bat_runs: perf.batting.runs,
    bat_balls: perf.batting.balls,
    bat_fours: perf.batting.fours,
    bat_sixes: perf.batting.sixes,
    bat_dismissed: perf.batting.dismissed,
    bat_is_duck: perf.batting.isDuck,
    bat_is_thirty: perf.batting.isThirty,
    bat_is_fifty: perf.batting.isFifty,
    bat_is_hundred: perf.batting.isHundred,
    bat_strike_rate: perf.batting.strikeRate,
    
    // Bowling
    bowl_did_bowl: perf.bowling.didBowl,
    bowl_innings: perf.bowling.innings,
    bowl_overs: perf.bowling.overs,
    bowl_balls: perf.bowling.balls,
    bowl_runs: perf.bowling.runs,
    bowl_wickets: perf.bowling.wickets,
    bowl_maidens: perf.bowling.maidens,
    bowl_is_three_fer: perf.bowling.isThreeFer,
    bowl_is_four_fer: perf.bowling.isFourFer,
    bowl_is_five_fer: perf.bowling.isFiveFer,
    bowl_economy: perf.bowling.economy,
    
    created_at: perf.createdAt || new Date().toISOString(),
  };
}

/**
 * Finds the best batter from a list of performances
 */
export function findBestBatter(performances: Performance[]) {
  if (performances.length === 0) return null;
  
  return [...performances].sort((a, b) => {
    // Primary: Runs
    if (b.batting.runs !== a.batting.runs) {
      return b.batting.runs - a.batting.runs;
    }
    // Secondary: Fewer balls (better SR)
    return a.batting.balls - b.batting.balls;
  })[0];
}

/**
 * Finds the best bowler from a list of performances
 */
export function findBestBowler(performances: Performance[]) {
  if (performances.length === 0) return null;
  
  return [...performances].sort((a, b) => {
    // Primary: Wickets
    if (b.bowling.wickets !== a.bowling.wickets) {
      return b.bowling.wickets - a.bowling.wickets;
    }
    // Secondary: Fewer runs conceded
    return a.bowling.runs - b.bowling.runs;
  })[0];
}
