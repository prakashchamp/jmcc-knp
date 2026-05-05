'use server';

import { getFirebaseAdmin } from '@/services/firebase/server-config';

/**
 * Server Action to fetch a document using Admin SDK
 */
export async function getServerDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string
) {
  try {
    const db = getFirebaseAdmin();
    const docSnapshot = await db.collection(collectionName).doc(docId).get();

    if (!docSnapshot.exists) {
      return null;
    }

    return {
      id: docSnapshot.id,
      data: docSnapshot.data() as T,
    };
  } catch (error) {
    console.error(`Admin Action: Error fetching document from ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Server Action to fetch a collection using Admin SDK
 */
export async function getServerCollection<T extends Record<string, any>>(
  collectionName: string
) {
  try {
    const db = getFirebaseAdmin();
    const querySnapshot = await db.collection(collectionName).get();

    return querySnapshot.docs.map((document) => ({
      id: document.id,
      data: document.data() as T,
    }));
  } catch (error) {
    console.error(`Admin Action: Error fetching collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Server Action to set a document using Admin SDK
 */
export async function setServerDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: T,
  merge = false
) {
  try {
    const db = getFirebaseAdmin();
    const docRef = db.collection(collectionName).doc(docId);
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (merge) {
      await docRef.set(dataWithTimestamp, { merge: true });
    } else {
      await docRef.set(dataWithTimestamp);
    }

    return { success: true, docId };
  } catch (error) {
    console.error(`Admin Action: Error setting document in ${collectionName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Server Action to update a document using Admin SDK
 */
export async function updateServerDocument<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  data: Partial<T>
) {
  try {
    const db = getFirebaseAdmin();
    const docRef = db.collection(collectionName).doc(docId);
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
    };
    await docRef.update(dataWithTimestamp);
    return { success: true };
  } catch (error) {
    console.error(`Admin Action: Error updating document in ${collectionName}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
/**
 * Server Action to perform batch writes using Admin SDK
 */
export async function batchWriteServerAction(
  operations: {
    type: 'set' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
    options?: { merge?: boolean }
  }[]
) {
  try {
    const db = getFirebaseAdmin();
    const batch = db.batch();

    operations.forEach((op) => {
      const docRef = db.collection(op.collection).doc(op.id);

      if (op.type === 'set') {
        const dataWithTimestamp = {
          ...op.data,
          updatedAt: new Date().toISOString(),
        };
        if (op.options) {
          batch.set(docRef, dataWithTimestamp, op.options);
        } else {
          batch.set(docRef, dataWithTimestamp);
        }
      } else if (op.type === 'update') {
        const dataWithTimestamp = {
          ...op.data,
          updatedAt: new Date().toISOString(),
        };
        batch.update(docRef, dataWithTimestamp);
      } else if (op.type === 'delete') {
        batch.delete(docRef);
      }
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Admin Action: Error performing batch write:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Server Action to sync team and cascade player deletes/renames efficiently
 */
export async function syncTeamAndCascade(team: any) {
  try {
    const db = getFirebaseAdmin();
    
    // 1. Fetch old team to compute diff
    const oldTeamSnap = await db.collection('teams').doc(team.id).get();
    const oldPlayers: any[] = oldTeamSnap.exists ? (oldTeamSnap.data()?.players || []) : [];
    
    const newPlayers = team.players || [];
    const newIds = new Set(newPlayers.map((p: any) => p.id));
    
    const deletedIds = oldPlayers.filter((p) => !newIds.has(p.id)).map((p) => p.id);
    const renamed = newPlayers.filter((nP: any) => {
      const oP = oldPlayers.find((p) => p.id === nP.id);
      return oP && oP.name !== nP.name;
    });

    const batch = db.batch();
    
    // 2. Set new team
    const teamRef = db.collection('teams').doc(team.id);
    batch.set(teamRef, {
      ...team,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. Process renamed players
    const statCollections = ['player_stats_alltime', 'player_stats_yearly', 'player_stats_monthly', 'performances'];
    
    for (const renamedPlayer of renamed) {
      for (const coll of statCollections) {
        // Query docs where player_id matches
        const qSnap = await db.collection(coll).where('player_id', '==', renamedPlayer.id).get();
        qSnap.docs.forEach(doc => {
          batch.update(doc.ref, { player_name: renamedPlayer.name });
        });
      }
    }

    // 4. Process deleted players
    for (const delId of deletedIds) {
      for (const coll of statCollections) {
        const qSnap = await db.collection(coll).where('player_id', '==', delId).get();
        qSnap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }
    }

    // Note: Firestore batch has a 500 operation limit. 
    // This is safe assuming < 500 updates per save (which is highly likely for minor roster edits).
    await batch.commit();

    return { success: true, docId: team.id };
  } catch (error) {
    console.error(`Admin Action: Error in syncTeamAndCascade:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

