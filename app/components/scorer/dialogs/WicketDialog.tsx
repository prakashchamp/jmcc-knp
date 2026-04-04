'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import { DismissalMode } from '@/app/lib/cricket-scorer-types';

/**
 * Wicket Dialog Component
 * Shows all 10 dismissal modes
 * 
 * Regular modes: Bowled, Caught, LBW, Stumped, Hit Wicket, Caught and Bowled, Retired Hurt
 * Special flows:
 *   - Run Out → RunOutDialog (ask batsman selection)
 *   - Obstructing the field → RunOutDialog (ask batsman selection)
 *   - Handling the ball → RunOutDialog (ask batsman selection)
 */
export function WicketDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState } = useSelector((state: RootState) => state.scorer);

  if (dialogState.activeDialog !== 'wicket') {
    return null;
  }

  const dismissalModes: Array<{
    mode: DismissalMode;
    label: string;
    needsSpecialFlow: boolean;
  }> = [
    { mode: 'bowled', label: 'Bowled', needsSpecialFlow: false },
    { mode: 'caught', label: 'Caught', needsSpecialFlow: false },
    { mode: 'lbw', label: 'LBW', needsSpecialFlow: false },
    { mode: 'stumped', label: 'Stumped', needsSpecialFlow: true },
    { mode: 'hit-wicket', label: 'Hit Wicket', needsSpecialFlow: false },
    { mode: 'run-out', label: 'Run Out', needsSpecialFlow: true },
    { mode: 'retired-hurt', label: 'Retired Hurt', needsSpecialFlow: false },
    { mode: 'retired-out', label: 'Retired Out', needsSpecialFlow: false },
    { mode: 'obstructing-field', label: 'Obstructing the field', needsSpecialFlow: true },
    { mode: 'handled-ball', label: 'Handling the ball', needsSpecialFlow: true },
  ];

  const handleDismissalSelect = (mode: DismissalMode, needsSpecialFlow: boolean) => {
    if (mode === 'stumped') {
      // For Stumped - open special dialog to ask about wide ball
      dispatch(closeDialog());
      dispatch(openDialog({ dialog: 'stumped' }));
    } else if (needsSpecialFlow) {
      // For Run Out, Obstructing, Handling - open special flow dialog
      dispatch(closeDialog());
      dispatch(openDialog({ dialog: 'runOut', data: { dismissalMode: mode } }));
    } else {
      // For regular dismissals, we'll transition to batsman selection
      dispatch(closeDialog());
      dispatch(openDialog({
        dialog: 'batsmanSelect',
        data: { dismissalMode: mode },
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 max-h-96 overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-red-400">WICKET</h3>

        {/* Dismissal modes */}
        <div className="space-y-2 mb-4">
          {dismissalModes.map((item) => (
            <button
              key={item.mode}
              onClick={() => handleDismissalSelect(item.mode, item.needsSpecialFlow)}
              className={`
                w-full py-3 px-4 rounded font-medium transition-colors
                ${item.needsSpecialFlow
                  ? 'bg-red-800 hover:bg-red-700 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
                }
              `}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Cancel button */}
        <button
          onClick={() => dispatch(closeDialog())}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default WicketDialog;
