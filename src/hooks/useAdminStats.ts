'use client';

import { useState, useEffect } from 'react';
import {
  getUserStats,
  getSubscriptionStats,
  getFeatureStats,
  subscribeToUserStats,
  subscribeToSubscriptionStats
} from '@/utils/adminStats';
import { UserStats, SubscriptionStats, FeatureStats } from '@/types/admin';

interface AdminStatsState {
  userStats: UserStats | null;
  subscriptionStats: SubscriptionStats | null;
  featureStats: FeatureStats | null;
  loading: boolean;
  error: string | null;
}

export function useAdminStats() {
  const [state, setState] = useState<AdminStatsState>({
    userStats: null,
    subscriptionStats: null,
    featureStats: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    let userStatsUnsubscribe: (() => void) | null = null;
    let subscriptionStatsUnsubscribe: (() => void) | null = null;

    const loadInitialStats = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        // Load initial data
        const [userStats, subscriptionStats, featureStats] = await Promise.all([
          getUserStats(),
          getSubscriptionStats(),
          getFeatureStats(),
        ]);

        if (mounted) {
          setState({
            userStats,
            subscriptionStats,
            featureStats,
            loading: false,
            error: null,
          });

          // Set up real-time listeners
          userStatsUnsubscribe = subscribeToUserStats((newUserStats) => {
            if (mounted) {
              setState(prev => ({ ...prev, userStats: newUserStats }));
            }
          });

          subscriptionStatsUnsubscribe = subscribeToSubscriptionStats((newSubscriptionStats) => {
            if (mounted) {
              setState(prev => ({ ...prev, subscriptionStats: newSubscriptionStats }));
            }
          });
        }
      } catch (error) {
        console.error('Error loading admin stats:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load statistics',
          }));
        }
      }
    };

    loadInitialStats();

    return () => {
      mounted = false;
      if (userStatsUnsubscribe) {
        userStatsUnsubscribe();
      }
      if (subscriptionStatsUnsubscribe) {
        subscriptionStatsUnsubscribe();
      }
    };
  }, []);

  const refreshStats = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const [userStats, subscriptionStats, featureStats] = await Promise.all([
        getUserStats(),
        getSubscriptionStats(),
        getFeatureStats(),
      ]);

      setState(prev => ({
        ...prev,
        userStats,
        subscriptionStats,
        featureStats,
      }));
    } catch (error) {
      console.error('Error refreshing admin stats:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to refresh statistics',
      }));
    }
  };

  return {
    ...state,
    refreshStats,
  };
}

// Simplified hook for just user stats
export function useUserStats() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const stats = await getUserStats();

        if (mounted) {
          setUserStats(stats);
          setLoading(false);

          // Set up real-time listener
          unsubscribe = subscribeToUserStats((newStats) => {
            if (mounted) {
              setUserStats(newStats);
            }
          });
        }
      } catch (error) {
        console.error('Error loading user stats:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load user statistics');
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { userStats, loading, error };
}

// Simplified hook for just subscription stats
export function useSubscriptionStats() {
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const stats = await getSubscriptionStats();

        if (mounted) {
          setSubscriptionStats(stats);
          setLoading(false);

          // Set up real-time listener
          unsubscribe = subscribeToSubscriptionStats((newStats) => {
            if (mounted) {
              setSubscriptionStats(newStats);
            }
          });
        }
      } catch (error) {
        console.error('Error loading subscription stats:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Failed to load subscription statistics');
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return { subscriptionStats, loading, error };
}
