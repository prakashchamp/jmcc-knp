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
   */
  interface Partnership {
    wicketNumber: number;
    batsman1: { name: string; id: string; runs: number; balls: number };
    batsman2: { name: string; id: string; runs: number; balls: number };
    partnershipRuns: number;
    partnershipBalls: number;
  }

  const partnerships: Partnership[] = [];

  // Build wicket timeline
  const wicketBallIndices: { [wicketNum: number]: number } = {};
  selectedInnings.ballHistory.forEach((ball, idx) => {
    if (ball.isWicket && ball.dismissal?.playerOut) {
      // Find which wicket number this is
      const batsmanOutIndex = selectedInnings.dismissedBatsmen.findIndex(
        (b) => b.id === ball.dismissal?.playerOut.id
      );
      if (batsmanOutIndex !== -1) {
        wicketBallIndices[batsmanOutIndex + 1] = idx;
      }
    }
  });

  // Calculate partnerships
  let prevWicketIndex = -1;

  for (let wicketNum = 1; wicketNum <= selectedInnings.totalWickets; wicketNum++) {
    const nextWicketIndex =
      wicketBallIndices[wicketNum] !== undefined
        ? wicketBallIndices[wicketNum]
        : selectedInnings.ballHistory.length - 1;

    // Get balls for this partnership
    const partnershipBalls = selectedInnings.ballHistory.slice(
      prevWicketIndex + 1,
      nextWicketIndex + 1
    );

    if (partnershipBalls.length === 0) continue;

    // Identify the two batsmen in this partnership
    const firstBall = partnershipBalls[0];
    const batsman1Id = firstBall.batter.id;
    const batsman1Name = firstBall.batter.name;
    const batsman2Id = firstBall.nonStriker.id;
    const batsman2Name = firstBall.nonStriker.name;

    // Calculate individual contributions
    // Ball counting rules: Wides don't count as balls (but their runs do count)
    // Individual batter runs: Only count runs that go to the batter (ball.runs.batter), not extras
    let batsman1Runs = 0;
    let batsman1Balls = 0;
    let batsman2Runs = 0;
    let batsman2Balls = 0;

    for (const ball of partnershipBalls) {
      const isWide = ball.extra?.type === 'wide';
      
      if (ball.batter.id === batsman1Id) {
        // Only add runs that count for the batter (not extras like wides, byes, leg-byes)
        batsman1Runs += ball.runs.batter;
        // Only count as ball if NOT a wide
        if (!isWide) {
          batsman1Balls++;
        }
      } else if (ball.batter.id === batsman2Id) {
        // Only add runs that count for the batter (not extras like wides, byes, leg-byes)
        batsman2Runs += ball.runs.batter;
        // Only count as ball if NOT a wide
        if (!isWide) {
          batsman2Balls++;
        }
      }
    }

    // Calculate total partnership runs (include all) and balls (exclude wides)
    const totalRuns = partnershipBalls.reduce((sum, ball) => sum + ball.runs.total, 0);
    const totalBalls = partnershipBalls.filter(
      (ball) => ball.extra?.type !== 'wide'
    ).length;

    partnerships.push({
      wicketNumber: wicketNum,
      batsman1: {
        name: batsman1Name,
        id: batsman1Id,
        runs: batsman1Runs,
        balls: batsman1Balls,
      },
      batsman2: {
        name: batsman2Name,
        id: batsman2Id,
        runs: batsman2Runs,
        balls: batsman2Balls,
      },
      partnershipRuns: totalRuns,
      partnershipBalls: totalBalls,
    });

    prevWicketIndex = nextWicketIndex;
  }

  // Add current partnership from Redux state (tracked incrementally as balls are recorded)
  if (selectedInnings.currentPartnership) {
    partnerships.push({
      wicketNumber: 0,
      batsman1: selectedInnings.currentPartnership.batsman1,
      batsman2: selectedInnings.currentPartnership.batsman2,
      partnershipRuns: selectedInnings.currentPartnership.partnershipRuns,
      partnershipBalls: selectedInnings.currentPartnership.partnershipBalls,
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

          return (
            <div
              key={idx}
              className={`${partnership.wicketNumber === 0 ? 'bg-teal-900/40 border-teal-600 ring-1 ring-inset ring-teal-600' : 'bg-gray-800 border-gray-600'} border rounded-lg p-2 space-y-2`}
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-teal-300 text-xs">{partnershipLabel}</h4>
                <span className="text-xs font-bold text-white">
                  {partnership.partnershipRuns}({partnership.partnershipBalls})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-700 border border-gray-600 p-2 rounded">
                  <p className="font-semibold text-white text-xs">
                    {partnership.batsman1.name}
                  </p>
                  <p className="text-xs text-white mt-0.5">
                    <span className="font-bold text-white">
                      {partnership.batsman1.runs}
                    </span>
                    <span className="text-gray-300">({partnership.batsman1.balls})</span>
                  </p>
                </div>

                <div className="bg-gray-700 border border-gray-600 p-2 rounded">
                  <p className="font-semibold text-white text-xs">
                    {partnership.batsman2.name}
                  </p>
                  <p className="text-xs text-white mt-0.5">
                    <span className="font-bold text-white">
                      {partnership.batsman2.runs}
                    </span>
                    <span className="text-gray-300">({partnership.batsman2.balls})</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default Partnerships;
