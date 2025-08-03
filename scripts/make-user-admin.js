const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'doshi-sensei'
});

const db = admin.firestore();

async function makeUserAdmin(userEmail) {
  try {
    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    console.log('Found user:', userRecord.uid);

    // Update user document to add admin flag
    await db.collection('users').doc(userRecord.uid).update({
      isAdmin: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Successfully made ${userEmail} an admin`);
    console.log(`User ID: ${userRecord.uid}`);
    
    // Verify the update
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data();
    console.log('User data:', {
      email: userData.email,
      isAdmin: userData.isAdmin,
      displayName: userData.displayName
    });

  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    process.exit();
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address as argument');
  console.error('Usage: node make-user-admin.js user@example.com');
  process.exit(1);
}

makeUserAdmin(email);