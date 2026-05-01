'use client';

import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
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
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('splash');
  const [currentMatch, setCurrentMatch] = useState<PWAMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInningsData, setCurrentInningsData] = useState<InningsScorecard | null>(null);

  // Get team players
  const teamPlayers = abcTeam?.players || [];

  // Splash screen timeout
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('match-setup');
      }, 2000); // 2 seconds splash
      return () => clearTimeout(timer);
    }
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
    if (!currentMatch || !currentInningsData) return;

    // Update match innings with new data
    setCurrentInningsData({
      ...currentInningsData,
      // Updated batsmen/bowlers would be passed here
    });
  };

  // Handle innings complete
  const handleInningsComplete = () => {
    if (!currentMatch || !currentInningsData) return;

    const updatedMatch = {
      ...currentMatch,
      inningsData: {
        ...currentMatch.inningsData,
        [currentMatch.currentInnings === 1 ? 'innings1' : 'innings2']: currentInningsData,
      },
    };

    setCurrentMatch(updatedMatch);

    // Check if match is complete (2nd innings done)
    if (currentMatch.currentInnings === 2) {
      // Determine winner
      const innings1 = currentMatch.inningsData.innings1;
      const innings2 = currentInningsData;

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

      updatedMatch.matchCompleted = true;
      updatedMatch.winner = matchWinner;
      updatedMatch.winningMargin = winningMargin;

      setCurrentMatch(updatedMatch);
      setCurrentScreen('match-result');
    } else {
      // Move to 2nd innings
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
        target: currentInningsData.totalRuns + 1,
      };

      setCurrentMatch(updatedMatch);
      setCurrentInningsData(null);
      setCurrentScreen('end-of-innings');
    }
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

    // TODO: Save to localStorage or backend
    console.log('Saving match:', currentMatch);

    // For now, just simulate save
    return new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  };

  // Render screens based on current state
  if (currentScreen === 'splash') {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <img
            src="/jmcc.jpg"
            alt="JMCC Spartans"
            className="w-48 h-48 mx-auto mb-4 rounded-full object-cover"
          />
          <h1 className="text-white text-2xl font-bold">JMCC Spartans</h1>
          <p className="text-gray-400 mt-2">Cricket Scorer</p>
        </div>
      </div>
    );
  }

  if (!abcTeam) {
    return (
      <div className="h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Team Found</h1>
          <p className="text-slate-400 mb-6">
            Please create ABC team first in team setup
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
