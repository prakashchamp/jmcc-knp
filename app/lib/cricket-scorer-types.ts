/**
 * Cricket Scorer Type Definitions
 * Professional cricket scoring data structures based on match requirements
 */

// ============================================================================
// PLAYER & TEAM TYPES
// ============================================================================

export interface TeamPlayer {
  id: string;
  name: string;
  jerseyNumber?: number;
}

export interface Team {
  id: string;
  name: string;
  players: TeamPlayer[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LIVE MATCH TYPES
// ============================================================================

export type ExtraType = 'wide' | 'no-ball' | 'bye' | 'leg-bye';

export type DismissalMode = 
  | 'bowled' 
  | 'lbw' 
  | 'caught' 
  | 'run-out' 
  | 'stumped' 
  | 'handled-ball' 
  | 'obstructing-field'
  | 'hit-wicket'
  | 'retired-hurt'
  | 'retired-out';

// ============================================================================
// BALL STRUCTURE FOR LIVE MATCH
// ============================================================================

export interface Ball {
  id: string;
  over: number;
  ball: number; // 0-5 position in over
  timestamp: number; // Unix timestamp
  bowler: {
    id: string;
    name: string;
  };
  batter: {
    id: string;
    name: string;
  };
  nonStriker: {
    id: string;
    name: string;
  };
  runs: {
    batter: number; // Runs scored by batter (0-6)
    extras: number; // Extra runs (wides, no-balls, byes)
    total: number; // Total runs off the ball
  };
  isWicket: boolean;
  dismissal?: {
    mode: DismissalMode;
    playerOut: {
      id: string;
      name: string;
    };
    bowler?: {
      id: string;
      name: string;
    };
    fielder?: {
      id: string;
      name: string;
    };
    description?: string;
  };
  extra?: {
    type: ExtraType;
    isNoBall?: boolean;
    isWide?: boolean;
    runType?: 'leg-bye' | 'bye' | 'none';
  };
}

// ============================================================================
// CURRENT MATCH STATE DURING LIVE SCORING
// ============================================================================

export interface CurrentBatsman {
  id: string;
  name: string;
  jerseyNumber?: number;
  role: 'striker' | 'non-striker';
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  zeros: number; // Count of dot balls (0-run balls)
  status: 'batting' | 'out';
  dismissal?: {
    mode: DismissalMode;
    description?: string;
  };
  strikeRate: number;
  batsmanOrder?: number; // 1-11: Position in batting order
}

export interface CurrentBowler {
  id: string;
  name: string;
  jerseyNumber?: number;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  economy: number;
  extras: number;
}

export interface InningsState {
  inningsNumber: 1 | 2;
  battingTeam: 'Us' | 'Them';
  totalRuns: number;
  totalWickets: number;
  totalBalls: number;
  ballHistory: Ball[];
  penaltyExtras: number; // Track penalty runs separately for extras count
  striker?: CurrentBatsman;
  nonStriker?: CurrentBatsman;
  currentBowler?: CurrentBowler;
  dismissedBatsmen: CurrentBatsman[];
  batsmanStats: CurrentBatsman[]; // All batsmen in order (1-11 based on batsmanOrder)
  bowlerStats: CurrentBowler[]; // All bowlers who bowled in this innings
  target?: number;
  requiredRunRate?: number;
  requiredBalls?: number;
  currentPartnership?: {
    batsman1: { name: string; id: string; runs: number; balls: number };
    batsman2: { name: string; id: string; runs: number; balls: number };
    partnershipRuns: number;
    partnershipBalls: number;
  };
}

export interface LiveMatch {
  id: string;
  matchId?: string;
  
  // Match metadata
  opponent: string;
  venue: string;
  tossWonBy: 'Us' | 'Them';
  tossDecision: 'bat' | 'field';
  format: 'T20' | 'ODI' | 'Custom';
  totalOvers: number;
  
  // Team players
  teamPlayers: TeamPlayer[];
  
  // Innings tracking
  currentInnings: 1 | 2;
  innings: InningsState[];
  
  // Match status
  status: 'in-progress' | 'complete' | 'abandoned';
  result?: 'won' | 'lost' | 'tie' | 'no_result' | 'abandoned';
  winMargin?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// ============================================================================
// MATCH SUMMARY (Completed matches)
// ============================================================================

export interface MatchSummary {
  matchId: string;
  opponent: string;
  venue: string;
  tossWonBy: 'Us' | 'Them';
  tossDecision: 'bat' | 'field';
  format: 'T20' | 'ODI' | 'Custom';
  result: 'won' | 'lost' | 'tie' | 'no_result' | 'abandoned';
  winMargin?: string;
  innings: InningsSummary[];
  completedAt: string;
}

export interface InningsSummary {
  inningsNumber: 1 | 2;
  battingTeam: 'Us' | 'Them';
  totalRuns: number;
  totalWickets: number;
  totalOvers: number;
  target?: number;
  performances: PlayerPerformance[];
}

export interface PlayerPerformance {
  playerId: string;
  playerName: string;
  jerseyNumber?: number;
  batting: {
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    status: 'out' | 'not-out' | 'did-not-bat';
    dismissal?: {
      mode: DismissalMode;
      description?: string;
    };
  };
  bowling: {
    overs: number;
    runs: number;
    wickets: number;
    maidens: number;
    economy: number;
  };
}

// ============================================================================
// SCORER STATE MANAGEMENT (Redux)
// ============================================================================

export interface ScorerAppState {
  liveMatch: LiveMatch | null;
  loading: boolean;
  error: string | null;
  pendingCloudPush: boolean;
  autoSavedAt: string | null;
}

