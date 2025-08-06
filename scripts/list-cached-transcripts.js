/**
 * Script to list all cached YouTube transcripts in Firebase
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

async function listCachedTranscripts() {
  console.log('📺 CACHED YOUTUBE TRANSCRIPTS IN FIREBASE\n');
  console.log('=' .repeat(80));
  
  try {
    // Fetch all documents from transcriptCache collection
    const snapshot = await db.collection('transcriptCache').get();
    
    if (snapshot.empty) {
      console.log('No cached transcripts found.');
      return;
    }
    
    console.log(`Found ${snapshot.size} cached transcripts:\n`);
    
    const transcripts = [];
    
    // Process each document
    snapshot.forEach(doc => {
      const data = doc.data();
      transcripts.push({
        id: doc.id,
        videoTitle: data.videoTitle || 'Untitled',
        videoUrl: data.videoUrl,
        language: data.language,
        transcriptLength: data.transcript?.length || 0,
        duration: data.duration,
        accessCount: data.accessCount || 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
        lastAccessed: data.lastAccessed?.toDate ? data.lastAccessed.toDate() : data.lastAccessed,
        metadata: data.metadata
      });
    });
    
    // Sort by access count (most popular first)
    transcripts.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
    
    // Display the transcripts
    console.log('📊 TRANSCRIPT LIST (sorted by popularity):\n');
    
    transcripts.forEach((transcript, index) => {
      console.log(`${index + 1}. ${transcript.videoTitle}`);
      console.log('   '.repeat(2) + '─'.repeat(70));
      
      // Extract video ID from URL if possible
      let videoId = 'N/A';
      if (transcript.videoUrl) {
        const match = transcript.videoUrl.match(/[?&]v=([^&]+)/) || 
                     transcript.videoUrl.match(/youtu\.be\/([^?]+)/) ||
                     transcript.videoUrl.match(/youtube\.com\/embed\/([^?]+)/);
        if (match) videoId = match[1];
      }
      
      console.log(`   📌 Video ID: ${videoId}`);
      console.log(`   🔗 URL: ${transcript.videoUrl || 'N/A'}`);
      console.log(`   🌐 Language: ${transcript.language || 'ja'}`);
      console.log(`   📝 Transcript lines: ${transcript.transcriptLength}`);
      console.log(`   👁️ Access count: ${transcript.accessCount}`);
      
      if (transcript.metadata?.channelName) {
        console.log(`   📺 Channel: ${transcript.metadata.channelName}`);
      }
      
      if (transcript.duration) {
        console.log(`   ⏱️ Duration: ${transcript.duration}`);
      }
      
      if (transcript.createdAt) {
        const created = new Date(transcript.createdAt);
        console.log(`   📅 Created: ${created.toLocaleDateString()} ${created.toLocaleTimeString()}`);
      }
      
      if (transcript.lastAccessed) {
        const accessed = new Date(transcript.lastAccessed);
        const daysAgo = Math.floor((Date.now() - accessed.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   🕐 Last accessed: ${daysAgo} days ago`);
      }
      
      console.log();
    });
    
    // Summary statistics
    console.log('\n' + '=' .repeat(80));
    console.log('📈 SUMMARY STATISTICS:\n');
    
    const totalAccesses = transcripts.reduce((sum, t) => sum + (t.accessCount || 0), 0);
    const avgAccessCount = totalAccesses / transcripts.length;
    const mostPopular = transcripts[0];
    const leastPopular = transcripts[transcripts.length - 1];
    
    console.log(`   Total transcripts: ${transcripts.length}`);
    console.log(`   Total accesses: ${totalAccesses}`);
    console.log(`   Average access count: ${avgAccessCount.toFixed(1)}`);
    console.log(`   Most popular: "${mostPopular.videoTitle}" (${mostPopular.accessCount} accesses)`);
    console.log(`   Least popular: "${leastPopular.videoTitle}" (${leastPopular.accessCount} accesses)`);
    
    // Language breakdown
    const langCounts = {};
    transcripts.forEach(t => {
      const lang = t.language || 'ja';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });
    
    console.log(`\n   Language breakdown:`);
    Object.entries(langCounts).forEach(([lang, count]) => {
      console.log(`     - ${lang}: ${count} transcripts`);
    });
    
    // Age analysis
    const now = Date.now();
    const ages = transcripts
      .filter(t => t.createdAt)
      .map(t => (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    if (ages.length > 0) {
      const avgAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
      const oldestAge = Math.max(...ages);
      const newestAge = Math.min(...ages);
      
      console.log(`\n   Cache age analysis:`);
      console.log(`     - Average age: ${avgAge.toFixed(1)} days`);
      console.log(`     - Oldest: ${oldestAge.toFixed(1)} days`);
      console.log(`     - Newest: ${newestAge.toFixed(1)} days`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching transcripts:', error.message);
  } finally {
    await admin.app().delete();
    console.log('\n✅ Done');
  }
}

listCachedTranscripts();