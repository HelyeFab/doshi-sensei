const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteBadData() {
  console.log('Starting cleanup of incorrect YouTube data...\n');
  
  // Delete the two incorrectly created "channel" documents
  const channelIds = ['HkUBvcaK8Q5ogx63RQ05', 'RcdHFZKOqiuYXQs7ISRA'];
  
  for (const id of channelIds) {
    try {
      await db.collection('youtubeChannels').doc(id).delete();
      console.log('Deleted channel document: ' + id);
    } catch (error) {
      console.error('Error deleting channel ' + id + ':', error);
    }
  }
  
  // Also check and delete any orphan videos if they exist
  const videosSnapshot = await db.collection('youtubeVideoResources').get();
  console.log('\nFound ' + videosSnapshot.size + ' videos to delete');
  
  const batch = db.batch();
  videosSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  if (videosSnapshot.size > 0) {
    await batch.commit();
    console.log('Deleted all video documents');
  }
  
  console.log('\nCleanup complete!');
  process.exit(0);
}

deleteBadData().catch(console.error);