import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Read env manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  });
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function mergeCollections(collectionName: string, groupByFields: string[]) {
  console.log(`\n--- Merging ${collectionName} ---`);
  const snapshot = await db.collection(collectionName).get();
  
  // Group documents by the grouping key
  const groups = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const name = (data.player_name || '').toLowerCase().trim();
    if (!name) return;
    
    let key = name;
    // For monthly and yearly, group by name + year/month
    for (const field of groupByFields) {
      if (data[field]) {
        key += `_${data[field]}`;
      }
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(doc);
  });
  
  let mergedCount = 0;

  for (const [key, docs] of groups.entries()) {
    if (docs.length <= 1) continue; // No duplicates
    
    console.log(`Found ${docs.length} duplicates for ${key}`);
    
    // Sort docs by match count to pick a primary document (preferably one with real player ID)
    docs.sort((a, b) => {
      const aReal = !a.id.includes('player_');
      const bReal = !b.id.includes('player_');
      if (aReal && !bReal) return -1;
      if (!aReal && bReal) return 1;
      return (b.data().matches || 0) - (a.data().matches || 0);
    });
    
    const primaryDoc = docs[0];
    const duplicates = docs.slice(1);
    
    const primaryData = primaryDoc.data() as any;
    
    // Merge stats into primaryData
    for (const dup of duplicates) {
      const data = dup.data() as any;
      
      primaryData.matches = (primaryData.matches || 0) + (data.matches || 0);
      
      // Batting
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
      
      // Bowling
      primaryData.bowl_innings = (primaryData.bowl_innings || 0) + (data.bowl_innings || 0);
      primaryData.bowl_runs = (primaryData.bowl_runs || 0) + (data.bowl_runs || 0);
      primaryData.bowl_wickets = (primaryData.bowl_wickets || 0) + (data.bowl_wickets || 0);
      const totalBalls1 = (primaryData.bowl_overs || 0) * 6; // approximation if balls not accurate
      const totalBalls2 = (data.bowl_overs || 0) * 6;
      const combinedBalls = (primaryData.bowl_balls || Math.round(totalBalls1)) + (data.bowl_balls || Math.round(totalBalls2));
      primaryData.bowl_balls = combinedBalls;
      primaryData.bowl_overs = Math.floor(combinedBalls / 6) + (combinedBalls % 6) / 10;
      primaryData.bowl_maidens = (primaryData.bowl_maidens || 0) + (data.bowl_maidens || 0);
      primaryData.bowl_best_wickets = Math.max(primaryData.bowl_best_wickets || 0, data.bowl_best_wickets || 0);
      primaryData.bowl_three_fers = (primaryData.bowl_three_fers || 0) + (data.bowl_three_fers || 0);
      primaryData.bowl_four_fers = (primaryData.bowl_four_fers || 0) + (data.bowl_four_fers || 0);
      primaryData.bowl_five_fers = (primaryData.bowl_five_fers || 0) + (data.bowl_five_fers || 0);
    }
    
    // Recalculate averages
    const dismissals = primaryData.bat_dismissed || 0;
    primaryData.bat_average = dismissals > 0 ? primaryData.bat_runs / dismissals : primaryData.bat_runs;
    primaryData.bat_strike_rate = primaryData.bat_balls > 0 ? (primaryData.bat_runs / primaryData.bat_balls) * 100 : 0;
    
    primaryData.bowl_average = primaryData.bowl_wickets > 0 ? primaryData.bowl_runs / primaryData.bowl_wickets : 0;
    primaryData.bowl_strike_rate = primaryData.bowl_wickets > 0 ? primaryData.bowl_balls / primaryData.bowl_wickets : 0;
    const oversDec = Math.floor(primaryData.bowl_balls / 6) + (primaryData.bowl_balls % 6) / 6;
    primaryData.bowl_economy = oversDec > 0 ? primaryData.bowl_runs / oversDec : 0;
    
    // Write the updated primary doc
    await db.collection(collectionName).doc(primaryDoc.id).set(primaryData);
    
    // Delete the duplicates
    for (const dup of duplicates) {
      await db.collection(collectionName).doc(dup.id).delete();
      console.log(`Deleted duplicate: ${dup.id}`);
    }
    
    console.log(`Updated primary doc: ${primaryDoc.id}`);
    mergedCount++;
  }
  
  console.log(`Merged ${mergedCount} groups in ${collectionName}.`);
}

async function main() {
  try {
    await mergeCollections('player_stats_alltime', []);
    await mergeCollections('player_stats_yearly', ['year']);
    await mergeCollections('player_stats_monthly', ['month']);
    console.log('Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();
