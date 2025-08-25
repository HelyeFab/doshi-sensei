#!/usr/bin/env node

/**
 * Set Admin Custom Claim for a User
 * This script grants admin privileges to a specific user
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.uid} (${user.email})`);
    
    // Check current custom claims
    const currentClaims = user.customClaims || {};
    console.log('Current custom claims:', currentClaims);
    
    if (currentClaims.admin === true) {
      console.log('✅ User already has admin privileges');
      return;
    }
    
    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      ...currentClaims,
      admin: true
    });
    
    console.log('✅ Admin claim set successfully!');
    console.log('\n⚠️  IMPORTANT: The user needs to sign out and sign back in for the claim to take effect.');
    console.log('Or refresh their ID token by calling: user.getIdToken(true)');
    
    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    console.log('\nUpdated custom claims:', updatedUser.customClaims);
    
  } catch (error) {
    console.error('❌ Error setting admin claim:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node set-admin-claim.js <email>');
  console.log('Example: node set-admin-claim.js admin@example.com');
  process.exit(1);
}

console.log(`🔐 Setting admin claim for: ${email}\n`);
setAdminClaim(email);