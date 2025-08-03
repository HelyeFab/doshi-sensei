// Script to debug transcript cache issues
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
require('dotenv').config();

// Your Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Function to generate content ID (same logic as in the app)
function generateContentId(content) {
  if (content.type === 'youtube' && content.videoUrl) {
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
      /youtube\.com\/v\/([^&\s]+)/,
      /youtube\.com\/shorts\/([^&\s]+)/,
      /music\.youtube\.com\/watch\?v=([^&\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = content.videoUrl.match(pattern);
      if (match) {
        return `youtube_${match[1]}`;
      }
    }
  }
  
  return 'unknown_' + Date.now();
}

async function debugCache(videoUrl) {
  try {
    console.log('\n=== Transcript Cache Debug ===\n');
    console.log('Video URL:', videoUrl);
    
    // Generate content ID
    const contentId = generateContentId({ type: 'youtube', videoUrl });
    console.log('Generated Content ID:', contentId);
    
    // Try to find the cached transcript
    const cacheDoc = await getDoc(doc(db, 'transcriptCache', contentId));
    
    if (cacheDoc.exists()) {
      const data = cacheDoc.data();
      console.log('\n✅ CACHE FOUND!');
      console.log('- Video Title:', data.videoTitle);
      console.log('- Access Count:', data.accessCount);
      console.log('- Last Accessed:', data.lastAccessedAt?.toDate());
      console.log('- Created At:', data.createdAt?.toDate());
      console.log('- Transcript Lines:', data.transcript?.length || 0);
      console.log('- Language:', data.language);
      
      // Check if transcript is valid
      if (!data.transcript || data.transcript.length === 0) {
        console.log('\n⚠️  WARNING: Cache exists but transcript is empty!');
      } else {
        console.log('\n✅ Cache is valid and contains transcript data');
        console.log('First line:', data.transcript[0].text.substring(0, 50) + '...');
      }
    } else {
      console.log('\n❌ NO CACHE FOUND for this video');
      
      // Search for similar entries
      console.log('\nSearching for similar entries...');
      const q = query(collection(db, 'transcriptCache'), where('videoUrl', '==', videoUrl));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log(`Found ${querySnapshot.size} entries with matching videoUrl:`);
        querySnapshot.forEach((doc) => {
          console.log(`- ID: ${doc.id}, Title: ${doc.data().videoTitle}`);
        });
      } else {
        console.log('No entries found with this video URL');
      }
    }
    
    // List recent cache entries
    console.log('\n=== Recent Cache Entries ===');
    const recentQuery = query(collection(db, 'transcriptCache'));
    const recentSnapshot = await getDocs(recentQuery);
    
    const entries = [];
    recentSnapshot.forEach((doc) => {
      entries.push({
        id: doc.id,
        title: doc.data().videoTitle,
        url: doc.data().videoUrl,
        accessCount: doc.data().accessCount,
        lastAccessed: doc.data().lastAccessedAt?.toDate()
      });
    });
    
    // Sort by access count
    entries.sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0));
    
    console.log('\nTop 5 most accessed videos:');
    entries.slice(0, 5).forEach((entry, i) => {
      console.log(`${i + 1}. ${entry.title || 'Untitled'}`);
      console.log(`   ID: ${entry.id}`);
      console.log(`   URL: ${entry.url || 'N/A'}`);
      console.log(`   Access Count: ${entry.accessCount || 0}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

// Get video URL from command line
const videoUrl = process.argv[2];
if (!videoUrl) {
  console.log('Usage: node debug-transcript-cache.js <youtube-url>');
  console.log('Example: node debug-transcript-cache.js https://www.youtube.com/watch?v=VIDEO_ID');
  process.exit(1);
}

debugCache(videoUrl);