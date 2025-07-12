import { useEffect, useState, useCallback } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { statsTracker, UserStatsV2, ActivityType } from '@/lib/stats/statsTracker';

interface UseStatsReturn {
  stats: UserStatsV2;
  loading: boolean;
  error: string | null;
  trackActivity: (type: ActivityType, details?: any) => Promise<void>;
  forceSync: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useStats(): UseStatsReturn {
  const { profile } = useUserProfile();
  const { subscription } = useSubscription2();
  const [stats, setStats] = useState<UserStatsV2>(statsTracker.getStats());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize stats tracker when user/subscription changes
  useEffect(() => {
    const initializeStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const isPremium = subscription?.status === 'active' && 
          (subscription?.plan === 'monthly' || subscription?.plan === 'yearly');

        await statsTracker.initialize(profile, isPremium);
        
        // Get initial stats
        setStats(statsTracker.getStats());
      } catch (err) {
        console.error('❌ [useStats] Initialization error:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    initializeStats();
  }, [profile, subscription]);

  // Subscribe to stats updates
  useEffect(() => {
    const unsubscribe = statsTracker.subscribe((updatedStats) => {
      setStats(updatedStats);
    });

    return unsubscribe;
  }, []);

  // Track activity wrapper
  const trackActivity = useCallback(async (
    type: ActivityType, 
    details?: any
  ): Promise<void> => {
    try {
      await statsTracker.trackActivity(type, details);
    } catch (err) {
      console.error(`❌ [useStats] Error tracking ${type}:`, err);
    }
  }, []);

  // Force sync wrapper
  const forceSync = useCallback(async (): Promise<void> => {
    try {
      await statsTracker.forceSync();
    } catch (err) {
      console.error('❌ [useStats] Sync error:', err);
    }
  }, []);

  // Refresh stats
  const refreshStats = useCallback(async (): Promise<void> => {
    try {
      const isPremium = subscription?.status === 'active' && 
        (subscription?.plan === 'monthly' || subscription?.plan === 'yearly');
      
      await statsTracker.initialize(profile, isPremium);
      setStats(statsTracker.getStats());
    } catch (err) {
      console.error('❌ [useStats] Refresh error:', err);
    }
  }, [profile, subscription]);

  return {
    stats,
    loading,
    error,
    trackActivity,
    forceSync,
    refreshStats
  };
}