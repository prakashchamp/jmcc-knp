import type { CurrentBatsman, InningsState, LiveMatch } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';

function getRosterIdsForTeam(liveMatch: LiveMatch | null, team: 'Us' | 'Them'): Set<string> {
  if (team === 'Us') {
    return new Set((liveMatch?.teamPlayers ?? []).map((player) => player.id));
  }

  return new Set(OPPONENT_TEAM_PLAYERS.map((player) => player.id));
}

/**
 * Shared batting rows source for review screens.
 * - Sorts by batting order
 * - Deduplicates by player id (keeps the latest occurrence)
 * - Filters by batting team's official roster
 */
export function getNormalizedBatsmen(
  innings: InningsState | null | undefined,
  liveMatch: LiveMatch | null
): CurrentBatsman[] {
  if (!innings?.batsmanStats?.length) return [];

  const sorted = [...innings.batsmanStats].sort((a, b) => (a.batsmanOrder || 0) - (b.batsmanOrder || 0));

  // Keep the latest entry for same player id if duplicates exist.
  const byId = new Map<string, CurrentBatsman>();
  for (const batsman of sorted) {
    byId.set(batsman.id, batsman);
  }

  const rosterIds = getRosterIdsForTeam(liveMatch, innings.battingTeam);

  return Array.from(byId.values())
    .filter((batsman) => rosterIds.has(batsman.id))
    .sort((a, b) => (a.batsmanOrder || 0) - (b.batsmanOrder || 0));
}
