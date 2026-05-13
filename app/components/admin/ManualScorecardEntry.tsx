'use client';

import { useState } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { useTeamPlayers } from '@/app/lib/hooks/useTeam';
import { createNewPlayer } from '@/app/lib/player-utils';
import { CustomSelect } from '@/app/components/CustomSelect';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

interface ManualScorecardEntryProps {
  onDataParsed: (data: ParsedData) => void;
}

interface BattingRow {
  playerId?: string;
  playerName: string;
  runs: number | '';
  balls: number | '';
  fours: number | '';
  sixes: number | '';
  dismissed: boolean;
}

interface BowlingRow {
  playerId?: string;
  playerName: string;
  overs: string; // Keep as string for decimal handling during input, parse on submit
  runs: number | '';
  maidens: number | '';
  wickets: number | '';
}

export function ManualScorecardEntry({ onDataParsed }: ManualScorecardEntryProps) {
  const { players: teamPlayers } = useTeamPlayers();
  
  const players = teamPlayers.map(p => ({
    playerId: p.id,
    playerName: p.name,
  }));
  
  const [battingRows, setBattingRows] = useState<BattingRow[]>([
    { playerName: '', runs: '', balls: '', fours: '', sixes: '', dismissed: false }
  ]);
  
  const [bowlingRows, setBowlingRows] = useState<BowlingRow[]>([
    { playerName: '', overs: '', runs: '', maidens: '', wickets: '' }
  ]);

  const addBattingRow = () => {
    setBattingRows([...battingRows, { playerName: '', runs: '', balls: '', fours: '', sixes: '', dismissed: false }]);
  };

  const removeBattingRow = (index: number) => {
    setBattingRows(battingRows.filter((_, i) => i !== index));
  };

  const updateBattingRow = (index: number, field: keyof BattingRow, value: any) => {
    const newRows = [...battingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBattingRows(newRows);
  };

  const addBowlingRow = () => {
    setBowlingRows([...bowlingRows, { playerName: '', overs: '', runs: '', maidens: '', wickets: '' }]);
  };

  const removeBowlingRow = (index: number) => {
    setBowlingRows(bowlingRows.filter((_, i) => i !== index));
  };

  const updateBowlingRow = (index: number, field: keyof BowlingRow, value: any) => {
    const newRows = [...bowlingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBowlingRows(newRows);
  };

  const normalizePlayerName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  const findRosterPlayer = (name: string) => {
    const normalized = normalizePlayerName(name);
    return players.find((p) => normalizePlayerName(p.playerName) === normalized)
      || players.find((p) => normalizePlayerName(p.playerName).endsWith(normalized))
      || players.find((p) => normalizePlayerName(p.playerName).startsWith(normalized));
  };

  const buildPlayerOptionValue = (playerId: string) => `player:${playerId}`;
  const buildCustomOptionValue = (playerName: string) => `custom:${playerName}`;

  const handlePlayerSelection = (index: number, isBatting: boolean, rawValue: string) => {
    const newRows = isBatting ? [...battingRows] : [...bowlingRows];
    const row = { ...newRows[index] } as BattingRow | BowlingRow;

    if (rawValue.startsWith('player:')) {
      const selectedId = rawValue.replace('player:', '');
      const selectedPlayer = players.find((p) => p.playerId === selectedId);
      if (selectedPlayer) {
        row.playerId = selectedPlayer.playerId;
        row.playerName = selectedPlayer.playerName;
      }
    } else if (rawValue.startsWith('custom:')) {
      const customName = rawValue.replace('custom:', '');
      row.playerId = undefined;
      row.playerName = customName;
    } else {
      row.playerId = undefined;
      row.playerName = rawValue;
    }

    newRows[index] = row;
    if (isBatting) {
      setBattingRows(newRows as BattingRow[]);
    } else {
      setBowlingRows(newRows as BowlingRow[]);
    }
  };

  const playerOptions = players.map((player) => ({
    value: buildPlayerOptionValue(player.playerId),
    label: player.playerName,
  }));

  const playerOptionsForRow = (row: BattingRow | BowlingRow) => {
    const options = [...playerOptions];
    if (row.playerName.trim()) {
      const match = findRosterPlayer(row.playerName);
      if (!match) {
        options.unshift({
          value: buildCustomOptionValue(row.playerName),
          label: row.playerName,
        });
      }
    }
    return options;
  };

  const getSelectedPlayerValue = (row: BattingRow | BowlingRow) => {
    if (row.playerId) {
      return buildPlayerOptionValue(row.playerId);
    }
    if (row.playerName.trim()) {
      const match = findRosterPlayer(row.playerName);
      if (match) {
        return buildPlayerOptionValue(match.playerId);
      }
      return buildCustomOptionValue(row.playerName);
    }
    return '';
  };

  const handleSubmit = () => {
    const performances: Partial<Performance>[] = [];

    // Map player name to performance object to merge batting and bowling stats for the same player
    const perfMap = new Map<string, Partial<Performance>>();

    const getOrCreatePerf = (name: string, playerId?: string) => {
      const normalizedName = normalizePlayerName(name);
      if (!perfMap.has(normalizedName)) {
        const existingPlayer = players.find(
          (p) => normalizePlayerName(p.playerName) === normalizedName
        );
        let resolvedPlayerId = playerId;
        let playerName = name.trim();

        if (existingPlayer) {
          resolvedPlayerId = existingPlayer.playerId;
          playerName = existingPlayer.playerName;
        } else if (playerId) {
          const rosterEntry = players.find((p) => p.playerId === playerId);
          if (rosterEntry) {
            playerName = rosterEntry.playerName;
          }
        }

        if (!resolvedPlayerId) {
          const existingNames = new Set(players.map((p) => normalizePlayerName(p.playerName)));
          const newPlayer = createNewPlayer(playerName, existingNames);
          resolvedPlayerId = newPlayer.id;
          playerName = newPlayer.name;
        }

        perfMap.set(normalizedName, {
          playerName,
          playerId: resolvedPlayerId,
          batting: {
            didBat: false,
            innings: 0,
            runs: 0,
            balls: 0,
            zeros: 0,
            fours: 0,
          sixes: 0,
          dismissed: false,
          isDuck: false,
          isThirty: false,
          isFifty: false,
          isHundred: false,
          strikeRate: 0,
        },
        bowling: {
          didBowl: false,
          innings: 0,
          overs: 0,
          balls: 0,
          runs: 0,
          wickets: 0,
          maidens: 0,
          isThreeFer: false,
          isFourFer: false,
          isFiveFer: false,
          economy: 0,
          zeros: 0,
        }
      });
      }
      return perfMap.get(normalizedName)!;
    };

    battingRows.forEach(row => {
      if (!row.playerName.trim()) return;
      const perf = getOrCreatePerf(row.playerName, row.playerId);
      
      const runs = row.runs === '' ? 0 : Number(row.runs);
      const balls = row.balls === '' ? 0 : Number(row.balls);
      const sr = balls > 0 ? (runs / balls) * 100 : 0;
      
      perf.batting = {
        didBat: true,
        innings: 1,
        runs: runs,
        balls: balls,
        zeros: 0, // Not captured in manual entry yet
        fours: row.fours === '' ? 0 : Number(row.fours),
        sixes: row.sixes === '' ? 0 : Number(row.sixes),
        dismissed: row.dismissed,
        isDuck: runs === 0 && balls > 0,
        isThirty: runs >= 30 && runs < 50,
        isFifty: runs >= 50 && runs < 100,
        isHundred: runs >= 100,
        strikeRate: Number(sr.toFixed(2)),
      };
    });

    bowlingRows.forEach(row => {
      if (!row.playerName.trim()) return;
      const perf = getOrCreatePerf(row.playerName, row.playerId);
      
      const overs = parseFloat(row.overs) || 0;
      const runs = row.runs === '' ? 0 : Number(row.runs);
      const wickets = row.wickets === '' ? 0 : Number(row.wickets);
      
      // Calculate economy: runs / overs, handle decimal overs correctly
      // Decimal part of over means balls. e.g., 4.2 overs = 4 overs and 2 balls = 4.333 overs
      const completeOvers = Math.floor(overs);
      const partialBalls = Math.round((overs - completeOvers) * 10);
      const totalBalls = (completeOvers * 6) + partialBalls;
      const validOvers = totalBalls / 6;
      const economy = validOvers > 0 ? runs / validOvers : 0;

      perf.bowling = {
        didBowl: true,
        innings: 1,
        overs: overs,
        balls: totalBalls,
        runs: runs,
        wickets: wickets,
        maidens: row.maidens === '' ? 0 : Number(row.maidens),
        isThreeFer: wickets >= 3 && wickets < 4,
        isFourFer: wickets >= 4 && wickets < 5,
        isFiveFer: wickets >= 5,
        economy: Number(economy.toFixed(2)),
        zeros: 0,
      };
    });

    performances.push(...Array.from(perfMap.values()));

    // Calculate top 2 batters and bowlers
    const topBatters = [...performances]
      .sort((a, b) => {
        if ((b.batting?.runs || 0) !== (a.batting?.runs || 0)) {
          return (b.batting?.runs || 0) - (a.batting?.runs || 0);
        }
        return (a.batting?.balls || 0) - (b.batting?.balls || 0);
      })
      .slice(0, 2)
      .map(perf => ({
        playerId: perf.playerId || '',
        playerName: perf.playerName || '',
        runs: perf.batting?.runs || 0,
        balls: perf.batting?.balls || 0,
      }));

    const topBowlers = [...performances]
      .sort((a, b) => {
        if ((b.bowling?.wickets || 0) !== (a.bowling?.wickets || 0)) {
          return (b.bowling?.wickets || 0) - (a.bowling?.wickets || 0);
        }
        return (a.bowling?.runs || 0) - (b.bowling?.runs || 0);
      })
      .slice(0, 2)
      .map(perf => ({
        playerId: perf.playerId || '',
        playerName: perf.playerName || '',
        wickets: perf.bowling?.wickets || 0,
        runs: perf.bowling?.runs || 0,
      }));

    const matchData: Partial<Match> = {
      date: new Date().toISOString(),
      opponent: '',
      venue: 'Home',
      tossWonBy: 'Us',
      tossDecision: 'bat',
      result: 'won',
      topBatters,
      topBowlers,
      bestBatterId: topBatters[0]?.playerId || '',
      bestBatterName: topBatters[0]?.playerName || '',
      bestBatterRuns: topBatters[0]?.runs || 0,
      bestBatterBalls: topBatters[0]?.balls || 0,
      bestBowlerId: topBowlers[0]?.playerId || '',
      bestBowlerName: topBowlers[0]?.playerName || '',
      bestBowlerWickets: topBowlers[0]?.wickets || 0,
      bestBowlerRuns: topBowlers[0]?.runs || 0,
    };

    onDataParsed({
      match: matchData,
      performances
    });
  };

  return (
    <div className="space-y-8 bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="mb-4">
        <h3 className="text-2xl font-semibold text-white">Manual Scorecard Entry</h3>
        <p className="text-gray-400 text-sm mt-1">Enter match statistics manually for batters and bowlers.</p>
      </div>

      {/* Batting Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold text-green-400">Batting Performances</h4>
          <button 
            onClick={addBattingRow}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            + Add Batter
          </button>
        </div>
        
        <div className="space-y-3">
          {battingRows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-700 p-3 rounded-lg border border-gray-600">
              <div className="w-full md:w-48 relative flex-shrink-0">
                <label className="block text-xs font-medium text-gray-300 mb-1">Player</label>
                <CustomSelect
                  id={`batting-player-${idx}`}
                  label=""
                  value={getSelectedPlayerValue(row)}
                  placeholder="Select or enter player"
                  options={playerOptionsForRow(row)}
                  onChange={(value) => handlePlayerSelection(idx, true, value)}
                  className="w-full"
                  allowCustom
                />
              </div>
              
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Runs</label>
                <input type="number" value={row.runs ?? ''} onChange={(e) => updateBattingRow(idx, 'runs', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Balls</label>
                <input type="number" value={row.balls ?? ''} onChange={(e) => updateBattingRow(idx, 'balls', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-16">
                <label className="block text-xs font-medium text-gray-300 mb-1">4s</label>
                <input type="number" value={row.fours ?? ''} onChange={(e) => updateBattingRow(idx, 'fours', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-16">
                <label className="block text-xs font-medium text-gray-300 mb-1">6s</label>
                <input type="number" value={row.sixes ?? ''} onChange={(e) => updateBattingRow(idx, 'sixes', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-32">
                <CustomSelect
                  id={`batting-status-${idx}`}
                  label="Status"
                  value={row.dismissed ? 'yes' : 'no'}
                  placeholder="Select status"
                  options={[
                    { value: 'no', label: 'Not Out' },
                    { value: 'yes', label: 'Out' },
                  ]}
                  onChange={(value) => updateBattingRow(idx, 'dismissed', value === 'yes')}
                  className="w-full"
                />
              </div>
              
              <button 
                onClick={() => removeBattingRow(idx)}
                className="ml-auto w-8 h-9 flex items-center justify-center bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded transition-colors"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bowling Section */}
      <div className="pt-4 border-t border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-xl font-semibold text-green-400">Bowling Performances</h4>
          <button 
            onClick={addBowlingRow}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
          >
            + Add Bowler
          </button>
        </div>
        
        <div className="space-y-3">
          {bowlingRows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-700 p-3 rounded-lg border border-gray-600">
              <div className="w-full md:w-48 relative flex-shrink-0">
                <label className="block text-xs font-medium text-gray-300 mb-1">Player</label>
                <CustomSelect
                  id={`bowling-player-${idx}`}
                  label=""
                  value={getSelectedPlayerValue(row)}
                  placeholder="Select or enter player"
                  options={playerOptionsForRow(row)}
                  onChange={(value) => handlePlayerSelection(idx, false, value)}
                  className="w-full"
                  allowCustom
                />
              </div>
              
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-300 mb-1">Overs</label>
                <input type="number" step="0.1" value={row.overs || ''} onChange={(e) => updateBowlingRow(idx, 'overs', e.target.value)} placeholder="e.g. 4.2" className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Runs</label>
                <input type="number" value={row.runs ?? ''} onChange={(e) => updateBowlingRow(idx, 'runs', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Maidens</label>
                <input type="number" value={row.maidens ?? ''} onChange={(e) => updateBowlingRow(idx, 'maidens', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Wickets</label>
                <input type="number" value={row.wickets ?? ''} onChange={(e) => updateBowlingRow(idx, 'wickets', e.target.value)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-green-500 text-sm text-center" />
              </div>
              
              <button 
                onClick={() => removeBowlingRow(idx)}
                className="ml-auto w-8 h-9 flex items-center justify-center bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white rounded transition-colors"
                title="Remove row"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <datalist id="players-list">
        {players.map(p => (
          <option key={p.playerId} value={p.playerName} />
        ))}
      </datalist>

      <div className="pt-6 mt-4 flex justify-end border-t border-gray-700">
        <button
          onClick={handleSubmit}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          Generate Scorecard →
        </button>
      </div>
    </div>
  );
}
