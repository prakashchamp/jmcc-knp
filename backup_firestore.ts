import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID,
      clientEmail: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function backupCollections() {
  const backupDir = path.join(process.cwd(), 'fire_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const collections = await db.listCollections();
  
  for (const collection of collections) {
    const collName = collection.id;
    console.log(`Backing up collection: ${collName}...`);
    
    const snapshot = await collection.get();
    const data: any[] = [];
    
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, data: doc.data() });
    });
    
    const filePath = path.join(backupDir, `${collName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`✓ Saved ${data.length} docs to ${filePath}`);
  }
  
  console.log('Backup complete.');
}

backupCollections().catch(console.error);
