import { useEffect, useState, useCallback } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { statsTracker, UserStatsV2, ActivityType, DailyActivity } from '@/lib/stats/statsTracker';

interface ActivitiesData {
  today: DailyActivity | null;
  week: DailyActivity[];
  month: DailyActivity[];
}

interface UseStatsReturn {
  stats: UserStatsV2;
  activities: ActivitiesData;
  loading: boolean;
  error: string | null;
  trackActivity: (type: ActivityType, details?: any) => Promise<void>;
  forceSync: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useStats(): UseStatsReturn {
  const { profile } = useUserProfile();
  const { subscription, isPremium: isPremiumUser } = useSubscription2();
  const [stats, setStats] = useState<UserStatsV2>(statsTracker.getStats());
  const [activities, setActivities] = useState<ActivitiesData>({
    today: null,
    week: [],
    month: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize stats tracker when user/subscription changes
  useEffect(() => {
    const initializeStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Guest users should not have persistent stats
        if (!profile) {
          // For guest users, stats are in-memory only
          setStats(statsTracker.getStats());
          setActivities({
            today: null,
            week: [],
            month: []
          });
          setLoading(false);
          return;
        }

        console.log('🔍 [useStats] Initializing stats:', {
          userId: profile.uid,
          email: profile.email,
          subscription: subscription,
          isPremiumFromHook: isPremiumUser
        });

        await statsTracker.initialize(profile, isPremiumUser);
        
        // Get initial stats and activities
        setStats(statsTracker.getStats());
        const activitiesData = await statsTracker.getActivitiesData();
        setActivities(activitiesData);
      } catch (err) {
        console.error('❌ [useStats] Initialization error:', err);
        setError('Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    initializeStats();
  }, [profile, subscription, isPremiumUser]);

  // Subscribe to stats updates
  useEffect(() => {
    const unsubscribe = statsTracker.subscribe(async (updatedStats) => {
      setStats(updatedStats);
      // Also update activities when stats change
      try {
        const activitiesData = await statsTracker.getActivitiesData();
        setActivities(activitiesData);
      } catch (err) {
        console.error('❌ [useStats] Error updating activities:', err);
      }
    });

    return unsubscribe;
  }, []);

  // Remove periodic refresh - it's overkill for users not playing Kanji Quest
  // Pokemon count will update immediately when caught via pokemonManager

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
      if (!profile) {
        // Guest users - no persistent stats
        setStats(statsTracker.getStats());
        setActivities({
          today: null,
          week: [],
          month: []
        });
        return;
      }

      await statsTracker.initialize(profile, isPremiumUser);
      setStats(statsTracker.getStats());
      const activitiesData = await statsTracker.getActivitiesData();
      setActivities(activitiesData);
    } catch (err) {
      console.error('❌ [useStats] Refresh error:', err);
    }
  }, [profile, subscription, isPremiumUser]);

  return {
    stats,
    activities,
    loading,
    error,
    trackActivity,
    forceSync,
    refreshStats
  };
}