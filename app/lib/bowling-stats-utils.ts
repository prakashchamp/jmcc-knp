import type { CurrentBowler, InningsState } from './cricket-scorer-types';

export interface BowlerStatsSummary {
  id: string;
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
  maidens: number;
  wideRuns: number;
  noBallRuns: number;
  economy: number;
  zeros: number;
}

const getBowlerKey = (bowler: { id?: string; name: string }) => {
  return bowler.name.trim().toLowerCase();
};

export function calcEconomy(runs: number, balls: number): number {
  return balls > 0 ? parseFloat((runs / (balls / 6)).toFixed(2)) : 0;
}

export function oversToBalls(overs: number): number {
  const whole = Math.floor(overs);
  const part = Math.round((overs - whole) * 10);
  return (whole * 6) + part;
}

export function getBowlerStats(innings: InningsState | null | undefined): BowlerStatsSummary[] {
  if (!innings) return [];

  const bowlerMap = new Map<string, BowlerStatsSummary>();
  const bowlerOverMap = new Map<string, {
    bowlerKey: string;
    legalBalls: number;
    startRuns: number;
    endRuns: number;
    hasWideOrNoBall: boolean;
  }>();

  for (const ball of innings.ballHistory ?? []) {
    if (!ball.bowler?.name) continue;

    const bowlerKey = getBowlerKey(ball.bowler);
    const isWide = ball.extra?.type === 'wide';
    const isNoBall = Boolean(ball.extra?.isNoBall || ball.extra?.type === 'no-ball');
    const isByeOrLegBye = ball.extra?.type === 'bye' || ball.extra?.type === 'leg-bye';
    const isNoBallByeOrLegBye = isNoBall && isByeOrLegBye;
    const isLegalDelivery = !isWide && !isNoBall;
    const bowlerRunsConceded = isNoBallByeOrLegBye
      ? 1
      : isByeOrLegBye
        ? 0
        : (ball.runs.total || 0);
    const overKey = `${bowlerKey}:${ball.over}`;

    if (!bowlerMap.has(bowlerKey)) {
      bowlerMap.set(bowlerKey, {
        id: ball.bowler.id,
        name: ball.bowler.name,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
        wideRuns: 0,
        noBallRuns: 0,
        economy: 0,
        zeros: 0,
      });
    }

    const bowler = bowlerMap.get(bowlerKey);
    if (!bowler) continue;

    if (!bowlerOverMap.has(overKey)) {
      bowlerOverMap.set(overKey, {
        bowlerKey,
        legalBalls: 0,
        startRuns: bowler.runs,
        endRuns: bowler.runs,
        hasWideOrNoBall: false,
      });
    }

    const overSummary = bowlerOverMap.get(overKey);
    if (!overSummary) continue;

    if (isLegalDelivery) {
      bowler.balls += 1;
      overSummary.legalBalls += 1;
      if (bowlerRunsConceded === 0) {
        bowler.zeros += 1;
      }
    }
    
    bowler.runs += bowlerRunsConceded;
    overSummary.endRuns = bowler.runs;

    if (isWide) {
      bowler.wideRuns += ball.runs.total || 0;
      overSummary.hasWideOrNoBall = true;
    } else if (isNoBall) {
      bowler.noBallRuns += 1;
      overSummary.hasWideOrNoBall = true;
    }

    if (ball.isWicket) {
      bowler.wickets += 1;
    }
  }

  for (const overSummary of bowlerOverMap.values()) {
    if (
      overSummary.legalBalls === 6 &&
      overSummary.startRuns === overSummary.endRuns &&
      !overSummary.hasWideOrNoBall
    ) {
      const bowler = bowlerMap.get(overSummary.bowlerKey);
      if (bowler) {
        bowler.maidens += 1;
      }
    }
  }

  for (const bowler of bowlerMap.values()) {
    bowler.overs = Math.floor(bowler.balls / 6);
    bowler.economy = calcEconomy(bowler.runs, bowler.balls);
  }

  return Array.from(bowlerMap.values());
}

export function getCurrentBowlerStats(
  innings: InningsState | null | undefined,
  currentBowler: CurrentBowler | undefined
): BowlerStatsSummary | null {
  if (!currentBowler) return null;

  const normalizedCurrentBowlerName = currentBowler.name.trim().toLowerCase();

  const aggregatedStats = getBowlerStats(innings).find(
    (bowler) => bowler.name.trim().toLowerCase() === normalizedCurrentBowlerName
  );

  if (aggregatedStats) {
    return aggregatedStats;
  }

  return {
    id: currentBowler.id,
    name: currentBowler.name,
    overs: currentBowler.overs,
    balls: currentBowler.balls,
    runs: currentBowler.runs,
    wickets: currentBowler.wickets,
    maidens: currentBowler.maidens,
    wideRuns: 0,
    noBallRuns: 0,
    economy: calcEconomy(currentBowler.runs, currentBowler.balls),
    zeros: currentBowler.zeros || 0,
  };
}
