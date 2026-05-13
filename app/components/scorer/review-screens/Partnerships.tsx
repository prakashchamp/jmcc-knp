'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { getBattingTeamInnings, ReviewTeam, ReviewTeamToggle } from './ReviewTeamToggle';

/**
 * Partnerships Review Component
 * Shows partnership breakdown by wickets with individual batsman contributions
 * Example: 1st WKT partnership -> X runs (Y balls) -> Batter1: a(b) Batter2: c(d)
 * Theme: Consistent with batting/bowling scorecards (Teal-700 headers, Gray-800 body)
 */
export function Partnerships() {
  const { currentInnings, liveMatch } = useSelector((state: RootState) => state.scorer);
  const [selectedTeam, setSelectedTeam] = useState<ReviewTeam>(currentInnings?.battingTeam ?? 'Us');
  const selectedInnings = getBattingTeamInnings(liveMatch, currentInnings, selectedTeam);

  if (!currentInnings && !liveMatch) {
    return <div className="text-gray-600">No partnership data available</div>;
  }

  if (!selectedInnings) {
    return (
      <div className="px-2 py-2">
        <ReviewTeamToggle
          selectedTeam={selectedTeam}
          opponentName={liveMatch?.opponent}
          onSelect={setSelectedTeam}
        />
        <div className="text-center py-8">
          <p className="text-gray-400">No partnership data available</p>
        </div>
      </div>
    );
  }

  /**
   * Calculate partnership by wicket number
   * Each partnership is broken down when a wicket falls
   * Supports multiple batsmen per partnership (e.g., when batsman is retired hurt, they remain in partnership)
   */
  interface Batsman {
    name: string;
    id: string;
    runs: number;
    balls: number;
  }

  interface Partnership {
    wicketNumber: number;
    batsmen: Batsman[];
    partnershipRuns: number;
    partnershipBalls: number;
  }

  const partnerships: Partnership[] = [];

  // Build wicket timeline directly from ball sequence (ignore retired-hurt, only count actual wickets)
  const wicketBallIndices = selectedInnings.ballHistory
    .map((ball, idx) => (ball.isWicket ? idx : -1))
    .filter((idx) => idx >= 0);

  // Calculate partnerships
  let prevWicketIndex = -1;

  for (let wicketNum = 1; wicketNum <= wicketBallIndices.length; wicketNum++) {
    const nextWicketIndex = wicketBallIndices[wicketNum - 1];

    // Get balls for this partnership (from after previous wicket to next wicket)
    const partnershipBalls = selectedInnings.ballHistory.slice(
      prevWicketIndex + 1,
      nextWicketIndex + 1
    );

    if (partnershipBalls.length === 0) continue;

    // Track all batsmen in this partnership (handles retired hurt - same partnership continues)
    // Map of batsman ID to their stats
    const batsmenMap: Map<string, Batsman> = new Map();
    const batsmenOrder: string[] = []; // Track order of entry

    // Include both opening batsmen even if one has not faced a ball in this partnership
    const firstBall = partnershipBalls[0];
    const initialBatsmen = [firstBall.batter, firstBall.nonStriker];
    for (const batsman of initialBatsmen) {
      if (!batsmenMap.has(batsman.id)) {
        batsmenMap.set(batsman.id, {
          name: batsman.name,
          id: batsman.id,
          runs: 0,
          balls: 0,
        });
        batsmenOrder.push(batsman.id);
      }
    }

    for (const ball of partnershipBalls) {
      const isWide = ball.extra?.type === 'wide';
      const batterId = ball.batter.id;
      const batterName = ball.batter.name;

      if (!batsmenMap.has(batterId)) {
        batsmenMap.set(batterId, {
          name: batterName,
          id: batterId,
          runs: 0,
          balls: 0,
        });
        batsmenOrder.push(batterId);
      }

      const batsman = batsmenMap.get(batterId)!;
      batsman.runs += ball.runs.batter;
      if (!isWide) {
        batsman.balls++;
      }
    }

    // Convert map to ordered array
    const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);

    // Calculate total partnership runs (include all) and balls (exclude wides)
    const totalRuns = partnershipBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
    const totalBalls = partnershipBalls.filter(
      (ball) => ball.extra?.type !== 'wide'
    ).length;

    partnerships.push({
      wicketNumber: wicketNum,
      batsmen,
      partnershipRuns: totalRuns,
      partnershipBalls: totalBalls,
    });

    prevWicketIndex = nextWicketIndex;
  }

  // Add current partnership from Redux state
  if (selectedInnings.striker && selectedInnings.nonStriker) {
    const ballsAfterLastWicket = selectedInnings.ballHistory.slice(
      prevWicketIndex + 1
    );

    const batsmenMap: Map<string, Batsman> = new Map();
    const batsmenOrder: string[] = [];

    // Add current striker and non-striker to ensure they show up even with 0 balls
    const currentBatsmen = [selectedInnings.striker, selectedInnings.nonStriker];
    for (const b of currentBatsmen) {
      if (!batsmenMap.has(b.id)) {
        batsmenMap.set(b.id, {
          name: b.name,
          id: b.id,
          runs: 0,
          balls: 0,
        });
        batsmenOrder.push(b.id);
      }
    }

    // Process any balls bowled in this partnership to get actual runs/balls
    for (const ball of ballsAfterLastWicket) {
      const isWide = ball.extra?.type === 'wide';
      const batterId = ball.batter.id;
      const batterName = ball.batter.name;

      if (!batsmenMap.has(batterId)) {
        batsmenMap.set(batterId, {
          name: batterName,
          id: batterId,
          runs: 0,
          balls: 0,
        });
        batsmenOrder.push(batterId);
      }

      const batsman = batsmenMap.get(batterId)!;
      batsman.runs += ball.runs.batter;
      if (!isWide) {
        batsman.balls++;
      }
    }

    const batsmen = batsmenOrder.map((id) => batsmenMap.get(id)!);
    const totalRuns = ballsAfterLastWicket.reduce((sum, ball) => sum + ball.runs.total, 0);
    const totalBalls = ballsAfterLastWicket.filter(
      (ball) => ball.extra?.type !== 'wide'
    ).length;

    partnerships.push({
      wicketNumber: 0,
      batsmen,
      partnershipRuns: totalRuns,
      partnershipBalls: totalBalls,
    });
  }

  /**
   * Format wicket ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
   */
  const getOrdinal = (num: number): string => {
    if (num % 10 === 1 && num !== 11) return 'st';
    if (num % 10 === 2 && num !== 12) return 'nd';
    if (num % 10 === 3 && num !== 13) return 'rd';
    return 'th';
  };

  return (
    <div className="space-y-2 px-2 py-2">
      <ReviewTeamToggle
        selectedTeam={selectedTeam}
        opponentName={liveMatch?.opponent}
        onSelect={setSelectedTeam}
      />
      {partnerships.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No partnership data available</p>
        </div>
      ) : (
        partnerships.map((partnership, idx) => {
          const partnershipLabel =
            partnership.wicketNumber > 0
              ? `${partnership.wicketNumber}${getOrdinal(partnership.wicketNumber)} WKT`
              : 'Current';

          // Determine grid columns based on number of batsmen
          const numBatsmen = partnership.batsmen.length;
          const gridColsClass =
            numBatsmen === 2 ? 'grid-cols-2' :
            numBatsmen === 3 ? 'grid-cols-3' :
            'grid-cols-2'; // fallback

          return (
            <div
              key={idx}
              className={`border-2 rounded-xl p-3 space-y-3 shadow-sm ${partnership.wicketNumber === 0 ? 'bg-blue-500/10 border-blue-500 shadow-blue-500/5' : 'bg-background border-border'}`}
            >
              <div className="flex justify-between items-center">
                <h4 className={`font-black text-[10px] uppercase tracking-widest ${partnership.wicketNumber === 0 ? 'text-blue-600' : 'opacity-60 text-foreground'}`}>
                  {partnershipLabel}
                </h4>
                <span className="text-sm font-black text-foreground">
                  {partnership.partnershipRuns}
                  <span className="text-xs opacity-60 ml-1 font-bold">({partnership.partnershipBalls})</span>
                </span>
              </div>

              <div className={`grid ${gridColsClass} gap-3`}>
                {partnership.batsmen.map((batsman) => (
                  <div key={batsman.id} className="bg-background/50 border-2 border-border/40 p-2.5 rounded-lg">
                    <p className="font-black text-foreground text-xs truncate">
                      {batsman.name}
                    </p>
                    <p className="text-xs text-foreground mt-1 flex items-baseline gap-1">
                      <span className="font-black text-sm">
                        {batsman.runs}
                      </span>
                      <span className="text-[10px] font-bold opacity-60">({batsman.balls})</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Partnerships;
