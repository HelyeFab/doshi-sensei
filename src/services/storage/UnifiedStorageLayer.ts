/**
 * Unified Storage Layer
 * Single storage interface that automatically syncs to Firebase for premium users
 * Replaces all individual storage implementations
 */

import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  writeBatch,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subscriptionManager } from '@/lib/subscriptions/manager';

type StorageType = 'indexeddb' | 'localstorage' | 'memory';
type SyncStrategy = 'realtime' | 'periodic' | 'manual';

interface StorageConfig {
  namespace: string;
  storageType: StorageType;
  syncStrategy: SyncStrategy;
  syncInterval?: number;
  firebaseCollection: string;
}

/**
 * Storage configurations for ALL features
 * This ensures EVERY feature gets proper storage and sync
 */
const STORAGE_CONFIG: Record<string, StorageConfig> = {
  // Textbook Vocabulary
  'textbook_vocabulary_progress': {
    namespace: 'textbook_vocabulary',
    storageType: 'indexeddb',
    syncStrategy: 'realtime',
    firebaseCollection: 'textbookVocabularyProgress'
  },
  'textbook_vocabulary_states': {
    namespace: 'textbook_vocabulary',
    storageType: 'indexeddb',
    syncStrategy: 'realtime',
    firebaseCollection: 'textbookVocabularyStates'
  },
  
  // Kanji Mastery
  'kanji_progress': {
    namespace: 'kanji_mastery',
    storageType: 'indexeddb',
    syncStrategy: 'realtime',
    firebaseCollection: 'kanjiProgress'
  },
  'kanji_stroke_data': {
    namespace: 'kanji_mastery',
    storageType: 'indexeddb',
    syncStrategy: 'manual',
    firebaseCollection: 'kanjiStrokeData'
  },
  
  // Study Lists
  'study_lists': {
    namespace: 'study_lists',
    storageType: 'indexeddb',
    syncStrategy: 'realtime',
    firebaseCollection: 'studyLists'
  },
  'saved_items': {
    namespace: 'saved_items',
    storageType: 'indexeddb',
    syncStrategy: 'realtime',
    firebaseCollection: 'savedItems'
  },
  
  // Games Progress
  'game_progress': {
    namespace: 'games',
    storageType: 'localstorage',
    syncStrategy: 'periodic',
    syncInterval: 300000, // 5 minutes
    firebaseCollection: 'gameProgress'
  },
  'stroke_order_progress': {
    namespace: 'stroke_order',
    storageType: 'localstorage',
    syncStrategy: 'periodic',
    syncInterval: 300000,
    firebaseCollection: 'strokeOrderProgress'
  },
  
  // Drill Practice
  'drill_history': {
    namespace: 'drills',
    storageType: 'localstorage',
    syncStrategy: 'periodic',
    syncInterval: 60000, // 1 minute
    firebaseCollection: 'drillHistory'
  },
  
  // User Settings
  'user_preferences': {
    namespace: 'settings',
    storageType: 'localstorage',
    syncStrategy: 'manual',
    firebaseCollection: 'userSettings'
  },
  
  // Achievement System
  'achievements': {
    namespace: 'achievements',
    storageType: 'indexeddb',
    syncStrategy: 'periodic',
    syncInterval: 600000, // 10 minutes
    firebaseCollection: 'achievements'
  },
  
  // Reading Analytics
  'reading_analytics': {
    namespace: 'analytics',
    storageType: 'indexeddb',
    syncStrategy: 'periodic',
    syncInterval: 300000,
    firebaseCollection: 'readingAnalytics'
  }
};

export class UnifiedStorageLayer {
  private userId: string | null = null;
  private isPremium: boolean = false;
  private dbCache: Map<string, IDBDatabase> = new Map();
  private listeners: Map<string, Unsubscribe> = new Map();
  private syncTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingSyncs: Map<string, Set<string>> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize storage with user context
   */
  async initialize(userId: string | null): Promise<void> {
    this.userId = userId;
    
    if (!userId) {
      this.isPremium = false;
      console.log('📦 UnifiedStorage: Guest mode (local only)');
      return;
    }
    
    // Check premium status
    const subscription = await subscriptionManager.getSubscription(userId);
    this.isPremium = subscription?.plan === 'monthly' || subscription?.plan === 'yearly';
    
    console.log(`📦 UnifiedStorage: User ${userId} (Premium: ${this.isPremium})`);
    
    // Initialize sync for premium users
    if (this.isPremium) {
      await this.initializeSync();
    }
    
    this.initialized = true;
  }

  /**
   * Save data - works both locally and syncs to cloud if premium
   */
  async save(configKey: string, itemId: string, data: any): Promise<void> {
    const config = STORAGE_CONFIG[configKey];
    if (!config) {
      throw new Error(`Unknown storage config: ${configKey}`);
    }
    
    // Always save locally first
    await this.saveLocal(config, itemId, data);
    
    // Sync to Firebase if premium
    if (this.isPremium && this.userId) {
      if (config.syncStrategy === 'realtime') {
        await this.saveToFirebase(config, itemId, data);
      } else if (config.syncStrategy === 'periodic') {
        this.queueForSync(configKey, itemId);
      }
    }
  }

  /**
   * Load data - retrieves from cloud if premium and available
   */
  async load(configKey: string, itemId: string): Promise<any> {
    const config = STORAGE_CONFIG[configKey];
    if (!config) {
      throw new Error(`Unknown storage config: ${configKey}`);
    }
    
    // Try cloud first if premium
    if (this.isPremium && this.userId) {
      const cloudData = await this.loadFromFirebase(config, itemId);
      if (cloudData) {
        // Update local with cloud data
        await this.saveLocal(config, itemId, cloudData);
        return cloudData;
      }
    }
    
    // Fall back to local
    return await this.loadLocal(config, itemId);
  }

  /**
   * Load all items - merges local and cloud data
   */
  async loadAll(configKey: string): Promise<Record<string, any>> {
    const config = STORAGE_CONFIG[configKey];
    if (!config) {
      throw new Error(`Unknown storage config: ${configKey}`);
    }
    
    const localData = await this.loadAllLocal(config);
    
    if (this.isPremium && this.userId) {
      const cloudData = await this.loadAllFromFirebase(config);
      // Merge with cloud data (cloud wins on conflicts)
      return { ...localData, ...cloudData };
    }
    
    return localData;
  }

  /**
   * Delete data
   */
  async delete(configKey: string, itemId: string): Promise<void> {
    const config = STORAGE_CONFIG[configKey];
    if (!config) {
      throw new Error(`Unknown storage config: ${configKey}`);
    }
    
    // Delete locally
    await this.deleteLocal(config, itemId);
    
    // Delete from cloud if premium
    if (this.isPremium && this.userId) {
      await this.deleteFromFirebase(config, itemId);
    }
  }

  /**
   * Force sync all pending changes
   */
  async syncAll(): Promise<void> {
    if (!this.isPremium || !this.userId) return;
    
    for (const [configKey, itemIds] of this.pendingSyncs) {
      const config = STORAGE_CONFIG[configKey];
      if (!config) continue;
      
      for (const itemId of itemIds) {
        const data = await this.loadLocal(config, itemId);
        if (data) {
          await this.saveToFirebase(config, itemId, data);
        }
      }
      
      itemIds.clear();
    }
  }

  // === Private Local Storage Methods ===

  private async saveLocal(config: StorageConfig, itemId: string, data: any): Promise<void> {
    switch (config.storageType) {
      case 'indexeddb':
        await this.saveToIndexedDB(config.namespace, itemId, data);
        break;
      case 'localstorage':
        this.saveToLocalStorage(config.namespace, itemId, data);
        break;
      case 'memory':
        // In-memory storage (not implemented in this example)
        break;
    }
  }

  private async loadLocal(config: StorageConfig, itemId: string): Promise<any> {
    switch (config.storageType) {
      case 'indexeddb':
        return await this.loadFromIndexedDB(config.namespace, itemId);
      case 'localstorage':
        return this.loadFromLocalStorage(config.namespace, itemId);
      case 'memory':
        return null;
    }
  }

  private async loadAllLocal(config: StorageConfig): Promise<Record<string, any>> {
    switch (config.storageType) {
      case 'indexeddb':
        return await this.loadAllFromIndexedDB(config.namespace);
      case 'localstorage':
        return this.loadAllFromLocalStorage(config.namespace);
      case 'memory':
        return {};
    }
  }

  private async deleteLocal(config: StorageConfig, itemId: string): Promise<void> {
    switch (config.storageType) {
      case 'indexeddb':
        await this.deleteFromIndexedDB(config.namespace, itemId);
        break;
      case 'localstorage':
        this.deleteFromLocalStorage(config.namespace, itemId);
        break;
    }
  }

  // === IndexedDB Implementation ===

  private async getDB(namespace: string): Promise<IDBDatabase> {
    if (this.dbCache.has(namespace)) {
      return this.dbCache.get(namespace)!;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(`unified_${namespace}`, 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        this.dbCache.set(namespace, db);
        resolve(db);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToIndexedDB(namespace: string, itemId: string, data: any): Promise<void> {
    const db = await this.getDB(namespace);
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ id: itemId, ...data, _localUpdate: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(namespace: string, itemId: string): Promise<any> {
    const db = await this.getDB(namespace);
    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    
    return new Promise((resolve, reject) => {
      const request = store.get(itemId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadAllFromIndexedDB(namespace: string): Promise<Record<string, any>> {
    const db = await this.getDB(namespace);
    const transaction = db.transaction(['data'], 'readonly');
    const store = transaction.objectStore('data');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const result: Record<string, any> = {};
        for (const item of request.result) {
          result[item.id] = item;
        }
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(namespace: string, itemId: string): Promise<void> {
    const db = await this.getDB(namespace);
    const transaction = db.transaction(['data'], 'readwrite');
    const store = transaction.objectStore('data');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // === LocalStorage Implementation ===

  private saveToLocalStorage(namespace: string, itemId: string, data: any): void {
    const key = `unified_${namespace}_${itemId}`;
    localStorage.setItem(key, JSON.stringify({ ...data, _localUpdate: Date.now() }));
  }

  private loadFromLocalStorage(namespace: string, itemId: string): any {
    const key = `unified_${namespace}_${itemId}`;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private loadAllFromLocalStorage(namespace: string): Record<string, any> {
    const prefix = `unified_${namespace}_`;
    const result: Record<string, any> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        const itemId = key.substring(prefix.length);
        const data = localStorage.getItem(key);
        if (data) {
          result[itemId] = JSON.parse(data);
        }
      }
    }
    
    return result;
  }

  private deleteFromLocalStorage(namespace: string, itemId: string): void {
    const key = `unified_${namespace}_${itemId}`;
    localStorage.removeItem(key);
  }

  // === Firebase Implementation ===

  private async saveToFirebase(config: StorageConfig, itemId: string, data: any): Promise<void> {
    if (!this.userId) return;
    
    const docRef = doc(db, 'users', this.userId, config.firebaseCollection, itemId);
    await setDoc(docRef, {
      ...data,
      _syncedAt: Timestamp.now(),
      _userId: this.userId
    }, { merge: true });
  }

  private async loadFromFirebase(config: StorageConfig, itemId: string): Promise<any> {
    if (!this.userId) return null;
    
    try {
      const docRef = doc(db, 'users', this.userId, config.firebaseCollection, itemId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error(`Failed to load from Firebase: ${error}`);
      return null;
    }
  }

  private async loadAllFromFirebase(config: StorageConfig): Promise<Record<string, any>> {
    if (!this.userId) return {};
    
    try {
      const collectionRef = collection(db, 'users', this.userId, config.firebaseCollection);
      const snapshot = await getDocs(collectionRef);
      
      const result: Record<string, any> = {};
      snapshot.forEach(doc => {
        result[doc.id] = doc.data();
      });
      
      return result;
    } catch (error) {
      console.error(`Failed to load all from Firebase: ${error}`);
      return {};
    }
  }

  private async deleteFromFirebase(config: StorageConfig, itemId: string): Promise<void> {
    if (!this.userId) return;
    
    const docRef = doc(db, 'users', this.userId, config.firebaseCollection, itemId);
    await setDoc(docRef, { _deleted: true, _deletedAt: Timestamp.now() }, { merge: true });
  }

  // === Sync Management ===

  private async initializeSync(): Promise<void> {
    // Set up realtime listeners for realtime sync configs
    for (const [configKey, config] of Object.entries(STORAGE_CONFIG)) {
      if (config.syncStrategy === 'realtime') {
        await this.setupRealtimeSync(configKey, config);
      } else if (config.syncStrategy === 'periodic') {
        this.setupPeriodicSync(configKey, config);
      }
    }
  }

  private async setupRealtimeSync(configKey: string, config: StorageConfig): Promise<void> {
    if (!this.userId) return;
    
    const collectionRef = collection(db, 'users', this.userId, config.firebaseCollection);
    
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const data = change.doc.data();
          // Only update local if cloud is newer
          const localData = await this.loadLocal(config, change.doc.id);
          if (!localData || !localData._localUpdate || 
              (data._syncedAt?.toMillis() > localData._localUpdate)) {
            await this.saveLocal(config, change.doc.id, data);
          }
        }
      });
    });
    
    this.listeners.set(configKey, unsubscribe);
  }

  private setupPeriodicSync(configKey: string, config: StorageConfig): void {
    if (!config.syncInterval) return;
    
    const timer = setInterval(async () => {
      await this.syncPendingItems(configKey, config);
    }, config.syncInterval);
    
    this.syncTimers.set(configKey, timer);
  }

  private queueForSync(configKey: string, itemId: string): void {
    if (!this.pendingSyncs.has(configKey)) {
      this.pendingSyncs.set(configKey, new Set());
    }
    this.pendingSyncs.get(configKey)!.add(itemId);
  }

  private async syncPendingItems(configKey: string, config: StorageConfig): Promise<void> {
    const pending = this.pendingSyncs.get(configKey);
    if (!pending || pending.size === 0) return;
    
    const batch = writeBatch(db);
    
    for (const itemId of pending) {
      const data = await this.loadLocal(config, itemId);
      if (data && this.userId) {
        const docRef = doc(db, 'users', this.userId, config.firebaseCollection, itemId);
        batch.set(docRef, {
          ...data,
          _syncedAt: Timestamp.now(),
          _userId: this.userId
        }, { merge: true });
      }
    }
    
    await batch.commit();
    pending.clear();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Close IndexedDB connections
    this.dbCache.forEach(db => db.close());
    this.dbCache.clear();
    
    // Unsubscribe from listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear timers
    this.syncTimers.forEach(timer => clearInterval(timer));
    this.syncTimers.clear();
  }
}

// Singleton instance
let instance: UnifiedStorageLayer | null = null;

export function getUnifiedStorage(): UnifiedStorageLayer {
  if (!instance) {
    instance = new UnifiedStorageLayer();
  }
  return instance;
}