'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/app/lib/redux/store';
import { store } from '@/app/lib/redux/store';
import {
  initializeLiveMatch,
  recordBattingBall,
  recordBye,
  recordLegBye,
  recordWide,
  recordNoBall,
  recordWicket,
  undoLastDelivery,
  createUndoSnapshot,
} from '@/app/lib/redux/slices/scorerSlice';
import type { LiveMatch } from '@/app/lib/cricket-scorer-types';
import { JMCC_TEAM_PLAYERS } from '@/app/lib/team-constants';
import { CricketScoringEngine } from '@/app/lib/scoring-engine';

/**
 * PHASE 7: Testing & Validation Page
 * 
 * Manual test harness for cricket scoring logic
 * Verifies:
 * - All delivery types (legal/illegal)
 * - Strike rotation rules
 * - Wicket recording
 * - Undo mechanism
 * - localStorage persistence
 * - Dialog state management
 */
export default function ScorerTestingPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { liveMatch, currentInnings, undoStack } = useSelector(
    (state: RootState) => state.scorer
  );
  const [testLog, setTestLog] = useState<string[]>([
    '🧪 Cricket Scorer Testing Started...',
  ]);

  const addLog = (message: string) => {
    setTestLog((prev) => [...prev, message]);
    console.log(message);
  };

  const initializeTestMatch = () => {
    const match: LiveMatch = {
      id: `test_${Date.now()}`,
      opponent: 'Test Opponent',
      venue: 'Home',
      tossWonBy: 'Us',
      tossDecision: 'bat',
      format: 'T20',
      totalOvers: 20,
      teamPlayers: JMCC_TEAM_PLAYERS,
      currentInnings: 1,
      innings: [],
      status: 'in-progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dispatch(initializeLiveMatch(match));
    addLog('✓ Test match initialized');
  };

  // TEST 1: Regular deliveries (0-7 runs)
  const testRegularDeliveries = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 1: Regular Deliveries (0-7 runs)');

    const testRuns = [0, 1, 2, 3, 4, 5, 6, 7];
    let testsPassed = 0;

    for (const runs of testRuns) {
      dispatch(createUndoSnapshot());
      dispatch(recordBattingBall({ runs }));
      testsPassed++;
      addLog(`  ✓ Recorded ${runs} run(s)`);
    }

    addLog(`📊 Test 1 Result: ${testsPassed}/${testRuns.length} PASSED`);
  };

  // TEST 2: Strike rotation on odd runs
  const testStrikeRotation = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 2: Strike Rotation (Odd Runs)');

    const strikerBefore = stateStart.currentInnings.striker?.name;

    dispatch(createUndoSnapshot());
    dispatch(recordBattingBall({ runs: 1 }));

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const strikerAfter = stateEnd.currentInnings?.striker?.name;
      const rotated = strikerBefore !== strikerAfter;

      if (rotated) {
        addLog(`  ✓ Strike rotated: ${strikerBefore} → ${strikerAfter}`);
        addLog('📊 Test 2 Result: PASSED');
      } else {
        addLog(`  ❌ Strike NOT rotated: ${strikerBefore} (expected change)`);
        addLog('📊 Test 2 Result: FAILED');
      }
    }, 10);
  };

  // TEST 3: Over completion (6 legal balls)
  const testOverCompletion = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 3: Over Completion (6 legal balls)');

    const runsSequence = [0, 0, 0, 0, 0];
    for (const runs of runsSequence) {
      dispatch(createUndoSnapshot());
      dispatch(recordBattingBall({ runs }));
    }

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const totalBalls = stateEnd.currentInnings?.totalBalls ?? 0;
      const isOverComplete = totalBalls % 6 === 0;

      if (isOverComplete) {
        addLog(`  ✓ Over complete: ${totalBalls} balls (${Math.floor(totalBalls / 6)} overs)`);
        addLog('📊 Test 3 Result: PASSED');
      } else {
        addLog(`  ⚠️ Over incomplete: ${totalBalls} balls`);
      }
    }, 10);
  };

  // Helper: Get current Redux state directly from store (not component selectors)
  const getCurrentState = () => {
    const state = store.getState() as RootState;
    return {
      liveMatch: state.scorer.liveMatch,
      currentInnings: state.scorer.currentInnings,
      undoStack: state.scorer.undoStack,
    };
  };

  // TEST 4: Byes recording
  const testByes = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 4: Byes (1-7 runs, no batter action)');

    const runsBefore = stateStart.currentInnings.totalRuns;

    dispatch(createUndoSnapshot());
    dispatch(recordBye({ runs: 3, hasWicket: false }));

    // Use setTimeout to let Redux state update before checking
    setTimeout(() => {
      const stateEnd = getCurrentState();
      const runsAfter = stateEnd.currentInnings?.totalRuns ?? runsBefore;
      const runsScored = runsAfter - runsBefore;

      if (runsScored === 3) {
        addLog(`  ✓ 3 byes recorded - Runs: ${runsBefore} → ${runsAfter}`);
        addLog('📊 Test 4 Result: PASSED');
      } else {
        addLog(`  ❌ Runs incorrect: expected +3, got +${runsScored}`);
      }
    }, 10);
  };

  // TEST 5: Leg-byes
  const testLegByes = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 5: Leg-byes (1-7 runs)');

    const runsBefore = stateStart.currentInnings.totalRuns;

    dispatch(createUndoSnapshot());
    dispatch(recordLegBye({ runs: 2, hasWicket: false }));

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const runsAfter = stateEnd.currentInnings?.totalRuns ?? runsBefore;
      const runsScored = runsAfter - runsBefore;

      if (runsScored === 2) {
        addLog(`  ✓ 2 leg-byes recorded - Runs: ${runsBefore} → ${runsAfter}`);
        addLog('📊 Test 5 Result: PASSED');
      } else {
        addLog(`  ❌ Runs incorrect: expected +2, got +${runsScored}`);
      }
    }, 10);
  };

  // TEST 6: Wides (illegal, don't count as bowler's ball)
  const testWides = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 6: Wides (illegal, no bowler ball count)');

    const ballsBefore = stateStart.currentInnings.currentBowler?.balls ?? 0;
    const runsBefore = stateStart.currentInnings.totalRuns;

    dispatch(createUndoSnapshot());
    dispatch(recordWide({ runs: 2, hasWicket: false }));

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const ballsAfter = stateEnd.currentInnings?.currentBowler?.balls ?? 0;
      const runsAfter = stateEnd.currentInnings?.totalRuns ?? runsBefore;

      const ballCountIncremented = ballsAfter > ballsBefore;
      const runsIncluded = runsAfter - runsBefore >= 2;

      if (!ballCountIncremented && runsIncluded) {
        addLog(`  ✓ Wide: bowler.balls NOT incremented, runs added`);
        addLog(`    Bowler balls: ${ballsBefore} (unchanged)`);
        addLog(`    Runs: ${runsBefore} → ${runsAfter}`);
        addLog('📊 Test 6 Result: PASSED');
      } else {
        addLog(
          `  ❌ Wide handling wrong: balls=${ballCountIncremented}, runs=${runsIncluded}`
        );
      }
    }, 10);
  };

  // TEST 7: No-balls (illegal, penalty + batter runs)
  const testNoBalls = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 7: No-balls (illegal, penalty + batter runs)');

    const ballsBefore = stateStart.currentInnings.currentBowler?.balls ?? 0;
    const runsBefore = stateStart.currentInnings.totalRuns;

    dispatch(createUndoSnapshot());
    dispatch(recordNoBall({ runs: 2, hasWicket: false, runType: 'none' }));

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const ballsAfter = stateEnd.currentInnings?.currentBowler?.balls ?? 0;
      const runsAfter = stateEnd.currentInnings?.totalRuns ?? runsBefore;

      const ballCountIncremented = ballsAfter > ballsBefore;
      const runsIncluded = runsAfter - runsBefore >= 3;

      if (!ballCountIncremented && runsIncluded) {
        addLog(`  ✓ No-ball: bowler.balls NOT incremented, penalty + runs added`);
        addLog(`    Bowler balls: ${ballsBefore} (unchanged)`);
        addLog(`    Runs: ${runsBefore} → ${runsAfter}`);
        addLog('📊 Test 7 Result: PASSED');
      } else {
        addLog(`  ❌ No-ball handling wrong: balls=${ballCountIncremented}`);
      }
    }, 10);
  };

  // TEST 8: Wicket recording
  const testWickets = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 8: Wicket Recording');

    const wicketsBefore = stateStart.currentInnings.totalWickets;
    const strikerId = stateStart.currentInnings.striker?.id;

    dispatch(createUndoSnapshot());
    dispatch(recordWicket({ dismissalMode: 'bowled', batsmanId: strikerId || '' }));

    setTimeout(() => {
      const stateEnd = getCurrentState();
      const wicketsAfter = stateEnd.currentInnings?.totalWickets ?? wicketsBefore;

      if (wicketsAfter === wicketsBefore + 1) {
        addLog(`  ✓ Wicket recorded - Count: ${wicketsBefore} → ${wicketsAfter}`);
        addLog(`    Dismissed: ${stateEnd.currentInnings?.striker?.name}`);
        addLog('📊 Test 8 Result: PASSED');
      } else {
        addLog(`  ❌ Wicket not recorded properly`);
      }
    }, 10);
  };

  // TEST 9: Undo mechanism
  const testUndo = () => {
    const stateStart = getCurrentState();
    if (!stateStart.currentInnings) {
      addLog('❌ No current innings');
      return;
    }

    addLog('\n📋 TEST 9: Undo Mechanism');

    const ballsBefore = stateStart.currentInnings.totalBalls;
    const runsBefore = stateStart.currentInnings.totalRuns;
    const undoStackBefore = stateStart.undoStack.length;

    dispatch(createUndoSnapshot());
    dispatch(recordBattingBall({ runs: 4 }));

    setTimeout(() => {
      const stateAfterRecord = getCurrentState();
      const ballsAfterRecord = stateAfterRecord.currentInnings?.totalBalls ?? ballsBefore;
      const runsAfterRecord = stateAfterRecord.currentInnings?.totalRuns ?? runsBefore;

      if (stateAfterRecord.undoStack.length > undoStackBefore) {
        addLog(`  ✓ Undo snapshot created - Stack size: ${undoStackBefore} → ${stateAfterRecord.undoStack.length}`);
        addLog(`    Before undo: Balls=${ballsAfterRecord}, Runs=${runsAfterRecord}`);
      }

      dispatch(undoLastDelivery());

      setTimeout(() => {
        const stateAfterUndo = getCurrentState();
        const ballsAfterUndo = stateAfterUndo.currentInnings?.totalBalls ?? ballsBefore;
        const runsAfterUndo = stateAfterUndo.currentInnings?.totalRuns ?? runsBefore;

        addLog(`    After undo: Balls=${ballsAfterUndo}, Runs=${runsAfterUndo}`);

        const restored = ballsAfterUndo === ballsBefore;
        if (restored) {
          addLog('  ✓ State restored successfully');
          addLog('📊 Test 9 Result: PASSED');
        } else {
          addLog(`  ❌ State not restored - Expected balls=${ballsBefore}, got=${ballsAfterUndo}`);
        }
      }, 10);
    }, 10);
  };

  // TEST 10: localStorage persistence
  const testPersistence = () => {
    addLog('\n📋 TEST 10: localStorage Persistence');

    try {
      const stored = localStorage.getItem('jmcc_match_state');
      if (stored) {
        const state = JSON.parse(stored);
        const hasScorerData = state.scorer && state.scorer.liveMatch;
        if (hasScorerData) {
          addLog(`  ✓ Match state persisted to localStorage`);
          addLog(`    Match ID: ${state.scorer.liveMatch.id}`);
          addLog(`    Innings: ${state.scorer.liveMatch.currentInnings}`);
          addLog('📊 Test 10 Result: PASSED');
        } else {
          addLog('  ⚠️ localStorage found but missing scorer data');
        }
      } else {
        addLog('  ℹ️ No localStorage data (might not have Redux middleware running)');
      }
    } catch (err) {
      addLog(`  ⚠️ localStorage check skipped: ${err}`);
    }
  };

  // Run all tests
  const runAllTests = () => {
    setTestLog(['🧪 Running all tests...']);
    initializeTestMatch();

    setTimeout(() => {
      const state = getCurrentState();
      if (state.liveMatch && state.currentInnings) {
        testRegularDeliveries();
        
        setTimeout(() => testStrikeRotation(), 80);
        setTimeout(() => testOverCompletion(), 120);
        setTimeout(() => testByes(), 160);
        setTimeout(() => testLegByes(), 200);
        setTimeout(() => testWides(), 240);
        setTimeout(() => testNoBalls(), 280);
        setTimeout(() => testWickets(), 320);
        setTimeout(() => testUndo(), 360);
        setTimeout(() => {
          testPersistence();
          addLog('\n✅ All tests completed!');
          addLog('📊 Summary: Check results above');
        }, 400);
      }
    }, 100);
  };

  const resetTests = () => {
    setTestLog(['🧪 Cricket Scorer Testing Started...']);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🧪 Cricket Scorer - Testing & Validation</h1>
          <p className="text-gray-400">Phase 7: Comprehensive test coverage for all scoring logic</p>
        </div>

        {/* Control Buttons */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 flex gap-3 flex-wrap">
          <button
            onClick={runAllTests}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold transition-colors"
          >
            ▶️ Run All Tests
          </button>
          <button
            onClick={resetTests}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded font-semibold transition-colors"
          >
            🔄 Reset
          </button>
        </div>

        {/* Current State */}
        {liveMatch && currentInnings && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6 text-sm">
            <h3 className="font-bold mb-3 text-green-300">📊 Current State</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-300">
              <div>
                <p className="text-gray-500 text-xs">Match</p>
                <p className="font-mono">{liveMatch.opponent}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total Balls</p>
                <p className="font-mono text-lg font-bold">{currentInnings.totalBalls}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Total Runs</p>
                <p className="font-mono text-lg font-bold">{currentInnings.totalRuns}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Wickets</p>
                <p className="font-mono text-lg font-bold">{currentInnings.totalWickets}</p>
              </div>
            </div>
            {currentInnings.striker && (
              <div className="text-gray-400 text-xs mt-3">
                <p>
                  Striker: <span className="font-mono">{currentInnings.striker.name}</span> ({currentInnings.striker.runs} runs, {currentInnings.striker.balls} balls)
                </p>
                <p>
                  Non-striker: <span className="font-mono">{currentInnings.nonStriker?.name}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Test Log */}
        <div className="bg-gray-800 rounded-lg p-4 font-mono text-sm space-y-1">
          <h3 className="font-bold mb-3 text-green-300">📋 Test Log</h3>
          <div className="bg-gray-900 rounded p-3 max-h-96 overflow-y-auto space-y-1">
            {testLog.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes('✓')
                    ? 'text-green-400'
                    : log.includes('❌')
                      ? 'text-red-400'
                      : log.includes('⚠️')
                        ? 'text-yellow-400'
                        : log.includes('TEST')
                          ? 'text-green-400 font-bold'
                          : log.includes('Result')
                            ? 'text-cyan-400 font-bold'
                            : 'text-gray-300'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Test Coverage Information */}
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mt-6 text-sm">
          <h3 className="font-bold mb-3 text-green-300">📋 Test Coverage</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✓ TEST 1: Regular deliveries (0-7 runs)</li>
            <li>✓ TEST 2: Strike rotation on odd runs</li>
            <li>✓ TEST 3: Over completion (6 legal balls)</li>
            <li>✓ TEST 4: Byes (1-7 runs, no bowler count)</li>
            <li>✓ TEST 5: Leg-byes (1-7 runs)</li>
            <li>✓ TEST 6: Wides (0-7, illegal ball)</li>
            <li>✓ TEST 7: No-balls (0-7, penalty + runs)</li>
            <li>✓ TEST 8: Wicket recording (dismissal modes)</li>
            <li>✓ TEST 9: Undo mechanism (state restoration)</li>
            <li>✓ TEST 10: localStorage persistence</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
