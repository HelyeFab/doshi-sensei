#!/usr/bin/env node

/**
 * Clear orphaned study lists from Firebase
 * This script removes study list data that might be causing sync issues
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearOrphanedLists() {
  try {
    console.log('🔍 Checking for orphaned study lists...\n');

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    console.log(`Found ${usersSnapshot.size} users\n`);

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      console.log(`\n👤 Processing user: ${userData.email || userId}`);

      try {
        // Check for study lists
        const studyListsDoc = await db.collection('users').doc(userId).collection('studyLists').doc('data').get();
        
        if (studyListsDoc.exists) {
          const data = studyListsDoc.data();
          console.log(`  📋 Found study lists data`);
          
          // Option 1: Clear the data (uncomment to use)
          // await studyListsDoc.ref.delete();
          // console.log(`  ✅ Deleted study lists data`);
          
          // Option 2: Show what's there
          if (data.lists) {
            console.log(`  📝 Lists found: ${Object.keys(data.lists).length}`);
            Object.entries(data.lists).forEach(([id, list]) => {
              console.log(`     - ${list.name} (ID: ${id})`);
            });
          }
        }

        // Check for saved study items
        const savedItemsDoc = await db.collection('users').doc(userId).collection('savedStudyItems').doc('data').get();
        
        if (savedItemsDoc.exists) {
          const data = savedItemsDoc.data();
          console.log(`  💾 Found saved study items`);
          
          // Option 1: Clear the data (uncomment to use)
          // await savedItemsDoc.ref.delete();
          // console.log(`  ✅ Deleted saved study items`);
          
          // Option 2: Show what's there
          const itemCount = Object.keys(data).filter(key => key !== 'lastUpdated').length;
          console.log(`  📦 Items found: ${itemCount}`);
        }

        // Check for legacy collections that might cause issues
        const legacyCollections = ['savedWords', 'wordLists'];
        for (const collection of legacyCollections) {
          const snapshot = await db.collection('users').doc(userId).collection(collection).get();
          if (!snapshot.empty) {
            console.log(`  ⚠️  Found legacy ${collection} collection with ${snapshot.size} documents`);
            
            // Option to clean up (uncomment to use)
            // for (const doc of snapshot.docs) {
            //   await doc.ref.delete();
            // }
            // console.log(`  ✅ Deleted legacy ${collection} collection`);
          }
        }

      } catch (error) {
        console.error(`  ❌ Error processing user ${userId}:`, error.message);
      }
    }

    console.log('\n\n✅ Scan complete!');
    console.log('\n⚠️  This script is currently in READ-ONLY mode.');
    console.log('To actually delete data, uncomment the delete operations in the script.\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Add command line argument handling
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete');

if (shouldDelete) {
  console.log('⚠️  WARNING: This will delete study lists data from Firebase!');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  setTimeout(() => {
    clearOrphanedLists();
  }, 5000);
} else {
  clearOrphanedLists();
}