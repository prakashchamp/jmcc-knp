'use client';

import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/app/lib/redux/store';
import { closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import { uploadMatchToFirestore } from '@/app/lib/redux/thunks/matchUpload';
import {
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

import { useTeamName } from '@/app/lib/hooks/useTeamName';

export function UploadConfirmDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const teamName = useTeamName();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirm = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const resultAction = await dispatch(uploadMatchToFirestore());
      if (uploadMatchToFirestore.fulfilled.match(resultAction)) {
        setSuccess(true);
        setTimeout(() => {
          dispatch(closeDialog());
        }, 1500);
      } else {
        setError(resultAction.payload as string || 'Upload failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    if (!isUploading) {
      dispatch(closeDialog());
    }
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-sm p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Cloud Sync</p>
          <h2 className={modalTitleClass}>Upload to Firestore?</h2>
        </div>

        <div className="mb-6">
          <p className="text-sm text-slate-400">
            {success 
              ? `Successfully uploaded match data and ${teamName} player performances.` 
              : `This will save the match results and ${teamName} player statistics to the cloud database.`}
          </p>
          
          {error && (
            <p className="mt-3 text-sm text-red-400 bg-red-950/30 p-2 rounded border border-red-500/20">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          {!success && (
            <>
              <button
                onClick={handleCancel}
                disabled={isUploading}
                className={`flex-1 px-4 py-2.5 text-sm ${secondaryButtonClass} disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isUploading}
                className={`flex-1 px-4 py-2.5 text-sm rounded-lg bg-emerald-600 font-semibold text-white shadow-lg transition-all hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : 'Confirm Upload'}
              </button>
            </>
          )}
          
          {success && (
            <div className="w-full text-center py-2 text-emerald-400 font-bold flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Upload Complete!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
