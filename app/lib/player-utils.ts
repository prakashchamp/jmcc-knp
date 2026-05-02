import { v4 as uuidv4 } from 'uuid';
import { TeamPlayer } from './cricket-schema';

/**
 * Generate a unique UUID for new players
 */
export function generatePlayerId(): string {
  return uuidv4();
}

/**
 * Handle player name collisions by appending a random 3-digit number
 * @param baseName The original player name
 * @param existingNames Set of existing player names (case-insensitive)
 * @returns Unique player name
 */
export function resolvePlayerNameCollision(baseName: string, existingNames: Set<string>): string {
  const trimmedBase = baseName.trim();
  const lowerBase = trimmedBase.toLowerCase();

  if (!existingNames.has(lowerBase)) {
    return trimmedBase;
  }

  // Generate random 3-digit number and append
  let attempts = 0;
  while (attempts < 100) { // Prevent infinite loop
    const randomNum = Math.floor(100 + Math.random() * 900); // 100-999
    const candidate = `${trimmedBase}${randomNum}`;
    const candidateLower = candidate.toLowerCase();

    if (!existingNames.has(candidateLower)) {
      return candidate;
    }
    attempts++;
  }

  // Fallback if we can't find a unique name
  return `${trimmedBase}_${Date.now()}`;
}

/**
 * Create a new player with unique ID and handle name collisions
 * @param name The desired player name
 * @param existingNames Set of existing player names (case-insensitive)
 * @param jerseyNumber Optional jersey number
 * @returns New TeamPlayer object
 */
export function createNewPlayer(name: string, existingNames: Set<string>, jerseyNumber?: number): TeamPlayer {
  const resolvedName = resolvePlayerNameCollision(name, existingNames);

  return {
    id: generatePlayerId(),
    name: resolvedName,
    jerseyNumber,
  };
}