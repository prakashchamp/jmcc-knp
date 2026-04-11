'use client';

import { LiveMatch, InningsState, CurrentBatsman, CurrentBowler } from '@/app/lib/cricket-scorer-types';
import { formatBallDisplay, getBallColor } from '@/app/lib/ball-display-utils';

interface LiveScorecardProps {
  liveMatch: LiveMatch;
  isChasing?: boolean;
}

export function LiveScorecard({ liveMatch, isChasing }: LiveScorecardProps) {
  if (!liveMatch.innings || liveMatch.innings.length === 0) {
    return null;
  }

  const currentInnings = liveMatch.innings[liveMatch.currentInnings - 1];
  if (!currentInnings) return null;

  const totalBalls = currentInnings.totalBalls;
  const totalOvers = Math.floor(totalBalls / 6);
  const ballsInCurrentOver = totalBalls % 6;
  const displayOvers = `${totalOvers}.${ballsInCurrentOver}`;

  const requiredRunRate = currentInnings.requiredRunRate?.toFixed(2) || '0.00';
  const currentRunRate = currentInnings.totalBalls > 0 
    ? (currentInnings.totalRuns / (currentInnings.totalBalls / 6)).toFixed(2)
    : '0.00';

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6 space-y-6">
      {/* Header with Match Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isChasing ? '🎯 Chasing' : '🏏 Batting'} vs {liveMatch.opponent}
          </h2>
          <p className="text-slate-400 text-sm mt-1">{liveMatch.venue} • {liveMatch.format}</p>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <ScoreBox label="Runs" value={currentInnings.totalRuns} className="col-span-2 md:col-span-1" highlight />
        <ScoreBox label="Overs" value={displayOvers} className="col-span-2 md:col-span-1" highlight />
        <ScoreBox label="Wickets" value={`${currentInnings.totalWickets}/${10 - currentInnings.totalWickets}`} />
        <ScoreBox label="CRR" value={currentRunRate} subtext="runs/over" />
        <ScoreBox
          label={isChasing ? 'Required' : 'Target'}
          value={isChasing ? currentInnings.requiredRunRate?.toFixed(1) || '-' : liveMatch.totalOvers}
          subtext={isChasing ? 'runs/over' : 'overs'}
        />
      </div>

      {/* Display Target if Chasing */}
      {isChasing && currentInnings.target && (
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-slate-400 text-sm">Target</p>
              <p className="text-2xl font-bold text-blue-300">{currentInnings.target}</p>
            </div>
            <div className="text-center border-l border-r border-slate-600">
              <p className="text-slate-400 text-sm">Need</p>
              <p className="text-2xl font-bold text-blue-300">
                {Math.max(0, currentInnings.target - currentInnings.totalRuns)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-blue-300">
                {Math.max(0, (liveMatch.totalOvers * 6) - currentInnings.totalBalls)} balls
              </p>
            </div>
          </div>
        </div>
      )}

      {/* This Over Breakdown */}
      <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase mb-3">This Over #{Math.floor(totalBalls / 6) + 1}</h3>
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => {
            const ball = currentInnings.ballHistory.find(
              (b) => b.over === Math.floor(totalBalls / 6) && b.ball === i
            );
            return (
              <div
                key={i}
                className={`flex-1 aspect-square rounded flex items-center justify-center font-bold text-sm ${
                  i < ballsInCurrentOver
                    ? getBallColor(ball as any)
                    : 'bg-slate-600 text-slate-500'
                }`}
              >
                {i < ballsInCurrentOver && ball ? formatBallDisplay(ball as any) : '-'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Batsmen */}
      {currentInnings.striker && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Batsmen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BatsmanCard batsman={currentInnings.striker} role="Striker" highlight />
            {currentInnings.nonStriker && <BatsmanCard batsman={currentInnings.nonStriker} role="Non-Striker" />}
          </div>
        </div>
      )}

      {/* Current Bowler */}
      {currentInnings.currentBowler && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Bowler</h3>
          <BowlerCard bowler={currentInnings.currentBowler} />
        </div>
      )}

      {/* Dismissed Batsmen */}
      {currentInnings.dismissedBatsmen && currentInnings.dismissedBatsmen.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
            Out ({currentInnings.dismissedBatsmen.length})
          </h3>
          <div className="space-y-2">
            {currentInnings.dismissedBatsmen.slice(0, 3).map((batsman) => (
              <div key={batsman.id} className="flex justify-between items-center bg-red-900/20 border border-red-700 rounded px-3 py-2">
                <span className="text-sm text-red-200">{batsman.name}</span>
                <span className="text-sm font-semibold text-red-300">{batsman.runs}({batsman.balls})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components

interface ScoreBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  highlight?: boolean;
  className?: string;
}

function ScoreBox({ label, value, subtext, highlight, className = '' }: ScoreBoxProps) {
  return (
    <div className={`${className} ${highlight ? 'bg-blue-900 border-blue-400' : 'bg-slate-700/50 border-slate-600'} border rounded-lg p-3 text-center`}>
      <p className="text-xs sm:text-sm font-semibold text-slate-300 uppercase">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold ${highlight ? 'text-blue-300' : 'text-white'}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
  );
}

interface BatsmanCardProps {
  batsman: CurrentBatsman;
  role: 'Striker' | 'Non-Striker';
  highlight?: boolean;
}

function BatsmanCard({ batsman, role, highlight }: BatsmanCardProps) {
  return (
    <div
      className={`border rounded-lg p-4 ${
        highlight ? 'bg-green-900/20 border-green-500' : 'bg-slate-700/30 border-slate-600'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase">{role}</p>
          <p className={`text-lg font-bold ${highlight ? 'text-green-300' : 'text-slate-200'}`}>
            {batsman.name}
            {batsman.jerseyNumber && <span className="text-sm ml-2 text-slate-400">#{batsman.jerseyNumber}</span>}
          </p>
        </div>
        <span className="text-2xl font-bold text-green-400">{batsman.runs}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Balls</p>
          <p className="font-semibold text-slate-200">{batsman.balls}</p>
        </div>
        <div>
          <p className="text-slate-400">SR</p>
          <p className="font-semibold text-slate-200">{batsman.strikeRate.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-slate-400">4s • 6s</p>
          <p className="font-semibold text-slate-200">{batsman.fours} • {batsman.sixes}</p>
        </div>
      </div>
    </div>
  );
}

interface BowlerCardProps {
  bowler: CurrentBowler;
}

function BowlerCard({ bowler }: BowlerCardProps) {
  return (
    <div className="border border-slate-600 rounded-lg p-4 bg-slate-700/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase">Current Bowler</p>
          <p className="text-lg font-bold text-slate-200">
            {bowler.name}
            {bowler.jerseyNumber && <span className="text-sm ml-2 text-slate-400">#{bowler.jerseyNumber}</span>}
          </p>
        </div>
        <span className="text-2xl font-bold text-orange-400">{bowler.wickets}W</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-slate-400">Overs</p>
          <p className="font-semibold text-slate-200">{bowler.overs}.{bowler.balls}</p>
        </div>
        <div>
          <p className="text-slate-400">Runs</p>
          <p className="font-semibold text-slate-200">{bowler.runs}</p>
        </div>
        <div>
          <p className="text-slate-400">Econ</p>
          <p className="font-semibold text-slate-200">{bowler.economy.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400">Maiden</p>
          <p className="font-semibold text-slate-200">{bowler.maidens}</p>
        </div>
      </div>
    </div>
  );
}
