const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function exploreFirebaseData() {
  console.log('=== Exploring Firebase Data for Review Hub Integration ===\n');
  
  try {
    // 1. Explore studyLists collection
    console.log('1. STUDY LISTS COLLECTION:');
    console.log('------------------------');
    const studyListsSnapshot = await db.collection('users').doc(userId).collection('studyLists').get();
    console.log(`Total study lists: ${studyListsSnapshot.size}`);
    
    if (!studyListsSnapshot.empty) {
      for (const doc of studyListsSnapshot.docs) {
        const data = doc.data();
        console.log(`\n  List ID: ${doc.id}`);
        console.log(`  - Name: ${data.name || 'Unnamed'}`);
        console.log(`  - Items: ${data.items?.length || 0}`);
        console.log(`  - Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
        
        // Show sample items
        if (data.items && data.items.length > 0) {
          console.log('  Sample items:');
          data.items.slice(0, 3).forEach(item => {
            console.log(`    • ${JSON.stringify(item).substring(0, 100)}...`);
          });
        }
      }
    }
    
    // 2. Explore searchHistory collection
    console.log('\n\n2. SEARCH HISTORY COLLECTION:');
    console.log('-----------------------------');
    const searchHistorySnapshot = await db.collection('users').doc(userId).collection('searchHistory')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    console.log(`Recent searches: ${searchHistorySnapshot.size}`);
    
    if (!searchHistorySnapshot.empty) {
      searchHistorySnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n  Search: "${data.query || doc.id}"`);
        console.log(`  - Type: ${data.type || 'Unknown'}`);
        console.log(`  - Timestamp: ${data.timestamp?.toDate?.() || 'Unknown'}`);
        console.log(`  - Results: ${data.results || 'N/A'}`);
      });
    }
    
    // 3. Explore unlockedAchievements collection
    console.log('\n\n3. UNLOCKED ACHIEVEMENTS COLLECTION:');
    console.log('------------------------------------');
    const achievementsSnapshot = await db.collection('users').doc(userId).collection('unlockedAchievements').get();
    console.log(`Total achievements: ${achievementsSnapshot.size}`);
    
    if (!achievementsSnapshot.empty) {
      achievementsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n  Achievement: ${doc.id}`);
        console.log(`  - Unlocked: ${data.unlockedAt?.toDate?.() || 'Unknown'}`);
        console.log(`  - Progress: ${data.progress || 'N/A'}`);
      });
    }
    
    // 4. Explore usage collection
    console.log('\n\n4. USAGE COLLECTION:');
    console.log('--------------------');
    const usageSnapshot = await db.collection('users').doc(userId).collection('usage')
      .orderBy('date', 'desc')
      .limit(10)
      .get();
    console.log(`Recent usage records: ${usageSnapshot.size}`);
    
    if (!usageSnapshot.empty) {
      usageSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n  Date: ${doc.id}`);
        console.log(`  - Features used: ${Object.keys(data).join(', ')}`);
        
        // Show feature usage counts
        Object.entries(data).slice(0, 3).forEach(([feature, count]) => {
          console.log(`    • ${feature}: ${count}`);
        });
      });
    }
    
    // 5. Check for other potential review-related collections
    console.log('\n\n5. OTHER POTENTIAL COLLECTIONS:');
    console.log('--------------------------------');
    
    // Check for saved words/vocabulary
    const savedWordsSnapshot = await db.collection('users').doc(userId).collection('savedWords').limit(5).get();
    if (!savedWordsSnapshot.empty) {
      console.log(`\nSaved Words: ${savedWordsSnapshot.size}+ items`);
      savedWordsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${JSON.stringify(data).substring(0, 100)}...`);
      });
    }
    
    // Check for custom flashcards
    const flashcardsSnapshot = await db.collection('users').doc(userId).collection('flashcards').limit(5).get();
    if (!flashcardsSnapshot.empty) {
      console.log(`\nFlashcards: ${flashcardsSnapshot.size}+ items`);
      flashcardsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${JSON.stringify(data).substring(0, 100)}...`);
      });
    }
    
    // Check for practice history
    const practiceSnapshot = await db.collection('users').doc(userId).collection('practiceHistory').limit(5).get();
    if (!practiceSnapshot.empty) {
      console.log(`\nPractice History: ${practiceSnapshot.size}+ items`);
      practiceSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${JSON.stringify(data).substring(0, 100)}...`);
      });
    }
    
    console.log('\n\n=== SUMMARY OF INTEGRABLE DATA ===');
    console.log('1. Study Lists - Custom vocabulary lists that could be reviewed');
    console.log('2. Search History - Could track frequently searched items for review suggestions');
    console.log('3. Saved Words - User-saved vocabulary for personalized reviews');
    console.log('4. Practice History - Historical data to improve review scheduling');
    console.log('5. Usage patterns - To understand user learning habits');
    
  } catch (error) {
    console.error('Error exploring Firebase data:', error);
  } finally {
    // Cleanup
    await admin.app().delete();
    process.exit(0);
  }
}

exploreFirebaseData();