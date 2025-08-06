/**
 * Script to check all Firestore collections
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function checkAllCollections() {
  console.log('🔍 CHECKING ALL FIRESTORE COLLECTIONS\n');
  console.log('=' .repeat(60));
  
  try {
    // Get all collections
    const collections = await db.listCollections();
    
    console.log(`Found ${collections.length} collections:\n`);
    
    for (const collection of collections) {
      const snapshot = await collection.limit(5).get();
      console.log(`📁 ${collection.id} (${snapshot.size} documents sampled)`);
      
      // Check for transcript-related collections
      if (collection.id.toLowerCase().includes('transcript') || 
          collection.id.toLowerCase().includes('youtube') ||
          collection.id.toLowerCase().includes('cache') ||
          collection.id.toLowerCase().includes('shadowing')) {
        console.log('   ⚠️  This might contain transcript data!');
        
        // Sample a document to see its structure
        if (!snapshot.empty) {
          const firstDoc = snapshot.docs[0];
          const data = firstDoc.data();
          console.log('   Sample document structure:');
          console.log(`   - ID: ${firstDoc.id}`);
          console.log(`   - Fields: ${Object.keys(data).join(', ')}`);
          
          // Check for transcript-like fields
          if (data.transcript || data.subtitles || data.captions || data.text) {
            console.log('   ✅ Contains transcript-like data!');
          }
        }
      }
      
      // Also check practiceHistory collection
      if (collection.id === 'practiceHistory') {
        console.log('   📝 Practice history collection - might reference transcripts');
        
        // Get a sample to see if it has YouTube videos
        const historySnapshot = await collection.limit(10).get();
        let youtubeCount = 0;
        historySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.type === 'youtube_shadowing' || data.videoUrl?.includes('youtube')) {
            youtubeCount++;
          }
        });
        
        if (youtubeCount > 0) {
          console.log(`   Found ${youtubeCount} YouTube practice sessions`);
        }
      }
    }
    
    // Specifically check the transcriptCache collection even if empty
    console.log('\n📋 TRANSCRIPT CACHE COLLECTION DETAILS:');
    console.log('─'.repeat(60));
    
    const transcriptCacheRef = db.collection('transcriptCache');
    const cacheSnapshot = await transcriptCacheRef.get();
    
    if (cacheSnapshot.empty) {
      console.log('The transcriptCache collection exists but is empty.');
      console.log('This means:');
      console.log('  - The caching feature is set up correctly');
      console.log('  - No transcripts have been cached yet');
      console.log('  - Users need to load YouTube videos to populate the cache');
    } else {
      console.log(`Found ${cacheSnapshot.size} cached transcripts`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await admin.app().delete();
    console.log('\n✅ Done');
  }
}

checkAllCollections();