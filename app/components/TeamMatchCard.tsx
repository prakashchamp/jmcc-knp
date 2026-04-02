'use client';

import { useRouter } from 'next/navigation';
import { Match } from '../lib/cricket-schema';

interface TeamMatchCardProps {
  match: Match;
}

export function TeamMatchCard({ match }: TeamMatchCardProps) {
  const router = useRouter();

  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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
      <div className={`${resultStyle.headerBg} px-6 py-3 flex justify-between items-center`}>
        <div className="flex-1">
          <p className="text-white font-bold text-lg">{getResultLabel(match.result)}</p>
          <p className="text-white/80 text-xs mt-1">{formatDate(match.date)}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Venue */}
        <p className="text-xs text-white/70 mb-4">Venue: {match.venue}</p>

        {/* Teams and result */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="text-right flex-1">
              <p className="font-semibold text-white text-lg">JMCC Spartans</p>
              <p className="text-xs text-white/70 mt-1">Toss: {match.tossWonBy === 'Us' ? 'Won' : 'Lost'}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 bg-white/30 flex-1"></div>
              <div className="h-1 bg-white/20 flex-1"></div>
            </div>
            <div className="text-left flex-1">
              <p className="font-semibold text-white text-lg">{match.opponent}</p>
              <p className="text-xs text-white/70 mt-1">Opponent</p>
            </div>
          </div>
        </div>

        {/* Win margin */}
        {match.winMargin && (
          <div className="bg-white/10 backdrop-blur-sm rounded p-2 text-center border border-white/20 mb-4">
            <p className={`text-sm font-medium ${resultStyle.textColor}`}>
        {match.result === 'won' ? 'Won by' : match.result === 'lost' ? 'Lost by' : ''} {match.winMargin}
            </p>
          </div>
        )}

        {/* Best performers */}
        {(match.bestBatterName || match.bestBowlerName) && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="grid grid-cols-2 gap-4">
              {match.bestBatterName && (
                <div className="text-sm">
                  <p className="text-white/80 font-medium">Best Batter</p>
                  <p className="font-semibold text-white">{match.bestBatterName}</p>
                  <p className="text-xs text-white/70">{match.bestBatterRuns} runs ({match.bestBatterBalls}b)</p>
                </div>
              )}
              {match.bestBowlerName && (
                <div className="text-sm">
                  <p className="text-white/80 font-medium">Best Bowler</p>
                  <p className="font-semibold text-white">{match.bestBowlerName}</p>
                  <p className="text-xs text-white/70">{match.bestBowlerWickets}w/{match.bestBowlerRuns}r</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
