/**
 * PWA Cricket Scorer Types
 * Mobile-first cricket match management for ABC team
 */

import { TeamPlayer, CurrentBatsman, CurrentBowler, Ball } from './cricket-scorer-types';

// ============================================================================
// MATCH SETUP TYPES
// ============================================================================

export interface MatchSetupData {
  opponentName: string;
  venue: string;
  tossWonBy: 'ABC' | 'opponent';
  decision: 'bat' | 'bowl';
  oversPerMatch: number;
}

export interface ParsedMatchSetup extends MatchSetupData {
  abcBatsFirst: boolean;
  batsmanTeam: 'ABC' | 'Opponent';  // Who bats first
}

// ============================================================================
// INNINGS SETUP TYPES
// ============================================================================

export interface InningsSetupData {
  inningsNumber: 1 | 2;
  battingTeam: 'ABC' | 'Opponent';
  
  // If ABC is batting
  abcOpeningBatsman1?: TeamPlayer;
  abcOpeningBatsman2?: TeamPlayer;
  
  // If ABC is bowling
  abcOpeningBowler?: TeamPlayer;
  
  strikerInfo: {
    id: string;
    name: string;
    isABC: boolean;
  };
  nonStrikerInfo: {
    id: string;
    name: string;
    isABC: boolean;
  };
  bowlerInfo: {
    id: string;
    name: string;
    isABC: boolean;
  };
}

// ============================================================================
// BALL DELIVERY TYPES
// ============================================================================

export type BallType = 'runs' | 'wide' | 'no-ball' | 'bye' | 'leg-bye' | 'wicket' | 'run-out';

export interface BallDelivery {
  type: BallType;
  runsScored?: number;       // 0-7 for normal deliveries
  extraRuns?: number;        // Additional runs on wides/no-balls
  byeRuns?: number;          // 1-4 for byes/leg-byes
  isWicket?: boolean;
  dismissalMode?: 'out' | 'run-out';
  battingTeam: 'ABC' | 'Opponent';
  
  // Run out specific
  runsInRunOut?: number;
  runOutBatter?: 'striker' | 'non-striker';
}

// ============================================================================
// INNINGS SCORECARD TYPES
// ============================================================================

export interface BatsmanScorecard {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  status: 'batting' | 'not-out' | 'out' | 'run-out';
  dismissalInfo?: string;
  strikeRate: number;
}

export interface BowlerScorecard {
  id: string;
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  balls: number;  // Total balls bowled (can be > 6 for multiple overs)
}

export interface InningsScorecard {
  inningsNumber: 1 | 2;
  battingTeam: 'ABC' | 'Opponent';
  totalRuns: number;
  totalWickets: number;
  totalOversPlayed: number;  // e.g., 20.3
  batsmen: BatsmanScorecard[];
  bowlers: BowlerScorecard[];
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  target?: number;  // 2nd innings
  needToBeat?: number;  // 2nd innings
}

// ============================================================================
// FULL MATCH STATE TYPES
// ============================================================================

export interface PWAMatch {
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Setup info
  abcTeam: TeamPlayer[];
  opponentName: string;
  venue: string;
  tossWonBy: 'ABC' | 'Opponent';
  decision: 'bat' | 'bowl';
  oversPerMatch: number;
  
  // Match state
  currentInnings: 1 | 2;
  inningsData: {
    innings1: InningsScorecard;
    innings2?: InningsScorecard;
  };
  
  // Bowling tracking
  lastBowlerId?: string;  // Track for consecutive over restriction
  maxOversPerBowler: number;
  
  // Result
  matchCompleted: boolean;
  winner?: 'ABC' | 'Opponent' | 'Tie';
  winningMargin?: string;  // e.g., "24 runs" or "5 wickets"
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export type MatchScreen = 
  | 'pre-match'
  | 'match-setup'
  | 'innings-setup'
  | 'live-scoring'
  | 'end-of-innings'
  | 'match-result';

export interface UIState {
  currentScreen: MatchScreen;
  toastMessage?: string;
  toastType?: 'info' | 'success' | 'warning' | 'error';
}
