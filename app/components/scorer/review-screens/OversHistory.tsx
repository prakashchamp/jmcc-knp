'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { formatBallDisplay, getBallColor } from '@/app/lib/ball-display-utils';
import type { Ball } from '@/app/lib/cricket-scorer-types';
import { getBattingTeamInnings, ReviewTeam, ReviewTeamToggle } from './ReviewTeamToggle';

/**
 * Overs History Review Component
 * Shows over-by-over summary with table format
 * Columns: Over, Runs, Details (ball sequence)
 * Theme: Consistent with batting/bowling scorecards (Teal-700 headers, Gray-800 body)
 */
export function OversHistory() {
  const { currentInnings, liveMatch } = useSelector((state: RootState) => state.scorer);
  const [selectedTeam, setSelectedTeam] = useState<ReviewTeam>(currentInnings?.battingTeam ?? 'Us');
  const selectedInnings = getBattingTeamInnings(liveMatch, currentInnings, selectedTeam);

  if (!currentInnings && !liveMatch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No balls recorded yet</p>
      </div>
    );
  }

  // Group balls by over
  const overGroups: {
    over: number;
    balls: Ball[];
    overRuns: number;
    cumulativeRuns: number;
    cumulativeWickets: number;
  }[] = [];

  let totalRuns = 0;
  let totalWickets = 0;

  for (const ball of selectedInnings?.ballHistory || []) {
    const overNum = Math.floor(ball.over);

    if (!overGroups[overNum]) {
      overGroups[overNum] = { over: overNum, balls: [], overRuns: 0, cumulativeRuns: 0, cumulativeWickets: 0 };
    }

    overGroups[overNum].balls.push(ball);
    overGroups[overNum].overRuns += ball.runs.total || 0;
    totalRuns += ball.runs.total || 0;
    if (ball.isWicket) totalWickets += 1;
    overGroups[overNum].cumulativeRuns = totalRuns;
    overGroups[overNum].cumulativeWickets = totalWickets;
  }

  return (
    <div className="px-2 py-2">
      <ReviewTeamToggle
        selectedTeam={selectedTeam}
        opponentName={liveMatch?.opponent}
        onSelect={setSelectedTeam}
      />
      {!selectedInnings || selectedInnings.ballHistory.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No balls recorded yet</p>
        </div>
      ) : (
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-green-600 text-white border-b border-border">
            <tr>
              <th className="w-16 px-2 py-2 text-center font-bold">Over</th>
              <th className="w-16 px-2 py-2 text-center font-bold">Runs</th>
              <th className="px-2 py-2 text-left font-bold">Details</th>
            </tr>
          </thead>
          <tbody>
            {overGroups.map((overGroup, idx) => {
              const isCurrentOver = overGroup.over === Math.floor((selectedInnings?.totalBalls || 0) / 6);

              return (
              <tr
                key={overGroup.over}
                className={idx % 2 === 0 ? 'bg-background border-b border-border' : 'bg-card border-b border-border dark:bg-slate-800'}
              >
                <td className="px-2 py-2 text-center font-semibold text-foreground dark:text-white">
                  <div className="text-sm font-semibold mb-1">{overGroup.over + 1}.{overGroup.balls.length < 6 ? overGroup.balls.length : 0}</div>
                  <div className="text-m text-green-600 font-semibold">{overGroup.cumulativeRuns} / {overGroup.cumulativeWickets}</div>
                </td>
                <td className="px-2 py-2 text-center font-bold text-foreground dark:text-white">
                  {overGroup.overRuns}
                </td>
                <td className="px-2 py-2 text-left text-xs text-foreground dark:text-white align-top">
                  <div className="flex flex-wrap gap-1">
                    {overGroup.balls.map((ball, ballIdx) => (
                      <span
                        key={ballIdx}
                        className={`inline-flex w-fit px-2 py-0.5 rounded border border-border ${getBallColor(ball)} text-center text-xs font-semibold whitespace-nowrap`}
                      >
                        {formatBallDisplay(ball)}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export default OversHistory;
