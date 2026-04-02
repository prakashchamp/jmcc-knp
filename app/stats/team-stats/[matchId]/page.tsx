'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { MOCK_MATCHES, MOCK_PERFORMANCES } from '@/app/lib/mock-data';
import { useParams, useRouter } from 'next/navigation';

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;

  // Find the match
  const match = MOCK_MATCHES.find(m => m.id === matchId);

  // Get performances for this match
  const matchPerformances = MOCK_PERFORMANCES.filter(p => p.matchId === matchId);
  const battingPerformances = matchPerformances.filter(p => p.batting.didBat && p.batting.innings > 0);
  const bowlingPerformances = matchPerformances.filter(p => p.bowling.didBowl && p.bowling.innings > 0);

  // Sort state
  const [battingSortField, setBattingSortField] = useState<'playerName' | 'runs' | 'balls' | 'fours' | 'sixes' | 'strikeRate'>('runs');
  const [battingSortDir, setBattingSortDir] = useState<'asc' | 'desc'>('desc');
  const [bowlingSortField, setBowlingSortField] = useState<'playerName' | 'overs' | 'runs' | 'wickets' | 'economy'>('wickets');
  const [bowlingSortDir, setBowlingSortDir] = useState<'asc' | 'desc'>('desc');

  // Sort batting performances
  const sortedBattingPerformances = useMemo(() => {
    const sorted = [...battingPerformances].sort((a, b) => {
      let aVal: number | string = '';
      let bVal: number | string = '';

      if (battingSortField === 'playerName') {
        aVal = a.playerName || '';
        bVal = b.playerName || '';
      } else if (battingSortField === 'runs') {
        aVal = a.batting.runs;
        bVal = b.batting.runs;
      } else if (battingSortField === 'balls') {
        aVal = a.batting.balls;
        bVal = b.batting.balls;
      } else if (battingSortField === 'fours') {
        aVal = a.batting.fours;
        bVal = b.batting.fours;
      } else if (battingSortField === 'sixes') {
        aVal = a.batting.sixes;
        bVal = b.batting.sixes;
      } else if (battingSortField === 'strikeRate') {
        aVal = a.batting.strikeRate;
        bVal = b.batting.strikeRate;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return battingSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return battingSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [battingPerformances, battingSortField, battingSortDir]);

  // Sort bowling performances
  const sortedBowlingPerformances = useMemo(() => {
    const sorted = [...bowlingPerformances].sort((a, b) => {
      let aVal: number | string = '';
      let bVal: number | string = '';

      if (bowlingSortField === 'playerName') {
        aVal = a.playerName || '';
        bVal = b.playerName || '';
      } else if (bowlingSortField === 'overs') {
        aVal = a.bowling.overs;
        bVal = b.bowling.overs;
      } else if (bowlingSortField === 'runs') {
        aVal = a.bowling.runs;
        bVal = b.bowling.runs;
      } else if (bowlingSortField === 'wickets') {
        aVal = a.bowling.wickets;
        bVal = b.bowling.wickets;
      } else if (bowlingSortField === 'economy') {
        aVal = a.bowling.economy;
        bVal = b.bowling.economy;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return bowlingSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return bowlingSortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [bowlingPerformances, bowlingSortField, bowlingSortDir]);

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Header />
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
            <p className="text-gray-400 text-lg">Match not found</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleBattingSort = (field: typeof battingSortField) => {
    if (battingSortField === field) {
      setBattingSortDir(battingSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setBattingSortField(field);
      setBattingSortDir('desc');
    }
  };

  const handleBowlingSort = (field: typeof bowlingSortField) => {
    if (bowlingSortField === field) {
      setBowlingSortDir(bowlingSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setBowlingSortField(field);
      setBowlingSortDir('desc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      <Header />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          ← Back to Team Stats
        </button>

        {/* Match Header */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8 shadow-md">
          <h1 className="text-3xl font-bold text-white mb-4">Match Details</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-400 text-sm">Date</p>
              <p className="text-lg font-semibold text-white">{formatDate(match.date)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Opponent</p>
              <p className="text-lg font-semibold text-white">{match.opponent}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Venue</p>
              <p className="text-lg font-semibold text-white">{match.venue}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Result</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  match.result === 'won' ? 'bg-green-900 text-green-200' :
                  match.result === 'lost' ? 'bg-red-900 text-red-200' :
                  match.result === 'tie' ? 'bg-yellow-900 text-yellow-200' :
                  'bg-gray-700 text-gray-200'
                }`}>
                  {match.result === 'won' ? 'Won' : match.result === 'lost' ? 'Lost' : match.result === 'tie' ? 'Tied' : 'No Result'}
                </span>
                {match.winMargin && <span className="text-white font-medium">{match.winMargin}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Batting Stats */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mb-8 shadow-md">
          <h2 className="text-2xl font-bold text-white p-6 pb-4">Batting Statistics</h2>
          {sortedBattingPerformances.length === 0 ? (
            <p className="p-6 text-gray-400">No batting statistics available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800"
                      onClick={() => handleBattingSort('playerName')}
                    >
                      Player {battingSortField === 'playerName' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'playerName' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-300 cursor-pointer select-none hover:bg-green-800"
                      onClick={() => handleBattingSort('runs')}
                    >
                      Runs {battingSortField === 'runs' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'runs' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-300 cursor-pointer select-none hover:bg-green-800"
                      onClick={() => handleBattingSort('balls')}
                    >
                      Balls {battingSortField === 'balls' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'balls' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-300 cursor-pointer select-none hover:bg-green-800"
                      onClick={() => handleBattingSort('fours')}
                    >
                      4s {battingSortField === 'fours' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'fours' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-300 cursor-pointer select-none hover:bg-green-800"
                      onClick={() => handleBattingSort('sixes')}
                    >
                      6s {battingSortField === 'sixes' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'sixes' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-blue-100 cursor-pointer select-none hover:bg-blue-800"
                      onClick={() => handleBattingSort('strikeRate')}
                    >
                      SR {battingSortField === 'strikeRate' && (battingSortDir === 'asc' ? '↑' : '↓')}{battingSortField !== 'strikeRate' && '⇅'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBattingPerformances.map((perf, idx) => (
                    <tr 
                      key={perf.id}
                      className={idx % 2 === 0 ? 'bg-slate-800 text-gray-100' : 'bg-slate-700 text-gray-100 hover:bg-slate-600'}
                    >
                      <td className="px-4 py-3 font-semibold text-white">{perf.playerName}</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">{perf.batting.runs}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{perf.batting.balls}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{perf.batting.fours}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{perf.batting.sixes}</td>
                      <td className="px-4 py-3 text-center text-orange-600">{perf.batting.strikeRate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bowling Stats */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-md">
          <h2 className="text-2xl font-bold text-white p-6 pb-4">Bowling Statistics</h2>
          {sortedBowlingPerformances.length === 0 ? (
            <p className="p-6 text-gray-400">No bowling statistics available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-yellow-700 to-yellow-600 border-b border-yellow-700">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600"
                      onClick={() => handleBowlingSort('playerName')}
                    >
                      Player {bowlingSortField === 'playerName' && (bowlingSortDir === 'asc' ? '↑' : '↓')}{bowlingSortField !== 'playerName' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600"
                      onClick={() => handleBowlingSort('overs')}
                    >
                      Overs {bowlingSortField === 'overs' && (bowlingSortDir === 'asc' ? '↑' : '↓')}{bowlingSortField !== 'overs' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600"
                      onClick={() => handleBowlingSort('runs')}
                    >
                      Runs {bowlingSortField === 'runs' && (bowlingSortDir === 'asc' ? '↑' : '↓')}{bowlingSortField !== 'runs' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600"
                      onClick={() => handleBowlingSort('wickets')}
                    >
                      Wkts {bowlingSortField === 'wickets' && (bowlingSortDir === 'asc' ? '↑' : '↓')}{bowlingSortField !== 'wickets' && '⇅'}
                    </th>
                    <th 
                      className="px-4 py-3 text-center font-semibold text-gray-900 cursor-pointer select-none hover:bg-yellow-600"
                      onClick={() => handleBowlingSort('economy')}
                    >
                      Econ {bowlingSortField === 'economy' && (bowlingSortDir === 'asc' ? '↑' : '↓')}{bowlingSortField !== 'economy' && '⇅'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBowlingPerformances.map((perf, idx) => (
                    <tr 
                      key={perf.id}
                      className={idx % 2 === 0 ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700'}
                    >
                      <td className="px-4 py-3 font-semibold text-white">{perf.playerName}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{perf.bowling.overs}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{perf.bowling.runs}</td>
                      <td className="px-4 py-3 text-center font-semibold text-red-400">{perf.bowling.wickets}</td>
                      <td className="px-4 py-3 text-center text-blue-400">{perf.bowling.economy.toFixed(2)}</td>
                    </tr>
                  ))}  
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
