import { FirebaseSyncAdapter } from '../firebaseSyncAdapter';
import { CachedResource } from '@/lib/cache/types';
import { SyncManifest } from '../types';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
  storage: {}
}));

// Mock Firestore functions
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockWriteBatch = jest.fn();
const mockGetDocs = jest.fn();

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn((db, collection, id) => ({ id, collection })),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  })),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms }))
  }
}));

describe('FirebaseSyncAdapter', () => {
  let adapter: FirebaseSyncAdapter;
  
  const mockUserId = 'test-user-123';
  const mockManifest: SyncManifest = {
    userId: mockUserId,
    lastSyncTimestamp: Date.now(),
    resources: {
      'article-1': {
        type: 'article',
        version: '1.0.0',
        checksum: 'abc123',
        lastModified: Date.now()
      }
    }
  };

  const mockResource: CachedResource = {
    id: 'article-1',
    type: 'article',
    data: { title: 'Test Article', content: 'Content' },
    metadata: {
      size: 1024,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
      version: '1.0.0',
      checksum: 'abc123',
      expiresAt: Date.now() + 86400000
    },
    assets: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new FirebaseSyncAdapter();
  });

  describe('getUserManifest', () => {
    it('should return user manifest when it exists', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockManifest
      });

      const result = await adapter.getUserManifest(mockUserId);

      expect(result).toEqual(mockManifest);
      expect(mockGetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockUserId, collection: 'userSync' })
      );
    });

    it('should return null when manifest does not exist', async () => {
      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      });

      const result = await adapter.getUserManifest(mockUserId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(adapter.getUserManifest(mockUserId)).rejects.toMatchObject({
        code: 'MANIFEST_FETCH_ERROR',
        retryable: true
      });
    });
  });

  describe('saveUserManifest', () => {
    it('should save manifest to Firestore', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      await adapter.saveUserManifest(mockUserId, mockManifest);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockUserId, collection: 'userSync' }),
        expect.objectContaining({
          ...mockManifest,
          updatedAt: expect.any(Object)
        })
      );
    });

    it('should handle save errors', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Save failed'));

      await expect(adapter.saveUserManifest(mockUserId, mockManifest)).rejects.toMatchObject({
        code: 'MANIFEST_SAVE_ERROR',
        retryable: true
      });
    });
  });

  describe('uploadResource', () => {
    it('should upload resource to Firestore', async () => {
      mockSetDoc.mockResolvedValueOnce(undefined);

      await adapter.uploadResource(mockUserId, mockResource);

      expect(mockSetDoc).toHaveBeenCalledWith(
        expect.objectContaining({ 
          id: `${mockUserId}_article_article-1`,
          collection: 'userResources'
        }),
        expect.objectContaining({
          userId: mockUserId,
          resource: expect.objectContaining({
            ...mockResource,
            metadata: expect.objectContaining({
              cachedAt: expect.any(Object),
              lastAccessed: expect.any(Object),
              expiresAt: expect.any(Object)
            })
          }),
          uploadedAt: expect.any(Object)
        })
      );
    });

    it('should handle upload errors', async () => {
      mockSetDoc.mockRejectedValueOnce(new Error('Upload failed'));

      await expect(adapter.uploadResource(mockUserId, mockResource)).rejects.toMatchObject({
        code: 'RESOURCE_UPLOAD_ERROR',
        resourceId: 'article-1',
        retryable: true
      });
    });
  });

  describe('downloadResource', () => {
    it('should download resource from Firestore', async () => {
      const mockStoredResource = {
        resource: {
          ...mockResource,
          metadata: {
            ...mockResource.metadata,
            cachedAt: { toMillis: () => mockResource.metadata.cachedAt },
            lastAccessed: { toMillis: () => mockResource.metadata.lastAccessed },
            expiresAt: { toMillis: () => mockResource.metadata.expiresAt }
          }
        }
      };

      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockStoredResource
      });

      const result = await adapter.downloadResource(mockUserId, 'article-1');

      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await adapter.downloadResource(mockUserId, 'non-existent');

      expect(result).toBeNull();
    });

    it('should handle download errors', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Download failed'));

      await expect(adapter.downloadResource(mockUserId, 'article-1')).rejects.toMatchObject({
        code: 'RESOURCE_DOWNLOAD_ERROR',
        resourceId: 'article-1',
        retryable: true
      });
    });
  });

  describe('uploadResourcesBatch', () => {
    it('should upload multiple resources in batches', async () => {
      const resources = Array.from({ length: 10 }, (_, i) => ({
        ...mockResource,
        id: `article-${i}`
      }));

      await adapter.uploadResourcesBatch(mockUserId, resources);

      // Should create batch operations
      const { writeBatch } = require('firebase/firestore');
      expect(writeBatch).toHaveBeenCalled();
    });
  });

  describe('downloadAllUserResources', () => {
    it('should download all user resources', async () => {
      const mockQuerySnapshot = {
        forEach: jest.fn((callback) => {
          callback({
            data: () => ({
              resource: {
                ...mockResource,
                metadata: {
                  ...mockResource.metadata,
                  cachedAt: { toMillis: () => mockResource.metadata.cachedAt },
                  lastAccessed: { toMillis: () => mockResource.metadata.lastAccessed },
                  expiresAt: { toMillis: () => mockResource.metadata.expiresAt }
                }
              }
            })
          });
        })
      };

      mockGetDocs.mockResolvedValueOnce(mockQuerySnapshot);

      const result = await adapter.downloadAllUserResources(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockResource);
    });

    it('should handle bulk download errors', async () => {
      mockGetDocs.mockRejectedValueOnce(new Error('Bulk download failed'));

      await expect(adapter.downloadAllUserResources(mockUserId)).rejects.toMatchObject({
        code: 'BULK_DOWNLOAD_ERROR',
        retryable: true
      });
    });
  });

  describe('deleteResource', () => {
    it('should delete resource with known type', async () => {
      mockDeleteDoc.mockResolvedValueOnce(undefined);

      await adapter.deleteResource(mockUserId, 'article-1', 'article');

      expect(mockDeleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${mockUserId}_article_article-1`,
          collection: 'userResources'
        })
      );
    });

    it('should try all types when type is unknown', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await adapter.deleteResource(mockUserId, 'unknown-1');

      // Should try to delete for all resource types
      expect(mockDeleteDoc).toHaveBeenCalledTimes(6); // One for each resource type
    });

    it('should handle delete errors', async () => {
      mockDeleteDoc.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(adapter.deleteResource(mockUserId, 'article-1', 'article')).rejects.toMatchObject({
        code: 'RESOURCE_DELETE_ERROR',
        resourceId: 'article-1',
        retryable: true
      });
    });
  });

  describe('checkConnectivity', () => {
    it('should return true when connected', async () => {
      mockGetDoc.mockResolvedValueOnce({});

      const result = await adapter.checkConnectivity();

      expect(result).toBe(true);
    });

    it('should return false when offline', async () => {
      mockGetDoc.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.checkConnectivity();

      expect(result).toBe(false);
    });
  });
});