'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, changeBowler, addNewTeamPlayer } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';
import { BowlerDropdownSelect } from './BowlerDropdownSelect';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function BowlerRetiredDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [selectedBowler, setSelectedBowler] = useState<TeamPlayer | null>(null);
  const [newBowlerName, setNewBowlerName] = useState('');

  if (!liveMatch || !currentInnings) return null;

  const isTeamBowler = currentInnings.battingTeam === 'Them';

  let previousBowlerId: string | undefined;
  let previousBowlerName: string | undefined;

  if (currentInnings.ballHistory && currentInnings.ballHistory.length > 0) {
    const currentOver = Math.floor(currentInnings.totalBalls / 6);
    const previousOverBalls = currentInnings.ballHistory.filter(
      (b) => b.over === currentOver - 1
    );
    if (previousOverBalls.length > 0) {
      previousBowlerId = previousOverBalls[0]?.bowler?.id;
      previousBowlerName = previousOverBalls[0]?.bowler?.name;
    }
  }

  const bowlingTeamPlayers = isTeamBowler ? liveMatch.teamPlayers : OPPONENT_TEAM_PLAYERS;

  const bowlersToSelect = bowlingTeamPlayers.filter(
    (player) =>
      player.id !== currentInnings.currentBowler?.id &&
      player.name !== currentInnings.currentBowler?.name &&
      (!previousBowlerId || player.id !== previousBowlerId) &&
      (!previousBowlerName || player.name !== previousBowlerName)
  );

  const handleSelectBowler = (bowler: TeamPlayer) => {
    if (!bowler) return;
    
    // Dispatch change bowler action
    dispatch(changeBowler({ bowlerId: bowler.id, bowlerName: bowler.name }));
    dispatch(closeDialog());
  };

  const handleCreateNewBowler = (name: string) => {
    // Add the new player to the team if it's a team bowler
    if (isTeamBowler) {
      dispatch(addNewTeamPlayer({ name: name.trim() }));
    }
    
    const newBowler: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
    };
    setSelectedBowler(newBowler);
    setNewBowlerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Bowler Retired Hurt</h2>
        </div>

        {bowlersToSelect.length === 0 ? (
          <p className="py-4 text-center text-slate-400">No bowlers available</p>
        ) : (
          <div className="mb-4">
            <BowlerDropdownSelect
              label="Select Bowler:"
              placeholder="Choose bowler"
              selectedBowler={selectedBowler}
              bowlers={bowlersToSelect}
              onSelect={handleSelectBowler}
              previousBowlerId={previousBowlerId}
              allowNew={true}
              newPlayerName={newBowlerName}
              onNewPlayerNameChange={setNewBowlerName}
              onCreateNew={handleCreateNewBowler}
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

