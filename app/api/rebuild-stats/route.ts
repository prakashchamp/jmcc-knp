import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/services/firebase/server-config';
import * as admin from 'firebase-admin';

function getISTYearMonth(dateString: string) {
  const dateObj = new Date(dateString);
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit'
  });
  const parts = istFormatter.formatToParts(dateObj);
  const year = parts.find(p => p.type === 'year')?.value || dateObj.getUTCFullYear().toString();
  const monthRaw = parts.find(p => p.type === 'month')?.value || (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
  return { year, month: `${year}-${monthRaw}` };
}

export async function GET() {
  try {
    const db = getFirebaseAdmin();
    
    // 1. Clear existing aggregates
    const collectionsToClear = ['player_stats_alltime', 'player_stats_yearly', 'player_stats_monthly'];
    for (const collName of collectionsToClear) {
      const snapshot = await db.collection(collName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      if (!snapshot.empty) await batch.commit();
    }

    // 2. Fetch all performances
    const perfsSnapshot = await db.collection('performances').get();
    
    // Prepare aggregates
    const allTimeStats = new Map<string, any>();
    const yearlyStats = new Map<string, any>();
    const monthlyStats = new Map<string, any>();

    perfsSnapshot.docs.forEach(doc => {
      const perf = doc.data();
      const playerId = perf.player_id;
      if (!playerId) return;

      const date = perf.date || perf.created_at || new Date().toISOString();
      const { year, month } = getISTYearMonth(date);
      
      const scopes = [
        { map: allTimeStats, id: playerId, extras: {} },
        { map: yearlyStats, id: `${playerId}_${year}`, extras: { year } },
        { map: monthlyStats, id: `${playerId}_${month}`, extras: { month, year } }
      ];

      scopes.forEach(scope => {
        if (!scope.map.has(scope.id)) {
          scope.map.set(scope.id, {
            player_id: playerId,
            player_name: perf.player_name || 'Unknown',
            matches: 0,
            bat_innings: 0, bat_runs: 0, bat_balls: 0, bat_fours: 0, bat_sixes: 0, 
            bat_dismissed: 0, bat_not_out: 0, bat_highest: 0, bat_ducks: 0, 
            bat_thirties: 0, bat_fifties: 0, bat_hundreds: 0,
            bowl_innings: 0, bowl_overs: 0, bowl_balls: 0, bowl_runs: 0, 
            bowl_wickets: 0, bowl_maidens: 0, bowl_best_wickets: 0, bowl_best_runs: 0, bowl_best: '',
            bowl_three_fers: 0, bowl_four_fers: 0, bowl_five_fers: 0,
            ...scope.extras
          });
        }

        const stats = scope.map.get(scope.id);
        stats.matches += 1; // Assuming 1 performance doc = 1 match

        if (perf.bat_did_bat) {
          stats.bat_innings += (perf.bat_innings || 0);
          stats.bat_runs += (perf.bat_runs || 0);
          stats.bat_balls += (perf.bat_balls || 0);
          stats.bat_fours += (perf.bat_fours || 0);
          stats.bat_sixes += (perf.bat_sixes || 0);
          
          if (perf.bat_dismissed) stats.bat_dismissed += 1;
          else stats.bat_not_out += 1;
          
          stats.bat_highest = Math.max(stats.bat_highest, perf.bat_runs || 0);
          if (perf.bat_is_duck) stats.bat_ducks += 1;
          if (perf.bat_is_thirty) stats.bat_thirties += 1;
          if (perf.bat_is_fifty) stats.bat_fifties += 1;
          if (perf.bat_is_hundred) stats.bat_hundreds += 1;
          
          const dismissals = stats.bat_dismissed;
          stats.bat_average = dismissals > 0 ? stats.bat_runs / dismissals : stats.bat_runs;
          stats.bat_strike_rate = stats.bat_balls > 0 ? (stats.bat_runs / stats.bat_balls) * 100 : 0;
        }

        if (perf.bowl_did_bowl) {
          stats.bowl_innings += (perf.bowl_innings || 0);
          stats.bowl_runs += (perf.bowl_runs || 0);
          stats.bowl_wickets += (perf.bowl_wickets || 0);
          
          // Reconstruct balls from overs in performance, or use bowl_balls if available
          let ballsThisMatch = perf.bowl_balls;
          if (ballsThisMatch === undefined && perf.bowl_overs !== undefined) {
             const oversFloor = Math.floor(perf.bowl_overs);
             const partial = Math.round((perf.bowl_overs - oversFloor) * 10);
             ballsThisMatch = (oversFloor * 6) + partial;
          }
          stats.bowl_balls += (ballsThisMatch || 0);
          stats.bowl_overs = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 10;
          stats.bowl_maidens += (perf.bowl_maidens || 0);
          
          if ((perf.bowl_wickets || 0) > stats.bowl_best_wickets) {
            stats.bowl_best_wickets = perf.bowl_wickets;
            stats.bowl_best_runs = perf.bowl_runs || 0;
            stats.bowl_best = `${perf.bowl_wickets}/${perf.bowl_runs || 0}`;
          } else if ((perf.bowl_wickets || 0) === stats.bowl_best_wickets) {
            if ((perf.bowl_runs || 0) < (stats.bowl_best_runs || 999)) {
              stats.bowl_best_runs = perf.bowl_runs || 0;
              stats.bowl_best = `${perf.bowl_wickets}/${perf.bowl_runs || 0}`;
            }
          }

          if (perf.bowl_is_three_fer) stats.bowl_three_fers += 1;
          if (perf.bowl_is_four_fer) stats.bowl_four_fers += 1;
          if (perf.bowl_is_five_fer) stats.bowl_five_fers += 1;

          stats.bowl_average = stats.bowl_wickets > 0 ? stats.bowl_runs / stats.bowl_wickets : 0;
          const totalOversDec = Math.floor(stats.bowl_balls / 6) + (stats.bowl_balls % 6) / 6;
          stats.bowl_economy = totalOversDec > 0 ? stats.bowl_runs / totalOversDec : 0;
          stats.bowl_strike_rate = stats.bowl_wickets > 0 ? stats.bowl_balls / stats.bowl_wickets : 0;
        }
      });
    });

    // 3. Write back to Firestore in batches
    const writeBatches = async (map: Map<string, any>, collectionName: string) => {
      let batch = db.batch();
      let count = 0;
      for (const [id, data] of map.entries()) {
        const ref = db.collection(collectionName).doc(id);
        batch.set(ref, data);
        count++;
        if (count === 500) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }
      if (count > 0) await batch.commit();
    };

    await writeBatches(allTimeStats, 'player_stats_alltime');
    await writeBatches(yearlyStats, 'player_stats_yearly');
    await writeBatches(monthlyStats, 'player_stats_monthly');

    return NextResponse.json({ 
      success: true, 
      message: `Rebuilt ${allTimeStats.size} all-time, ${yearlyStats.size} yearly, ${monthlyStats.size} monthly stats.` 
    });
  } catch (error: any) {
    console.error('Rebuild Stats Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
