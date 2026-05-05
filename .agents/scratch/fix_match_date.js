const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function fixMatch() {
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
  const matchDate = '2026-02-01T03:30:00.000Z';

  const batch = db.batch();

  // Fix Match
  const matchRef = db.collection('matches').doc(matchId);
  batch.update(matchRef, {
    date: matchDate,
    created_at: matchDate
  });

  // Fix Performances
  const perfs = await db.collection('performances').where('match_id', '==', matchId).get();
  perfs.forEach(doc => {
    batch.update(doc.ref, {
      date: matchDate,
      created_at: matchDate
    });
  });

  await batch.commit();
  console.log('Match and performances fixed.');
}

fixMatch().catch(console.error);
