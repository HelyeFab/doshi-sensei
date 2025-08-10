#!/usr/bin/env node

/**
 * Admin Script: Upgrade User to Premium Yearly
 *
 * Usage: node scripts/upgrade-user-premium.js
 * Then enter email when prompted
 */

const readline = require('readline');

// Import Firebase Admin SDK
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (you'll need to set up service account)
let admin;
try {
  // Try to use service account key if available
  const serviceAccount = require('../firebase-service-account.json');
  admin = initializeApp({
    credential: cert(serviceAccount),
    projectId: 'doshi-sensei' // Replace with your project ID
  });
} catch (error) {
  console.log('⚠️  Service account not found, using environment variables...');

  // Fallback to environment variables
  admin = initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'doshi-sensei'
  });
}

const auth = getAuth(admin);
const db = getFirestore(admin);

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function upgradeUserToPremium(email) {
  try {
    console.log(`🔍 Looking up user with email: ${email}`);

    // Find user by email
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    console.log(`✅ Found user: ${userRecord.displayName || 'Unknown'} (${uid})`);

    // Calculate expiration date (exactly 1 year from now)
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setFullYear(now.getFullYear() + 1);

    // Create premium subscription data
    const premiumSubscription = {
      subscription: {
        status: 'active',
        plan: 'yearly',
        renewalDate: expirationDate.toISOString(),
        cancelAtPeriodEnd: false,
        stripeSubscriptionId: `admin_granted_${Date.now()}`,
        stripePriceId: 'admin_yearly_override',
        grantedBy: 'admin_script',
        grantedAt: now.toISOString()
      },
      limits: {
        maxLists: -1,           // Unlimited lists
        maxDrillsPerDay: -1,    // Unlimited drills
        canSync: true           // Cloud sync enabled
      },
      currentUsage: {
        listsCount: 0,
        drillsToday: 0,
        lastDrillDate: now.toISOString().split('T')[0]
      }
    };

    // Update user document in Firestore
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set({ subscription: premiumSubscription }, { merge: true });

    console.log('🎉 SUCCESS! User upgraded to Premium Yearly!');
    console.log('📅 Subscription Details:');
    console.log(`   📧 Email: ${email}`);
    console.log(`   🎯 Plan: Yearly Premium`);
    console.log(`   ⏰ Expires: ${expirationDate.toLocaleDateString()}`);
    console.log(`   🔄 Cloud Sync: Enabled`);
    console.log(`   📝 Lists: Unlimited`);
    console.log(`   💪 Drills: Unlimited`);

    return true;
  } catch (error) {
    console.error('❌ Error upgrading user:', error.message);

    if (error.code === 'auth/user-not-found') {
      console.log('💡 Make sure the user has created an account first!');
    }

    return false;
  }
}

async function main() {
  console.log('🚀 Doshi Sensei - Premium User Upgrade Script');
  console.log('============================================');
  console.log('');

  try {
    // Ask for email address
    const email = await askQuestion('📧 Enter email address to upgrade: ');

    if (!email || !email.includes('@')) {
      console.log('❌ Invalid email address!');
      rl.close();
      return;
    }

    // Confirm action
    console.log('');
    console.log('⚠️  You are about to:');
    console.log(`   • Upgrade ${email} to Premium Yearly`);
    console.log(`   • Grant unlimited lists and drills`);
    console.log(`   • Enable cloud sync`);
    console.log(`   • Set expiration to exactly 1 year from now`);
    console.log('');

    const confirm = await askQuestion('❓ Continue? (y/N): ');

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Operation cancelled.');
      rl.close();
      return;
    }

    console.log('');
    console.log('🔄 Processing upgrade...');

    // Perform the upgrade
    const success = await upgradeUserToPremium(email);

    if (success) {
      console.log('');
      console.log('✨ Premium upgrade completed successfully!');
      console.log('💡 The user can now enjoy all premium features.');
    } else {
      console.log('');
      console.log('❌ Premium upgrade failed. Check the error above.');
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n👋 Script interrupted. Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch(console.error);
