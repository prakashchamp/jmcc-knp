'use client';

import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface PlayersListProps {
  players: PlayerStats[];
  selectedPlayerId: string | null;
  onSelectPlayer: (playerId: string) => void;
  loading: boolean;
}

export function PlayersList({
  players,
  selectedPlayerId,
  onSelectPlayer,
  loading,
}: PlayersListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-16 bg-slate-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {players.map((player) => (
        <button
          key={player.playerId}
          onClick={() => onSelectPlayer(player.playerId)}
          className={`w-full p-4 rounded-lg transition-all text-left ${
            selectedPlayerId === player.playerId
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-700 text-gray-100 hover:bg-blue-600 border border-blue-500'
          }`}
        >
          <div className="font-semibold">{player.playerName}</div>
          <div className={`text-sm ${selectedPlayerId === player.playerId ? 'text-blue-100' : 'text-gray-500'}`}>
            {player.playerRole} • {player.totalMatches} matches
          </div>
        </button>
      ))}
    </div>
  );
}
