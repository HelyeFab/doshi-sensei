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
    console.log('Document ID: ' + doc.id);
    console.log('Channel Title: ' + (data.channelTitle || 'N/A'));
    console.log('Channel URL: ' + (data.channelUrl || 'N/A'));
    console.log('Has channelId field?: ' + (data.channelId ? 'YES' : 'NO'));
    if (data.channelUrl) {
      // Extract channel ID from URL if possible
      const match = data.channelUrl.match(/channel\/(UC[\w-]+)/);
      if (match) {
        console.log('Extracted Channel ID from URL: ' + match[1]);
      }
    }
    console.log('---');
  });
  
  process.exit(0);
}

checkChannels().catch(console.error);