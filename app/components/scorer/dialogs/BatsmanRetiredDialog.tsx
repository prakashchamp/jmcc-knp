'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, addNewTeamPlayer } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { BatterDropdownSelect } from './BatterDropdownSelect';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function BatsmanRetiredDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [selectedBatter, setSelectedBatter] = useState<TeamPlayer | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!liveMatch || !currentInnings) return null;

  // Get available players (not currently batting - striker and non-striker, and not dismissed)
  // Show all players regardless of role
  const availableBatsmen = liveMatch.teamPlayers.filter(
    (player) => 
      player.id !== currentInnings.striker?.id && 
      player.id !== currentInnings.nonStriker?.id &&
      !currentInnings.dismissedBatsmen.some(d => d.id === player.id)
  );

  const excludeIds: string[] = [];
  if (currentInnings.striker) excludeIds.push(currentInnings.striker.id);
  if (currentInnings.nonStriker) excludeIds.push(currentInnings.nonStriker.id);
  currentInnings.dismissedBatsmen.forEach((d) => excludeIds.push(d.id));

  const handleSelectBatsman = (batsman: TeamPlayer) => {
    // TODO: Dispatch action to mark batsman as retired hurt and update batsman
    console.log('Batsman retired hurt, new batsman:', batsman.name);
    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    // Add the new player to the team
    dispatch(addNewTeamPlayer({ name: name.trim(), role: 'batsman' }));
    
    // Create the new player object
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
          <h2 className={modalTitleClass}>Batter Retired Hurt</h2>
        </div>

        {availableBatsmen.length === 0 ? (
          <p className="py-4 text-center text-slate-400">No batsmen available</p>
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

