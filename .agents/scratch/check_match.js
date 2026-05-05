const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkMatch() {
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
  const matchDoc = await db.collection('matches').doc('match_1777918072742').get();
  if (!matchDoc.exists) {
    console.log('Match not found');
    return;
  }
  console.log('---MATCH_START---');
  console.log(JSON.stringify(matchDoc.data(), null, 2));
  console.log('---MATCH_END---');
}

checkMatch().catch(console.error);
