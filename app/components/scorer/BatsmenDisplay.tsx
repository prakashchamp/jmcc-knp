'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';

/**
 * Batsmen Display Component
 * Shows striker and non-striker with their stats
 * Striker marked with asterisk (*)
 * Displays zeros, fours, sixes, and strike rate under each batsman name
 */
export function BatsmenDisplay() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  /**
   * Calculate number of zero-run balls (dots) faced by a batsman
   */
  const calculateZeros = (batterId: string): number => {
    if (!currentInnings?.ballHistory) return 0;
    return currentInnings.ballHistory.filter(
      (ball) => ball.batter.id === batterId && ball.runs.batter === 0
    ).length;
  };

  if (!currentInnings) {
    return (
      <div className="bg-white p-4">
        <p className="text-sm text-gray-600">No batsmen available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 space-y-3">
      {/* Striker Card */}
      {currentInnings.striker && (
        <div className="p-3 bg-teal-100 rounded-lg border-2 border-teal-300">
          <div className="font-bold text-lg mb-2">
            {currentInnings.striker.name} <span className="text-teal-600 text-xl">*</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <div className="text-gray-600 text-xs">0s</div>
              <div className="font-bold text-lg">{calculateZeros(currentInnings.striker.id)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">4s</div>
              <div className="font-bold text-lg">{currentInnings.striker.fours}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">6s</div>
              <div className="font-bold text-lg">{currentInnings.striker.sixes}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">SR</div>
              <div className="font-bold text-lg">{currentInnings.striker.strikeRate.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Non-Striker Card */}
      {currentInnings.nonStriker && (
        <div className="p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
          <div className="font-bold text-lg mb-2">
            {currentInnings.nonStriker.name}
          </div>
          <div className="grid grid-cols-4 gap-2 text-sm">
            <div>
              <div className="text-gray-600 text-xs">0s</div>
              <div className="font-bold text-lg">{calculateZeros(currentInnings.nonStriker.id)}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">4s</div>
              <div className="font-bold text-lg">{currentInnings.nonStriker.fours}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">6s</div>
              <div className="font-bold text-lg">{currentInnings.nonStriker.sixes}</div>
            </div>
            <div>
              <div className="text-gray-600 text-xs">SR</div>
              <div className="font-bold text-lg">{currentInnings.nonStriker.strikeRate.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BatsmenDisplay;
