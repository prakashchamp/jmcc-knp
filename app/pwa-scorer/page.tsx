'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import { RootState, loadStateFromLocalStorage, store } from '@/app/lib/redux/store';
import { rehydrateTeam, setTeam } from '@/app/lib/redux/slices/teamSlice';
import { getPrimaryTeamFromIndexedDB } from '@/app/lib/indexed-db';
import { queueOfflineMatch, getPendingOfflineMatchIds } from '@/app/lib/pwa-offline';
import { MatchSetupForm } from '@/app/components/pwa/MatchSetupForm';
import { InningsSetupScreen } from '@/app/components/pwa/InningsSetupScreen';
import { LiveScorerPWA } from '@/app/components/pwa/LiveScorerPWA';
import { EndOfInningsScreen } from '@/app/components/pwa/EndOfInningsScreen';
import { MatchResultScreen } from '@/app/components/pwa/MatchResultScreen';
import { MatchSetupData, PWAMatch } from '@/app/lib/pwa-cricket-types';
import { BatsmanScorecard, BowlerScorecard, InningsScorecard } from '@/app/lib/pwa-cricket-types';

type ScreenType = 'splash' | 'match-setup' | 'innings-setup' | 'live-scoring' | 'end-of-innings' | 'match-result';

export default function PWAScorerPage() {
  const dispatch = useDispatch();
  const { team: abcTeam } = useSelector((state: RootState) => state.team);
  const [currentMatch, setCurrentMatch] = useState<PWAMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInningsData, setCurrentInningsData] = useState<InningsScorecard | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [triedRestoreState, setTriedRestoreState] = useState(false);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingScreen, setPendingScreen] = useState<ScreenType | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('match-setup');

  // Get team players
  const teamPlayers = abcTeam?.players || [];

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (!abcTeam && !triedRestoreState && typeof window !== 'undefined') {
      const restoreTeam = async () => {
        const savedState = loadStateFromLocalStorage();
        if (savedState?.team) {
          dispatch(rehydrateTeam(savedState.team));
          setTriedRestoreState(true);
          return;
        }

        const indexedTeam = await getPrimaryTeamFromIndexedDB();
        if (indexedTeam) {
          store.dispatch(setTeam({ team: indexedTeam, skipSync: true }));
        }
        setTriedRestoreState(true);

        // Load current match from localStorage
        const savedMatch = localStorage.getItem('pwa_current_match');
        if (savedMatch) {
          try {
            const match = JSON.parse(savedMatch);
            setCurrentMatch(match);
          } catch (error) {
            console.error('Failed to load saved match:', error);
            setPendingScreen('match-setup');
          }
        } else {
          setPendingScreen('match-setup');
        }
      };
      restoreTeam();
    }
  }, [abcTeam, dispatch, triedRestoreState]);

  useEffect(() => {
    setOfflinePendingCount(getPendingOfflineMatchIds().length);
  }, [isOnline]);

  // Save current match to localStorage
  useEffect(() => {
    if (currentMatch) {
      localStorage.setItem('pwa_current_match', JSON.stringify(currentMatch));
    } else {
      localStorage.removeItem('pwa_current_match');
    }
  }, [currentMatch]);

  // Set screen based on current match
  useEffect(() => {
    if (currentMatch) {
      if (currentMatch.matchCompleted) {
        setCurrentScreen('match-result');
      } else if (currentMatch.currentInnings === 2 && !currentMatch.inningsData.innings2) {
        setCurrentScreen('end-of-innings');
      } else if (currentMatch.inningsData.innings1 && !currentMatch.inningsData.innings1.batsmen.length) {
        setCurrentScreen('innings-setup');
      } else {
        setCurrentScreen('live-scoring');
        const inningsKey = currentMatch.currentInnings === 1 ? 'innings1' : 'innings2';
        const innings = currentMatch.inningsData[inningsKey as keyof typeof currentMatch.inningsData];
        if (innings) {
          setCurrentInningsData(innings);
        }
      }
    }
  }, [currentMatch]);

  // Set pending screen
  useEffect(() => {
    if (triedRestoreState && pendingScreen) {
      setCurrentScreen(pendingScreen);
      setPendingScreen(null);
    }
  }, [triedRestoreState, pendingScreen]);

  // Prevent page refresh during scoring
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentScreen === 'live-scoring') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen]);

  // Handle match setup form submission
  const handleMatchSetup = (setupData: MatchSetupData) => {
    setIsLoading(true);

    try {
      // Calculate who bats first
      const abcBatsFirst =
        (setupData.tossWonBy === 'ABC' && setupData.decision === 'bat') ||
        (setupData.tossWonBy === 'opponent' && setupData.decision === 'bowl');

      // Create match object
      const newMatch: PWAMatch = {
        id: `match_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        abcTeam: teamPlayers,
        opponentName: setupData.opponentName,
        venue: setupData.venue,
        tossWonBy: setupData.tossWonBy === 'ABC' ? 'ABC' : 'Opponent',
        decision: setupData.decision,
        oversPerMatch: setupData.oversPerMatch,
        currentInnings: 1,
        inningsData: {
          innings1: {
            inningsNumber: 1,
            battingTeam: abcBatsFirst ? 'ABC' : 'Opponent',
            totalRuns: 0,
            totalWickets: 0,
            totalOversPlayed: 0,
            batsmen: [],
            bowlers: [],
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
          },
        },
        maxOversPerBowler: Math.floor(setupData.oversPerMatch / 5),
        matchCompleted: false,
      };

      setCurrentMatch(newMatch);
      setCurrentScreen('innings-setup');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle innings setup submission
  const handleInningsSetup = (data: {
    striker: BatsmanScorecard;
    nonStriker: BatsmanScorecard;
    bowler: BowlerScorecard;
  }) => {
    setIsLoading(true);

    try {
      if (!currentMatch) return;

      const inningsKey = currentMatch.currentInnings === 1 ? 'innings1' : 'innings2';
      const innings = {
        ...currentMatch.inningsData[inningsKey as keyof typeof currentMatch.inningsData],
        batsmen: [data.striker, ...(data.nonStriker ? [data.nonStriker] : [])],
        bowlers: [data.bowler],
      } as InningsScorecard;

      // Update match with innings data
      const updatedMatch = {
        ...currentMatch,
        inningsData: {
          ...currentMatch.inningsData,
          [inningsKey]: innings,
        },
      };

      // If 2nd innings, set target
      if (currentMatch.currentInnings === 2) {
        innings.target = currentMatch.inningsData.innings1.totalRuns + 1;
      }

      setCurrentMatch(updatedMatch);
      setCurrentInningsData(innings);
      setCurrentScreen('live-scoring');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ball delivery
  const handleBallDelivery = (ballData: any) => {
    if (!currentMatch) return;

    if (ballData?.updatedInnings) {
      const updatedInnings: InningsScorecard = ballData.updatedInnings;
      const inningsKey = currentMatch.currentInnings === 1 ? 'innings1' : 'innings2';
      setCurrentInningsData(updatedInnings);
      setCurrentMatch((prev) =>
        prev
          ? {
              ...prev,
              inningsData: {
                ...prev.inningsData,
                [inningsKey]: updatedInnings,
              },
            }
          : prev
      );
    }
  };

  // Handle innings complete
  const handleInningsComplete = (finalInnings: InningsScorecard) => {
    if (!currentMatch) return;

    const inningsKey = currentMatch.currentInnings === 1 ? 'innings1' : 'innings2';
    const updatedMatch = {
      ...currentMatch,
      inningsData: {
        ...currentMatch.inningsData,
        [inningsKey]: finalInnings,
      },
    };

    setCurrentMatch(updatedMatch);
    setCurrentInningsData(finalInnings);

    if (currentMatch.currentInnings === 2) {
      const innings1 = updatedMatch.inningsData.innings1;
      const innings2 = finalInnings;

      let matchWinner: 'ABC' | 'Opponent' | 'Tie';
      let winningMargin: string;

      if (innings2.totalRuns > innings1.totalRuns) {
        matchWinner = innings2.battingTeam === 'ABC' ? 'ABC' : 'Opponent';
        winningMargin = `${innings2.totalRuns - innings1.totalRuns} runs`;
      } else if (innings1.totalRuns > innings2.totalRuns) {
        matchWinner = innings1.battingTeam === 'ABC' ? 'ABC' : 'Opponent';
        winningMargin = `${10 - innings2.totalWickets} wickets`;
      } else {
        matchWinner = 'Tie';
        winningMargin = 'Tie';
      }

      const completedMatch = {
        ...updatedMatch,
        matchCompleted: true,
        winner: matchWinner,
        winningMargin,
      };

      setCurrentMatch(completedMatch);
      setCurrentScreen('match-result');
      return;
    }

    updatedMatch.currentInnings = 2;
    updatedMatch.inningsData.innings2 = {
      inningsNumber: 2,
      battingTeam:
        currentMatch.inningsData.innings1.battingTeam === 'ABC' ? 'Opponent' : 'ABC',
      totalRuns: 0,
      totalWickets: 0,
      totalOversPlayed: 0,
      batsmen: [],
      bowlers: [],
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
      target: finalInnings.totalRuns + 1,
    };

    setCurrentMatch(updatedMatch);
    setCurrentInningsData(null);
    setCurrentScreen('end-of-innings');
  };

  // Handle match complete
  const handleNewMatch = () => {
    setCurrentMatch(null);
    setCurrentInningsData(null);
    setCurrentScreen('match-setup');
  };

  // Handle save match
  const handleSaveMatch = async () => {
    if (!currentMatch) return;

    setIsLoading(true);
    try {
      queueOfflineMatch(currentMatch);
      const pendingIds = getPendingOfflineMatchIds();
      setOfflinePendingCount(pendingIds.length);
      setSyncMessage(
        isOnline
          ? 'Match saved locally and queued for cloud sync.'
          : 'Offline save complete. Match queued for upload when back online.'
      );
    } catch (error) {
      console.error('Offline save failed:', error);
      setSyncMessage('Unable to save match locally. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render screens based on current state
  if (!abcTeam && triedRestoreState) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Team Found</h1>
          <p className="text-slate-400 mb-6">
            Please create ABC team first in team setup.
          </p>
          <a
            href="/team-setup"
            className="inline-block py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
          >
            Go to Team Setup
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentScreen === 'match-setup' && (
        <MatchSetupForm
          onSubmit={handleMatchSetup}
          isLoading={isLoading}
        />
      )}

      {currentScreen === 'innings-setup' && currentMatch && (
        <InningsSetupScreen
          inningsNumber={currentMatch.currentInnings as 1 | 2}
          abcBatsFirst={
            currentMatch.inningsData.innings1.battingTeam === 'ABC'
          }
          abcTeamPlayers={teamPlayers}
          onSubmit={handleInningsSetup}
          isLoading={isLoading}
        />
      )}

      {currentScreen === 'live-scoring' && currentMatch && currentInningsData && (
        <LiveScorerPWA
          innings={currentInningsData}
          abcBatsFirst={currentMatch.inningsData.innings1.battingTeam === 'ABC'}
          abcTeamPlayers={teamPlayers}
          oversPerMatch={currentMatch.oversPerMatch}
          onBallDelivery={handleBallDelivery}
          onInningsComplete={handleInningsComplete}
          isLoading={isLoading}
        />
      )}

      {currentScreen === 'end-of-innings' && currentMatch && (
        <EndOfInningsScreen
          innings={
            currentMatch.currentInnings === 1
              ? currentMatch.inningsData.innings1
              : currentMatch.inningsData.innings2!
          }
          isSecondInnings={currentMatch.currentInnings === 2}
          target={
            currentMatch.currentInnings === 2
              ? currentMatch.inningsData.innings2?.target
              : undefined
          }
          onContinue={() => {
            if (currentMatch.currentInnings === 1) {
              setCurrentScreen('innings-setup');
            } else {
              setCurrentScreen('match-result');
            }
          }}
          isLoading={isLoading}
        />
      )}

      {currentScreen === 'match-result' && currentMatch && (
        <MatchResultScreen
          match={currentMatch}
          onNewMatch={handleNewMatch}
          onSaveMatch={handleSaveMatch}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
