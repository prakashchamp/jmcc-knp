'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, openDialog } from '@/app/lib/redux/slices/scorerSlice';
import { useState } from 'react';

export function OptionsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { dialogState, liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  if (!liveMatch || !currentInnings) return null;

  // Helper functions to determine if options are allowed
  const canChangeBatsman = () => {
    // Allowed at beginning of innings or after wicket on last ball
    if (currentInnings.totalBalls === 0) return true; // Beginning of innings
    
    // Check if last ball was a wicket
    if (currentInnings.ballHistory && currentInnings.ballHistory.length > 0) {
      const lastBall = currentInnings.ballHistory[currentInnings.ballHistory.length - 1];
      return lastBall.isWicket || lastBall.dismissal;
    }
    return false;
  };

  const canChangeBowler = () => {
    // Only at start of new over (totalBalls divisible by 6)
    return currentInnings.totalBalls % 6 === 0 && currentInnings.totalBalls > 0;
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
    if (lastBall.isWicket || lastBall.dismissal) return false;
    
    // Check if current batsman has played at least 1 ball
    return true; // If they're still at crease and innings has balls
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
      tooltip: 'Only allowed at start of new over'
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
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-80 shadow-lg">
        <h2 className="text-lg font-bold text-white mb-4">Options</h2>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.action}
              onClick={() => handleOptionClick(option.action, option.enabled)}
              disabled={!option.enabled}
              title={option.tooltip}
              className={`w-full px-4 py-2 text-sm font-semibold rounded transition-colors text-left ${
                option.enabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white cursor-pointer'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => dispatch(closeDialog())}
          className="w-full mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded transition-colors border border-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
