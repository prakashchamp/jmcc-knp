'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import { DismissalMode } from '@/app/lib/cricket-scorer-types';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  sectionLabelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

/**
 * Wicket Dialog Component
 * Provides quick entry for common dismissals and access to special flows
 * 
 * Quick dismissals (single tap): Bowled, Caught, LBW, Hit Wicket
 * - Directly records 0-run ball + wicket + bowler stats
 * 
 * Other dismissals:
 *   - Stumped → StumpedDialog (wide ball inquiry)
 *   - Run Out → RunOutDialog (batsman selection)
 *   - Obstructing/Handling → RunOutDialog
 *   - Retired modes
 */
export function WicketDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (dialogState.activeDialog !== 'wicket') {
    return null;
  }

  // Quick dismissals - single button press to record
  const quickDismissals: Array<{
    mode: 'bowled' | 'caught' | 'lbw' | 'hit-wicket';
    label: string;
  }> = [
    { mode: 'bowled', label: 'Bowled' },
    { mode: 'caught', label: 'Caught' },
    { mode: 'lbw', label: 'LBW' },
    { mode: 'hit-wicket', label: 'Hit Wicket' },
  ];

  // Other dismissal modes requiring additional info
  const otherDismissals: Array<{
    mode: DismissalMode;
    label: string;
    needsSpecialFlow: boolean;
  }> = [
    { mode: 'stumped', label: 'Stumped', needsSpecialFlow: true },
    { mode: 'run-out', label: 'Run Out', needsSpecialFlow: true },
    { mode: 'retired-out', label: 'Retired Out', needsSpecialFlow: false },
    { mode: 'obstructing-field', label: 'Obstructing the field', needsSpecialFlow: true },
    { mode: 'handled-ball', label: 'Handling the ball', needsSpecialFlow: true },
  ];

  const handleQuickDismissal = (mode: 'bowled' | 'caught' | 'lbw' | 'hit-wicket') => {
    if (!currentInnings?.striker) return;

    dispatch(closeDialog());
    dispatch(
      openDialog({
        dialog: 'batsmanSelect',
        data: {
          dismissalMode: mode,
          outBatsmanId: currentInnings.striker.id,
          selectedBatsman: 'striker',
          recordOnSelect: true,
        },
      })
    );
  };

  const handleOtherDismissal = (mode: DismissalMode, needsSpecialFlow: boolean) => {
    if (mode === 'stumped') {
      dispatch(closeDialog());
      dispatch(openDialog({ dialog: 'stumped' }));
    } else if (mode === 'retired-out') {
      if (!currentInnings?.striker) return;

      dispatch(closeDialog());
      dispatch(
        openDialog({
          dialog: 'batsmanSelect',
          data: {
            dismissalMode: 'retired-out',
            outBatsmanId: currentInnings.striker.id,
            selectedBatsman: 'striker',
            recordOnSelect: true,
          },
        })
      );
    } else if (needsSpecialFlow) {
      dispatch(closeDialog());
      dispatch(openDialog({ dialog: 'runOut', data: { dismissalMode: mode } }));
    } else {
      dispatch(closeDialog());
      dispatch(openDialog({
        dialog: 'batsmanSelect',
        data: { dismissalMode: mode },
      }));
    }
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden`}>
        <div className="border-b border-slate-700 px-5 py-3 sm:px-6">
          <div className="mb-2">
            <p className={modalEyebrowClass}>Live Scorer</p>
            <h3 className={modalTitleClass}>Wicket</h3>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6">
          <div className="mb-5">
            <p className={sectionLabelClass}>Quick Entry</p>
            <div className="grid grid-cols-2 gap-2">
              {quickDismissals.map((item) => (
                <button
                  key={item.mode}
                  onClick={() => handleQuickDismissal(item.mode)}
                  className={`${primaryButtonClass} px-3 py-3 text-sm`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={sectionLabelClass}>Other Dismissals</p>
            <div className="space-y-2">
              {otherDismissals.map((item) => (
                <button
                  key={item.mode}
                  onClick={() => handleOtherDismissal(item.mode, item.needsSpecialFlow)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-left text-sm font-semibold text-white transition-all hover:border-slate-500 hover:bg-slate-700"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 px-5 py-4 sm:px-6">
          <button
            onClick={() => dispatch(closeDialog())}
            className={`w-full py-3 ${secondaryButtonClass}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default WicketDialog;
