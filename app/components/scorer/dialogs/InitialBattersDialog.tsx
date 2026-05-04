'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { closeDialog, setInitialBattersAndBowler, addNewTeamPlayer } from '@/app/lib/redux/slices/scorerSlice';
import type { TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { OPPONENT_TEAM_PLAYERS } from '@/app/lib/team-constants';
import { BatterDropdownSelect } from './BatterDropdownSelect';
import { BowlerDropdownSelect } from './BowlerDropdownSelect';
import { useTeamName } from '@/app/lib/hooks/useTeamName';
import {
  infoCardClass,
  modalOverlayClass,
  modalPanelClass,
  modalHeaderClass,
  modalEyebrowClass,
  modalTitleClass,
  primaryButtonClass,
} from './dialogTheme';

export function InitialBattersDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings } = useSelector((state: RootState) => state.scorer);
  
  const [batter1, setBatter1] = useState<TeamPlayer | null>(null);
  const [batter2, setBatter2] = useState<TeamPlayer | null>(null);
  const [bowler, setBowler] = useState<TeamPlayer | null>(null);
  const [newBatterName, setNewBatterName] = useState('');
  const [newBowlerName, setNewBowlerName] = useState('');

  // Auto-select and start if opponent is involved
  useEffect(() => {
    if (!liveMatch || !currentInnings) return;

    // Case: We are batting (Opponent is bowling)
    // Auto-select opponent bowler and openers if they are already selected in Landing Page
    if (currentInnings.battingTeam === 'Us') {
       if (!bowler) setBowler(OPPONENT_TEAM_PLAYERS[0]);
    } 

    // Case: Opponent is batting (We are bowling)
    if (currentInnings.battingTeam === 'Them') {
       if (!batter1) setBatter1(OPPONENT_TEAM_PLAYERS[0]);
       if (!batter2) setBatter2(OPPONENT_TEAM_PLAYERS[1]);
    }
  }, [currentInnings?.battingTeam, liveMatch]);

  const teamName = useTeamName();
  
  if (!liveMatch || !currentInnings) return null;

  const battingTeamPlayers = currentInnings.battingTeam === 'Us' ? liveMatch.teamPlayers : OPPONENT_TEAM_PLAYERS;
  const bowlingTeamPlayers = currentInnings.battingTeam === 'Us' ? OPPONENT_TEAM_PLAYERS : liveMatch.teamPlayers;

  // When batter1 changes, ensure it's not the same as batter2
  const handleBatter1Change = (batter: TeamPlayer) => {
    if (batter2 && batter.id === batter2.id) {
      // Silently ignore selection of same player
      return;
    }
    setBatter1(batter);
  };

  // When batter2 changes, ensure it's not the same as batter1
  const handleBatter2Change = (batter: TeamPlayer) => {
    if (batter1 && batter.id === batter1.id) {
      // Silently ignore selection of same player
      return;
    }
    setBatter2(batter);
  };

  const isValid = batter1 && batter2 && bowler && batter1.id !== batter2.id;

  // Calculate exclude IDs directly (forces recalculation on every render when selection changes)
  const strikerExcludeIds = batter2?.id ? [batter2.id] : [];
  const nonStrikerExcludeIds = batter1?.id ? [batter1.id] : [];
  

  const handleStart = () => {
    if (!isValid) return;
    
    // Double-check validation
    if (batter1?.id === batter2?.id) {
      console.error('ERROR: Same batsman selected twice! batter1:', batter1, 'batter2:', batter2);
      alert('Error: Cannot select the same batsman twice. Please select two different players.');
      return;
    }

    if (!batter1 || !batter2 || !bowler) {
      console.error('ERROR: Missing data! batter1:', batter1, 'batter2:', batter2, 'bowler:', bowler);
      alert('Error: All players must be selected.');
      return;
    }
    
    // Dispatch action to set initial batters and bowler
    dispatch(setInitialBattersAndBowler({ 
      striker: batter1, 
      nonStriker: batter2,
      bowler: bowler
    }));
    dispatch(closeDialog());
  };

  const handleCreateNewBatter = (name: string) => {
    if (currentInnings.battingTeam !== 'Us') {
      return;
    }

    dispatch(addNewTeamPlayer({ name: name.trim() }));
    setNewBatterName('');
  };

  const handleCreateNewBowler = (name: string) => {
    const isUsBowling = currentInnings.battingTeam === 'Them';
    if (!isUsBowling) {
      return;
    }

    dispatch(addNewTeamPlayer({ name: name.trim() }));

    const newPlayer: TeamPlayer = {
      id: `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
    };

    setBowler(newPlayer);
    setNewBowlerName('');
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 sm:p-6`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Live Scorer</p>
          <h2 className={modalTitleClass}>Player Selection</h2>
        </div>

        <div className="mb-4">
          <BatterDropdownSelect
            label="Striker (Batter 1)"
            placeholder="Select striker"
            selectedBatter={batter1}
            batters={battingTeamPlayers}
            excludeIds={strikerExcludeIds}
            onSelect={handleBatter1Change}
            allowNew={currentInnings.battingTeam === 'Us'}
            newPlayerName={newBatterName}
            onNewPlayerNameChange={setNewBatterName}
            onCreateNew={handleCreateNewBatter}
          />
        </div>

        <div className="mb-4">
          <BatterDropdownSelect
            label="Non-Striker (Batter 2)"
            placeholder="Select non-striker"
            selectedBatter={batter2}
            batters={battingTeamPlayers}
            excludeIds={nonStrikerExcludeIds}
            onSelect={handleBatter2Change}
            allowNew={currentInnings.battingTeam === 'Us'}
            newPlayerName={newBatterName}
            onNewPlayerNameChange={setNewBatterName}
            onCreateNew={handleCreateNewBatter}
          />
        </div>

        <div className="mb-4">
          <BowlerDropdownSelect
            label={`Opening Bowler (${currentInnings.battingTeam === 'Us' ? liveMatch.opponent : teamName})`}
            placeholder="Select bowler"
            selectedBowler={bowler}
            bowlers={bowlingTeamPlayers}
            excludeIds={[]}
            onSelect={setBowler}
            allowNew={currentInnings.battingTeam === 'Them'}
            newPlayerName={newBowlerName}
            onNewPlayerNameChange={setNewBowlerName}
            onCreateNew={handleCreateNewBowler}
          />
        </div>

        {batter1 && batter2 && bowler && (
          <div className={`mb-4 ${infoCardClass}`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide opacity-60">Selected Players</p>
            <p className="text-sm">🏏 Striker: <span className="font-bold">{batter1.name}</span></p>
            <p className="text-sm">🏏 Non-Striker: <span className="font-bold">{batter2.name}</span></p>
            <p className="text-sm">🎯 Bowler: <span className="font-bold">{bowler.name}</span></p>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!isValid}
          className={`w-full px-4 py-2.5 ${
            isValid
              ? primaryButtonClass
              : 'cursor-not-allowed rounded-lg border border-border bg-background text-foreground/30'
          }`}
        >
          Start Match
        </button>
      </div>
    </div>
  );
}

