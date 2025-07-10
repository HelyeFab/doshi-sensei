#!/usr/bin/env node

/**
 * Eviction System Rollout Management Script
 * 
 * Usage:
 *   node scripts/eviction-rollout.js status
 *   node scripts/eviction-rollout.js enable --percent 10
 *   node scripts/eviction-rollout.js disable
 *   node scripts/eviction-rollout.js emergency-disable
 */

const admin = require('firebase-admin');
const { program } = require('commander');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

// Feature flag collection
const FEATURE_FLAGS_COLLECTION = 'featureFlags';
const EVICTION_FLAG_ID = 'lru_eviction_system';

/**
 * Get current eviction system status
 */
async function getStatus() {
  try {
    const doc = await db.collection(FEATURE_FLAGS_COLLECTION).doc(EVICTION_FLAG_ID).get();
    
    if (!doc.exists) {
      console.log('❌ Eviction system not configured');
      return null;
    }
    
    const data = doc.data();
    console.log('\n📊 Eviction System Status:');
    console.log(`   Enabled: ${data.enabled ? '✅' : '❌'}`);
    console.log(`   Rollout: ${data.rolloutPercent}%`);
    console.log(`   Updated: ${data.updatedAt?.toDate().toLocaleString()}`);
    console.log(`   Updated By: ${data.updatedBy}`);
    
    if (data.emergencyDisabled) {
      console.log('\n🚨 EMERGENCY DISABLED - System is completely off');
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error getting status:', error);
    return null;
  }
}

/**
 * Enable eviction system with specified rollout percentage
 */
async function enableEviction(percent) {
  try {
    // Validate percentage
    if (percent < 0 || percent > 100) {
      console.error('❌ Percentage must be between 0 and 100');
      return;
    }
    
    const update = {
      enabled: true,
      rolloutPercent: percent,
      emergencyDisabled: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: process.env.USER || 'script',
    };
    
    await db.collection(FEATURE_FLAGS_COLLECTION).doc(EVICTION_FLAG_ID).set(update, { merge: true });
    
    console.log(`✅ Eviction system enabled at ${percent}% rollout`);
    
    // Show warning for high percentages
    if (percent > 50) {
      console.log('\n⚠️  WARNING: Rolling out to more than 50% of users');
      console.log('   Monitor closely for any issues');
    }
    
  } catch (error) {
    console.error('❌ Error enabling eviction:', error);
  }
}

/**
 * Disable eviction system (0% rollout)
 */
async function disableEviction() {
  try {
    const update = {
      enabled: false,
      rolloutPercent: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: process.env.USER || 'script',
    };
    
    await db.collection(FEATURE_FLAGS_COLLECTION).doc(EVICTION_FLAG_ID).set(update, { merge: true });
    
    console.log('✅ Eviction system disabled (0% rollout)');
    
  } catch (error) {
    console.error('❌ Error disabling eviction:', error);
  }
}

/**
 * Emergency disable - completely turns off eviction
 */
async function emergencyDisable() {
  try {
    const update = {
      enabled: false,
      rolloutPercent: 0,
      emergencyDisabled: true,
      emergencyDisabledAt: admin.firestore.FieldValue.serverTimestamp(),
      emergencyDisabledBy: process.env.USER || 'script',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: process.env.USER || 'script',
    };
    
    await db.collection(FEATURE_FLAGS_COLLECTION).doc(EVICTION_FLAG_ID).set(update, { merge: true });
    
    console.log('🚨 EMERGENCY DISABLE ACTIVATED');
    console.log('   All eviction operations will be skipped');
    console.log('   Run "enable" command to restore normal operation');
    
  } catch (error) {
    console.error('❌ Error emergency disabling:', error);
  }
}

/**
 * Get rollout statistics
 */
async function getStats() {
  try {
    // Get eviction analytics
    const analyticsSnapshot = await db.collection('evictionAnalytics')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
    
    if (analyticsSnapshot.empty) {
      console.log('\n📊 No eviction analytics found');
      return;
    }
    
    const analytics = analyticsSnapshot.docs.map(doc => doc.data());
    
    // Calculate stats
    const totalEvictions = analytics.length;
    const byUserType = {};
    const byReason = {};
    let totalFreed = 0;
    let totalItems = 0;
    
    analytics.forEach(event => {
      byUserType[event.userType] = (byUserType[event.userType] || 0) + 1;
      byReason[event.reason] = (byReason[event.reason] || 0) + 1;
      totalFreed += event.freedBytes || 0;
      totalItems += event.evictedCount || 0;
    });
    
    console.log('\n📊 Eviction Statistics (Last 100 events):');
    console.log(`   Total Evictions: ${totalEvictions}`);
    console.log(`   Items Evicted: ${totalItems}`);
    console.log(`   Space Freed: ${(totalFreed / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n   By User Type:');
    Object.entries(byUserType).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} (${((count/totalEvictions)*100).toFixed(1)}%)`);
    });
    
    console.log('\n   By Reason:');
    Object.entries(byReason).forEach(([reason, count]) => {
      console.log(`     ${reason}: ${count} (${((count/totalEvictions)*100).toFixed(1)}%)`);
    });
    
  } catch (error) {
    console.error('❌ Error getting stats:', error);
  }
}

// CLI Setup
program
  .name('eviction-rollout')
  .description('Manage LRU eviction system rollout')
  .version('1.0.0');

program
  .command('status')
  .description('Get current eviction system status')
  .action(getStatus);

program
  .command('enable')
  .description('Enable eviction system with rollout percentage')
  .option('-p, --percent <number>', 'Rollout percentage (0-100)', '0')
  .action((options) => {
    const percent = parseInt(options.percent);
    enableEviction(percent);
  });

program
  .command('disable')
  .description('Disable eviction system (0% rollout)')
  .action(disableEviction);

program
  .command('emergency-disable')
  .description('Emergency disable - completely turn off eviction')
  .action(emergencyDisable);

program
  .command('stats')
  .description('Get eviction analytics and statistics')
  .action(getStats);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}