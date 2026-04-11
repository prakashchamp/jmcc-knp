'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { formatBallDisplay } from '@/app/lib/ball-display-utils';
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
  }[] = [];

  for (const ball of selectedInnings?.ballHistory || []) {
    const overNum = Math.floor(ball.over);

    if (!overGroups[overNum]) {
      overGroups[overNum] = { over: overNum, balls: [], overRuns: 0 };
    }

    overGroups[overNum].balls.push(ball);
    overGroups[overNum].overRuns += ball.runs.total || 0;
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
      <div className="overflow-hidden rounded-lg border border-gray-600">
        <table className="w-full table-fixed text-xs">
          <thead className="bg-teal-800 text-white border-b border-gray-600">
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
                className={isCurrentOver ? 'bg-teal-900/40 ring-1 ring-inset ring-teal-600 border-b border-teal-700' : idx % 2 === 0 ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-700 border-b border-gray-600'}
              >
                <td className="px-2 py-2 text-center font-semibold text-white">
                  {overGroup.over + 1}.0
                </td>
                <td className="px-2 py-2 text-center font-bold text-white">
                  {overGroup.overRuns}
                </td>
                <td className="px-2 py-2 text-left text-xs text-white align-top">
                  <div className="flex flex-wrap gap-1">
                    {overGroup.balls.map((ball, ballIdx) => (
                      <span
                        key={ballIdx}
                        className="inline-flex w-fit px-2 py-0.5 rounded border border-gray-600 bg-gray-800 text-center text-xs font-semibold text-white whitespace-nowrap"
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
