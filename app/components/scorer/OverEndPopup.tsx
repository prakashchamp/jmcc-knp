'use client';

interface OverEndPopupProps {
  isOpen: boolean;
  overNumber: number;
  currentScore: number;
  totalRunsInOver: number;
  wicketsInOver: number;
  onClose: () => void;
}

/**
 * Over End Popup Component
 * Mobile-first design with light theme
 */
export function OverEndPopup({
  isOpen,
  overNumber,
  currentScore,
  totalRunsInOver,
  wicketsInOver,
  onClose,
}: OverEndPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg border-2 border-gray-300 p-6 max-w-sm w-full shadow-lg animate-in fade-in scale-95 duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Over {overNumber} Complete ✓</h2>
          <div className="w-12 h-1 bg-green-700 rounded-full mx-auto"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Current Score */}
          <div className="bg-gray-100 rounded border-2 border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-600 mb-1 font-semibold">Current Score</p>
            <p className="text-3xl font-bold text-gray-800">{currentScore}</p>
          </div>

          {/* Runs This Over */}
          <div className="bg-gray-100 rounded border-2 border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-600 mb-1 font-semibold">Runs This Over</p>
            <p className="text-3xl font-bold text-green-700">{totalRunsInOver}</p>
          </div>

          {/* Wickets This Over */}
          <div className="bg-gray-100 rounded border-2 border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-600 mb-1 font-semibold">Wickets Lost</p>
            <p className="text-3xl font-bold text-red-700">{wicketsInOver}</p>
          </div>

          {/* Over Data */}
          <div className="bg-gray-100 rounded border-2 border-gray-300 p-4 text-center">
            <p className="text-xs text-gray-600 mb-1 font-semibold">Over Number</p>
            <p className="text-3xl font-bold text-gray-800">{overNumber}</p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full px-6 py-3 bg-green-700 hover:bg-green-800 text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
        >
          Continue Scoring →
        </button>
      </div>

      {/* Background click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}
