import { PWAMatch } from './pwa-cricket-types';

const OFFLINE_MATCH_IDS_KEY = 'jmcc_pwa_pending_match_ids';
const OFFLINE_MATCH_KEY_PREFIX = 'jmcc_pwa_offline_match_';

export function getPendingOfflineMatchIds(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const serialized = localStorage.getItem(OFFLINE_MATCH_IDS_KEY);
    return serialized ? (JSON.parse(serialized) as string[]) : [];
  } catch (error) {
    console.warn('Failed to read pending offline matches:', error);
    return [];
  }
}

export function queueOfflineMatch(match: PWAMatch): void {
  if (typeof window === 'undefined') return;

  try {
    const ids = getPendingOfflineMatchIds();
    if (!ids.includes(match.id)) {
      ids.push(match.id);
      localStorage.setItem(OFFLINE_MATCH_IDS_KEY, JSON.stringify(ids));
    }
    localStorage.setItem(`${OFFLINE_MATCH_KEY_PREFIX}${match.id}`, JSON.stringify(match));
  } catch (error) {
    console.warn('Failed to queue offline match:', error);
  }
}

export function getOfflineMatch(matchId: string): PWAMatch | null {
  if (typeof window === 'undefined') return null;

  try {
    const serialized = localStorage.getItem(`${OFFLINE_MATCH_KEY_PREFIX}${matchId}`);
    return serialized ? (JSON.parse(serialized) as PWAMatch) : null;
  } catch (error) {
    console.warn('Failed to read offline match from storage:', error);
    return null;
  }
}

export function clearOfflineMatch(matchId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const ids = getPendingOfflineMatchIds().filter((id) => id !== matchId);
    localStorage.setItem(OFFLINE_MATCH_IDS_KEY, JSON.stringify(ids));
    localStorage.removeItem(`${OFFLINE_MATCH_KEY_PREFIX}${matchId}`);
  } catch (error) {
    console.warn('Failed to clear offline match:', error);
  }
}

export function clearAllOfflineMatches(): void {
  if (typeof window === 'undefined') return;

  try {
    const ids = getPendingOfflineMatchIds();
    ids.forEach((matchId) => localStorage.removeItem(`${OFFLINE_MATCH_KEY_PREFIX}${matchId}`));
    localStorage.removeItem(OFFLINE_MATCH_IDS_KEY);
  } catch (error) {
    console.warn('Failed to clear offline matches:', error);
  }
}
