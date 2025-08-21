import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { safeNavigator, runInBrowser } from './browserCheck';

export interface SyncResult {
  success: boolean;
  error?: string;
  synced?: boolean;
  queued?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime?: Date;
  isSyncing: boolean;
  hasChanges: boolean;
}

export class CloudSync {
  private static syncStatus: SyncStatus = {
    isOnline: safeNavigator?.onLine ?? true,
    isSyncing: false,
    hasChanges: false
  };

  private static listeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Check if user can sync (authenticated + paid subscription only)
   */
  static canSync(user: User | null, subscriptionStatus?: string): boolean {
    if (!user) return false;
    return subscriptionStatus === 'active';
  }

  /**
   * Upload data to Firestore with timeout
   */
  static async uploadData<T>(
    user: User,
    collection: string,
    documentId: string,
    data: T,
    timeoutMs: number = 15000,
    useQueue: boolean = true
  ): Promise<SyncResult> {
    try {
      // If offline and queue enabled, add to queue
      if (safeNavigator && !safeNavigator.onLine && useQueue) {
        const { syncQueue } = await import('./syncQueue');
        const operationId = syncQueue.addOperation({
          type: 'upload',
          collection,
          documentId,
          data,
          userId: user.uid,
          priority: 'medium',
          maxRetries: 3
        });
        
        return { 
          success: true, 
          synced: false,
          error: `Queued for sync when online (ID: ${operationId})`
        };
      }

      this.setSyncStatus({ isSyncing: true });

      const docRef = doc(db, 'users', user.uid, collection, documentId);

      const syncData = {
        ...data,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      };

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      // Race between upload and timeout
      await Promise.race([
        setDoc(docRef, syncData, { merge: true }),
        timeoutPromise
      ]);

      this.setSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date(),
        hasChanges: false
      });

      return { success: true, synced: true };
    } catch (error) {
      console.error('❌ CloudSync upload failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        userUID: user.uid,
        collection,
        documentId
      });

      this.setSyncStatus({ isSyncing: false });
      
      // If using queue and it's a recoverable error, queue for retry
      if (useQueue && this.isRecoverableError(error)) {
        try {
          const { syncQueue } = await import('./syncQueue');
          const operationId = syncQueue.addOperation({
            type: 'upload',
            collection,
            documentId,
            data,
            userId: user.uid,
            priority: 'high', // Failed operations get high priority
            maxRetries: 5 // More retries for failed operations
          });
          
          return {
            success: false,
            synced: false,
            error: `Upload failed, queued for retry (ID: ${operationId}): ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        } catch (queueError) {
          console.error('Failed to queue retry operation:', queueError);
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Download data from Firestore
   */
  static async downloadData<T>(
    user: User,
    collection: string,
    documentId: string
  ): Promise<{ data: T | null; result: SyncResult }> {
    try {
      this.setSyncStatus({ isSyncing: true });

      const docRef = doc(db, 'users', user.uid, collection, documentId);
      const docSnap = await getDoc(docRef);

      this.setSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date()
      });

      if (docSnap.exists()) {
        const data = docSnap.data() as T;
        return {
          data,
          result: { success: true, synced: true }
        };
      } else {
        return {
          data: null,
          result: { success: true, synced: false }
        };
      }
    } catch (error) {
      console.error('Download failed:', error);
      this.setSyncStatus({ isSyncing: false });
      return {
        data: null,
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        }
      };
    }
  }

  /**
   * Download all documents from a collection
   */
  static async downloadCollection<T>(
    user: User,
    collectionName: string
  ): Promise<{ data: T[]; result: SyncResult }> {
    try {
      this.setSyncStatus({ isSyncing: true });

      const collectionRef = collection(db, 'users', user.uid, collectionName);
      const querySnapshot = await getDocs(collectionRef);

      const data: T[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as T);
      });

      this.setSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date()
      });

      return {
        data,
        result: { success: true, synced: true }
      };
    } catch (error) {
      console.error('Collection download failed:', error);
      this.setSyncStatus({ isSyncing: false });
      return {
        data: [],
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Collection download failed'
        }
      };
    }
  }

  /**
   * Delete data from Firestore
   */
  static async deleteData(
    user: User,
    collection: string,
    documentId: string
  ): Promise<SyncResult> {
    try {
      this.setSyncStatus({ isSyncing: true });

      const docRef = doc(db, 'users', user.uid, collection, documentId);
      await deleteDoc(docRef);

      this.setSyncStatus({
        isSyncing: false,
        lastSyncTime: new Date(),
        hasChanges: false
      });

      return { success: true, synced: true };
    } catch (error) {
      console.error('Delete failed:', error);
      this.setSyncStatus({ isSyncing: false });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }

  /**
   * Resolve conflicts between local and cloud data
   */
  static resolveConflict<T extends { updatedAt?: any }>(
    localData: T,
    cloudData: T
  ): 'local' | 'cloud' | 'merge' {
    const debugTimestamp = new Date().toISOString();
    console.log(`⚔️ [${debugTimestamp}] CloudSync.resolveConflict() called`);

    // If no cloud data, use local
    if (!cloudData) {
      console.log(`⚔️ [${debugTimestamp}] Resolution: local (no cloud data)`);
      return 'local';
    }

    // If no local data, use cloud
    if (!localData) {
      console.log(`⚔️ [${debugTimestamp}] Resolution: cloud (no local data)`);
      return 'cloud';
    }

    // Compare timestamps - cloud wins if newer
    const localTime = localData.updatedAt?.toDate?.() || new Date(0);
    const cloudTime = cloudData.updatedAt?.toDate?.() || new Date(0);
    
    console.log(`⚔️ [${debugTimestamp}] Local time:`, localTime.toISOString());
    console.log(`⚔️ [${debugTimestamp}] Cloud time:`, cloudTime.toISOString());

    const resolution = cloudTime > localTime ? 'cloud' : 'local';
    console.log(`⚔️ [${debugTimestamp}] Resolution: ${resolution} (based on timestamp comparison)`);
    return resolution;
  }

  /**
   * Sync status management
   */
  static setSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyListeners();
  }

  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  static addStatusListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener);
  }

  static removeStatusListener(listener: (status: SyncStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.syncStatus));
  }

  /**
   * Check if an error is recoverable and should be retried
   */
  private static isRecoverableError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString().toLowerCase();
    
    // Network-related errors that are recoverable
    const recoverableErrors = [
      'network error',
      'timeout',
      'connection',
      'unavailable',
      'failed to fetch',
      'fetch failed',
      'offline',
      'network request failed',
      'load failed',
      'cors',
      'temporarily overloaded',
      'rate limit',
      'quota exceeded'
    ];
    
    // Firebase-specific recoverable errors
    const firebaseRecoverableErrors = [
      'failed-precondition',
      'aborted',
      'internal',
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted'
    ];
    
    return recoverableErrors.some(pattern => errorMessage.includes(pattern)) ||
           firebaseRecoverableErrors.some(code => errorMessage.includes(code)) ||
           // HTTP status codes that are recoverable
           /5\d\d/.test(errorMessage) || // 5xx server errors
           errorMessage.includes('429'); // Rate limiting
  }

  /**
   * Network status monitoring
   */
  static initNetworkMonitoring(): void {
    runInBrowser(() => {
      const updateOnlineStatus = () => {
        this.setSyncStatus({ isOnline: safeNavigator?.onLine ?? true });
        
        // Try to process queue when going online
        if (safeNavigator?.onLine) {
          this.processOfflineQueue();
        }
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
    });
  }

  /**
   * Process offline queue when coming back online
   */
  private static async processOfflineQueue(): Promise<void> {
    try {
      const { syncQueue } = await import('./syncQueue');
      await syncQueue.processQueue();
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }
}

export default CloudSync;