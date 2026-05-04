'use client';

import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import {
  closeDialog,
  replaceBatsman,
  addNewTeamPlayer,
} from '@/app/lib/redux/slices/scorerSlice';
import { CricketScoringEngine } from '@/app/lib/scoring-engine';
import type { DismissalMode, TeamPlayer } from '@/app/lib/cricket-scorer-types';
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

interface BatsmanSelectDialogData {
  dismissalMode: DismissalMode;
  selectedBatsman?: 'striker' | 'non-striker';
  runs?: number;
  extrasType?: 'wide' | 'no-ball' | 'none';
  ballType?: 'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular';
  outBatsmanId?: string;
  recordOnSelect?: boolean;
}

/**
 * Batsman Selection Modal Component
 * Called after wicket is recorded, to select replacement batter from available players
 * 
 * Features:
 * - Shows list of available players from team (not currently batting/dismissed)
 * - Select player → dispatch replaceBatsman with context of which position (striker/non-striker)
 * - Auto-close after selection
 * - Handles RUN OUT: records dismissal with runs then asks for replacement
 * - Handles REGULAR WICKET: records dismissal then asks for replacement
 * - Create new player: Add new batsman to team during match
 */
export function BatsmanSelectionModal() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, liveMatch, currentInnings } = useSelector(
    (state: RootState) => state.scorer
  );
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedBatter, setSelectedBatter] = useState<TeamPlayer | null>(null);

  // Type-safe dialog data
  const dialogData = dialogState.dialogData as BatsmanSelectDialogData;

  const battingTeamPlayers =
    liveMatch && currentInnings
      ? (currentInnings.battingTeam === 'Us' ? liveMatch.teamPlayers : OPPONENT_TEAM_PLAYERS)
      : [];

  const availableBatters =
    liveMatch && currentInnings
      ? CricketScoringEngine.getAvailableBatsmen(battingTeamPlayers, currentInnings)
      : [];

  // Prevent multiple auto-selections
  const hasAutoSelected = useRef(false);

  // Reset ref when dialog opens
  useEffect(() => {
    if (dialogState.activeDialog === 'batsmanSelect') {
      hasAutoSelected.current = false;
    }
  }, [dialogState.activeDialog]);

  // Auto-select first available batter for opponents (sequential)
  useEffect(() => {
    if (dialogState.activeDialog === 'batsmanSelect' && 
        currentInnings?.battingTeam === 'Them' && 
        availableBatters.length > 0 && 
        !hasAutoSelected.current) {
      const nextBatter = availableBatters[0];
      if (nextBatter) {
        hasAutoSelected.current = true;
        handleSelectBatsman(nextBatter);
      }
    }
  }, [dialogState.activeDialog, currentInnings?.battingTeam, availableBatters.length]);

  // excludeIds is now handled internally by getAvailableBatsmen
  const excludeIds: string[] = [];

  if (dialogState.activeDialog !== 'batsmanSelect') {
    return null;
  }



  const handleSelectBatsman = (batter: TeamPlayer) => {
    if (!currentInnings) return;

    const outBatsmanId = dialogData.outBatsmanId;
    if (!outBatsmanId) return;

    const isStriker = dialogData.selectedBatsman
      ? dialogData.selectedBatsman === 'striker'
      : currentInnings.striker?.id === outBatsmanId;

    dispatch(
      replaceBatsman({
        isStriker,
        newBatsman: batter,
        outBatsmanId,
      })
    );

    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    const newPlayer: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
    };

    if (currentInnings?.battingTeam === 'Us') {
      dispatch(addNewTeamPlayer({ name: name.trim(), id: newPlayer.id }));
    }
    
    // Select the newly created player (works for both Us and Them)
    handleSelectBatsman(newPlayer);
    setNewPlayerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h3 className={modalTitleClass}>Select New Batsman</h3>
        </div>

        <div className="mb-4">
          <BatterDropdownSelect
            label="Select New Batsman:"
            placeholder="Choose batsman"
            selectedBatter={selectedBatter}
            batters={availableBatters}
            excludeIds={excludeIds}
            onSelect={handleSelectBatsman}
            allowNew={true}
            newPlayerName={newPlayerName}
            onNewPlayerNameChange={setNewPlayerName}
            onCreateNew={handleCreateNewBatsman}
          />
        </div>

        <button
          onClick={() => dispatch(closeDialog())}
          className={`w-full py-2.5 ${secondaryButtonClass}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BatsmanSelectionModal;
