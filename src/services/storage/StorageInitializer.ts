/**
 * Storage Initializer
 * Automatically sets up unified storage on app startup
 * Handles auth changes and premium status updates
 */

import { getUnifiedStorage } from './UnifiedStorageLayer';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { subscriptionManager } from '@/lib/subscriptions/manager';
import { initializeStorageInterceptors } from './StorageInterceptors';
import { initializeAutoSync } from './AutoSyncIntegration';

let initialized = false;
let currentUserId: string | null = null;

/**
 * Initialize universal storage system
 * Call this ONCE in your app startup (_app.tsx or root component)
 */
export async function initializeUniversalStorage(): Promise<void> {
  if (initialized) {
    console.log('⚠️ Universal storage already initialized');
    return;
  }
  
  console.log('🚀 Initializing Universal Storage System...');
  
  const storage = getUnifiedStorage();
  
  // Initialize storage interceptors to catch ALL storage operations
  initializeStorageInterceptors();
  
  // Initialize auto-sync for all features
  initializeAutoSync();
  
  // Listen for auth changes
  onAuthStateChanged(auth, async (user) => {
    const userId = user?.uid || null;
    
    // User changed - reinitialize storage
    if (userId !== currentUserId) {
      console.log(`👤 User changed: ${currentUserId} → ${userId}`);
      currentUserId = userId;
      
      // Destroy old connections
      if (currentUserId) {
        storage.destroy();
      }
      
      // Initialize with new user
      await storage.initialize(userId);
      
      // If user is logged in, check for existing data to migrate
      if (userId) {
        await migrateExistingData(userId);
      }
    }
  });
  
  // Also listen for subscription changes
  if (auth.currentUser) {
    subscriptionManager.listenToSubscription(
      auth.currentUser.uid,
      async (subscription) => {
        const isPremium = subscription?.plan === 'monthly' || subscription?.plan === 'yearly';
        console.log(`💳 Subscription updated: Premium = ${isPremium}`);
        
        // Reinitialize to update sync status
        await storage.initialize(auth.currentUser!.uid);
      }
    );
  }
  
  initialized = true;
  console.log('✅ Universal Storage System initialized');
}

/**
 * Migrate existing data from old storage systems to unified storage
 * This ensures no data loss during transition
 */
async function migrateExistingData(userId: string): Promise<void> {
  const storage = getUnifiedStorage();
  
  console.log('🔄 Checking for data to migrate...');
  
  // Check for textbook vocabulary data in old IndexedDB
  await migrateTextbookVocabulary(userId, storage);
  
  // Check for kanji mastery data
  await migrateKanjiMastery(userId, storage);
  
  // Check for game progress in localStorage
  await migrateGameProgress(userId, storage);
  
  // Check for drill history
  await migrateDrillHistory(userId, storage);
  
  console.log('✅ Migration check complete');
}

async function migrateTextbookVocabulary(userId: string, storage: any): Promise<void> {
  try {
    // Check if old database exists
    const dbName = `textbook_vocabulary_${userId}`;
    const dbExists = await checkDatabaseExists(dbName);
    
    if (!dbExists) return;
    
    console.log('📚 Migrating textbook vocabulary data...');
    
    const request = indexedDB.open(dbName);
    
    request.onsuccess = async () => {
      const db = request.result;
      
      // Check for reviewStates store
      if (db.objectStoreNames.contains('reviewStates')) {
        const transaction = db.transaction(['reviewStates'], 'readonly');
        const store = transaction.objectStore('reviewStates');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = async () => {
          const states = getAllRequest.result;
          
          if (states.length > 0) {
            console.log(`  Found ${states.length} review states to migrate`);
            
            // Save each state to unified storage
            for (const state of states) {
              await storage.save('textbook_vocabulary_states', state.card_id, state);
            }
            
            console.log(`  ✅ Migrated ${states.length} textbook vocabulary states`);
          }
        };
      }
      
      db.close();
    };
  } catch (error) {
    console.error('Error migrating textbook vocabulary:', error);
  }
}

async function migrateKanjiMastery(userId: string, storage: any): Promise<void> {
  try {
    // Check for kanji mastery database
    const dbName = `kanji_mastery_${userId}`;
    const dbExists = await checkDatabaseExists(dbName);
    
    if (!dbExists) return;
    
    console.log('🈷️ Migrating kanji mastery data...');
    
    const request = indexedDB.open(dbName);
    
    request.onsuccess = async () => {
      const db = request.result;
      
      // Check for progress store
      if (db.objectStoreNames.contains('progress')) {
        const transaction = db.transaction(['progress'], 'readonly');
        const store = transaction.objectStore('progress');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = async () => {
          const items = getAllRequest.result;
          
          if (items.length > 0) {
            console.log(`  Found ${items.length} kanji progress items to migrate`);
            
            for (const item of items) {
              await storage.save('kanji_progress', item.id || item.kanji, item);
            }
            
            console.log(`  ✅ Migrated ${items.length} kanji progress items`);
          }
        };
      }
      
      db.close();
    };
  } catch (error) {
    console.error('Error migrating kanji mastery:', error);
  }
}

async function migrateGameProgress(userId: string, storage: any): Promise<void> {
  try {
    console.log('🎮 Checking for game progress in localStorage...');
    
    const gameKeys = [
      'kanji_quest_progress',
      'kana_drop_scores',
      'sentence_scramble_stats',
      'memory_match_records',
      'stroke_order_progress'
    ];
    
    let migrated = 0;
    
    for (const key of gameKeys) {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          await storage.save('game_progress', key, parsed);
          migrated++;
        } catch (e) {
          console.error(`Failed to migrate ${key}:`, e);
        }
      }
    }
    
    if (migrated > 0) {
      console.log(`  ✅ Migrated ${migrated} game progress items`);
    }
  } catch (error) {
    console.error('Error migrating game progress:', error);
  }
}

async function migrateDrillHistory(userId: string, storage: any): Promise<void> {
  try {
    console.log('📝 Checking for drill history...');
    
    const drillKey = `drill_history_${userId}`;
    const data = localStorage.getItem(drillKey);
    
    if (data) {
      try {
        const parsed = JSON.parse(data);
        await storage.save('drill_history', 'all', parsed);
        console.log(`  ✅ Migrated drill history`);
      } catch (e) {
        console.error('Failed to migrate drill history:', e);
      }
    }
  } catch (error) {
    console.error('Error migrating drill history:', error);
  }
}

async function checkDatabaseExists(dbName: string): Promise<boolean> {
  try {
    // Try to open the database
    const request = indexedDB.open(dbName);
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        request.result.close();
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
      
      // If upgrade is needed, database doesn't exist
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Force sync all pending data
 * Useful for manual sync triggers or before logout
 */
export async function forceSyncAll(): Promise<void> {
  const storage = getUnifiedStorage();
  await storage.syncAll();
  console.log('✅ Force sync complete');
}

/**
 * Get sync status for debugging
 */
export async function getSyncStatus(): Promise<any> {
  const storage = getUnifiedStorage();
  
  const status: Record<string, any> = {};
  
  // Check each feature's sync status
  const features = [
    'textbook_vocabulary_progress',
    'kanji_progress',
    'study_lists',
    'game_progress',
    'drill_history'
  ];
  
  for (const feature of features) {
    try {
      const data = await storage.loadAll(feature);
      status[feature] = {
        localItems: Object.keys(data).length,
        initialized: true
      };
    } catch (error) {
      status[feature] = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  return status;
}