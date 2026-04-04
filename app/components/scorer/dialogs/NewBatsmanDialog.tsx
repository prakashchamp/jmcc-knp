'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';

export function NewBatsmanDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch || !currentInnings) return null;

  // Get available batsmen (not current batsmen)
  const availableBatsmen = liveMatch.teamPlayers.filter(
    (player) => player.id !== currentInnings.striker?.id && player.id !== currentInnings.nonStriker?.id
  );

  const handleSelectBatsman = (batsman: TeamPlayer) => {
    // TODO: Dispatch action to update batsman
    console.log('Selected batsman:', batsman.name);
    dispatch(closeDialog());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-96 shadow-lg max-h-96 overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-4">Select New Batsman</h2>

        {availableBatsmen.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No batsmen available</p>
        ) : (
          <div className="space-y-2">
            {availableBatsmen.map((batsman) => (
              <button
                key={batsman.id}
                onClick={() => handleSelectBatsman(batsman)}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-colors text-left flex justify-between items-center"
              >
                <span>{batsman.name}</span>
                <span className="text-xs text-gray-400">#{batsman.number}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => dispatch(closeDialog())}
          className="w-full mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded transition-colors border border-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
