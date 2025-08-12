const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkChannels() {
  const channelsSnapshot = await db.collection('youtubeChannels').get();
  
  console.log('Found ' + channelsSnapshot.size + ' channels:\n');
  
  channelsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log('=== Document ID: ' + doc.id + ' ===');
    console.log('Full data:', JSON.stringify(data, null, 2));
    console.log('\n');
  });
  
  // Now check videos
  console.log('\n=== CHECKING VIDEOS ===\n');
  const videosSnapshot = await db.collection('youtubeVideoResources').get();
  console.log('Found ' + videosSnapshot.size + ' videos:\n');
  
  videosSnapshot.forEach(doc => {
    const data = doc.data();
    console.log('Video ID: ' + doc.id);
    console.log('Video channelId: ' + (data.channelId || 'N/A'));
    console.log('Video title: ' + (data.title || 'N/A'));
    console.log('---');
  });
  
  process.exit(0);
}

checkChannels().catch(console.error);