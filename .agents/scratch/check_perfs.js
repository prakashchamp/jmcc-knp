const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkPerformances() {
  const serviceAccount = {
    project_id: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID,
    client_email: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
    private_key: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();
  const matchId = 'match_1777918072742';
  
  const perfs = await db.collection('performances').where('match_id', '==', matchId).get();
  console.log(`Found ${perfs.size} performances for match ${matchId}`);
  perfs.forEach(doc => {
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

checkPerformances().catch(console.error);
