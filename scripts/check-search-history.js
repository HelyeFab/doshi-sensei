#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSearchHistory() {
  try {
    console.log('🔍 Checking Search History in Firebase...\n');
    console.log('=' .repeat(60));

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} total users in Firebase\n`);

    let usersWithHistory = 0;
    let totalSearches = 0;
    let premiumUsersWithHistory = 0;
    let freeUsersWithHistory = 0;

    // Check each user for search history
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      
      // Check if user has search history collection
      const searchHistoryDoc = await db
        .collection('users')
        .doc(userId)
        .collection('searchHistory')
        .doc('data')
        .get();

      if (searchHistoryDoc.exists) {
        usersWithHistory++;
        const historyData = searchHistoryDoc.data();
        const searchCount = historyData.count || historyData.history?.length || 0;
        totalSearches += searchCount;

        // Check user subscription type
        const userPlan = userData.subscription?.plan || 'free';
        if (userPlan === 'monthly' || userPlan === 'yearly') {
          premiumUsersWithHistory++;
        } else {
          freeUsersWithHistory++;
        }

        // Show sample data for first 3 users with history
        if (usersWithHistory <= 3) {
          console.log(`\n📝 User: ${userData.email || userId}`);
          console.log(`   Plan: ${userPlan}`);
          console.log(`   Search History Count: ${searchCount}`);
          
          if (historyData.history && historyData.history.length > 0) {
            console.log('   Recent Searches:');
            historyData.history.slice(0, 3).forEach((entry, index) => {
              console.log(`     ${index + 1}. "${entry.searchTerm}" - ${new Date(entry.timestamp).toLocaleString()}`);
              console.log(`        Results: ${entry.resultsCount || entry.results?.length || 0} words found`);
              console.log(`        Source: ${entry.source || 'unknown'}`);
            });
          }
          
          console.log(`   Last Updated: ${historyData.lastUpdated ? historyData.lastUpdated.toDate().toLocaleString() : 'N/A'}`);
        }
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('📊 Summary Statistics:\n');
    console.log(`Total Users: ${usersSnapshot.size}`);
    console.log(`Users with Search History: ${usersWithHistory}`);
    console.log(`  - Premium Users: ${premiumUsersWithHistory}`);
    console.log(`  - Free Users: ${freeUsersWithHistory}`);
    console.log(`Total Searches Stored: ${totalSearches}`);
    console.log(`Average Searches per User: ${usersWithHistory > 0 ? (totalSearches / usersWithHistory).toFixed(1) : 0}`);

    // Check storage structure
    console.log('\n📂 Storage Structure:');
    console.log('- Location: /users/{userId}/searchHistory/data');
    console.log('- Storage Policy:');
    console.log('  * Premium Users (monthly/yearly): Synced to Firebase');
    console.log('  * Free Users: IndexedDB only (local storage)');
    console.log('  * Guest Users: IndexedDB only (local storage)');
    
    // Check for any orphaned search history (users who downgraded)
    let orphanedHistories = 0;
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userPlan = userData.subscription?.plan || 'free';
      
      const searchHistoryDoc = await db
        .collection('users')
        .doc(userId)
        .collection('searchHistory')
        .doc('data')
        .get();

      if (searchHistoryDoc.exists && userPlan === 'free') {
        orphanedHistories++;
      }
    }
    
    if (orphanedHistories > 0) {
      console.log(`\n⚠️  Found ${orphanedHistories} free users with Firebase search history`);
      console.log('   (These are likely users who downgraded from premium)');
    }

    // Sample query to show how to retrieve history for a specific user
    console.log('\n💡 To retrieve search history for a specific user:');
    console.log('```javascript');
    console.log('const userHistory = await db');
    console.log('  .collection("users")');
    console.log('  .doc(userId)');
    console.log('  .collection("searchHistory")');
    console.log('  .doc("data")');
    console.log('  .get();');
    console.log('```');

  } catch (error) {
    console.error('❌ Error checking search history:', error);
  } finally {
    // Clean up
    await admin.app().delete();
    process.exit(0);
  }
}

// Run the check
checkSearchHistory();