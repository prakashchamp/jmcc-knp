'use client';

import { useState } from 'react';
import { Match, Performance } from '@/app/lib/cricket-schema';
import { setDocument } from '@/services/firebase/operations';

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
      ...prev,
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

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      // Generate IDs and timestamps
      const matchId = `match_${Date.now()}`;
      const now = new Date().toISOString();
      const dateObj = new Date(match.date || now);

      const completeMatch: Match = {
        id: matchId,
        date: match.date || now,
        year: dateObj.getFullYear().toString(),
        month: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`,
        opponent: match.opponent || 'TBD',
        venue: (match.venue as any) || 'Home',
        tossWonBy: (match.tossWonBy as any) || 'Us',
        tossDecision: (match.tossDecision as any) || 'bat',
        result: (match.result as any) || 'won',
        winMargin: match.winMargin || '',
        bestBatterId: match.bestBatterId || '',
        bestBatterName: match.bestBatterName || '',
        bestBatterRuns: match.bestBatterRuns || 0,
        bestBatterBalls: match.bestBatterBalls || 0,
        bestBowlerId: match.bestBowlerId || '',
        bestBowlerName: match.bestBowlerName || '',
        bestBowlerWickets: match.bestBowlerWickets || 0,
        bestBowlerRuns: match.bestBowlerRuns || 0,
        createdAt: now,
      };

      // Save match
      await setDocument('matches', matchId, completeMatch);

      // Save performances
      for (const perf of performances) {
        if (perf.playerName) {
          const performanceId = `${matchId}_${perf.playerId || perf.playerName}`;
          const completePerf: Performance = {
            id: performanceId,
            matchId,
            playerId: perf.playerId || `player_${perf.playerName}`,
            playerName: perf.playerName || '',
            date: completeMatch.date,
            year: completeMatch.year,
            month: completeMatch.month,
            opponent: completeMatch.opponent,
            batting: perf.batting || {
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
            bowling: perf.bowling || {
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
            createdAt: now,
          };

          await setDocument('performances', performanceId, completePerf);
        }
      }

      setSuccessMessage('Match data saved successfully!');
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
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-2xl font-semibold text-white mb-6">Match Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Match Date</label>
            <input
              type="date"
              value={match.date ? new Date(match.date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleMatchChange('date', new Date(e.target.value).toISOString())}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Opponent</label>
            <input
              type="text"
              value={match.opponent || ''}
              onChange={(e) => handleMatchChange('opponent', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Venue</label>
            <select
              value={match.venue || 'Home'}
              onChange={(e) => handleMatchChange('venue', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Result</label>
            <select
              value={match.result || 'won'}
              onChange={(e) => handleMatchChange('result', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="tie">Tie</option>
              <option value="no_result">No Result</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Best Batter</label>
            <input
              type="text"
              value={match.bestBatterName || ''}
              onChange={(e) => handleMatchChange('bestBatterName', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Best Bowler</label>
            <input
              type="text"
              value={match.bestBowlerName || ''}
              onChange={(e) => handleMatchChange('bestBowlerName', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Best Batter Runs</label>
            <input
              type="number"
              value={match.bestBatterRuns || 0}
              onChange={(e) => handleMatchChange('bestBatterRuns', parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Best Bowler Wickets</label>
            <input
              type="number"
              value={match.bestBowlerWickets || 0}
              onChange={(e) => handleMatchChange('bestBowlerWickets', parseInt(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Win Margin</label>
            <input
              type="text"
              value={match.winMargin || ''}
              onChange={(e) => handleMatchChange('winMargin', e.target.value)}
              placeholder="e.g., 24 runs, 5 wickets"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Player Performances */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-white">Player Performances</h3>
          <button
            onClick={handleAddPerformance}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            + Add Player
          </button>
        </div>

        <div className="space-y-4">
          {performances.map((perf, idx) => (
            <div key={idx} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-white">Player {idx + 1}</h4>
                <button
                  onClick={() => handleRemovePerformance(idx)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Player Name</label>
                  <input
                    type="text"
                    value={perf.playerName || ''}
                    onChange={(e) => handlePerformanceChange(idx, 'playerName', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Runs</label>
                  <input
                    type="number"
                    value={perf.batting?.runs || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, runs: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Balls</label>
                  <input
                    type="number"
                    value={perf.batting?.balls || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, balls: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Fours</label>
                  <input
                    type="number"
                    value={perf.batting?.fours || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, fours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Sixes</label>
                  <input
                    type="number"
                    value={perf.batting?.sixes || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'batting', { ...perf.batting, sixes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Wickets</label>
                  <input
                    type="number"
                    value={perf.bowling?.wickets || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, wickets: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Overs</label>
                  <input
                    type="text"
                    value={perf.bowling?.overs || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, overs: parseFloat(e.target.value) })}
                    placeholder="e.g., 4 or 4.2"
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Runs Conceded</label>
                  <input
                    type="number"
                    value={perf.bowling?.runs || 0}
                    onChange={(e) => handlePerformanceChange(idx, 'bowling', { ...perf.bowling, runs: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white text-sm rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        <button
          onClick={onSuccess}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Saving...' : 'Save Match Data'}
        </button>
      </div>
    </div>
  );
}
