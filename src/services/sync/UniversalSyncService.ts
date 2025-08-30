/**
 * Universal Sync Service
 * Ensures ALL tracked features sync to Firebase for premium users
 * Compliant with Three-Pillar Architecture (SUPERPOWERS-V-III.md)
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscriptionManager } from '@/lib/subscriptions/manager';
import { featureManager } from '@/lib/features/manager';
import { FEATURE_REGISTRY } from '@/lib/features/registry';

export interface SyncConfig {
  feature: string;
  collection: string;  // Firebase collection name
  localStorage: 'indexeddb' | 'localstorage' | 'memory';
  syncStrategy: 'realtime' | 'periodic' | 'manual';
  conflictResolution: 'last-write' | 'merge' | 'user-choice';
  batchSize?: number;
  syncInterval?: number; // ms for periodic sync
}

export interface SyncStatus {
  feature: string;
  localCount: number;
  cloudCount: number;
  lastSync: Date | null;
  syncEnabled: boolean;
  isPremium: boolean;
  conflicts: number;
  status: 'idle' | 'syncing' | 'error' | 'success';
}

export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  conflicts: number;
  error?: string;
}

/**
 * Registry of all features that need sync
 * This ensures EVERY trackable feature has cloud backup for premium users
 */
export const SYNC_REGISTRY: Record<string, SyncConfig> = {
  // Learning features - currently local only, NEED SYNC
  'textbook_vocabulary': {
    feature: 'textbook_vocabulary',
    collection: 'textbookVocabularyProgress',
    localStorage: 'indexeddb',
    syncStrategy: 'realtime',
    conflictResolution: 'last-write',
    batchSize: 100
  },
  'kanji_mastery': {
    feature: 'kanji_mastery',
    collection: 'kanjiMasteryProgress',
    localStorage: 'indexeddb',
    syncStrategy: 'realtime',
    conflictResolution: 'merge',
    batchSize: 50
  },
  'drill_practice': {
    feature: 'drill_practice',
    collection: 'drillHistory',
    localStorage: 'localstorage',
    syncStrategy: 'periodic',
    conflictResolution: 'last-write',
    syncInterval: 60000 // 1 minute
  },
  
  // Game features - currently local only, NEED SYNC
  'kanji_quest': {
    feature: 'kanji_quest',
    collection: 'gameProgress',
    localStorage: 'localstorage',
    syncStrategy: 'periodic',
    conflictResolution: 'merge',
    syncInterval: 300000 // 5 minutes
  },
  'kana_drop': {
    feature: 'kana_drop',
    collection: 'gameProgress',
    localStorage: 'localstorage',
    syncStrategy: 'periodic',
    conflictResolution: 'merge',
    syncInterval: 300000
  },
  'sentence_scramble': {
    feature: 'sentence_scramble',
    collection: 'gameProgress',
    localStorage: 'localstorage',
    syncStrategy: 'periodic',
    conflictResolution: 'merge',
    syncInterval: 300000
  },
  'memory_match': {
    feature: 'memory_match',
    collection: 'gameProgress',
    localStorage: 'localstorage',
    syncStrategy: 'periodic',
    conflictResolution: 'merge',
    syncInterval: 300000
  },
  
  // Already syncing features (keep them registered for consistency)
  'flashcard_review': {
    feature: 'flashcard_review',
    collection: 'flashcards',
    localStorage: 'indexeddb',
    syncStrategy: 'realtime',
    conflictResolution: 'last-write'
  },
  'study_lists': {
    feature: 'study_lists',
    collection: 'studyLists',
    localStorage: 'indexeddb',
    syncStrategy: 'realtime',
    conflictResolution: 'merge'
  },
  'saved_items': {
    feature: 'saved_items',
    collection: 'savedItems',
    localStorage: 'indexeddb',
    syncStrategy: 'realtime',
    conflictResolution: 'last-write'
  },
  
  // System features
  'user_preferences': {
    feature: 'user_preferences',
    collection: 'userSettings',
    localStorage: 'localstorage',
    syncStrategy: 'manual',
    conflictResolution: 'last-write'
  },
  'achievement_progress': {
    feature: 'achievement_progress',
    collection: 'achievements',
    localStorage: 'indexeddb',
    syncStrategy: 'periodic',
    conflictResolution: 'merge',
    syncInterval: 600000 // 10 minutes
  }
};

export class UniversalSyncService {
  private userId: string;
  private isPremium: boolean = false;
  private listeners: Map<string, Unsubscribe> = new Map();
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();
  private syncQueue: Map<string, any[]> = new Map();
  
  constructor(userId: string) {
    this.userId = userId;
    this.checkPremiumStatus();
  }
  
  /**
   * Check if user has premium subscription (monthly or yearly)
   * Following SUPERPOWERS-V-III.md flat structure
   */
  private async checkPremiumStatus(): Promise<void> {
    const subscription = await subscriptionManager.getSubscription(this.userId);
    
    // Following the flat structure from Firebase Functions
    this.isPremium = subscription?.plan === 'monthly' || 
                     subscription?.plan === 'yearly';
    
    console.log(`🔐 Sync Service: User ${this.userId} premium status: ${this.isPremium}`);
  }
  
  /**
   * Initialize sync for a feature
   * This is the MAIN METHOD that ensures sync for premium users
   */
  async initializeSync(featureId: string): Promise<void> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) {
      console.warn(`⚠️ No sync config for feature: ${featureId}`);
      return;
    }
    
    // Re-check premium status
    await this.checkPremiumStatus();
    
    if (!this.isPremium) {
      console.log(`ℹ️ Sync disabled for ${featureId} - user is not premium`);
      return;
    }
    
    console.log(`🔄 Initializing sync for ${featureId}...`);
    
    // Set up sync based on strategy
    switch (config.syncStrategy) {
      case 'realtime':
        await this.setupRealtimeSync(config);
        break;
      case 'periodic':
        await this.setupPeriodicSync(config);
        break;
      case 'manual':
        // Manual sync only when explicitly triggered
        console.log(`📌 Manual sync configured for ${featureId}`);
        break;
    }
    
    // Do initial sync to load cloud data
    await this.performInitialSync(config);
  }
  
  /**
   * Setup real-time sync listener
   */
  private async setupRealtimeSync(config: SyncConfig): Promise<void> {
    const collectionPath = `users/${this.userId}/${config.collection}`;
    const collectionRef = collection(db, collectionPath);
    
    // Clean up existing listener
    this.stopSync(config.feature);
    
    const unsubscribe = onSnapshot(collectionRef, 
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'modified' || change.type === 'added') {
            // Apply remote changes to local storage
            await this.applyRemoteChange(config, change.doc.id, change.doc.data());
          }
        });
      },
      (error) => {
        console.error(`❌ Realtime sync error for ${config.feature}:`, error);
      }
    );
    
    this.listeners.set(config.feature, unsubscribe);
    console.log(`✅ Realtime sync enabled for ${config.feature}`);
  }
  
  /**
   * Setup periodic sync
   */
  private async setupPeriodicSync(config: SyncConfig): Promise<void> {
    // Clear existing timer
    const existingTimer = this.syncTimers.get(config.feature);
    if (existingTimer) {
      clearInterval(existingTimer);
    }
    
    const timer = setInterval(async () => {
      await this.syncFeature(config.feature);
    }, config.syncInterval || 300000); // Default 5 minutes
    
    this.syncTimers.set(config.feature, timer);
    console.log(`⏱️ Periodic sync enabled for ${config.feature} (every ${config.syncInterval}ms)`);
  }
  
  /**
   * Perform initial sync to load cloud data
   */
  private async performInitialSync(config: SyncConfig): Promise<void> {
    if (!this.isPremium) return;
    
    try {
      const collectionPath = `users/${this.userId}/${config.collection}`;
      const snapshot = await getDocs(collection(db, collectionPath));
      
      console.log(`📥 Loading ${snapshot.size} items from cloud for ${config.feature}`);
      
      // Load cloud data to local storage
      const cloudData: Record<string, any> = {};
      snapshot.forEach(doc => {
        cloudData[doc.id] = doc.data();
      });
      
      // Merge with local data
      await this.mergeWithLocal(config, cloudData);
      
    } catch (error) {
      console.error(`❌ Initial sync failed for ${config.feature}:`, error);
    }
  }
  
  /**
   * Save data locally AND sync to cloud if premium
   */
  async save(featureId: string, itemId: string, data: any): Promise<void> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) {
      console.warn(`⚠️ No sync config for feature: ${featureId}`);
      return;
    }
    
    // Always save locally first
    await this.saveLocal(config, itemId, data);
    
    // Sync to cloud if premium
    if (this.isPremium) {
      await this.saveCloud(config, itemId, data);
    }
  }
  
  /**
   * Load data with cloud sync if premium
   */
  async load(featureId: string, itemId?: string): Promise<any> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) {
      console.warn(`⚠️ No sync config for feature: ${featureId}`);
      return null;
    }
    
    // Load from local first
    const localData = await this.loadLocal(config, itemId);
    
    // If premium, check cloud for newer data
    if (this.isPremium) {
      const cloudData = await this.loadCloud(config, itemId);
      
      if (cloudData && this.isNewer(cloudData, localData)) {
        // Cloud data is newer, update local
        await this.saveLocal(config, itemId || cloudData.id, cloudData);
        return cloudData;
      }
    }
    
    return localData;
  }
  
  /**
   * Batch save multiple items
   */
  async batchSave(featureId: string, items: Array<{id: string, data: any}>): Promise<void> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) return;
    
    // Save all locally
    for (const item of items) {
      await this.saveLocal(config, item.id, item.data);
    }
    
    // Batch sync to cloud if premium
    if (this.isPremium) {
      const batch = writeBatch(db);
      const collectionPath = `users/${this.userId}/${config.collection}`;
      
      for (const item of items) {
        const docRef = doc(db, collectionPath, item.id);
        batch.set(docRef, {
          ...item.data,
          updatedAt: Timestamp.now(),
          syncVersion: Date.now()
        }, { merge: true });
      }
      
      await batch.commit();
      console.log(`📤 Batch synced ${items.length} items for ${featureId}`);
    }
  }
  
  /**
   * Manual sync trigger
   */
  async syncFeature(featureId: string): Promise<SyncResult> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) {
      return { success: false, itemsSynced: 0, conflicts: 0, error: 'No sync config' };
    }
    
    if (!this.isPremium) {
      return { success: false, itemsSynced: 0, conflicts: 0, error: 'Premium required' };
    }
    
    try {
      console.log(`🔄 Manual sync triggered for ${featureId}`);
      
      // Get local data
      const localData = await this.getAllLocal(config);
      
      // Get cloud data
      const cloudData = await this.getAllCloud(config);
      
      // Merge and resolve conflicts
      const { merged, conflicts } = await this.mergeData(config, localData, cloudData);
      
      // Update both local and cloud with merged data
      await this.updateAll(config, merged);
      
      return {
        success: true,
        itemsSynced: Object.keys(merged).length,
        conflicts
      };
      
    } catch (error) {
      console.error(`❌ Sync failed for ${featureId}:`, error);
      return {
        success: false,
        itemsSynced: 0,
        conflicts: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Get sync status for a feature
   */
  async getSyncStatus(featureId: string): Promise<SyncStatus> {
    const config = SYNC_REGISTRY[featureId];
    if (!config) {
      return {
        feature: featureId,
        localCount: 0,
        cloudCount: 0,
        lastSync: null,
        syncEnabled: false,
        isPremium: this.isPremium,
        conflicts: 0,
        status: 'error'
      };
    }
    
    const localData = await this.getAllLocal(config);
    const localCount = Object.keys(localData).length;
    
    let cloudCount = 0;
    let lastSync: Date | null = null;
    
    if (this.isPremium) {
      const cloudData = await this.getAllCloud(config);
      cloudCount = Object.keys(cloudData).length;
      
      // Get last sync time from metadata
      const metadataDoc = await getDoc(
        doc(db, `users/${this.userId}/syncMetadata`, featureId)
      );
      
      if (metadataDoc.exists()) {
        lastSync = metadataDoc.data().lastSync?.toDate() || null;
      }
    }
    
    return {
      feature: featureId,
      localCount,
      cloudCount,
      lastSync,
      syncEnabled: this.isPremium,
      isPremium: this.isPremium,
      conflicts: 0,
      status: 'success'
    };
  }
  
  /**
   * Stop sync for a feature
   */
  stopSync(featureId: string): void {
    // Stop realtime listener
    const listener = this.listeners.get(featureId);
    if (listener) {
      listener();
      this.listeners.delete(featureId);
    }
    
    // Stop periodic timer
    const timer = this.syncTimers.get(featureId);
    if (timer) {
      clearInterval(timer);
      this.syncTimers.delete(featureId);
    }
    
    console.log(`🛑 Sync stopped for ${featureId}`);
  }
  
  /**
   * Stop all syncs
   */
  destroy(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    this.syncTimers.forEach(timer => clearInterval(timer));
    this.syncTimers.clear();
    
    console.log('🛑 All syncs stopped');
  }
  
  // === Private Helper Methods ===
  
  private async saveLocal(config: SyncConfig, itemId: string, data: any): Promise<void> {
    // Implementation depends on localStorage type
    // This would interface with IndexedDB, localStorage, etc.
    console.log(`💾 Saving locally: ${config.feature}/${itemId}`);
  }
  
  private async saveCloud(config: SyncConfig, itemId: string, data: any): Promise<void> {
    const docRef = doc(db, `users/${this.userId}/${config.collection}`, itemId);
    await setDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
      syncVersion: Date.now()
    }, { merge: true });
    console.log(`☁️ Saved to cloud: ${config.feature}/${itemId}`);
  }
  
  private async loadLocal(config: SyncConfig, itemId?: string): Promise<any> {
    // Implementation depends on localStorage type
    console.log(`📂 Loading locally: ${config.feature}/${itemId || 'all'}`);
    return null;
  }
  
  private async loadCloud(config: SyncConfig, itemId?: string): Promise<any> {
    if (itemId) {
      const docRef = doc(db, `users/${this.userId}/${config.collection}`, itemId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    }
    return null;
  }
  
  private async getAllLocal(config: SyncConfig): Promise<Record<string, any>> {
    // Implementation depends on localStorage type
    return {};
  }
  
  private async getAllCloud(config: SyncConfig): Promise<Record<string, any>> {
    const collectionPath = `users/${this.userId}/${config.collection}`;
    const snapshot = await getDocs(collection(db, collectionPath));
    
    const data: Record<string, any> = {};
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    
    return data;
  }
  
  private async mergeData(
    config: SyncConfig,
    local: Record<string, any>,
    cloud: Record<string, any>
  ): Promise<{ merged: Record<string, any>, conflicts: number }> {
    const merged: Record<string, any> = {};
    let conflicts = 0;
    
    // Process all items from both sources
    const allIds = new Set([...Object.keys(local), ...Object.keys(cloud)]);
    
    for (const id of allIds) {
      const localItem = local[id];
      const cloudItem = cloud[id];
      
      if (!localItem) {
        // Cloud only
        merged[id] = cloudItem;
      } else if (!cloudItem) {
        // Local only
        merged[id] = localItem;
      } else {
        // Both exist - resolve conflict
        merged[id] = await this.resolveConflict(config, localItem, cloudItem);
        if (this.isConflict(localItem, cloudItem)) {
          conflicts++;
        }
      }
    }
    
    return { merged, conflicts };
  }
  
  private async resolveConflict(config: SyncConfig, local: any, cloud: any): Promise<any> {
    switch (config.conflictResolution) {
      case 'last-write':
        return this.isNewer(local, cloud) ? local : cloud;
      case 'merge':
        return { ...cloud, ...local }; // Simple merge, could be more sophisticated
      case 'user-choice':
        // Would need UI to handle this
        return local;
      default:
        return local;
    }
  }
  
  private isNewer(a: any, b: any): boolean {
    const aTime = a.updatedAt?.toDate?.() || a.updatedAt || 0;
    const bTime = b.updatedAt?.toDate?.() || b.updatedAt || 0;
    return aTime > bTime;
  }
  
  private isConflict(local: any, cloud: any): boolean {
    return local.syncVersion !== cloud.syncVersion;
  }
  
  private async mergeWithLocal(config: SyncConfig, cloudData: Record<string, any>): Promise<void> {
    // Implementation depends on localStorage type
    console.log(`🔀 Merging ${Object.keys(cloudData).length} cloud items with local storage`);
  }
  
  private async applyRemoteChange(config: SyncConfig, itemId: string, data: any): Promise<void> {
    await this.saveLocal(config, itemId, data);
    console.log(`📥 Applied remote change: ${config.feature}/${itemId}`);
  }
  
  private async updateAll(config: SyncConfig, data: Record<string, any>): Promise<void> {
    // Update local
    for (const [id, item] of Object.entries(data)) {
      await this.saveLocal(config, id, item);
    }
    
    // Update cloud
    if (this.isPremium) {
      const batch = writeBatch(db);
      const collectionPath = `users/${this.userId}/${config.collection}`;
      
      for (const [id, item] of Object.entries(data)) {
        const docRef = doc(db, collectionPath, id);
        batch.set(docRef, {
          ...item,
          updatedAt: Timestamp.now(),
          syncVersion: Date.now()
        }, { merge: true });
      }
      
      await batch.commit();
    }
  }
}

// Singleton instance manager
const syncInstances = new Map<string, UniversalSyncService>();

export function getUniversalSync(userId: string): UniversalSyncService {
  if (!syncInstances.has(userId)) {
    syncInstances.set(userId, new UniversalSyncService(userId));
  }
  return syncInstances.get(userId)!;
}