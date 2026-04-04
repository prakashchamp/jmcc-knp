'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, setInitialBattersAndBowler } from '@/app/lib/redux/slices/scorerSlice';
import { useState } from 'react';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';

export function InitialBattersDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch } = useSelector((state: RootState) => state.scorer);
  
  const [batter1, setBatter1] = useState<TeamPlayer | null>(null);
  const [batter2, setBatter2] = useState<TeamPlayer | null>(null);
  const [bowlerName, setBowlerName] = useState('Bowler 1');

  if (!liveMatch) return null;

  // Determine if JMCC is batting or fielding based on toss
  const isJmccBatting = 
    (liveMatch.tossWonBy === 'Us' && liveMatch.tossDecision === 'bat') ||
    (liveMatch.tossWonBy === 'Them' && liveMatch.tossDecision === 'field');

  const isValid = batter1 && batter2 && bowlerName.trim() && batter1.id !== batter2.id;

  const handleStart = () => {
    if (!isValid) return;
    
    // Create a temporary bowler object for opponent
    const bowlerObject: TeamPlayer = {
      id: `opponent-bowler-${Date.now()}`,
      name: bowlerName.trim(),
      role: 'bowler',
    };
    
    // Dispatch action to set initial batters and bowler
    dispatch(setInitialBattersAndBowler({ 
      striker: batter1, 
      nonStriker: batter2,
      bowler: bowlerObject
    }));
    dispatch(closeDialog());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-96 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Match Setup</h2>

        {/* Batter 1 Selection */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-300 mb-2">Striker (Batter 1)</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {liveMatch.teamPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setBatter1(player)}
                className={`w-full px-3 py-2 rounded text-sm font-semibold text-left transition-colors ${
                  batter1?.id === player.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                }`}
              >
                <span>{player.name}</span>
                <span className="text-xs text-gray-400 float-right">#{player.jerseyNumber}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Batter 2 Selection */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-300 mb-2">Non-Striker (Batter 2)</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {liveMatch.teamPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => setBatter2(player)}
                disabled={player.id === batter1?.id}
                className={`w-full px-3 py-2 rounded text-sm font-semibold text-left transition-colors ${
                  batter2?.id === player.id
                    ? 'bg-teal-700 text-white'
                    : player.id === batter1?.id
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                }`}
              >
                <span>{player.name}</span>
                <span className="text-xs text-gray-400 float-right">#{player.jerseyNumber}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bowler Name (Opponent) */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-300 mb-2">Opening Bowler ({liveMatch.opponent})</p>
          <input
            type="text"
            value={bowlerName}
            onChange={(e) => setBowlerName(e.target.value)}
            placeholder="Enter bowler name"
            className="w-full px-3 py-2 rounded bg-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:bg-gray-600"
          />
        </div>

        {/* Display selected batters and bowler */}
        {batter1 && batter2 && bowlerName.trim() && (
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <p className="text-xs font-semibold text-gray-300 mb-2">Selected:</p>
            <p className="text-sm text-white">🏏 Striker: <span className="font-bold">{batter1.name}</span></p>
            <p className="text-sm text-white">🏏 Non-Striker: <span className="font-bold">{batter2.name}</span></p>
            <p className="text-sm text-white">🎯 Bowler: <span className="font-bold">{bowlerName}</span></p>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStart}
          disabled={!isValid}
          className={`w-full px-4 py-2 rounded font-semibold transition-colors ${
            isValid
              ? 'bg-teal-700 hover:bg-teal-600 text-white cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          Start Match
        </button>
      </div>
    </div>
  );
}
