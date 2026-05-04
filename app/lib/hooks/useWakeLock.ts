'use client';

import { useEffect, useRef } from 'react';

/**
 * Hook to prevent screen from auto-locking using the Screen Wake Lock API.
 * Only works in secure contexts (HTTPS) and supported browsers.
 * 
 * @param enabled - Whether to request the wake lock
 */
export function useWakeLock(enabled: boolean = true) {
  // Use 'any' for wakeLock sentinel since types might not be in the environment yet
  const wakeLock = useRef<any>(null);

  useEffect(() => {
    // Only run on client and if enabled
    if (!enabled || typeof window === 'undefined' || !('wakeLock' in navigator)) return;

    const requestWakeLock = async () => {
      try {
        // Only request if not already held
        if (!wakeLock.current) {
          wakeLock.current = await (navigator as any).wakeLock.request('screen');
          
          // Re-request if the lock is released by the system (e.g. low battery)
          wakeLock.current.addEventListener('release', () => {
            console.log('⚠ Wake Lock was released');
            wakeLock.current = null;
          });
          
          console.log('✓ Wake Lock active');
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    };

    // Initial request
    requestWakeLock();

    // Re-request when tab becomes visible again (locks are released when hidden)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: release lock
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current) {
        wakeLock.current.release()
          .then(() => {
            wakeLock.current = null;
            console.log('✓ Wake Lock released');
          })
          .catch((err: Error) => console.error('Error releasing wake lock:', err));
      }
    };
  }, [enabled]);
}
