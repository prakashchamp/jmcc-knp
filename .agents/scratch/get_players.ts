import { getFirebaseAdmin } from './services/firebase/server-config';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function getTeamPlayers() {
  const db = getFirebaseAdmin();
  const teamDoc = await db.collection('teams').doc('jmcc_knp_singleton').get();
  const teamData = teamDoc.data();
  console.log(JSON.stringify(teamData?.players || [], null, 2));
}

getTeamPlayers().catch(console.error);
