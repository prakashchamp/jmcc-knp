'use client';

import { useState } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { updateMatchAction } from '@/app/lib/actions/match-update-actions';
import { CustomSelect } from '@/app/components/CustomSelect';
import { useRouter } from 'next/navigation';

interface MatchEditFormProps {
  initialMatch: Match;
  initialPerformances: Performance[];
}

export function MatchEditForm({ initialMatch, initialPerformances }: MatchEditFormProps) {
  const router = useRouter();
  const [match, setMatch] = useState<Partial<Match>>(initialMatch);
  const [performances, setPerformances] = useState<Partial<Performance>[]>(initialPerformances);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [winMarginValue, setWinMarginValue] = useState<string>(() => {
    const margin = (initialMatch.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return parsed?.[1] ?? '';
  });

  const [winMarginUnit, setWinMarginUnit] = useState<'runs' | 'wickets'>(() => {
    const margin = (initialMatch.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return (parsed?.[2]?.toLowerCase() as 'runs' | 'wickets') || 'runs';
  });

  const handleMatchChange = (field: keyof Match, value: any) => {
    setMatch((prev) => ({ ...prev, [field]: value }));
  };

  const handlePerformanceChange = (index: number, field: string, subField: string, value: any) => {
    const updated = [...performances];
    const perf = { ...updated[index] };
    if (field === 'playerName') {
      perf.playerName = value;
    } else {
      (perf as any)[field] = {
        ...(perf as any)[field],
        [subField]: value,
      };
    }
    updated[index] = perf;
    setPerformances(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updatedMatch = {
        ...match,
        winMargin: winMarginValue ? `${winMarginValue} ${winMarginUnit}` : '',
        teamRuns: Number(match.teamRuns || 0),
        teamWickets: Number(match.teamWickets || 0),
        opponentRuns: Number(match.opponentRuns || 0),
        opponentWickets: Number(match.opponentWickets || 0),
      };

      // Ensure all derived fields are re-calculated if needed
      const finalPerformances = performances.map(perf => {
        const battingRuns = Number(perf.batting?.runs || 0);
        const battingBalls = Number(perf.batting?.balls || 0);
        const bowlingOvers = Number(perf.bowling?.overs || 0);
        const bowlingRuns = Number(perf.bowling?.runs || 0);
        const bowlingWickets = Number(perf.bowling?.wickets || 0);

        return {
          ...perf,
          batting: {
            ...perf.batting,
            runs: battingRuns,
            balls: battingBalls,
            fours: Number(perf.batting?.fours || 0),
            sixes: Number(perf.batting?.sixes || 0),
            didBat: battingRuns > 0 || battingBalls > 0 || !!perf.batting?.dismissed,
            innings: (battingRuns > 0 || battingBalls > 0) ? 1 : 0,
            strikeRate: battingBalls > 0 ? (battingRuns / battingBalls) * 100 : 0,
          },
          bowling: {
            ...perf.bowling,
            runs: bowlingRuns,
            wickets: bowlingWickets,
            overs: bowlingOvers,
            didBowl: bowlingOvers > 0 || bowlingRuns > 0 || bowlingWickets > 0,
            innings: bowlingOvers > 0 ? 1 : 0,
            economy: bowlingOvers > 0 ? bowlingRuns / (Math.floor(bowlingOvers) + (bowlingOvers % 1) / 0.6) : 0,
          }
        } as Performance;
      });

      const result = await updateMatchAction(match.id!, updatedMatch as Match, finalPerformances);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update match');
      }

      setSuccess('Match updated successfully!');
      setTimeout(() => {
        router.push('/admin/manage-data');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">{error}</div>}
      {success && <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg">{success}</div>}

      {/* Match Details */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
          Match Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Opponent</label>
            <input
              type="text"
              value={match.opponent || ''}
              onChange={(e) => handleMatchChange('opponent', e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <CustomSelect
              id="venue-select"
              label="Venue"
              value={match.venue || ''}
              onChange={(val) => handleMatchChange('venue', val)}
              options={[{ value: 'Home', label: 'Home' }, { value: 'Away', label: 'Away' }, { value: 'Neutral', label: 'Neutral' }]}
            />
          </div>

          <div>
            <CustomSelect
              id="result-select"
              label="Result"
              value={match.result || ''}
              onChange={(val) => handleMatchChange('result', val)}
              options={[{ value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' }, { value: 'tie', label: 'Tie' }, { value: 'no_result', label: 'No Result' }]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Win Margin</label>
              <input
                type="number"
                value={winMarginValue}
                onChange={(e) => setWinMarginValue(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <CustomSelect
                id="margin-unit-select"
                label="Unit"
                value={winMarginUnit}
                onChange={(val) => setWinMarginUnit(val as 'runs' | 'wickets')}
                options={[{ value: 'runs', label: 'Runs' }, { value: 'wickets', label: 'Wickets' }]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Team Runs</label>
              <input
                type="number"
                value={match.teamRuns ?? ''}
                onChange={(e) => handleMatchChange('teamRuns', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Team Wkts</label>
              <input
                type="number"
                value={match.teamWickets ?? ''}
                onChange={(e) => handleMatchChange('teamWickets', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Opponent Runs</label>
              <input
                type="number"
                value={match.opponentRuns ?? ''}
                onChange={(e) => handleMatchChange('opponentRuns', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Opponent Wkts</label>
              <input
                type="number"
                value={match.opponentWickets ?? ''}
                onChange={(e) => handleMatchChange('opponentWickets', e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Player Stats */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
          Player Statistics
        </h3>

        <div className="space-y-4">
          {performances.map((perf, idx) => (
            <div key={perf.id} className="bg-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-all">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-white">{perf.playerName}</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">ID: {perf.playerId}</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Runs</label>
                  <input
                    type="number"
                    value={perf.batting?.runs ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', 'runs', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Balls</label>
                  <input
                    type="number"
                    value={perf.batting?.balls ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', 'balls', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">4s</label>
                  <input
                    type="number"
                    value={perf.batting?.fours ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', 'fours', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">6s</label>
                  <input
                    type="number"
                    value={perf.batting?.sixes ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', 'sixes', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Overs</label>
                  <input
                    type="number"
                    step="0.1"
                    value={perf.bowling?.overs ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', 'overs', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Wkts</label>
                  <input
                    type="number"
                    value={perf.bowling?.wickets ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', 'wickets', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Bowl R</label>
                  <input
                    type="number"
                    value={perf.bowling?.runs ?? ''}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', 'runs', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-center outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
