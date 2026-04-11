import { InningsState } from './cricket-scorer-types';

/**
 * Current Partnership Data
 * Represents the ongoing partnership between two active batsmen
 */
export interface CurrentPartnershipData {
  batsman1: {
    name: string;
    id: string;
    runs: number;
    balls: number;
  };
  batsman2: {
    name: string;
    id: string;
    runs: number;
    balls: number;
  };
  partnershipRuns: number;
  partnershipBalls: number;
}

/**
 * Calculate the current partnership data
 * Only includes balls from after the last wicket
 * Used by both LiveScorer and Partnerships page to ensure consistency
 * 
 * Ball counting rules:
 * - Wides: count runs but NOT as a ball (not counted in balls faced)
 * - No-balls, Byes, Leg-byes: count as both runs AND ball
 * - Regular deliveries: count as both runs AND ball
 * 
 * @param innings - Current innings state
 * @returns Current partnership data or null if no balls played
 */
export function calculateCurrentPartnership(
  innings: InningsState
): CurrentPartnershipData | null {
  if (!innings || !innings.ballHistory || innings.ballHistory.length === 0) {
    return null;
  }

  // Find the index of the last wicket
  let lastWicketIndex = -1;
  innings.ballHistory.forEach((ball, idx) => {
    if (ball.isWicket && ball.dismissal?.playerOut) {
      lastWicketIndex = idx;
    }
  });

  // Get partnership balls from after the last wicket to now
  const partnershipBalls = innings.ballHistory.slice(lastWicketIndex + 1);

  if (partnershipBalls.length === 0) {
    return null;
  }

  // Identify the two current batsmen from the first ball of this partnership
  const firstBall = partnershipBalls[0];
  const batsman1Id = firstBall.batter.id;
  const batsman1Name = firstBall.batter.name;
  const batsman2Id = firstBall.nonStriker.id;
  const batsman2Name = firstBall.nonStriker.name;

  // Calculate individual contributions
  let batsman1Runs = 0;
  let batsman1Balls = 0;
  let batsman2Runs = 0;
  let batsman2Balls = 0;

  for (const ball of partnershipBalls) {
    // Check if this ball is a wide (wides don't count as balls for partnership)
    const isWide = ball.extra?.type === 'wide';
    
    if (ball.batter.id === batsman1Id) {
      batsman1Runs += ball.runs.total;
      // Only count as ball if NOT a wide
      if (!isWide) {
        batsman1Balls++;
      }
    } else if (ball.batter.id === batsman2Id) {
      batsman2Runs += ball.runs.total;
      // Only count as ball if NOT a wide
      if (!isWide) {
        batsman2Balls++;
      }
    }
  }

  // Calculate total partnership runs (include all deliveries)
  const totalRuns = partnershipBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
  
  // Calculate total partnership balls (exclude wides)
  const totalBalls = partnershipBalls.filter(
    (ball) => ball.extra?.type !== 'wide'
  ).length;

  return {
    batsman1: {
      name: batsman1Name,
      id: batsman1Id,
      runs: batsman1Runs,
      balls: batsman1Balls,
    },
    batsman2: {
      name: batsman2Name,
      id: batsman2Id,
      runs: batsman2Runs,
      balls: batsman2Balls,
    },
    partnershipRuns: totalRuns,
    partnershipBalls: totalBalls,
  };
}
