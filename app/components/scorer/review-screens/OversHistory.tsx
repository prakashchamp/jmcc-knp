'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Overs History Review Component
 * Shows ball-by-ball breakdown organized by overs
 * Displays runs, extras, wickets, batsman details
 */
export function OversHistory() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings || currentInnings.ballHistory.length === 0) {
    return <div className="text-gray-600">No balls recorded yet</div>;
  }

  // Group balls by over
  const overGroups: {
    over: number;
    balls: any[];
    overRuns: number;
  }[] = [];

  for (const ball of currentInnings.ballHistory) {
    const overNum = Math.floor(ball.over);
    const ballInOver = ball.ball;

    if (!overGroups[overNum]) {
      overGroups[overNum] = { over: overNum, balls: [], overRuns: 0 };
    }

    overGroups[overNum].balls.push(ball);
    overGroups[overNum].overRuns += ball.runs.total || 0;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">OVERS HISTORY</h3>

      <div className="space-y-3">
        {overGroups.map((overGroup) => (
          <div
            key={overGroup.over}
            className="border border-gray-300 rounded-lg p-3 bg-gray-50"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-gray-800">Over {overGroup.over}</h4>
              <span className="text-sm font-bold text-teal-600">
                {overGroup.overRuns} runs
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {overGroup.balls.map((ball, idx) => {
                let ballDisplay = '';
                let bgColor = 'bg-gray-200';

                if (ball.isWicket) {
                  ballDisplay = 'W';
                  bgColor = 'bg-red-500 text-white';
                } else if (ball.extra?.type === 'wide') {
                  ballDisplay = `${ball.runs.batter}w`;
                  bgColor = 'bg-yellow-400';
                } else if (ball.extra?.type === 'no-ball') {
                  ballDisplay = `${ball.runs.batter}nb`;
                  bgColor = 'bg-yellow-400';
                } else if (ball.extra?.type === 'bye') {
                  ballDisplay = `${ball.runs.batter}b`;
                  bgColor = 'bg-blue-300';
                } else if (ball.extra?.type === 'leg-bye') {
                  ballDisplay = `${ball.runs.batter}lb`;
                  bgColor = 'bg-blue-300';
                } else {
                  const runs = ball.runs.total;
                  if (runs === 0) {
                    ballDisplay = '0';
                    bgColor = 'bg-gray-300';
                  } else if (runs === 4) {
                    ballDisplay = '4';
                    bgColor = 'bg-green-400';
                  } else if (runs === 6) {
                    ballDisplay = '6';
                    bgColor = 'bg-green-600 text-white';
                  } else {
                    ballDisplay = runs.toString();
                    bgColor = 'bg-gray-200';
                  }
                }

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-center rounded font-bold text-sm h-8 ${bgColor}`}
                  >
                    {ballDisplay}
                  </div>
                );
              })}
            </div>

            {/* Ball details */}
            <div className="text-xs text-gray-600 mt-2 space-y-1">
              {overGroup.balls.map((ball, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    Ball {idx + 1}: {ball.batter.name} ({ball.runs.total} runs)
                  </span>
                  {ball.isWicket && (
                    <span className="text-red-600 font-semibold">
                      {ball.dismissal?.mode || 'Wicket'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OversHistory;
