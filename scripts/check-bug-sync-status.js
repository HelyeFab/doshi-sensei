#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();

async function checkBugReports() {
  console.log('🔍 Checking bug reports sync status...\n');
  
  try {
    // Get all bug reports
    const snapshot = await db.collection('bugReports').get();
    
    if (snapshot.empty) {
      console.log('❌ No bug reports found in Firestore');
      return;
    }
    
    console.log(`Found ${snapshot.size} bug report(s):\n`);
    
    const reports = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        title: data.title || 'No title',
        category: data.category,
        status: data.status,
        obsidianSynced: data.obsidianSynced || false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        userName: data.userName,
        userEmail: data.userEmail
      });
    });
    
    // Display each report
    reports.forEach((report, index) => {
      console.log(`${index + 1}. ${report.title}`);
      console.log(`   ID: ${report.id}`);
      console.log(`   Category: ${report.category}`);
      console.log(`   Status: ${report.status}`);
      console.log(`   Synced to Obsidian: ${report.obsidianSynced ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${report.createdAt.toLocaleString()}`);
      console.log(`   User: ${report.userName} (${report.userEmail})`);
      console.log('');
    });
    
    // Summary
    const syncedCount = reports.filter(r => r.obsidianSynced).length;
    const unsyncedCount = reports.filter(r => !r.obsidianSynced).length;
    
    console.log('📊 Summary:');
    console.log(`   Total Reports: ${reports.length}`);
    console.log(`   Synced: ${syncedCount}`);
    console.log(`   Not Synced: ${unsyncedCount}`);
    
    if (unsyncedCount === 0 && reports.length > 0) {
      console.log('\n⚠️  All reports are marked as synced!');
      console.log('This is why Obsidian shows "no new bugs to sync".');
    }
    
  } catch (error) {
    console.error('Error checking bug reports:', error);
  } finally {
    process.exit(0);
  }
}

// Add command to reset sync status
const resetSync = process.argv.includes('--reset');

async function resetSyncStatus() {
  console.log('🔄 Resetting sync status for all bug reports...\n');
  
  try {
    const snapshot = await db.collection('bugReports').get();
    
    if (snapshot.empty) {
      console.log('No bug reports to reset');
      return;
    }
    
    const batch = db.batch();
    let count = 0;
    
    snapshot.forEach(doc => {
      batch.update(doc.ref, {
        obsidianSynced: false,
        obsidianLastSync: null
      });
      count++;
    });
    
    await batch.commit();
    console.log(`✅ Reset sync status for ${count} bug report(s)`);
    console.log('Now they will appear as new in Obsidian sync');
    
  } catch (error) {
    console.error('Error resetting sync status:', error);
  } finally {
    process.exit(0);
  }
}

// Main execution
if (resetSync) {
  resetSyncStatus();
} else {
  checkBugReports();
  console.log('\n💡 Tip: Run with --reset flag to mark all reports as unsynced');
  console.log('   Example: node scripts/check-bug-sync-status.js --reset');
}