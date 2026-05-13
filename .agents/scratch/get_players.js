const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getTeamPlayers() {
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
  const teamDoc = await db.collection('teams').doc('jmcc_knp_singleton').get();
  const teamData = teamDoc.data();
  console.log('---PLAYERS_START---');
  console.log(JSON.stringify(teamData?.players || [], null, 2));
  console.log('---PLAYERS_END---');
}

getTeamPlayers().catch(console.error);
