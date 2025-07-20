import { useEffect, useCallback } from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { analyticsTracker, AnalyticsEventType } from '@/lib/analytics/analyticsTracker';

interface UseAnalyticsReturn {
  track: (type: AnalyticsEventType, data?: Record<string, any>) => void;
  trackPageView: (page: string) => void;
  trackArticleView: (category: string, articleId?: string) => void;
  trackArticleComplete: (category: string, readTime: number, articleId?: string) => void;
  trackGameComplete: (game: string, score: number, accuracy?: number) => void;
  trackDrillComplete: (type: string, correct: number, total: number) => void;
  trackLimitReached: (feature: string) => void;
  trackUpgradeModalShown: (trigger: string, feature?: string) => void;
  trackError: (type: string, message: string) => void;
}

export function useAnalytics(): UseAnalyticsReturn {
  const { profile } = useUserProfile();
  const { isPremium } = useSubscription2();

  // Initialize analytics when user/subscription changes
  useEffect(() => {
    const initializeAnalytics = async () => {
      const userId = profile?.uid || null;
      await analyticsTracker.initialize(userId, isPremium);
    };

    initializeAnalytics();
  }, [profile?.uid, isPremium]);

  // Track page views on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const page = window.location.pathname;
      analyticsTracker.trackPageView(page);
    }
  }, []);

  // Memoized tracking functions
  const track = useCallback((type: AnalyticsEventType, data?: Record<string, any>) => {
    analyticsTracker.track(type, data);
  }, []);

  const trackPageView = useCallback((page: string) => {
    analyticsTracker.trackPageView(page);
  }, []);

  const trackArticleView = useCallback((category: string, articleId?: string) => {
    analyticsTracker.trackArticleView(category, articleId);
  }, []);

  const trackArticleComplete = useCallback((category: string, readTime: number, articleId?: string) => {
    analyticsTracker.trackArticleComplete(category, readTime, articleId);
  }, []);

  const trackGameComplete = useCallback((game: string, score: number, accuracy?: number) => {
    analyticsTracker.trackGameComplete(game, score, accuracy);
  }, []);

  const trackDrillComplete = useCallback((type: string, correct: number, total: number) => {
    analyticsTracker.trackDrillComplete(type, correct, total);
  }, []);

  const trackLimitReached = useCallback((feature: string) => {
    analyticsTracker.trackLimitReached(feature);
  }, []);

  const trackUpgradeModalShown = useCallback((trigger: string, feature?: string) => {
    analyticsTracker.trackUpgradeModalShown(trigger, feature);
  }, []);

  const trackError = useCallback((type: string, message: string) => {
    analyticsTracker.trackError(type, message);
  }, []);

  return {
    track,
    trackPageView,
    trackArticleView,
    trackArticleComplete,
    trackGameComplete,
    trackDrillComplete,
    trackLimitReached,
    trackUpgradeModalShown,
    trackError
  };
}