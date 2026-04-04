'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';

export function BowlerRetiredDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch || !currentInnings) return null;

  // Get available bowlers (not current bowler)
  const availableBowlers = liveMatch.teamPlayers.filter(
    (player) => player.id !== currentInnings.currentBowler?.id
  );

  const handleSelectBowler = (bowler: TeamPlayer) => {
    // TODO: Dispatch action to mark bowler as retired hurt and update bowler
    console.log('Bowler retired hurt, new bowler:', bowler.name);
    dispatch(closeDialog());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-96 shadow-lg max-h-96 overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-2">{currentInnings.currentBowler?.name} - Retired Hurt</h2>
        <p className="text-gray-400 text-sm mb-4">Select replacement bowler:</p>

        {availableBowlers.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No bowlers available</p>
        ) : (
          <div className="space-y-2">
            {availableBowlers.map((bowler) => (
              <button
                key={bowler.id}
                onClick={() => handleSelectBowler(bowler)}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-colors text-left flex justify-between items-center"
              >
                <span>{bowler.name}</span>
                <span className="text-xs text-gray-400">#{bowler.jerseyNumber}</span>
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
