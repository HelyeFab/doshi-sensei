'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingState, OnboardingAnalytics } from '@/types/onboarding';

const ONBOARDING_KEY = 'doshi_onboarding_completed';
const ONBOARDING_DATE_KEY = 'doshi_onboarding_date';
const ONBOARDING_SEEN_KEY = 'doshi_onboarding_seen';

const initialState: OnboardingState = {
  currentScreen: 0,
  isActive: false,
  hasCompleted: false,
  userInteractions: {
    demoWordClicked: false,
    listCreated: false,
    practiceStarted: false,
  },
  animationStates: {
    conjugationDemo: 'idle',
    listDemo: 'idle',
    practiceDemo: 'idle',
  },
};

export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [analytics, setAnalytics] = useState<OnboardingAnalytics>({
    screenViews: [],
    interactions: [],
    completion: {
      completed: false,
      totalTime: 0,
      interactionCount: 0,
    },
  });
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Check if onboarding is completed
  const checkOnboardingStatus = useCallback(() => {
    if (typeof window === 'undefined') {
      return { isFirstVisit: false, isManualTrigger: false, shouldShow: false };
    }

    const completed = localStorage.getItem(ONBOARDING_KEY);
    const seen = localStorage.getItem(ONBOARDING_SEEN_KEY);
    const isFirstVisit = !completed && !seen;
    const isManualTrigger = window.location.search.includes('tutorial=true');

    return { isFirstVisit, isManualTrigger, shouldShow: isFirstVisit || isManualTrigger };
  }, []);

  // Initialize onboarding state
  useEffect(() => {
    const { shouldShow, isFirstVisit, isManualTrigger } = checkOnboardingStatus();
    if (shouldShow) {
      setState(prev => ({ ...prev, isActive: true }));
      setStartTime(new Date());
    }
  }, [checkOnboardingStatus]);

  // Track screen view
  const trackScreenView = useCallback((screenIndex: number, screenName: string) => {
    const now = new Date();
    const timeSpent = startTime ? now.getTime() - startTime.getTime() : 0;

    setAnalytics(prev => ({
      ...prev,
      screenViews: [...prev.screenViews, {
        screenIndex,
        screenName,
        timestamp: now,
        timeSpent,
      }],
    }));

    // Track with Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_screen_view', {
        event_category: 'onboarding',
        event_label: screenName,
        screen_index: screenIndex,
        custom_parameter_1: 'tutorial_flow'
      });
    }
  }, [startTime]);

  // Track interaction
  const trackInteraction = useCallback((interactionType: string, screenIndex: number) => {
    const now = new Date();

    setAnalytics(prev => ({
      ...prev,
      interactions: [...prev.interactions, {
        type: interactionType,
        screenIndex,
        timestamp: now,
      }],
      completion: {
        ...prev.completion,
        interactionCount: prev.completion.interactionCount + 1,
      },
    }));

    // Track with Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_interaction', {
        event_category: 'onboarding',
        event_label: interactionType,
        screen_index: screenIndex
      });
    }
  }, []);

  // Navigate to next screen
  const nextScreen = useCallback(() => {
    setState(prev => {
      const newScreenIndex = Math.min(prev.currentScreen + 1, 5); // Updated for 6 screens (0-5)
      trackScreenView(newScreenIndex, getScreenName(newScreenIndex));
      return {
        ...prev,
        currentScreen: newScreenIndex
      };
    });
  }, [trackScreenView]);

  // Navigate to previous screen
  const previousScreen = useCallback(() => {
    setState(prev => {
      const newScreenIndex = Math.max(prev.currentScreen - 1, 0);
      trackScreenView(newScreenIndex, getScreenName(newScreenIndex));
      return {
        ...prev,
        currentScreen: newScreenIndex
      };
    });
  }, [trackScreenView]);

  // Update interaction state
  const updateInteraction = useCallback((interaction: keyof OnboardingState['userInteractions'], value: boolean) => {
    setState(prev => ({
      ...prev,
      userInteractions: {
        ...prev.userInteractions,
        [interaction]: value,
      },
    }));

    if (value) {
      trackInteraction(interaction, state.currentScreen);
    }
  }, [trackInteraction, state.currentScreen]);

  // Update animation state
  const updateAnimationState = useCallback((animation: keyof OnboardingState['animationStates'], state: OnboardingState['animationStates'][keyof OnboardingState['animationStates']]) => {
    setState(prev => ({
      ...prev,
      animationStates: {
        ...prev.animationStates,
        [animation]: state,
      },
    }));
  }, []);

  // Complete onboarding
  const completeOnboarding = useCallback(() => {
    const completionTime = startTime ? new Date().getTime() - startTime.getTime() : 0;

    // Update state
    setState(prev => ({ ...prev, hasCompleted: true, isActive: false }));

    // Update analytics
    setAnalytics(prev => ({
      ...prev,
      completion: {
        ...prev.completion,
        completed: true,
        totalTime: completionTime,
      },
    }));

    // Save completion to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      localStorage.setItem(ONBOARDING_DATE_KEY, new Date().toISOString());
    }

    // Track completion
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_completed', {
        event_category: 'engagement',
        event_label: 'tutorial_completion',
        screen_count: 6, // Updated for 6 screens
        total_time: completionTime,
        interaction_count: analytics.completion.interactionCount,
        value: 1
      });
    }
  }, [startTime, analytics.completion.interactionCount]);

  // Mark tutorial as seen (for dismissal without completion)
  const markAsSeen = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
      localStorage.setItem(ONBOARDING_DATE_KEY, new Date().toISOString());
    }
  }, []);

  // Track drop off
  const trackDropOff = useCallback((screenIndex: number) => {
    const timeSpent = startTime ? new Date().getTime() - startTime.getTime() : 0;

    setAnalytics(prev => ({
      ...prev,
      completion: {
        ...prev.completion,
        dropOffScreen: screenIndex,
      },
    }));

    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'onboarding_drop_off', {
        event_category: 'onboarding',
        event_label: 'tutorial_exit',
        screen_index: screenIndex,
        time_spent: timeSpent
      });
    }
  }, [startTime]);

  // Reset onboarding (for testing)
  const resetOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_KEY);
      localStorage.removeItem(ONBOARDING_DATE_KEY);
      localStorage.removeItem(ONBOARDING_SEEN_KEY);
    }
    setState(initialState);
    setAnalytics({
      screenViews: [],
      interactions: [],
      completion: {
        completed: false,
        totalTime: 0,
        interactionCount: 0,
      },
    });
  }, []);

  return {
    state,
    analytics,
    nextScreen,
    previousScreen,
    updateInteraction,
    updateAnimationState,
    completeOnboarding,
    markAsSeen,
    trackDropOff,
    resetOnboarding,
    checkOnboardingStatus,
  };
}

// Helper function to get screen names
function getScreenName(index: number): string {
  const screens = ['welcome', 'conjugation', 'practice', 'youtube_shadowing', 'textbook_vocabulary', 'success'];
  return screens[index] || 'unknown';
}
