'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog } from '@/app/lib/redux/slices/scorerSlice';
import { useState } from 'react';

export function MatchDetailsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch } = useSelector((state: RootState) => state.scorer);
  
  const [opponent, setOpponent] = useState(liveMatch?.opponent || '');
  const [totalOvers, setTotalOvers] = useState(liveMatch?.totalOvers?.toString() || '20');
  const [toss, setToss] = useState(liveMatch?.tossWonBy || 'Us');
  const [tossDec, setTossDec] = useState(liveMatch?.tossDecision || 'bat');
  const [venue, setVenue] = useState(liveMatch?.venue || 'Neutral');

  if (!liveMatch) return null;

  const handleSave = () => {
    // TODO: Dispatch action to update match details
    console.log('Updated match details:', { opponent, totalOvers, toss, tossDec, venue });
    dispatch(closeDialog());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 w-96 shadow-lg max-h-96 overflow-y-auto">
        <h2 className="text-lg font-bold text-white mb-4">Change Match Details</h2>

        <div className="space-y-3">
          {/* Opponent Team Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Opponent Team Name</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-teal-600"
              placeholder="e.g., Delhi"
            />
          </div>

          {/* Total Overs */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Total Overs</label>
            <input
              type="number"
              value={totalOvers}
              onChange={(e) => setTotalOvers(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-teal-600"
              placeholder="20"
              min="1"
            />
          </div>

          {/* Toss Won By */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Toss Won By</label>
            <select
              value={toss}
              onChange={(e) => setToss(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-teal-600"
            >
              <option value="Us">Us</option>
              <option value="Them">Them</option>
            </select>
          </div>

          {/* Toss Decision */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Toss Decision</label>
            <select
              value={tossDec}
              onChange={(e) => setTossDec(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-teal-600"
            >
              <option value="bat">Bat</option>
              <option value="field">Field</option>
            </select>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Venue</label>
            <select
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-teal-600"
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-semibold rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => dispatch(closeDialog())}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded transition-colors border border-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
