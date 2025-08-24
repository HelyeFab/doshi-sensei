const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function deleteAllUsers() {
  console.log('🗑️ Deleting all users from Firebase...\n');
  
  let totalDeleted = 0;
  let nextPageToken;
  
  try {
    // List and delete all users
    do {
      const listResult = await auth.listUsers(1000, nextPageToken);
      
      for (const user of listResult.users) {
        const email = user.email || user.phoneNumber || 'no-email';
        console.log(`Deleting: ${email} (${user.uid})`);
        
        try {
          // Delete from Auth
          await auth.deleteUser(user.uid);
          
          // Delete from Firestore
          const batch = db.batch();
          batch.delete(db.collection('users').doc(user.uid));
          batch.delete(db.collection('subscription_history').doc(user.uid));
          batch.delete(db.collection('user_stats').doc(user.uid));
          batch.delete(db.collection('user_progress').doc(user.uid));
          await batch.commit().catch(() => {});
          
          console.log(`  ✅ Deleted\n`);
          totalDeleted++;
        } catch (error) {
          console.log(`  ❌ Error: ${error.message}\n`);
        }
      }
      
      nextPageToken = listResult.pageToken;
    } while (nextPageToken);
    
    console.log(`✨ Complete! Deleted ${totalDeleted} users.`);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

// Execute immediately
deleteAllUsers();