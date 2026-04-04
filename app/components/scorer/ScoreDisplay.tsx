'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Score Display Header Component
 * Shows team scores, overs bowled, and key stats (CRR, RRR, Extras)
 */
export function ScoreDisplay() {
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch || !currentInnings) {
    return (
      <div className="bg-teal-600 text-white p-4 space-y-2">
        <p className="text-sm">No match in progress</p>
      </div>
    );
  }

  const firstInnings = liveMatch.innings?.[0];
  const secondInnings = liveMatch.innings?.[1];

  if (!firstInnings) {
    return (
      <div className="bg-teal-600 text-white p-4 space-y-2">
        <p className="text-sm">Innings not initialized</p>
      </div>
    );
  }

  // Calculate overs and balls
  const currentOvers = Math.floor(currentInnings.totalBalls / 6);
  const currentBalls = currentInnings.totalBalls % 6;

  // Calculate CRR (Current Run Rate)
  const crr = currentInnings.totalBalls > 0
    ? (currentInnings.totalRuns / (currentInnings.totalBalls / 6)).toFixed(2)
    : '0.00';

  // Calculate RRR (Required Run Rate) if second innings
  const rrr = liveMatch.currentInnings === 2 && firstInnings
    ? (
        (firstInnings.totalRuns + 1 - currentInnings.totalRuns) /
        (liveMatch.totalOvers * 6 - currentInnings.totalBalls) * 6
      ).toFixed(2)
    : '-';

  // Count extras
  const extras = currentInnings.totalRuns - (currentInnings.striker?.runs || 0) - (currentInnings.nonStriker?.runs || 0);

  return (
    <div className="bg-teal-600 text-white p-6 space-y-4">
      {/* First Inning Score */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex-1">
          <div className="font-semibold">OPPONENT TEAM</div>
          <div className="text-lg font-bold">
            {firstInnings.totalRuns}/{firstInnings.totalWickets}{' '}
            <span className="text-xs ml-2">({currentOvers}.{currentBalls}/{liveMatch.totalOvers})</span>
          </div>
        </div>
        <div className="text-right flex-1">
          <div className="font-semibold">YOUR TEAM</div>
          <div className="text-lg font-bold">
            {secondInnings ? (
              <>
                {secondInnings.totalRuns}/{secondInnings.totalWickets}{' '}
                <span className="text-xs ml-2">({currentOvers}.{currentBalls}/{liveMatch.totalOvers})</span>
              </>
            ) : (
              <>
                {currentInnings.totalRuns}/{currentInnings.totalWickets}{' '}
                <span className="text-xs ml-2">({currentOvers}.{currentBalls}/{liveMatch.totalOvers})</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScoreDisplay;
