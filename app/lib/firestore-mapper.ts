import { LiveMatch } from './cricket-scorer-types';
import { Performance, Match } from './cricket-schema';

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
    first_innings_team: (match as any).firstInningsTeam || '',
    first_innings_score: (match as any).firstInningsScore || 0,
    team_runs: (match as any).teamRuns || 0,
    team_wickets: (match as any).teamWickets || 0,
    opponent_runs: (match as any).opponentRuns || 0,
    opponent_wickets: (match as any).opponentWickets || 0,
    created_at: match.createdAt || new Date().toISOString(),
    createdAt: match.createdAt || new Date().toISOString(),
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
    createdAt: perf.createdAt || new Date().toISOString(),
  };
}

/**
 * Maps Firestore 'performances' collection schema back to Redux Performance
 */
export function mapFirestoreToPerformance(data: any): Performance {
  return {
    id: data.id || `${data.match_id}_${data.player_id}`,
    matchId: data.match_id || '',
    playerId: data.player_id || '',
    playerName: data.player_name || '',
    date: data.date || '',
    year: data.year || '',
    month: data.month || '',
    opponent: data.opponent || '',
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    batting: {
      didBat: data.bat_did_bat || false,
      innings: data.bat_innings || 0,
      runs: data.bat_runs || 0,
      balls: data.bat_balls || 0,
      fours: data.bat_fours || 0,
      sixes: data.bat_sixes || 0,
      dismissed: data.bat_dismissed || false,
      isDuck: data.bat_is_duck || false,
      isThirty: data.bat_is_thirty || false,
      isFifty: data.bat_is_fifty || false,
      isHundred: data.bat_is_hundred || false,
      strikeRate: data.bat_strike_rate || 0,
    },
    bowling: {
      didBowl: data.bowl_did_bowl || false,
      innings: data.bowl_innings || 0,
      overs: data.bowl_overs || 0,
      balls: data.bowl_balls || 0,
      runs: data.bowl_runs || 0,
      wickets: data.bowl_wickets || 0,
      maidens: data.bowl_maidens || 0,
      isThreeFer: data.bowl_is_three_fer || false,
      isFourFer: data.bowl_is_four_fer || false,
      isFiveFer: data.bowl_is_five_fer || false,
      economy: data.bowl_economy || 0,
    }
  };
}

export function mapFirestoreToMatch(data: any): Match {
  return {
    id: data.id || data.match_id || '',
    date: data.date || data.created_at || data.createdAt || new Date().toISOString(),
    year: data.year || (data.date ? new Date(data.date).getUTCFullYear().toString() : new Date().getUTCFullYear().toString()),
    month: data.month || (data.date ? new Date(data.date).toISOString().slice(0, 7) : new Date().toISOString().slice(0, 7)),
    opponent: data.opponent || '',
    venue: data.venue || 'Home',
    tossWonBy: data.tossWonBy || data.toss_won_by || 'Us',
    tossDecision: data.tossDecision || data.toss_decision || 'bat',
    result: data.result || 'no_result',
    winMargin: data.winMargin || data.win_margin || '',
    firstInningsTeam: data.firstInningsTeam || data.first_innings_team || '',
    firstInningsScore: typeof data.firstInningsScore === 'number'
      ? data.firstInningsScore
      : data.first_innings_score || 0,
    topBatters: data.topBatters || data.top_batters || [],
    topBowlers: data.topBowlers || data.top_bowlers || [],
    bestBatterId: data.bestBatterId || data.best_batter_id || '',
    bestBatterName: data.bestBatterName || data.best_batter_name || '',
    bestBatterRuns: data.bestBatterRuns || data.best_batter_runs || 0,
    bestBatterBalls: data.bestBatterBalls || data.best_batter_balls || 0,
    bestBowlerId: data.bestBowlerId || data.best_bowler_id || '',
    bestBowlerName: data.bestBowlerName || data.best_bowler_name || '',
    bestBowlerWickets: data.bestBowlerWickets || data.best_bowler_wickets || 0,
    bestBowlerRuns: data.bestBowlerRuns || data.best_bowler_runs || 0,
    teamRuns: data.teamRuns || data.team_runs || 0,
    teamWickets: data.teamWickets || data.team_wickets || 0,
    opponentRuns: data.opponentRuns || data.opponent_runs || 0,
    opponentWickets: data.opponentWickets || data.opponent_wickets || 0,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    matchFormat: data.matchFormat || data.match_format || 'Custom',
    totalOvers: data.totalOvers || data.total_overs,
    scorerInitiatedFrom: data.scorerInitiatedFrom || data.scorer_initiated_from,
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
 * Finds top 2 batters from a list of performances
 */
export function findTopBatters(performances: Performance[]) {
  if (performances.length === 0) return [];
  
  return [...performances]
    .sort((a, b) => {
      // Primary: Runs
      if (b.batting.runs !== a.batting.runs) {
        return b.batting.runs - a.batting.runs;
      }
      // Secondary: Fewer balls (better SR)
      return a.batting.balls - b.batting.balls;
    })
    .slice(0, 2)
    .map(perf => ({
      playerId: perf.playerId,
      playerName: perf.playerName,
      runs: perf.batting.runs,
      balls: perf.batting.balls,
    }));
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

/**
 * Finds top 2 bowlers from a list of performances
 */
export function findTopBowlers(performances: Performance[]) {
  if (performances.length === 0) return [];
  
  return [...performances]
    .sort((a, b) => {
      // Primary: Wickets
      if (b.bowling.wickets !== a.bowling.wickets) {
        return b.bowling.wickets - a.bowling.wickets;
      }
      // Secondary: Fewer runs conceded
      return a.bowling.runs - b.bowling.runs;
    })
    .slice(0, 2)
    .map(perf => ({
      playerId: perf.playerId,
      playerName: perf.playerName,
      wickets: perf.bowling.wickets,
      runs: perf.bowling.runs,
    }));
}
