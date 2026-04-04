'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Partnerships Review Component
 * Shows all partnership runs and details between batsmen
 */
export function Partnerships() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings) {
    return <div className="text-gray-600">No partnership data available</div>;
  }

  // Calculate partnerships from ball history
  const partnerships: {
    num: number;
    batsman1: string;
    batsman2: string;
    runs: number;
    balls: number;
  }[] = [];

  let currentBatsman1 = '';
  let currentBatsman2 = '';
  let partnershipRuns = 0;
  let partnershipBalls = 0;
  let partnershipNum = 1;

  for (const ball of currentInnings.ballHistory) {
    const batter = ball.batter.name;
    const nonStriker = ball.nonStriker.name;

    // Check if partnership changed
    if (
      currentBatsman1 &&
      currentBatsman2 &&
      (currentBatsman1 !== batter || currentBatsman2 !== nonStriker)
    ) {
      // Save current partnership
      if (partnershipRuns > 0 || partnershipBalls > 0) {
        partnerships.push({
          num: partnershipNum,
          batsman1: currentBatsman1,
          batsman2: currentBatsman2,
          runs: partnershipRuns,
          balls: partnershipBalls,
        });
        partnershipNum++;
      }

      partnershipRuns = 0;
      partnershipBalls = 0;
    }

    currentBatsman1 = batter;
    currentBatsman2 = nonStriker;
    partnershipRuns += ball.runs.total || 0;
    partnershipBalls += 1;
  }

  // Add last partnership if exists
  if (partnershipRuns > 0 || partnershipBalls > 0) {
    partnerships.push({
      num: partnershipNum,
      batsman1: currentBatsman1,
      batsman2: currentBatsman2,
      runs: partnershipRuns,
      balls: partnershipBalls,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">PARTNERSHIPS</h3>

      {partnerships.length === 0 ? (
        <div className="text-gray-600">No partnership data available</div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-teal-600 text-white">
              <tr>
                <th className="px-4 py-2 text-center">#</th>
                <th className="px-4 py-2 text-left">Batsman 1</th>
                <th className="px-4 py-2 text-left">Batsman 2</th>
                <th className="px-4 py-2 text-center">Runs</th>
                <th className="px-4 py-2 text-center">Balls</th>
                <th className="px-4 py-2 text-center">RR</th>
              </tr>
            </thead>
            <tbody>
              {partnerships.map((partnership, idx) => {
                const runRate =
                  partnership.balls > 0
                    ? ((partnership.runs / partnership.balls) * 100).toFixed(1)
                    : '0.0';

                return (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="px-4 py-2 text-center font-bold text-teal-600">
                      {partnership.num}
                    </td>
                    <td className="px-4 py-2">{partnership.batsman1}</td>
                    <td className="px-4 py-2">{partnership.batsman2}</td>
                    <td className="px-4 py-2 text-center font-bold">
                      {partnership.runs}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {partnership.balls}
                    </td>
                    <td className="px-4 py-2 text-center text-sm">
                      {runRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Partnerships;
