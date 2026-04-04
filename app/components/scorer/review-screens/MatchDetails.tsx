'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Match Details Review Component
 * Shows overall match information, scores, and summary
 */
export function MatchDetails() {
  const { liveMatch, currentInnings } = useSelector(
    (state: RootState) => state.scorer
  );

  if (!liveMatch || !currentInnings) {
    return <div className="text-gray-600">No match data available</div>;
  }

  const overs = Math.floor(currentInnings.totalBalls / 6);
  const balls = currentInnings.totalBalls % 6;
  const crr =
    currentInnings.totalBalls > 0
      ? ((currentInnings.totalRuns * 6) / currentInnings.totalBalls).toFixed(2)
      : '0.00';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">MATCH DETAILS</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold">OPPONENT</p>
            <p className="text-xl font-bold text-gray-800">{liveMatch.opponent}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold">VENUE</p>
            <p className="text-xl font-bold text-gray-800">{liveMatch.venue}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold">FORMAT</p>
            <p className="text-xl font-bold text-gray-800">{liveMatch.format}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs text-gray-600 font-semibold">TOSS</p>
            <p className="text-xl font-bold text-gray-800">
              {liveMatch.tossWonBy} won, chose to {liveMatch.tossDecision}
            </p>
          </div>
        </div>
      </div>

      {/* Score Summary */}
      <div>
        <h4 className="text-lg font-bold text-gray-800 mb-3">OUR INNINGS</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <p className="text-xs text-teal-600 font-semibold">RUNS</p>
            <p className="text-2xl font-bold text-teal-700">
              {currentInnings.totalRuns}
            </p>
          </div>

          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <p className="text-xs text-teal-600 font-semibold">WICKETS</p>
            <p className="text-2xl font-bold text-teal-700">
              {currentInnings.totalWickets}
            </p>
          </div>

          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <p className="text-xs text-teal-600 font-semibold">OVERS</p>
            <p className="text-2xl font-bold text-teal-700">
              {overs}.{balls}
            </p>
          </div>

          <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
            <p className="text-xs text-teal-600 font-semibold">CRR</p>
            <p className="text-2xl font-bold text-teal-700">{crr}</p>
          </div>
        </div>
      </div>

      {/* Match Status */}
      <div>
        <h4 className="text-lg font-bold text-gray-800 mb-3">MATCH STATUS</h4>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-blue-600 font-semibold">Status</p>
              <p className="text-lg font-bold text-blue-700 capitalize">
                {liveMatch.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-semibold">Innings</p>
              <p className="text-lg font-bold text-blue-700">
                {liveMatch.currentInnings}
              </p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-semibold">Total Balls</p>
              <p className="text-lg font-bold text-blue-700">
                {currentInnings.totalBalls}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Batsmen */}
      {(currentInnings.striker || currentInnings.nonStriker) && (
        <div>
          <h4 className="text-lg font-bold text-gray-800 mb-3">CURRENT BATSMEN</h4>

          <div className="space-y-2">
            {currentInnings.striker && (
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-600 font-semibold">STRIKER</p>
                <p className="text-lg font-bold text-green-700">
                  {currentInnings.striker.name}
                </p>
                <p className="text-sm text-green-600">
                  {currentInnings.striker.runs}({currentInnings.striker.balls})
                </p>
              </div>
            )}

            {currentInnings.nonStriker && (
              <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
                <p className="text-xs text-gray-600 font-semibold">NON-STRIKER</p>
                <p className="text-lg font-bold text-gray-700">
                  {currentInnings.nonStriker.name}
                </p>
                <p className="text-sm text-gray-600">
                  {currentInnings.nonStriker.runs}({currentInnings.nonStriker.balls})
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MatchDetails;
