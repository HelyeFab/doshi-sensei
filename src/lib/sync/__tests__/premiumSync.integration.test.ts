import { PremiumSyncManager } from '../premiumSyncManager';
import { FirebaseSyncAdapter } from '../firebaseSyncAdapter';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { CachedResource } from '@/lib/cache/types';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms }))
  }
}));

describe('Premium Sync Integration Test', () => {
  let syncManager: PremiumSyncManager;
  let storageManager: EnhancedStorageManager2;
  let firebaseAdapter: FirebaseSyncAdapter;
  
  const mockUserId = 'test-user-123';
  
  const mockResource1: CachedResource = {
    id: 'article-1',
    type: 'article',
    data: {
      title: 'Test Article 1',
      content: 'Content 1',
      metadata: { readTime: 5 }
    },
    metadata: {
      size: 1024,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      version: '1.0.0',
      checksum: 'abc123',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    },
    assets: []
  };

  const mockResource2: CachedResource = {
    id: 'story-1',
    type: 'story',
    data: {
      title: 'Test Story 1',
      content: 'Story content',
      theme: 'adventure'
    },
    metadata: {
      size: 2048,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      version: '1.0.0',
      checksum: 'def456',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    },
    assets: []
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Initialize managers
    syncManager = new PremiumSyncManager();
    storageManager = EnhancedStorageManager2;
    firebaseAdapter = new FirebaseSyncAdapter();
    
    // Mock storage manager methods
    jest.spyOn(storageManager, 'cacheResource').mockResolvedValue(undefined);
    jest.spyOn(storageManager, 'getCachedResource').mockImplementation(async (id) => {
      if (id === 'article-1') return mockResource1;
      if (id === 'story-1') return mockResource2;
      return null;
    });
    jest.spyOn(storageManager, 'getCachedResourcesByType').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Sync', () => {
    it('should upload all local resources on first sync', async () => {
      // Mock local resources
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([mockResource1]) // articles
        .mockResolvedValueOnce([mockResource2]) // stories
        .mockResolvedValue([]); // other types

      // Mock no remote manifest (first sync)
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValueOnce({ exists: () => false });

      // Mock successful uploads
      const { setDoc } = require('firebase/firestore');
      setDoc.mockResolvedValue(undefined);

      // Perform sync
      const result = await syncManager.performSync(mockUserId);

      expect(result.success).toBe(true);
      expect(result.resourcesUploaded).toBe(2);
      expect(result.resourcesSynced).toBe(2);
      expect(result.resourcesDownloaded).toBe(0);
      expect(result.conflicts).toBe(0);
    });
  });

  describe('Incremental Sync', () => {
    it('should download new resources from remote', async () => {
      // Mock local has only resource1
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([mockResource1])
        .mockResolvedValue([]);

      // Mock remote manifest with both resources
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(async (ref: any) => {
        // First call for manifest
        if (!ref.id || ref.id === mockUserId) {
          return {
            exists: () => true,
            data: () => ({
              userId: mockUserId,
              lastSyncTimestamp: Date.now() - 1000,
              resources: {
                'article-1': {
                  type: 'article',
                  version: '1.0.0',
                  checksum: 'abc123',
                  lastModified: Date.now() - 2000
                },
                'story-1': {
                  type: 'story',
                  version: '1.0.0',
                  checksum: 'def456',
                  lastModified: Date.now() - 1000
                }
              }
            })
          };
        }
        // Calls for downloading story-1
        return {
          exists: () => true,
          data: () => ({
            resource: {
              ...mockResource2,
              metadata: {
                ...mockResource2.metadata,
                cachedAt: { toMillis: () => mockResource2.metadata.cachedAt },
                lastAccessed: { toMillis: () => mockResource2.metadata.lastAccessed },
                expiresAt: { toMillis: () => mockResource2.metadata.expiresAt }
              }
            }
          })
        };
      });

      const result = await syncManager.performSync(mockUserId);

      expect(result.success).toBe(true);
      expect(result.resourcesDownloaded).toBe(1);
      expect(result.resourcesUploaded).toBe(0);
      expect(storageManager.cacheResource).toHaveBeenCalledWith(mockResource2);
    });

    it('should handle conflicts with last-write-wins', async () => {
      const localResource = {
        ...mockResource1,
        metadata: {
          ...mockResource1.metadata,
          lastAccessed: Date.now() - 5000 // Older
        }
      };

      const remoteResource = {
        ...mockResource1,
        data: { ...mockResource1.data, content: 'Updated content' },
        metadata: {
          ...mockResource1.metadata,
          lastAccessed: Date.now() - 1000 // Newer
        }
      };

      // Mock local resources
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([localResource])
        .mockResolvedValue([]);
      
      jest.spyOn(storageManager, 'getCachedResource')
        .mockResolvedValue(localResource);

      // Mock remote manifest showing different checksum
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(async (ref: any) => {
        if (!ref.id || ref.id === mockUserId) {
          return {
            exists: () => true,
            data: () => ({
              userId: mockUserId,
              lastSyncTimestamp: Date.now() - 1000,
              resources: {
                'article-1': {
                  type: 'article',
                  version: '1.0.0',
                  checksum: 'different-checksum',
                  lastModified: remoteResource.metadata.lastAccessed
                }
              }
            })
          };
        }
        return {
          exists: () => true,
          data: () => ({
            resource: {
              ...remoteResource,
              metadata: {
                ...remoteResource.metadata,
                cachedAt: { toMillis: () => remoteResource.metadata.cachedAt },
                lastAccessed: { toMillis: () => remoteResource.metadata.lastAccessed },
                expiresAt: { toMillis: () => remoteResource.metadata.expiresAt }
              }
            }
          })
        };
      });

      const result = await syncManager.performSync(mockUserId);

      expect(result.success).toBe(true);
      expect(result.conflicts).toBe(1);
      expect(result.resourcesDownloaded).toBe(1); // Remote was newer
      expect(storageManager.cacheResource).toHaveBeenCalledWith(remoteResource);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const { getDoc } = require('firebase/firestore');
      getDoc.mockRejectedValue(new Error('Network error'));

      const result = await syncManager.performSync(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should queue failed operations for retry', async () => {
      // Mock local resources
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([mockResource1])
        .mockResolvedValue([]);

      // Mock successful manifest fetch but failed resource upload
      const { getDoc, setDoc } = require('firebase/firestore');
      getDoc.mockResolvedValueOnce({ exists: () => false });
      setDoc.mockRejectedValueOnce(new Error('Upload failed'));

      await syncManager.performSync(mockUserId);

      expect(syncManager.getQueuedItemsCount()).toBeGreaterThan(0);
    });
  });

  describe('Sync Progress', () => {
    it('should report progress during sync', async () => {
      const progressUpdates: any[] = [];
      const progressCallback = (progress: any) => {
        progressUpdates.push({ ...progress });
      };

      // Mock some resources
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([mockResource1, mockResource2])
        .mockResolvedValue([]);

      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValueOnce({ exists: () => false });

      await syncManager.performSync(mockUserId, progressCallback);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].operation).toContain('Fetching sync manifests');
      expect(progressUpdates[progressUpdates.length - 1].operation).toContain('Sync completed');
    });
  });

  describe('Multiple Device Sync', () => {
    it('should merge resources from multiple devices', async () => {
      // Device 1 has article-1, Device 2 (remote) has story-1
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValueOnce([mockResource1])
        .mockResolvedValue([]);

      const { getDoc, getDocs } = require('firebase/firestore');
      
      // Mock remote manifest
      getDoc.mockImplementation(async (ref: any) => {
        if (!ref.id || ref.id === mockUserId) {
          return {
            exists: () => true,
            data: () => ({
              userId: mockUserId,
              lastSyncTimestamp: Date.now() - 1000,
              resources: {
                'story-1': {
                  type: 'story',
                  version: '1.0.0',
                  checksum: 'def456',
                  lastModified: Date.now() - 1000
                }
              }
            })
          };
        }
        return {
          exists: () => true,
          data: () => ({
            resource: {
              ...mockResource2,
              metadata: {
                ...mockResource2.metadata,
                cachedAt: { toMillis: () => mockResource2.metadata.cachedAt },
                lastAccessed: { toMillis: () => mockResource2.metadata.lastAccessed },
                expiresAt: { toMillis: () => mockResource2.metadata.expiresAt }
              }
            }
          })
        };
      });

      const result = await syncManager.performSync(mockUserId);

      expect(result.success).toBe(true);
      expect(result.resourcesUploaded).toBe(1); // article-1
      expect(result.resourcesDownloaded).toBe(1); // story-1
      expect(result.resourcesSynced).toBe(2);
    });
  });
});