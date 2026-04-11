'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import type { InningsState } from '@/app/lib/cricket-scorer-types';
import { getBowlerStats } from '@/app/lib/bowling-stats-utils';
import { getBowlingTeamInnings, ReviewTeam, ReviewTeamToggle } from './ReviewTeamToggle';

/**
 * Bowling Scorecard Review Component
 * Shows bowler statistics for the current innings
 * Theme consistent with BattingScorecard (Teal-700 headers, Gray-800/700 rows)
 */
export function BowlingScorecard() {
  const { currentInnings, liveMatch } = useSelector((state: RootState) => state.scorer);
  const [selectedTeam, setSelectedTeam] = useState<ReviewTeam>(
    currentInnings?.battingTeam === 'Us' ? 'Them' : 'Us'
  );

  if (!currentInnings && !liveMatch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No match in progress. Start a new match to see bowling data.</p>
      </div>
    );
  }

  const selectedInnings = getBowlingTeamInnings(liveMatch, currentInnings, selectedTeam);

  /**
   * Render bowling scorecard table
   */
  const renderBowlingTable = (innings: InningsState | null | undefined) => {
    const bowlers = getBowlerStats(innings);

    if (bowlers.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400">
          <p>No bowling data yet. Start the match to begin tracking.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="overflow-hidden border border-gray-600 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-teal-800 text-white">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">Bowler</th>
                <th className="px-2 py-2 text-center font-semibold">O</th>
                <th className="px-2 py-2 text-center font-semibold">R</th>
                <th className="px-2 py-2 text-center font-semibold">W</th>
                <th className="px-2 py-2 text-center font-semibold">M</th>
                <th className="px-2 py-2 text-center font-semibold">WD</th>
                <th className="px-2 py-2 text-center font-semibold">NB</th>
                <th className="px-2 py-2 text-center font-semibold">ECO</th>
              </tr>
            </thead>
            <tbody>
              {bowlers.map((bowler, idx) => {
                const economy = bowler.economy;
                const isCurrentBowler =
                  innings?.currentBowler?.name?.trim().toLowerCase() === bowler.name.trim().toLowerCase();

                return (
                  <tr
                    key={bowler.id}
                    className={isCurrentBowler ? 'bg-teal-900/40 ring-1 ring-inset ring-teal-600' : idx % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'}
                  >
                    <td className="px-2 py-2 font-semibold text-white text-xs">{bowler.name}</td>
                    <td className="px-2 py-2 text-center text-white text-xs">
                      {bowler.overs}.{bowler.balls % 6}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-white text-xs">
                      {bowler.runs}
                    </td>
                    <td className="px-2 py-2 text-center text-white font-bold text-xs">
                      {bowler.wickets}
                    </td>
                    <td className="px-2 py-2 text-center text-white text-xs">{bowler.maidens}</td>
                    <td className="px-2 py-2 text-center text-white text-xs">{bowler.wideRuns}</td>
                    <td className="px-2 py-2 text-center text-white text-xs">{bowler.noBallRuns}</td>
                    <td className="px-2 py-2 text-center text-white font-semibold text-xs">
                      {economy.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="px-2 py-2">
      <ReviewTeamToggle
        selectedTeam={selectedTeam}
        opponentName={liveMatch?.opponent}
        onSelect={setSelectedTeam}
      />
      {selectedInnings ? renderBowlingTable(selectedInnings) : (
        <div className="text-center py-6 text-gray-400">
          <p>No bowling data available for {selectedTeam === 'Us' ? 'JMCC' : liveMatch?.opponent || 'the opponent'} yet.</p>
        </div>
      )}
    </div>
  );
}

export default BowlingScorecard;
