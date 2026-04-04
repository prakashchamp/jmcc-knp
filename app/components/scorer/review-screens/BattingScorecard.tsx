'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Batting Scorecard Review Component
 * Shows all batsman statistics: Runs, Balls, 4s, 6s, SR, Status
 */
export function BattingScorecard() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings) {
    return <div className="text-gray-600">No batting data available</div>;
  }

  // Combine current batsmen with dismissed batsmen
  const allBatsmen = [];
  if (currentInnings.striker) allBatsmen.push(currentInnings.striker);
  if (currentInnings.nonStriker) allBatsmen.push(currentInnings.nonStriker);
  allBatsmen.push(...currentInnings.dismissedBatsmen);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">BATTING SCORECARD</h3>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="px-4 py-2 text-left">Batsman</th>
              <th className="px-4 py-2 text-center">R</th>
              <th className="px-4 py-2 text-center">B</th>
              <th className="px-4 py-2 text-center">4s</th>
              <th className="px-4 py-2 text-center">6s</th>
              <th className="px-4 py-2 text-center">SR</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {allBatsmen.map((batsman, idx) => (
              <tr
                key={idx}
                className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
              >
                <td className="px-4 py-2 font-semibold">{batsman.name}</td>
                <td className="px-4 py-2 text-center text-lg font-bold">
                  {batsman.runs}
                </td>
                <td className="px-4 py-2 text-center">{batsman.balls}</td>
                <td className="px-4 py-2 text-center">{batsman.fours}</td>
                <td className="px-4 py-2 text-center">{batsman.sixes}</td>
                <td className="px-4 py-2 text-center">
                  {batsman.balls > 0
                    ? ((batsman.runs / batsman.balls) * 100).toFixed(1)
                    : '0.0'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      batsman.status === 'batting'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {batsman.status === 'batting' ? 'NotOut' : 'Out'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600 pt-2">
        <p>
          <strong>Total Runs:</strong> {currentInnings.totalRuns}
        </p>
        <p>
          <strong>Wickets:</strong> {currentInnings.totalWickets}
        </p>
      </div>
    </div>
  );
}

export default BattingScorecard;
