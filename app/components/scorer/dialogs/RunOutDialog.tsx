'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import type { DismissalMode } from '@/app/lib/cricket-scorer-types';
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
  sectionLabelClass,
} from './dialogTheme';

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
 * Collects:
 * - Which batsman out? (Striker / Non-striker)
 * - Runs scored (0-99, up to 2 decimals)
 * - Delivery type (Wide / Leg Bye / Bye / No Ball / Regular)
 * 
 * RECORD button: Records the ball with the dismissal (no wicket to bowler)
 * BACK button: Go back to wicket dialog
 */
export function RunOutDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [batsmanOut, setBatsmanOut] = useState<'striker' | 'non-striker'>('striker');
  const [runs, setRuns] = useState('0');
  const [ballType, setBallType] = useState<'wide' | 'leg-bye' | 'bye' | 'no-ball' | 'regular'>('regular');

  if (dialogState.activeDialog !== 'runOut') {
    return null;
  }

  const dialogData = dialogState.dialogData as RunOutDialogState;

  // Get batsman names and IDs
  const strikerName = currentInnings?.striker?.name || 'Striker';
  const strikerID = currentInnings?.striker?.id || '';
  const nonStrikerName = currentInnings?.nonStriker?.name || 'Non-striker';
  const nonStrikerID = currentInnings?.nonStriker?.id || '';

  const dismissalModeLabel =
    dialogData.dismissalMode === 'run-out'
      ? 'Run Out'
      : dialogData.dismissalMode === 'obstructing-field'
        ? 'Obstructing the field'
        : 'Handling the ball';

  const handleRecord = () => {
    if (!batsmanOut) {
      alert('Please select which batsman is out');
      return;
    }

    const parsedRuns = Number.parseFloat(runs);
    if (Number.isNaN(parsedRuns) || parsedRuns < 0 || parsedRuns > 99) {
      alert('Please enter runs between 0 and 99');
      return;
    }

    // Get ID of batsman to mark out
    const batsmanIdToMarkOut = batsmanOut === 'striker' ? strikerID : nonStrikerID;

    if (!batsmanIdToMarkOut) {
      alert('Batsman ID not found');
      return;
    }

    dispatch(closeDialog());
    dispatch(
      openDialog({
        dialog: 'batsmanSelect',
        data: {
          dismissalMode: dialogData.dismissalMode,
          outBatsmanId: batsmanIdToMarkOut,
          selectedBatsman: batsmanOut,
          runs: parsedRuns,
          ballType,
          recordOnSelect: true,
        },
      })
    );
  };

  const handleBack = () => {
    dispatch(closeDialog());
    dispatch(openDialog({ dialog: 'wicket' }));
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden`}>
        <div className="border-b border-slate-700 px-5 py-4 sm:px-6">
          <div className={modalHeaderClass}>
            <p className={modalEyebrowClass}>Live Scorer</p>
            <h3 className={modalTitleClass}>{dismissalModeLabel}</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="mb-6">
            <p className={formLabelClass}>Which batsman is out?</p>
            <div className="space-y-2">
              <label className={`flex cursor-pointer items-center rounded-xl border px-3 py-3 transition-all ${
                batsmanOut === 'striker'
                  ? 'border-blue-500 bg-blue-900/40 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
              }`}>
                <input
                  type="radio"
                  name="batsman"
                  value="striker"
                  checked={batsmanOut === 'striker'}
                  onChange={() => setBatsmanOut('striker')}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="ml-3 font-medium">{strikerName}</span>
              </label>

              <label className={`flex cursor-pointer items-center rounded-xl border px-3 py-3 transition-all ${
                batsmanOut === 'non-striker'
                  ? 'border-blue-500 bg-blue-900/40 text-white'
                  : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
              }`}>
                <input
                  type="radio"
                  name="batsman"
                  value="non-striker"
                  checked={batsmanOut === 'non-striker'}
                  onChange={() => setBatsmanOut('non-striker')}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="ml-3 font-medium">{nonStrikerName}</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className={formLabelClass}>Runs Scored</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max="99"
              step="0.01"
              value={runs}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const value = e.target.value;

                if (value === '') {
                  setRuns('');
                  return;
                }

                if (/^\d{0,2}(\.\d{0,2})?$/.test(value)) {
                  const parsedValue = Number.parseFloat(value);
                  if (!Number.isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 99) {
                    setRuns(value);
                  }
                }
              }}
              onBlur={() => {
                if (runs === '' || Number.isNaN(Number.parseFloat(runs))) {
                  setRuns('0');
                  return;
                }

                const normalizedValue = Math.min(99, Math.max(0, Number.parseFloat(runs)));
                setRuns(normalizedValue.toString());
              }}
              className={`${inputClass} selection:bg-transparent selection:text-white`}
            />
          </div>

          <div>
            <p className={sectionLabelClass}>Delivery Type</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'wide', label: 'Wide' },
                { value: 'no-ball', label: 'No Ball' },
                { value: 'bye', label: 'Bye' },
                { value: 'leg-bye', label: 'Leg Bye' },
                { value: 'regular', label: 'None' },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center rounded-xl border px-3 py-2.5 transition-all ${
                    ballType === option.value
                      ? 'border-blue-500 bg-blue-900/40 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700'
                  } ${option.value === 'regular' ? 'col-span-2' : ''}`}
                >
                  <input
                    type="radio"
                    name="ballType"
                    value={option.value}
                    checked={ballType === option.value}
                    onChange={() => setBallType(option.value as 'wide' | 'leg-bye' | 'bye' | 'no-ball' | 'regular')}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="ml-3 text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-700 px-5 py-4 sm:px-6">
          <button
            onClick={handleRecord}
            className={`flex-1 py-3 ${primaryButtonClass}`}
          >
            Record
          </button>
          <button
            onClick={handleBack}
            className={`flex-1 py-3 ${secondaryButtonClass}`}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default RunOutDialog;
