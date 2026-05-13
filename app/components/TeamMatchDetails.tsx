'use client';

import { useRouter } from 'next/navigation';
import { Match } from '../lib/cricket-schema';
import { useTeamName } from '@/app/lib/hooks/useTeamName';
import { formatOversDisplay } from '@/app/lib/ball-display-utils';
import { formatDate } from '@/app/lib/date-utils';

interface TeamMatchDetailsProps {
  match: Match;
}

export function TeamMatchDetails({ match }: TeamMatchDetailsProps) {
  const router = useRouter();
  const teamName = useTeamName();


  // Determine result status color and text
  const getResultStyle = (result: string) => {
    switch (result) {
      case 'won':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-green-600 to-green-500',
          textColor: 'text-green-300',
          badgeBg: 'bg-green-600/90 backdrop-blur-sm',
          badgeText: 'text-white'
        };
      case 'lost':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-red-600 to-red-500',
          textColor: 'text-red-300',
          badgeBg: 'bg-red-600/90 backdrop-blur-sm',
          badgeText: 'text-white'
        };
      case 'tie':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
          textColor: 'text-yellow-300',
          badgeBg: 'bg-yellow-600/90 backdrop-blur-sm',
          badgeText: 'text-white'
        };
      case 'no_result':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          textColor: 'text-slate-300',
          badgeBg: 'bg-slate-600/90 backdrop-blur-sm',
          badgeText: 'text-white'
        };
      default:
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          textColor: 'text-slate-300',
          badgeBg: 'bg-slate-600/90 backdrop-blur-sm',
          badgeText: 'text-white'
        };
    }
  };

  const resultStyle = getResultStyle(match.result);

  // Get result label
  const getResultLabel = (result: string): string => {
    switch (result) {
      case 'won':
        return 'Won';
      case 'lost':
        return 'Lost';
      case 'tie':
        return 'Tied';
      case 'no_result':
        return 'No Result';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      onClick={() => router.push(`/stats/team-stats/${match.id}`)}
      className={`${resultStyle.bgColor} border ${resultStyle.borderColor} rounded-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer hover:scale-105 transform transition-transform`}
    >
      {/* Colored Header with Result */}
      <div className={`${resultStyle.headerBg} px-4 sm:px-6 py-2 sm:py-3 flex justify-between items-center`}>
        <div className="flex-1">
          <p className="text-white font-bold text-base sm:text-lg">{getResultLabel(match.result)}</p>
          <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1">{formatDate(match.date)}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-6">
        {/* Opponent + Venue row */}
        <div className="mb-3 sm:mb-4">
          <p className="text-sm sm:text-base font-semibold text-white mb-0.5">vs {match.opponent}</p>
          <p className="text-xs sm:text-sm text-white/60">{match.venue === 'Home' ? '🏠' : match.venue === 'Away' ? '✈️' : '⚔️'} {match.venue}</p>
        </div>

        {/* Score row */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 bg-white/10 rounded-lg px-3 py-2 border border-white/15">
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wider mb-0.5">KNP</p>
            <p className="text-lg sm:text-2xl font-black text-white">
              {match.teamRuns ?? 0}<span className="text-white/50 text-sm mx-0.5">/</span>{match.teamWickets ?? 0}
            </p>
            <p className="text-white/50 text-[10px] mt-0.5">({formatOversDisplay(match.teamOversPlayed ?? match.totalOvers ?? 20)} / {match.totalOvers ?? 20})</p>
          </div>
          <div className="text-white/30 font-bold text-base sm:text-lg">vs</div>
          <div className="text-center">
            <p className="text-[10px] sm:text-xs text-white/60 font-medium uppercase tracking-wider mb-0.5">{match.opponent.split(' ')[0]}</p>
            <p className="text-lg sm:text-2xl font-black text-white">
              {match.opponentRuns ?? 0}<span className="text-white/50 text-sm mx-0.5">/</span>{match.opponentWickets ?? 0}
            </p>
            <p className="text-white/50 text-[10px] mt-0.5">({formatOversDisplay(match.opponentOversPlayed ?? match.totalOvers ?? 20)} / {match.totalOvers ?? 20})</p>
          </div>
        </div>

        {/* Win margin */}
        {match.winMargin && (
          <div className="bg-white/10 rounded px-3 py-1.5 text-center border border-white/15 mb-3 sm:mb-4">
            <p className={`text-xs sm:text-sm font-semibold ${resultStyle.textColor}`}>
              {match.result === 'won' ? 'Won by' : match.result === 'lost' ? 'Lost by' : ''} {match.winMargin}
            </p>
          </div>
        )}

        {/* Best performers */}
        {(match.topBatters?.length || match.topBowlers?.length || match.bestBatterName || match.bestBowlerName) && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Top Batters */}
              {(match.topBatters?.length || match.bestBatterName) && (
                <div className="space-y-1.5">
                  <p className="text-white/50 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Top Batters</p>
                  {match.topBatters?.slice(0, 2).map((batter, idx) => (
                    <div key={idx}>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{batter.playerName}</p>
                      <p className="text-white/55 text-[10px] sm:text-xs">{batter.runs} <span className="text-white/35">runs</span> ({batter.balls} <span className="text-white/35">balls</span>)</p>
                    </div>
                  )) || (match.bestBatterName && (
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{match.bestBatterName}</p>
                      <p className="text-white/55 text-[10px] sm:text-xs">{match.bestBatterRuns} <span className="text-white/35">runs</span> ({match.bestBatterBalls} <span className="text-white/35">balls</span>)</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Top Bowlers */}
              {(match.topBowlers?.length || match.bestBowlerName) && (
                <div className="space-y-1.5">
                  <p className="text-white/50 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest">Top Bowlers</p>
                  {match.topBowlers?.slice(0, 2).map((bowler, idx) => (
                    <div key={idx}>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{bowler.playerName}</p>
                      <p className="text-white/55 text-[10px] sm:text-xs">{bowler.wickets} <span className="text-white/35">wickets /</span> {bowler.runs} <span className="text-white/35">runs</span>{bowler.overs ? ` (${bowler.overs} overs)` : ''}</p>
                    </div>
                  )) || (match.bestBowlerName && (
                    <div>
                      <p className="font-bold text-white text-xs sm:text-sm truncate">{match.bestBowlerName}</p>
                      <p className="text-white/55 text-[10px] sm:text-xs">{match.bestBowlerWickets} <span className="text-white/35">wickets /</span> {match.bestBowlerRuns} <span className="text-white/35">runs</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
