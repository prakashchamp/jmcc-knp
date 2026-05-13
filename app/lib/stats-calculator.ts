import { Performance, Batting, Bowling } from './cricket-schema';
import { Ball, TeamPlayer, DismissalMode } from './cricket-scorer-types';

/**
 * Stats Calculator - Converts ball history to Performance objects
 * Aggregates batting and bowling statistics from live match ball history
 */

interface PlayerBattingRaw {
  playerName: string;
  runs: number;
  balls: number;
  zeros: number;
  fours: number;
  sixes: number;
  wickets: Array<{ dismissalMode: DismissalMode }>;
}

interface PlayerBowlingRaw {
  playerName: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  zeros: number;
}

/**
 * Calculate batting statistics from ball history
 * Only processes balls where our team is batting (currentInnings = 1)
 * @param ballHistory - Array of balls bowled in the match
 * @param teamPlayers - Our team's players (used to identify our batters)
 * @returns Map of player name to batting raw stats
 */
function calculateBattingStats(ballHistory: Ball[], teamPlayers: TeamPlayer[]): Map<string, PlayerBattingRaw> {
  const playerNames = new Set(teamPlayers.map((p) => p.name));
  const statsMap = new Map<string, PlayerBattingRaw>();

  ballHistory.forEach((ball) => {
    // Only count if batter is from our team
    if (!playerNames.has(ball.batter.name)) {
      return;
    }

    let batterStat = statsMap.get(ball.batter.name);
    if (!batterStat) {
      batterStat = {
        playerName: ball.batter.name,
        runs: 0,
        balls: 0,
        zeros: 0,
        fours: 0,
        sixes: 0,
        wickets: [],
      };
      statsMap.set(ball.batter.name, batterStat);
    }

    // Count runs from ball
    const ballRuns = ball.runs.batter;
    batterStat.runs += ballRuns;

    // Count extras (except wides and no-balls which don't count as balls faced)
    if (ball.extra) {
      batterStat.runs += ball.runs.extras;
    }

    // Count ball faced (not counting wides/no-balls)
    if (!ball.extra || (ball.extra.type !== 'wide' && ball.extra.type !== 'no-ball')) {
      batterStat.balls += 1;

      // Count dot balls (0 runs off the bat)
      if (ballRuns === 0) {
        batterStat.zeros += 1;
      }

      // Count fours and sixes (only on legal deliveries)
      if (ballRuns === 4) {
        batterStat.fours += 1;
      } else if (ballRuns === 6) {
        batterStat.sixes += 1;
      }
    }

    // Count wicket if batter is out
    if (ball.isWicket && ball.dismissal?.playerOut.name === ball.batter.name) {
      batterStat.wickets.push({
        dismissalMode: ball.dismissal.mode,
      });
    }
  });

  return statsMap;
}

/**
 * Calculate bowling statistics from ball history
 * @param ballHistory - Array of balls bowled in the match
 * @param teamPlayers - Our team's players (used to identify our bowlers)
 * @returns Map of player name to bowling raw stats
 */
function calculateBowlingStats(ballHistory: Ball[], teamPlayers: TeamPlayer[]): Map<string, PlayerBowlingRaw> {
  const playerNames = new Set(teamPlayers.map((p) => p.name));
  const statsMap = new Map<string, PlayerBowlingRaw>();

  ballHistory.forEach((ball) => {
    // Only count if bowler is from our team
    if (!playerNames.has(ball.bowler.name)) {
      return;
    }

    let bowlerStat = statsMap.get(ball.bowler.name);
    if (!bowlerStat) {
      bowlerStat = {
        playerName: ball.bowler.name,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        zeros: 0,
      };
      statsMap.set(ball.bowler.name, bowlerStat);
    }

    // Count ball bowled (overs calculated from balls)
    bowlerStat.balls += 1;
    bowlerStat.overs = Math.floor(bowlerStat.balls / 6);

    // Count runs conceded
    const ballRuns = ball.runs.batter;
    bowlerStat.runs += ballRuns;

    // Count extras
    if (ball.extra) {
      bowlerStat.runs += ball.runs.extras;

      // Wides and no-balls don't count as balls bowled (but runs are conceded)
      if (ball.extra.type === 'wide' || ball.extra.type === 'no-ball') {
        bowlerStat.balls -= 1; // Undo the increment above
      } else {
        // Legal delivery: check for dot
        if (ballRuns === 0 && (!ball.extra || (ball.extra.type !== 'bye' && ball.extra.type !== 'leg-bye'))) {
          // Standard dot ball logic: 0 off bat and no wide/nb
          bowlerStat.zeros += 1;
        }
      }
    } else if (ballRuns === 0) {
      // Legal ball with no extras: check for dot
      bowlerStat.zeros += 1;
    }

    // Count wicket if bowler took it
    if (ball.isWicket && ball.dismissal && ball.dismissal.mode !== 'run-out') {
      // Most wickets are credited to bowler, except run-outs
      bowlerStat.wickets += 1;
    } else if (ball.isWicket && ball.dismissal && ball.dismissal.mode === 'run-out' && ball.dismissal.fielder?.name === ball.bowler.name) {
      // Run-out only credited if fielder is the bowler
      bowlerStat.wickets += 1;
    }

    // TODO: Track maiden overs (requires over-by-over logic, deferred for v2)
  });

  return statsMap;
}

/**
 * Create a Batting interface from raw player batting stats
 */
function createBattingInterface(
  playerStats: PlayerBattingRaw,
  currentInnings: 1 | 2
): Batting {
  const isDismissed = playerStats.wickets.length > 0;
  const isDuck = playerStats.runs === 0 && isDismissed;
  const strikeRate = playerStats.balls > 0 ? (playerStats.runs / playerStats.balls) * 100 : 0;
  const isThirty = playerStats.runs >= 30 && playerStats.runs < 50;
  const isFifty = playerStats.runs >= 50 && playerStats.runs < 100;
  const isHundred = playerStats.runs >= 100;

  return {
    didBat: playerStats.balls > 0 || isDismissed,
    innings: currentInnings === 1 ? 0 : 1,
    runs: playerStats.runs,
    balls: playerStats.balls,
    zeros: playerStats.zeros,
    fours: playerStats.fours,
    sixes: playerStats.sixes,
    dismissed: isDismissed,
    isDuck,
    isThirty,
    isFifty,
    isHundred,
    strikeRate,
  };
}

/**
 * Create a Bowling interface from raw player bowling stats
 */
function createBowlingInterface(playerStats: PlayerBowlingRaw): Bowling {
  const overs = playerStats.balls >= 6 ? Math.floor(playerStats.balls / 6) : 0;
  const remainingBalls = playerStats.balls % 6;
  const economy = overs > 0 ? playerStats.runs / overs : 0;
  const isThreeFer = playerStats.wickets === 3;
  const isFourFer = playerStats.wickets === 4;
  const isFiveFer = playerStats.wickets === 5;

  return {
    didBowl: playerStats.balls > 0,
    innings: 1, // Our bowling is always in 2nd innings (they bat, we bowl)
    overs,
    balls: remainingBalls,
    runs: playerStats.runs,
    wickets: playerStats.wickets,
    maidens: playerStats.maidens,
    zeros: playerStats.zeros,
    isThreeFer,
    isFourFer,
    isFiveFer,
    economy,
  };
}

/**
 * Convert live match ball history to Performance[] objects
 * One Performance per player with their batting and bowling stats
 * @param ballHistory - Array of balls from live match
 * @param teamPlayers - Our team's players
 * @param matchId - Match ID for the Performance document
 * @param opponent - Opponent team name
 * @param date - Match date (ISO format)
 * @param currentInnings - Current innings (1 = we bat, 2 = we bowl)
 * @returns Array of Performance objects ready for Firestore
 */
export function calculatePerformances(
  ballHistory: Ball[],
  teamPlayers: TeamPlayer[],
  matchId: string,
  opponent: string,
  date: string,
  currentInnings: 1 | 2
): Performance[] {
  if (ballHistory.length === 0 || teamPlayers.length === 0) {
    return [];
  }

  // Calculate raw stats
  const battingMap = calculateBattingStats(ballHistory, teamPlayers);
  const bowlingMap = calculateBowlingStats(ballHistory, teamPlayers);

  // Extract date components
  const dateObj = new Date(date);
  const year = dateObj.getUTCFullYear().toString();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');

  // Create Performance[] array
  const performances: Performance[] = [];

  teamPlayers.forEach((player) => {
    const battingStats = battingMap.get(player.name) || {
      playerName: player.name,
      runs: 0,
      balls: 0,
      zeros: 0,
      fours: 0,
      sixes: 0,
      wickets: [],
    };

    const bowlingStats = bowlingMap.get(player.name) || {
      playerName: player.name,
      overs: 0,
      balls: 0,
      runs: 0,
      wickets: 0,
      maidens: 0,
      zeros: 0,
    };

    const batting = createBattingInterface(battingStats, currentInnings);
    const bowling = createBowlingInterface(bowlingStats);

    const performance: Performance = {
      id: `${matchId}_${player.id}`,
      matchId,
      playerId: player.id,
      playerName: player.name,
      date,
      year,
      month,
      opponent,
      batting,
      bowling,
      createdAt: new Date().toISOString(),
    };

    performances.push(performance);
  });

  return performances;
}

/**
 * Utility to calculate single player stats for UI display during live scoring
 * Used for showing current match stats in scorer UI
 * @param ballHistory - Array of balls bowled so far
 * @param playerName - Player to get stats for
 * @param teamPlayers - Our team's players (to validate player)
 * @returns Object with batting and bowling stats for display
 */
export function getPlayerCurrentStats(
  ballHistory: Ball[],
  playerName: string,
  teamPlayers: TeamPlayer[]
) {
  const playerNames = new Set(teamPlayers.map((p) => p.name));
  if (!playerNames.has(playerName)) {
    return null;
  }

  let battingRuns = 0;
  let battingBalls = 0;
  let battingZeros = 0;
  let battingFours = 0;
  let battingSixes = 0;
  let battingOut = false;

  let bowlingBalls = 0;
  let bowlingRuns = 0;
  let bowlingWickets = 0;
  let bowlingZeros = 0;

  ballHistory.forEach((ball) => {
    // Batting
    if (ball.batter.name === playerName) {
      battingRuns += ball.runs.batter;
      if (ball.extra) {
        battingRuns += ball.runs.extras;
      }

      if (!ball.extra || (ball.extra.type !== 'wide' && ball.extra.type !== 'no-ball')) {
        battingBalls += 1;

        if (ball.runs.batter === 0) {
          battingZeros += 1;
        }

        if (ball.runs.batter === 4) {
          battingFours += 1;
        } else if (ball.runs.batter === 6) {
          battingSixes += 1;
        }
      }

      if (ball.isWicket && ball.dismissal?.playerOut.name === playerName) {
        battingOut = true;
      }
    }

    // Bowling
    if (ball.bowler.name === playerName) {
      bowlingBalls += 1;
      bowlingRuns += ball.runs.batter;

      if (ball.extra) {
        bowlingRuns += ball.runs.extras;
      }

      if (ball.isWicket && ball.dismissal?.mode !== 'run-out') {
        bowlingWickets += 1;
      } else if (ball.isWicket && ball.dismissal?.mode === 'run-out' && ball.dismissal?.fielder?.name === playerName) {
        bowlingWickets += 1;
      }

      // Track dots for bowler in current stats
      const isWide = ball.extra?.type === 'wide';
      const isNoBall = Boolean(ball.extra?.isNoBall || ball.extra?.type === 'no-ball');
      if (!isWide && !isNoBall && ball.runs.batter === 0) {
        bowlingZeros += 1;
      }
    }
  });

  const battingStrikeRate = battingBalls > 0 ? (battingRuns / battingBalls) * 100 : 0;
  const bowlingEconomy = bowlingBalls >= 6 ? bowlingRuns / (bowlingBalls / 6) : 0;

  return {
    batting: {
      runs: battingRuns,
      balls: battingBalls,
      zeros: battingZeros,
      fours: battingFours,
      sixes: battingSixes,
      strikeRate: battingStrikeRate,
      isOut: battingOut,
    },
    bowling: {
      balls: bowlingBalls,
      overs: Math.floor(bowlingBalls / 6),
      runs: bowlingRuns,
      wickets: bowlingWickets,
      zeros: bowlingZeros,
      economy: bowlingEconomy,
    },
  };
}
