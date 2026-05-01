'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
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
  
  const liveMatch = useSelector((state: RootState) => state.scorer.liveMatch);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states for overrides
  const [date, setDate] = useState(liveMatch?.completedAt || new Date().toISOString());
  const [opponent, setOpponent] = useState(liveMatch?.opponent || '');
  const [tossWonBy, setTossWonBy] = useState(liveMatch?.tossWonBy || 'Us');
  const [winMargin, setWinMargin] = useState(liveMatch?.winMargin || '');
  
  // Calculate first innings defaults
  const firstInnings = liveMatch?.innings.find(i => i.inningsNumber === 1);
  const defaultFirstInningsTeam = firstInnings?.battingTeam === 'Us' ? teamName : opponent;
  const defaultFirstInningsScore = firstInnings?.totalRuns || 0;
  
  const [firstInningsTeam, setFirstInningsTeam] = useState(defaultFirstInningsTeam);
  const [firstInningsScore, setFirstInningsScore] = useState(defaultFirstInningsScore);

  const handleConfirm = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const overrides = {
        date,
        opponent,
        tossWonBy,
        winMargin,
        firstInningsTeam,
        firstInningsScore
      };

      const resultAction = await dispatch(uploadMatchToFirestore(overrides));
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
      <div className={`${modalPanelClass} w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Cloud Sync</p>
          <h2 className={modalTitleClass}>Upload to Firestore?</h2>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-sm text-slate-400">
            {success 
              ? `Successfully uploaded match data and ${teamName} player performances.` 
              : `Review and confirm match details before uploading.`}
          </p>

          {!success && (
            <div className="space-y-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Match Date</label>
                <input
                  type="date"
                  value={date.split('T')[0]}
                  onChange={(e) => setDate(new Date(e.target.value).toISOString())}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Opponent</label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Toss Won By</label>
                  <select
                    value={tossWonBy}
                    onChange={(e) => setTossWonBy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Us">Us</option>
                    <option value="Them">Them</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">1st Innings Team</label>
                  <input
                    type="text"
                    value={firstInningsTeam}
                    onChange={(e) => setFirstInningsTeam(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">1st Innings Score</label>
                  <input
                    type="number"
                    value={firstInningsScore}
                    onChange={(e) => setFirstInningsScore(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Win Margin</label>
                <input
                  type="text"
                  value={winMargin}
                  onChange={(e) => setWinMargin(e.target.value)}
                  placeholder="e.g. 24 runs, 5 wickets"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          )}
          
          {error && (
            <p className="mt-3 text-sm text-red-400 bg-red-950/30 p-2 rounded border border-red-500/20">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-4">
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
