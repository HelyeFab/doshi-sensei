const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'doshi-sensei'
  });
}

const db = admin.firestore();

async function listUsersWithNotifications() {
  try {
    // Get all notification preferences
    const prefsSnapshot = await db.collection('notificationPreferences')
      .where('enabled', '==', true)
      .get();

    console.log('Users with notifications enabled:\n');

    for (const doc of prefsSnapshot.docs) {
      const prefs = doc.data();
      const userId = doc.id;
      
      // Get user details
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (prefs.fcmToken) {
        console.log(`User: ${userData?.displayName || 'Unknown'}`);
        console.log(`Email: ${userData?.email || 'No email'}`);
        console.log(`User ID: ${userId}`);
        console.log(`Has FCM Token: ✓`);
        console.log(`Notifications enabled: ${prefs.enabled}`);
        console.log('---');
      }
    }

    console.log(`\nTotal users with notifications enabled: ${prefsSnapshot.size}`);
    
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    process.exit();
  }
}

listUsersWithNotifications();