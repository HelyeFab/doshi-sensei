#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function checkMyDueItems() {
  console.log('================================================');
  console.log('Checking due items for user:', userId);
  console.log('Current time:', new Date().toISOString());
  console.log('================================================\n');

  const sources = [
    { name: 'savedItems', field: 'nextReview', display: 'content' },
    { name: 'studyLists', field: 'nextReview', display: 'name' },
    { name: 'flashcards', field: 'nextReview', display: 'front' },
    { name: 'vocabularyLookups', field: 'nextReview', display: 'word' },
    { name: 'kanaProgress', field: 'nextReview', display: 'character' },
    { name: 'drillHistory', field: 'lastPracticed', display: 'content' },
    { name: 'grammarExercises', field: 'nextReview', display: 'pattern' },
    { name: 'kanjiProgress', field: 'nextReview', display: 'character' }
  ];

  let totalDueItems = 0;

  for (const source of sources) {
    try {
      console.log(`\n📚 Checking ${source.name}...`);
      console.log('----------------------------------------');
      
      // For drillHistory, we check items not practiced today
      let query;
      if (source.name === 'drillHistory') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = db
          .collection('users')
          .doc(userId)
          .collection(source.name)
          .where(source.field, '<', today)
          .limit(10);
      } else {
        query = db
          .collection('users')
          .doc(userId)
          .collection(source.name)
          .where(source.field, '<=', new Date())
          .limit(10);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        console.log('  ✓ No due items');
      } else {
        console.log(`  ⏰ ${snapshot.size} due items found:`);
        snapshot.forEach((doc, index) => {
          const data = doc.data();
          const displayValue = data[source.display] || 
                               data.content || 
                               data.word || 
                               data.primary || 
                               doc.id;
          
          const nextReview = data.nextReview ? 
            (data.nextReview.toDate ? data.nextReview.toDate() : new Date(data.nextReview)) : 
            null;
          
          console.log(`     ${index + 1}. ${displayValue}`);
          if (nextReview) {
            console.log(`        Due: ${nextReview.toISOString()}`);
          }
          if (data.interval) {
            console.log(`        Interval: ${data.interval} days`);
          }
        });
        totalDueItems += snapshot.size;
      }
      
      // Also check for nested items in study lists
      if (source.name === 'studyLists') {
        const listsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('studyLists')
          .get();
        
        for (const listDoc of listsSnapshot.docs) {
          const listData = listDoc.data();
          const itemsSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('studyLists')
            .doc(listDoc.id)
            .collection('items')
            .where('nextReview', '<=', new Date())
            .limit(5)
            .get();
          
          if (!itemsSnapshot.empty) {
            console.log(`\n  📋 List: "${listData.name}" (${itemsSnapshot.size} due items)`);
            itemsSnapshot.forEach((itemDoc, index) => {
              const itemData = itemDoc.data();
              console.log(`     ${index + 1}. ${itemData.word || itemData.content || itemDoc.id}`);
            });
            totalDueItems += itemsSnapshot.size;
          }
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error checking ${source.name}:`, error.message);
    }
  }

  console.log('\n================================================');
  console.log(`TOTAL DUE ITEMS: ${totalDueItems}`);
  console.log('================================================');

  // Check Review Hub specific collections
  console.log('\n🔍 Checking Review Hub Integration...');
  console.log('----------------------------------------');
  
  try {
    // Check if there's a unified review collection
    const reviewsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('reviews')
      .limit(5)
      .get();
    
    if (!reviewsSnapshot.empty) {
      console.log(`Found ${reviewsSnapshot.size} items in reviews collection`);
    }
    
    // Check review events
    const eventsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('reviewEvents')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
    
    if (!eventsSnapshot.empty) {
      console.log(`\nRecent review events:`);
      eventsSnapshot.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp ? 
          (data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp)) : 
          null;
        console.log(`  - ${data.type}: ${timestamp ? timestamp.toISOString() : 'unknown time'}`);
      });
    }
    
  } catch (error) {
    console.log('  No Review Hub data found or error:', error.message);
  }

  process.exit(0);
}

// Run the check
checkMyDueItems().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});