'use client';

import { useState } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { uploadManualMatchAction } from '@/app/lib/actions/match-upload-actions';
import { CustomSelect } from '@/app/components/CustomSelect';
import { findTopBatters, findTopBowlers } from '@/app/lib/firestore-mapper';

function getISTYearMonth(dateString: string) {
  const dateObj = new Date(dateString);
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  });
  const parts = istFormatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value || dateObj.getUTCFullYear().toString();
  const monthRaw = parts.find(p => p.type === 'month')?.value || (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  return { year, month: `${year}-${monthRaw}` };
}

interface ParsedData {
  match: Partial<Match>;
  performances: Partial<Performance>[];
}

interface MatchDataFormProps {
  matchData: ParsedData;
  onSuccess: () => void;
}

export function MatchDataForm({ matchData, onSuccess }: MatchDataFormProps) {
  const [match, setMatch] = useState<Partial<Match>>(matchData.match);
  const [performances, setPerformances] = useState<Partial<Performance>[]>(matchData.performances);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [winMarginValue, setWinMarginValue] = useState<string>(() => {
    const margin = (matchData.match.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return parsed?.[1] ?? '';
  });

  const [winMarginUnit, setWinMarginUnit] = useState<'runs' | 'wickets'>(() => {
    const margin = (matchData.match.winMargin || '').trim();
    const parsed = margin.match(/^(\d+)\s*(runs|wickets)$/i);
    return (parsed?.[2]?.toLowerCase() as 'runs' | 'wickets') || 'runs';
  });

  const handleMatchChange = (field: keyof Match, value: any) => {
    setMatch((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePerformanceChange = (index: number, field: string, value: any) => {
    const updated = [...performances];
    (updated[index] as any) = {
      ...(updated[index] || {}),
      [field]: value,
    };
    setPerformances(updated);
  };

  const handleAddPerformance = () => {
    setPerformances((prev) => [
      {
        matchId: '',
        playerId: '',
        playerName: '',
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
        },
      },
      ...prev,
    ]);
  };

  const handleRemovePerformance = (index: number) => {
    setPerformances((prev) => prev.filter((_, i) => i !== index));
  };

  const validateData = (): boolean => {
    if (!match.date || !match.opponent) {
      setError('Match date and opponent are required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateData()) return;
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const matchId = `match_${Date.now()}`;
      const now = new Date().toISOString();
      const { year, month } = getISTYearMonth(match.date || now);

      const completeMatch: Match = {
        id: matchId,
        date: match.date || now,
        year,
        month,
        opponent: match.opponent || 'TBD',
        venue: (match.venue as any) || 'Home',
        tossWonBy: (match.tossWonBy as any) || 'Us',
        tossDecision: (match.tossDecision as any) || 'bat',
        result: (match.result as any) || 'won',
        winMargin: winMarginValue ? `${winMarginValue} ${winMarginUnit}` : '',
        bestBatterId: match.bestBatterId || '',
        bestBatterName: match.bestBatterName || '',
        bestBatterRuns: match.bestBatterRuns || 0,
        bestBatterBalls: match.bestBatterBalls || 0,
        bestBowlerId: match.bestBowlerId || '',
        bestBowlerName: match.bestBowlerName || '',
        bestBowlerWickets: match.bestBowlerWickets || 0,
        bestBowlerRuns: match.bestBowlerRuns || 0,
        teamRuns: Number(match.teamRuns || 0),
        teamWickets: Number(match.teamWickets || 0),
        opponentRuns: Number(match.opponentRuns || 0),
        opponentWickets: Number(match.opponentWickets || 0),
        createdAt: now,
        topBatters: [],
        topBowlers: [],
      };

      const finalPerformances: Performance[] = [];

      for (const perf of performances) {
        if (perf.playerName) {
          const performanceId = `${matchId}_${perf.playerId || perf.playerName.replace(/\s+/g, '_')}`;
          const battingRuns = perf.batting?.runs || 0;
          const battingBalls = perf.batting?.balls || 0;
          const bowlingWickets = perf.bowling?.wickets || 0;
          const bowlingOvers = perf.bowling?.overs || 0;

          const completePerf: Performance = {
            id: performanceId,
            matchId,
            playerId: perf.playerId || `player_${perf.playerName.replace(/\s+/g, '_')}`,
            playerName: perf.playerName || '',
            date: completeMatch.date,
            year: completeMatch.year,
            month: completeMatch.month,
            opponent: completeMatch.opponent,
            batting: {
              ...(perf.batting || {}),
              runs: battingRuns,
              balls: battingBalls,
              fours: perf.batting?.fours || 0,
              sixes: perf.batting?.sixes || 0,
              dismissed: !!perf.batting?.dismissed,
              didBat: battingRuns > 0 || battingBalls > 0 || !!perf.batting?.dismissed,
              innings: battingRuns > 0 || battingBalls > 0 ? 1 : 0,
              isDuck: battingRuns === 0 && !!perf.batting?.dismissed,
              isThirty: battingRuns >= 30 && battingRuns < 50,
              isFifty: battingRuns >= 50 && battingRuns < 100,
              isHundred: battingRuns >= 100,
              strikeRate: battingBalls > 0 ? (battingRuns / battingBalls) * 100 : 0,
            },
            bowling: {
              ...(perf.bowling || {}),
              runs: perf.bowling?.runs || 0,
              wickets: bowlingWickets,
              overs: bowlingOvers,
              balls: Math.floor(bowlingOvers) * 6 + Math.round((bowlingOvers % 1) * 10),
              maidens: perf.bowling?.maidens || 0,
              didBowl: bowlingOvers > 0 || (perf.bowling?.runs || 0) > 0 || bowlingWickets > 0,
              innings: bowlingOvers > 0 ? 1 : 0,
              isThreeFer: bowlingWickets === 3,
              isFourFer: bowlingWickets === 4,
              isFiveFer: bowlingWickets >= 5,
              economy: bowlingOvers > 0 ? (perf.bowling?.runs || 0) / (Math.floor(bowlingOvers) + (bowlingOvers % 1) / 0.6) : 0,
            },
            createdAt: now,
          };
          finalPerformances.push(completePerf);
        }
      }

      // Update match top performers from final performances
      completeMatch.topBatters = findTopBatters(finalPerformances);
      completeMatch.topBowlers = findTopBowlers(finalPerformances);

      const result = await uploadManualMatchAction(completeMatch, finalPerformances);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save match data');
      }

      setSuccessMessage('Match data saved and stats updated successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg">
          {successMessage}
        </div>
      )}

      {/* Match Details */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
        <h3 className="section-title text-white mb-4 sm:mb-6">Match Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          <div>
            <label className="label-text mb-1.5 block">Match Date</label>
            <input
              type="date"
              value={match.date ? match.date.split('T')[0] : ''}
              onChange={(e) => handleMatchChange('date', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="input-base appearance-none"
            />
          </div>

          <div>
            <label className="label-text mb-1.5 block">Opponent</label>
            <input
              type="text"
              value={match.opponent || ''}
              onChange={(e) => handleMatchChange('opponent', e.target.value)}
              className="input-base"
            />
          </div>

          <div>
            <CustomSelect
              id="venue-select"
              label="Venue"
              value={match.venue || 'Home'}
              onChange={(value) => handleMatchChange('venue', value)}
              options={[
                { value: 'Home', label: 'Home' },
                { value: 'Away', label: 'Away' },
                { value: 'Neutral', label: 'Neutral' },
              ]}
              className="max-w-full"
            />
          </div>

          <div>
            <CustomSelect
              id="result-select"
              label="Result"
              value={match.result || 'won'}
              onChange={(value) => handleMatchChange('result', value)}
              options={[
                { value: 'won', label: 'Won' },
                { value: 'lost', label: 'Lost' },
                { value: 'tie', label: 'Tie' },
                { value: 'no_result', label: 'No Result' },
              ]}
              className="max-w-full"
            />
          </div>

          <div>
            <CustomSelect
              id="toss-select"
              label="Toss Won By"
              value={match.tossWonBy || 'Us'}
              onChange={(value) => handleMatchChange('tossWonBy', value)}
              options={[
                { value: 'Us', label: 'Us' },
                { value: 'Them', label: 'Them' },
              ]}
              className="max-w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Our Team Runs</label>
              <input
                type="number"
                value={match.teamRuns ?? ''}
                onChange={(e) => handleMatchChange('teamRuns', e.target.value)}
                placeholder="Runs"
                className="input-base"
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Our Team Wickets</label>
              <input
                type="number"
                value={match.teamWickets ?? ''}
                onChange={(e) => handleMatchChange('teamWickets', e.target.value)}
                placeholder="Wkts"
                className="input-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Opponent Runs</label>
              <input
                type="number"
                value={match.opponentRuns ?? ''}
                onChange={(e) => handleMatchChange('opponentRuns', e.target.value)}
                placeholder="Runs"
                onFocus={(e) => e.target.select()}
                className="input-base"
              />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Opponent Wickets</label>
              <input
                type="number"
                value={match.opponentWickets ?? ''}
                onChange={(e) => handleMatchChange('opponentWickets', e.target.value)}
                placeholder="Wkts"
                onFocus={(e) => e.target.select()}
                className="input-base"
              />
            </div>
          </div>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-text mb-1.5 block">Win Margin</label>
              <input
                type="number"
                min={0}
                value={winMarginValue}
                onChange={(e) => setWinMarginValue(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                onFocus={(e) => e.target.select()}
                className="input-base"
              />
            </div>
            <div>
              <CustomSelect
                id="margin-type-select"
                label="Margin Type"
                value={winMarginUnit}
                onChange={(value) => setWinMarginUnit(value as 'runs' | 'wickets')}
                options={[
                  { value: 'runs', label: 'Runs' },
                  { value: 'wickets', label: 'Wickets' },
                ]}
                className="max-w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Player Performances */}
      <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="section-title">Player Performances</h3>
          <button
            onClick={handleAddPerformance}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm sm:text-base transition-colors"
          >
            + Add Player
          </button>
        </div>

        <div className="space-y-4">
          {performances.map((perf, idx) => (
          <div key={idx} className="bg-background rounded-lg p-3 sm:p-4 border border-border">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm sm:text-base font-semibold">Player {idx + 1}</h4>
                <button
                  onClick={() => handleRemovePerformance(idx)}
                  className="px-2 py-1 sm:px-3 sm:py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-xs sm:text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                  <label className="label-text mb-1 block">Player Name</label>
                  <input
                    type="text"
                    value={perf.playerName || ''}
                    onChange={(e) => handlePerformanceChange(idx, 'playerName', e.target.value)}
                    className="input-base py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="label-text mb-1 block">Runs</label>
                  <input type="number" value={perf.batting?.runs ?? ''} placeholder="0" onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, runs: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">Balls</label>
                  <input type="number" value={perf.batting?.balls ?? ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, balls: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">4s</label>
                  <input type="number" value={perf.batting?.fours ?? ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, fours: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">6s</label>
                  <input type="number" value={perf.batting?.sixes ?? ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, sixes: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">Wkts</label>
                  <input type="number" value={perf.bowling?.wickets ?? ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, wickets: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">Overs</label>
                  <input type="text" value={perf.bowling?.overs ?? ''} placeholder="0" onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, overs: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>

                <div>
                  <label className="label-text mb-1 block">Runs Conceded</label>
                  <input type="number" value={perf.bowling?.runs ?? ''} placeholder="0" onFocus={(e) => e.target.select()} onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, runs: e.target.value })} className="input-base py-2 text-sm text-center" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
        <button
          onClick={onSuccess}
          className="btn-secondary w-full sm:w-auto"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full sm:w-auto"
        >
          {loading ? 'Saving...' : 'Save Match Data'}
        </button>
      </div>
    </div>
  );
}
