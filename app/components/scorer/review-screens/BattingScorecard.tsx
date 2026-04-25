'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import type { CurrentBatsman, InningsState } from '@/app/lib/cricket-scorer-types';
import { getBattingTeamInnings, ReviewTeam, ReviewTeamToggle } from './ReviewTeamToggle';
import { getNormalizedBatsmen } from './review-batting-utils';
import { useTeamName } from '@/app/lib/hooks/useTeamName';

/**
 * Batting Scorecard Review Component
 * Shows batsman statistics for the current innings
 * Includes dismissal status and extras breakdown
 * Uses single source of truth: batsmanStats array from Redux
 */
export function BattingScorecard() {
  const { currentInnings, liveMatch } = useSelector((state: RootState) => state.scorer);
  const [selectedTeam, setSelectedTeam] = useState<ReviewTeam>(currentInnings?.battingTeam ?? 'Us');

  if (!currentInnings && !liveMatch) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No match in progress. Start a new match to see batting data.</p>
      </div>
    );
  }

  const selectedInnings = getBattingTeamInnings(liveMatch, currentInnings, selectedTeam);

  // Format dismissal mode for display
  const formatDismissal = (batsman: CurrentBatsman): string => {
    if (batsman.status === 'batting') {
      // If batting but has retired-hurt dismissal, show it
      if (batsman.dismissal?.mode === 'retired-hurt') {
        return 'Retired Hurt';
      }
      return 'not out';
    }
    if (batsman.dismissal?.mode) {
      // Convert snake_case to Title Case (e.g., 'hit-wicket' -> 'Hit Wicket')
      return batsman.dismissal.mode
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Out';
  };

  /**
   * Render batting scorecard table
   */
  const renderBattingTable = (innings: InningsState | null | undefined) => {
    const allBatsmen: CurrentBatsman[] = getNormalizedBatsmen(innings, liveMatch);

    // If no batsmen yet, show empty state
    if (allBatsmen.length === 0) {
      return (
        <div className="text-center py-6 text-gray-400">
          <p>No batsmen statistics yet. Start the match to begin tracking.</p>
        </div>
      );
    }

    return (
      <div>
        <div className="overflow-hidden border border-gray-600 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-blue-800 text-white">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">Batsman</th>
                <th className="px-2 py-2 text-center font-semibold">R</th>
                <th className="px-2 py-2 text-center font-semibold">B</th>
                <th className="px-2 py-2 text-center font-semibold">0s</th>
                <th className="px-2 py-2 text-center font-semibold">4s</th>
                <th className="px-2 py-2 text-center font-semibold">6s</th>
                <th className="px-2 py-2 text-center font-semibold">SR</th>
              </tr>
            </thead>
            <tbody>
              {allBatsmen.map((batsman) => (
                <tr
                  key={batsman.id}
                  className={`${batsman.status === 'batting' && batsman.dismissal?.mode !== 'retired-hurt' ? 'bg-blue-900/40 ring-1 ring-inset ring-blue-600' : 'bg-gray-900'}`}
                >
                  <td className="px-2 py-2">
                    <div className="font-semibold text-white text-xs">{batsman.name}</div>
                    <span className="text-xs text-gray-300 mt-0.5 inline-block">
                      {formatDismissal(batsman)}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-white">
                    {batsman.runs}
                  </td>
                  <td className="px-2 py-2 text-center text-white text-xs">{batsman.balls}</td>
                  <td className="px-2 py-2 text-center text-white text-xs">{batsman.zeros}</td>
                  <td className="px-2 py-2 text-center text-white text-xs">{batsman.fours}</td>
                  <td className="px-2 py-2 text-center text-white text-xs">{batsman.sixes}</td>
                  <td className="px-2 py-2 text-center text-white text-xs">
                    {batsman.balls > 0
                      ? ((batsman.runs / batsman.balls) * 100).toFixed(1)
                      : '0.0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const teamName = useTeamName();

  return (
    <div className="px-2 py-2">
      <ReviewTeamToggle
        selectedTeam={selectedTeam}
        opponentName={liveMatch?.opponent}
        onSelect={setSelectedTeam}
      />
      {selectedInnings ? renderBattingTable(selectedInnings) : (
        <div className="text-center py-6 text-gray-400">
          <p>No batting data available for {selectedTeam === 'Us' ? teamName : liveMatch?.opponent || 'the opponent'} yet.</p>
        </div>
      )}
    </div>
  );
}

export default BattingScorecard;
