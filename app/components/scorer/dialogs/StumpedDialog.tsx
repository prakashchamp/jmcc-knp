'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { openDialog, closeDialog } from '@/app/lib/redux/slices/scorerSlice';

/**
 * Stumped Dialog Component
 * Asks whether the stumping was off a wide ball or not
 * 
 * Yes (Wide) → Routes to BatsmanSelectionModal with wide context
 * No (Not Wide) → Routes to BatsmanSelectionModal normally
 * Back → Returns to WicketDialog
 */
export function StumpedDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState } = useSelector((state: RootState) => state.scorer);

  if (dialogState.activeDialog !== 'stumped') {
    return null;
  }

  const handleWideYes = () => {
    dispatch(closeDialog());
    dispatch(openDialog({
      dialog: 'batsmanSelect',
      data: { dismissalMode: 'stumped', isWide: true },
    }));
  };

  const handleWideNo = () => {
    dispatch(closeDialog());
    dispatch(openDialog({
      dialog: 'batsmanSelect',
      data: { dismissalMode: 'stumped', isWide: false },
    }));
  };

  const handleBack = () => {
    dispatch(closeDialog());
    dispatch(openDialog({ dialog: 'wicket' }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-gray-700">
        <h3 className="text-lg font-bold text-center mb-4 text-red-400">STUMPED</h3>
        <p className="text-gray-300 text-center text-sm mb-6">Was it a wide ball?</p>

        {/* Yes/No buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleWideYes}
            className="flex-1 bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded transition-colors"
          >
            Yes (Wide)
          </button>
          <button
            onClick={handleWideNo}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded transition-colors"
          >
            No
          </button>
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );
}

export default StumpedDialog;
