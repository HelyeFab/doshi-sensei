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

export interface SyncResult {
  success: boolean;
  error?: string;
  synced?: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime?: Date;
  isSyncing: boolean;
  hasChanges: boolean;
}

export class CloudSync {
  private static syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    isSyncing: false,
    hasChanges: false
  };

  private static listeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Check if user can sync (authenticated + paid subscription only)
   */
  static canSync(user: User | null, subscriptionStatus?: string, subscriptionPlan?: string): boolean {
    if (!user) return false;
    return subscriptionStatus === 'active' && (subscriptionPlan === 'monthly' || subscriptionPlan === 'yearly');
  }

  /**
   * Upload data to Firestore with timeout
   */
  static async uploadData<T>(
    user: User,
    collection: string,
    documentId: string,
    data: T,
    timeoutMs: number = 15000
  ): Promise<SyncResult> {
    try {
      console.log('🚀 CloudSync.uploadData started:', {
        userUID: user.uid,
        userEmail: user.email,
        collection,
        documentId,
        dataKeys: Object.keys(data as any),
        timeout: timeoutMs
      });

      this.setSyncStatus({ isSyncing: true });

      const docRef = doc(db, 'users', user.uid, collection, documentId);
      console.log('📍 Firestore document path:', docRef.path);

      const syncData = {
        ...data,
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      };

      console.log('📦 Data to upload:', {
        originalDataSize: JSON.stringify(data).length,
        syncDataKeys: Object.keys(syncData),
        hasUpdatedAt: 'updatedAt' in syncData,
        hasSyncedAt: 'syncedAt' in syncData
      });

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      // Race between upload and timeout
      console.log('⬆️ Starting Firestore upload...');
      await Promise.race([
        setDoc(docRef, syncData, { merge: true }),
        timeoutPromise
      ]);

      console.log('✅ Firestore upload completed successfully!');

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
    // If no cloud data, use local
    if (!cloudData) return 'local';

    // If no local data, use cloud
    if (!localData) return 'cloud';

    // Compare timestamps - cloud wins if newer
    const localTime = localData.updatedAt?.toDate?.() || new Date(0);
    const cloudTime = cloudData.updatedAt?.toDate?.() || new Date(0);

    return cloudTime > localTime ? 'cloud' : 'local';
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
   * Network status monitoring
   */
  static initNetworkMonitoring(): void {
    const updateOnlineStatus = () => {
      this.setSyncStatus({ isOnline: navigator.onLine });
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }
}

export default CloudSync;
