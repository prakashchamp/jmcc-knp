/**
 * Cricket Data Schema & TypeScript Types
 * Defines all Firestore collection structures for JMCC Spartans
 */

// ============================================================================
// PLAYERS
// ============================================================================

export interface Player {
  id: string;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder';
  createdAt: string; // ISO 8601
}

// ============================================================================
// MATCHES
// ============================================================================

export interface Match {
  id: string;
  date: string; // ISO 8601
  year: string; // "2024"
  month: string; // "2024-03"
  opponent: string;
  venue: 'Home' | 'Away' | 'Neutral';
  tossWonBy: 'Us' | 'Opponent';
  tossDecision: 'bat' | 'field';
  result: 'won' | 'lost' | 'tie' | 'no_result';
  winMargin: string; // "24 runs", "5 wickets", ""

  bestBatterId: string;
  bestBatterName: string;
  bestBatterRuns: number;
  bestBatterBalls: number;

  bestBowlerId: string;
  bestBowlerName: string;
  bestBowlerWickets: number;
  bestBowlerRuns: number;

  createdAt: string; // ISO 8601
}

// ============================================================================
// PERFORMANCES (Per-player stats in a match)
// ============================================================================

export interface Batting {
  didBat: boolean;
  innings: number; // 0 | 1
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissed: boolean;
  isDuck: boolean;
  isThirty: boolean; // 30-49
  isFifty: boolean; // 50-99
  isHundred: boolean; // 100+
  strikeRate: number; // pre-computed (runs/balls)*100
}

export interface Bowling {
  didBowl: boolean;
  innings: number; // 0 | 1
  overs: number;
  balls: number; // actual balls bowled
  runs: number;
  wickets: number;
  maidens: number;
  isThreeFer: boolean; // exactly 3 wickets
  isFourFer: boolean; // exactly 4 wickets
  isFiveFer: boolean; // 5+ wickets
  economy: number; // pre-computed runs/overs
}

export interface Performance {
  id: string; // matchId_playerId
  matchId: string;
  playerId: string;
  playerName: string;
  playerRole: 'batsman' | 'bowler' | 'allrounder';

  date: string; // ISO 8601
  year: string;
  month: string;
  opponent: string;

  batting: Batting;
  bowling: Bowling;

  createdAt: string; // ISO 8601
}

// ============================================================================
// AGGREGATED STATS (Computed from performances)
// ============================================================================

export interface TeamStats {
  totalMatches: number;
  wins: number;
  losses: number;
  noResults: number;
  ties: number;
}

export interface PlayerBattingStats {
  playerId: string;
  playerName: string;
  // Matches and Innings
  totalMatches: number;
  totalInnings: number;
  notOuts: number;
  
  // Runs and Scoring
  totalRuns: number;
  bestScore: number;
  average: number; // runs / (innings - notOuts)
  
  // Balls and Strike Rate
  totalBalls: number;
  strikeRate: number; // (runs / balls) * 100
  
  // Boundary counts
  totalFours: number;
  totalSixes: number;
  
  // Milestone counts
  thirties: number; // 30-49 runs
  fifties: number; // 50-99 runs
  hundreds: number; // 100+ runs
  ducks: number; // out for 0
}

export interface PlayerBowlingStats {
  playerId: string;
  playerName: string;
  // Matches and Innings
  totalMatches: number;
  totalInnings: number;
  
  // Wickets and Runs
  totalWickets: number;
  totalRuns: number;
  bestHaul: number;
  
  // Overs and Balls
  totalBalls: number;
  totalOvers: number; // balls / 6
  
  // Averages
  average: number; // runs / wickets
  strikeRate: number; // balls / wickets
  economy: number; // runs / overs
  
  // Milestone counts
  threeWickets: number; // exactly 3 wickets in a performance
  fiveWickets: number; // 5+ wickets in a performance
}

// ============================================================================
// UI STATE
// ============================================================================

export interface LoadingState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}
