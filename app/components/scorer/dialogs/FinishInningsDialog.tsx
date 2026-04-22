'use client';

import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { completeMatchAfterFirstInnings, startSecondInnings } from '@/app/lib/redux/slices/scorerSlice';
import {
  infoCardClass,
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

export function FinishInningsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings, dialogState } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch || !currentInnings || dialogState.activeDialog !== 'finishInnings') {
    return null;
  }

  const oversText = `${Math.floor(currentInnings.totalBalls / 6)}.${currentInnings.totalBalls % 6}`;
  const ballExtras = currentInnings.ballHistory.reduce((sum, ball) => sum + (ball.runs.extras || 0), 0);
  const totalExtras = ballExtras + (currentInnings.penaltyExtras || 0);
  const battingTeamName = currentInnings.battingTeam === 'Us' ? 'JMCC' : liveMatch.opponent;

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6 text-white`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Innings Complete</h2>
        </div>

        <div className={`${infoCardClass} mb-4 space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Batting Team</span>
            <span className="font-semibold text-white">{battingTeamName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Score</span>
            <span className="font-semibold text-white">{currentInnings.totalRuns}/{currentInnings.totalWickets}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Overs</span>
            <span className="font-semibold text-white">{oversText} / {liveMatch.totalOvers}.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Extras</span>
            <span className="font-semibold text-white">{totalExtras}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            onClick={() => dispatch(startSecondInnings())}
            className={`w-full px-4 py-2.5 ${primaryButtonClass}`}
          >
            Start Second Innings
          </button>
          <button
            onClick={() => dispatch(completeMatchAfterFirstInnings())}
            className={`w-full px-4 py-2.5 ${secondaryButtonClass}`}
          >
            Complete This Match
          </button>
        </div>
      </div>
    </div>
  );
}

export default FinishInningsDialog;
