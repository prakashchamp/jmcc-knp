'use client';

import { useState, useEffect } from 'react';
import { LiveMatch, TeamPlayer, Ball } from '@/app/lib/cricket-scorer-types';
import { Performance } from '@/app/lib/cricket-schema';
import { calculatePerformances } from '@/app/lib/stats-calculator';
import { batchWriteServerAction } from '@/app/lib/actions/firebase-actions';
import Link from 'next/link';
import { Header } from '@/app/components/Header';

const STORAGE_KEY = 'jmcc_live_match_draft';

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

      const extractedPlayers: TeamPlayer[] = [];
      setTeamPlayers(extractedPlayers);

      const allBalls = draft.innings.reduce((acc, inn) => [...acc, ...inn.ballHistory], [] as Ball[]);

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

      const result = await batchWriteServerAction(operations);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `Match saved! ${performances.length} performances recorded.`,
        });

        setTimeout(() => {
          sessionStorage.removeItem(STORAGE_KEY);
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-400">Loading match data...</p>
        </div>
      </div>
    );
  }

  if (!liveMatch) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <main className="page-container flex flex-col items-center justify-center py-20">
          <h1 className="page-title text-white mb-4">No Match Found</h1>
          <p className="hint-text mb-8 text-center max-w-md">Please complete a match before reviewing. Data is stored in your session.</p>
          <Link href="/scorer" className="btn-primary">
            Go to Scorer
          </Link>
        </main>
      </div>
    );
  }

  const allBalls = liveMatch.innings.reduce((acc, inn) => [...acc, ...inn.ballHistory], [] as Ball[]);
  const totalRuns = allBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
  const totalWickets = allBalls.filter((b) => b.isWicket).length;
  const totalBallsCount = allBalls.length;
  const overs = Math.floor(totalBallsCount / 6);
  const balls = totalBallsCount % 6;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <main className="page-container">
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title text-white">Match Review</h1>
          <p className="hint-text mt-1 sm:mt-2">
            {liveMatch.opponent} @ {liveMatch.venue} • {liveMatch.format}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border text-sm sm:text-base ${
              message.type === 'success'
                ? 'bg-green-900/50 border-green-700 text-green-200'
                : 'bg-red-900/50 border-red-700 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Match Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Runs</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-400">{totalRuns}</div>
          </div>

          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Wickets</div>
            <div className="text-2xl sm:text-3xl font-bold text-red-400">{totalWickets}</div>
          </div>

          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Overs</div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-400">
              {overs}.{balls}
            </div>
          </div>

          <div className="bg-gray-800 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Result</div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-400 capitalize truncate">
              {liveMatch.result || 'TBD'}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="section-title text-white mb-4">Match Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Format</span>
              <span className="text-white font-medium">{liveMatch.format}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Total Overs</span>
              <span className="text-white font-medium">{liveMatch.totalOvers}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Toss Won By</span>
              <span className="text-white font-medium">{liveMatch.tossWonBy}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Decision</span>
              <span className="text-white font-medium capitalize">{liveMatch.tossDecision}</span>
            </div>
          </div>
        </div>

        {/* Performances Table */}
        {performances.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 sm:mb-8">
            <h2 className="section-title text-white p-4 sm:p-6 border-b border-gray-700">Player Statistics</h2>
            <div className="table-scroll">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-gray-700/50">
                  <tr className="text-gray-400">
                    <th className="text-left py-3 px-4 font-semibold">Player</th>
                    <th className="text-center py-3 px-3 font-semibold">Runs</th>
                    <th className="text-center py-3 px-3 font-semibold">Balls</th>
                    <th className="text-center py-3 px-3 font-semibold">SR</th>
                    <th className="text-center py-3 px-3 font-semibold">4s</th>
                    <th className="text-center py-3 px-3 font-semibold">6s</th>
                    <th className="text-center py-3 px-3 font-semibold border-l border-gray-700">Overs</th>
                    <th className="text-center py-3 px-3 font-semibold">Runs</th>
                    <th className="text-center py-3 px-3 font-semibold">Wkts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {performances.map((perf) => (
                    <tr key={perf.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{perf.playerName}</td>
                      <td className="py-3 px-3 text-center text-blue-300">{perf.batting.runs}</td>
                      <td className="py-3 px-3 text-center text-gray-400">{perf.batting.balls}</td>
                      <td className="py-3 px-3 text-center text-gray-400">
                        {perf.batting.strikeRate.toFixed(1)}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-400">{perf.batting.fours}</td>
                      <td className="py-3 px-3 text-center text-gray-400">{perf.batting.sixes}</td>
                      <td className="py-3 px-3 text-center text-gray-400 border-l border-gray-700">
                        {perf.bowling.overs}.{perf.bowling.balls}
                      </td>
                      <td className="py-3 px-3 text-center text-gray-400">
                        {perf.bowling.runs}
                      </td>
                      <td className="py-3 px-3 text-center text-red-300 font-semibold">
                        {perf.bowling.wickets}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ball History */}
        {allBalls.length > 0 && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6 sm:mb-8">
            <h2 className="section-title text-white p-4 sm:p-6 border-b border-gray-700">Ball-by-Ball Details</h2>
            <div className="table-scroll max-h-[500px]">
              <table className="w-full text-[10px] sm:text-xs">
                <thead className="bg-gray-700/50 sticky top-0 z-10">
                  <tr className="text-gray-400">
                    <th className="text-left py-2 px-4 font-semibold">Over.Ball</th>
                    <th className="text-left py-2 px-2 font-semibold">Batter</th>
                    <th className="text-left py-2 px-2 font-semibold">Bowler</th>
                    <th className="text-center py-2 px-2 font-semibold">Runs</th>
                    <th className="text-left py-2 px-2 font-semibold">Extras</th>
                    <th className="text-left py-2 px-2 font-semibold">Wicket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {allBalls.map((ball, idx) => (
                    <tr key={idx} className="hover:bg-gray-700/30 transition-colors">
                      <td className="py-2 px-4 font-mono text-blue-400">{ball.over}.{ball.ball}</td>
                      <td className="py-2 px-2 text-white font-medium">{ball.batter.name}</td>
                      <td className="py-2 px-2 text-gray-400">{ball.bowler.name}</td>
                      <td className="py-2 px-2 text-center font-bold text-white">{ball.runs.batter}</td>
                      <td className="py-2 px-2 text-gray-400">
                        {ball.extra ? `${ball.extra.type} +${ball.runs.extras}` : '-'}
                      </td>
                      <td className="py-2 px-2">
                        {ball.isWicket && ball.dismissal ? (
                          <span className="text-red-400 font-bold">
                            {ball.dismissal.playerOut.name} ({ball.dismissal.mode})
                          </span>
                        ) : (
                          <span className="text-gray-600">-</span>
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={handleSaveMatch}
            disabled={saving || performances.length === 0}
            className="btn-primary flex-1 py-4 text-lg"
          >
            {saving ? 'Saving...' : 'Save to Firestore'}
          </button>

          <Link
            href="/scorer"
            className="btn-secondary flex-1 py-4 text-lg flex items-center justify-center"
          >
            Continue Scoring
          </Link>
        </div>

        {/* Info */}
        <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-800/50 text-xs sm:text-sm text-blue-200">
          <p className="flex items-center gap-2">
            <span className="text-lg">💾</span>
            This will save the match and {performances.length} player performance records to Firestore.
            The draft will be cleared after successful save.
          </p>
        </div>
      </main>
    </div>
  );
}
