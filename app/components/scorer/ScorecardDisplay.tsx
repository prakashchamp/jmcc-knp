'use client';

import { LiveMatch, TeamPlayer } from '@/app/lib/cricket-scorer-types';
import { getPlayerCurrentStats } from '@/app/lib/stats-calculator';

interface ScorecardDisplayProps {
  liveMatch: LiveMatch;
  teamPlayers: TeamPlayer[];
}

/**
 * Scorecard Display Component
 * Shows current match score and player stats
 */
export function ScorecardDisplay({ liveMatch, teamPlayers }: ScorecardDisplayProps) {
  // Get current innings ball history
  const currentInningsIndex = liveMatch.currentInnings - 1;
  const currentInnings = liveMatch.innings && liveMatch.innings[currentInningsIndex] ? liveMatch.innings[currentInningsIndex] : null;
  const ballHistory = currentInnings ? currentInnings.ballHistory : [];

  // Calculate current overs and balls
  const totalBalls = ballHistory.length;
  const overs = Math.floor(totalBalls / 6);
  const balls = totalBalls % 6;

  // Calculate runs
  let totalRuns = 0;
  let wicketsLost = 0;

  ballHistory.forEach((ball) => {
    totalRuns += ball.runs.batter;
    if (ball.extra) {
      totalRuns += ball.runs.extras;
    }
    if (ball.isWicket && ball.dismissal?.playerOut) {
      wicketsLost += 1;
    }
  });

  // Get player stats
  const playerStats = teamPlayers.map((player) => {
    const stats = getPlayerCurrentStats(ballHistory, player.name, teamPlayers);
    return {
      player,
      stats,
    };
  });

  return (
    <div className="space-y-4">
      {/* Match Header */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-400">{totalRuns}</div>
            <div className="text-xs text-slate-400">Runs</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-red-400">{wicketsLost}</div>
            <div className="text-xs text-slate-400">Wickets</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-blue-400">
              {overs}.{balls}
            </div>
            <div className="text-xs text-slate-400">Overs</div>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-300 text-center">
          <div>{liveMatch.opponent}</div>
          <div className="text-slate-400">@{liveMatch.venue}</div>
        </div>
      </div>

      {/* Recent Balls */}
      {ballHistory.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-sm font-semibold mb-2">Recent Deliveries</div>
          <div className="flex gap-1 flex-wrap">
            {ballHistory.slice(-18).map((ball, idx) => {
              let displayRuns = ball.runs.batter.toString();
              if (ball.extra) {
                displayRuns = (ball.runs.batter + ball.runs.extras).toString();
              }
              if (ball.isWicket) {
                displayRuns = 'W';
              }

              return (
                <div
                  key={idx}
                  className={`w-8 h-8 flex items-center justify-center rounded font-semibold text-xs ${displayRuns === 'W'
                      ? 'bg-red-600 text-white'
                      : parseInt(displayRuns) === 0
                        ? 'bg-slate-600 text-slate-300'
                        : parseInt(displayRuns) >= 4
                          ? 'bg-green-600 text-white'
                          : 'bg-blue-600 text-white'
                  }`}
                  title={`${ball.over}.${ball.ball}: ${ball.batter.name} vs ${ball.bowler.name}`}
                >
                  {displayRuns}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Player Stats */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-sm font-semibold mb-3">Player Stats</div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {playerStats.map(({ player, stats }) => (
            <div key={player.id} className="bg-slate-700 p-3 rounded text-xs">
              <div className="font-semibold">{player.name}</div>

              {stats ? (
                <div className="grid grid-cols-2 gap-2 mt-2 text-slate-300">
                  <div>
                    <span className="text-slate-400">Batting: </span>
                    <span>
                      {stats.batting.runs}/{stats.batting.balls}
                      {stats.batting.isOut ? ' (out)' : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">SR: </span>
                    <span>{stats.batting.strikeRate.toFixed(1)}</span>
                  </div>

                  {stats.bowling.balls > 0 && (
                    <>
                      <div>
                        <span className="text-slate-400">Bowling: </span>
                        <span>{stats.bowling.overs}.{stats.bowling.balls}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Runs: </span>
                        <span>
                          {stats.bowling.runs}/{stats.bowling.wickets} (0s: {stats.bowling.zeros >= 0 ? stats.bowling.zeros : '-'})
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 mt-1">No activity</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Status Info */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Innings: {liveMatch.currentInnings}</span>
          <span>Format: {liveMatch.format}</span>
          <span>Total Overs: {liveMatch.totalOvers}</span>
        </div>
      </div>
    </div>
  );
}
