/**
 * Cricket Scorer Engine
 * 
 * Core business logic for cricket match scoring
 * Handles all delivery types, strike rotation, dismissals, and undo mechanisms
 */

import { DismissalMode, ExtraType, TeamPlayer, CurrentBatsman, InningsState } from '@/app/lib/cricket-scorer-types';
import {
  recordBattingBall,
  recordBye,
  recordLegBye,
  recordWide,
  recordNoBall,
  recordQuickWicket,
  recordStumpedWide,
  recordRunOutBall,
  recordWicket,
  replaceBatsman,
  createUndoSnapshot,
  undoLastDelivery,
  openDialog,
  closeDialog,
} from '@/app/lib/redux/slices/scorerSlice';

export class CricketScoringEngine {
  /**
   * Record a regular batting delivery (0-7 runs)
   */
  static recordBattingDelivery(runs: number) {
    if (runs < 0 || runs > 7) {
      throw new Error('Invalid runs: must be between 0-7');
    }
    return recordBattingBall({ runs });
  }

  /**
   * Record bye runs (1-7)
   */
  static recordByeDelivery(runs: number, hasWicket: boolean = false) {
    if (runs < 1 || runs > 7) {
      throw new Error('Invalid bye runs: must be between 1-7');
    }
    return recordBye({ runs, hasWicket });
  }

  /**
   * Record leg-bye runs (1-7)
   */
  static recordLegByeDelivery(runs: number, hasWicket: boolean = false) {
    if (runs < 1 || runs > 7) {
      throw new Error('Invalid leg-bye runs: must be between 1-7');
    }
    return recordLegBye({ runs, hasWicket });
  }

  /**
   * Record wide delivery (0-7 runs, doesn't count as bowler ball)
   */
  static recordWideDelivery(runs: number, hasWicket: boolean = false) {
    if (runs < 0 || runs > 7) {
      throw new Error('Invalid wide runs: must be between 0-7');
    }
    return recordWide({ runs, hasWicket });
  }

  /**
   * Record no-ball delivery (0-7 runs + penalty, doesn't count as bowler ball)
   * Must specify run type: leg-bye, bye, or none
   */
  static recordNoBallDelivery(
    runs: number,
    runType: 'leg-bye' | 'bye' | 'none',
    hasWicket: boolean = false
  ) {
    if (runs < 0 || runs > 7) {
      throw new Error('Invalid no-ball runs: must be between 0-7');
    }
    if (!['leg-bye', 'bye', 'none'].includes(runType)) {
      throw new Error('Invalid run type: must be leg-bye, bye, or none');
    }
    return recordNoBall({ runs, hasWicket, runType });
  }

  /**
   * Handle extra delivery with optional wicket
   * Used by dialogs when user selects Run Type after extra
   */
  static recordExtraWithOptionalWicket(
    extraType: ExtraType,
    runs: number,
    runType: 'leg-bye' | 'bye' | 'none' | undefined,
    hasWicket: boolean
  ) {
    switch (extraType) {
      case 'bye':
        return this.recordByeDelivery(runs, hasWicket);
      case 'leg-bye':
        return this.recordLegByeDelivery(runs, hasWicket);
      case 'wide':
        return this.recordWideDelivery(runs, hasWicket);
      case 'no-ball':
        return this.recordNoBallDelivery(runs, runType || 'none', hasWicket);
      default:
        throw new Error(`Unknown extra type: ${extraType}`);
    }
  }

  /**
   * Record wicket with dismissal mode
   */
  static recordDismissal(dismissalMode: DismissalMode, batsmanId: string) {
    const validModes: DismissalMode[] = [
      'bowled',
      'lbw',
      'caught',
      'run-out',
      'stumped',
      'handled-ball',
      'obstructing-field',
      'hit-wicket',
      'retired-hurt',
      'retired-out',
    ];

    if (!validModes.includes(dismissalMode)) {
      throw new Error(`Invalid dismissal mode: ${dismissalMode}`);
    }

    return recordWicket({ dismissalMode, batsmanId });
  }

  /**
   * Record quick wicket (bowled, caught, LBW, hit wicket)
   * Single button press - records 0-run ball + wicket + bowler stats
   * No dialog required for these immediate dismissals
   */
  static recordQuickDismissal(dismissalMode: 'bowled' | 'caught' | 'lbw' | 'hit-wicket') {
    const validModes: Array<'bowled' | 'caught' | 'lbw' | 'hit-wicket'> = ['bowled', 'caught', 'lbw', 'hit-wicket'];

    if (!validModes.includes(dismissalMode)) {
      throw new Error(`Invalid quick dismissal mode: ${dismissalMode}`);
    }

    return recordQuickWicket({ dismissalMode });
  }

  /**
   * Record stumped wicket off a wide ball
   * Records as wide delivery (runs + 1 penalty) with stumped dismissal
   * Runs parameter is the wide runs (0+), adds 1 penalty automatically
   */
  static recordStumpedOffWide(runs: number) {
    if (runs < 0 || runs > 7) {
      throw new Error('Invalid stumped wide runs: must be between 0-7');
    }
    return recordStumpedWide({ runs });
  }

  /**
   * Record run-out, handling the ball, or obstructing the field
   * Combines ball recording (WD/B/LB/NB/regular) + run-out dismissal
   * 
   * Key difference: NO wicket is added to bowler
   * Marks the specified batsman (striker or non-striker) as out
   */
  static recordRunOut(
    dismissalMode: 'run-out' | 'handled-ball' | 'obstructing-field',
    ballType: 'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular',
    runs: number,
    batsmanIdToMarkOut: string
  ) {
    const validModes: Array<'run-out' | 'handled-ball' | 'obstructing-field'> = [
      'run-out',
      'handled-ball',
      'obstructing-field',
    ];
    const validBallTypes: Array<'wide' | 'bye' | 'leg-bye' | 'no-ball' | 'regular'> = [
      'wide',
      'bye',
      'leg-bye',
      'no-ball',
      'regular',
    ];

    if (!validModes.includes(dismissalMode)) {
      throw new Error(`Invalid run-out dismissal mode: ${dismissalMode}`);
    }
    if (!validBallTypes.includes(ballType)) {
      throw new Error(`Invalid ball type: ${ballType}`);
    }
    if (runs < 0 || runs > 7) {
      throw new Error('Invalid runs: must be between 0-7');
    }
    if (!batsmanIdToMarkOut) {
      throw new Error('Must specify which batsman to mark out');
    }

    return recordRunOutBall({ dismissalMode, ballType, runs, batsmanIdToMarkOut });
  }

  /**
   * Replace dismissed batsman with new batsman
   */
  static replaceOutBatsman(outBatsmanId: string, newBatsman: TeamPlayer, isStriker: boolean) {
    if (!newBatsman.id || !newBatsman.name) {
      throw new Error('Invalid batsman data');
    }
    return replaceBatsman({ outBatsmanId, newBatsman, isStriker });
  }

  /**
   * Create undo snapshot before recording ball
   */
  static prepareUndo() {
    return createUndoSnapshot();
  }

  /**
   * Undo last delivery
   */
  static undo() {
    return undoLastDelivery();
  }

  /**
   * Open extra dialog (bye, leg-bye, wide, no-ball)
   */
  static openExtraDialog(extraType: ExtraType) {
    return openDialog({
      dialog: 'extra',
      data: { extraType, hasWicket: false },
    });
  }

  /**
   * Open wicket dismissal mode selection dialog
   */
  static openWicketDialog() {
    return openDialog({ dialog: 'wicket' });
  }

  /**
   * Open Run Out special flow dialog (asks batsman selection)
   */
  static openRunOutDialog() {
    return openDialog({ dialog: 'runOut' });
  }

  /**
   * Open batsman selection modal (for new batter after wicket)
   */
  static openBatsmanSelectionModal() {
    return openDialog({ dialog: 'batsmanSelect' });
  }

  /**
   * Open finish innings modal
   */
  static openFinishInningsModal() {
    return openDialog({ dialog: 'finishInnings' });
  }

  /**
   * Close current dialog
   */
  static closeDialog() {
    return closeDialog();
  }

  /**
   * Calculate current over number and ball number
   */
  static getOverDetails(totalBalls: number): { overs: number; balls: number; ballPosition: number } {
    const overs = Math.floor(totalBalls / 6);
    const balls = totalBalls % 6;
    const ballPosition = balls; // 0-5 position in current over

    return { overs, balls, ballPosition };
  }

  /**
   * Get strikeRate percentage
   */
  static calculateStrikeRate(runs: number, balls: number): number {
    if (balls === 0) return 0;
    return parseFloat(((runs / balls) * 100).toFixed(2));
  }

  /**
   * Get economy rate for bowler
   */
  static calculateEconomy(runs: number, overs: number, balls: number): number {
    const totalBalls = overs * 6 + balls;
    if (totalBalls === 0) return 0;
    const totalOvers = totalBalls / 6;
    return parseFloat((runs / totalOvers).toFixed(2));
  }

  /**
   * Get current run rate
   */
  static calculateCurrentRunRate(runs: number, overs: number, balls: number): number {
    const totalBalls = overs * 6 + balls;
    if (totalBalls === 0) return 0;
    const totalOvers = totalBalls / 6;
    return parseFloat((runs / totalOvers).toFixed(2));
  }

  /**
   * Check if inning is complete (10 wickets)
   */
  static isInningsComplete(innings: InningsState): boolean {
    return innings.totalWickets >= 10;
  }

  /**
   * Get available batsmen for replacement.
   * Only include players who are:
   * 1. Not currently at the crease (striker or non-striker)
   * 2. AND (Have not batted yet OR retired hurt)
   */
  static getAvailableBatsmen(allPlayers: TeamPlayer[], innings: InningsState): TeamPlayer[] {
    const atCreaseIds = new Set<string>();
    if (innings.striker) atCreaseIds.add(innings.striker.id);
    if (innings.nonStriker) atCreaseIds.add(innings.nonStriker.id);

    const alreadyBattedIds = new Set<string>();
    const retiredHurtIds = new Set<string>();

    innings.batsmanStats.forEach((batsman) => {
      alreadyBattedIds.add(batsman.id);
      if (batsman.dismissal?.mode === 'retired-hurt') {
        retiredHurtIds.add(batsman.id);
      }
    });

    // Also check dismissedBatsmen just in case they are not in batsmanStats
    innings.dismissedBatsmen.forEach((dismissed) => {
      alreadyBattedIds.add(dismissed.id);
      if (dismissed.dismissal?.mode === 'retired-hurt') {
        retiredHurtIds.add(dismissed.id);
      }
    });

    return allPlayers.filter((player) => {
      // 1. Cannot be currently at the crease
      if (atCreaseIds.has(player.id)) return false;
      
      // 2. If they have already batted, they MUST be retired hurt to be shown again
      if (alreadyBattedIds.has(player.id)) {
        return retiredHurtIds.has(player.id);
      }
      
      // 3. Otherwise they haven't batted yet (Available)
      return true;
    });
  }

  /**
   * Validate delivery is legal
   */
  static isLegalDelivery(extraType?: ExtraType): boolean {
    if (!extraType) return true; // Regular delivery is legal
    return extraType === 'bye' || extraType === 'leg-bye'; // Legal
  }

  /**
   * Get sixes and fours
   */
  static countBoundaries(batsman: CurrentBatsman): { fours: number; sixes: number } {
    return {
      fours: batsman.fours,
      sixes: batsman.sixes,
    };
  }
}

export default CricketScoringEngine;
