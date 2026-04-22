'use client';

import { useState, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import type { CurrentBatsman, InningsState } from '@/app/lib/cricket-scorer-types';
import { getBowlerStats } from '@/app/lib/bowling-stats-utils';
import { getNormalizedBatsmen } from './review-batting-utils';

const getTeamName = (team: 'Us' | 'Them', opponent: string) =>
  team === 'Us' ? 'JMCC' : opponent;

const getMergedInnings = (liveMatch: RootState['scorer']['liveMatch'], currentInnings: RootState['scorer']['currentInnings']) => {
  const inningsList = liveMatch?.innings ? [...liveMatch.innings] : [];

  if (currentInnings) {
    const existingIndex = inningsList.findIndex(
      (innings) =>
        innings.inningsNumber === currentInnings.inningsNumber &&
        innings.battingTeam === currentInnings.battingTeam
    );

    if (existingIndex >= 0) {
      inningsList[existingIndex] = currentInnings;
    } else {
      inningsList.push(currentInnings);
    }
  }

  return inningsList.sort((a, b) => a.inningsNumber - b.inningsNumber);
};

function getOverDisplay(innings: InningsState | null | undefined) {
  if (!innings) return '0.0';
  return `${Math.floor(innings.totalBalls / 6)}.${innings.totalBalls % 6}`;
}

function getTotalExtras(innings: InningsState | null | undefined) {
  if (!innings) return 0;
  const ballExtras = innings.ballHistory.reduce((sum, ball) => sum + (ball.runs.extras || 0), 0);
  return ballExtras + (innings.penaltyExtras || 0);
}

function getExtrasBreakdown(innings: InningsState | null | undefined) {
  return (innings?.ballHistory || []).reduce(
    (acc, ball) => {
      const isNoBall = Boolean(ball.extra?.isNoBall || ball.extra?.type === 'no-ball');
      const byeOrLegByeRuns = isNoBall ? Math.max((ball.runs.total || 0) - 1, 0) : ball.runs.extras || 0;

      if (ball.extra?.type === 'wide') acc.wide += ball.runs.total || 0;
      if (ball.extra?.type === 'bye') acc.bye += byeOrLegByeRuns;
      if (ball.extra?.type === 'leg-bye') acc.legBye += byeOrLegByeRuns;
      if (isNoBall) acc.noBall += 1;
      return acc;
    },
    {
      wide: 0,
      bye: 0,
      legBye: 0,
      noBall: 0,
      penalty: innings?.penaltyExtras || 0,
    }
  );
}

function formatDismissal(batsman: CurrentBatsman): string {
  if (batsman.status === 'batting') {
    return 'not out';
  }

  if (batsman.dismissal?.mode) {
    return batsman.dismissal.mode
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Out';
}

function renderBattingStatsTable(
  innings: InningsState | null | undefined,
  liveMatch: RootState['scorer']['liveMatch']
) {
  const allBatsmen = getNormalizedBatsmen(innings, liveMatch);

  if (allBatsmen.length === 0) {
    return <p className="px-3 pb-3 text-xs text-gray-400">No batting stats available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-blue-800 text-white">
          <tr>
            <th className="px-2 py-2 text-left font-semibold">Batsman</th>
            <th className="px-2 py-2 text-center font-semibold">R</th>
            <th className="px-2 py-2 text-center font-semibold">B</th>
            <th className="px-2 py-2 text-center font-semibold">0s</th>
            <th className="px-2 py-2 text-center font-semibold">4s</th>
            <th className="px-2 py-2 text-center font-semibold">6s</th>
            <th className="px-2 py-2 text-center font-semibold">SR</th>
          </tr>
        </thead>
        <tbody>
          {allBatsmen.map((batsman, idx) => (
            <tr key={batsman.id} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}>
              <td className="px-2 py-2">
                <div className="text-xs font-semibold text-white">{batsman.name}</div>
                <span className="mt-0.5 inline-block text-xs text-gray-300">{formatDismissal(batsman)}</span>
              </td>
              <td className="px-2 py-2 text-center font-bold text-white">{batsman.runs}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{batsman.balls}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{batsman.zeros}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{batsman.fours}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{batsman.sixes}</td>
              <td className="px-2 py-2 text-center text-xs text-white">
                {batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderBowlingStatsTable(innings: InningsState | null | undefined) {
  const bowlers = getBowlerStats(innings);

  if (bowlers.length === 0) {
    return <p className="px-3 pb-3 text-xs text-gray-400">No bowling stats available yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-blue-800 text-white">
          <tr>
            <th className="px-2 py-2 text-left font-semibold">Bowler</th>
            <th className="px-2 py-2 text-center font-semibold">O</th>
            <th className="px-2 py-2 text-center font-semibold">R</th>
            <th className="px-2 py-2 text-center font-semibold">W</th>
            <th className="px-2 py-2 text-center font-semibold">M</th>
            <th className="px-2 py-2 text-center font-semibold">WD</th>
            <th className="px-2 py-2 text-center font-semibold">NB</th>
            <th className="px-2 py-2 text-center font-semibold">ECO</th>
          </tr>
        </thead>
        <tbody>
          {bowlers.map((bowler, idx) => (
            <tr key={bowler.id} className={idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}>
              <td className="px-2 py-2 text-xs font-semibold text-white">{bowler.name}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{bowler.overs}.{bowler.balls % 6}</td>
              <td className="px-2 py-2 text-center text-xs font-bold text-white">{bowler.runs}</td>
              <td className="px-2 py-2 text-center text-xs font-bold text-white">{bowler.wickets}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{bowler.maidens}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{bowler.wideRuns}</td>
              <td className="px-2 py-2 text-center text-xs text-white">{bowler.noBallRuns}</td>
              <td className="px-2 py-2 text-center text-xs font-semibold text-white">{bowler.economy.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInningsBreakdown({
  innings,
  battingTeamName,
  bowlingTeamName,
  liveMatch,
}: {
  innings: InningsState | null | undefined;
  battingTeamName: string;
  bowlingTeamName: string;
  liveMatch: RootState['scorer']['liveMatch'];
}) {
  if (!innings) {
    return <div className="text-xs text-gray-400">This innings has not started yet.</div>;
  }

  const extras = getExtrasBreakdown(innings);

  return (
    <div className="space-y-3 text-xs">
      <div className="overflow-hidden rounded-lg border border-gray-600 bg-gray-800/60">
        <div className="border-b border-gray-700 p-3">
          <h4 className="mb-2 text-xs font-bold text-white">{battingTeamName} Batting</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-gray-400">Total Score</p>
              <p className="font-semibold text-white">{innings.totalRuns}/{innings.totalWickets}</p>
            </div>
            <div>
              <p className="text-gray-400">Overs</p>
              <p className="font-semibold text-white">{getOverDisplay(innings)}</p>
            </div>
            <div>
              <p className="text-gray-400">Total Extras</p>
              <p className="font-semibold text-white">{getTotalExtras(innings)}</p>
            </div>
          </div>
        </div>
        {renderBattingStatsTable(innings, liveMatch)}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-600 bg-gray-800/60">
        <div className="border-b border-gray-700 p-3">
          <h4 className="text-xs font-bold text-white">{bowlingTeamName} Bowling</h4>
        </div>
        {renderBowlingStatsTable(innings)}
      </div>

      <div className="rounded-lg border border-gray-600 bg-gray-800/60 p-3">
        <h4 className="mb-2 text-xs font-bold text-white">Extras</h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div>
            <p className="text-gray-400">Wide</p>
            <p className="font-semibold text-white">{extras.wide}</p>
          </div>
          <div>
            <p className="text-gray-400">Bye</p>
            <p className="font-semibold text-white">{extras.bye}</p>
          </div>
          <div>
            <p className="text-gray-400">Leg Bye</p>
            <p className="font-semibold text-white">{extras.legBye}</p>
          </div>
          <div>
            <p className="text-gray-400">No Ball</p>
            <p className="font-semibold text-white">{extras.noBall}</p>
          </div>
          <div>
            <p className="text-gray-400">Penalty</p>
            <p className="font-semibold text-white">{extras.penalty}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-gray-600 bg-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-3 text-left"
      >
        <h3 className="text-sm font-bold text-blue-300">{title}</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-700 text-white text-[11px]">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && <div className="border-t border-gray-700 p-3">{children}</div>}
    </section>
  );
}

/**
 * Match Details Review Component
 * Compact match summary aligned with the other review screens.
 */
export function MatchDetails() {
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No match data available. Start a new match to see details.</p>
      </div>
    );
  }

  const inningsList = getMergedInnings(liveMatch, currentInnings);
  const firstInnings = inningsList.find((innings) => innings.inningsNumber === 1) ?? null;
  const secondInnings = inningsList.find((innings) => innings.inningsNumber === 2) ?? null;

  const firstBattingTeam = firstInnings ? getTeamName(firstInnings.battingTeam, liveMatch.opponent) : 'JMCC';
  const firstBowlingTeam = firstInnings
    ? getTeamName(firstInnings.battingTeam === 'Us' ? 'Them' : 'Us', liveMatch.opponent)
    : liveMatch.opponent;
  const secondBattingTeam = secondInnings ? getTeamName(secondInnings.battingTeam, liveMatch.opponent) : liveMatch.opponent;
  const secondBowlingTeam = secondInnings
    ? getTeamName(secondInnings.battingTeam === 'Us' ? 'Them' : 'Us', liveMatch.opponent)
    : 'JMCC';

  return (
    <div className="space-y-3 px-2 py-2">
      <CollapsibleSection title="Match Details">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400">Opponent</p>
            <p className="font-semibold text-white">{liveMatch.opponent}</p>
          </div>
          <div>
            <p className="text-gray-400">Venue</p>
            <p className="font-semibold text-white">{liveMatch.venue}</p>
          </div>
          <div>
            <p className="text-gray-400">Total Overs</p>
            <p className="font-semibold text-white">{liveMatch.totalOvers}</p>
          </div>
          <div>
            <p className="text-gray-400">Toss</p>
            <p className="font-semibold text-white">{getTeamName(liveMatch.tossWonBy, liveMatch.opponent)}</p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="First Innings">
        {renderInningsBreakdown({
          innings: firstInnings,
          battingTeamName: firstBattingTeam,
          bowlingTeamName: firstBowlingTeam,
          liveMatch,
        })}
      </CollapsibleSection>

      <CollapsibleSection title="Second Innings">
        {renderInningsBreakdown({
          innings: secondInnings,
          battingTeamName: secondBattingTeam,
          bowlingTeamName: secondBowlingTeam,
          liveMatch,
        })}
      </CollapsibleSection>
    </div>
  );
}

export default MatchDetails;
