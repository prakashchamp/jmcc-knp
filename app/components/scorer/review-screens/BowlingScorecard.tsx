'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { CricketScoringEngine } from '@/app/lib/scoring-engine';

/**
 * Bowling Scorecard Review Component
 * Shows all bowler statistics: Overs, Runs, Wickets, Maidens, Economy
 */
export function BowlingScorecard() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings) {
    return <div className="text-gray-600">No bowling data available</div>;
  }

  // Get unique bowlers from ball history
  const bowlerMap = new Map<string, any>();

  for (const ball of currentInnings.ballHistory) {
    if (!ball.bowler) continue;

    if (!bowlerMap.has(ball.bowler.id)) {
      bowlerMap.set(ball.bowler.id, {
        id: ball.bowler.id,
        name: ball.bowler.name,
        overs: 0,
        balls: 0,
        runs: 0,
        wickets: 0,
        maidens: 0,
      });
    }

    const bowler = bowlerMap.get(ball.bowler.id);
    bowler.balls += 1;
    bowler.runs += ball.runs.total || 0;

    if (ball.isWicket) {
      bowler.wickets += 1;
    }

    if (ball.runs.total === 0 && !ball.isWicket) {
      bowler.maidens += 1;
    }

    bowler.overs = Math.floor(bowler.balls / 6);
  }

  const bowlers = Array.from(bowlerMap.values());

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800">BOWLING SCORECARD</h3>

      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-white">
            <tr>
              <th className="px-4 py-2 text-left">Bowler</th>
              <th className="px-4 py-2 text-center">O.B</th>
              <th className="px-4 py-2 text-center">R</th>
              <th className="px-4 py-2 text-center">W</th>
              <th className="px-4 py-2 text-center">M</th>
              <th className="px-4 py-2 text-center">ECO</th>
            </tr>
          </thead>
          <tbody>
            {bowlers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                  No bowling data yet
                </td>
              </tr>
            ) : (
              bowlers.map((bowler, idx) => {
                const economy = bowler.overs > 0 ? bowler.runs / bowler.overs : 0;

                return (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="px-4 py-2 font-semibold">{bowler.name}</td>
                    <td className="px-4 py-2 text-center">
                      {bowler.overs}.{bowler.balls % 6}
                    </td>
                    <td className="px-4 py-2 text-center font-bold">
                      {bowler.runs}
                    </td>
                    <td className="px-4 py-2 text-center font-bold">
                      {bowler.wickets}
                    </td>
                    <td className="px-4 py-2 text-center">{bowler.maidens}</td>
                    <td className="px-4 py-2 text-center">
                      {economy.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BowlingScorecard;
