'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { closeDialog, recordBye, recordLegBye, recordWide, recordNoBall } from '@/app/lib/redux/slices/scorerSlice';
import {
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
      recordExtra(runs);
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
      recordExtra(runs);
    }
  };

  // Record the extra delivery (no wicket option)
  const recordExtra = (runs: number) => {
    switch (extraType) {
      case 'bye':
        dispatch(recordBye({ runs }));
        break;
      case 'leg-bye':
        dispatch(recordLegBye({ runs }));
        break;
      case 'wide':
        dispatch(recordWide({ runs }));
        break;
      case 'no-ball':
        dispatch(recordNoBall({ runs, runType: selectedRunType }));
        break;
    }
    dispatch(closeDialog());
  };

  // Handle run type selection for no-ball
  const handleRunTypeConfirm = () => {
    if (selectedRuns !== null) {
      recordExtra(selectedRuns);
    }
  };

  if (showRunTypeSelection) {
    // Stage 2: Run Type Selection (for no-ball)
    return (
      <div className={modalOverlayClass}>
        <div className={`${modalPanelClass} w-full max-w-sm p-5 sm:p-6`}>
          <div className={modalHeaderClass}>
            <p className={modalEyebrowClass}>Live Scorer</p>
            <h3 className={modalTitleClass}>Type of Runs</h3>
          </div>

          <div className="mb-6 space-y-3">
            {['leg-bye', 'bye', 'none'].map((type) => (
              <label
                key={type}
                className={`flex cursor-pointer items-center rounded-xl border-2 px-3 py-3 transition-all ${
                  selectedRunType === type
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                    : 'border-border bg-background text-foreground hover:border-blue-500/50 hover:bg-blue-600/5'
                }`}
                onClick={() => setSelectedRunType(type as 'leg-bye' | 'bye' | 'none')}
              >
                <input
                  type="radio"
                  name="runType"
                  value={type}
                  checked={selectedRunType === type}
                  onChange={() => setSelectedRunType(type as 'leg-bye' | 'bye' | 'none')}
                  className="mr-3 h-4 w-4 accent-blue-500"
                />
                <span className="font-medium">
                  {type === 'leg-bye' ? 'Leg Bye' : type === 'bye' ? 'Bye' : 'None'}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleRunTypeConfirm}
            className={`w-full py-3 ${primaryButtonClass}`}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Stage 1: Run Selection with Presets and Custom Input
  const titleColor = isNoBall ? 'text-amber-500' : 'text-yellow-600';
  const buttonBgClass = isNoBall ? 'bg-amber-700 hover:bg-amber-600' : 'bg-yellow-600 hover:bg-yellow-500';
  const inputRingClass = isNoBall ? 'focus:ring-amber-700' : 'focus:ring-yellow-600';

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} max-h-96 w-full max-w-sm overflow-y-auto p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h3 className={`${modalTitleClass} ${titleColor}`}>{title}</h3>
        </div>

        <div className="mb-4">
          <p className={sectionLabelClass}>Quick Options</p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {Array.from({ length: maxPreset - minRuns + 1 }, (_, i) => minRuns + i).map((runs) => (
              <button
                key={runs}
                onClick={() => handlePresetRunSelect(runs)}
                className={`${buttonBgClass} rounded-lg py-2 text-sm font-bold text-white transition-colors`}
              >
                {runs}+{prefix}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className={sectionLabelClass}>Custom Runs</p>
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
              className={`${inputClass} flex-1 focus:ring-1 ${inputRingClass}`}
            />
            <button
              onClick={handleCustomRunSubmit}
              className={`${buttonBgClass} rounded-lg px-3 py-2 font-bold text-white transition-colors`}
            >
              +{prefix}
            </button>
          </div>
        </div>

        <button
          onClick={() => dispatch(closeDialog())}
          className={`w-full py-3 ${secondaryButtonClass}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default ExtraDialog;
