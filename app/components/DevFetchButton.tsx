'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { triggerFetch } from '@/app/lib/redux/slices/devSlice';
import { useState } from 'react';

/**
 * DevFetchButton Component
 * A floating button to manually trigger Firestore fetches in development mode
 */
export function DevFetchButton() {
  const dispatch = useDispatch();
  const { isManualFetchMode } = useSelector((state: RootState) => state.dev);
  const [isRotating, setIsRotating] = useState(false);

  if (!isManualFetchMode) return null;

  const handleFetch = () => {
    setIsRotating(true);
    dispatch(triggerFetch());
    
    // Stop rotation after 1 second
    setTimeout(() => {
      setIsRotating(false);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <button
        onClick={handleFetch}
        className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all hover:bg-blue-500 hover:scale-110 active:scale-95 ${
          isRotating ? 'ring-4 ring-blue-400' : ''
        }`}
        title="Manual Firestore Fetch"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-7 w-7 transition-transform duration-700 ${isRotating ? 'rotate-[360deg]' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        
        {/* Tooltip */}
        <span className="absolute -top-10 right-0 hidden whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">
          Fetch from Firestore
        </span>
      </button>
    </div>
  );
}
