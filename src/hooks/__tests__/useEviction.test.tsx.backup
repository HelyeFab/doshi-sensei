import { renderHook, act } from '@testing-library/react';
import { useEviction } from '../useEviction';
import { useSubscription2 } from '../useSubscription2';
import { evictionEngine } from '@/lib/cache/eviction/lruEvictionEngine';

// Mock dependencies
jest.mock('../useSubscription2');
jest.mock('@/lib/cache/eviction/lruEvictionEngine');

describe('useEviction', () => {
  const mockUseSubscription2 = useSubscription2 as jest.MockedFunction<typeof useSubscription2>;
  const mockEvictionEngine = evictionEngine as jest.Mocked<typeof evictionEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSubscription2.mockReturnValue({
      userType: 'free',
      isPremium: false,
      isLoading: false,
      subscription: null,
    } as any);
  });

  describe('getStats', () => {
    it('should return storage statistics', async () => {
      const mockStats = {
        resourceType: 'article',
        currentCount: 2,
        currentSizeBytes: 2048000,
        limitCount: 3,
        limitSizeBytes: 10485760,
        utilizationPercent: 66.67,
      };
      mockEvictionEngine.getStorageStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useEviction());

      let stats;
      await act(async () => {
        stats = await result.current.getStats('article');
      });

      expect(stats).toEqual(mockStats);
      expect(mockEvictionEngine.getStorageStats).toHaveBeenCalledWith('article', 'free');
    });

    it('should return null when no user type', async () => {
      mockUseSubscription2.mockReturnValue({
        userType: null,
        isPremium: false,
        isLoading: true,
        subscription: null,
      } as any);

      const { result } = renderHook(() => useEviction());

      let stats;
      await act(async () => {
        stats = await result.current.getStats('article');
      });

      expect(stats).toBeNull();
      expect(mockEvictionEngine.getStorageStats).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockEvictionEngine.getStorageStats.mockRejectedValue(new Error('Failed to get stats'));

      const { result } = renderHook(() => useEviction());

      let stats;
      await act(async () => {
        stats = await result.current.getStats('article');
      });

      expect(stats).toBeNull();
      expect(result.current.error).toBe('Failed to get stats');
    });
  });

  describe('checkEvictionNeeded', () => {
    it('should check if eviction is needed', async () => {
      mockEvictionEngine.requiresEviction.mockResolvedValue(true);

      const { result } = renderHook(() => useEviction());

      let needed;
      await act(async () => {
        needed = await result.current.checkEvictionNeeded('article', 1024);
      });

      expect(needed).toBe(true);
      expect(mockEvictionEngine.requiresEviction).toHaveBeenCalledWith('article', 'free', 1024);
    });

    it('should return false when no user type', async () => {
      mockUseSubscription2.mockReturnValue({
        userType: null,
        isPremium: false,
        isLoading: true,
        subscription: null,
      } as any);

      const { result } = renderHook(() => useEviction());

      let needed;
      await act(async () => {
        needed = await result.current.checkEvictionNeeded('article', 1024);
      });

      expect(needed).toBe(false);
    });
  });

  describe('triggerEviction', () => {
    it('should trigger eviction successfully', async () => {
      const mockResult = {
        success: true,
        evictedCount: 2,
        freedBytes: 2048000,
        evictedIds: ['id1', 'id2'],
        reason: 'count_limit_exceeded' as const,
      };
      mockEvictionEngine.enforceLimit.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useEviction());

      let evictionResult;
      await act(async () => {
        evictionResult = await result.current.triggerEviction('article');
      });

      expect(evictionResult).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(mockEvictionEngine.enforceLimit).toHaveBeenCalledWith('article', 'free');
    });

    it('should handle eviction errors', async () => {
      mockEvictionEngine.enforceLimit.mockRejectedValue(new Error('Eviction failed'));

      const { result } = renderHook(() => useEviction());

      let evictionResult;
      await act(async () => {
        evictionResult = await result.current.triggerEviction('article');
      });

      expect(evictionResult).toBeNull();
      expect(result.current.error).toBe('Eviction failed');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Resource Management', () => {
    it('should mark resources as active', () => {
      const { result } = renderHook(() => useEviction());

      act(() => {
        result.current.markActive('resource1');
      });

      expect(mockEvictionEngine.markActive).toHaveBeenCalledWith('resource1');
    });

    it('should mark resources as inactive', () => {
      const { result } = renderHook(() => useEviction());

      act(() => {
        result.current.markInactive('resource1');
      });

      expect(mockEvictionEngine.markInactive).toHaveBeenCalledWith('resource1');
    });
  });

  describe('formatStorageDisplay', () => {
    it('should format storage display correctly', () => {
      const { result } = renderHook(() => useEviction());

      const stats = {
        resourceType: 'article',
        currentCount: 2,
        currentSizeBytes: 2097152, // 2MB
        limitCount: 3,
        limitSizeBytes: 10485760, // 10MB
        utilizationPercent: 66.67,
      };

      const display = result.current.formatStorageDisplay(stats);

      expect(display).toContain('2/3 items');
      expect(display).toContain('2 MB/10 MB');
      expect(display).toContain('67% used');
    });

    it('should handle unlimited storage', () => {
      const { result } = renderHook(() => useEviction());

      const stats = {
        resourceType: 'kanji',
        currentCount: 100,
        currentSizeBytes: 5242880, // 5MB
        limitCount: Infinity,
        limitSizeBytes: Infinity,
        utilizationPercent: 0,
      };

      const display = result.current.formatStorageDisplay(stats);

      expect(display).toContain('100 items');
      expect(display).toContain('5 MB/Unlimited');
    });
  });

  describe('User Type Changes', () => {
    it('should update callbacks when user type changes', async () => {
      const { result, rerender } = renderHook(() => useEviction());

      // Initial call as free user
      await act(async () => {
        await result.current.checkEvictionNeeded('article', 1024);
      });
      expect(mockEvictionEngine.requiresEviction).toHaveBeenCalledWith('article', 'free', 1024);

      // Change to premium user
      mockUseSubscription2.mockReturnValue({
        userType: 'monthly',
        isPremium: true,
        isLoading: false,
        subscription: {} as any,
      } as any);

      rerender();

      // Call again as premium user
      await act(async () => {
        await result.current.checkEvictionNeeded('article', 1024);
      });
      expect(mockEvictionEngine.requiresEviction).toHaveBeenLastCalledWith('article', 'monthly', 1024);
    });
  });
});