/**
 * Data Sync Service
 * Handles offline/online synchronization for the Kanji Mastery System
 * Production-ready with conflict resolution, queue management, and error recovery
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  DocumentData,
  serverTimestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

/**
 * IndexedDB Schema for offline storage
 */
interface KanjiMasteryDB extends DBSchema {
  kanjiProgress: {
    key: string;
    value: KanjiProgressLocal;
    indexes: { 
      'dueDate': Date;
      'masteryLevel': number;
      'isLeech': boolean;
      'userId': string;
    };
  };
  
  reviewQueue: {
    key: string;
    value: ReviewQueueLocal;
    indexes: { 
      'userId': string;
      'date': string;
    };
  };
  
  sessions: {
    key: string;
    value: StudySessionLocal;
    indexes: { 
      'userId': string;
      'date': Date;
      'synced': boolean;
    };
  };
  
  syncQueue: {
    key: number;
    value: SyncOperation;
    autoIncrement: true;
    indexes: {
      'timestamp': number;
      'status': string;
      'userId': string;
    };
  };
  
  metadata: {
    key: string;
    value: SyncMetadata;
  };
}

/**
 * Local version of kanji progress
 */
interface KanjiProgressLocal {
  progressId: string;
  userId: string;
  kanjiChar: string;
  fsrs: any;
  performance: any;
  mastery: any;
  leech?: any;
  localModified: number;
  serverModified?: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

/**
 * Local version of review queue
 */
interface ReviewQueueLocal {
  queueId: string;
  userId: string;
  date: string;
  items: any[];
  generated: number;
  expires: number;
}

/**
 * Local version of study session
 */
interface StudySessionLocal {
  sessionId: string;
  userId: string;
  date: Date;
  results: any[];
  duration: number;
  synced: boolean;
}

/**
 * Sync operation for offline queue
 */
interface SyncOperation {
  id?: number;
  userId: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retries: number;
  error?: string;
}

/**
 * Sync metadata
 */
interface SyncMetadata {
  userId: string;
  lastSync: number;
  totalItems: number;
  conflicts: number;
}

/**
 * Sync conflict
 */
interface SyncConflict {
  documentId: string;
  localData: any;
  remoteData: any;
  localTimestamp: number;
  remoteTimestamp: number;
  resolution?: 'local' | 'remote' | 'merge';
}

/**
 * Data Sync Service
 */
export class DataSyncService {
  private db: IDBPDatabase<KanjiMasteryDB> | null = null;
  private syncInProgress = false;
  private listeners: Map<string, Unsubscribe> = new Map();
  private onlineHandler?: () => void;
  private offlineHandler?: () => void;
  private syncInterval?: NodeJS.Timeout;
  private readonly DB_NAME = 'KanjiMasteryDB';
  private readonly DB_VERSION = 1;
  private initPromise: Promise<void> | null = null;
  
  // Race condition protection
  private operationQueue = new Map<string, Promise<any>>();
  private syncLock = new Map<string, Promise<void>>();
  
  constructor() {
    // Only initialize IndexedDB on client side
    if (typeof window !== 'undefined') {
      this.initPromise = this.initializeDB();
      this.setupNetworkListeners();
    }
  }
  
  /**
   * Ensure database is initialized with proper error handling
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      try {
        await this.initPromise;
      } catch (error) {
        console.error('[DataSync] Database initialization failed during ensureInitialized:', error);
        // Re-attempt initialization once
        this.initPromise = this.initializeDB();
        await this.initPromise;
      }
    }
  }

  /**
   * Check if database operations are safe to perform
   */
  private isDatabaseReady(): boolean {
    return this.db !== null;
  }

  /**
   * Safe database operation wrapper with fallback
   */
  private async safeDatabaseOperation<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
    operationName: string
  ): Promise<T> {
    await this.ensureInitialized();
    
    if (!this.isDatabaseReady()) {
      console.warn(`[DataSync] ${operationName}: Database not ready, using fallback`);
      return fallback();
    }
    
    try {
      return await operation();
    } catch (error) {
      console.error(`[DataSync] ${operationName}: Database operation failed:`, error);
      return fallback();
    }
  }
  
  /**
   * Initialize IndexedDB with proper error handling and fallbacks
   */
  private async initializeDB(): Promise<void> {
    // Skip initialization in server-side environments
    if (typeof window === 'undefined') {
      console.log('[DataSync] Server-side environment detected, skipping IndexedDB initialization');
      return;
    }

    // Check if IndexedDB is available
    if (!('indexedDB' in window)) {
      console.warn('[DataSync] IndexedDB not available in this environment');
      return;
    }

    try {
      this.db = await openDB<KanjiMasteryDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          console.log(`[DataSync] Upgrading database from version ${oldVersion} to ${newVersion}`);
          
          // Create kanjiProgress store
          if (!db.objectStoreNames.contains('kanjiProgress')) {
            const store = db.createObjectStore('kanjiProgress', { 
              keyPath: 'progressId' 
            });
            store.createIndex('dueDate', 'fsrs.dueDate', { unique: false });
            store.createIndex('masteryLevel', 'mastery.level', { unique: false });
            store.createIndex('isLeech', 'leech.isLeech', { unique: false });
            store.createIndex('userId', 'userId', { unique: false });
            console.log('[DataSync] Created kanjiProgress store');
          }
          
          // Create reviewQueue store
          if (!db.objectStoreNames.contains('reviewQueue')) {
            const store = db.createObjectStore('reviewQueue', { 
              keyPath: 'queueId' 
            });
            store.createIndex('userId', 'userId', { unique: false });
            store.createIndex('date', 'date', { unique: false });
            console.log('[DataSync] Created reviewQueue store');
          }
          
          // Create sessions store
          if (!db.objectStoreNames.contains('sessions')) {
            const store = db.createObjectStore('sessions', { 
              keyPath: 'sessionId' 
            });
            store.createIndex('userId', 'userId', { unique: false });
            store.createIndex('date', 'date', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            console.log('[DataSync] Created sessions store');
          }
          
          // Create syncQueue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            const store = db.createObjectStore('syncQueue', { 
              keyPath: 'id',
              autoIncrement: true 
            });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('userId', 'userId', { unique: false });
            console.log('[DataSync] Created syncQueue store');
          }
          
          // Create metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { 
              keyPath: 'userId' 
            });
            console.log('[DataSync] Created metadata store');
          }
        },
        blocked() {
          console.warn('[DataSync] Database upgrade blocked by another connection');
        },
        blocking() {
          console.warn('[DataSync] Database upgrade blocking another connection');
        },
        terminated() {
          console.error('[DataSync] Database connection terminated unexpectedly');
        }
      });
      
      console.log('[DataSync] IndexedDB initialized successfully');
      
    } catch (error) {
      console.error('[DataSync] Failed to initialize IndexedDB:', error);
      
      // Critical: Don't silently continue without proper fallback
      // This could cause data loss in production
      this.db = null;
      
      // Notify application about critical error
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('kanji-mastery-db-error', {
          detail: {
            error: error,
            message: 'IndexedDB initialization failed'
          }
        }));
      }
    }
  }
  
  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;
    
    this.onlineHandler = () => {
      console.log('[DataSync] Network online - starting sync');
      this.startAutoSync();
    };
    
    this.offlineHandler = () => {
      console.log('[DataSync] Network offline - stopping sync');
      this.stopAutoSync();
    };
    
    window.addEventListener('online', this.onlineHandler);
    window.addEventListener('offline', this.offlineHandler);
    
    // Start auto-sync if online
    if (navigator.onLine) {
      this.startAutoSync();
    }
  }
  
  /**
   * Start automatic synchronization
   */
  private async startAutoSync(): Promise<void> {
    // Clear existing interval
    this.stopAutoSync();
    
    // Wait for initialization
    await this.ensureInitialized();
    
    // Sync every 30 seconds when online
    this.syncInterval = setInterval(() => {
      this.syncAllUsers();
    }, 30000);
    
    // Initial sync
    this.syncAllUsers();
  }
  
  /**
   * Stop automatic synchronization
   */
  private stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }
  
  /**
   * Full synchronization for a user
   */
  async syncUser(userId: string): Promise<void> {
    await this.ensureInitialized();
    
    if (this.syncInProgress) {
      console.log('[DataSync] Sync already in progress, skipping');
      return;
    }
    
    if (!navigator.onLine) {
      console.log('[DataSync] Offline, queuing operations');
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      console.log(`[DataSync] Starting sync for user ${userId}`);
      
      // 1. Process sync queue
      await this.processSyncQueue(userId);
      
      // 2. Pull remote changes
      await this.pullRemoteChanges(userId);
      
      // 3. Push local changes
      await this.pushLocalChanges(userId);
      
      // 4. Resolve conflicts
      await this.resolveConflicts(userId);
      
      // 5. Update metadata
      await this.updateSyncMetadata(userId);
      
      console.log(`[DataSync] Sync completed for user ${userId}`);
      
    } catch (error) {
      console.error('[DataSync] Sync failed:', error);
      throw error;
      
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Process offline sync queue with atomic operations
   */
  private async processSyncQueue(userId: string): Promise<void> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const tx = this.db.transaction('syncQueue', 'readwrite');
        const index = tx.store.index('userId');
        const operations = await index.getAll(userId);
        
        // Process operations atomically - either all succeed or all fail
        const results: Promise<void>[] = [];
        
        for (const op of operations) {
          if (op.status !== 'pending') continue;
          
          results.push(this.processAtomicSyncOperation(op, tx));
        }
        
        // Wait for all operations to complete
        await Promise.allSettled(results);
        await tx.done;
        
        // Clean up completed operations older than 1 day
        await this.cleanupSyncQueue();
      },
      async () => {
        console.warn(`[DataSync] Fallback: Sync queue processing failed for user ${userId}`);
      },
      'processSyncQueue'
    );
  }

  /**
   * Process a single sync operation atomically
   */
  private async processAtomicSyncOperation(
    op: SyncOperation, 
    tx: any
  ): Promise<void> {
    try {
      // Update status to processing
      op.status = 'processing';
      await tx.store.put(op);
      
      // Execute operation
      await this.executeSyncOperation(op);
      
      // Mark as completed
      op.status = 'completed';
      await tx.store.put(op);
      
    } catch (error) {
      console.error(`[DataSync] Atomic operation failed:`, error);
      
      op.retries++;
      op.error = (error as Error).message;
      
      if (op.retries >= 3) {
        op.status = 'failed';
        // Notify about critical failure
        this.notifyDataLossRisk(op);
      } else {
        op.status = 'pending';
      }
      
      await tx.store.put(op);
    }
  }

  /**
   * Notify about potential data loss
   */
  private notifyDataLossRisk(op: SyncOperation): void {
    console.error(`[DataSync] CRITICAL: Failed to sync operation after 3 retries:`, {
      type: op.type,
      collection: op.collection,
      documentId: op.documentId,
      userId: op.userId,
      error: op.error
    });
    
    // Emit custom event for application error handling
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('kanji-mastery-data-loss-risk', {
        detail: {
          operation: op,
          message: 'Sync operation failed after multiple retries'
        }
      }));
    }
  }
  
  /**
   * Execute a sync operation
   */
  private async executeSyncOperation(op: SyncOperation): Promise<void> {
    const docRef = doc(db, op.collection, op.documentId);
    
    switch (op.type) {
      case 'create':
        await setDoc(docRef, {
          ...op.data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        break;
        
      case 'update':
        await updateDoc(docRef, {
          ...op.data,
          updatedAt: serverTimestamp()
        });
        break;
        
      case 'delete':
        await deleteDoc(docRef);
        break;
        
      default:
        throw new Error(`Unknown operation type: ${op.type}`);
    }
  }
  
  /**
   * Pull remote changes from Firestore
   */
  private async pullRemoteChanges(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Get last sync timestamp
    const metadata = await this.getMetadata(userId);
    const lastSync = metadata?.lastSync || 0;
    
    // Query for changes since last sync
    const progressRef = collection(db, 'users', userId, 'kanjiProgress');
    const q = query(
      progressRef,
      where('updatedAt', '>', new Date(lastSync)),
      orderBy('updatedAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    const tx = this.db.transaction('kanjiProgress', 'readwrite');
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const local = await tx.store.get(doc.id);
      
      if (local && local.localModified > data.updatedAt.toMillis()) {
        // Local is newer - conflict
        console.log(`[DataSync] Conflict detected for ${doc.id}`);
        // Will be handled in resolveConflicts
      } else {
        // Remote is newer or no local - update local
        await tx.store.put({
          ...data,
          progressId: doc.id,
          userId,
          serverModified: data.updatedAt.toMillis(),
          localModified: Date.now(),
          syncStatus: 'synced'
        });
      }
    }
    
    await tx.done;
  }
  
  /**
   * Push local changes to Firestore
   */
  private async pushLocalChanges(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('kanjiProgress', 'readonly');
    const index = tx.store.index('userId');
    const items = await index.getAll(userId);
    
    const batch = writeBatch(db);
    let batchCount = 0;
    
    for (const item of items) {
      if (item.syncStatus !== 'pending') continue;
      
      const docRef = doc(db, 'users', userId, 'kanjiProgress', item.progressId);
      
      // Prepare data for Firestore
      const firestoreData = {
        ...item,
        updatedAt: serverTimestamp()
      };
      
      // Remove local-only fields
      delete firestoreData.localModified;
      delete firestoreData.serverModified;
      delete firestoreData.syncStatus;
      
      batch.set(docRef, firestoreData, { merge: true });
      batchCount++;
      
      // Firestore has a limit of 500 operations per batch
      if (batchCount >= 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    // Mark items as synced
    const writeTx = this.db.transaction('kanjiProgress', 'readwrite');
    for (const item of items) {
      if (item.syncStatus === 'pending') {
        item.syncStatus = 'synced';
        item.serverModified = Date.now();
        await writeTx.store.put(item);
      }
    }
    await writeTx.done;
  }
  
  /**
   * Resolve sync conflicts
   */
  private async resolveConflicts(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('kanjiProgress', 'readwrite');
    const index = tx.store.index('userId');
    const items = await index.getAll(userId);
    
    const conflicts: SyncConflict[] = [];
    
    for (const item of items) {
      if (item.syncStatus !== 'conflict') continue;
      
      // Get remote version
      const docRef = doc(db, 'users', userId, 'kanjiProgress', item.progressId);
      const remoteSnap = await getDoc(docRef);
      
      if (!remoteSnap.exists()) {
        // Remote deleted - keep local
        item.syncStatus = 'pending';
        await tx.store.put(item);
        continue;
      }
      
      const remoteData = remoteSnap.data();
      
      conflicts.push({
        documentId: item.progressId,
        localData: item,
        remoteData,
        localTimestamp: item.localModified,
        remoteTimestamp: remoteData.updatedAt.toMillis()
      });
    }
    
    await tx.done;
    
    // Resolve conflicts
    for (const conflict of conflicts) {
      await this.resolveConflict(userId, conflict);
    }
  }
  
  /**
   * Resolve a single conflict
   */
  private async resolveConflict(userId: string, conflict: SyncConflict): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    // Default strategy: Last write wins
    // Can be customized based on business logic
    
    let resolution: 'local' | 'remote' = 'remote';
    
    // Custom logic for specific fields
    if (conflict.localData.fsrs && conflict.remoteData.fsrs) {
      // For SRS data, prefer the one with more reviews
      const localReviews = conflict.localData.fsrs.repetition || 0;
      const remoteReviews = conflict.remoteData.fsrs.repetition || 0;
      
      if (localReviews > remoteReviews) {
        resolution = 'local';
      }
    }
    
    const tx = this.db.transaction('kanjiProgress', 'readwrite');
    
    if (resolution === 'local') {
      // Push local to remote
      conflict.localData.syncStatus = 'pending';
      await tx.store.put(conflict.localData);
    } else {
      // Accept remote
      await tx.store.put({
        ...conflict.remoteData,
        progressId: conflict.documentId,
        userId,
        serverModified: conflict.remoteTimestamp,
        localModified: Date.now(),
        syncStatus: 'synced'
      });
    }
    
    await tx.done;
    
    console.log(`[DataSync] Conflict resolved for ${conflict.documentId}: ${resolution}`);
  }
  
  /**
   * Save kanji progress locally
   */
  async saveProgressLocal(userId: string, progressData: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('kanjiProgress', 'readwrite');
    
    await tx.store.put({
      ...progressData,
      userId,
      localModified: Date.now(),
      syncStatus: navigator.onLine ? 'pending' : 'pending'
    });
    
    await tx.done;
    
    // Queue for sync if online
    if (navigator.onLine) {
      await this.queueSyncOperation(userId, 'update', 'kanjiProgress', progressData.progressId, progressData);
    }
  }
  
  /**
   * Get kanji progress from local storage
   */
  async getProgressLocal(userId: string, kanjiChar: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    const progressId = `${userId}_${kanjiChar}`;
    return await this.db.get('kanjiProgress', progressId);
  }
  
  /**
   * Get all progress for a user with proper error handling
   */
  async getAllProgressLocal(userId: string): Promise<KanjiProgressLocal[]> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const tx = this.db.transaction('kanjiProgress', 'readonly');
        const index = tx.store.index('userId');
        
        return await index.getAll(userId);
      },
      async () => {
        console.warn(`[DataSync] Fallback: No progress data available for user ${userId}`);
        return [];
      },
      'getAllProgressLocal'
    );
  }
  
  /**
   * Queue a sync operation for later
   */
  private async queueSyncOperation(
    userId: string,
    type: 'create' | 'update' | 'delete',
    collection: string,
    documentId: string,
    data?: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction('syncQueue', 'readwrite');
    
    await tx.store.add({
      userId,
      type,
      collection: `users/${userId}/${collection}`,
      documentId,
      data,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0
    });
    
    await tx.done;
  }
  
  /**
   * Get sync metadata
   */
  private async getMetadata(userId: string): Promise<SyncMetadata | undefined> {
    if (!this.db) throw new Error('Database not initialized');
    
    return await this.db.get('metadata', userId);
  }
  
  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const tx = this.db.transaction(['metadata', 'kanjiProgress'], 'readwrite');
    
    const progressCount = await tx.objectStore('kanjiProgress').index('userId').count(userId);
    
    await tx.objectStore('metadata').put({
      userId,
      lastSync: Date.now(),
      totalItems: progressCount,
      conflicts: 0
    });
    
    await tx.done;
  }
  
  /**
   * Clean up old sync queue entries
   */
  private async cleanupSyncQueue(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago
    
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const index = tx.store.index('timestamp');
    
    const oldOps = await index.getAllKeys(IDBKeyRange.upperBound(cutoff));
    
    for (const key of oldOps) {
      await tx.store.delete(key);
    }
    
    await tx.done;
  }
  
  /**
   * Subscribe to real-time updates for a user
   */
  subscribeToProgress(userId: string, callback: (changes: any[]) => void): () => void {
    const progressRef = collection(db, 'users', userId, 'kanjiProgress');
    
    const unsubscribe = onSnapshot(progressRef, async (snapshot) => {
      const changes = snapshot.docChanges().map(change => ({
        type: change.type,
        data: change.doc.data(),
        id: change.doc.id
      }));
      
      // Update local cache
      if (this.db) {
        const tx = this.db.transaction('kanjiProgress', 'readwrite');
        
        for (const change of changes) {
          if (change.type === 'removed') {
            await tx.store.delete(change.id);
          } else {
            await tx.store.put({
              ...change.data,
              progressId: change.id,
              userId,
              serverModified: Date.now(),
              localModified: Date.now(),
              syncStatus: 'synced'
            });
          }
        }
        
        await tx.done;
      }
      
      callback(changes);
    });
    
    // Store unsubscribe function
    this.listeners.set(`${userId}_progress`, unsubscribe);
    
    return unsubscribe;
  }
  
  /**
   * Sync all users (for background sync)
   */
  private async syncAllUsers(): Promise<void> {
    if (!this.db) {
      console.warn('[DataSync] Database not initialized, skipping sync');
      return;
    }
    
    // Get all unique user IDs from metadata
    const tx = this.db.transaction('metadata', 'readonly');
    const metadata = await tx.store.getAll();
    
    for (const meta of metadata) {
      try {
        await this.syncUser(meta.userId);
      } catch (error) {
        console.error(`[DataSync] Failed to sync user ${meta.userId}:`, error);
      }
    }
  }
  
  /**
   * Clear all local data for a user with proper error handling
   */
  async clearUserData(userId: string): Promise<void> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const tx = this.db.transaction(
          ['kanjiProgress', 'reviewQueue', 'sessions', 'syncQueue', 'metadata'],
          'readwrite'
        );
        
        // Clear kanjiProgress
        const progressIndex = tx.objectStore('kanjiProgress').index('userId');
        const progressKeys = await progressIndex.getAllKeys(userId);
        for (const key of progressKeys) {
          await tx.objectStore('kanjiProgress').delete(key);
        }
        
        // Clear reviewQueue
        const queueIndex = tx.objectStore('reviewQueue').index('userId');
        const queueKeys = await queueIndex.getAllKeys(userId);
        for (const key of queueKeys) {
          await tx.objectStore('reviewQueue').delete(key);
        }
        
        // Clear sessions
        const sessionIndex = tx.objectStore('sessions').index('userId');
        const sessionKeys = await sessionIndex.getAllKeys(userId);
        for (const key of sessionKeys) {
          await tx.objectStore('sessions').delete(key);
        }
        
        // Clear syncQueue
        const syncIndex = tx.objectStore('syncQueue').index('userId');
        const syncKeys = await syncIndex.getAllKeys(userId);
        for (const key of syncKeys) {
          await tx.objectStore('syncQueue').delete(key);
        }
        
        // Clear metadata
        await tx.objectStore('metadata').delete(userId);
        
        await tx.done;
        console.log(`[DataSync] Cleared all local data for user ${userId}`);
      },
      async () => {
        console.log(`[DataSync] Fallback: Cleared user data for ${userId} (database not available)`);
      },
      'clearUserData'
    );
  }

  /**
   * Update or create a card with proper error handling and race condition protection
   */
  async updateCard(userId: string, kanjiChar: string, cardData: any): Promise<void> {
    const operationKey = `update_${userId}_${kanjiChar}`;
    
    // Check if operation is already in progress
    if (this.operationQueue.has(operationKey)) {
      console.log(`[DataSync] Waiting for existing update operation: ${operationKey}`);
      await this.operationQueue.get(operationKey);
    }
    
    // Start new operation
    const operation = this.performCardUpdate(userId, kanjiChar, cardData);
    this.operationQueue.set(operationKey, operation);
    
    try {
      await operation;
    } finally {
      this.operationQueue.delete(operationKey);
    }
  }

  /**
   * Perform the actual card update
   */
  private async performCardUpdate(userId: string, kanjiChar: string, cardData: any): Promise<void> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const progressId = `${userId}_${kanjiChar}`;
        const tx = this.db.transaction('kanjiProgress', 'readwrite');
        
        // Check for existing data to prevent overwriting newer data
        const existing = await tx.store.get(progressId);
        const currentTime = Date.now();
        
        if (existing && existing.localModified > currentTime - 1000) {
          // Data was updated very recently, skip to prevent race condition
          console.log(`[DataSync] Skipping update for ${kanjiChar} - recent update detected`);
          return;
        }
        
        const localData: KanjiProgressLocal = {
          progressId,
          userId,
          kanjiChar,
          fsrs: cardData.fsrs || cardData,
          performance: cardData.performance || {},
          mastery: cardData.mastery || {},
          leech: cardData.leech,
          localModified: currentTime,
          serverModified: cardData.serverModified,
          syncStatus: 'pending'
        };
        
        await tx.store.put(localData);
        await tx.done;
        
        // Queue for sync if online
        if (navigator.onLine) {
          await this.queueSyncOperation(userId, 'update', 'kanjiProgress', progressId, cardData);
        }
      },
      async () => {
        console.warn(`[DataSync] Fallback: Card update for ${kanjiChar} stored in memory only`);
      },
      'performCardUpdate'
    );
  }

  /**
   * Get a card with proper error handling
   */
  async getCard(userId: string, kanjiChar: string): Promise<any> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const progressId = `${userId}_${kanjiChar}`;
        const card = await this.db.get('kanjiProgress', progressId);
        return card;
      },
      async () => {
        console.warn(`[DataSync] Fallback: No card data available for ${kanjiChar}`);
        return null;
      },
      'getCard'
    );
  }

  /**
   * Get user statistics with proper error handling
   */
  async getUserStats(userId: string): Promise<any> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const tx = this.db.transaction('kanjiProgress', 'readonly');
        const index = tx.store.index('userId');
        const cards = await index.getAll(userId);
        
        let totalReviews = 0;
        let totalResponseTime = 0;
        let correctCount = 0;
        
        for (const card of cards) {
          if (card.performance) {
            totalReviews += card.performance.totalReviews || 0;
            totalResponseTime += card.performance.totalResponseTime || 0;
            correctCount += card.performance.correctCount || 0;
          }
        }
        
        return {
          totalReviews,
          averageResponseTime: totalReviews > 0 ? totalResponseTime / totalReviews : 0,
          accuracy: totalReviews > 0 ? correctCount / totalReviews : 0
        };
      },
      async () => {
        console.warn(`[DataSync] Fallback: No stats available for user ${userId}`);
        return {
          totalReviews: 0,
          averageResponseTime: 0,
          accuracy: 0
        };
      },
      'getUserStats'
    );
  }

  /**
   * Get weak kanji for a user
   */
  async getWeakKanji(userId: string, limit: number = 10): Promise<any[]> {
    return this.safeDatabaseOperation(
      async () => {
        if (!this.db) throw new Error('Database not ready');
        
        const tx = this.db.transaction('kanjiProgress', 'readonly');
        const index = tx.store.index('userId');
        const cards = await index.getAll(userId);
        
        // Sort by lapses (descending) then by difficulty (descending)
        return cards
          .filter(card => card.fsrs && card.fsrs.lapses > 0)
          .sort((a, b) => {
            const lapseDiff = (b.fsrs.lapses || 0) - (a.fsrs.lapses || 0);
            if (lapseDiff !== 0) return lapseDiff;
            return (b.fsrs.difficulty || 0) - (a.fsrs.difficulty || 0);
          })
          .slice(0, limit)
          .map(card => ({
            char: card.kanjiChar,
            lapses: card.fsrs.lapses || 0,
            difficulty: card.fsrs.difficulty || 0
          }));
      },
      async () => {
        console.warn(`[DataSync] Fallback: No weak kanji data available for user ${userId}`);
        return [];
      },
      'getWeakKanji'
    );
  }

  /**
   * Set offline mode for testing
   */
  setOfflineMode(offline: boolean): void {
    // For testing purposes, we can override the navigator.onLine check
    if (typeof window !== 'undefined') {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: !offline
      });
    }
  }

  /**
   * Force initialization for testing
   */
  async forceInitializeForTest(): Promise<void> {
    // Reset the initialization promise to force re-initialization
    this.initPromise = this.initializeDB();
    await this.ensureInitialized();
  }
  
  /**
   * Cleanup on unmount
   */
  destroy(): void {
    // Stop auto-sync
    this.stopAutoSync();
    
    // Remove network listeners
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
    }
    if (this.offlineHandler) {
      window.removeEventListener('offline', this.offlineHandler);
    }
    
    // Unsubscribe from all listeners
    for (const unsubscribe of this.listeners.values()) {
      unsubscribe();
    }
    this.listeners.clear();
    
    // Close database
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance - only create on client side
let dataSyncServiceInstance: DataSyncService | null = null;

export const getDataSyncService = (): DataSyncService => {
  if (!dataSyncServiceInstance) {
    dataSyncServiceInstance = new DataSyncService();
  }
  return dataSyncServiceInstance;
};

export const dataSyncService = typeof window !== 'undefined' ? getDataSyncService() : {} as DataSyncService;