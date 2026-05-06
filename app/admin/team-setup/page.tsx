'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { useTeam, useAllTeams } from '@/app/lib/hooks/useTeam';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';
import { TeamPlayer } from '@/app/lib/cricket-schema';
import { createNewPlayer } from '@/app/lib/player-utils';
import Link from 'next/link';
import { setTeam, saveToRedux, setPendingCloudPush, syncTeam, SINGLETON_TEAM_ID } from '@/app/lib/redux/slices/teamSlice';
import { AppDispatch, RootState, store } from '@/app/lib/redux/store';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
  dangerButtonClass
} from '@/app/components/scorer/dialogs/dialogTheme';
import { Header } from '@/app/components/Header';

/**
 * Team Setup Page
 * Create and manage cricket team rosters
 * - Create new team or select existing
 * - Add/remove/edit players
 * - Save to Redux
 * - Push to Firestore
 */
export default function TeamSetupPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { teams: existingTeams, loading: teamsLoading } = useAllTeams();
  const reduxTeam = useSelector((state: RootState) => state.team.team);
  const savedToRedux = useSelector((state: RootState) => state.team.savedToRedux);
  const pendingCloudPush = useSelector((state: RootState) => state.team.pendingCloudPush);
  const { players: statsPlayers, loading: statsLoading } = useAllPlayers();

  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();
  const [teamName, setTeamName] = useState('');
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJerseyNumber, setNewPlayerJerseyNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editing states
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState<TeamPlayer | null>(null);

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
      const singleton = existingTeams.find(t => t.id === SINGLETON_TEAM_ID);
      if (singleton) {
        handleSelectTeam(singleton.id);
      } else {
        handleSelectTeam(existingTeams[0].id);
      }
    }
  }, [existingTeams, selectedTeamId]);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    const selectedTeamData = existingTeams.find((t) => t.id === teamId);
    if (selectedTeamData) {
      store.dispatch(setTeam({ team: selectedTeamData, skipSync: false }));
    }
    setMessage(null);
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      setMessage({ type: 'error', text: 'Player name is required' });
      return;
    }

    const normalizedNewName = newPlayerName.trim().toLowerCase().replace(/\s+/g, ' ');
    const existingNames = new Set(players.map(p => p.name.toLowerCase().trim().replace(/\s+/g, ' ')));
    if (existingNames.has(normalizedNewName)) {
      setMessage({ type: 'error', text: 'Player name already exists' });
      return;
    }

    const newPlayer = createNewPlayer(newPlayerName.trim(), existingNames, newPlayerJerseyNumber ? parseInt(newPlayerJerseyNumber) : undefined);

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerJerseyNumber('');
    setIsAddModalOpen(false);
    setMessage(null);
  };

  const handleUpdatePlayer = (id: string, name: string, jersey?: number) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name, jerseyNumber: jersey } : p));
  };

  const handleRemovePlayer = (player: TeamPlayer) => {
    setPlayerToDelete(player);
  };

  const confirmDeletePlayer = () => {
    if (playerToDelete) {
      setPlayers(players.filter((p) => p.id !== playerToDelete.id));
      setPlayerToDelete(null);
      setHasPendingChanges(true);
    }
  };

  const handleReconstructRoster = () => {
    if (statsPlayers.length === 0) return;
    
    const newPlayers: TeamPlayer[] = statsPlayers.map(p => ({
      id: p.playerId,
      name: p.playerName,
    }));
    
    // Merge with existing
    const existingIds = new Set(players.map(p => p.id));
    const mergedPlayers = [...players];
    
    newPlayers.forEach(p => {
      if (!existingIds.has(p.id)) {
        mergedPlayers.push(p);
      }
    });
    
    setPlayers(mergedPlayers);
    if (!teamName) setTeamName('JMCC Spartans');
    setHasPendingChanges(true);
    setMessage({ type: 'success', text: `Reconstructed roster with ${newPlayers.length} players from existing stats.` });
  };

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
          id: reduxTeam?.id || SINGLETON_TEAM_ID,
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

  const handlePushToCloud = async () => {
    if (!reduxTeam) {
      setMessage({ type: 'error', text: 'No team to push' });
      return;
    }

    setPushing(true);
    setMessage(null);

    try {
      await dispatch(syncTeam(reduxTeam)).unwrap();
      console.log('Cloud Sync Success:', reduxTeam.name, 'with', reduxTeam.players.length, 'players');
      setMessage({ type: 'success', text: 'Team successfully pushed to cloud!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to push to Firestore' });
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <Header />
      <div className="p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold mb-1">Team Setup</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Manage your team and players</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Back to Admin
            </button>
            {/* <Link href="/" className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Back to home">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link> */}
          </div>
        </div>

        {/* Status & Messages */}
        <div className="flex flex-wrap gap-2 mb-4">
          {savedToRedux && <span className="px-2 py-0.5 bg-green-900/50 text-green-300 border border-green-700 rounded-full text-[10px] font-semibold">✓ Redux Saved</span>}
          {pendingCloudPush && <span className="px-2 py-0.5 bg-amber-900/50 text-amber-300 border border-amber-700 rounded-full text-[10px] font-semibold">⚠ Cloud Pending</span>}
        </div>
        {message && <div className={`mb-4 p-3 text-xs rounded-lg ${message.type === 'success' ? 'bg-green-900 text-green-100' : 'bg-red-900 text-red-100'}`}>{message.text}</div>}

        {/* Team Details Container */}
        <div className="bg-slate-800/50 rounded-2xl p-4 sm:p-6 border border-slate-700 shadow-xl space-y-6">

          {/* Team Name Section - Centered */}
          <div className="flex flex-col items-center space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Team Name</label>
            <div className="flex gap-2 w-full max-w-xs">
              <input
                type="text"
                disabled={!isEditingTeamName}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className={`flex-1 px-4 py-1.5 rounded-lg bg-slate-900/50 border text-center transition-all ${isEditingTeamName ? 'border-blue-500 ring-1 ring-blue-500 text-white' : 'border-slate-700 text-slate-300'}`}
              />
              <button
                onClick={() => setIsEditingTeamName(!isEditingTeamName)}
                className={`p-1.5 rounded-lg border transition-colors ${isEditingTeamName ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:text-white'}`}
              >
                {isEditingTeamName ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Roster Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Players ({players.length})</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Player
                </button>
                
                {players.length === 0 && statsPlayers.length > 0 && (
                  <button
                    onClick={handleReconstructRoster}
                    disabled={statsLoading}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
                    title="Reconstruct roster from existing match statistics"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reconstruct
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {players.map((player) => (
                <div key={player.id} className="group flex gap-2 items-center bg-slate-900/40 p-2 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all">
                  <div className="w-8 text-center text-[10px] font-bold text-slate-500">
                    {editingPlayerId === player.id ? (
                      <input
                        type="number"
                        value={player.jerseyNumber || ''}
                        onChange={(e) => handleUpdatePlayer(player.id, player.name, e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full bg-slate-800 border border-blue-500 rounded text-center text-white p-0.5"
                        placeholder="#"
                      />
                    ) : (
                      <span>#{player.jerseyNumber || '??'}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    disabled={editingPlayerId !== player.id}
                    value={player.name}
                    onChange={(e) => handleUpdatePlayer(player.id, e.target.value, player.jerseyNumber)}
                    className={`flex-1 px-2 py-1 rounded text-xs transition-all bg-transparent ${editingPlayerId === player.id ? 'bg-slate-800 border-b border-blue-500 text-white' : 'border-transparent text-slate-300'}`}
                  />
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => setEditingPlayerId(editingPlayerId === player.id ? null : player.id)}
                      className={`p-1 rounded-md transition-colors ${editingPlayerId === player.id ? 'text-green-400 hover:bg-green-900/30' : 'text-slate-500 hover:text-white'}`}
                    >
                      {editingPlayerId === player.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemovePlayer(player)}
                      className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSaveTeamToRedux}
              disabled={saving || !teamName.trim() || players.length === 0}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-xs font-semibold transition-all active:scale-95"
            >
              {saving ? 'Saving...' : 'Save Locally'}
            </button>
            <button
              onClick={handlePushToCloud}
              disabled={pushing || !savedToRedux}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-xs font-semibold transition-all active:scale-95"
            >
              {pushing ? 'Syncing...' : 'Sync to Cloud'}
            </button>
          </div>

          {selectedTeamId && (
            <Link href="/scorer" className="block w-full py-2.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-semibold text-center transition-all active:scale-95">
              🚀 Start Scoring
            </Link>
          )}
        </div>
      </div>

      {/* Add Player Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 w-full max-w-xs rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">New Player</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Player name"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jersey #</label>
                <input
                  type="number"
                  value={newPlayerJerseyNumber}
                  onChange={(e) => setNewPlayerJerseyNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handleAddPlayer}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition-all mt-1"
              >
                Add Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div className={modalOverlayClass}>
          <div className={`${modalPanelClass} w-full max-w-xs p-5 sm:p-6`}>
            <div className={modalHeaderClass}>
              <p className={modalEyebrowClass}>Confirm Action</p>
              <h2 className={modalTitleClass}>Remove Player?</h2>
            </div>

            <div className="mb-6">
              <p className="text-sm text-slate-400">
                Are you sure you want to remove <span className="text-white font-semibold">{playerToDelete.name}</span> from the roster?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPlayerToDelete(null)}
                className={`flex-1 px-4 py-2 text-xs ${secondaryButtonClass}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePlayer}
                className={`flex-1 px-4 py-2 text-xs ${dangerButtonClass}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
