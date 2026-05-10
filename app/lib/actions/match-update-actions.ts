'use server';

import * as admin from 'firebase-admin';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import { Performance, Match } from '@/app/lib/cricket-schema';
import { mapFirestoreToPerformance, mapPerformanceToFirestore, mapMatchToFirestore, findTopBatters, findTopBowlers, findBestBatter, findBestBowler } from '@/app/lib/firestore-mapper';
import { createNewPlayer } from '@/app/lib/player-utils';
import { sendMatchUpdateNotification } from './notification-actions';
import { recomputeStatsForPlayers } from './recompute-actions';



export async function updateMatchAction(matchId: string, updatedMatch: Match, updatedPerformances: Performance[]) {
  const db = getFirebaseAdmin();

  try {
    // 1. Fetch old performances OUTSIDE transaction to avoid wide locks
    const oldPerfsSnapshot = await db.collection('performances')
      .where('match_id', '==', matchId)
      .get();
    
    const oldPerfs = oldPerfsSnapshot.docs.map(doc => 
      mapFirestoreToPerformance({ id: doc.id, ...doc.data() })
    );

    const affectedPlayerIds = Array.from(new Set([
      ...oldPerfs.map(p => p.playerId),
      ...updatedPerformances.map(p => p.playerId)
    ]));

    // RESOLVE AND UPDATE TEAM ROSTER
    const teamDoc = await db.collection('teams').doc('jmcc_spartans_singleton').get();
    const teamData = teamDoc.data();
    const teamPlayers = teamData?.players || [];
    const existingPlayers = new Map<string, string>();
    const existingNames = new Set<string>();

    teamPlayers.forEach((player: any) => {
      const nameKey = player.name.toLowerCase().trim();
      existingPlayers.set(nameKey, player.id);
      existingNames.add(nameKey);
    });

    const newPlayersToAdd: any[] = [];
    for (const perf of updatedPerformances) {
      const nameKey = perf.playerName.toLowerCase().trim();
      let trueId = existingPlayers.get(nameKey);

      if (!trueId && perf.playerId) {
        const playerById = teamPlayers.find((p: any) => p.id === perf.playerId);
        if (playerById) trueId = playerById.id;
      }

      if (!trueId) {
        const newPlayer = createNewPlayer(perf.playerName, existingNames);
        perf.playerId = newPlayer.id;
        perf.playerName = newPlayer.name;
        existingPlayers.set(newPlayer.name.toLowerCase().trim(), newPlayer.id);
        existingNames.add(newPlayer.name.toLowerCase().trim());
        newPlayersToAdd.push(newPlayer);
      } else {
        perf.playerId = trueId;
      }
    }

    if (newPlayersToAdd.length > 0) {
      const updatedRoster = [...teamPlayers, ...newPlayersToAdd].map(p => {
        const clean: any = { id: p.id, name: p.name };
        if (p.jerseyNumber !== undefined) clean.jerseyNumber = p.jerseyNumber;
        return clean;
      });
      await db.collection('teams').doc('jmcc_spartans_singleton').update({
        players: updatedRoster,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 2. WRITES completed

    await recomputeStatsForPlayers(affectedPlayerIds);

    // Trigger Push Notification & Cache Clearing
    try {
      await sendMatchUpdateNotification(
        'Stats Corrected!',
        `Match against ${updatedMatch.opponent} was updated by Admin.`,
        { type: 'MATCH_UPDATE' }
      );
    } catch (e) {
      console.error('Notification Error:', e);
    }

    return { success: true };
  } catch (error: any) {
    console.error('updateMatchAction Error:', error);
    return { success: false, error: error.message || 'Failed to update match' };
  }
}
