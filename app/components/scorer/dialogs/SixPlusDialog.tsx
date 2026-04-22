'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { closeDialog, recordBattingBall, createUndoSnapshot, recordBye, recordLegBye, recordWide, recordNoBall } from '@/app/lib/redux/slices/scorerSlice';
import {
  formLabelClass,
  inputClass,
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

/**
 * 6+ Dialog Component
 * Allows recording a 6+ runs with optional extras selection
 */
export function SixPlusDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState } = useSelector((state: RootState) => state.scorer);
  
  const [runsInput, setRunsInput] = useState<string>('6');
  const [selectedType, setSelectedType] = useState<'none' | 'bye' | 'leg-bye' | 'wide' | 'no-ball'>('none');

  if (dialogState.activeDialog !== 'sixPlus') {
    return null;
  }

  const handleSubmit = () => {
    if (!runsInput || isNaN(parseInt(runsInput, 10))) {
      alert('Please enter a valid number of runs');
      return;
    }

    const runs = parseInt(runsInput, 10);
    if (runs < 0) {
      alert('Runs must be non-negative');
      return;
    }

    dispatch(createUndoSnapshot());

    // Record based on selected type
    switch (selectedType) {
      case 'bye':
        if (runs >= 1) {
          dispatch(recordBye({ runs, hasWicket: false }));
        }
        break;
      case 'leg-bye':
        if (runs >= 1) {
          dispatch(recordLegBye({ runs, hasWicket: false }));
        }
        break;
      case 'wide':
        dispatch(recordWide({ runs, hasWicket: false }));
        break;
      case 'no-ball':
        dispatch(recordNoBall({ runs, hasWicket: false, runType: 'none' }));
        break;
      case 'none':
      default:
        dispatch(recordBattingBall({ runs }));
        break;
    }

    dispatch(closeDialog());
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>6+ Runs</h2>
        </div>

        <div className="mb-4">
          <label className={formLabelClass}>Total Runs Scored</label>
          <input
            type="number"
            value={runsInput}
            onChange={(e) => setRunsInput(e.target.value)}
            min="0"
            className={inputClass}
          />
        </div>

        <div className="mb-4">
          <label className={formLabelClass}>Type of Runs</label>
          <div className="space-y-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                selectedType === 'none'
                  ? 'border-blue-500 bg-blue-900/40 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
              }`}
            >
              <input
                type="radio"
                name="runType"
                value="none"
                checked={selectedType === 'none'}
                onChange={(e) => setSelectedType(e.target.value as 'none' | 'bye' | 'leg-bye' | 'wide' | 'no-ball')}
                className="h-4 w-4 accent-blue-500"
              />
              <span className="text-sm">Regular Runs (Off Bat)</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'bye', label: 'Bye' },
                { value: 'leg-bye', label: 'Leg Bye' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                    selectedType === option.value
                      ? 'border-blue-500 bg-blue-900/40 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="runType"
                    value={option.value}
                    checked={selectedType === option.value}
                    onChange={(e) => setSelectedType(e.target.value as 'none' | 'bye' | 'leg-bye' | 'wide' | 'no-ball')}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'wide', label: 'Wide' },
                { value: 'no-ball', label: 'No Ball' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                    selectedType === option.value
                      ? 'border-blue-500 bg-blue-900/40 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-100 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="runType"
                    value={option.value}
                    checked={selectedType === option.value}
                    onChange={(e) => setSelectedType(e.target.value as 'none' | 'bye' | 'leg-bye' | 'wide' | 'no-ball')}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            className={`flex-1 px-4 py-2.5 ${primaryButtonClass}`}
          >
            Record
          </button>
          <button
            onClick={() => dispatch(closeDialog())}
            className={`flex-1 px-4 py-2.5 ${secondaryButtonClass}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
