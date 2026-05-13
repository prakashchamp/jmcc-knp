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
        <div className="overflow-hidden border-2 border-border rounded-lg shadow-sm">
          <table className="w-full text-xs">
            <thead className="bg-green-600 text-white">
              <tr>
                <th className="px-2 py-2.5 text-left font-black uppercase tracking-wider">Batsman</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">R</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">B</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">0s</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">4s</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">6s</th>
                <th className="px-2 py-2.5 text-center font-black uppercase tracking-wider">SR</th>
              </tr>
            </thead>
            <tbody>
              {allBatsmen.map((batsman) => (
                <tr
                  key={batsman.id}
                  className={`border-b border-border/50 ${batsman.status === 'batting' && batsman.dismissal?.mode !== 'retired-hurt' ? 'bg-green-500/10' : 'bg-background'}`}
                >
                  <td className="px-2 py-2.5">
                    <div className="font-black text-foreground text-xs">{batsman.name}</div>
                    <span className="text-[10px] font-bold opacity-60 mt-0.5 inline-block uppercase tracking-tight">
                      {formatDismissal(batsman)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center font-black text-foreground">
                    {batsman.runs}
                  </td>
                  <td className="px-2 py-2.5 text-center text-foreground font-bold opacity-80">{batsman.balls}</td>
                  <td className="px-2 py-2.5 text-center text-foreground font-bold opacity-80">{batsman.zeros}</td>
                  <td className="px-2 py-2.5 text-center text-foreground font-bold opacity-80">{batsman.fours}</td>
                  <td className="px-2 py-2.5 text-center text-foreground font-bold opacity-80">{batsman.sixes}</td>
                  <td className="px-2 py-2.5 text-center text-foreground font-black opacity-90">
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
