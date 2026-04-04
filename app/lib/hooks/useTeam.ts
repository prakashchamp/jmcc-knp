'use client';

import { useState, useEffect } from 'react';
import { Team, TeamPlayer } from '../cricket-schema';
import { getDocument, setDocument, updateDocument, deleteDocument } from '@/services/firebase/operations';

/**
 * Hook to manage team data with Firestore
 * Provides CRUD operations and state management
 */
export function useTeam(teamId?: string) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(!!teamId);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch team by ID
   */
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    const fetchTeam = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getDocument<Team>('teams', teamId);
        if (result) {
          setTeam({
            ...result.data,
            id: result.id,
          });
        } else {
          setError(new Error('Team not found'));
          setTeam(null);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch team');
        setError(error);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  /**
   * Create a new team
   */
  const saveTeam = async (teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    try {
      setError(null);
      const teamId = `team_${Date.now()}`;
      const now = new Date().toISOString();

      const newTeam: Team = {
        id: teamId,
        ...teamData,
        createdAt: now,
        updatedAt: now,
      };

      const result = await setDocument<Team>('teams', teamId, newTeam);

      if (result.success) {
        setTeam(newTeam);
        return teamId;
      } else {
        const errorMsg = result.error instanceof Error ? result.error.message : 'Failed to save team';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save team');
      setError(error);
      return null;
    }
  };

  /**
   * Update team name
   */
  const updateTeamName = async (newName: string): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      setError(null);
      const result = await updateDocument<Team>('teams', team.id, {
        name: newName,
      });

      if (result.success) {
        setTeam({ ...team, name: newName });
        return true;
      } else {
        const errorMsg = result.error instanceof Error ? result.error.message : 'Failed to update team name';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update team name');
      setError(error);
      return false;
    }
  };

  /**
   * Update team players list
   */
  const updateTeamPlayers = async (players: TeamPlayer[]): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      setError(null);
      const result = await updateDocument<Team>('teams', team.id, {
        players,
      });

      if (result.success) {
        setTeam({ ...team, players });
        return true;
      } else {
        const errorMsg = result.error instanceof Error ? result.error.message : 'Failed to update players';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update players');
      setError(error);
      return false;
    }
  };

  /**
   * Add a player to the team
   */
  const addPlayer = async (player: TeamPlayer): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      const updatedPlayers = [...team.players, player];
      return await updateTeamPlayers(updatedPlayers);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to add player');
      setError(error);
      return false;
    }
  };

  /**
   * Remove a player from the team
   */
  const removePlayer = async (playerId: string): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      const updatedPlayers = team.players.filter((p) => p.id !== playerId);
      return await updateTeamPlayers(updatedPlayers);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to remove player');
      setError(error);
      return false;
    }
  };

  /**
   * Delete team
   */
  const deleteTeam = async (): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      setError(null);
      const result = await deleteDocument('teams', team.id);

      if (result.success) {
        setTeam(null);
        return true;
      } else {
        const errorMsg = result.error instanceof Error ? result.error.message : 'Failed to delete team';
        throw new Error(errorMsg);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete team');
      setError(error);
      return false;
    }
  };

  return {
    team,
    loading,
    error,
    saveTeam,
    updateTeamName,
    updateTeamPlayers,
    addPlayer,
    removePlayer,
    deleteTeam,
  };
}

/**
 * Hook to fetch all teams
 */
export function useAllTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const results = await (
          await import('@/services/firebase/operations')
        ).getCollection<Team>('teams');

        setTeams(
          results.map((result) => ({
            ...result.data,
            id: result.id,
          }))
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch teams');
        setError(error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  return {
    teams,
    loading,
    error,
  };
}
