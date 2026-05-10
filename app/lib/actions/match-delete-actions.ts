'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance } from '@/app/lib/firestore-mapper';
import { sendMatchUpdateNotification } from './notification-actions';

/**
 * Decrement stats logic to reverse calculateUpdatedStats.
 * Does not recompute highest score or best bowling, as that would require full history queries.
 */
function calculateDecrementedStats(stats: any, perf: Performance) {
  stats.matches = Math.max(0, (stats.matches || 1) - 1);
  stats.last_updated = admin.firestore.Timestamp.now();

  if (perf.batting.didBat) {
    stats.bat_innings = Math.max(0, (stats.bat_innings || 0) - 1);
    stats.bat_runs = Math.max(0, (stats.bat_runs || 0) - perf.batting.runs);
    stats.bat_balls = Math.max(0, (stats.bat_balls || 0) - perf.batting.balls);
    stats.bat_fours = Math.max(0, (stats.bat_fours || 0) - perf.batting.fours);
    stats.bat_sixes = Math.max(0, (stats.bat_sixes || 0) - perf.batting.sixes);
    
    if (perf.batting.dismissed) {
      stats.bat_dismissed = Math.max(0, (stats.bat_dismissed || 0) - 1);
    } else {
      stats.bat_not_out = Math.max(0, (stats.bat_not_out || 0) - 1);
    }
    
    if (perf.batting.isDuck) stats.bat_ducks = Math.max(0, (stats.bat_ducks || 0) - 1);
    if (perf.batting.isThirty) stats.bat_thirties = Math.max(0, (stats.bat_thirties || 0) - 1);
    if (perf.batting.isFifty) stats.bat_fifties = Math.max(0, (stats.bat_fifties || 0) - 1);
    if (perf.batting.isHundred) stats.bat_hundreds = Math.max(0, (stats.bat_hundreds || 0) - 1);
    
    const dismissals = stats.bat_dismissed || 0;
    stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
    stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
  }

  if (perf.bowling.didBowl) {
    stats.bowl_innings = Math.max(0, (stats.bowl_innings || 0) - 1);
    stats.bowl_runs = Math.max(0, (stats.bowl_runs || 0) - perf.bowling.runs);
    stats.bowl_wickets = Math.max(0, (stats.bowl_wickets || 0) - perf.bowling.wickets);
    
    const perfBalls = (perf.bowling.overs * 6) + perf.bowling.balls;
    stats.bowl_balls = Math.max(0, (stats.bowl_balls || 0) - perfBalls);
    stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
    stats.bowl_maidens = Math.max(0, (stats.bowl_maidens || 0) - perf.bowling.maidens);
    
    if (perf.bowling.isThreeFer) stats.bowl_three_fers = Math.max(0, (stats.bowl_three_fers || 0) - 1);
    if (perf.bowling.isFourFer) stats.bowl_four_fers = Math.max(0, (stats.bowl_four_fers || 0) - 1);
    if (perf.bowling.isFiveFer) stats.bowl_five_fers = Math.max(0, (stats.bowl_five_fers || 0) - 1);

    stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
    const totalOvers = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
    stats.bowl_economy = totalOvers > 0 ? stats.bowl_runs / totalOvers : 0;
    stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
  }

  return stats;
}

export async function deleteMatchAction(matchId: string) {
  try {
    const db = getFirebaseAdmin();

    await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }

      const matchData = matchDoc.data();
      const matchDate = matchData?.date || matchData?.created_at || new Date().toISOString();
      const istFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit'
      });
      const parts = istFormatter.formatToParts(new Date(matchDate));
      const year = parts.find(p => p.type === 'year')?.value || new Date(matchDate).getUTCFullYear().toString();
      const monthRaw = parts.find(p => p.type === 'month')?.value || (new Date(matchDate).getUTCMonth() + 1).toString().padStart(2, '0');
      const month = `${year}-${monthRaw}`;

      // Fetch performances for this match
      const performancesSnapshot = await transaction.get(
        db.collection('performances').where('match_id', '==', matchId)
      );

      const performances = performancesSnapshot.docs.map(doc => 
        mapFirestoreToPerformance({ id: doc.id, ...doc.data() })
      );

      // Prepare stats documents to read
      const statsToUpdate: { ref: admin.firestore.DocumentReference, perf: Performance, scope: any }[] = [];

      for (const perf of performances) {
        // DO NOT skip if !didBat && !didBowl because we need to decrement their match count!

        const scopes = [
          { coll: 'player_stats_alltime', id: perf.playerId },
          { coll: 'player_stats_yearly', id: `${perf.playerId}_${year}`, year },
          { coll: 'player_stats_monthly', id: `${perf.playerId}_${month}`, month, year }
        ];

        for (const scope of scopes) {
          statsToUpdate.push({
            ref: db.collection(scope.coll).doc(scope.id),
            perf,
            scope
          });
        }
      }

      // Read all stats docs
      const statsDocs = statsToUpdate.length > 0 
        ? await transaction.getAll(...statsToUpdate.map(s => s.ref))
        : [];

      // PERFORM ALL WRITES
      // Delete the match
      transaction.delete(matchRef);

      // Delete the performances
      performancesSnapshot.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      // Update stats based on pre-read data
      statsToUpdate.forEach((item, index) => {
        const doc = statsDocs[index];
        if (doc.exists) {
          const stats = doc.data();
          const decrementedStats = calculateDecrementedStats(stats, item.perf);

          if (decrementedStats.matches <= 0) {
            // If no matches left in this scope, delete the stat doc
            transaction.delete(item.ref);
          } else {
            transaction.set(item.ref, decrementedStats);
          }
        }
      });
    });
    
    // Trigger Push Notification & Cache Clearing
    try {
      await sendMatchUpdateNotification(
        'Match Removed',
        'A match was deleted by the administrator.',
        { type: 'MATCH_UPDATE' }
      );
    } catch (e) {
      console.error('Notification Error:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('deleteMatchAction Error:', error);
    return { success: false, error: error.message || 'Failed to delete match' };
  }
}
