'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/app/lib/redux/store';
import { formatBallDisplay, getBallColor } from '@/app/lib/ball-display-utils';

/**
 * Ball Grid Component
 * Shows the current over's deliveries (6 balls)
 * Displays wickets with proper notation:
 * - W: just a wicket with 0 runs
 * - 1W: 1 run and wicket (run-out)
 * - 2LB+W: 2 leg-bytes and wicket
 * - 1B+W: 1 bye and wicket
 * - 1WD+W: 1 wide and wicket
 * - 2NB+W: 2 no-balls and wicket
 */
export function BallGrid() {
  const { currentInnings } = useSelector((state: RootState) => state.scorer);

  if (!currentInnings) {
    return (
      <div className="bg-white p-4">
        <p className="text-sm text-gray-600">No match in progress</p>
      </div>
    );
  }

  // Calculate which ball we're on in the current over
  const ballPosition = currentInnings.totalBalls % 6;

  // Create an array of 6 ball positions
  const balls = Array.from({ length: 6 }, (_, i) => {
    const ballIndex = Math.floor(currentInnings.totalBalls / 6) * 6 + i;
    if (ballIndex < currentInnings.ballHistory.length) {
      const ball = currentInnings.ballHistory[ballIndex];
      return {
        position: i + 1,
        filled: true,
        ball: ball,
        color: getBallColor(ball),
      };
    }
    return {
      position: i + 1,
      filled: false,
      ball: null,
      color: 'bg-gray-200',
    };
  });

  return (
    <div className="bg-white p-4 border-t">
      {/* Title */}
      <div className="text-xs font-bold text-gray-700 mb-3">THIS OVER</div>

      {/* Ball Grid - 6 slots */}
      <div className="grid grid-cols-6 gap-2">
        {balls.map((ball, idx) => (
          <div
            key={idx}
            className={`
              aspect-square rounded-lg flex items-center justify-center font-bold text-white text-xs
              transition-all transform
              ${ball.color}
              ${ball.filled ? 'scale-100' : 'scale-95 opacity-50'}
            `}
          >
            {ball.filled && ball.ball ? (
              <span>{formatBallDisplay(ball.ball as any)}</span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
          </div>
        ))}
      </div>

      {/* Current Over Counter */}
      <div className="mt-3 text-center text-xs text-gray-600">
        Over {Math.floor(currentInnings.totalBalls / 6)}.{currentInnings.totalBalls % 6}
      </div>
    </div>
  );
}

export default BallGrid;
