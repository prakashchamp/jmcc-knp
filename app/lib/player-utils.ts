import { TeamPlayer } from './cricket-schema';

export function normalizePlayerName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function generatePlayerIdFromName(name: string): string {
  const normalized = normalizePlayerName(name);
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug;
}

/**
 * Fallback player ID generator for code paths that do not have a name.
 * Avoids UUID usage while still generating a reasonably unique string.
 */
export function generatePlayerId(): string {
  return `player-${Date.now()}`;
}

/**
 * Treat player name as unique value and preserve the original name.
 * @param baseName The original player name
 * @param existingNames Set of existing player names (case-insensitive)
 * @returns Resolved player name
 */
export function resolvePlayerNameCollision(baseName: string, existingNames: Set<string>): string {
  return baseName.trim();
}

/**
 * Create a new player with deterministic ID derived from the player name.
 * @param name The desired player name
 * @param existingNames Set of existing player names (case-insensitive)
 * @param jerseyNumber Optional jersey number
 * @returns New TeamPlayer object
 */
export function createNewPlayer(name: string, existingNames: Set<string>, jerseyNumber?: number): TeamPlayer {
  const resolvedName = resolvePlayerNameCollision(name, existingNames);

  return {
    id: generatePlayerIdFromName(resolvedName),
    name: resolvedName,
    jerseyNumber,
  };
}

