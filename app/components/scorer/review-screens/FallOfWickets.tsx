'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { getBattingTeamInnings, ReviewTeam, ReviewTeamToggle } from './ReviewTeamToggle';

/**
 * Fall of Wickets Review Component
 * Shows wicket-by-wicket breakdown with over, runs at dismissal, and batsman name
 * Theme: Consistent with batting/bowling scorecards (Teal-700 headers, Gray-800 body)
 */
export function FallOfWickets() {
  const { currentInnings, liveMatch } = useSelector((state: RootState) => state.scorer);
  const [selectedTeam, setSelectedTeam] = useState<ReviewTeam>(currentInnings?.battingTeam ?? 'Us');
  const selectedInnings = getBattingTeamInnings(liveMatch, currentInnings, selectedTeam);

  if (!currentInnings && !liveMatch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No wickets fallen yet</p>
      </div>
    );
  }

  /**
   * Find the over when a specific batsman got out
   * Returns format like "4.3" (over 4, ball 3)
   */
  const findWicketOver = (batsmanId: string): string => {
    // Find the wicket ball for this batsman
    const wicketBall = selectedInnings?.ballHistory.find(
      (ball) =>
        ball.isWicket &&
        ball.dismissal?.playerOut.id === batsmanId
    );

    if (wicketBall) {
      return `${Math.floor(wicketBall.over)}.${wicketBall.ball}`;
    }
    return '-';
  };

  /**
   * Calculate cumulative runs at the point of each wicket
   */
  const getRunsAtWicket = (batsmanId: string): number => {
    // Find the wicket ball for this batsman
    const wicketBallIndex = selectedInnings?.ballHistory.findIndex(
      (ball) =>
        ball.isWicket &&
        ball.dismissal?.playerOut.id === batsmanId
    );

    if (wicketBallIndex !== -1) {
      // Sum all runs up to and including this ball
      return (selectedInnings?.ballHistory || [])
        .slice(0, wicketBallIndex + 1)
        .reduce((sum, ball) => sum + ball.runs.total, 0);
    }

    return 0;
  };

  return (
    <div className="px-2 py-2">
      <ReviewTeamToggle
        selectedTeam={selectedTeam}
        opponentName={liveMatch?.opponent}
        onSelect={setSelectedTeam}
      />
      {!selectedInnings || selectedInnings.dismissedBatsmen.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No wickets fallen yet</p>
        </div>
      ) : (
      <div className="overflow-hidden rounded-lg border border-gray-600">
        <table className="w-full text-xs">
          <thead className="bg-blue-800 text-white border-b border-gray-600">
            <tr>
              <th className="px-2 py-2 text-center font-bold">Wicket</th>
              <th className="px-2 py-2 text-center font-bold">Over</th>
              <th className="px-2 py-2 text-center font-bold">Runs</th>
              <th className="px-2 py-2 text-left font-bold">Batsman Name</th>
            </tr>
          </thead>
          <tbody>
            {selectedInnings.dismissedBatsmen.map((batsman, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? 'bg-gray-800 border-b border-gray-700' : 'bg-gray-700 border-b border-gray-600'}
              >
                <td className="px-2 py-2 text-center font-bold text-white text-xs">
                  {idx + 1}
                </td>
                <td className="px-2 py-2 text-center font-semibold text-white text-xs">
                  {findWicketOver(batsman.id)}
                </td>
                <td className="px-2 py-2 text-center font-bold text-white text-xs">
                  {getRunsAtWicket(batsman.id)}
                </td>
                <td className="px-2 py-2 font-semibold text-white text-xs">{batsman.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export default FallOfWickets;
