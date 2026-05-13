'use client';

import { useState } from 'react';
import { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { generatePlayerId, generatePlayerIdFromName } from '@/app/lib/player-utils';
import { CustomSelect } from '@/app/components/CustomSelect';

// Constant opponent player list
const OPPONENT_PLAYERS: TeamPlayer[] = Array.from({ length: 11 }, (_, i) => ({
  id: `opponent-${i + 1}`,
  name: `Opp Player ${i + 1}`,
}));

interface MatchSetupProps {
  onMatchStart: (data: {
    opponent: string;
    venue: 'Home' | 'Away' | 'Neutral';
    tossWonBy: 'Us' | 'Them';
    tossDecision: 'bat' | 'field';
    format: 'T20' | 'ODI' | 'Custom';
    totalOvers: number;
    players: TeamPlayer[];
    striker?: TeamPlayer;
    nonStriker?: TeamPlayer;
    bowler?: TeamPlayer;
  }) => void;
  teamPlayers: TeamPlayer[];
  loading?: boolean;
}

/**
 * Match Setup Form Component
 * Collects match details before starting the scorer
 */
export function MatchSetup({ onMatchStart, teamPlayers, loading }: MatchSetupProps) {
  const [opponent, setOpponent] = useState('');
  const [venue, setVenue] = useState<'Home' | 'Away' | 'Neutral'>('Home');
  const [tossWonBy, setTossWonBy] = useState<'Us' | 'Them'>('Us');
  const [tossDecision, setTossDecision] = useState<'bat' | 'field'>('bat');
  const [format, setFormat] = useState<'T20' | 'ODI' | 'Custom'>('T20');
  const [totalOvers, setTotalOvers] = useState('20');

  // Player selections
  const [striker, setStriker] = useState<TeamPlayer | null>(null);
  const [nonStriker, setNonStriker] = useState<TeamPlayer | null>(null);
  const [bowler, setBowler] = useState<TeamPlayer | null>(null);

  // New player creation
  const [newStrikerName, setNewStrikerName] = useState('');
  const [newNonStrikerName, setNewNonStrikerName] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');

  // Dropdown open state
  const [strikerOpen, setStrikerOpen] = useState(false);
  const [nonStrikerOpen, setNonStrikerOpen] = useState(false);
  const [bowlerOpen, setBowlerOpen] = useState(false);

  const strikerOptions = teamPlayers.filter((player) => player.id !== nonStriker?.id);
  const nonStrikerOptions = teamPlayers.filter((player) => player.id !== striker?.id);

  // Create new player handlers
  const handleCreateNewStriker = () => {
    if (newStrikerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: generatePlayerIdFromName(newStrikerName.trim()),
        name: newStrikerName.trim(),
      };
      setStriker(newPlayer);
      setNewStrikerName('');
      setStrikerOpen(false);
    }
  };

  const handleCreateNewNonStriker = () => {
    if (newNonStrikerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: generatePlayerIdFromName(newNonStrikerName.trim()),
        name: newNonStrikerName.trim(),
      };
      setNonStriker(newPlayer);
      setNewNonStrikerName('');
      setNonStrikerOpen(false);
    }
  };

  const handleCreateNewBowler = () => {
    if (newBowlerName.trim()) {
      const newPlayer: TeamPlayer = {
        id: generatePlayerIdFromName(newBowlerName.trim()),
        name: newBowlerName.trim(),
      };
      setBowler(newPlayer);
      setNewBowlerName('');
      setBowlerOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!opponent.trim()) {
      alert('Please enter opponent team name');
      return;
    }

    if (!striker) {
      alert('Please select striker');
      return;
    }

    if (!nonStriker) {
      alert('Please select non-striker');
      return;
    }

    if (striker.id === nonStriker.id) {
      alert('Striker and non-striker must be different players');
      return;
    }

    if (!bowler) {
      alert('Please select opening bowler');
      return;
    }

    if (teamPlayers.length === 0) {
      alert('No players found in team');
      return;
    }

    onMatchStart({
      opponent: opponent.trim(),
      venue,
      tossWonBy,
      tossDecision,
      format,
      totalOvers: parseInt(totalOvers) || 20,
      players: teamPlayers,
      striker,
      nonStriker,
      bowler,
    });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h2 className="text-2xl font-bold mb-6">Match Setup</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Opponent */}
        <div>
          <label className="block text-sm font-semibold mb-1">Opponent Team Name</label>
          <input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="e.g., City Tigers"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Venue */}
        <div>
          <CustomSelect
            id="venue"
            label="Venue"
            value={venue}
            placeholder="Choose venue"
            options={[
              { value: 'Home', label: 'Home' },
              { value: 'Away', label: 'Away' },
              { value: 'Neutral', label: 'Neutral' },
            ]}
            onChange={(value) => setVenue(value as 'Home' | 'Away' | 'Neutral')}
            className="w-full"
          />
        </div>

        {/* Toss */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <CustomSelect
              id="tossWonBy"
              label="Toss Won By"
              value={tossWonBy}
              placeholder="Select toss winner"
              options={[
                { value: 'Us', label: 'Us' },
                { value: 'Them', label: 'Opponent' },
              ]}
              onChange={(value) => setTossWonBy(value as 'Us' | 'Them')}
              className="w-full"
            />
          </div>

          <div>
            <CustomSelect
              id="tossDecision"
              label="Toss Decision"
              value={tossDecision}
              placeholder="Select toss decision"
              options={[
                { value: 'bat', label: 'Bat' },
                { value: 'field', label: 'Field' },
              ]}
              onChange={(value) => setTossDecision(value as 'bat' | 'field')}
              className="w-full"
            />
          </div>
        </div>

        {/* Format and Overs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <CustomSelect
              id="format"
              label="Format"
              value={format}
              placeholder="Choose format"
              options={[
                { value: 'T20', label: 'T20' },
                { value: 'ODI', label: 'ODI' },
                { value: 'Custom', label: 'Custom' },
              ]}
              onChange={(value) => setFormat(value as 'T20' | 'ODI' | 'Custom')}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Total Overs</label>
            <input
              type="number"
              value={totalOvers}
              onChange={(e) => setTotalOvers(e.target.value)}
              placeholder="20"
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>

        {/* Player Count */}
        <div className="p-3 bg-slate-700 rounded-lg text-sm">
          <span className="text-slate-300">Team players: </span>
          <span className="font-semibold">{teamPlayers.length}</span>
        </div>

        {/* Striker Selection */}
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">Striker</label>
          <button
            type="button"
            onClick={() => setStrikerOpen(!strikerOpen)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left focus:outline-none focus:border-green-500 flex justify-between items-center"
          >
            <span>{striker ? striker.name : 'Select Striker'}</span>
            <span>{strikerOpen ? '▼' : '▶'}</span>
          </button>
          {strikerOpen && (
            <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {/* Existing team players */}
              {strikerOptions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    setStriker(player);
                    setStrikerOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-600 ${
                    striker?.id === player.id ? 'bg-green-600' : ''
                  }`}
                >
                  {player.name}
                </button>
              ))}

              {/* Divider */}
              {strikerOptions.length > 0 && (
                <div className="border-t border-slate-600" />
              )}

              {/* Create new player */}
              <div className="p-2 border-t border-slate-600">
                <input
                  type="text"
                  value={newStrikerName}
                  onChange={(e) => setNewStrikerName(e.target.value)}
                  placeholder="New player name"
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNewStriker()}
                />
                <button
                  type="button"
                  onClick={handleCreateNewStriker}
                  disabled={!newStrikerName.trim()}
                  className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white text-sm"
                >
                  Create Player
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Non-Striker Selection */}
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">Non-Striker</label>
          <button
            type="button"
            onClick={() => setNonStrikerOpen(!nonStrikerOpen)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left focus:outline-none focus:border-green-500 flex justify-between items-center"
          >
            <span>{nonStriker ? nonStriker.name : 'Select Non-Striker'}</span>
            <span>{nonStrikerOpen ? '▼' : '▶'}</span>
          </button>
          {nonStrikerOpen && (
            <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {/* Existing team players (excluding striker) */}
              {nonStrikerOptions.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    setNonStriker(player);
                    setNonStrikerOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-600 ${
                    nonStriker?.id === player.id ? 'bg-green-600' : ''
                  }`}
                >
                  {player.name}
                </button>
              ))}

              {/* Divider */}
              {nonStrikerOptions.length > 0 && (
                <div className="border-t border-slate-600" />
              )}

              {/* Create new player */}
              <div className="p-2 border-t border-slate-600">
                <input
                  type="text"
                  value={newNonStrikerName}
                  onChange={(e) => setNewNonStrikerName(e.target.value)}
                  placeholder="New player name"
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNewNonStriker()}
                />
                <button
                  type="button"
                  onClick={handleCreateNewNonStriker}
                  disabled={!newNonStrikerName.trim()}
                  className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white text-sm"
                >
                  Create Player
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Opening Bowler Selection (Opponent Team) */}
        <div className="relative">
          <label className="block text-sm font-semibold mb-1">Opening Bowler</label>
          <button
            type="button"
            onClick={() => setBowlerOpen(!bowlerOpen)}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left focus:outline-none focus:border-green-500 flex justify-between items-center"
          >
            <span>{bowler ? bowler.name : 'Select Bowler'}</span>
            <span>{bowlerOpen ? '▼' : '▶'}</span>
          </button>
          {bowlerOpen && (
            <div className="mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {/* Opponent players */}
              {OPPONENT_PLAYERS.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    setBowler(player);
                    setBowlerOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-600 ${
                    bowler?.id === player.id ? 'bg-green-600' : ''
                  }`}
                >
                  {player.name}
                </button>
              ))}

              {/* Divider */}
              <div className="border-t border-slate-600" />

              {/* Create new player */}
              <div className="p-2 border-t border-slate-600">
                <input
                  type="text"
                  value={newBowlerName}
                  onChange={(e) => setNewBowlerName(e.target.value)}
                  placeholder="New bowler name"
                  className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm mb-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNewBowler()}
                />
                <button
                  type="button"
                  onClick={handleCreateNewBowler}
                  disabled={!newBowlerName.trim()}
                  className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white text-sm"
                >
                  Create Bowler
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          type="submit"
          disabled={loading || !opponent.trim() || !striker || !nonStriker || !bowler}
          className="w-full p-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Loading...' : 'Start Scoring'}
        </button>
      </form>
    </div>
  );
}
