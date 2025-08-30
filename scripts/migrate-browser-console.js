/**
 * Browser Console Migration Script
 * Copy and paste this ENTIRE script into your browser console
 */

async function migrateMyData() {
  console.log('🚀 Starting personal data migration...\n');
  
  const results = {
    textbookVocab: { found: 0, migrated: 0 },
    kanjiMastery: { found: 0, migrated: 0 },
    studyLists: { found: 0, migrated: 0 },
    games: { found: 0, migrated: 0 },
    errors: []
  };
  
  try {
    // Get Firebase from window object (should be available in your app)
    const firebase = window.firebase;
    if (!firebase) {
      console.error('❌ Firebase not found. Make sure you are on the Doshi Sensei app.');
      return;
    }
    
    const auth = firebase.auth();
    const user = auth.currentUser;
    
    if (!user) {
      console.error('❌ You must be logged in to migrate data');
      return;
    }
    
    console.log(`✅ Logged in as: ${user.uid}`);
    console.log(`📧 Email: ${user.email}\n`);
    
    // Get Firestore
    const db = firebase.firestore();
    
    // 1. Migrate Textbook Vocabulary Data
    console.log('📚 Migrating Textbook Vocabulary...');
    try {
      const vocabDB = await new Promise((resolve, reject) => {
        const request = indexedDB.open('doshi-sensei-textbook-vocab');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Get all progress records
      const progressTx = vocabDB.transaction(['progress'], 'readonly');
      const progressStore = progressTx.objectStore('progress');
      const allProgress = await new Promise((resolve, reject) => {
        const request = progressStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      results.textbookVocab.found = allProgress.length;
      console.log(`  Found ${allProgress.length} vocabulary progress records`);
      
      // Write to Firebase one by one (batch might not be available)
      if (allProgress.length > 0) {
        for (const progress of allProgress) {
          try {
            await db.collection('users').doc(user.uid)
              .collection('textbookVocabularyProgress').doc(progress.id)
              .set({
                ...progress,
                userId: user.uid,
                lastReviewed: progress.lastReviewed instanceof Date ? progress.lastReviewed.toISOString() : progress.lastReviewed,
                nextReview: progress.nextReview instanceof Date ? progress.nextReview.toISOString() : progress.nextReview,
                createdAt: progress.createdAt instanceof Date ? progress.createdAt.toISOString() : progress.createdAt || new Date().toISOString(),
                updatedAt: progress.updatedAt instanceof Date ? progress.updatedAt.toISOString() : progress.updatedAt || new Date().toISOString()
              });
            results.textbookVocab.migrated++;
            
            // Show progress every 10 items
            if (results.textbookVocab.migrated % 10 === 0) {
              console.log(`    Progress: ${results.textbookVocab.migrated}/${allProgress.length} migrated...`);
            }
          } catch (error) {
            console.error(`    Failed to migrate ${progress.id}:`, error.message);
          }
        }
        console.log(`  ✅ Migrated ${results.textbookVocab.migrated} vocabulary records to Firebase`);
      }
      
      // Get all session records
      const sessionsTx = vocabDB.transaction(['sessions'], 'readonly');
      const sessionsStore = sessionsTx.objectStore('sessions');
      const allSessions = await new Promise((resolve, reject) => {
        const request = sessionsStore.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      if (allSessions.length > 0) {
        console.log(`  Found ${allSessions.length} study sessions`);
        
        for (const session of allSessions) {
          try {
            await db.collection('users').doc(user.uid)
              .collection('textbookVocabularyStudySessions').doc(session.id)
              .set({
                ...session,
                userId: user.uid,
                startTime: session.startTime instanceof Date ? session.startTime.toISOString() : session.startTime,
                endTime: session.endTime instanceof Date ? session.endTime.toISOString() : session.endTime
              });
          } catch (error) {
            console.error(`    Failed to migrate session ${session.id}:`, error.message);
          }
        }
        console.log(`  ✅ Migrated ${allSessions.length} study sessions to Firebase`);
      }
      
      vocabDB.close();
    } catch (error) {
      console.error('  ❌ Error migrating textbook vocabulary:', error);
      results.errors.push(`Textbook vocab: ${error.message}`);
    }
    
    // 2. Migrate Kanji Mastery Data
    console.log('\n🈷️ Migrating Kanji Mastery...');
    try {
      // Check localStorage for kanji data
      const kanjiProgressKey = 'kanji_mastery_progress';
      const kanjiSessionsKey = 'kanji_study_sessions';
      
      const kanjiProgressData = localStorage.getItem(kanjiProgressKey);
      const kanjiSessionsData = localStorage.getItem(kanjiSessionsKey);
      
      if (kanjiProgressData) {
        const kanjiProgress = JSON.parse(kanjiProgressData);
        results.kanjiMastery.found = Array.isArray(kanjiProgress) ? kanjiProgress.length : 0;
        
        if (results.kanjiMastery.found > 0) {
          console.log(`  Found ${results.kanjiMastery.found} kanji progress records`);
          
          for (const progress of kanjiProgress) {
            try {
              await db.collection('users').doc(user.uid)
                .collection('kanjiProgress').doc(progress.id || progress.kanji)
                .set({
                  ...progress,
                  userId: user.uid,
                  lastReviewed: progress.lastReviewed || new Date().toISOString(),
                  nextReview: progress.nextReview || new Date().toISOString(),
                  createdAt: progress.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                });
              results.kanjiMastery.migrated++;
            } catch (error) {
              console.error(`    Failed to migrate kanji ${progress.id}:`, error.message);
            }
          }
          console.log(`  ✅ Migrated ${results.kanjiMastery.migrated} kanji records to Firebase`);
        }
      }
      
      if (kanjiSessionsData) {
        const kanjiSessions = JSON.parse(kanjiSessionsData);
        if (Array.isArray(kanjiSessions) && kanjiSessions.length > 0) {
          console.log(`  Found ${kanjiSessions.length} kanji study sessions`);
          
          for (const session of kanjiSessions) {
            try {
              const sessionId = session.id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              await db.collection('users').doc(user.uid)
                .collection('kanjiStudySessions').doc(sessionId)
                .set({
                  ...session,
                  userId: user.uid,
                  date: session.date || new Date().toISOString()
                });
            } catch (error) {
              console.error(`    Failed to migrate kanji session:`, error.message);
            }
          }
          console.log(`  ✅ Migrated ${kanjiSessions.length} kanji sessions to Firebase`);
        }
      }
    } catch (error) {
      console.error('  ❌ Error migrating kanji mastery:', error);
      results.errors.push(`Kanji mastery: ${error.message}`);
    }
    
    // 3. Migrate Study Lists
    console.log('\n📋 Migrating Study Lists...');
    try {
      const studyListsKey = 'doshi_sensei_study_lists';
      const savedItemsKey = 'doshi_sensei_saved_study_items';
      
      const studyListsData = localStorage.getItem(studyListsKey);
      const savedItemsData = localStorage.getItem(savedItemsKey);
      
      if (studyListsData) {
        const studyLists = JSON.parse(studyListsData);
        results.studyLists.found = Array.isArray(studyLists) ? studyLists.length : 0;
        
        if (results.studyLists.found > 0) {
          console.log(`  Found ${results.studyLists.found} study lists`);
          
          for (const list of studyLists) {
            try {
              await db.collection('users').doc(user.uid)
                .collection('studyLists').doc(list.id)
                .set({
                  ...list,
                  userId: user.uid,
                  createdAt: list.createdAt || new Date().toISOString(),
                  updatedAt: list.updatedAt || new Date().toISOString()
                });
              results.studyLists.migrated++;
            } catch (error) {
              console.error(`    Failed to migrate list ${list.id}:`, error.message);
            }
          }
          console.log(`  ✅ Migrated ${results.studyLists.migrated} study lists to Firebase`);
        }
      }
      
      if (savedItemsData) {
        const savedItems = JSON.parse(savedItemsData);
        if (Array.isArray(savedItems) && savedItems.length > 0) {
          console.log(`  Found ${savedItems.length} saved items`);
          
          for (const item of savedItems) {
            try {
              await db.collection('users').doc(user.uid)
                .collection('savedStudyItems').doc(item.id)
                .set({
                  ...item,
                  userId: user.uid,
                  savedAt: item.savedAt || new Date().toISOString()
                });
            } catch (error) {
              console.error(`    Failed to migrate saved item ${item.id}:`, error.message);
            }
          }
          console.log(`  ✅ Migrated ${savedItems.length} saved items to Firebase`);
        }
      }
    } catch (error) {
      console.error('  ❌ Error migrating study lists:', error);
      results.errors.push(`Study lists: ${error.message}`);
    }
    
    // 4. Migrate Game Progress
    console.log('\n🎮 Migrating Game Progress...');
    try {
      const gameKeys = [
        'stroke_order_game',
        'kanji_quest',
        'kana_drop',
        'sentence_scramble',
        'memory_match',
        'game_progress',
        'high_scores'
      ];
      
      let gamesFound = 0;
      let gamesMigrated = 0;
      
      for (const gameKey of gameKeys) {
        const gameData = localStorage.getItem(gameKey);
        if (gameData) {
          gamesFound++;
          try {
            const parsed = JSON.parse(gameData);
            await db.collection('users').doc(user.uid)
              .collection('gameProgress').doc(gameKey)
              .set({
                gameId: gameKey,
                data: parsed,
                userId: user.uid,
                updatedAt: new Date().toISOString()
              });
            gamesMigrated++;
            console.log(`  ✅ Migrated ${gameKey}`);
          } catch (e) {
            console.error(`  ❌ Failed to migrate ${gameKey}:`, e);
          }
        }
      }
      
      results.games.found = gamesFound;
      results.games.migrated = gamesMigrated;
      
      if (gamesFound > 0) {
        console.log(`  ✅ Migrated ${gamesMigrated}/${gamesFound} game progress records`);
      } else {
        console.log(`  No game progress found`);
      }
    } catch (error) {
      console.error('  ❌ Error migrating game progress:', error);
      results.errors.push(`Game progress: ${error.message}`);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\n✅ Successfully Migrated:');
    console.log(`  📚 Textbook Vocabulary: ${results.textbookVocab.migrated}/${results.textbookVocab.found} records`);
    console.log(`  🈷️ Kanji Mastery: ${results.kanjiMastery.migrated}/${results.kanjiMastery.found} records`);
    console.log(`  📋 Study Lists: ${results.studyLists.migrated}/${results.studyLists.found} lists`);
    console.log(`  🎮 Game Progress: ${results.games.migrated}/${results.games.found} games`);
    
    const totalFound = results.textbookVocab.found + results.kanjiMastery.found + 
                      results.studyLists.found + results.games.found;
    const totalMigrated = results.textbookVocab.migrated + results.kanjiMastery.migrated + 
                         results.studyLists.migrated + results.games.migrated;
    
    console.log(`\n📈 Total: ${totalMigrated}/${totalFound} items migrated`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (results.errors.length === 0 && totalMigrated === totalFound) {
      console.log('🎉 Migration completed successfully!');
      console.log('Your data is now synced to Firebase.');
    } else if (totalMigrated > 0) {
      console.log('✅ Partial migration completed.');
      console.log('Some items were migrated successfully.');
    } else {
      console.log('⚠️ No data was migrated. Please check for errors.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    return { error: error.message };
  }
}

// Run it
console.log('Running migration...');
migrateMyData();