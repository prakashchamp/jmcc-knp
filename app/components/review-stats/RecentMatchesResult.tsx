'use client';

import { useRouter } from 'next/navigation';
import { Match } from '@/app/lib/cricket-schema';

interface RecentMatchesResultProps {
  matches: Match[];
  loading: boolean;
}

export function RecentMatchesResult({ matches, loading }: RecentMatchesResultProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-2xl font-bold text-white mb-6">Recent Matches Results</h3>
        <p className="text-gray-400 text-center py-8">No matches available</p>
      </div>
    );
  }

  const getResultStyle = (result: string) => {
    switch (result) {
      case 'won':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-green-600 to-green-500',
          textColor: 'text-green-300',
        };
      case 'lost':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-red-600 to-red-500',
          textColor: 'text-red-300',
        };
      case 'tie':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
          textColor: 'text-yellow-300',
        };
      case 'no_result':
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          textColor: 'text-slate-300',
        };
      default:
        return {
          bgColor: 'bg-gradient-to-br from-slate-700 to-slate-800 backdrop-blur-sm shadow-lg',
          borderColor: 'border-slate-600',
          headerBg: 'bg-gradient-to-r from-slate-600 to-slate-500',
          textColor: 'text-slate-300',
        };
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div>
      <h3 className="text-lg sm:text-2xl font-bold text-white mb-4 sm:mb-6">Recent Matches Results</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matches.map((match) => {
          const resultStyle = getResultStyle(match.result);
          return (
            <div
              key={match.id}
              onClick={() => router.push(`/stats/team-stats/${match.id}`)}
              className={`${resultStyle.bgColor} border ${resultStyle.borderColor} rounded-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer hover:scale-105 transform transition-transform`}
            >
              {/* Colored Header */}
              <div className={`${resultStyle.headerBg} px-4 sm:px-6 py-2 sm:py-3`}>
                <p className="text-white font-bold text-base sm:text-lg">{getResultLabel(match.result)}</p>
                <p className="text-white/80 text-[10px] sm:text-xs mt-0.5 sm:mt-1">{formatDate(match.date)}</p>
              </div>

              {/* Card Content */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-300 text-xs sm:text-sm font-medium">vs {match.opponent}</p>
                    <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1">Venue: {match.venue}</p>
                  </div>
                  {match.winMargin && (
                    <div className="text-right">
                      <p className={`text-xs sm:text-sm font-semibold ${resultStyle.textColor}`}>{match.winMargin}</p>
                    </div>
                  )}
                </div>

                {/* Best Performers */}
                {(match.bestBatterName || match.bestBowlerName) && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-[10px] sm:text-xs">
                      {match.bestBatterName && (
                        <div>
                          <p className="text-gray-400">Best Batter</p>
                          <p className="text-white font-semibold truncate">{match.bestBatterName}</p>
                          <p className="text-gray-500">{match.bestBatterRuns}({match.bestBatterBalls})</p>
                        </div>
                      )}
                      {match.bestBowlerName && (
                        <div>
                          <p className="text-gray-400">Best Bowler</p>
                          <p className="text-white font-semibold truncate">{match.bestBowlerName}</p>
                          <p className="text-gray-500">{match.bestBowlerWickets}w/{match.bestBowlerRuns}r</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
