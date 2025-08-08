// Script to clear cached transcript for Sparkle video
// This will force a fresh extraction next time

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function clearSparkleCache() {
  // Common Sparkle video IDs
  const possibleIds = [
    'youtube_VqvSHopq-Yk',  // One possible ID
    'youtube_VlXPXvsoWcY',  // Another possible ID
    // Add more if needed
  ];
  
  console.log('Checking for cached Sparkle transcripts...');
  
  for (const docId of possibleIds) {
    try {
      const docRef = db.collection('transcriptCache').doc(docId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        console.log(`\nFound cached transcript: ${docId}`);
        console.log(`Title: ${data.videoTitle}`);
        console.log(`Lines: ${data.transcript?.length || 0}`);
        console.log(`Has formatted: ${!!data.formattedTranscript}`);
        console.log(`Created: ${data.createdAt?.toDate()}`);
        
        // Delete it to force fresh extraction
        console.log('Deleting cached version to force fresh extraction...');
        await docRef.delete();
        console.log('✅ Deleted successfully');
      }
    } catch (error) {
      console.log(`No cache found for ${docId}`);
    }
  }
  
  console.log('\nDone! Next extraction will fetch fresh data.');
}

clearSparkleCache().catch(console.error);