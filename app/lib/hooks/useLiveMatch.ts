'use client';

import { useState, useEffect, useCallback } from 'react';
import { LiveMatch, Ball, TeamPlayer } from '../cricket-scorer-types';

const STORAGE_KEY = 'jmcc_live_match_draft';

/**
 * Hook to manage live match state with session storage persistence
 * Allows creating and resuming draft matches
 */
export function useLiveMatch(teamId?: string) {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(!!teamId);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load draft match from session storage on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const draftJson = sessionStorage.getItem(STORAGE_KEY);
      if (draftJson) {
        const draft = JSON.parse(draftJson) as LiveMatch;
        setLiveMatch(draft);
      }
    } catch (err) {
      console.error('Failed to load draft match:', err);
      // Continue with empty state
    }

    setLoading(false);
  }, []);

  /**
   * Create a new match
   */
  const createMatch = useCallback(
    (
      opponent: string,
      venue: 'Home' | 'Away' | 'Neutral',
      tossWonBy: 'Us' | 'Them',
      tossDecision: 'bat' | 'field',
      format: 'T20' | 'ODI' | 'Custom',
      totalOvers: number,
      players: TeamPlayer[]
    ) => {
      try {
        setError(null);

        const now = new Date();
        const match: LiveMatch = {
          id: `session_${Date.now()}`,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          opponent,
          venue,
          tossWonBy,
          tossDecision,
          format,
          totalOvers,
          currentInnings: tossDecision === 'bat' ? 1 : 2,
          status: 'in-progress',
          teamPlayers: players,
          innings: [],
        };

        setLiveMatch(match);
        setTeamPlayers(players);
        saveToSessionStorage(match);

        return match;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create match');
        setError(error);
        return null;
      }
    },
    []
  );

  /**
   * Add a ball to the match
   */
  const addBall = useCallback(
    (ball: Ball) => {
      if (!liveMatch) {
        setError(new Error('No match in progress'));
        return false;
      }

      try {
        setError(null);

        const updatedMatch = {
          ...liveMatch,
          // Just a mock update since hook is unused
          updatedAt: new Date().toISOString(),
        };

        setLiveMatch(updatedMatch);
        saveToSessionStorage(updatedMatch);

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to add ball');
        setError(error);
        return false;
      }
    },
    [liveMatch]
  );

  /**
   * Undo the last ball
   */
  const undoLastBall = useCallback(() => {
    if (!liveMatch) {
      setError(new Error('No balls to undo'));
      return false;
    }

    try {
      setError(null);

      const updatedMatch = {
        ...liveMatch,
        updatedAt: new Date().toISOString(),
      };

      setLiveMatch(updatedMatch);
      saveToSessionStorage(updatedMatch);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to undo ball');
      setError(error);
      return false;
    }
  }, [liveMatch]);

  /**
   * Switch innings
   */
  const switchInnings = useCallback(() => {
    if (!liveMatch) {
      setError(new Error('No match in progress'));
      return false;
    }

    try {
      setError(null);

      const updatedMatch = {
        ...liveMatch,
        currentInnings: liveMatch.currentInnings === 1 ? (2 as const) : (1 as const),
      };

      setLiveMatch(updatedMatch);
      saveToSessionStorage(updatedMatch);

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch innings');
      setError(error);
      return false;
    }
  }, [liveMatch]);

  /**
   * Complete the match
   */
  const completeMatch = useCallback(
    (result: 'won' | 'lost' | 'tie' | 'no_result', winMargin?: string) => {
      if (!liveMatch) {
        setError(new Error('No match in progress'));
        return null;
      }

      try {
        setError(null);

        const completedMatch: LiveMatch = {
          ...liveMatch,
          status: 'complete',
          result,
          winMargin,
          matchId: `match_${Date.now()}`,
        };

        setLiveMatch(completedMatch);
        saveToSessionStorage(completedMatch);

        return completedMatch;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to complete match');
        setError(error);
        return null;
      }
    },
    [liveMatch]
  );

  /**
   * Clear draft (delete session storage)
   */
  const clearDraft = useCallback(() => {
    try {
      setError(null);
      setLiveMatch(null);
      setTeamPlayers([]);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(STORAGE_KEY);
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear draft');
      setError(error);
      return false;
    }
  }, []);

  return {
    liveMatch,
    teamPlayers,
    loading,
    error,
    createMatch,
    addBall,
    undoLastBall,
    switchInnings,
    completeMatch,
    clearDraft,
    setTeamPlayers, // Allow manual team loading
  };
}

/**
 * Save match to session storage
 */
function saveToSessionStorage(match: LiveMatch) {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(match));
  } catch (err) {
    console.error('Failed to save draft to session storage:', err);
  }
}
