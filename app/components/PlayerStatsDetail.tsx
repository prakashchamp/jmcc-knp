'use client';

import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface StatItemProps {
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'indigo' | 'cyan';
}

function StatItem({ label, value, color = 'blue' }: StatItemProps) {
  const colorMap = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
    red: 'from-red-50 to-red-100 text-red-600',
    pink: 'from-pink-50 to-pink-100 text-pink-600',
    indigo: 'from-indigo-50 to-indigo-100 text-indigo-600',
    cyan: 'from-cyan-50 to-cyan-100 text-cyan-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-lg p-4`}>
      <p className="text-gray-600 text-sm font-medium">{label}</p>
      <p className={`text-2xl font-bold ${colorMap[color].split(' ').pop()} mt-1`}>
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
      </p>
    </div>
  );
}

interface PlayerStatsDetailProps {
  player: PlayerStats | null;
  loading: boolean;
}

export function PlayerStatsDetail({ player, loading }: PlayerStatsDetailProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Select a player to view stats</p>
        </div>
      </div>
    );
  }

  // Determine if player is primarily a bowler
  const isBowler = player.playerRole === 'bowler' || player.playerRole === 'allrounder';

  // Render Batting Stats Section
  const battingStatsSection = (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Batting Statistics</h3>
      
      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatItem label="Matches" value={player.battingStats!.totalMatches} color="blue" />
        <StatItem label="Innings" value={player.battingStats!.totalInnings} color="green" />
        <StatItem label="Not Outs" value={player.battingStats!.notOuts} color="purple" />
        <StatItem label="Runs" value={player.battingStats!.totalRuns} color="orange" />
      </div>

      {/* Averages and Rates */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Average" value={player.battingStats!.average} color="red" />
          <StatItem label="Strike Rate" value={player.battingStats!.strikeRate} color="pink" />
          <StatItem label="Highest Score" value={player.battingStats!.bestScore} color="indigo" />
          <StatItem label="Balls Faced" value={player.battingStats!.totalBalls} color="cyan" />
        </div>
      </div>

      {/* Boundaries */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Boundaries</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Fours" value={player.battingStats!.totalFours} color="green" />
          <StatItem label="Sixes" value={player.battingStats!.totalSixes} color="red" />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatItem label="30s (30-49)" value={player.battingStats!.thirties} color="orange" />
          <StatItem label="50s (50-99)" value={player.battingStats!.fifties} color="purple" />
          <StatItem label="100s (100+)" value={player.battingStats!.hundreds} color="blue" />
          <StatItem label="Ducks" value={player.battingStats!.ducks} color="red" />
        </div>
      </div>
    </div>
  );

  // Render Bowling Stats Section
  const bowlingStatsSection = (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Bowling Statistics</h3>
      
      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatItem label="Matches" value={player.bowlingStats!.totalMatches} color="blue" />
        <StatItem label="Innings" value={player.bowlingStats!.totalInnings} color="green" />
        <StatItem label="Wickets" value={player.bowlingStats!.totalWickets} color="red" />
        <StatItem label="Runs Given" value={player.bowlingStats!.totalRuns} color="orange" />
      </div>

      {/* Overs and Balls */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Overs Bowled</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Overs" value={player.bowlingStats!.totalOvers} color="blue" />
          <StatItem label="Balls" value={player.bowlingStats!.totalBalls} color="cyan" />
        </div>
      </div>

      {/* Averages and Rates */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Bowling Average" value={player.bowlingStats!.average} color="red" />
          <StatItem label="Strike Rate" value={player.bowlingStats!.strikeRate} color="pink" />
          <StatItem label="Economy" value={player.bowlingStats!.economy} color="blue" />
          <StatItem label="Best Haul" value={player.bowlingStats!.bestHaul} color="indigo" />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="3-Wicket Hauls" value={player.bowlingStats!.threeWickets} color="purple" />
          <StatItem label="5-Wicket Hauls" value={player.bowlingStats!.fiveWickets} color="red" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
        <h2 className="text-3xl font-bold">{player.playerName}</h2>
        <p className="text-blue-100 mt-1 capitalize">{player.playerRole}</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-blue-100 text-sm">Total Matches</p>
            <p className="text-3xl font-bold">{player.totalMatches}</p>
          </div>
        </div>
      </div>

      {/* Render stats in appropriate order based on player role */}
      {isBowler ? (
        <>
          {bowlingStatsSection}
          {battingStatsSection}
        </>
      ) : (
        <>
          {battingStatsSection}
          {bowlingStatsSection}
        </>
      )}
    </div>
  );
}
