'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance } from '@/app/lib/firestore-mapper';
import { sendMatchUpdateNotification } from './notification-actions';
import { recomputeStatsForPlayers } from './recompute-actions';

export async function deleteMatchAction(matchId: string) {
  try {
    const db = getFirebaseAdmin();

    const affectedPlayerIds = await db.runTransaction(async (transaction) => {
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

      // Delete the match
      transaction.delete(matchRef);

      // Delete the performances
      performancesSnapshot.docs.forEach(doc => {
        transaction.delete(doc.ref);
      });

      return Array.from(new Set(performances.map(p => p.playerId)));
    });

    // Run unified recompute for affected players
    await recomputeStatsForPlayers(affectedPlayerIds);
    
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
