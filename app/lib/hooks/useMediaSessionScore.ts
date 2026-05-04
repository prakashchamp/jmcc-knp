'use client';

import { useEffect } from 'react';
import { LiveMatch, InningsState } from '../cricket-scorer-types';

/**
 * Hook to show live score on the lock screen using the Media Session API.
 * 
 * @param match - Current live match data
 * @param innings - Current innings data
 */
export function useMediaSessionScore(match: LiveMatch | null, innings: InningsState | null) {
  useEffect(() => {
    if (!match || !innings || typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const updateMetadata = () => {
      const score = `${innings.totalRuns}/${innings.totalWickets}`;
      const overs = `(${Math.floor(innings.totalBalls / 6)}.${innings.totalBalls % 6} ov)`;
      const matchName = `vs ${match.opponent}`;
      
      // Calculate CRR
      const totalOversPlayed = innings.totalBalls / 6;
      const crr = totalOversPlayed > 0 ? (innings.totalRuns / totalOversPlayed).toFixed(2) : '0.00';

      (navigator as any).mediaSession.metadata = new MediaMetadata({
        title: `${score} ${overs}`,
        artist: matchName,
        album: `CRR: ${crr} | ${match.venue || 'Live'}`,
        artwork: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
    };

    updateMetadata();

    // Small hack to keep media session active:
    // Some browsers need actual media playing to keep metadata on lock screen.
    // We don't play audio here to avoid user annoyance, but metadata might stick for a while.
    
  }, [match, innings?.totalRuns, innings?.totalWickets, innings?.totalBalls]);
}
