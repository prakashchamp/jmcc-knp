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
        return { bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700', badgeBg: 'bg-green-100', badgeText: 'text-green-800' };
      case 'lost':
        return { bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', badgeBg: 'bg-red-100', badgeText: 'text-red-800' };
      case 'tie':
        return { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-700', badgeBg: 'bg-yellow-100', badgeText: 'text-yellow-800' };
      case 'no_result':
        return { bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-800' };
      default:
        return { bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-700', badgeBg: 'bg-gray-100', badgeText: 'text-gray-800' };
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
      className={`${resultStyle.bgColor} border ${resultStyle.borderColor} rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer hover:scale-105 transform transition-transform`}
    >
      {/* Header with date and result */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{formatDate(match.date)}</p>
          <p className="text-xs text-gray-500 mt-1">Venue: {match.venue}</p>
        </div>
        <div className={`${resultStyle.badgeBg} ${resultStyle.badgeText} px-3 py-1 rounded-full text-sm font-semibold`}>
          {getResultLabel(match.result)}
        </div>
      </div>

      {/* Teams and result */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="text-right flex-1">
            <p className="font-semibold text-gray-900 text-lg">JMCC Spartans</p>
            <p className="text-xs text-gray-600 mt-1">Toss: {match.tossWonBy === 'Us' ? 'Won' : 'Lost'}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 bg-gray-300 flex-1"></div>
            <p className={`font-bold text-lg ${resultStyle.textColor} whitespace-nowrap`}>
              {match.result === 'no_result' ? '-' : (match.result === 'won' ? 'Won' : match.result === 'lost' ? 'Lost' : 'Tied')}
            </p>
            <div className="h-1 bg-gray-300 flex-1"></div>
          </div>
          <div className="text-left flex-1">
            <p className="font-semibold text-gray-900 text-lg">{match.opponent}</p>
            <p className="text-xs text-gray-600 mt-1">Opponent</p>
          </div>
        </div>
      </div>

      {/* Win margin */}
      {match.winMargin && (
        <div className="bg-white bg-opacity-50 rounded p-2 text-center">
          <p className={`text-sm font-medium ${resultStyle.textColor}`}>
            {match.result === 'won' ? 'Won by' : match.result === 'lost' ? 'Lost by' : ''} {match.winMargin}
          </p>
        </div>
      )}

      {/* Best performers */}
      {(match.bestBatterName || match.bestBowlerName) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            {match.bestBatterName && (
              <div className="text-sm">
                <p className="text-gray-600 font-medium">Best Batter</p>
                <p className="font-semibold text-gray-900">{match.bestBatterName}</p>
                <p className="text-xs text-gray-600">{match.bestBatterRuns} runs ({match.bestBatterBalls}b)</p>
              </div>
            )}
            {match.bestBowlerName && (
              <div className="text-sm">
                <p className="text-gray-600 font-medium">Best Bowler</p>
                <p className="font-semibold text-gray-900">{match.bestBowlerName}</p>
                <p className="text-xs text-gray-600">{match.bestBowlerWickets}w/{match.bestBowlerRuns}r</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
