/**
 * Script to set admin claims for a user
 * Run with: node scripts/set-admin.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Admin emails
const ADMIN_EMAILS = [
  'mate.fizir@gmail.com',
  'emmanuelfabiani23@gmail.com'
];

async function setAdminClaims() {
  console.log('Setting admin claims for users...\n');

  for (const email of ADMIN_EMAILS) {
    try {
      // Get user by email
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`Found user: ${userRecord.email} (${userRecord.uid})`);

      // Set admin custom claim
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        admin: true
      });
      
      console.log(`✅ Admin claim set for ${email}`);

      // Also update Firestore user document
      await admin.firestore()
        .collection('users')
        .doc(userRecord.uid)
        .set({
          isAdmin: true,
          email: email,
          adminSetAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

      console.log(`✅ Firestore document updated for ${email}\n`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️ User not found: ${email}`);
      } else {
        console.error(`❌ Error setting admin for ${email}:`, error.message);
      }
    }
  }

  console.log('\nAdmin claims setup complete!');
  console.log('Note: Users may need to sign out and sign back in for changes to take effect.');
  process.exit(0);
}

// Run the script
setAdminClaims().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});