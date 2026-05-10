'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { calcEconomy } from '@/app/lib/bowling-stats-utils';

/**
 * Bowler Display Component
 * Shows current bowler stats: Overs, Runs, Wickets, Maidens, Economy
 */
export function BowlerDisplay() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings || !currentInnings.currentBowler) {
    return (
      <div className="bg-white p-4">
        <p className="text-sm text-gray-600">No bowler assigned</p>
      </div>
    );
  }

  const bowler = currentInnings.currentBowler;

  return (
    <div className="bg-white p-4 border-t">
      {/* Header */}
      <div className="text-xs font-bold text-gray-700 mb-2">BOWLER</div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-2 p-2 bg-gray-50 rounded text-sm">
        <div className="text-center">
          <div className="text-xs text-gray-600">O</div>
          <div className="font-bold">{bowler.overs}.{bowler.balls}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600">R</div>
          <div className="font-bold">{bowler.runs}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600">W</div>
          <div className="font-bold">{bowler.wickets}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-600">M</div>
          <div className="font-bold">{bowler.maidens}</div>
        </div>
        <div className="text-center col-span-2">
          <div className="text-xs text-gray-600">ECO</div>
          <div className="font-bold">{calcEconomy(bowler.runs, (bowler.overs * 6) + bowler.balls).toFixed(2)}</div>
        </div>
      </div>

      {/* Bowler Name */}
      <div className="mt-2 text-sm">
        <span className="text-gray-700 font-semibold">{bowler.name}</span>
      </div>
    </div>
  );
}

export default BowlerDisplay;
