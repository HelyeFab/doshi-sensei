// Test script to verify activity dashboard Firebase queries
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const userId = 'WawMEtfq0dcoVPMr3nuwpFAzr9F2';

async function testActivityQueries() {
  console.log('Testing Activity Dashboard Firebase Queries\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Test YouTube Videos Query
    console.log('\n1. YouTube Videos from userPracticeHistory:');
    const videosRef = db.collection('userPracticeHistory');
    const videosQuery = videosRef.where('userId', '==', userId);
    const videosSnapshot = await videosQuery.get();
    
    console.log(`Found ${videosSnapshot.size} video practice records`);
    videosSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${data.videoTitle || 'Untitled'} (${data.practiceCount || 1} practices)`);
    });
    
    // 2. Test Games Query
    console.log('\n2. Games from gameProgress:');
    const gamesRef = db.collection('gameProgress');
    const gamesQuery = gamesRef.where('userId', '==', userId);
    const gamesSnapshot = await gamesQuery.get();
    
    console.log(`Found ${gamesSnapshot.size} game records`);
    gamesSnapshot.forEach(doc => {
      const data = doc.data();
      const gameId = data.gameId || doc.id;
      console.log(`  - ${gameId} (Level ${data.currentLevel || 1}, ${data.experience || 0} XP)`);
    });
    
    // 3. Test Search History Query
    console.log('\n3. Search History from users/{userId}/searchHistory/data:');
    const searchRef = db.doc(`users/${userId}/searchHistory/data`);
    const searchSnapshot = await searchRef.get();
    
    if (searchSnapshot.exists) {
      const searchData = searchSnapshot.data();
      if (searchData.history && Array.isArray(searchData.history)) {
        console.log(`Found ${searchData.history.length} search items`);
        searchData.history.slice(0, 5).forEach(search => {
          const japaneseWord = search.kanji || search.kana || search.japanese || '';
          if (japaneseWord) {
            console.log(`  - ${japaneseWord} ${search.meaning ? `(${search.meaning})` : ''}`);
          }
        });
      }
    }
    
    // 4. Test Study Lists Query
    console.log('\n4. Study Lists from users/{userId}/studyLists:');
    const listsRef = db.collection(`users/${userId}/studyLists`);
    const listsSnapshot = await listsRef.get();
    
    console.log(`Found ${listsSnapshot.size} study lists`);
    listsSnapshot.forEach(doc => {
      const data = doc.data();
      let listName = doc.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      console.log(`  - ${listName} (${data.data?.length || 0} items)`);
    });
    
    // 5. Test Textbook Vocabulary Progress
    console.log('\n5. Textbook Vocabulary from users/{userId}/textbookVocabularyProgress:');
    const textbookRef = db.collection(`users/${userId}/textbookVocabularyProgress`);
    const textbookSnapshot = await textbookRef.get();
    
    console.log(`Found ${textbookSnapshot.size} textbook progress records`);
    textbookSnapshot.forEach(doc => {
      console.log(`  - ${doc.id}`);
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('All queries completed successfully!');
    console.log('\nThe dashboard should now show all this data with rich details.');
    
  } catch (error) {
    console.error('Error running test queries:', error);
  }
  
  process.exit(0);
}

testActivityQueries();