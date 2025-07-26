#!/usr/bin/env ts-node

/**
 * Script to set up admin access for the specified user
 * Run with: npx ts-node src/scripts/setup-admin.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Admin email to grant access to
const ADMIN_EMAIL = 'emmanuelfabiani23@gmail.com';

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin access...');
    
    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (!privateKey || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        throw new Error('Missing required Firebase Admin environment variables');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
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
      console.log('🔄 Please log out and log back in for the changes to take effect.');
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