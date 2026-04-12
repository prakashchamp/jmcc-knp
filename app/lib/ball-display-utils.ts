/**
 * Ball Display Utilities
 * Formats ball information for display in over grids
 */

export interface Ball {
  isWicket: boolean;
  runs: {
    batter: number;
    extras: number;
    total: number;
  };
  extra?: {
    type?: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
    isNoBall?: boolean;
    isWide?: boolean;
    runType?: 'leg-bye' | 'bye' | 'none';
  };
}

/**
 * Format ball display text based on runs, extras, and wicket status
 * 
 * Examples:
 * - W: just a wicket with 0 runs
 * - 1W: 1 run and wicket (run-out)
 * - 2LB+W: 2 leg-bytes and wicket
 * - 1B+W: 1 bye and wicket
 * - 1WD+W: 1 wide and wicket
 * - 2NB+W: 2 no-balls and wicket
 */
export function formatBallDisplay(ball: Ball): string {
  if (!ball.isWicket) {
    // Regular delivery without wicket
    if (ball.extra?.type === 'wide') {
      const wideRuns = Math.max((ball.runs.total || ball.runs.extras || 0) - 1, 0);
      return wideRuns > 0 ? `${wideRuns}WD` : 'WD';
    } else if (ball.extra?.isNoBall && ball.extra?.type === 'bye') {
      return `${Math.max((ball.runs.total || 0) - 1, 0)}B+NB`;
    } else if (ball.extra?.isNoBall && ball.extra?.type === 'leg-bye') {
      return `${Math.max((ball.runs.total || 0) - 1, 0)}LB+NB`;
    } else if (ball.extra?.type === 'no-ball' || ball.extra?.isNoBall) {
      const nbRuns = Math.max((ball.runs.total || 0) - 1, 0);
      return nbRuns > 0 ? `${nbRuns}NB` : 'NB';
    } else if (ball.extra?.type === 'bye') {
      return `${ball.runs.extras}B`;
    } else if (ball.extra?.type === 'leg-bye') {
      return `${ball.runs.extras}LB`;
    } else {
      return `${ball.runs.total}`;
    }
  }

  // Wicket delivery
  if (ball.extra?.type === 'wide') {
    const wideRuns = Math.max((ball.runs.total || ball.runs.extras || 0) - 1, 0);
    return wideRuns > 0 ? `${wideRuns}WD+W` : 'WD+W';
  } else if (ball.extra?.isNoBall && ball.extra?.type === 'bye') {
    return `${Math.max((ball.runs.total || 0) - 1, 0)}B+NB+W`;
  } else if (ball.extra?.isNoBall && ball.extra?.type === 'leg-bye') {
    return `${Math.max((ball.runs.total || 0) - 1, 0)}LB+NB+W`;
  } else if (ball.extra?.type === 'no-ball' || ball.extra?.isNoBall) {
    const nbRuns = Math.max((ball.runs.total || 0) - 1, 0);
    return nbRuns > 0 ? `${nbRuns}NB+W` : 'NB+W';
  } else if (ball.extra?.type === 'bye') {
    return `${ball.runs.extras}B+W`;
  } else if (ball.extra?.type === 'leg-bye') {
    return `${ball.runs.extras}LB+W`;
  } else if (ball.runs.batter > 0) {
    // Run-out: show batter runs with wicket
    return `${ball.runs.batter}+W`;
  } else {
    // Regular wicket with 0 runs
    return 'W';
  }
}

/**
 * Determine color for ball display
 * Color coding:
 * - Wicket (W): red-800 (matches wicket button)
 * - Boundary (4): blue-800
 * - Six (6): green-800
 * - Dot (0-3): gray-700
 * - Wide/Bye/Leg-bye: yellow-600
 * - No-ball: amber-700
 * - 6+ runs: violet-800
 */
export function getBallColor(ball: Ball): string {
  // Wickets have priority - use same shade as wicket button
  if (ball.isWicket) {
    return 'bg-red-800 border border-red-700';
  }

  // No-balls (including NB + bye / leg-bye)
  if (ball.extra?.type === 'no-ball' || ball.extra?.isNoBall) {
    if (ball.runs.total === 7) {
      return 'bg-green-800 border border-green-700';
    }
    if (ball.runs.total === 5) {
      return 'bg-blue-800 border border-blue-700';
    }
    return 'bg-amber-700 border border-amber-600';
  }

  // Byes, Leg-byes, and Wides
  if (ball.extra?.type === 'bye' || ball.extra?.type === 'leg-bye' || ball.extra?.type === 'wide') {
    return 'bg-yellow-600 border border-yellow-500';
  }

  // Regular runs (no extras)
  if (ball.runs.total > 6) {
    return 'bg-violet-800 border border-violet-700';
  }
  if (ball.runs.total === 6) {
    return 'bg-green-800 border border-green-700';
  }
  if (ball.runs.total === 4) {
    return 'bg-blue-800 border border-blue-700';
  }

  // 0-3 runs
  return 'bg-gray-700 border border-gray-600';
}
