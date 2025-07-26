#!/usr/bin/env tsx

/**
 * Simple script to set up admin access
 * Run with: npx tsx src/scripts/setup-admin-simple.ts
 */

import { getFirebaseAdmin } from '../lib/firebase-admin-safe';

// Admin email to grant access to
const ADMIN_EMAIL = 'emmanuelfabiani23@gmail.com';

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin access...');
    
    // Get Firebase Admin instance
    const admin = await getFirebaseAdmin();
    
    // Get user by email
    console.log(`📧 Looking for user with email: ${ADMIN_EMAIL}`);
    const user = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log(`✅ Found user: ${user.uid}`);

    // Set admin custom claim
    console.log('🔐 Setting admin custom claim...');
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });

    // Verify the claim was set
    const updatedUser = await admin.auth().getUser(user.uid);
    const customClaims = updatedUser.customClaims || {};
    
    if (customClaims.admin === true) {
      console.log('✅ Admin access granted successfully!');
      console.log('🔄 Please log out and log back in for the changes to take effect.');
      console.log('');
      console.log('📌 Note: You are already logged out, so just log back in!');
    } else {
      console.error('❌ Failed to set admin claim');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error);
    process.exit(1);
  }
}

// Run the setup
setupAdmin();