'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import type { DismissalMode } from '@/app/lib/cricket-scorer-types';

interface RunOutDialogState {
  dismissalMode: DismissalMode;
  selectedBatsman?: 'striker' | 'non-striker';
  runs?: number;
  extrasType?: 'wide' | 'no-ball' | 'none';
}

/**
 * Run Out Dialog Component
 * Handles special dismissal flow for Run Out, Obstructing, Handling
 * 
 * Single modal with:
 * - Which batsman out? (Striker / Non-striker) - radio selection
 * - Runs scored (number input without spinners)
 * - Extras type (Wide / Leg Bye / Bye / No Ball / None) - radio
 * NEXT button: Record and transition to batsman selection
 * BACK button: Go back to wicket dialog
 * CANCEL button: Close without recording
 */
export function RunOutDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (dialogState.activeDialog !== 'runOut') {
    return null;
  }

  const dialogData = dialogState.dialogData as RunOutDialogState;
  const [batsmanOut, setBatsmanOut] = useState<'striker' | 'non-striker'>('striker');
  const [runs, setRuns] = useState<number | ''>('');
  const [extrasType, setExtrasType] = useState<'wide' | 'leg-bye' | 'bye' | 'no-ball' | 'none'>('none');

  // Get batsman names
  const strikerName = currentInnings?.striker?.name || 'Striker';
  const nonStrikerName = currentInnings?.nonStriker?.name || 'Non-striker';

  // Add styles for number input spinner removal globally
  const inputStyles = `
    input[type="text"]::-webkit-outer-spin-button,
    input[type="text"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type="text"][inputmode="numeric"] {
      -moz-appearance: textfield;
    }
  `;

  const dismissalModeLabel =
    dialogData.dismissalMode === 'run-out'
      ? 'Run Out'
      : dialogData.dismissalMode === 'obstructing-field'
        ? 'Obstructing the field'
        : 'Handling the ball';

  const handleNext = () => {
    if (!batsmanOut) {
      alert('Please select which batsman is out');
      return;
    }
    if (runs === '') {
      alert('Please enter runs');
      return;
    }
    // Record dismissal with runs and extras info, then move to batsman selection
    dispatch(closeDialog());
    dispatch(openDialog({
      dialog: 'batsmanSelect',
      data: {
        dismissalMode: dialogData.dismissalMode,
        selectedBatsman: batsmanOut,
        runs: typeof runs === 'number' ? runs : parseInt(String(runs), 10),
      },
    }));
  };

  const handleBack = () => {
    dispatch(closeDialog());
    dispatch(openDialog({ dialog: 'wicket' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 max-h-full overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-red-800">{dismissalModeLabel}</h3>

        {/* Batsman selection */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-gray-300">Which batsman is out?</p>
          <div className="space-y-2">
            <label className={`flex items-center p-3 rounded cursor-pointer transition-colors border-l-4 ${
              batsmanOut === 'striker'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="batsman"
                value="striker"
                checked={batsmanOut === 'striker'}
                onChange={() => setBatsmanOut('striker')}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 font-medium ${
                batsmanOut === 'striker' ? 'text-white' : 'text-gray-200'
              }`}>{strikerName}</span>
            </label>

            <label className={`flex items-center p-3 rounded cursor-pointer transition-colors border-l-4 ${
              batsmanOut === 'non-striker'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="batsman"
                value="non-striker"
                checked={batsmanOut === 'non-striker'}
                onChange={() => setBatsmanOut('non-striker')}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 font-medium ${
                batsmanOut === 'non-striker' ? 'text-white' : 'text-gray-200'
              }`}>{nonStrikerName}</span>
            </label>
          </div>
        </div>

        {/* Runs scored */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">Runs Scored</label>
          <input
            type="text"
            inputMode="numeric"
            value={runs}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^[0-7]?$/.test(val)) {
                setRuns(val === '' ? '' : parseInt(val, 10));
              }
            }}
            placeholder="0"
            maxLength={1}
            className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-800 placeholder-gray-500"
          />
        </div>

        {/* Extras type */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-gray-300">Extras Type</p>
          <div className="space-y-2">
            <label className={`flex items-center p-2 rounded cursor-pointer transition-colors border-l-4 ${
              extrasType === 'wide'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="extras"
                value="wide"
                checked={extrasType === 'wide'}
                onChange={() => setExtrasType('wide' as const)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 text-sm ${
                extrasType === 'wide' ? 'text-white' : 'text-gray-200'
              }`}>Wide</span>
            </label>

            <label className={`flex items-center p-2 rounded cursor-pointer transition-colors border-l-4 ${
              extrasType === 'leg-bye'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="extras"
                value="leg-bye"
                checked={extrasType === 'leg-bye'}
                onChange={() => setExtrasType('leg-bye' as const)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 text-sm ${
                extrasType === 'leg-bye' ? 'text-white' : 'text-gray-200'
              }`}>Leg Bye</span>
            </label>

            <label className={`flex items-center p-2 rounded cursor-pointer transition-colors border-l-4 ${
              extrasType === 'bye'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="extras"
                value="bye"
                checked={extrasType === 'bye'}
                onChange={() => setExtrasType('bye' as const)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 text-sm ${
                extrasType === 'bye' ? 'text-white' : 'text-gray-200'
              }`}>Bye</span>
            </label>

            <label className={`flex items-center p-2 rounded cursor-pointer transition-colors border-l-4 ${
              extrasType === 'no-ball'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="extras"
                value="no-ball"
                checked={extrasType === 'no-ball'}
                onChange={() => setExtrasType('no-ball' as const)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 text-sm ${
                extrasType === 'no-ball' ? 'text-white' : 'text-gray-200'
              }`}>No Ball</span>
            </label>

            <label className={`flex items-center p-2 rounded cursor-pointer transition-colors border-l-4 ${
              extrasType === 'none'
                ? 'bg-gray-700 border-yellow-400 hover:bg-gray-600'
                : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
            }`}>
              <input
                type="radio"
                name="extras"
                value="none"
                checked={extrasType === 'none'}
                onChange={() => setExtrasType('none' as const)}
                className="w-4 h-4 accent-yellow-400"
              />
              <span className={`ml-3 text-sm ${
                extrasType === 'none' ? 'text-white' : 'text-gray-200'
              }`}>None</span>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleBack}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-2 rounded transition-colors"
          >
            Next
          </button>
        </div>

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

export default RunOutDialog;
