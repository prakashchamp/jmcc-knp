'use client';

import { useState, useEffect } from 'react';
import { LiveMatch, TeamPlayer, Ball } from '@/app/lib/cricket-scorer-types';
import { Performance } from '@/app/lib/cricket-schema';
import { calculatePerformances } from '@/app/lib/stats-calculator';
import { batchWriteServerAction } from '@/app/lib/actions/firebase-actions';
import Link from 'next/link';

const STORAGE_KEY = 'jmcc_live_match_draft';

/**
 * Match Review & Save Page
 * Review calculated stats and save match + performances to Firestore
 */
export default function MatchReviewPage() {
  const [liveMatch, setLiveMatch] = useState<LiveMatch | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load draft match on mount
  useEffect(() => {
    try {
      const draftJson = sessionStorage.getItem(STORAGE_KEY);
      if (!draftJson) {
        setMessage({ type: 'error', text: 'No match found. Please complete a match first.' });
        setLoading(false);
        return;
      }

      const draft = JSON.parse(draftJson) as LiveMatch;
      setLiveMatch(draft);

      // Simulate loading team players (in real app, would fetch from Firestore)
      // For now, extract from performance IDs or use placeholder
      const extractedPlayers: TeamPlayer[] = [];
      // This would normally come from the team selection flow
      // For now we'll create placeholder players to show the pattern
      setTeamPlayers(extractedPlayers);

      // Aggregate ballHistory from all innings
      const allBalls = draft.innings.reduce((acc, inn) => [...acc, ...inn.ballHistory], [] as Ball[]);

      // Calculate performances
      if (allBalls.length > 0) {
        const matchId = draft.matchId || `temp_${Date.now()}`;
        const calcs = calculatePerformances(
          allBalls,
          extractedPlayers,
          matchId,
          draft.opponent,
          draft.createdAt,
          draft.currentInnings
        );
        setPerformances(calcs);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load match data' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle save to Firestore
  const handleSaveMatch = async () => {
    if (!liveMatch) {
      setMessage({ type: 'error', text: 'No match data' });
      return;
    }

    if (performances.length === 0) {
      setMessage({ type: 'error', text: 'No performances to save' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const matchId = liveMatch.matchId || `match_${Date.now()}`;

      // Prepare Match document for Firestore
      const matchDoc = {
        id: matchId,
        date: liveMatch.createdAt,
        year: new Date(liveMatch.createdAt).getUTCFullYear().toString(),
        month: String(new Date(liveMatch.createdAt).getUTCMonth() + 1).padStart(2, '0'),
        opponent: liveMatch.opponent,
        venue: liveMatch.venue,
        tossWonBy: liveMatch.tossWonBy,
        tossDecision: liveMatch.tossDecision,
        result: liveMatch.result || 'no_result',
        winMargin: liveMatch.winMargin,
        matchFormat: liveMatch.format,
        totalOvers: liveMatch.totalOvers,
        ballHistory: liveMatch.innings.reduce((acc, inn) => [...acc, ...inn.ballHistory], [] as Ball[]),
        scorerInitiatedFrom: 'scorer-app' as const,
        createdAt: new Date().toISOString(),
      };

      // Prepare batch operations
      const operations = [
        {
          type: 'set' as const,
          collection: 'matches',
          id: matchId,
          data: matchDoc,
          options: { merge: false },
        },
        ...performances.map((perf) => ({
          type: 'set' as const,
          collection: 'performances',
          id: perf.id,
          data: perf,
          options: { merge: false },
        })),
      ];

      // Execute batch write
      const result = await batchWriteServerAction(operations);

      // Check if all succeeded
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Match saved! ${performances.length} performances recorded.`,
        });

        // Clear draft after successful save
        setTimeout(() => {
          sessionStorage.removeItem(STORAGE_KEY);
          // Redirect to match view
          window.location.href = '/stats/team-stats';
        }, 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Some data failed to save. Please try again.' });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-white"></div>
          <p className="mt-4">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!liveMatch) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">No Match Found</h1>
          <p className="text-slate-400 mb-6">Please complete a match before reviewing.</p>
          <Link href="/scorer" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">
            Go to Scorer
          </Link>
        </div>
      </div>
    );
  }

  // Aggregate balls for summary
  const allBalls = liveMatch.innings.reduce((acc, inn) => [...acc, ...inn.ballHistory], [] as Ball[]);

  // Calculate totals
  const totalRuns = allBalls.reduce((sum, ball) => {
    return sum + ball.runs.total;
  }, 0);

  const totalWickets = allBalls.filter((b) => b.isWicket).length;
  const totalBallsCount = allBalls.length;
  const overs = Math.floor(totalBallsCount / 6);
  const balls = totalBallsCount % 6;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Match Review</h1>
          <p className="text-slate-400">
            {liveMatch.opponent} @ {liveMatch.venue} • {liveMatch.format}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900 text-green-100'
                : 'bg-red-900 text-red-100'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Match Summary */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold mb-4">Match Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="text-sm text-slate-400">Runs</div>
              <div className="text-3xl font-bold text-green-400">{totalRuns}</div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="text-sm text-slate-400">Wickets</div>
              <div className="text-3xl font-bold text-red-400">{totalWickets}</div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="text-sm text-slate-400">Overs</div>
              <div className="text-3xl font-bold text-blue-400">
                {overs}.{balls}
              </div>
            </div>

            <div className="bg-slate-700 p-4 rounded-lg">
              <div className="text-sm text-slate-400">Result</div>
              <div className="text-3xl font-bold text-purple-400 capitalize">
                {liveMatch.result || 'TBD'}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-slate-400">Format:</span>
              <span className="ml-2 font-semibold">{liveMatch.format}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Overs:</span>
              <span className="ml-2 font-semibold">{liveMatch.totalOvers}</span>
            </div>
            <div>
              <span className="text-slate-400">Toss Won By:</span>
              <span className="ml-2 font-semibold">{liveMatch.tossWonBy}</span>
            </div>
            <div>
              <span className="text-slate-400">Decision:</span>
              <span className="ml-2 font-semibold capitalize">{liveMatch.tossDecision}</span>
            </div>
          </div>
        </div>

        {/* Performances Table */}
        {performances.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Player Statistics</h2>

            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr className="text-slate-400">
                  <th className="text-left py-3 px-3">Player</th>
                  <th className="text-center py-3 px-3">Runs</th>
                  <th className="text-center py-3 px-3">Balls</th>
                  <th className="text-center py-3 px-3">SR</th>
                  <th className="text-center py-3 px-3">4s</th>
                  <th className="text-center py-3 px-3">6s</th>
                  <th className="text-center py-3 px-3">Overs</th>
                  <th className="text-center py-3 px-3">Runs</th>
                  <th className="text-center py-3 px-3">Wkts</th>
                </tr>
              </thead>
              <tbody>
                {performances.map((perf) => (
                  <tr key={perf.id} className="border-b border-slate-700 hover:bg-slate-700">
                    <td className="py-3 px-3 font-semibold">{perf.playerName}</td>
                    {/* Batting */}
                    <td className="py-3 px-3 text-center">{perf.batting.runs}</td>
                    <td className="py-3 px-3 text-center">{perf.batting.balls}</td>
                    <td className="py-3 px-3 text-center">
                      {perf.batting.strikeRate.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-center">{perf.batting.fours}</td>
                    <td className="py-3 px-3 text-center">{perf.batting.sixes}</td>
                    {/* Bowling */}
                    <td className="py-3 px-3 text-center text-slate-400">
                      {perf.bowling.overs}.{perf.bowling.balls}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {perf.bowling.runs}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {perf.bowling.wickets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ball History */}
        {allBalls.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6 overflow-x-auto">
            <h2 className="text-xl font-bold mb-4">Ball-by-Ball Details</h2>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-slate-700 sticky top-0 bg-slate-800">
                  <tr className="text-slate-400">
                    <th className="text-left py-2 px-2">Over.Ball</th>
                    <th className="text-left py-2 px-2">Batter</th>
                    <th className="text-left py-2 px-2">Bowler</th>
                    <th className="text-center py-2 px-2">Runs</th>
                    <th className="text-left py-2 px-2">Extras</th>
                    <th className="text-left py-2 px-2">Wicket</th>
                  </tr>
                </thead>
                <tbody>
                  {allBalls.map((ball, idx) => (
                    <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="py-2 px-2 font-mono">{ball.over}.{ball.ball}</td>
                      <td className="py-2 px-2">{ball.batter.name}</td>
                      <td className="py-2 px-2 text-slate-400">{ball.bowler.name}</td>
                      <td className="py-2 px-2 text-center font-semibold">{ball.runs.batter}</td>
                      <td className="py-2 px-2">
                        {ball.extra ? `${ball.extra.type} +${ball.runs.extras}` : '-'}
                      </td>
                      <td className="py-2 px-2">
                        {ball.isWicket && ball.dismissal ? (
                          <span className="text-red-400 font-semibold">
                            {ball.dismissal.playerOut.name} ({ball.dismissal.mode})
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleSaveMatch}
            disabled={saving || performances.length === 0}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save to Firestore'}
          </button>

          <Link
            href="/scorer"
            className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-center transition-colors"
          >
            Continue Scoring
          </Link>
        </div>

        {/* Info */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-sm text-slate-300">
          <p>
            💾 This will save the match and {performances.length} player performance records to Firestore.
            Clear session storage after save.
          </p>
        </div>
      </div>
    </div>
  );
}
