'use client';

import { PlayerStats } from '../lib/hooks/useAllPlayers';

interface StatItemProps {
  label: string;
  value: string | number;
}

function StatItem({ label, value }: StatItemProps) {
  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg p-4 border border-slate-500">
      <p className="text-gray-300 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">
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
        <div className="h-40 bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-96 bg-slate-700 rounded-lg animate-pulse" />
        <div className="h-96 bg-slate-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Select a player to view stats</p>
        </div>
      </div>
    );
  }

  // Determine if player is primarily a bowler
  const isBowler = player.playerRole === 'bowler' || player.playerRole === 'allrounder';

  // Render Batting Stats Section
  const battingStatsSection = (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-6">Batting Statistics</h3>
      
      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatItem label="Matches" value={player.battingStats!.totalMatches} />
        <StatItem label="Innings" value={player.battingStats!.totalInnings} />
        <StatItem label="Not Outs" value={player.battingStats!.notOuts} />
        <StatItem label="Runs" value={player.battingStats!.totalRuns} />
      </div>

      {/* Averages and Rates */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Average" value={player.battingStats!.average} />
          <StatItem label="Strike Rate" value={player.battingStats!.strikeRate} />
          <StatItem label="Highest Score" value={player.battingStats!.bestScore} />
          <StatItem label="Balls Faced" value={player.battingStats!.totalBalls} />
        </div>
      </div>

      {/* Boundaries */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Boundaries</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Fours" value={player.battingStats!.totalFours} />
          <StatItem label="Sixes" value={player.battingStats!.totalSixes} />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatItem label="30s (30-49)" value={player.battingStats!.thirties} />
          <StatItem label="50s (50-99)" value={player.battingStats!.fifties} />
          <StatItem label="100s (100+)" value={player.battingStats!.hundreds} />
          <StatItem label="Ducks" value={player.battingStats!.ducks} />
        </div>
      </div>
    </div>
  );

  // Render Bowling Stats Section
  const bowlingStatsSection = (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-2xl font-bold text-white mb-6">Bowling Statistics</h3>
      
      {/* Key Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatItem label="Matches" value={player.bowlingStats!.totalMatches} />
        <StatItem label="Innings" value={player.bowlingStats!.totalInnings} />
        <StatItem label="Wickets" value={player.bowlingStats!.totalWickets} />
        <StatItem label="Runs Given" value={player.bowlingStats!.totalRuns} />
      </div>

      {/* Overs and Balls */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Overs Bowled</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Overs" value={player.bowlingStats!.totalOvers} />
          <StatItem label="Balls" value={player.bowlingStats!.totalBalls} />
        </div>
      </div>

      {/* Averages and Rates */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="Bowling Average" value={player.bowlingStats!.average} />
          <StatItem label="Strike Rate" value={player.bowlingStats!.strikeRate} />
          <StatItem label="Economy" value={player.bowlingStats!.economy} />
          <StatItem label="Best Haul" value={player.bowlingStats!.bestHaul} />
        </div>
      </div>

      {/* Milestones */}
      <div>
        <h4 className="text-lg font-semibold text-gray-100 mb-4">Milestones</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem label="3-Wicket Hauls" value={player.bowlingStats!.threeWickets} />
          <StatItem label="5-Wicket Hauls" value={player.bowlingStats!.fiveWickets} />
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
