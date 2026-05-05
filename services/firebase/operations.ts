import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  QueryConstraint,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  getDocsFromCache,
  getDocsFromServer,
  getDocFromServer
} from "firebase/firestore";
import { db } from "./config";
import { Match } from "@/app/lib/cricket-schema";
import { mapFirestoreToMatch, mapFirestoreToPerformance } from "@/app/lib/firestore-mapper";

/**
 * Fetch all matches using Client SDK (uses cache automatically)
 */
export async function getMatchesClient(forceRefresh = false): Promise<Match[]> {
  try {
    const matchesRef = collection(db, "matches");
    const q = query(matchesRef, orderBy("created_at", "desc"));
    
    // If forceRefresh is true, fetch from server to update cache
    // Otherwise, default getDocs() tries cache first, then server
    const querySnapshot = forceRefresh 
      ? await getDocsFromServer(q) 
      : await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      mapFirestoreToMatch({ id: doc.id, ...doc.data() })
    );
  } catch (error) {
    console.error("Client SDK: Error fetching matches:", error);
    throw error;
  }
}

/**
 * Fetch match by ID using Client SDK
 */
export async function getMatchClient(matchId: string): Promise<Match | null> {
  try {
    const docRef = doc(db, "matches", matchId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return mapFirestoreToMatch({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    console.error("Client SDK: Error fetching match:", error);
    throw error;
  }
}

/**
 * Fetch top batters using Client SDK
 */
export async function getTopBattersClient(limitCount = 3): Promise<any[]> {
  try {
    const collRef = collection(db, "player_stats_alltime");
    const q = query(collRef, orderBy("bat_runs", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        playerId: data.player_id,
        playerName: data.player_name || 'Unknown',
        totalMatches: data.matches || 0,
        totalInnings: data.bat_innings || 0,
        totalRuns: data.bat_runs || 0,
        bestScore: data.bat_highest || 0,
      };
    });
  } catch (error) {
    console.error("Client SDK: Error fetching top batters:", error);
    throw error;
  }
}

/**
 * Fetch top bowlers using Client SDK
 */
export async function getTopBowlersClient(limitCount = 3): Promise<any[]> {
  try {
    const collRef = collection(db, "player_stats_alltime");
    const q = query(collRef, orderBy("bowl_wickets", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        playerId: data.player_id,
        playerName: data.player_name || 'Unknown',
        totalMatches: data.matches || 0,
        totalInnings: data.bowl_innings || 0,
        totalWickets: data.bowl_wickets || 0,
        bestHaul: data.bowl_best_wickets || 0,
      };
    });
  } catch (error) {
    console.error("Client SDK: Error fetching top bowlers:", error);
    throw error;
  }
}
/**
 * Helper to map firestore stats doc to PlayerBattingStats and PlayerBowlingStats
 */
function mapToPlayerStatsFormat(data: any) {
  const playerId = data.player_id;
  const playerName = data.player_name || 'Unknown';
  const totalMatches = data.matches || 0;

  const battingStats = {
    playerId,
    playerName,
    totalMatches,
    totalInnings: data.bat_innings || 0,
    notOuts: data.bat_not_out || 0,
    totalRuns: data.bat_runs || 0,
    bestScore: data.bat_highest || 0,
    average: data.bat_average || 0,
    totalBalls: data.bat_balls || 0,
    totalZeros: data.bat_zeros || 0,
    strikeRate: data.bat_strike_rate || 0,
    totalFours: data.bat_fours || 0,
    totalSixes: data.bat_sixes || 0,
    thirties: data.bat_thirties || 0,
    fifties: data.bat_fifties || 0,
    hundreds: data.bat_hundreds || 0,
    ducks: data.bat_ducks || 0,
  };

  const bowlingStats = {
    playerId,
    playerName,
    totalMatches,
    totalInnings: data.bowl_innings || 0,
    totalWickets: data.bowl_wickets || 0,
    bestHaul: data.bowl_best_wickets || 0,
    totalRuns: data.bowl_runs || 0,
    totalMaidens: data.bowl_maidens || 0,
    totalBalls: data.bowl_balls || 0,
    totalOvers: data.bowl_overs || 0,
    average: data.bowl_average || 0,
    strikeRate: data.bowl_strike_rate || 0,
    economy: data.bowl_economy || 0,
    threeWickets: data.bowl_three_fers || 0,
    fiveWickets: data.bowl_five_fers || 0,
  };

  return { playerId, playerName, battingStats, bowlingStats, totalMatches };
}

/**
 * Fetch monthly stats using Client SDK
 */
export async function getMonthlyPlayerStatsClient(month: string, forceRefresh = false) {
  try {
    const collRef = collection(db, 'player_stats_monthly');
    const q = query(collRef, where('month', '==', month));
    const querySnapshot = forceRefresh 
      ? await getDocsFromServer(q) 
      : await getDocs(q);
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error("Client SDK: Error fetching monthly stats:", error);
    throw error;
  }
}

/**
 * Fetch yearly stats using Client SDK
 */
export async function getYearlyPlayerStatsClient(year: string, forceRefresh = false) {
  try {
    const collRef = collection(db, 'player_stats_yearly');
    const q = query(collRef, where('year', '==', year));
    const querySnapshot = forceRefresh 
      ? await getDocsFromServer(q) 
      : await getDocs(q);
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error("Client SDK: Error fetching yearly stats:", error);
    throw error;
  }
}

/**
 * Fetch all-time stats using Client SDK
 */
export async function getAllTimePlayerStatsClient(forceRefresh = false) {
  try {
    const collRef = collection(db, 'player_stats_alltime');
    const querySnapshot = forceRefresh 
      ? await getDocsFromServer(collRef) 
      : await getDocs(collRef);
    return querySnapshot.docs.map(doc => mapToPlayerStatsFormat(doc.data()));
  } catch (error) {
    console.error("Client SDK: Error fetching all-time stats:", error);
    throw error;
  }
}



/**
 * Fetch recent matches with performances using Client SDK
 */
export async function getRecentMatchesClient(limitCount = 5, forceRefresh = false) {
  try {
    const collRef = collection(db, 'matches');
    const q = query(collRef, orderBy('created_at', 'desc'), limit(limitCount));
    const querySnapshot = forceRefresh 
      ? await getDocsFromServer(q) 
      : await getDocs(q);
    
    return await Promise.all(querySnapshot.docs.map(async (matchDoc) => {
      const matchData = mapFirestoreToMatch({ id: matchDoc.id, ...matchDoc.data() });
      
      // Fetch performances for this match
      const perfColl = collection(db, 'performances');
      const perfQuery = query(perfColl, where('match_id', '==', matchDoc.id));
      const perfSnapshot = forceRefresh 
        ? await getDocsFromServer(perfQuery) 
        : await getDocs(perfQuery);
      
      const performances = perfSnapshot.docs.map(d => mapFirestoreToPerformance({
        id: d.id,
        ...d.data()
      }));
      
      return { match: matchData, performances };
    }));
  } catch (error) {
    console.error("Client SDK: Error fetching recent matches:", error);
    throw error;
  }
}

/**
 * Fetch specific match details (match + performances) using Client SDK
 */
export async function getMatchDetailsClient(matchId: string, forceRefresh = false) {
  try {
    const docRef = doc(db, 'matches', matchId);
    const docSnap = forceRefresh 
      ? await getDocFromServer(docRef)
      : await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    const matchData = mapFirestoreToMatch({ id: docSnap.id, ...docSnap.data() });
    
    const perfColl = collection(db, 'performances');
    const perfQuery = query(perfColl, where('match_id', '==', matchId));
    const perfSnapshot = forceRefresh 
      ? await getDocsFromServer(perfQuery)
      : await getDocs(perfQuery);
    
    const performances = perfSnapshot.docs.map(d => mapFirestoreToPerformance({
      id: d.id,
      ...d.data()
    }));

    return { match: matchData, performances };
  } catch (error) {
    console.error("Client SDK: Error fetching match details:", error);
    return null;
  }
}
