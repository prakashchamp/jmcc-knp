'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, addNewTeamPlayer, replaceStrikerForRetiredHurt } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';
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
  const battingTeamPlayers = currentInnings.battingTeam === 'Us' ? liveMatch.teamPlayers : OPPONENT_TEAM_PLAYERS;
  const availableBatsmen = battingTeamPlayers.filter(
    (player) =>
      player.id !== currentInnings.striker?.id &&
      player.id !== currentInnings.nonStriker?.id &&
      !currentInnings.dismissedBatsmen.some((d) => d.id === player.id)
  );

  const excludeIds: string[] = [];
  if (currentInnings.striker) excludeIds.push(currentInnings.striker.id);
  if (currentInnings.nonStriker) excludeIds.push(currentInnings.nonStriker.id);
  currentInnings.dismissedBatsmen.forEach((d) => excludeIds.push(d.id));

  const handleSelectBatsman = (batsman: TeamPlayer) => {
    if (!batsman || !currentInnings.striker) return;

    // Mark the current striker as retired hurt and replace with new batsman
    dispatch(
      replaceStrikerForRetiredHurt({
        retiredHurtBatsmanId: currentInnings.striker.id,
        newBatsman: batsman,
      })
    );

    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    if (currentInnings.battingTeam !== 'Us') {
      return;
    }

    dispatch(addNewTeamPlayer({ name: name.trim() }));
    
    const newPlayer: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
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
              allowNew={currentInnings.battingTeam === 'Us'}
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

