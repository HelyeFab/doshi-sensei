import { db as firestore } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  Timestamp,
  writeBatch,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { SyncManifest, SyncError } from './types';
import { CachedResource } from '@/lib/cache/types';
import { syncLogger } from './utils/logger';

export class FirebaseSyncAdapter {
  private readonly SYNC_COLLECTION = 'userSync';
  private readonly BATCH_SIZE = 500; // Firestore batch limit

  /**
   * Check if we have connectivity to Firebase
   */
  async checkConnectivity(): Promise<boolean> {
    // Simply check browser's online status
    // Firebase will handle its own connection state internally
    return navigator.onLine;
  }

  /**
   * Get user's sync manifest from Firestore
   */
  async getUserManifest(userId: string): Promise<SyncManifest | null> {
    try {
      // Create the user sync document first if it doesn't exist
      const userSyncRef = doc(firestore, this.SYNC_COLLECTION, userId);
      await setDoc(userSyncRef, { 
        userId, 
        createdAt: Timestamp.now() 
      }, { merge: true });
      
      // Now get the manifest from subcollection
      const manifestRef = doc(firestore, this.SYNC_COLLECTION, userId, 'manifest', 'data');
      const manifestDoc = await getDoc(manifestRef);
      
      if (!manifestDoc.exists()) {

        return null;
      }

      const data = manifestDoc.data();

      return {
        userId: data.userId,
        lastSyncTimestamp: data.lastSyncTimestamp,
        resources: data.resources || {}
      };
    } catch (error: any) {
      console.error('[Sync] Error in getUserManifest:', error);
      
      // Handle permission denied errors gracefully
      if (error.code === 'permission-denied') {
        syncLogger.debug('Permission denied accessing sync manifest - user may not be premium');
        return null;
      }
      
      // For other errors, log but don't throw to avoid breaking the app

      return null;
    }
  }

  /**
   * Save user's sync manifest to Firestore
   */
  async saveUserManifest(userId: string, manifest: SyncManifest): Promise<void> {
    try {
      // Ensure user sync document exists
      const userSyncRef = doc(firestore, this.SYNC_COLLECTION, userId);
      await setDoc(userSyncRef, { 
        userId, 
        updatedAt: Timestamp.now() 
      }, { merge: true });
      
      // Save manifest in subcollection
      const manifestRef = doc(firestore, this.SYNC_COLLECTION, userId, 'manifest', 'data');
      await setDoc(manifestRef, {
        ...manifest,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving user manifest:', error);
      throw this.createSyncError(
        'MANIFEST_SAVE_ERROR',
        'Failed to save sync manifest',
        true
      );
    }
  }

  /**
   * Upload a resource to user's cloud storage
   */
  async uploadResource(userId: string, resource: CachedResource): Promise<void> {
    try {
      const resourceId = this.getResourceDocId(userId, resource.type, resource.id);
      const resourceRef = doc(firestore, this.SYNC_COLLECTION, userId, 'userResources', resourceId);
      
      await setDoc(resourceRef, {
        userId,
        resource: {
          ...resource,
          // Convert Date to Timestamp for Firestore
          metadata: {
            ...resource.metadata,
            cachedAt: Timestamp.fromMillis(resource.metadata.cachedAt),
            lastAccessed: Timestamp.fromMillis(resource.metadata.lastAccessed),
            expiresAt: Timestamp.fromMillis(resource.metadata.expiresAt)
          }
        },
        uploadedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error uploading resource:', error);
      throw this.createSyncError(
        'RESOURCE_UPLOAD_ERROR',
        `Failed to upload resource ${resource.id}`,
        true,
        resource.id
      );
    }
  }

  /**
   * Upload multiple resources in batches
   */
  async uploadResourcesBatch(userId: string, resources: CachedResource[]): Promise<void> {
    const batches = [];
    let currentBatch = writeBatch(firestore);
    let operationCount = 0;

    for (const resource of resources) {
      const resourceId = this.getResourceDocId(userId, resource.type, resource.id);
      const resourceRef = doc(firestore, this.SYNC_COLLECTION, userId, 'userResources', resourceId);
      
      currentBatch.set(resourceRef, {
        userId,
        resource: {
          ...resource,
          metadata: {
            ...resource.metadata,
            cachedAt: Timestamp.fromMillis(resource.metadata.cachedAt),
            lastAccessed: Timestamp.fromMillis(resource.metadata.lastAccessed),
            expiresAt: Timestamp.fromMillis(resource.metadata.expiresAt)
          }
        },
        uploadedAt: Timestamp.now()
      });

      operationCount++;

      if (operationCount >= this.BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = writeBatch(firestore);
        operationCount = 0;
      }
    }

    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Execute all batches
    await Promise.all(batches.map(batch => batch.commit()));
  }

  /**
   * Download a resource from user's cloud storage
   */
  async downloadResource(userId: string, resourceId: string): Promise<CachedResource | null> {
    try {
      // Try to find the resource with any type prefix
      const resourceTypes = ['article', 'story', 'audio', 'kanji', 'verb', 'adjective'];
      
      for (const type of resourceTypes) {
        const docId = this.getResourceDocId(userId, type as any, resourceId);
        const resourceRef = doc(firestore, this.SYNC_COLLECTION, userId, 'userResources', docId);
        const resourceDoc = await getDoc(resourceRef);
        
        if (resourceDoc.exists()) {
          const data = resourceDoc.data();
          const resource = data.resource;
          
          // Convert Timestamps back to milliseconds
          return {
            ...resource,
            metadata: {
              ...resource.metadata,
              cachedAt: resource.metadata.cachedAt.toMillis(),
              lastAccessed: resource.metadata.lastAccessed.toMillis(),
              expiresAt: resource.metadata.expiresAt.toMillis()
            }
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error downloading resource:', error);
      throw this.createSyncError(
        'RESOURCE_DOWNLOAD_ERROR',
        `Failed to download resource ${resourceId}`,
        true,
        resourceId
      );
    }
  }

  /**
   * Download all user resources
   */
  async downloadAllUserResources(userId: string): Promise<CachedResource[]> {
    try {
      const q = query(
        collection(firestore, this.SYNC_COLLECTION, userId, 'userResources'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const resources: CachedResource[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const resource = data.resource;
        
        resources.push({
          ...resource,
          metadata: {
            ...resource.metadata,
            cachedAt: resource.metadata.cachedAt.toMillis(),
            lastAccessed: resource.metadata.lastAccessed.toMillis(),
            expiresAt: resource.metadata.expiresAt.toMillis()
          }
        });
      });
      
      return resources;
    } catch (error) {
      console.error('Error downloading all resources:', error);
      throw this.createSyncError(
        'BULK_DOWNLOAD_ERROR',
        'Failed to download user resources',
        true
      );
    }
  }

  /**
   * Delete a resource from user's cloud storage
   */
  async deleteResource(userId: string, resourceId: string, resourceType?: string): Promise<void> {
    try {
      if (resourceType) {
        const docId = this.getResourceDocId(userId, resourceType as any, resourceId);
        const resourceRef = doc(firestore, this.SYNC_COLLECTION, userId, 'userResources', docId);
        await deleteDoc(resourceRef);
      } else {
        // If type is unknown, try all types
        const resourceTypes = ['article', 'story', 'audio', 'kanji', 'verb', 'adjective'];
        const deletePromises = resourceTypes.map(type => {
          const docId = this.getResourceDocId(userId, type as any, resourceId);
          const resourceRef = doc(firestore, this.SYNC_COLLECTION, userId, 'userResources', docId);
          return deleteDoc(resourceRef).catch(() => null); // Ignore errors for non-existent docs
        });
        
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      throw this.createSyncError(
        'RESOURCE_DELETE_ERROR',
        `Failed to delete resource ${resourceId}`,
        true,
        resourceId
      );
    }
  }

  /**
   * Generate a consistent document ID for resources
   */
  private getResourceDocId(userId: string, type: string, resourceId: string): string {
    return `${userId}_${type}_${resourceId}`;
  }

  /**
   * Create a standardized sync error
   */
  private createSyncError(
    code: string, 
    message: string, 
    retryable: boolean,
    resourceId?: string
  ): SyncError {
    return {
      code,
      message,
      resourceId,
      timestamp: Date.now(),
      retryable
    };
  }
}