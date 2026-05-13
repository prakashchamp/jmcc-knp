'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { closeDialog, completeOver, undoLastDelivery } from '@/app/lib/redux/slices/scorerSlice';
import { addNewPlayerToTeamAndMatch } from '@/app/lib/redux/thunks/matchThunks';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';
import { useTeamName } from '@/app/lib/hooks/useTeamName';
import { BowlerDropdownSelect } from './BowlerDropdownSelect';
import {
  infoCardClass,
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  primaryButtonClass,
  secondaryButtonClass,
} from './dialogTheme';

export function OverEndPopup() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  
  if (!currentInnings || !liveMatch) return null;

  const completedOverNumber = Math.ceil(currentInnings.totalBalls / 6);
  const completedOverIndex = Math.max(0, completedOverNumber - 1);
  const firstInningsRuns = liveMatch.innings?.[0]?.totalRuns ?? 0;
  const target = currentInnings.target ?? (currentInnings.inningsNumber === 2 ? firstInningsRuns + 1 : undefined);
  const runsRequired = currentInnings.inningsNumber === 2 && typeof target === 'number'
    ? Math.max(0, target - currentInnings.totalRuns)
    : 0;
  const ballsRemaining = Math.max(0, (liveMatch.totalOvers * 6) - currentInnings.totalBalls);

  const completedOverBalls = currentInnings.ballHistory.filter(
    (b) => b.over === completedOverIndex
  );
  const totalRunsInPreviousOver = completedOverBalls.reduce(
    (sum, ball) => sum + (ball.runs.total || 0),
    0
  );

  let previousBowler: TeamPlayer | null = null;
  if (completedOverBalls.length > 0) {
    const lastBowlerData = completedOverBalls[0]?.bowler;
    if (lastBowlerData) {
      previousBowler = {
        id: lastBowlerData.id,
        name: lastBowlerData.name,
      };
    }
  }

  // Pre-populate the selected bowler based on rotation logic
  const getInitialBowler = (): TeamPlayer | null => {
    if (currentInnings.battingTeam === 'Us' && previousBowler) {
      const match = previousBowler.id.match(/opp-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 5) {
          const nextIndex = num % 5;
          return OPPONENT_TEAM_PLAYERS[nextIndex];
        }
      }
    }
    return null;
  };

  const [selectedBowler, setSelectedBowler] = useState<TeamPlayer | null>(getInitialBowler);
  const [newBowlerName, setNewBowlerName] = useState('');

  const teamName = useTeamName();

  const bowlingTeamPlayers = currentInnings.battingTeam === 'Us'
    ? OPPONENT_TEAM_PLAYERS
    : liveMatch.teamPlayers;

  const excludedBowlerIds = previousBowler
    ? bowlingTeamPlayers
        .filter((player) => player.id === previousBowler?.id || player.name === previousBowler?.name)
        .map((player) => player.id)
    : [];

  const handleContinue = () => {
    if (!selectedBowler) {
      alert('Please select a bowler');
      return;
    }

    dispatch(completeOver({
      bowlerId: selectedBowler.id,
      bowlerName: selectedBowler.name,
      isBatsmanSwapped: true,
    }));
    dispatch(closeDialog());
  };

  const handleUndo = () => {
    dispatch(undoLastDelivery());
    dispatch(closeDialog());
  };

  const handleCreateNewBowler = async (name: string) => {
    // Add the new player to the team and sync
    const result = await dispatch(addNewPlayerToTeamAndMatch({ name: name.trim() })).unwrap();
    setSelectedBowler(result);
    setNewBowlerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6 text-foreground`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Next Over</h2>
        </div>
        
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between rounded-xl border-2 border-green-500 bg-green-500/10 p-3 shadow-sm">
            <span className="font-black text-foreground">{currentInnings.battingTeam === 'Us' ? teamName : liveMatch.opponent}</span>
            <div className="text-center leading-tight text-foreground">
              <div className="text-xl font-black">{currentInnings.totalRuns}/{currentInnings.totalWickets}</div>
              <div className="text-[10px] font-bold opacity-60 uppercase tracking-tighter">({Math.floor(currentInnings.totalBalls / 6)}.{currentInnings.totalBalls % 6} / {liveMatch.totalOvers}.0)</div>
            </div>
          </div>
          <div className={`${infoCardClass} flex items-center justify-between border-2`}>
            <span className="font-bold opacity-70">Last Over Runs:</span>
            <span className="font-black text-lg">{totalRunsInPreviousOver}</span>
          </div>
          {currentInnings.inningsNumber === 2 && (
            <div className={`${infoCardClass} space-y-2 border-2`}>
              <div className="flex justify-between items-center">
                <span className="font-bold opacity-70">Runs Required:</span>
                <span className="font-black text-lg text-green-600">{runsRequired}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold opacity-70">Balls Remaining:</span>
                <span className="font-black text-lg">{ballsRemaining}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <BowlerDropdownSelect
            label="Next Bowler"
            placeholder="Select bowler"
            selectedBowler={selectedBowler}
            bowlers={bowlingTeamPlayers}
            excludeIds={excludedBowlerIds}
            onSelect={setSelectedBowler}
            previousBowlerId={previousBowler?.id}
            allowNew={true}
            newPlayerName={newBowlerName}
            onNewPlayerNameChange={setNewBowlerName}
            onCreateNew={handleCreateNewBowler}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            className={`flex-1 px-4 py-2.5 ${secondaryButtonClass}`}
          >
            Undo Last Ball
          </button>
          <button
            onClick={handleContinue}
            className={`flex-1 px-4 py-2.5 ${primaryButtonClass} disabled:cursor-not-allowed disabled:bg-slate-700`}
            disabled={!selectedBowler}
          >
            Next Over
          </button>
        </div>
      </div>
    </div>
  );
}
