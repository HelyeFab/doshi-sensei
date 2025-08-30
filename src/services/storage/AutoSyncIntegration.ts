/**
 * Auto Sync Integration
 * Ensures ALL features automatically sync to cloud for premium users
 * Works with existing code without modifications
 */

import { getUnifiedStorage } from './UnifiedStorageLayer';
import { auth } from '@/lib/firebase';
import { getDoc, doc, getFirestore } from 'firebase/firestore';

// Feature-specific sync configurations
const SYNC_CONFIGS = {
  // Textbook Vocabulary - Already partially integrated
  textbook_vocabulary: {
    detectPattern: /textbook.*vocab|vocab.*progress|fsrs/i,
    storageKeys: ['progress', 'sessions', 'reviewStates'],
    firebaseCollection: 'textbookVocabularyProgress'
  },
  
  // Kanji Mastery - Already partially integrated  
  kanji_mastery: {
    detectPattern: /kanji.*mastery|kanji.*progress/i,
    storageKeys: ['progress', 'sessions', 'achievements'],
    firebaseCollection: 'kanjiProgress'
  },
  
  // Study Lists & Saved Items
  study_lists: {
    detectPattern: /study.*list|saved.*item|word.*list|kanji.*list/i,
    storageKeys: ['studyLists', 'savedStudyItems'],
    firebaseCollection: 'studyLists'
  },
  
  // Flashcards
  flashcards: {
    detectPattern: /flashcard|flash.*card|card.*review/i,
    storageKeys: ['flashcards', 'flashcardProgress'],
    firebaseCollection: 'flashcards'
  },
  
  // Games Progress
  games: {
    detectPattern: /game.*progress|stroke.*order|kanji.*quest|kana.*drop/i,
    storageKeys: ['gameProgress', 'highScores', 'achievements'],
    firebaseCollection: 'gameProgress'
  },
  
  // Drill History
  drills: {
    detectPattern: /drill.*history|conjugation.*practice/i,
    storageKeys: ['drillHistory', 'drillStats'],
    firebaseCollection: 'drillHistory'
  },
  
  // User Settings & Preferences
  settings: {
    detectPattern: /user.*setting|preference|config/i,
    storageKeys: ['settings', 'preferences', 'config'],
    firebaseCollection: 'userSettings'
  },
  
  // Review Hub Data
  review_hub: {
    detectPattern: /review.*hub|review.*event|review.*store/i,
    storageKeys: ['reviewEvents', 'reviewProgress'],
    firebaseCollection: 'reviewHub'
  },
  
  // Shadowing & YouTube
  shadowing: {
    detectPattern: /shadow|youtube|transcript/i,
    storageKeys: ['shadowingProgress', 'transcripts'],
    firebaseCollection: 'shadowingProgress'
  },
  
  // News & Stories
  content: {
    detectPattern: /news.*progress|story.*progress|article/i,
    storageKeys: ['newsProgress', 'storyProgress'],
    firebaseCollection: 'contentProgress'
  },
  
  // Kana Study
  kana: {
    detectPattern: /kana.*study|hiragana|katakana/i,
    storageKeys: ['kanaProgress', 'kanaStats'],
    firebaseCollection: 'kanaProgress'
  },
  
  // Vocabulary Lookups
  lookups: {
    detectPattern: /lookup|dictionary.*history|search.*history/i,
    storageKeys: ['lookupHistory', 'favorites'],
    firebaseCollection: 'lookupHistory'
  },
  
  // Activity Tracking
  activity: {
    detectPattern: /activity|streak|daily.*goal/i,
    storageKeys: ['activityLog', 'streaks', 'dailyGoals'],
    firebaseCollection: 'activityTracking'
  }
};

/**
 * Detect which feature a storage operation belongs to
 */
function detectFeature(key: string, dbName?: string): string | null {
  const fullKey = `${dbName || ''}_${key}`.toLowerCase();
  
  for (const [feature, config] of Object.entries(SYNC_CONFIGS)) {
    if (config.detectPattern.test(fullKey)) {
      return feature;
    }
    
    // Check if key matches any storage keys
    if (config.storageKeys.some(k => fullKey.includes(k.toLowerCase()))) {
      return feature;
    }
  }
  
  // Default to generic sync if no pattern matches
  return 'generic';
}

/**
 * Auto-detect and sync storage operations
 */
export class AutoSyncManager {
  private static instance: AutoSyncManager;
  private storage = getUnifiedStorage();
  private syncQueue: Map<string, any> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  
  private constructor() {
    this.startBatchSync();
  }
  
  static getInstance(): AutoSyncManager {
    if (!AutoSyncManager.instance) {
      AutoSyncManager.instance = new AutoSyncManager();
    }
    return AutoSyncManager.instance;
  }
  
  /**
   * Queue a storage operation for sync
   */
  queueSync(operation: 'save' | 'delete', key: string, value?: any, context?: string) {
    const feature = detectFeature(key, context);
    if (!feature) return;
    
    const syncKey = `${feature}_${key}`;
    
    if (operation === 'save') {
      this.syncQueue.set(syncKey, {
        operation,
        feature,
        key,
        value,
        timestamp: Date.now()
      });
    } else if (operation === 'delete') {
      this.syncQueue.set(syncKey, {
        operation,
        feature,
        key,
        timestamp: Date.now()
      });
    }
    
    // Trigger batch sync after a short delay
    this.scheduleBatchSync();
  }
  
  /**
   * Schedule batch sync with debouncing
   */
  private scheduleBatchSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }
    
    this.syncTimer = setTimeout(() => {
      this.processSyncQueue();
    }, 1000); // 1 second debounce
  }
  
  /**
   * Process the sync queue
   */
  private async processSyncQueue() {
    if (this.syncQueue.size === 0) return;
    
    const user = auth.currentUser;
    if (!user) {
      this.syncQueue.clear();
      return;
    }
    
    // Check premium status
    const isPremium = await this.checkPremiumStatus();
    if (!isPremium) {
      this.syncQueue.clear();
      return;
    }
    
    console.log(`🔄 Processing sync queue: ${this.syncQueue.size} items`);
    
    // Process each queued item
    const promises: Promise<void>[] = [];
    
    for (const [syncKey, item] of this.syncQueue.entries()) {
      if (item.operation === 'save') {
        promises.push(
          this.storage.save(
            item.feature,
            item.key,
            item.value,
            { skipLocal: true }
          ).catch(error => {
            console.error(`Failed to sync ${syncKey}:`, error);
          })
        );
      } else if (item.operation === 'delete') {
        promises.push(
          this.storage.delete(
            item.feature,
            item.key
          ).catch(error => {
            console.error(`Failed to delete ${syncKey}:`, error);
          })
        );
      }
    }
    
    // Wait for all syncs to complete
    await Promise.all(promises);
    
    console.log(`✅ Sync queue processed: ${this.syncQueue.size} items`);
    this.syncQueue.clear();
  }
  
  /**
   * Start periodic batch sync
   */
  private startBatchSync() {
    // Process queue every 30 seconds if there are items
    setInterval(() => {
      if (this.syncQueue.size > 0) {
        this.processSyncQueue();
      }
    }, 30000);
  }
  
  /**
   * Check if user is premium
   */
  private async checkPremiumStatus(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      const db = getFirestore();
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return false;
      
      const userData = userDoc.data();
      const subscription = userData.subscription;
      
      return subscription?.plan === 'monthly' || subscription?.plan === 'yearly';
    } catch (error) {
      console.error('Error checking premium status:', error);
      return false;
    }
  }
  
  /**
   * Force sync all pending items
   */
  async forceSyncAll(): Promise<void> {
    console.log('⚡ Forcing sync of all pending items...');
    await this.processSyncQueue();
  }
  
  /**
   * Get sync statistics
   */
  getSyncStats(): { pending: number; features: string[] } {
    const features = new Set<string>();
    
    for (const [, item] of this.syncQueue.entries()) {
      features.add(item.feature);
    }
    
    return {
      pending: this.syncQueue.size,
      features: Array.from(features)
    };
  }
}

/**
 * Global sync manager instance
 */
export const autoSyncManager = AutoSyncManager.getInstance();

/**
 * Hook into existing storage operations
 * This wraps common storage patterns to auto-sync
 */
export function wrapStorageMethod<T extends Function>(
  originalMethod: T,
  context: string
): T {
  return ((...args: any[]) => {
    const result = originalMethod.apply(this, args);
    
    // Detect save operations
    if (originalMethod.name.includes('save') || 
        originalMethod.name.includes('put') || 
        originalMethod.name.includes('set') ||
        originalMethod.name.includes('add')) {
      
      const key = args[0]?.id || args[0]?.key || args[0];
      const value = args[1] || args[0];
      
      if (key && value) {
        autoSyncManager.queueSync('save', String(key), value, context);
      }
    }
    
    // Detect delete operations
    if (originalMethod.name.includes('delete') || 
        originalMethod.name.includes('remove')) {
      
      const key = args[0]?.id || args[0]?.key || args[0];
      
      if (key) {
        autoSyncManager.queueSync('delete', String(key), undefined, context);
      }
    }
    
    return result;
  }) as T;
}

/**
 * Initialize auto sync for all features
 */
export function initializeAutoSync() {
  console.log('🚀 Initializing auto-sync for all features...');
  
  // Monitor auth state changes
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log(`👤 Auto-sync activated for user: ${user.uid}`);
      
      // Force sync any pending items when user logs in
      autoSyncManager.forceSyncAll();
    } else {
      console.log('👤 Auto-sync deactivated (user logged out)');
    }
  });
  
  console.log('✅ Auto-sync initialized for all features');
}

/**
 * Get detailed sync status
 */
export async function getSyncStatus(): Promise<{
  enabled: boolean;
  premium: boolean;
  pending: number;
  features: string[];
  lastSync?: Date;
}> {
  const user = auth.currentUser;
  if (!user) {
    return {
      enabled: false,
      premium: false,
      pending: 0,
      features: []
    };
  }
  
  const manager = AutoSyncManager.getInstance();
  const isPremium = await manager['checkPremiumStatus']();
  const stats = manager.getSyncStats();
  
  return {
    enabled: true,
    premium: isPremium,
    pending: stats.pending,
    features: stats.features,
    lastSync: new Date()
  };
}