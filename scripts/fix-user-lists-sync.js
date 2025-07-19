#!/usr/bin/env node

/**
 * Fix study lists sync issues for a specific user
 * Usage: node scripts/fix-user-lists-sync.js <userEmail>
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixUserListsSync(userEmail) {
  try {
    console.log(`🔍 Looking for user: ${userEmail}\n`);

    // Find user by email
    const usersSnapshot = await db.collection('users').where('email', '==', userEmail).get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();
    
    console.log(`✅ Found user: ${userData.email}`);
    console.log(`   User ID: ${userId}\n`);

    console.log('🔧 Fixing sync issues...\n');

    // 1. Check and fix study lists
    const studyListsRef = db.collection('users').doc(userId).collection('studyLists').doc('data');
    const studyListsDoc = await studyListsRef.get();
    
    if (studyListsDoc.exists) {
      console.log('📋 Found existing study lists data');
      const data = studyListsDoc.data();
      
      // Create a clean version
      const cleanData = {
        lists: {},
        lastUpdated: Date.now()
      };
      
      // Keep only valid lists
      if (data.lists) {
        Object.entries(data.lists).forEach(([id, list]) => {
          if (list && list.name) {
            cleanData.lists[id] = {
              id: id,
              name: list.name,
              description: list.description || '',
              createdAt: list.createdAt || Date.now(),
              updatedAt: Date.now(),
              wordCount: list.wordCount || 0
            };
            console.log(`   ✓ Kept list: ${list.name}`);
          }
        });
      }
      
      // Update with clean data
      await studyListsRef.set(cleanData);
      console.log(`   ✅ Updated study lists (${Object.keys(cleanData.lists).length} lists)\n`);
    } else {
      // Create empty structure
      await studyListsRef.set({
        lists: {},
        lastUpdated: Date.now()
      });
      console.log('   ✅ Created empty study lists structure\n');
    }

    // 2. Check and fix saved study items
    const savedItemsRef = db.collection('users').doc(userId).collection('savedStudyItems').doc('data');
    const savedItemsDoc = await savedItemsRef.get();
    
    if (savedItemsDoc.exists) {
      console.log('💾 Found existing saved study items');
      const data = savedItemsDoc.data();
      
      // Create a clean version
      const cleanData = {
        lastUpdated: Date.now()
      };
      
      // Keep only valid items
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'lastUpdated' && value && typeof value === 'object') {
          // Verify the item has required fields
          if ((value.words && Array.isArray(value.words)) || 
              (value.kanji && Array.isArray(value.kanji)) ||
              (value.sentences && Array.isArray(value.sentences))) {
            cleanData[key] = value;
            console.log(`   ✓ Kept saved items for list: ${key}`);
          }
        }
      });
      
      // Update with clean data
      await savedItemsRef.set(cleanData);
      console.log(`   ✅ Updated saved study items\n`);
    } else {
      // Create empty structure
      await savedItemsRef.set({
        lastUpdated: Date.now()
      });
      console.log('   ✅ Created empty saved study items structure\n');
    }

    // 3. Clean up legacy collections
    console.log('🧹 Cleaning up legacy data...');
    
    const legacyCollections = ['savedWords', 'wordLists'];
    for (const collection of legacyCollections) {
      const snapshot = await db.collection('users').doc(userId).collection(collection).get();
      if (!snapshot.empty) {
        console.log(`   Found legacy ${collection} collection (${snapshot.size} docs)`);
        
        // Delete all documents in the collection
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`   ✅ Deleted legacy ${collection} collection`);
      }
    }

    console.log('\n✅ Sync issues fixed!');
    console.log('\n📱 Next steps:');
    console.log('1. Ask the user to clear their browser cache');
    console.log('2. Or use the "Clear Cache and Reload" button on the error page');
    console.log('3. The favourites page should now load correctly');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

// Check command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node scripts/fix-user-lists-sync.js <userEmail>');
  console.log('Example: node scripts/fix-user-lists-sync.js user@example.com');
  process.exit(1);
}

fixUserListsSync(userEmail);