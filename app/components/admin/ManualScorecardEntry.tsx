'use client';

import { useState } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { useAllPlayers } from '@/app/lib/hooks/useAllPlayers';

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

interface ManualScorecardEntryProps {
  onDataParsed: (data: ParsedData) => void;
}

interface BattingRow {
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissed: boolean;
}

interface BowlingRow {
  playerName: string;
  overs: string; // Keep as string for decimal handling during input, parse on submit
  runs: number;
  maidens: number;
  wickets: number;
}

export function ManualScorecardEntry({ onDataParsed }: ManualScorecardEntryProps) {
  const { players } = useAllPlayers();
  
  const [battingRows, setBattingRows] = useState<BattingRow[]>([
    { playerName: '', runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false }
  ]);
  
  const [bowlingRows, setBowlingRows] = useState<BowlingRow[]>([
    { playerName: '', overs: '', runs: 0, maidens: 0, wickets: 0 }
  ]);

  const addBattingRow = () => {
    setBattingRows([...battingRows, { playerName: '', runs: 0, balls: 0, fours: 0, sixes: 0, dismissed: false }]);
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
    setBowlingRows([...bowlingRows, { playerName: '', overs: '', runs: 0, maidens: 0, wickets: 0 }]);
  };

  const removeBowlingRow = (index: number) => {
    setBowlingRows(bowlingRows.filter((_, i) => i !== index));
  };

  const updateBowlingRow = (index: number, field: keyof BowlingRow, value: any) => {
    const newRows = [...bowlingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setBowlingRows(newRows);
  };

  const handleSubmit = () => {
    const performances: Partial<Performance>[] = [];

    // Map player name to performance object to merge batting and bowling stats for the same player
    const perfMap = new Map<string, Partial<Performance>>();

    const getOrCreatePerf = (name: string) => {
      const trimmedName = name.trim();
      if (!perfMap.has(trimmedName)) {
        perfMap.set(trimmedName, {
          playerName: trimmedName,
          playerId: `player_${trimmedName}`,
          batting: {
            didBat: false,
            innings: 0,
            runs: 0,
            balls: 0,
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
          }
        });
      }
      return perfMap.get(trimmedName)!;
    };

    battingRows.forEach(row => {
      if (!row.playerName.trim()) return;
      const perf = getOrCreatePerf(row.playerName);
      
      const runs = row.runs || 0;
      const balls = row.balls || 0;
      const sr = balls > 0 ? (runs / balls) * 100 : 0;
      
      perf.batting = {
        didBat: true,
        innings: 1,
        runs: runs,
        balls: balls,
        fours: row.fours || 0,
        sixes: row.sixes || 0,
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
      const perf = getOrCreatePerf(row.playerName);
      
      const overs = parseFloat(row.overs) || 0;
      const runs = row.runs || 0;
      const wickets = row.wickets || 0;
      
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
        maidens: row.maidens || 0,
        isThreeFer: wickets >= 3 && wickets < 4,
        isFourFer: wickets >= 4 && wickets < 5,
        isFiveFer: wickets >= 5,
        economy: Number(economy.toFixed(2)),
      };
    });

    performances.push(...Array.from(perfMap.values()));

    // Determine best batter and bowler
    const bestBatter = performances.reduce((prev, current) => 
      (prev.batting?.runs || 0) > (current.batting?.runs || 0) ? prev : current, 
      performances[0] || {}
    );

    const bestBowler = performances.reduce((prev, current) => 
      (prev.bowling?.wickets || 0) > (current.bowling?.wickets || 0) ? prev : current, 
      performances[0] || {}
    );

    const matchData: Partial<Match> = {
      date: new Date().toISOString(),
      opponent: '',
      venue: 'Home',
      tossWonBy: 'Us',
      tossDecision: 'bat',
      result: 'won',
      bestBatterId: bestBatter.playerId || '',
      bestBatterName: bestBatter.playerName || '',
      bestBatterRuns: bestBatter.batting?.runs || 0,
      bestBatterBalls: bestBatter.batting?.balls || 0,
      bestBowlerId: bestBowler.playerId || '',
      bestBowlerName: bestBowler.playerName || '',
      bestBowlerWickets: bestBowler.bowling?.wickets || 0,
      bestBowlerRuns: bestBowler.bowling?.runs || 0,
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
          <h4 className="text-xl font-semibold text-blue-400">Batting Performances</h4>
          <button 
            onClick={addBattingRow}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
          >
            + Add Batter
          </button>
        </div>
        
        <div className="space-y-3">
          {battingRows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-end bg-gray-700 p-3 rounded-lg border border-gray-600">
              <div className="w-full md:w-48 relative flex-shrink-0">
                <label className="block text-xs font-medium text-gray-300 mb-1">Player</label>
                <input
                  type="text"
                  value={row.playerName}
                  onChange={(e) => updateBattingRow(idx, 'playerName', e.target.value)}
                  list="players-list"
                  placeholder="Player name"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Runs</label>
                <input type="number" value={row.runs || ''} onChange={(e) => updateBattingRow(idx, 'runs', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Balls</label>
                <input type="number" value={row.balls || ''} onChange={(e) => updateBattingRow(idx, 'balls', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-16">
                <label className="block text-xs font-medium text-gray-300 mb-1">4s</label>
                <input type="number" value={row.fours || ''} onChange={(e) => updateBattingRow(idx, 'fours', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-16">
                <label className="block text-xs font-medium text-gray-300 mb-1">6s</label>
                <input type="number" value={row.sixes || ''} onChange={(e) => updateBattingRow(idx, 'sixes', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium text-gray-300 mb-1">Status</label>
                <select 
                  value={row.dismissed ? "yes" : "no"} 
                  onChange={(e) => updateBattingRow(idx, 'dismissed', e.target.value === "yes")}
                  className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="no">Not Out</option>
                  <option value="yes">Out</option>
                </select>
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
                <input
                  type="text"
                  value={row.playerName}
                  onChange={(e) => updateBowlingRow(idx, 'playerName', e.target.value)}
                  list="players-list"
                  placeholder="Player name"
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              
              <div className="w-24">
                <label className="block text-xs font-medium text-gray-300 mb-1">Overs</label>
                <input type="number" step="0.1" value={row.overs || ''} onChange={(e) => updateBowlingRow(idx, 'overs', e.target.value)} placeholder="e.g. 4.2" className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Runs</label>
                <input type="number" value={row.runs || ''} onChange={(e) => updateBowlingRow(idx, 'runs', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Maidens</label>
                <input type="number" value={row.maidens || ''} onChange={(e) => updateBowlingRow(idx, 'maidens', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
              </div>
              <div className="w-20">
                <label className="block text-xs font-medium text-gray-300 mb-1">Wickets</label>
                <input type="number" value={row.wickets || ''} onChange={(e) => updateBowlingRow(idx, 'wickets', parseInt(e.target.value) || 0)} className="w-full px-2 py-2 bg-gray-600 border border-gray-500 text-white rounded focus:outline-none focus:border-blue-500 text-sm text-center" />
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
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
        >
          Generate Scorecard →
        </button>
      </div>
    </div>
  );
}
