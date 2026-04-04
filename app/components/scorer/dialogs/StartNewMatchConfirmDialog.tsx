'use client';

import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, clearMatch } from '@/app/lib/redux/slices/scorerSlice';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-80 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Complete This Match?</h2>
        
        <p className="text-sm text-gray-300 mb-6">
          Are you sure you want to complete this match? You'll return to the match selection screen.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded transition-colors"
          >
            Complete Match
          </button>
        </div>
      </div>
    </div>
  );
}
