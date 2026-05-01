'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/app/lib/redux/store';
import { addManualBowlingStats, openDialog } from '@/app/lib/redux/slices/scorerSlice';
import { CurrentBowler } from '@/app/lib/cricket-scorer-types';
import {
  modalEyebrowClass,
  modalHeaderClass,
  modalOverlayClass,
  modalPanelClass,
  modalTitleClass,
  secondaryButtonClass,
} from './dialogTheme';
import { CustomSelect } from '@/app/components/CustomSelect';

export function ManualBowlingStatsDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const teamPlayers = useSelector((state: RootState) => state.scorer.liveMatch?.teamPlayers || []);
  
  const [bowlers, setBowlers] = useState<Partial<CurrentBowler>[]>([
    { id: '', name: '', runs: 0, overs: 0, balls: 0, wickets: 0, maidens: 0, economy: 0 }
  ]);

  const handleAddBowler = () => {
    setBowlers([...bowlers, { id: '', name: '', runs: 0, overs: 0, balls: 0, wickets: 0, maidens: 0, economy: 0 }]);
  };

  const handleRemoveBowler = (index: number) => {
    setBowlers(bowlers.filter((_, i) => i !== index));
  };

  const updateBowler = (index: number, field: keyof CurrentBowler, value: any) => {
    const newBowlers = [...bowlers];
    if (field === 'id') {
      const player = teamPlayers.find(p => p.id === value);
      newBowlers[index] = { ...newBowlers[index], id: value, name: player?.name || '' };
    } else {
      newBowlers[index] = { ...newBowlers[index], [field]: value };
    }
    
    // Auto-calculate economy and actual balls from overs notation (e.g. 1.4 -> 10 balls)
    const b = newBowlers[index];
    const oversNum = Number(b.overs || 0);
    const wholeOvers = Math.floor(oversNum);
    const ballsInOver = Math.round((oversNum % 1) * 10);
    const totalBalls = (wholeOvers * 6) + ballsInOver;
    
    b.balls = totalBalls;
    
    if (totalBalls > 0) {
      const trueOvers = totalBalls / 6;
      b.economy = Number((Number(b.runs || 0) / trueOvers).toFixed(2));
    } else {
      b.economy = 0;
    }
    
    setBowlers(newBowlers);
  };

  const handleSave = () => {
    // Filter out invalid bowlers (missing ID or name)
    const validBowlers = bowlers
      .filter(b => b.id && b.name)
      .map(b => ({
        ...b,
        balls: b.balls || 0,
        overs: b.overs || 0,
        runs: b.runs || 0,
        wickets: b.wickets || 0,
        maidens: b.maidens || 0,
        economy: b.economy || 0,
        extras: 0,
      } as CurrentBowler));

    if (validBowlers.length === 0) {
      alert('Please add at least one bowler with a name.');
      return;
    }

    dispatch(addManualBowlingStats(validBowlers));
    dispatch(openDialog({ dialog: 'uploadConfirm' }));
  };

  return (
    <div className={modalOverlayClass}>
      <div className={`${modalPanelClass} w-full max-w-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col`}>
        <div className={modalHeaderClass}>
          <p className={modalEyebrowClass}>Data Entry</p>
          <h2 className={modalTitleClass}>Missing Bowling Stats</h2>
          <p className="text-xs opacity-60 mt-1">Please enter our team's bowling figures for this match.</p>
        </div>

        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2">
          {bowlers.map((bowler, index) => (
            <div key={index} className="bg-background/50 p-3 rounded-lg border border-border relative">
              <button 
                onClick={() => handleRemoveBowler(index)}
                className="absolute top-2 right-2 opacity-40 hover:opacity-100 hover:text-red-500 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold opacity-60 uppercase mb-1 block">Bowler Name</label>
                  <CustomSelect
                    value={bowler.id || ''}
                    onChange={(value) => updateBowler(index, 'id', value)}
                    options={teamPlayers.map(p => ({ value: p.id, label: p.name }))}
                    className="w-full"
                  />
                </div>
                
                <div className="grid grid-cols-4 gap-2 sm:col-span-2">
                  <div>
                    <label className="text-[10px] font-semibold opacity-40 uppercase mb-1 block">Overs</label>
                    <input
                      type="number"
                      step="0.1"
                      value={bowler.overs}
                      onChange={(e) => updateBowler(index, 'overs', parseFloat(e.target.value))}
                      className="w-full bg-background border border-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold opacity-40 uppercase mb-1 block">Maidens</label>
                    <input
                      type="number"
                      value={bowler.maidens}
                      onChange={(e) => updateBowler(index, 'maidens', parseInt(e.target.value))}
                      className="w-full bg-background border border-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold opacity-40 uppercase mb-1 block">Runs</label>
                    <input
                      type="number"
                      value={bowler.runs}
                      onChange={(e) => updateBowler(index, 'runs', parseInt(e.target.value))}
                      className="w-full bg-background border border-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold opacity-40 uppercase mb-1 block">Wickets</label>
                    <input
                      type="number"
                      value={bowler.wickets}
                      onChange={(e) => updateBowler(index, 'wickets', parseInt(e.target.value))}
                      className="w-full bg-background border border-border rounded p-2 text-sm text-foreground focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={handleAddBowler}
            className="w-full py-2 border-2 border-dashed border-border rounded-lg opacity-40 hover:opacity-100 hover:border-blue-500 transition-all text-sm font-medium"
          >
            + Add Another Bowler
          </button>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            onClick={() => dispatch(openDialog({ dialog: 'uploadConfirm' }))}
            className={`flex-1 px-4 py-2.5 text-sm ${secondaryButtonClass}`}
          >
            Back
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            Continue to Upload
          </button>
        </div>
      </div>
    </div>
  );
}
