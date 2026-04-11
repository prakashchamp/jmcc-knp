'use client';

import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, clearMatch } from '@/app/lib/redux/slices/scorerSlice';
import {
  dangerButtonClass,
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function StartNewMatchConfirmDialog() {
  const dispatch = useDispatch<AppDispatch>();

  const handleConfirm = () => {
    dispatch(clearMatch());
    dispatch(closeDialog());
  };

  const handleCancel = () => {
    dispatch(closeDialog());
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-sm p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Complete This Match?</h2>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className={`flex-1 px-4 py-2.5 text-sm ${secondaryButtonClass}`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 text-sm ${dangerButtonClass}`}
          >
            Complete Match
          </button>
        </div>
      </div>
    </div>
  );
}
