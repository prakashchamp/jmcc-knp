'use client';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, replaceBatsman } from '@/app/lib/redux/slices/scorerSlice';
import { addNewPlayerToTeamAndMatch } from '@/app/lib/redux/thunks/matchThunks';
import { CricketScoringEngine } from '@/app/lib/scoring-engine';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';
import { useState } from 'react';
import { BatterDropdownSelect } from './BatterDropdownSelect';
import {
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';

export function NewBatsmanDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  const [dismissedBatsmanRole, setDismissedBatsmanRole] = useState<'striker' | 'non-striker'>('striker');
  const [selectedBatter, setSelectedBatter] = useState<TeamPlayer | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!liveMatch || !currentInnings) return null;

  // Build excludeIds: current batsmen + dismissed batsmen (can't be selected until end of innings)
  const excludeIds: string[] = [];
  if (currentInnings.striker) excludeIds.push(currentInnings.striker.id);
  if (currentInnings.nonStriker) excludeIds.push(currentInnings.nonStriker.id);
  currentInnings.dismissedBatsmen.forEach((d) => excludeIds.push(d.id));

  // Get available players (not current batsmen and not dismissed)
  // Show all players regardless of role
  const battingTeamPlayers = currentInnings.battingTeam === 'Us' ? liveMatch.teamPlayers : OPPONENT_TEAM_PLAYERS;
  const availableBatsmen = CricketScoringEngine.getAvailableBatsmen(battingTeamPlayers, currentInnings);

  const handleSelectBatsman = (batsman: TeamPlayer) => {
    if (!batsman) return;

    // Determine which batsman position is being replaced
    const outBatsmanId = dismissedBatsmanRole === 'striker' 
      ? currentInnings.striker?.id 
      : currentInnings.nonStriker?.id;

    if (outBatsmanId) {
      // Replace the batsman (both position and role handled by reducer)
      dispatch(
        replaceBatsman({
          outBatsmanId,
          newBatsman: batsman,
          isStriker: dismissedBatsmanRole === 'striker',
          isChangeBatsman: true,
        })
      );
    }

    dispatch(closeDialog());
  };

  const handleCreateNewBatsman = (name: string) => {
    if (currentInnings.battingTeam !== 'Us') {
      return;
    }

    dispatch(addNewPlayerToTeamAndMatch({ name: name.trim() }));

    const newPlayer: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
    };

    setSelectedBatter(newPlayer);
    setNewPlayerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-md p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Change Batter</h2>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => {
              setDismissedBatsmanRole('striker');
              setSelectedBatter(null);
            }}
            disabled={currentInnings.striker?.balls !== 0}
            className={`flex-1 rounded-xl border-2 px-3 py-3 text-sm font-black transition-all shadow-sm active:scale-95 ${
              currentInnings.striker?.balls === 0
                ? dismissedBatsmanRole === 'striker'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-border bg-background text-foreground hover:border-blue-500/50 hover:bg-blue-600/5'
                : 'border-border/50 bg-background/50 text-foreground/40 cursor-not-allowed'
            }`}
          >
            <span className="mb-0.5 block text-[10px] uppercase tracking-widest opacity-60">Replace</span>
            {currentInnings.striker?.name || 'Striker'}
          </button>
          <button
            onClick={() => {
              setDismissedBatsmanRole('non-striker');
              setSelectedBatter(null);
            }}
            disabled={currentInnings.nonStriker?.balls !== 0}
            className={`flex-1 rounded-xl border-2 px-3 py-3 text-sm font-black transition-all shadow-sm active:scale-95 ${
              currentInnings.nonStriker?.balls === 0
                ? dismissedBatsmanRole === 'non-striker'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-border bg-background text-foreground hover:border-blue-500/50 hover:bg-blue-600/5'
                : 'border-border/50 bg-background/50 text-foreground/40 cursor-not-allowed'
            }`}
          >
            <span className="mb-0.5 block text-[10px] uppercase tracking-widest opacity-60">Replace</span>
            {currentInnings.nonStriker?.name || 'Non-Striker'}
          </button>
        </div>

        <div className="mb-4">
          <BatterDropdownSelect
            label="Select Replacement Batsman:"
            placeholder="Choose batsman"
            selectedBatter={selectedBatter}
            batters={availableBatsmen}
            excludeIds={excludeIds}
            onSelect={handleSelectBatsman}
            allowNew={true}
            newPlayerName={newPlayerName}
            onNewPlayerNameChange={setNewPlayerName}
            onCreateNew={handleCreateNewBatsman}
          />
          {availableBatsmen.length === 0 && !newPlayerName && (
            <p className="mt-3 text-center text-sm font-bold opacity-40">No other batsmen in squad</p>
          )}
        </div>

        <button
          onClick={() => dispatch(closeDialog())}
          className={`mt-4 w-full px-4 py-2.5 text-sm ${secondaryButtonClass}`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

