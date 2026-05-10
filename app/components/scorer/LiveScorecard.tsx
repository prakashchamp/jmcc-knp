'use client';

import { LiveMatch, InningsState, CurrentBatsman, CurrentBowler } from '@/app/lib/cricket-scorer-types';
import { formatBallDisplay, getBallColor } from '@/app/lib/ball-display-utils';
import { calcEconomy } from '@/app/lib/bowling-stats-utils';

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
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      {/* Header with Match Info */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">
            {isChasing ? '🎯 Chasing' : '🏏 Batting'} vs {liveMatch.opponent}
          </h2>
          <p className="opacity-60 text-sm mt-1">{liveMatch.venue} • {liveMatch.format}</p>
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
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="opacity-60 text-sm">Target</p>
              <p className="text-2xl font-bold text-blue-600">{currentInnings.target}</p>
            </div>
            <div className="text-center border-l border-r border-border">
              <p className="opacity-60 text-sm">Need</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.max(0, currentInnings.target - currentInnings.totalRuns)}
              </p>
            </div>
            <div className="text-center">
              <p className="opacity-60 text-sm">Remaining</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.max(0, (liveMatch.totalOvers * 6) - currentInnings.totalBalls)} balls
              </p>
            </div>
          </div>
        </div>
      )}

      {/* This Over Breakdown */}
      <div className="bg-background/50 border border-border rounded-lg p-4">
        <h3 className="text-xs font-semibold opacity-60 uppercase mb-3">This Over #{Math.floor(totalBalls / 6) + 1}</h3>
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
                    : 'bg-background border border-border opacity-40'
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
          <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wide">Batsmen</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BatsmanCard batsman={currentInnings.striker} role="Striker" highlight />
            {currentInnings.nonStriker && <BatsmanCard batsman={currentInnings.nonStriker} role="Non-Striker" />}
          </div>
        </div>
      )}

      {/* Current Bowler */}
      {currentInnings.currentBowler && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wide">Bowler</h3>
          <BowlerCard bowler={currentInnings.currentBowler} />
        </div>
      )}

      {/* Dismissed Batsmen */}
      {currentInnings.dismissedBatsmen && currentInnings.dismissedBatsmen.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold opacity-80 uppercase tracking-wide">
            Out ({currentInnings.dismissedBatsmen.length})
          </h3>
          <div className="space-y-2">
            {currentInnings.dismissedBatsmen.slice(0, 3).map((batsman) => (
              <div key={batsman.id} className="flex justify-between items-center bg-red-500/10 border border-red-500/50 rounded px-3 py-2">
                <span className="text-sm text-red-600">{batsman.name}</span>
                <span className="text-sm font-semibold text-red-700">{batsman.runs}({batsman.balls})</span>
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
    <div className={`${className} ${highlight ? 'bg-blue-600 border-blue-400 text-white' : 'bg-background/50 border-border'} border rounded-lg p-3 text-center`}>
      <p className={`text-xs sm:text-sm font-semibold uppercase ${highlight ? 'text-blue-100' : 'opacity-60'}`}>{label}</p>
      <p className={`text-lg sm:text-2xl font-bold ${highlight ? 'text-white' : 'text-foreground'}`}>{value}</p>
      {subtext && <p className={`text-xs mt-1 ${highlight ? 'text-blue-100' : 'opacity-60'}`}>{subtext}</p>}
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
        highlight ? 'bg-green-500/10 border-green-500' : 'bg-background/30 border-border'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-semibold opacity-60 uppercase">{role}</p>
          <p className={`text-lg font-bold ${highlight ? 'text-green-600' : 'text-foreground'}`}>
            {batsman.name}
            {batsman.jerseyNumber && <span className="text-sm ml-2 opacity-60">#{batsman.jerseyNumber}</span>}
          </p>
        </div>
        <span className="text-2xl font-bold text-green-600">{batsman.runs}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="opacity-60">Balls</p>
          <p className="font-semibold">{batsman.balls}</p>
        </div>
        <div>
          <p className="opacity-60">SR</p>
          <p className="font-semibold">{batsman.strikeRate.toFixed(1)}</p>
        </div>
        <div>
          <p className="opacity-60">4s • 6s</p>
          <p className="font-semibold">{batsman.fours} • {batsman.sixes}</p>
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
    <div className="border border-border rounded-lg p-4 bg-background/30">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs font-semibold opacity-60 uppercase">Current Bowler</p>
          <p className="text-lg font-bold">
            {bowler.name}
            {bowler.jerseyNumber && <span className="text-sm ml-2 opacity-60">#{bowler.jerseyNumber}</span>}
          </p>
        </div>
        <span className="text-2xl font-bold text-amber-600">{bowler.wickets}W</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div>
          <p className="opacity-60">Overs</p>
          <p className="font-semibold">{bowler.overs}.{bowler.balls}</p>
        </div>
        <div>
          <p className="opacity-60">Runs</p>
          <p className="font-semibold">{bowler.runs}</p>
        </div>
        <div>
          <p className="opacity-60">Econ</p>
          <p className="font-semibold">{calcEconomy(bowler.runs, (bowler.overs * 6) + bowler.balls).toFixed(2)}</p>
        </div>
        <div>
          <p className="opacity-60">Maiden</p>
          <p className="font-semibold">{bowler.maidens}</p>
        </div>
      </div>
    </div>
  );
}
