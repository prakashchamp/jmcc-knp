'use client';

import { useRouter } from 'next/navigation';
import { Match } from '../lib/cricket-schema';
import { useTeamName } from '@/app/lib/hooks/useTeamName';

interface TeamMatchCardProps {
  match: Match;
}

export function TeamMatchCard({ match }: TeamMatchCardProps) {
  const router = useRouter();
  const teamName = useTeamName();

  // Format date to readable format
  const formatDate = (dateString: any) => {
    const date = dateString?.toDate?.() || new Date(dateString || new Date());
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    };
    return date.toLocaleDateString('en-US', options);
  };

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
          <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1">{formatDate((match as any).createdAt)}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-6">
        {/* Venue */}
        <p className="text-[10px] sm:text-xs text-white/70 mb-3 sm:mb-4">Venue: {match.venue}</p>

        {/* Teams and result */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="text-right flex-1">
              <p className="font-semibold text-white text-base sm:text-lg">{teamName}</p>
              <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 sm:mt-1">Toss: {match.tossWonBy === 'Us' ? 'Won' : 'Lost'}</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="h-0.5 sm:h-1 bg-white/30 w-4 sm:w-8"></div>
              <div className="h-0.5 sm:h-1 bg-white/20 w-4 sm:w-8"></div>
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-white text-base sm:text-lg">{match.opponent}</p>
              <p className="text-[10px] sm:text-xs text-white/70 mt-0.5 sm:mt-1">Opponent</p>
            </div>
          </div>
        </div>

        {/* Win margin */}
        {match.winMargin && (
          <div className="bg-white/10 backdrop-blur-sm rounded p-1.5 sm:p-2 text-center border border-white/20 mb-3 sm:mb-4">
            <p className={`text-xs sm:text-sm font-medium ${resultStyle.textColor}`}>
        {match.result === 'won' ? 'Won by' : match.result === 'lost' ? 'Lost by' : ''} {match.winMargin}
            </p>
          </div>
        )}

        {/* Best performers */}
        {(match.topBatters?.length || match.topBowlers?.length || match.bestBatterName || match.bestBowlerName) && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-white/20">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {/* Top Batters */}
              {(match.topBatters?.length || match.bestBatterName) && (
                <div className="space-y-2">
                  <p className="text-white/80 font-medium text-[10px] sm:text-sm">Top Batters</p>
                  {match.topBatters?.slice(0, 2).map((batter, idx) => (
                    <div key={idx} className="text-[10px] sm:text-xs">
                      <p className="font-semibold text-white truncate">{batter.playerName}</p>
                      <p className="text-white/70">{batter.runs} runs ({batter.balls}b)</p>
                    </div>
                  )) || (match.bestBatterName && (
                    <div className="text-[10px] sm:text-xs">
                      <p className="font-semibold text-white truncate">{match.bestBatterName}</p>
                      <p className="text-white/70">{match.bestBatterRuns} runs ({match.bestBatterBalls}b)</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Top Bowlers */}
              {(match.topBowlers?.length || match.bestBowlerName) && (
                <div className="space-y-2">
                  <p className="text-white/80 font-medium text-[10px] sm:text-sm">Top Bowlers</p>
                  {match.topBowlers?.slice(0, 2).map((bowler, idx) => (
                    <div key={idx} className="text-[10px] sm:text-xs">
                      <p className="font-semibold text-white truncate">{bowler.playerName}</p>
                      <p className="text-white/70">{bowler.wickets}w/{bowler.runs}r</p>
                    </div>
                  )) || (match.bestBowlerName && (
                    <div className="text-[10px] sm:text-xs">
                      <p className="font-semibold text-white truncate">{match.bestBowlerName}</p>
                      <p className="text-white/70">{match.bestBowlerWickets}w/{match.bestBowlerRuns}r</p>
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
