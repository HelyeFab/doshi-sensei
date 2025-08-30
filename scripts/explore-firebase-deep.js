const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function exploreAllCollections() {
  console.log('=== Deep Firebase Data Exploration ===\n');
  
  try {
    // 1. Get all top-level collections
    console.log('TOP-LEVEL COLLECTIONS:');
    console.log('---------------------');
    const collections = await db.listCollections();
    for (const collection of collections) {
      const snapshot = await collection.limit(3).get();
      console.log(`\n📁 ${collection.id} (${snapshot.size}+ documents)`);
      
      // Show sample documents
      for (const doc of snapshot.docs) {
        console.log(`  - ${doc.id}`);
        
        // Check for subcollections in each document
        if (collection.id === 'users' && doc.id === userId) {
          const subcollections = await doc.ref.listCollections();
          console.log(`    Subcollections for user ${userId}:`);
          for (const subcol of subcollections) {
            const subSnapshot = await subcol.limit(2).get();
            console.log(`      📂 ${subcol.id} (${subSnapshot.size}+ items)`);
            
            // Show sample data from each subcollection
            if (subSnapshot.size > 0) {
              const sampleDoc = subSnapshot.docs[0];
              const data = sampleDoc.data();
              console.log(`        Sample: ${JSON.stringify(data).substring(0, 150)}...`);
            }
          }
        }
      }
    }
    
    // 2. Check specific review-related collections that might exist
    console.log('\n\nCHECKING SPECIFIC REVIEW-RELATED DATA:');
    console.log('---------------------------------------');
    
    // Check reviews collection
    const reviewsRef = db.collection('reviews');
    const reviewsSnapshot = await reviewsRef.where('userId', '==', userId).limit(5).get();
    console.log(`\n📊 Reviews Collection: ${reviewsSnapshot.size} items`);
    reviewsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.itemType || 'unknown'} - ${data.result || 'unknown'}`);
    });
    
    // Check review_hub collection (the new unified one)
    const reviewHubRef = db.collection('review_hub');
    const reviewHubSnapshot = await reviewHubRef.where('userId', '==', userId).limit(5).get();
    console.log(`\n🔄 Review Hub Collection: ${reviewHubSnapshot.size} items`);
    reviewHubSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.contentType || 'unknown'} - Due: ${data.scheduling?.dueDate?.toDate?.() || 'unknown'}`);
    });
    
    // Check vocabulary collection
    const vocabRef = db.collection('vocabulary');
    const vocabSnapshot = await vocabRef.limit(5).get();
    console.log(`\n📚 Vocabulary Collection: ${vocabSnapshot.size} items`);
    vocabSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.japanese || data.word || 'unknown'}`);
    });
    
    // Check kanji collection
    const kanjiRef = db.collection('kanji');
    const kanjiSnapshot = await kanjiRef.limit(5).get();
    console.log(`\n🈺 Kanji Collection: ${kanjiSnapshot.size} items`);
    kanjiSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.character || doc.id}`);
    });
    
    // 3. Check user-specific data that could be integrated
    console.log('\n\nUSER-SPECIFIC INTEGRABLE DATA:');
    console.log('-------------------------------');
    
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log('\nUser Profile Data:');
      console.log(`  - Display Name: ${userData.displayName || 'Not set'}`);
      console.log(`  - Email: ${userData.email || 'Not set'}`);
      console.log(`  - Study Streak: ${userData.studyStreak || 0}`);
      console.log(`  - Total Reviews: ${userData.totalReviews || 0}`);
      console.log(`  - Preferences: ${JSON.stringify(userData.preferences || {}).substring(0, 100)}...`);
    }
    
    // Check for favorites/bookmarks
    const favoritesRef = db.collection('users').doc(userId).collection('favorites');
    const favoritesSnapshot = await favoritesRef.limit(10).get();
    console.log(`\n⭐ Favorites/Bookmarks: ${favoritesSnapshot.size} items`);
    favoritesSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.type || 'unknown'} - ${data.content || 'unknown'}`);
    });
    
    // Check for custom study materials
    const customMaterialsRef = db.collection('users').doc(userId).collection('customMaterials');
    const customSnapshot = await customMaterialsRef.limit(5).get();
    console.log(`\n✏️ Custom Study Materials: ${customSnapshot.size} items`);
    customSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.title || 'Untitled'}`);
    });
    
    // Check for progress tracking
    const progressRef = db.collection('users').doc(userId).collection('progress');
    const progressSnapshot = await progressRef.limit(5).get();
    console.log(`\n📈 Progress Tracking: ${progressSnapshot.size} items`);
    progressSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${JSON.stringify(data).substring(0, 100)}...`);
    });
    
    console.log('\n\n=== RECOMMENDATIONS FOR REVIEW HUB INTEGRATION ===');
    console.log('1. 🌟 IMMEDIATE: Add favorites/bookmarks as reviewable items');
    console.log('2. 📝 IMMEDIATE: Import custom study materials into review system');
    console.log('3. 📊 IMMEDIATE: Use progress tracking data for better scheduling');
    console.log('4. 🔍 FUTURE: Use search history to suggest review items');
    console.log('5. 🏆 FUTURE: Tie achievements to review milestones');
    console.log('6. 📚 FUTURE: Create review sets from study lists');
    
  } catch (error) {
    console.error('Error exploring Firebase data:', error);
  } finally {
    await admin.app().delete();
    process.exit(0);
  }
}

exploreAllCollections();