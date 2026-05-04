'use client';

import { useState, useEffect, useRef } from 'react';
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

export function NewBowlerDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [selectedBowler, setSelectedBowler] = useState<TeamPlayer | null>(null);
  const [newBowlerName, setNewBowlerName] = useState('');

  if (!liveMatch || !currentInnings) return null;

  // Get the previous bowler details to prevent consecutive overs
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

  const bowlingTeamPlayers = currentInnings.battingTeam === 'Us'
    ? OPPONENT_TEAM_PLAYERS
    : liveMatch.teamPlayers;

  const availableBowlers = bowlingTeamPlayers.filter(
    (player) => 
      player.id !== currentInnings.currentBowler?.id &&
      player.name !== currentInnings.currentBowler?.name &&
      player.id !== previousBowlerId &&
      player.name !== previousBowlerName
  );

  // Prevent multiple auto-selections
  const hasAutoSelected = useRef(false);

  // Auto-select and close for opponents (1-5 rotation)
  useEffect(() => {
    if (currentInnings.battingTeam === 'Us' && liveMatch && !hasAutoSelected.current) {
      // Find where we are in the 1-5 sequence (opp-1 to opp-5)
      let nextIndex = 0; // Default to Player 1
      if (previousBowlerId) {
        const match = previousBowlerId.match(/opp-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= 1 && num <= 5) {
            nextIndex = num % 5; // 1->2(index 1), 2->3(2), 3->4(3), 4->5(4), 5->1(0)
          }
        }
      }
      
      const nextBowler = OPPONENT_TEAM_PLAYERS[nextIndex];
      if (nextBowler) {
        hasAutoSelected.current = true;
        dispatch(changeBowler({ bowlerId: nextBowler.id, bowlerName: nextBowler.name }));
        dispatch(closeDialog());
      }
    }
  }, [currentInnings.battingTeam, previousBowlerId, dispatch, liveMatch]);

  const handleSelectBowler = (bowler: TeamPlayer) => {
    if (!bowler) return;
    
    // Dispatch change bowler action
    dispatch(changeBowler({ bowlerId: bowler.id, bowlerName: bowler.name }));
    dispatch(closeDialog());
  };

  const handleCreateNewBowler = (name: string) => {
    const newBowler: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
    };

    if (currentInnings.battingTeam === 'Them') {
      // Them is batting, so WE are bowling. Add to our roster.
      dispatch(addNewTeamPlayer({ name: name.trim(), id: newBowler.id }));
    }

    // Immediately select the new bowler
    handleSelectBowler(newBowler);
    setNewBowlerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Change Bowler</h2>
        </div>

        <div className="mb-4">
          <BowlerDropdownSelect
            label="Select Bowler:"
            placeholder="Choose bowler"
            selectedBowler={selectedBowler}
            bowlers={availableBowlers}
            onSelect={handleSelectBowler}
            previousBowlerId={previousBowlerId}
            allowNew={true}
            newPlayerName={newBowlerName}
            onNewPlayerNameChange={setNewBowlerName}
            onCreateNew={handleCreateNewBowler}
          />
        </div>

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

