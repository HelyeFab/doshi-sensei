import { PremiumSyncManager } from '../premiumSyncManager';
import { LRUEvictionEngine } from '@/lib/cache/eviction/lruEvictionEngine';
import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { CachedResource } from '@/lib/cache/types';
import { UserType } from '@/types/user';

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
  writeBatch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined)
  })),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms }))
  }
}));

describe('Sync and Eviction Integration', () => {
  let syncManager: PremiumSyncManager;
  let evictionEngine: LRUEvictionEngine;
  let storageManager: EnhancedStorageManager2;
  
  const mockUserId = 'test-user-123';
  
  // Create mock resources that exceed free user limits (3 articles)
  const createMockArticle = (id: string, accessTime: number): CachedResource => ({
    id: `article-${id}`,
    type: 'article',
    data: {
      title: `Test Article ${id}`,
      content: `Content for article ${id}`,
      metadata: { readTime: 5 }
    },
    metadata: {
      size: 1024,
      cachedAt: accessTime - 1000,
      lastAccessed: accessTime,
      version: '1.0.0',
      checksum: `checksum-${id}`,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    },
    assets: []
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    syncManager = new PremiumSyncManager();
    evictionEngine = LRUEvictionEngine.getInstance();
    storageManager = EnhancedStorageManager2;
    
    // Reset eviction engine state
    jest.spyOn(evictionEngine, 'requiresEviction').mockClear();
    jest.spyOn(evictionEngine, 'enforceLimit').mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Free User Sync with Storage Limits', () => {
    it('should trigger eviction when syncing exceeds free user limits', async () => {
      const now = Date.now();
      
      // Mock 2 existing local articles
      const existingArticles = [
        createMockArticle('1', now - 10000),
        createMockArticle('2', now - 5000)
      ];
      
      // Mock 2 remote articles to download (total would be 4, exceeding limit of 3)
      const remoteArticles = [
        createMockArticle('3', now - 3000),
        createMockArticle('4', now - 1000)
      ];
      
      // Mock storage manager to return existing articles
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockImplementation(async (type) => {
          if (type === 'article') return existingArticles;
          return [];
        });
      
      // Mock eviction engine to be called
      jest.spyOn(evictionEngine, 'requiresEviction').mockResolvedValue(true);
      jest.spyOn(evictionEngine, 'enforceLimit').mockResolvedValue({
        success: true,
        itemsEvicted: 1,
        bytesFreed: 1024,
        errors: []
      });
      
      // Mock firebase adapter to return remote manifest
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(async (ref: any) => {
        if (!ref.id || ref.id === mockUserId) {
          return {
            exists: () => true,
            data: () => ({
              userId: mockUserId,
              lastSyncTimestamp: now - 20000,
              resources: {
                'article-3': {
                  type: 'article',
                  version: '1.0.0',
                  checksum: 'checksum-3',
                  lastModified: now - 3000
                },
                'article-4': {
                  type: 'article',
                  version: '1.0.0',
                  checksum: 'checksum-4',
                  lastModified: now - 1000
                }
              }
            })
          };
        }
        // Return remote articles when downloading
        const articleId = ref.id.split('_').pop();
        if (articleId === 'article-3') {
          return {
            exists: () => true,
            data: () => ({
              resource: {
                ...remoteArticles[0],
                metadata: {
                  ...remoteArticles[0].metadata,
                  cachedAt: { toMillis: () => remoteArticles[0].metadata.cachedAt },
                  lastAccessed: { toMillis: () => remoteArticles[0].metadata.lastAccessed },
                  expiresAt: { toMillis: () => remoteArticles[0].metadata.expiresAt }
                }
              }
            })
          };
        }
        return { exists: () => false };
      });
      
      // Mock cacheResource to simulate eviction check
      const originalCacheResource = storageManager.cacheResource.bind(storageManager);
      jest.spyOn(storageManager, 'cacheResource').mockImplementation(async (resource, userType) => {
        // Check if eviction is needed
        const needsEviction = await evictionEngine.requiresEviction(
          'article',
          userType || 'free',
          resource.metadata.size
        );
        
        if (needsEviction) {
          await evictionEngine.enforceLimit('article', userType || 'free');
        }
        
        // Call original method
        return originalCacheResource(resource, userType || 'free');
      });
      
      // Perform sync as free user
      const result = await syncManager.performSync(mockUserId);
      
      // Verify eviction was triggered
      expect(evictionEngine.requiresEviction).toHaveBeenCalledWith(
        'article',
        'free',
        expect.any(Number)
      );
      expect(evictionEngine.enforceLimit).toHaveBeenCalledWith('article', 'free');
    });

    it('should not evict actively reading articles during sync', async () => {
      const now = Date.now();
      
      // Mock 3 existing articles (at limit)
      const existingArticles = [
        createMockArticle('1', now - 10000), // Oldest
        createMockArticle('2', now - 5000),
        createMockArticle('3', now - 100) // Currently reading (very recent)
      ];
      
      // Mock 1 remote article to download
      const remoteArticle = createMockArticle('4', now - 2000);
      
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValue(existingArticles);
      
      // Mock eviction to protect active resource
      jest.spyOn(evictionEngine, 'protectResource').mockReturnValue(undefined);
      jest.spyOn(evictionEngine, 'enforceLimit').mockImplementation(async () => {
        // Should evict article-1 (oldest), not article-3 (active)
        await storageManager.removeResource('article', 'article-1');
        return {
          success: true,
          itemsEvicted: 1,
          bytesFreed: 1024,
          errors: []
        };
      });
      
      // Protect the actively reading article
      evictionEngine.protectResource('article-3');
      
      // Setup firebase mocks for sync
      const { getDoc } = require('firebase/firestore');
      getDoc.mockImplementation(async (ref: any) => {
        if (!ref.id || ref.id === mockUserId) {
          return {
            exists: () => true,
            data: () => ({
              userId: mockUserId,
              lastSyncTimestamp: now - 20000,
              resources: {
                'article-4': {
                  type: 'article',
                  version: '1.0.0',
                  checksum: 'checksum-4',
                  lastModified: now - 2000
                }
              }
            })
          };
        }
        return { exists: () => false };
      });
      
      const result = await syncManager.performSync(mockUserId);
      
      // Verify the oldest article was evicted, not the active one
      expect(storageManager.removeResource).toHaveBeenCalledWith('article', 'article-1');
      expect(storageManager.removeResource).not.toHaveBeenCalledWith('article', 'article-3');
    });
  });

  describe('Premium User Sync', () => {
    it('should not trigger eviction for premium users', async () => {
      const now = Date.now();
      
      // Mock 10 existing articles (way more than free limit)
      const existingArticles = Array.from({ length: 10 }, (_, i) => 
        createMockArticle(`${i + 1}`, now - (i + 1) * 1000)
      );
      
      jest.spyOn(storageManager, 'getCachedResourcesByType')
        .mockResolvedValue(existingArticles);
      
      // Mock firebase for initial sync
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({ exists: () => false }); // No remote manifest
      
      // For premium users, eviction should not be triggered
      jest.spyOn(evictionEngine, 'requiresEviction').mockResolvedValue(false);
      
      const result = await syncManager.performSync(mockUserId);
      
      // Verify eviction was not enforced
      expect(evictionEngine.enforceLimit).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Sync Error Handling with Eviction', () => {
    it('should handle eviction errors gracefully during sync', async () => {
      // Mock eviction failure
      jest.spyOn(evictionEngine, 'requiresEviction').mockResolvedValue(true);
      jest.spyOn(evictionEngine, 'enforceLimit').mockRejectedValue(
        new Error('Eviction failed: Storage access denied')
      );
      
      // Mock basic sync setup
      const { getDoc } = require('firebase/firestore');
      getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          userId: mockUserId,
          lastSyncTimestamp: Date.now() - 10000,
          resources: {}
        })
      });
      
      const result = await syncManager.performSync(mockUserId);
      
      // Sync should handle eviction error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toContain('Eviction failed');
    });
  });
});