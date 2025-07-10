import { LRUEvictionEngine } from '../lruEvictionEngine';
import EnhancedStorageManager2 from '@/utils/enhancedStorageManager2';
import { CachedResource } from '@/types/cache';
import { EVICTION_GRACE_PERIOD_MS } from '../storageLimits';

// Mock the storage manager
jest.mock('@/utils/enhancedStorageManager2');

describe('LRUEvictionEngine', () => {
  let evictionEngine: LRUEvictionEngine;
  const mockStorageManager = EnhancedStorageManager2 as jest.Mocked<typeof EnhancedStorageManager2>;

  beforeEach(() => {
    jest.clearAllMocks();
    evictionEngine = LRUEvictionEngine.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = LRUEvictionEngine.getInstance();
      const instance2 = LRUEvictionEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('requiresEviction', () => {
    it('should return false for premium users with unlimited storage', async () => {
      mockStorageManager.getResourcesByType.mockResolvedValue([]);
      
      const result = await evictionEngine.requiresEviction('kanji', 'monthly', 1024);
      
      expect(result).toBe(false);
    });

    it('should return true when count limit would be exceeded', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 1024),
        createMockResource('2', 1024),
        createMockResource('3', 1024),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      
      const result = await evictionEngine.requiresEviction('article', 'free', 1024);
      
      expect(result).toBe(true); // Free users have 3 article limit
    });

    it('should return true when size limit would be exceeded', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 5 * 1024 * 1024), // 5MB
        createMockResource('2', 4 * 1024 * 1024), // 4MB
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      
      const result = await evictionEngine.requiresEviction('article', 'free', 2 * 1024 * 1024); // 2MB more
      
      expect(result).toBe(true); // Would exceed 10MB limit
    });

    it('should return false when within limits', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 1024),
        createMockResource('2', 1024),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      
      const result = await evictionEngine.requiresEviction('article', 'free', 1024);
      
      expect(result).toBe(false);
    });
  });

  describe('getStorageStats', () => {
    it('should calculate correct storage statistics', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 1024 * 1024), // 1MB
        createMockResource('2', 2 * 1024 * 1024), // 2MB
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      
      const stats = await evictionEngine.getStorageStats('article', 'free');
      
      expect(stats).toEqual({
        resourceType: 'article',
        currentCount: 2,
        currentSizeBytes: 3 * 1024 * 1024, // 3MB total
        limitCount: 3,
        limitSizeBytes: 10 * 1024 * 1024, // 10MB limit
        utilizationPercent: 66.67, // max(2/3*100, 3/10*100)
      });
    });
  });

  describe('enforceLimit', () => {
    it('should evict oldest items first', async () => {
      const now = Date.now();
      const mockResources: CachedResource[] = [
        createMockResource('oldest', 1024, now - 3600000), // 1 hour old
        createMockResource('middle', 1024, now - 1800000), // 30 min old
        createMockResource('newest', 1024, now - 600000),  // 10 min old
        createMockResource('brand-new', 1024, now),        // Just added
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      const result = await evictionEngine.enforceLimit('article', 'free');
      
      expect(result.success).toBe(true);
      expect(result.evictedCount).toBe(2); // Should evict 2 to make room
      expect(result.evictedIds).toEqual(['oldest', 'middle']);
      expect(mockStorageManager.removeResource).toHaveBeenCalledWith('article', 'oldest');
      expect(mockStorageManager.removeResource).toHaveBeenCalledWith('article', 'middle');
    });

    it('should not evict active resources', async () => {
      const now = Date.now();
      const mockResources: CachedResource[] = [
        createMockResource('active', 1024, now - 3600000), // Oldest but active
        createMockResource('inactive1', 1024, now - 1800000),
        createMockResource('inactive2', 1024, now - 600000),
        createMockResource('new', 1024, now),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      // Mark first resource as active
      evictionEngine.markActive('active');
      
      const result = await evictionEngine.enforceLimit('article', 'free');
      
      expect(result.evictedIds).not.toContain('active');
      expect(result.evictedIds).toContain('inactive1');
    });

    it('should respect grace period', async () => {
      const now = Date.now();
      const mockResources: CachedResource[] = [
        createMockResource('old', 1024, now - EVICTION_GRACE_PERIOD_MS - 1000), // Outside grace
        createMockResource('recent', 1024, now - 60000), // 1 min ago, within grace
        createMockResource('another-old', 1024, now - EVICTION_GRACE_PERIOD_MS - 2000),
        createMockResource('new', 1024, now),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      const result = await evictionEngine.enforceLimit('article', 'free');
      
      expect(result.evictedIds).not.toContain('recent');
      expect(result.evictedIds).toContain('old');
      expect(result.evictedIds).toContain('another-old');
    });

    it('should handle size-based eviction', async () => {
      const now = Date.now();
      const mockResources: CachedResource[] = [
        createMockResource('small1', 1 * 1024 * 1024, now - 3600000), // 1MB
        createMockResource('small2', 1 * 1024 * 1024, now - 3000000), // 1MB
        createMockResource('large', 8 * 1024 * 1024, now - 1800000),  // 8MB
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      const result = await evictionEngine.enforceLimit('article', 'free');
      
      // Should evict items to get under 10MB limit
      expect(result.freedBytes).toBeGreaterThanOrEqual(1 * 1024 * 1024);
      expect(result.reason).toBe('size_limit_exceeded');
    });

    it('should handle dry run without actual eviction', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 1024),
        createMockResource('2', 1024),
        createMockResource('3', 1024),
        createMockResource('4', 1024),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      
      const result = await evictionEngine.enforceLimit('article', 'free', { dryRun: true });
      
      expect(result.success).toBe(true);
      expect(result.evictedCount).toBeGreaterThan(0);
      expect(mockStorageManager.removeResource).not.toHaveBeenCalled();
    });

    it('should respect batch size limit', async () => {
      const mockResources: CachedResource[] = Array.from({ length: 20 }, (_, i) => 
        createMockResource(`item-${i}`, 1024, Date.now() - (i + 1) * 1000)
      );
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      const result = await evictionEngine.enforceLimit('article', 'free', { batchSize: 5 });
      
      expect(result.evictedCount).toBeLessThanOrEqual(5);
    });

    it('should handle concurrent eviction requests', async () => {
      const mockResources: CachedResource[] = [
        createMockResource('1', 1024),
        createMockResource('2', 1024),
        createMockResource('3', 1024),
        createMockResource('4', 1024),
      ];
      mockStorageManager.getResourcesByType.mockResolvedValue(mockResources);
      mockStorageManager.removeResource.mockResolvedValue();
      mockStorageManager.saveData.mockResolvedValue();
      
      // Start two evictions simultaneously
      const promise1 = evictionEngine.enforceLimit('article', 'free');
      const promise2 = evictionEngine.enforceLimit('article', 'free');
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Both should return the same result (second should wait for first)
      expect(result1).toEqual(result2);
    });
  });

  describe('Active Resource Management', () => {
    it('should track active resources', () => {
      evictionEngine.markActive('resource1');
      evictionEngine.markActive('resource2');
      
      // Active resources should be protected during eviction
      expect(() => evictionEngine.markInactive('resource1')).not.toThrow();
    });

    it('should remove resources from active list', () => {
      evictionEngine.markActive('resource1');
      evictionEngine.markInactive('resource1');
      
      // Resource should no longer be protected
      expect(() => evictionEngine.markActive('resource1')).not.toThrow();
    });
  });
});

// Helper function to create mock cached resources
function createMockResource(
  id: string, 
  size: number, 
  lastAccessed: number = Date.now()
): CachedResource {
  return {
    id,
    type: 'article',
    data: { id, content: 'test' },
    metadata: {
      size,
      cachedAt: lastAccessed - 1000,
      lastAccessed,
      version: '1.0',
      checksum: 'abc123',
    },
  };
}