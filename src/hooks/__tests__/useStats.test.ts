import { renderHook, act } from '@testing-library/react';
import { useStats } from '../useStats';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { statsTracker } from '@/lib/stats/statsTracker';

// Mock dependencies
jest.mock('@/contexts/UserProfileContext');
jest.mock('@/hooks/useSubscription2');
jest.mock('@/lib/stats/statsTracker');

const mockUseUserProfile = useUserProfile as jest.MockedFunction<typeof useUserProfile>;
const mockUseSubscription2 = useSubscription2 as jest.MockedFunction<typeof useSubscription2>;

describe('useStats Hook', () => {
  const mockProfile = { uid: 'test-user-123', email: 'test@example.com' };
  const mockSubscription = { status: 'active', plan: 'monthly' };
  
  const mockStatsData = {
    userId: 'test-user-123',
    currentStreak: 5,
    longestStreak: 10,
    totalActivities: 100,
    pokemonCaught: 15,
    drillsCompleted: 20,
    storiesRead: 10,
    articlesRead: 15,
    flashcardsReviewed: 25,
    gamesPlayed: 30,
    version: '2.1'
  };

  const mockActivitiesData = {
    today: {
      date: '2025-01-19',
      activities: [],
      summary: {
        totalActivities: 5,
        flashcardsReviewed: 2,
        articlesRead: 1,
        storiesRead: 1,
        gamesPlayed: 1
      }
    },
    week: [],
    month: []
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock returns
    mockUseUserProfile.mockReturnValue({
      profile: mockProfile,
      updateProfile: jest.fn(),
      loading: false
    } as any);

    mockUseSubscription2.mockReturnValue({
      subscription: mockSubscription,
      userType: 'monthly',
      isPremium: true,
      loading: false
    } as any);

    // Mock statsTracker methods
    (statsTracker.initialize as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (statsTracker.getStats as jest.Mock) = jest.fn().mockReturnValue(mockStatsData);
    (statsTracker.getActivitiesData as jest.Mock) = jest.fn().mockResolvedValue(mockActivitiesData);
    (statsTracker.subscribe as jest.Mock) = jest.fn().mockReturnValue(() => {});
    (statsTracker.trackActivity as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (statsTracker.forceSync as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with user profile and subscription', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats());

      expect(result.current.loading).toBe(true);

      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledWith(mockProfile, true);
      expect(result.current.loading).toBe(false);
      expect(result.current.stats).toEqual(mockStatsData);
      expect(result.current.activities).toEqual(mockActivitiesData);
    });

    it('should handle guest users (no profile)', async () => {
      mockUseUserProfile.mockReturnValue({
        profile: null,
        updateProfile: jest.fn(),
        loading: false
      } as any);

      const { result, waitForNextUpdate } = renderHook(() => useStats());

      await waitForNextUpdate();

      expect(statsTracker.initialize).not.toHaveBeenCalled();
      expect(result.current.stats).toEqual(mockStatsData);
      expect(result.current.activities).toEqual({
        today: null,
        week: [],
        month: []
      });
    });

    it('should detect premium status correctly', async () => {
      // Test monthly premium
      const { rerender, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();
      
      expect(statsTracker.initialize).toHaveBeenCalledWith(mockProfile, true);

      // Test yearly premium
      mockUseSubscription2.mockReturnValue({
        subscription: { status: 'active', plan: 'yearly' },
        userType: 'yearly',
        isPremium: true,
        loading: false
      } as any);

      rerender();
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenLastCalledWith(mockProfile, true);
    });

    it('should detect free users correctly', async () => {
      mockUseSubscription2.mockReturnValue({
        subscription: { status: 'inactive', plan: null },
        userType: 'free',
        isPremium: false,
        loading: false
      } as any);

      const { waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledWith(mockProfile, false);
    });
  });

  describe('Stats Updates', () => {
    it('should subscribe to stats updates', async () => {
      let subscriberCallback: any;
      (statsTracker.subscribe as jest.Mock).mockImplementation((cb) => {
        subscriberCallback = cb;
        return () => {};
      });

      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      expect(statsTracker.subscribe).toHaveBeenCalled();

      // Simulate stats update
      const updatedStats = { ...mockStatsData, currentStreak: 10 };
      act(() => {
        subscriberCallback(updatedStats);
      });

      expect(result.current.stats.currentStreak).toBe(10);
    });

    it('should update activities when stats change', async () => {
      let subscriberCallback: any;
      (statsTracker.subscribe as jest.Mock).mockImplementation((cb) => {
        subscriberCallback = cb;
        return () => {};
      });

      const updatedActivities = {
        ...mockActivitiesData,
        today: {
          ...mockActivitiesData.today,
          summary: {
            ...mockActivitiesData.today.summary,
            totalActivities: 10
          }
        }
      };

      (statsTracker.getActivitiesData as jest.Mock).mockResolvedValue(updatedActivities);

      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      // Simulate stats update
      await act(async () => {
        await subscriberCallback(mockStatsData);
      });

      expect(result.current.activities.today?.summary.totalActivities).toBe(10);
    });

    it('should unsubscribe on unmount', async () => {
      const unsubscribeMock = jest.fn();
      (statsTracker.subscribe as jest.Mock).mockReturnValue(unsubscribeMock);

      const { unmount, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('Activity Tracking', () => {
    it('should track activities', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.trackActivity('drill', { correct: 8, total: 10 });
      });

      expect(statsTracker.trackActivity).toHaveBeenCalledWith('drill', { correct: 8, total: 10 });
    });

    it('should handle tracking errors gracefully', async () => {
      (statsTracker.trackActivity as jest.Mock).mockRejectedValue(new Error('Tracking failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.trackActivity('story', { itemId: 'story-1' });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error tracking story'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Sync Operations', () => {
    it('should force sync for premium users', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.forceSync();
      });

      expect(statsTracker.forceSync).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      (statsTracker.forceSync as jest.Mock).mockRejectedValue(new Error('Sync failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.forceSync();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Refresh Stats', () => {
    it('should refresh stats for logged in users', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      jest.clearAllMocks();

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(statsTracker.initialize).toHaveBeenCalledWith(mockProfile, true);
      expect(statsTracker.getStats).toHaveBeenCalled();
      expect(statsTracker.getActivitiesData).toHaveBeenCalled();
    });

    it('should handle guest refresh correctly', async () => {
      mockUseUserProfile.mockReturnValue({
        profile: null,
        updateProfile: jest.fn(),
        loading: false
      } as any);

      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.refreshStats();
      });

      // Should get stats but not initialize
      expect(statsTracker.getStats).toHaveBeenCalled();
      expect(result.current.activities).toEqual({
        today: null,
        week: [],
        month: []
      });
    });

    it('should handle refresh errors gracefully', async () => {
      (statsTracker.initialize as jest.Mock).mockRejectedValue(new Error('Init failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      await act(async () => {
        await result.current.refreshStats();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Refresh error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should set error state on initialization failure', async () => {
      (statsTracker.initialize as jest.Mock).mockRejectedValue(new Error('Init failed'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      
      await waitForNextUpdate();

      expect(result.current.error).toBe('Failed to load stats');
      expect(result.current.loading).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should continue working after initialization error', async () => {
      (statsTracker.initialize as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));
      
      const { result, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      expect(result.current.error).toBe('Failed to load stats');

      // Should still be able to track activities
      await act(async () => {
        await result.current.trackActivity('drill', {});
      });

      expect(statsTracker.trackActivity).toHaveBeenCalled();
    });
  });

  describe('Re-initialization', () => {
    it('should re-initialize when user changes', async () => {
      const { rerender, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledTimes(1);

      // Change user
      mockUseUserProfile.mockReturnValue({
        profile: { uid: 'different-user', email: 'different@example.com' },
        updateProfile: jest.fn(),
        loading: false
      } as any);

      rerender();
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledTimes(2);
      expect(statsTracker.initialize).toHaveBeenLastCalledWith(
        { uid: 'different-user', email: 'different@example.com' },
        true
      );
    });

    it('should re-initialize when subscription changes', async () => {
      const { rerender, waitForNextUpdate } = renderHook(() => useStats());
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledTimes(1);

      // Change subscription
      mockUseSubscription2.mockReturnValue({
        subscription: { status: 'inactive', plan: null },
        userType: 'free',
        isPremium: false,
        loading: false
      } as any);

      rerender();
      await waitForNextUpdate();

      expect(statsTracker.initialize).toHaveBeenCalledTimes(2);
      expect(statsTracker.initialize).toHaveBeenLastCalledWith(mockProfile, false);
    });
  });
});