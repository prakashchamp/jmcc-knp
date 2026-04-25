'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAllTeams } from '@/app/lib/hooks/useTeam';
import { TeamPlayer } from '@/app/lib/cricket-schema';
import Link from 'next/link';
import { setTeam, saveToRedux, setPendingCloudPush, syncTeam, SINGLETON_TEAM_ID } from '@/app/lib/redux/slices/teamSlice';
import { AppDispatch, RootState } from '@/app/lib/redux/store';

/**
 * Team Setup Page
 * Create and manage cricket team rosters
 * - Create new team or select existing
 * - Add/remove/edit players
 * - Save to Redux
 * - Push to Firestore
 */
export default function TeamSetupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { teams: existingTeams, loading: teamsLoading } = useAllTeams();
  const reduxTeam = useSelector((state: RootState) => state.team.team);
  const savedToRedux = useSelector((state: RootState) => state.team.savedToRedux);
  const pendingCloudPush = useSelector((state: RootState) => state.team.pendingCloudPush);

  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJerseyNumber, setNewPlayerJerseyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Populate form when team is selected from Redux
  useEffect(() => {
    if (reduxTeam) {
      setTeamName(reduxTeam.name);
      setPlayers(reduxTeam.players || []);
    }
  }, [reduxTeam]);

  // Auto-select team if one exists (single team only policy)
  useEffect(() => {
    if (existingTeams.length > 0 && !selectedTeamId) {
      // Auto-select the first (and only) team
      handleSelectTeam(existingTeams[0].id);
    }
  }, [existingTeams, selectedTeamId]);

  // Handle team selection from existing teams
  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    // Load team from existing teams
    const selectedTeamData = existingTeams.find((t) => t.id === teamId);
    if (selectedTeamData) {
      dispatch(setTeam(selectedTeamData));
    }
    setMessage(null);
  };

  // Handle create new team
  const handleCreateNewTeam = () => {
    setSelectedTeamId(undefined);
    setTeamName('');
    setPlayers([]);
    setMessage(null);
  };

  // Add player to list
  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      setMessage({ type: 'error', text: 'Player name is required' });
      return;
    }

    const playerId = `player_${Date.now()}`;
    const newPlayer: TeamPlayer = {
      id: playerId,
      name: newPlayerName.trim(),
      jerseyNumber: newPlayerJerseyNumber ? parseInt(newPlayerJerseyNumber) : undefined,
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerJerseyNumber('');
    setMessage(null);
  };

  // Remove player from list
  const handleRemovePlayer = (playerId: string) => {
    setPlayers(players.filter((p) => p.id !== playerId));
  };

  // Save team to Redux
  const handleSaveTeamToRedux = () => {
    if (!teamName.trim()) {
      setMessage({ type: 'error', text: 'Team name is required' });
      return;
    }

    if (players.length === 0) {
      setMessage({ type: 'error', text: 'Add at least one player' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const now = new Date().toISOString();
      dispatch(
        saveToRedux({
          id: SINGLETON_TEAM_ID,
          name: teamName.trim(),
          players,
          createdAt: reduxTeam?.createdAt || now,
          updatedAt: now,
        })
      );
      setMessage({ type: 'success', text: 'Team saved to Redux!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save team to Redux' });
    } finally {
      setSaving(false);
    }
  };

  // Push team to Firestore
  const handlePushToCloud = async () => {
    if (!reduxTeam) {
      setMessage({ type: 'error', text: 'No team to push' });
      return;
    }

    setPushing(true);
    setMessage(null);

    try {
      await dispatch(syncTeam(reduxTeam)).unwrap();
      setMessage({ type: 'success', text: 'Team successfully pushed to cloud!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to push to Firestore' });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2">Team Setup</h1>
            <p className="text-slate-300 text-sm sm:text-base">Create and manage your cricket team roster</p>
          </div>
          <Link href="/" className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Back to home">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>

        {/* Info: Only one team allowed */}
        {existingTeams.length > 0 && (
          <div className="mb-6 p-4 bg-blue-900 border border-blue-700 text-blue-100 rounded-lg">
            <p className="font-semibold">ℹ️ Only one team is allowed</p>
            <p className="text-sm mt-1">You cannot create multiple teams. Edit your existing team below.</p>
          </div>
        )}

        {/* Redux Status Indicators */}
        <div className="flex gap-4 mb-6">
          {savedToRedux && (
            <div className="px-4 py-2 bg-green-900 text-green-100 rounded-lg font-semibold flex items-center gap-2">
              ✓ Saved to Redux
            </div>
          )}
          {pendingCloudPush && (
            <div className="px-4 py-2 bg-amber-900 text-amber-100 rounded-lg font-semibold flex items-center gap-2">
              ⚠ Pending Cloud Push
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${message.type === 'success'
                ? 'bg-green-900 text-green-100'
                : 'bg-red-900 text-red-100'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Team Selection - Auto-select if exists, otherwise show create */}
        {existingTeams.length > 0 && !selectedTeamId && (
          <div className="bg-slate-800 rounded-lg p-6 mb-6 border border-slate-700">
            <h2 className="text-xl font-semibold mb-4">Your Team</h2>

            <div className="space-y-3">
              {existingTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className="w-full p-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-left transition-colors"
                >
                  <div className="font-semibold">{team.name}</div>
                  <div className="text-sm text-slate-400">{team.players?.length || 0} players</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Team Form */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          {/* Team Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-2">Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., Sparta Tigers"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Player Input Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Add Players</h3>

            <div className="space-y-4 bg-slate-700 p-4 rounded-lg mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Player Name</label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter player name"
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">

                <div>
                  <label className="block text-sm font-semibold mb-2 text-slate-300">Jersey Number (optional)</label>
                  <input
                    type="number"
                    value={newPlayerJerseyNumber}
                    onChange={(e) => setNewPlayerJerseyNumber(e.target.value)}
                    placeholder="e.g., 7"
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleAddPlayer}
                className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Add Player
              </button>
            </div>
          </div>

          {/* Players List */}
          {players.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Team Roster ({players.length})</h3>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center bg-slate-700 p-3 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">
                        {player.jerseyNumber && `#${player.jerseyNumber} `}
                        {player.name}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="flex gap-4">
              <button
                onClick={handleSaveTeamToRedux}
                disabled={saving || !teamName.trim() || players.length === 0}
                className="flex-1 p-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {saving ? 'Saving to Redux...' : 'Save to Redux'}
              </button>

              <button
                onClick={handlePushToCloud}
                disabled={pushing || !savedToRedux}
                className="flex-1 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
              >
                {pushing ? 'Pushing to Cloud...' : 'Push to Cloud'}
              </button>
            </div>

            {selectedTeamId && (
              <Link href="/scorer" className="block p-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-center">
                Start Scoring
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
