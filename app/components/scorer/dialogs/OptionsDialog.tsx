'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, openDialog } from '@/app/lib/redux/slices/scorerSlice';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function OptionsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!liveMatch || !currentInnings) return null;

  // Helper functions to determine if options are allowed
  const canChangeBatsman = () => {
    // Allowed at beginning of innings or after wicket on last ball
    if (currentInnings.totalBalls === 0) return true;

    // Check if last ball was a wicket
    if (currentInnings.ballHistory && currentInnings.ballHistory.length > 0) {
      const lastBall = currentInnings.ballHistory[currentInnings.ballHistory.length - 1];
      return Boolean(lastBall.isWicket || lastBall.dismissal);
    }
    return false;
  };

  const canChangeBowler = () => {
    // Enable at start of every new over (overs 0.0, 1.0, 2.0, etc.)
    // Disable as soon as a ball is bowled in the current over
    // ballsInCurrentOver will be 0 at start of over, 1-5 during the over
    const ballsInCurrentOver = currentInnings.totalBalls % 6;
    return ballsInCurrentOver === 0;
  };

  const canBowlerRetiredHurt = () => {
    // Bowler has started over but not completed 6 legal balls
    const ballsInCurrentOver = currentInnings.totalBalls % 6;
    return ballsInCurrentOver > 0 && ballsInCurrentOver < 6;
  };

  const canBatsmanRetiredHurt = () => {
    // Played 1+ balls and not gotten out
    if (!currentInnings.ballHistory || currentInnings.ballHistory.length === 0) return false;

    // Check if last ball was wicket
    const lastBall = currentInnings.ballHistory[currentInnings.ballHistory.length - 1];
    if (Boolean(lastBall.isWicket || lastBall.dismissal)) return false;

    // Check if current batsman has played at least 1 ball
    return true;
  };

  const options = [
    {
      label: 'Change Batsman',
      action: 'changeBatsman',
      enabled: canChangeBatsman(),
      tooltip: 'Only allowed at start of innings or after wicket'
    },
    {
      label: 'Change Bowler',
      action: 'changeBowler',
      enabled: canChangeBowler(),
      tooltip: 'Only allowed at start of new over before any ball is bowled'
    },
    {
      label: 'Bowler Retired Hurt',
      action: 'bowlerRetiredHurt',
      enabled: canBowlerRetiredHurt(),
      tooltip: 'Only during an incomplete over'
    },
    {
      label: 'Batsman Retired Hurt',
      action: 'batsmanRetiredHurt',
      enabled: canBatsmanRetiredHurt(),
      tooltip: 'Only if batsman is in and has faced balls'
    },
    {
      label: 'Change Match details',
      action: 'changeMatchDetails',
      enabled: true,
      tooltip: ''
    },
    {
      label: 'Complete This Match',
      action: 'startNewMatch',
      enabled: true,
      tooltip: ''
    },
  ];

  const handleOptionClick = (action: string, enabled: boolean) => {
    if (!enabled) return;

    switch (action) {
      case 'changeBatsman':
        dispatch(openDialog({ dialog: 'newBatsman' }));
        break;
      case 'changeBowler':
        dispatch(openDialog({ dialog: 'newBowler' }));
        break;
      case 'bowlerRetiredHurt':
        dispatch(openDialog({ dialog: 'bowlerRetired' }));
        break;
      case 'batsmanRetiredHurt':
        dispatch(openDialog({ dialog: 'batsmanRetired' }));
        break;
      case 'changeMatchDetails':
        dispatch(openDialog({ dialog: 'matchDetails' }));
        break;
      case 'startNewMatch':
        dispatch(openDialog({ dialog: 'startNewMatchConfirm' }));
        break;
    }
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Options</h2>
        </div>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.action}
              onClick={() => handleOptionClick(option.action, option.enabled)}
              disabled={!option.enabled}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-black transition-all ${
                option.enabled
                  ? 'border-border bg-background text-foreground hover:border-blue-500 hover:bg-blue-600/5 hover:scale-[1.01] active:scale-[0.98]'
                  : 'cursor-not-allowed border-border/50 bg-background/50 text-foreground/30 opacity-40'
              }`}
            >
              <div>{option.label}</div>
            </button>
          ))}
        </div>

        <button
          onClick={() => dispatch(closeDialog())}
          className={`mt-4 w-full px-4 py-2.5 text-sm ${secondaryButtonClass}`}
        >
          Close
        </button>
      </div>
    </div>
  );
}
