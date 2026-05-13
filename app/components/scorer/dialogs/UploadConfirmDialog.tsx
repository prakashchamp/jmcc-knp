'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { DatePickerField } from '@/app/components/DatePickerField';
import { closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import { uploadMatchToFirestore } from '@/app/lib/redux/thunks/matchUpload';
import { CustomSelect } from '@/app/components/CustomSelect';
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
  const [venue, setVenue] = useState<'Home' | 'Away' | 'Neutral'>(liveMatch?.venue as any || 'Neutral');
  const [tossWonBy, setTossWonBy] = useState<'Us' | 'Them'>(liveMatch?.tossWonBy || 'Us');
  const [result, setResult] = useState<'won' | 'lost' | 'tie' | 'no_result' | 'abandoned'>(liveMatch?.result as any || 'won');
  
  const [teamRuns, setTeamRuns] = useState(liveMatch?.innings.reduce((acc, i) => i.battingTeam === 'Us' ? acc + i.totalRuns : acc, 0) || 0);
  const [teamWickets, setTeamWickets] = useState(liveMatch?.innings.reduce((acc, i) => i.battingTeam === 'Us' ? acc + i.totalWickets : acc, 0) || 0);
  const [opponentRuns, setOpponentRuns] = useState(liveMatch?.innings.reduce((acc, i) => i.battingTeam === 'Them' ? acc + i.totalRuns : acc, 0) || 0);
  const [opponentWickets, setOpponentWickets] = useState(liveMatch?.innings.reduce((acc, i) => i.battingTeam === 'Them' ? acc + i.totalWickets : acc, 0) || 0);

  const [winMarginValue, setWinMarginValue] = useState<string>(() => {
    const margin = (liveMatch?.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)/);
    return parsed?.[1] ?? '';
  });

  const [winMarginUnit, setWinMarginUnit] = useState<'runs' | 'wickets'>(() => {
    const margin = (liveMatch?.winMargin || '').trim();
    const parsed = margin.match(/(runs|wickets)$/i);
    return (parsed?.[1]?.toLowerCase() as 'runs' | 'wickets') || 'runs';
  });
  
  // Auto-calculate result and win margin
  useEffect(() => {
    if (teamRuns === 0 && opponentRuns === 0) return;

    const firstInnings = liveMatch?.innings.find(i => i.inningsNumber === 1);
    const battedFirst = firstInnings?.battingTeam; // 'Us' or 'Them'

    if (teamRuns > opponentRuns) {
      setResult('won');
      if (battedFirst === 'Us') {
        setWinMarginValue((teamRuns - opponentRuns).toString());
        setWinMarginUnit('runs');
      } else {
        setWinMarginValue((10 - teamWickets).toString());
        setWinMarginUnit('wickets');
      }
    } else if (opponentRuns > teamRuns) {
      setResult('lost');
      if (battedFirst === 'Them') {
        setWinMarginValue((opponentRuns - teamRuns).toString());
        setWinMarginUnit('runs');
      } else {
        setWinMarginValue((10 - opponentWickets).toString());
        setWinMarginUnit('wickets');
      }
    } else if (teamRuns === opponentRuns && teamRuns > 0) {
      setResult('tie');
      setWinMarginValue('0');
      setWinMarginUnit('runs');
    }
  }, [teamRuns, opponentRuns, teamWickets, opponentWickets, liveMatch]);

  const handleConfirm = async () => {
    setIsUploading(true);
    setError(null);
    try {
      const overrides = {
        date,
        opponent,
        venue,
        tossWonBy,
        result,
        winMargin: winMarginValue ? `${winMarginValue} ${winMarginUnit}` : '',
        teamRuns,
        teamWickets,
        opponentRuns,
        opponentWickets,
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

        <div className="mb-6 space-y-5">
          <p className="text-sm text-slate-400">
            {success 
              ? `Successfully uploaded match data and ${teamName} player performances.` 
              : `Review and confirm match details before uploading.`}
          </p>

          {!success && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DatePickerField
                    id="upload-match-date"
                    label="Match Date"
                    value={date}
                    onChange={(value) => setDate(value || new Date().toISOString())}
                    className="input-base py-2 text-sm"
                  />
                </div>
                
                <div>
                  <label className="label-text mb-1.5 block">Opponent</label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(e) => setOpponent(e.target.value)}
                    className="input-base py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <CustomSelect
                    id="upload-venue"
                    label="Venue"
                    value={venue}
                    options={[
                      { value: 'Home', label: 'Home' },
                      { value: 'Away', label: 'Away' },
                      { value: 'Neutral', label: 'Neutral' },
                    ]}
                    onChange={(value) => setVenue(value as any)}
                    className="max-w-full"
                  />
                </div>
                <div>
                  <CustomSelect
                    id="upload-toss-won-by"
                    label="Toss Won By"
                    value={tossWonBy}
                    options={[
                      { value: 'Us', label: 'Us' },
                      { value: 'Them', label: 'Them' },
                    ]}
                    onChange={(value) => setTossWonBy(value as 'Us' | 'Them')}
                    className="max-w-full"
                  />
                </div>
              </div>

              <div>
                <label className="label-text mb-1.5 block">Match Result</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'won', label: 'Win' },
                    { val: 'lost', label: 'Loss' },
                    { val: 'tie', label: 'Tie' },
                    { val: 'no_result', label: 'N/R' },
                  ].map((res) => (
                    <button
                      key={res.val}
                      type="button"
                      onClick={() => setResult(res.val as any)}
                      className={`flex-1 py-2 px-2 rounded-lg font-bold text-xs transition-all border ${
                        result === res.val
                          ? 'bg-green-600 border-green-600 text-white shadow-md shadow-green-500/20'
                          : 'bg-card border-border hover:bg-foreground/5'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label-text mb-1.5 block">Team Runs</label>
                    <input
                      type="number"
                      value={teamRuns}
                      onChange={(e) => setTeamRuns(parseInt(e.target.value) || 0)}
                      className="input-base py-2 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Wkts</label>
                    <input
                      type="number"
                      value={teamWickets}
                      onChange={(e) => setTeamWickets(parseInt(e.target.value) || 0)}
                      className="input-base py-2 text-sm text-center"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label-text mb-1.5 block">Opp Runs</label>
                    <input
                      type="number"
                      value={opponentRuns}
                      onChange={(e) => setOpponentRuns(parseInt(e.target.value) || 0)}
                      className="input-base py-2 text-sm text-center"
                    />
                  </div>
                  <div>
                    <label className="label-text mb-1.5 block">Wkts</label>
                    <input
                      type="number"
                      value={opponentWickets}
                      onChange={(e) => setOpponentWickets(parseInt(e.target.value) || 0)}
                      className="input-base py-2 text-sm text-center"
                    />
                  </div>
                </div>
              </div>



              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-text mb-1.5 block">Win Margin</label>
                  <input
                    type="number"
                    value={winMarginValue}
                    onChange={(e) => setWinMarginValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    className="input-base py-2 text-sm"
                  />
                </div>
                <div>
                  <CustomSelect
                    id="upload-margin-type"
                    label="Margin Type"
                    value={winMarginUnit}
                    options={[
                      { value: 'runs', label: 'Runs' },
                      { value: 'wickets', label: 'Wickets' },
                    ]}
                    onChange={(value) => setWinMarginUnit(value as 'runs' | 'wickets')}
                    className="max-w-full"
                  />
                </div>
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
