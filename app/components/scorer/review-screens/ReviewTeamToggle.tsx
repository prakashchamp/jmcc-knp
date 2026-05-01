'use client';

import { useTeamName } from '@/app/lib/hooks/useTeamName';
import type { InningsState, LiveMatch } from '@/app/lib/cricket-scorer-types';

export type ReviewTeam = 'Us' | 'Them';

interface ReviewTeamToggleProps {
  selectedTeam: ReviewTeam;
  opponentName?: string;
  onSelect: (team: ReviewTeam) => void;
}

export function getTeamDisplayName(team: ReviewTeam, opponentName?: string, teamName: string = 'JMCC') {
  return team === 'Us' ? teamName : opponentName || 'Opponent';
}

function getAvailableInnings(liveMatch: LiveMatch | null, currentInnings: InningsState | null) {
  const innings = liveMatch?.innings ? [...liveMatch.innings] : [];

  if (currentInnings) {
    const matchingIndex = innings.findIndex(
      (inningsItem) =>
        inningsItem.inningsNumber === currentInnings.inningsNumber &&
        inningsItem.battingTeam === currentInnings.battingTeam
    );

    if (matchingIndex >= 0) {
      innings[matchingIndex] = currentInnings;
    } else {
      innings.push(currentInnings);
    }
  }

  return innings.sort((a, b) => a.inningsNumber - b.inningsNumber);
}

export function getBattingTeamInnings(
  liveMatch: LiveMatch | null,
  currentInnings: InningsState | null,
  selectedTeam: ReviewTeam
) {
  const innings = getAvailableInnings(liveMatch, currentInnings);
  const byTeam = innings.find((inningsItem) => inningsItem.battingTeam === selectedTeam);
  if (byTeam) return byTeam;

  // Defensive fallback for historical/stale states where battingTeam flag may be inconsistent.
  if (selectedTeam === 'Us') {
    return innings[0] ?? null;
  }
  return innings.length > 1 ? innings[1] : null;
}

export function getBowlingTeamInnings(
  liveMatch: LiveMatch | null,
  currentInnings: InningsState | null,
  selectedTeam: ReviewTeam
) {
  const innings = getAvailableInnings(liveMatch, currentInnings);
  const byTeam = innings.find(
    (inningsItem) => (inningsItem.battingTeam === 'Us' ? 'Them' : 'Us') === selectedTeam
  );
  if (byTeam) return byTeam;

  // Defensive fallback for historical/stale states where battingTeam flag may be inconsistent.
  if (selectedTeam === 'Us') {
    return innings.length > 1 ? innings[1] ?? null : null;
  }
  return innings[0] ?? null;
}

export function ReviewTeamToggle({ selectedTeam, opponentName, onSelect }: ReviewTeamToggleProps) {
  const teamName = useTeamName();

  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <button
        onClick={() => onSelect('Us')}
        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition-all active:scale-95 shadow-sm ${
          selectedTeam === 'Us'
            ? 'border-transparent bg-blue-600 text-white'
            : 'border-border bg-background text-foreground hover:bg-blue-600/5'
        }`}
      >
        {teamName}
      </button>
      <button
        onClick={() => onSelect('Them')}
        className={`rounded-xl border-2 px-3 py-2 text-sm font-black transition-all active:scale-95 shadow-sm ${
          selectedTeam === 'Them'
            ? 'border-transparent bg-blue-600 text-white'
            : 'border-border bg-background text-foreground hover:border-blue-600/5'
        }`}
      >
        {getTeamDisplayName('Them', opponentName)}
      </button>
    </div>
  );
}
