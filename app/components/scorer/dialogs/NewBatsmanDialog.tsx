'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, replaceBatsman, addNewTeamPlayer } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { useState } from 'react';
import { BatterDropdownSelect } from './BatterDropdownSelect';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function NewBatsmanDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [dismissedBatsmanRole, setDismissedBatsmanRole] = useState<'striker' | 'non-striker'>('striker');
  const [selectedBatter, setSelectedBatter] = useState<TeamPlayer | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!liveMatch || !currentInnings) return null;

  // Build excludeIds: current batsmen + dismissed batsmen (can't be selected until end of innings)
  const excludeIds: string[] = [];
  if (currentInnings.striker) excludeIds.push(currentInnings.striker.id);
  if (currentInnings.nonStriker) excludeIds.push(currentInnings.nonStriker.id);
  currentInnings.dismissedBatsmen.forEach((d) => excludeIds.push(d.id));

  // Get available players (not current batsmen and not dismissed)
  // Show all players regardless of role
  const availableBatsmen = liveMatch.teamPlayers.filter(
    (player) => !excludeIds.includes(player.id)
  );

  const handleSelectBatsman = (batsman: TeamPlayer) => {
    if (!batsman) return;

    // Determine which batsman position is being replaced
    const outBatsmanId = dismissedBatsmanRole === 'striker' 
      ? currentInnings.striker?.id 
      : currentInnings.nonStriker?.id;

    if (outBatsmanId) {
      // Replace the batsman (both position and role handled by reducer)
      dispatch(
        replaceBatsman({
          outBatsmanId,
          newBatsman: batsman,
          isStriker: dismissedBatsmanRole === 'striker',
        })
      );
    }

    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    // Add the new player to the team
    dispatch(addNewTeamPlayer({ name: name.trim(), role: 'batsman' }));
    
    // Create the new player object (with generated ID similar to what the reducer creates)
    const newPlayer: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      role: 'batsman',
    };
    
    setSelectedBatter(newPlayer);
    setNewPlayerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Change Batter</h2>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => {
              setDismissedBatsmanRole('striker');
              setSelectedBatter(null);
            }}
            className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
              dismissedBatsmanRole === 'striker'
                ? 'border-teal-500 bg-teal-900/40 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
            }`}
          >
            <span className="mb-1 block text-xs text-slate-300">Replace</span>
            {currentInnings.striker?.name || 'Striker'}
          </button>
          <button
            onClick={() => {
              setDismissedBatsmanRole('non-striker');
              setSelectedBatter(null);
            }}
            className={`flex-1 rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
              dismissedBatsmanRole === 'non-striker'
                ? 'border-teal-500 bg-teal-900/40 text-white'
                : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
            }`}
          >
            <span className="mb-1 block text-xs text-slate-300">Replace</span>
            {currentInnings.nonStriker?.name || 'Non-Striker'}
          </button>
        </div>

        {availableBatsmen.length === 0 ? (
          <p className="py-4 text-center text-slate-400">No available batsmen</p>
        ) : (
          <div className="mb-4">
            <BatterDropdownSelect
              label="Select Replacement Batsman:"
              placeholder="Choose batsman"
              selectedBatter={selectedBatter}
              batters={availableBatsmen}
              excludeIds={excludeIds}
              onSelect={handleSelectBatsman}
              allowNew={true}
              newPlayerName={newPlayerName}
              onNewPlayerNameChange={setNewPlayerName}
              onCreateNew={handleCreateNewBatsman}
            />
          </div>
        )}

        <button
          onClick={() => dispatch(closeDialog())}
          className={`mt-4 w-full px-4 py-2.5 text-sm ${secondaryButtonClass}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

