'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { closeDialog, recordBye, recordLegBye, recordWide, recordNoBall, openDialog } from '@/app/lib/redux/slices/scorerSlice';
import { ExtraType, DismissalMode } from '@/app/lib/cricket-scorer-types';

/**
 * Extra Dialog Component
 * Generic modal for recording: Bye (B), Leg-bye (LB), Wide (WD), No-ball (NB)
 * 
 * Shows preset run options (0-6) + custom input field
 * For NB with runs > 0, asks run type after selection
 */
export function ExtraDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState } = useSelector((state: RootState) => state.scorer);
  const extraType = dialogState.dialogData?.extraType;
  const [showRunTypeSelection, setShowRunTypeSelection] = useState(false);
  const [customRuns, setCustomRuns] = useState<string>('');
  const [selectedRuns, setSelectedRuns] = useState<number | null>(null);
  const [selectedRunType, setSelectedRunType] = useState<'leg-bye' | 'bye' | 'none'>('none');

  if (!extraType || dialogState.activeDialog !== 'extra') {
    return null;
  }

  const isNoBall = extraType === 'no-ball';
  const minRuns = extraType === 'wide' || extraType === 'no-ball' ? 0 : 1;
  const maxPreset = 6;

  const title = extraType === 'bye' ? 'BYE' : extraType === 'leg-bye' ? 'LEG BYE' : extraType === 'wide' ? 'WIDE' : 'NO BALL';
  const prefix = extraType === 'bye' ? 'b' : extraType === 'leg-bye' ? 'lb' : extraType === 'wide' ? 'wd' : 'nb';

  // Handle preset run selection
  const handlePresetRunSelect = (runs: number) => {
    if (isNoBall && runs > 0) {
      setSelectedRuns(runs);
      setShowRunTypeSelection(true);
    } else {
      recordExtra(runs, false);
    }
  };

  // Handle custom run input
  const handleCustomRunSubmit = () => {
    if (customRuns === '') {
      alert('Please enter a number');
      return;
    }
    const runs = parseInt(customRuns, 10);
    if (isNaN(runs) || runs < 0 || runs > 99) {
      alert('Please enter a valid number (0-99)');
      return;
    }
    setCustomRuns('');
    if (isNoBall && runs > 0) {
      setSelectedRuns(runs);
      setShowRunTypeSelection(true);
    } else {
      recordExtra(runs, false);
    }
  };

  // Handle "+Wkt" selection
  const handleWicketExtra = () => {
    dispatch(closeDialog());
    dispatch(openDialog({ dialog: 'wicket' }));
  };

  // Record the extra delivery
  const recordExtra = (runs: number, hasWicket: boolean) => {
    switch (extraType) {
      case 'bye':
        dispatch(recordBye({ runs, hasWicket }));
        break;
      case 'leg-bye':
        dispatch(recordLegBye({ runs, hasWicket }));
        break;
      case 'wide':
        dispatch(recordWide({ runs, hasWicket }));
        break;
      case 'no-ball':
        dispatch(recordNoBall({ runs, hasWicket, runType: selectedRunType }));
        break;
    }
    dispatch(closeDialog());
  };

  // Handle run type selection for no-ball
  const handleRunTypeConfirm = () => {
    if (selectedRuns !== null) {
      recordExtra(selectedRuns, false);
    }
  };

  if (showRunTypeSelection) {
    // Stage 2: Run Type Selection (for no-ball)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-700">
          <h3 className="text-lg font-bold text-center mb-4 text-amber-500">Type of Runs</h3>

          <div className="space-y-3 mb-6">
            {['leg-bye', 'bye', 'none'].map((type) => (
              <label key={type} className="flex items-center p-3 border-2 border-gray-700 rounded cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setSelectedRunType(type as 'leg-bye' | 'bye' | 'none')}
              >
                <input
                  type="radio"
                  name="runType"
                  value={type}
                  checked={selectedRunType === type}
                  onChange={() => setSelectedRunType(type as 'leg-bye' | 'bye' | 'none')}
                  className="w-4 h-4 mr-3 accent-yellow-400"
                />
                <span className="capitalize font-medium text-white">
                  {type === 'leg-bye' ? 'Leg Bye' : type === 'bye' ? 'Bye' : 'None'}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleRunTypeConfirm}
            className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Stage 1: Run Selection with Presets and Custom Input
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 max-h-96 overflow-y-auto border border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-amber-500">{title}</h3>

        {/* Preset run options */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">Quick Options</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {Array.from({ length: maxPreset - minRuns + 1 }, (_, i) => minRuns + i).map((runs) => (
              <button
                key={runs}
                onClick={() => handlePresetRunSelect(runs)}
                className="bg-amber-700 hover:bg-amber-600 text-white font-bold py-2 rounded transition-colors text-sm"
              >
                {runs}+{prefix}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input field */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 mb-2">Custom Runs</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={customRuns}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d+$/.test(val)) {
                  setCustomRuns(val);
                }
              }}
              placeholder="0"
              maxLength={2}
              className="flex-1 px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-amber-700 placeholder-gray-500"
            />
            <button
              onClick={handleCustomRunSubmit}
              className="bg-amber-700 hover:bg-amber-600 text-white font-bold px-3 py-2 rounded transition-colors"
            >
              +{prefix}
            </button>
          </div>
        </div>

        {/* "+Wkt" option */}
        <button
          onClick={handleWicketExtra}
          className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-3 rounded mb-3 transition-colors text-sm"
        >
          {prefix}+Wkt
        </button>

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

export default ExtraDialog;
