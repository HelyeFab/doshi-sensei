#!/usr/bin/env tsx

/**
 * Script to set up admin access using service account
 * Run with: npx tsx src/scripts/setup-admin-with-creds.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// Admin email to grant access to
const ADMIN_EMAIL = 'emmanuelfabiani23@gmail.com';

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin access...');
    
    // Initialize Firebase Admin with service account
    const serviceAccount = require(path.join(process.cwd(), 'firebase-service-account.json'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    
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
      console.log('🔄 You can now log back in to access the admin dashboard.');
      console.log('');
      console.log('📌 The temporary email check in verify-role has been added as well.');
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