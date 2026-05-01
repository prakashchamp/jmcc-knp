import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/services/firebase/server-config';

export async function GET() {
  try {
    const db = getFirebaseAdmin();
    let mergedCount = 0;

    const collectionsToMerge = [
      { name: 'player_stats_alltime', groupBy: [] as string[] },
      { name: 'player_stats_yearly', groupBy: ['year'] },
      { name: 'player_stats_monthly', groupBy: ['month'] }
    ];

    for (const coll of collectionsToMerge) {
      const snapshot = await db.collection(coll.name).get();
      const groups = new Map<string, any[]>();
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const name = (data.player_name || '').toLowerCase().trim();
        if (!name) return;
        
        let key = name;
        for (const field of coll.groupBy) {
          if (data[field]) key += `_${data[field]}`;
        }
        
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({ id: doc.id, data, ref: doc.ref });
      });
      
      for (const [key, docs] of groups.entries()) {
        if (docs.length <= 1) continue;
        
        // Sort docs: prefer the one that is NOT starting with 'player_'
        docs.sort((a, b) => {
          const aReal = !a.id.includes('player_');
          const bReal = !b.id.includes('player_');
          if (aReal && !bReal) return -1;
          if (!aReal && bReal) return 1;
          return (b.data.matches || 0) - (a.data.matches || 0);
        });
        
        const primaryDoc = docs[0];
        const duplicates = docs.slice(1);
        const primaryData = primaryDoc.data;
        
        for (const dup of duplicates) {
          const data = dup.data;
          primaryData.matches = (primaryData.matches || 0) + (data.matches || 0);
          
          primaryData.bat_innings = (primaryData.bat_innings || 0) + (data.bat_innings || 0);
          primaryData.bat_runs = (primaryData.bat_runs || 0) + (data.bat_runs || 0);
          primaryData.bat_balls = (primaryData.bat_balls || 0) + (data.bat_balls || 0);
          primaryData.bat_fours = (primaryData.bat_fours || 0) + (data.bat_fours || 0);
          primaryData.bat_sixes = (primaryData.bat_sixes || 0) + (data.bat_sixes || 0);
          primaryData.bat_dismissed = (primaryData.bat_dismissed || 0) + (data.bat_dismissed || 0);
          primaryData.bat_not_out = (primaryData.bat_not_out || 0) + (data.bat_not_out || 0);
          primaryData.bat_highest = Math.max(primaryData.bat_highest || 0, data.bat_highest || 0);
          primaryData.bat_ducks = (primaryData.bat_ducks || 0) + (data.bat_ducks || 0);
          primaryData.bat_thirties = (primaryData.bat_thirties || 0) + (data.bat_thirties || 0);
          primaryData.bat_fifties = (primaryData.bat_fifties || 0) + (data.bat_fifties || 0);
          primaryData.bat_hundreds = (primaryData.bat_hundreds || 0) + (data.bat_hundreds || 0);
          
          primaryData.bowl_innings = (primaryData.bowl_innings || 0) + (data.bowl_innings || 0);
          primaryData.bowl_runs = (primaryData.bowl_runs || 0) + (data.bowl_runs || 0);
          primaryData.bowl_wickets = (primaryData.bowl_wickets || 0) + (data.bowl_wickets || 0);
          const combinedBalls = (primaryData.bowl_balls || 0) + (data.bowl_balls || 0);
          primaryData.bowl_balls = combinedBalls;
          primaryData.bowl_overs = Math.floor(combinedBalls / 6) + (combinedBalls % 6) / 10;
          primaryData.bowl_maidens = (primaryData.bowl_maidens || 0) + (data.bowl_maidens || 0);
          primaryData.bowl_best_wickets = Math.max(primaryData.bowl_best_wickets || 0, data.bowl_best_wickets || 0);
          primaryData.bowl_three_fers = (primaryData.bowl_three_fers || 0) + (data.bowl_three_fers || 0);
          primaryData.bowl_four_fers = (primaryData.bowl_four_fers || 0) + (data.bowl_four_fers || 0);
          primaryData.bowl_five_fers = (primaryData.bowl_five_fers || 0) + (data.bowl_five_fers || 0);
        }
        
        const dismissals = primaryData.bat_dismissed || 0;
        primaryData.bat_average = dismissals > 0 ? primaryData.bat_runs / dismissals : primaryData.bat_runs;
        primaryData.bat_strike_rate = primaryData.bat_balls > 0 ? (primaryData.bat_runs / primaryData.bat_balls) * 100 : 0;
        
        primaryData.bowl_average = primaryData.bowl_wickets > 0 ? primaryData.bowl_runs / primaryData.bowl_wickets : 0;
        primaryData.bowl_strike_rate = primaryData.bowl_wickets > 0 ? primaryData.bowl_balls / primaryData.bowl_wickets : 0;
        const oversDec = Math.floor(primaryData.bowl_balls / 6) + (primaryData.bowl_balls % 6) / 6;
        primaryData.bowl_economy = oversDec > 0 ? primaryData.bowl_runs / oversDec : 0;
        
        await primaryDoc.ref.set(primaryData);
        for (const dup of duplicates) {
          await dup.ref.delete();
        }
        mergedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Merged ${mergedCount} duplicate groups successfully!` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
