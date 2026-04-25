'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import {
  closeDialog,
  replaceBatsman,
  addNewTeamPlayer,
  createUndoSnapshot,
  recordQuickWicket,
  recordStumpedWide,
  recordStumpedRegular,
  recordRunOutBall,
  recordRetiredOut,
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

  const excludeIds = currentInnings
    ? [
        ...(currentInnings.striker ? [currentInnings.striker.id] : []),
        ...(currentInnings.nonStriker ? [currentInnings.nonStriker.id] : []),
        ...currentInnings.dismissedBatsmen.map((dismissedBatter) => dismissedBatter.id),
      ]
    : [];

  if (dialogState.activeDialog !== 'batsmanSelect') {
    return null;
  }

  useEffect(() => {
    if (!currentInnings || !dialogData.recordOnSelect) return;

    // If we are on 9 wickets, this action records the 10th wicket.
    // In that case we should not wait for a replacement batsman selection.
    if (currentInnings.totalWickets < 9) return;

    const outBatsmanId = dialogData.outBatsmanId;
    if (!outBatsmanId) return;

    dispatch(createUndoSnapshot());

    switch (dialogData.dismissalMode) {
      case 'bowled':
      case 'caught':
      case 'lbw':
      case 'hit-wicket':
        dispatch(recordQuickWicket({ dismissalMode: dialogData.dismissalMode }));
        break;
      case 'stumped':
        if (dialogData.ballType === 'wide') {
          dispatch(recordStumpedWide({ runs: dialogData.runs ?? 0 }));
        } else {
          dispatch(recordStumpedRegular());
        }
        break;
      case 'run-out':
      case 'handled-ball':
      case 'obstructing-field':
        dispatch(
          recordRunOutBall({
            dismissalMode: dialogData.dismissalMode,
            ballType: dialogData.ballType ?? 'regular',
            runs: dialogData.runs ?? 0,
            batsmanIdToMarkOut: outBatsmanId,
          })
        );
        break;
      case 'retired-out':
        dispatch(recordRetiredOut());
        break;
      default:
        break;
    }

    dispatch(closeDialog());
  }, [
    currentInnings,
    dialogData.recordOnSelect,
    dialogData.dismissalMode,
    dialogData.ballType,
    dialogData.runs,
    dialogData.outBatsmanId,
    dispatch,
  ]);

  const handleSelectBatsman = (batter: TeamPlayer) => {
    if (!currentInnings) {
      console.error('No current innings');
      return;
    }

    const outBatsmanId = dialogData.outBatsmanId;

    if (!outBatsmanId) {
      console.error('No out batsman ID in dialog data');
      return;
    }

    const isPendingRecord = Boolean(dialogData.recordOnSelect);
    const isStriker = dialogData.selectedBatsman
      ? dialogData.selectedBatsman === 'striker'
      : currentInnings.striker?.id === outBatsmanId;

    if (isPendingRecord) {
      dispatch(createUndoSnapshot());

      switch (dialogData.dismissalMode) {
        case 'bowled':
        case 'caught':
        case 'lbw':
        case 'hit-wicket':
          dispatch(recordQuickWicket({ dismissalMode: dialogData.dismissalMode }));
          break;
        case 'stumped':
          if (dialogData.ballType === 'wide') {
            dispatch(recordStumpedWide({ runs: dialogData.runs ?? 0 }));
          } else {
            dispatch(recordStumpedRegular());
          }
          break;
        case 'run-out':
        case 'handled-ball':
        case 'obstructing-field':
          dispatch(
            recordRunOutBall({
              dismissalMode: dialogData.dismissalMode,
              ballType: dialogData.ballType ?? 'regular',
              runs: dialogData.runs ?? 0,
              batsmanIdToMarkOut: outBatsmanId,
            })
          );
          break;
        case 'retired-out':
          dispatch(recordRetiredOut());
          break;
        default:
          break;
      }
    } else {
      const outBatsman = currentInnings.dismissedBatsmen.find((b) => b.id === outBatsmanId);
      if (!outBatsman) {
        console.error('Out batsman not found in dismissed list');
        return;
      }
    }

    dispatch(
      replaceBatsman({
        outBatsmanId,
        newBatsman: batter,
        isStriker,
      })
    );

    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    if (currentInnings?.battingTeam !== 'Us') {
      return;
    }
    dispatch(addNewTeamPlayer({ name: name.trim() }));
    setNewPlayerName('');
  };


  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h3 className={modalTitleClass}>Select New Batsman</h3>
        </div>

        {availableBatters.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-medium text-red-400">No available batsmen</p>
          </div>
        ) : (
          <div className="mb-4">
            <BatterDropdownSelect
              label="Select New Batsman:"
              placeholder="Choose batsman"
              selectedBatter={null}
              batters={availableBatters}
              excludeIds={excludeIds}
              onSelect={handleSelectBatsman}
              allowNew={currentInnings?.battingTeam === 'Us'}
              newPlayerName={newPlayerName}
              onNewPlayerNameChange={setNewPlayerName}
              onCreateNew={handleCreateNewBatsman}
            />
          </div>
        )}

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
