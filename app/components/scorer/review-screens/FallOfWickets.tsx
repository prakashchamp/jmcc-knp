'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Fall of Wickets Review Component
 * Shows all dismissals with batsman, mode, runs, and ball number
 */
export function FallOfWickets() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings || currentInnings.dismissedBatsmen.length === 0) {
    return <div className="text-gray-600">No wickets fallen yet</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">FALL OF WICKETS</h3>

      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="px-4 py-2 text-left">Wicket #</th>
              <th className="px-4 py-2 text-left">Batsman</th>
              <th className="px-4 py-2 text-center">Runs</th>
              <th className="px-4 py-2 text-center">Balls</th>
              <th className="px-4 py-2 text-left">Dismissal</th>
              <th className="px-4 py-2 text-center">At Score</th>
            </tr>
          </thead>
          <tbody>
            {currentInnings.dismissedBatsmen.map((batsman, idx) => {
              // Find score when this batsman was out (approximate based on runs at wicket)
              const scoreAtWicket = currentInnings.totalRuns - batsman.runs;

              return (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                >
                  <td className="px-4 py-2 font-bold text-red-600">{idx + 1}</td>
                  <td className="px-4 py-2 font-semibold">{batsman.name}</td>
                  <td className="px-4 py-2 text-center">{batsman.runs}</td>
                  <td className="px-4 py-2 text-center">{batsman.balls}</td>
                  <td className="px-4 py-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      {batsman.dismissal?.mode || 'Out'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-600">
                    {scoreAtWicket}-{idx + 1}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600 pt-2">
        <p>
          <strong>Total Wickets:</strong> {currentInnings.totalWickets}
        </p>
        <p>
          <strong>Total Runs at Last Wicket:</strong> {currentInnings.totalRuns}
        </p>
      </div>
    </div>
  );
}

export default FallOfWickets;
