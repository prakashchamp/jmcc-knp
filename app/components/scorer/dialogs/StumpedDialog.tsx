'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

/**
 * Stumped Dialog Component
 * Asks whether the stumping was off a wide ball or not
 * 
 * Yes (Wide) → Records as WD ball + stumped + wicket immediately (no runs on wide)
 * No (Not Wide) → Routes to BatsmanSelectionModal for other dismissal handling
 * Back → Returns to WicketDialog
 */
export function StumpedDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (dialogState.activeDialog !== 'stumped') {
    return null;
  }

  const handleWideYes = () => {
    if (!currentInnings?.striker) return;

    dispatch(closeDialog());
    dispatch(
      openDialog({
        dialog: 'batsmanSelect',
        data: {
          dismissalMode: 'stumped',
          outBatsmanId: currentInnings.striker.id,
          selectedBatsman: 'striker',
          runs: 0,
          ballType: 'wide',
          recordOnSelect: true,
        },
      })
    );
  };

  const handleWideNo = () => {
    if (!currentInnings?.striker) return;

    dispatch(closeDialog());
    dispatch(
      openDialog({
        dialog: 'batsmanSelect',
        data: {
          dismissalMode: 'stumped',
          outBatsmanId: currentInnings.striker.id,
          selectedBatsman: 'striker',
          ballType: 'regular',
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
      <div className={`${modalPanelClass} w-full max-w-sm p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h3 className={modalTitleClass}>Stumped</h3>
        </div>

        <div className="mb-4 flex gap-3">
          <button
            onClick={handleWideYes}
            className={`flex-1 py-3 ${primaryButtonClass}`}
          >
            Yes (Wide)
          </button>
          <button
            onClick={handleWideNo}
            className={`flex-1 py-3 ${secondaryButtonClass}`}
          >
            No
          </button>
        </div>

        <button
          onClick={handleBack}
          className={`w-full py-3 ${secondaryButtonClass}`}
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default StumpedDialog;
