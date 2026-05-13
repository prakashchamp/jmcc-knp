'use client';

import { useState, useEffect, useCallback } from 'react';
import { Team, TeamPlayer } from '../cricket-schema';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { 
  getServerDocument, 
  getServerCollection, 
  setServerDocument, 
  updateServerDocument 
} from '@/app/lib/actions/firebase-actions';

/**
 * Hook to manage team data with Firestore using Server Actions
 * Provides CRUD operations and state management
 */
export function useTeam(teamId?: string) {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(!!teamId);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch team by ID using Server Action
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

        const result = await getServerDocument<Team>('teams', teamId);
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
   * Create a new team using Server Action
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

      const result = await setServerDocument<Team>('teams', teamId, newTeam);

      if (result.success) {
        setTeam(newTeam);
        return teamId;
      } else {
        throw new Error(result.error || 'Failed to save team');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save team');
      setError(error);
      return null;
    }
  };

  /**
   * Update team name using Server Action
   */
  const updateTeamName = async (newName: string): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      setError(null);
      const result = await updateServerDocument<Team>('teams', team.id, {
        name: newName,
      });

      if (result.success) {
        setTeam({ ...team, name: newName });
        return true;
      } else {
        throw new Error(result.error || 'Failed to update team name');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update team name');
      setError(error);
      return false;
    }
  };

  /**
   * Update team players list using Server Action
   */
  const updateTeamPlayers = async (players: TeamPlayer[]): Promise<boolean> => {
    if (!team?.id) {
      setError(new Error('No team loaded'));
      return false;
    }

    try {
      setError(null);
      const result = await updateServerDocument<Team>('teams', team.id, {
        players,
      });

      if (result.success) {
        setTeam({ ...team, players });
        return true;
      } else {
        throw new Error(result.error || 'Failed to update players');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update players');
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
  };
}

/**
 * Hook to fetch all teams using Server Action
 */
export function useAllTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const results = await getServerCollection<Team>('teams');

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
  }, []);

  useEffect(() => {
    if (teams.length === 0) {
      fetchTeams();
    } else {
      setLoading(false);
    }
  }, [fetchTeams, teams.length]);

  return {
    teams,
    loading,
    error,
    fetchTeams,
  };
}

/**
 * Hook to get all players from the JMCC team
 */
export function useTeamPlayers() {
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getServerDocument<Team>('teams', 'jmcc_knp_singleton');
        if (result) {
          setPlayers(result.data.players || []);
        } else {
          setPlayers([]);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch team players');
        setError(error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  return {
    players,
    loading,
    error,
  };
}
