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
    <section>
      <h3 className="section-title text-white mb-4 sm:mb-6">Recent Match Results</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        {matches.map((match) => {
          const resultStyle = getResultStyle(match.result);
          return (
            <div
              key={match.id}
              onClick={() => router.push(`/stats/team-stats/${match.id}`)}
              className={`${resultStyle.bgColor} border ${resultStyle.borderColor} rounded-xl overflow-hidden hover:shadow-2xl transition-all cursor-pointer hover:scale-[1.02] transform group`}
            >
              {/* Colored Header */}
              <div className={`${resultStyle.headerBg} px-4 py-2.5 sm:py-3.5 flex justify-between items-center`}>
                <div>
                  <p className="text-white font-bold text-sm sm:text-base">{getResultLabel(match.result)}</p>
                  <p className="text-white/80 text-[10px] sm:text-xs font-medium">{formatDate(match.date)}</p>
                </div>
                {match.winMargin && (
                  <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">
                    {match.winMargin}
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-3 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs sm:text-sm font-semibold truncate">vs {match.opponent}</p>
                    <p className="text-gray-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-1">
                      <span className="opacity-50">📍</span> {match.venue}
                    </p>
                  </div>
                </div>

                {/* Best Performers */}
                {(match.topBatters?.length || match.topBowlers?.length || match.bestBatterName || match.bestBowlerName) && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Top Batters */}
                      {(match.topBatters?.length || match.bestBatterName) && (
                        <div className="min-w-0 space-y-2">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 font-bold">Top Batters</p>
                          {match.topBatters?.slice(0, 2).map((batter, idx) => (
                            <div key={idx} className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-bold truncate">{batter.playerName}</p>
                              <p className="text-blue-400 text-[10px] sm:text-xs font-medium">{batter.runs} <span className="text-gray-500 text-[9px]">({batter.balls})</span></p>
                            </div>
                          )) || (match.bestBatterName && (
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-bold truncate">{match.bestBatterName}</p>
                              <p className="text-blue-400 text-[10px] sm:text-xs font-medium">{match.bestBatterRuns} <span className="text-gray-500 text-[9px]">({match.bestBatterBalls})</span></p>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Top Bowlers */}
                      {(match.topBowlers?.length || match.bestBowlerName) && (
                        <div className="min-w-0 space-y-2">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 font-bold">Top Bowlers</p>
                          {match.topBowlers?.slice(0, 2).map((bowler, idx) => (
                            <div key={idx} className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-bold truncate">{bowler.playerName}</p>
                              <p className="text-red-400 text-[10px] sm:text-xs font-medium">{bowler.wickets} <span className="text-gray-500 text-[9px]">Wkts</span></p>
                            </div>
                          )) || (match.bestBowlerName && (
                            <div className="min-w-0">
                              <p className="text-white text-xs sm:text-sm font-bold truncate">{match.bestBowlerName}</p>
                              <p className="text-red-400 text-[10px] sm:text-xs font-medium">{match.bestBowlerWickets} <span className="text-gray-500 text-[9px]">Wkts</span></p>
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
        })}
      </div>
    </section>
  );
}
