'use client';

import type { InningsState, LiveMatch } from '@/app/lib/cricket-scorer-types';

export type ReviewTeam = 'Us' | 'Them';

interface ReviewTeamToggleProps {
  selectedTeam: ReviewTeam;
  opponentName?: string;
  onSelect: (team: ReviewTeam) => void;
}

export function getTeamDisplayName(team: ReviewTeam, opponentName?: string) {
  return team === 'Us' ? 'JMCC' : opponentName || 'Opponent';
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
  return (
    <div className="mb-3 grid grid-cols-2 gap-2">
      <button
        onClick={() => onSelect('Us')}
        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
          selectedTeam === 'Us'
            ? 'border-blue-500 bg-blue-700 text-white'
            : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        JMCC
      </button>
      <button
        onClick={() => onSelect('Them')}
        className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
          selectedTeam === 'Them'
            ? 'border-blue-500 bg-blue-700 text-white'
            : 'border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700'
        }`}
      >
        {getTeamDisplayName('Them', opponentName)}
      </button>
    </div>
  );
}
