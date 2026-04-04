'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { closeDialog, recordWicket, replaceBatsman } from '@/app/lib/redux/slices/scorerSlice';
import { CricketScoringEngine } from '@/app/lib/scoring-engine';
import type { DismissalMode, CurrentBatsman } from '@/app/lib/cricket-scorer-types';

interface BatsmanSelectDialogData {
  dismissalMode: DismissalMode;
  selectedBatsman?: 'striker' | 'non-striker';
  runs?: number;
  extrasType?: 'wide' | 'no-ball' | 'none';
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
 */
export function BatsmanSelectionModal() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, liveMatch, currentInnings } = useSelector(
    (state: RootState) => state.scorer
  );
  const [availablePlayers, setAvailablePlayers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  // Type-safe dialog data
  const dialogData = dialogState.dialogData as BatsmanSelectDialogData;

  useEffect(() => {
    if (dialogState.activeDialog !== 'batsmanSelect' || !liveMatch || !currentInnings) {
      return;
    }

    // Get available batsmen using scoring engine
    const available = CricketScoringEngine.getAvailableBatsmen(
      liveMatch.teamPlayers,
      currentInnings
    );

    // Filter out already playing batsmen (striker and non-striker)
    const playingPlayerIds = new Set<string>();
    if (currentInnings.striker) playingPlayerIds.add(currentInnings.striker.id);
    if (currentInnings.nonStriker) playingPlayerIds.add(currentInnings.nonStriker.id);
    currentInnings.dismissedBatsmen.forEach((d) => playingPlayerIds.add(d.id));

    const filteredAvailable = available.filter((p) => !playingPlayerIds.has(p.id));

    setAvailablePlayers(filteredAvailable);
    setIsLoading(false);
  }, [dialogState.activeDialog, liveMatch, currentInnings]);

  if (dialogState.activeDialog !== 'batsmanSelect') {
    return null;
  }

  const handleSelectBatsman = (playerId: string, playerName: string) => {
    if (!currentInnings) {
      console.error('No current innings');
      return;
    }

    // Record dismissal for the out batsman
    const isOutStrikerContext = dialogData.selectedBatsman !== 'non-striker';
    const outBatsmanId = isOutStrikerContext
      ? currentInnings.striker?.id
      : currentInnings.nonStriker?.id;

    if (outBatsmanId) {
      // Record the wicket (dismissal)
      dispatch(
        recordWicket({
          dismissalMode: dialogData.dismissalMode,
          batsmanId: outBatsmanId,
        })
      );
    }

    // Find the new batsman object from team players
    const newBatsmanObj = liveMatch?.teamPlayers.find((p) => p.id === playerId);
    if (newBatsmanObj) {
      // Now replace the batsman
      const isStriker = isOutStrikerContext;
      dispatch(
        replaceBatsman({
          outBatsmanId: outBatsmanId || '',
          newBatsman: newBatsmanObj,
          isStriker,
        })
      );
    }

    // Close the dialog
    dispatch(closeDialog());
  };

  const isStrikerOut = dialogData.selectedBatsman !== 'non-striker';
  const dismissalModeLabel =
    dialogData.dismissalMode === 'run-out'
      ? 'Run Out'
      : dialogData.dismissalMode === 'obstructing-field'
        ? 'Obstructing the field'
        : dialogData.dismissalMode === 'handled-ball'
          ? 'Handling the ball'
          : dialogData.dismissalMode === 'bowled'
            ? 'Bowled'
            : dialogData.dismissalMode === 'caught'
              ? 'Caught'
              : dialogData.dismissalMode === 'lbw'
                ? 'LBW'
                : dialogData.dismissalMode === 'stumped'
                  ? 'Stumped'
                  : dialogData.dismissalMode === 'hit-wicket'
                    ? 'Hit Wicket'
                    : dialogData.dismissalMode === 'retired-hurt'
                      ? 'Retired Hurt'
                      : dialogData.dismissalMode === 'retired-out'
                        ? 'Retired Out'
                        : 'Out';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 max-h-96 overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-bold text-center mb-2 text-white">Select Replacement Batsman</h3>
        <p className="text-gray-300 text-center text-sm mb-4">
          {dismissalModeLabel} • {isStrikerOut ? 'Striker' : 'Non-striker'} out
        </p>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Loading available players...</p>
          </div>
        ) : availablePlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-red-400 font-medium">No available batsmen</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {availablePlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handleSelectBatsman(player.id, player.name)}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded font-medium transition-colors text-left"
              >
                {player.name}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => dispatch(closeDialog())}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default BatsmanSelectionModal;
