'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export interface ReviewNavigationState {
  returnTo: string;
  sourceId: string;
  startTime: number;
  completedItems: number;
  sessionMetadata?: {
    textbook?: string;
    lesson?: number;
    kanjiLevel?: string;
    studyMode?: string;
  };
}

interface CompletionSummary {
  itemsCompleted: number;
  correctAnswers: number;
  totalTime: number;
  accuracy: number;
  sourceId: string;
  sessionMetadata?: Record<string, any>;
}

const STORAGE_KEY = 'reviewNavigation';
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

export function useReviewNavigation() {
  const router = useRouter();

  // Save navigation state to sessionStorage
  const saveNavigationState = useCallback((state: ReviewNavigationState) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save review navigation state:', error);
    }
  }, []);

  // Load navigation state from sessionStorage
  const loadNavigationState = useCallback((): ReviewNavigationState | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;

      const state = JSON.parse(stored) as ReviewNavigationState;
      
      // Check if session has timed out
      const now = Date.now();
      if (now - state.startTime > SESSION_TIMEOUT) {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return state;
    } catch (error) {
      console.warn('Failed to load review navigation state:', error);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  // Clear navigation state
  const clearNavigationState = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear review navigation state:', error);
    }
  }, []);

  // Navigate to a review source with return information
  const navigateToReview = useCallback((
    source: string, 
    sourceId: string, 
    sessionMetadata?: ReviewNavigationState['sessionMetadata']
  ) => {
    const state: ReviewNavigationState = {
      returnTo: '/review-hub',
      sourceId,
      startTime: Date.now(),
      completedItems: 0,
      sessionMetadata
    };

    saveNavigationState(state);

    // Navigate to the source with review mode parameters
    const params = new URLSearchParams({
      mode: 'review',
      returnTo: '/review-hub',
      sourceId
    });

    // Add metadata to URL params if provided
    if (sessionMetadata) {
      Object.entries(sessionMetadata).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });
    }

    router.push(`${source}?${params.toString()}`);
  }, [router, saveNavigationState]);

  // Return from review with optional completion summary
  const returnFromReview = useCallback((summary?: CompletionSummary) => {
    const state = loadNavigationState();
    
    if (!state) {
      // No navigation state found, just go to review hub
      router.push('/review-hub');
      return;
    }

    // Update state with completion data if provided
    if (summary) {
      const updatedState: ReviewNavigationState = {
        ...state,
        completedItems: summary.itemsCompleted
      };
      saveNavigationState(updatedState);
    }

    // Clear navigation state
    clearNavigationState();

    // Navigate back to review hub
    router.push(state.returnTo);

    // Optional: Fire completion event for analytics or notifications
    if (summary && typeof window !== 'undefined') {
      const completionEvent = new CustomEvent('reviewCompleted', {
        detail: {
          ...summary,
          sessionDuration: Date.now() - state.startTime,
          returnTime: Date.now()
        }
      });
      window.dispatchEvent(completionEvent);
    }
  }, [router, loadNavigationState, saveNavigationState, clearNavigationState]);

  // Get current navigation state
  const getCurrentState = useCallback(() => {
    return loadNavigationState();
  }, [loadNavigationState]);

  // Update completion count
  const updateCompletedItems = useCallback((count: number) => {
    const state = loadNavigationState();
    if (state) {
      const updatedState = { ...state, completedItems: count };
      saveNavigationState(updatedState);
    }
  }, [loadNavigationState, saveNavigationState]);

  // Check if currently in review mode
  const isReviewMode = useCallback(() => {
    return loadNavigationState() !== null;
  }, [loadNavigationState]);

  // Handle browser navigation (back button, refresh, etc.)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const state = loadNavigationState();
      if (state && state.completedItems > 0) {
        // Warn user they might lose progress
        event.preventDefault();
        event.returnValue = 'You have unsaved review progress. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    const handlePopState = () => {
      const state = loadNavigationState();
      if (state) {
        // User navigated back, clear state after a short delay
        // This allows proper cleanup without interfering with navigation
        setTimeout(() => {
          clearNavigationState();
        }, 100);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [loadNavigationState, clearNavigationState]);

  // Cleanup expired sessions on mount
  useEffect(() => {
    loadNavigationState(); // This will clean up expired sessions
  }, [loadNavigationState]);

  return {
    navigateToReview,
    returnFromReview,
    getCurrentState,
    updateCompletedItems,
    isReviewMode,
    clearNavigationState
  };
}

// Helper hook for detecting completion in feature pages
export function useReviewCompletion(onComplete: (summary: CompletionSummary) => void) {
  const { returnFromReview, getCurrentState } = useReviewNavigation();

  const handleCompletion = useCallback((
    itemsCompleted: number,
    correctAnswers: number,
    sessionStartTime: number,
    additionalMetadata?: Record<string, any>
  ) => {
    const state = getCurrentState();
    if (!state) return;

    const totalTime = Date.now() - sessionStartTime;
    const accuracy = itemsCompleted > 0 ? (correctAnswers / itemsCompleted) * 100 : 0;

    const summary: CompletionSummary = {
      itemsCompleted,
      correctAnswers,
      totalTime,
      accuracy,
      sourceId: state.sourceId,
      sessionMetadata: {
        ...state.sessionMetadata,
        ...additionalMetadata
      }
    };

    onComplete(summary);
    returnFromReview(summary);
  }, [getCurrentState, onComplete, returnFromReview]);

  return {
    handleCompletion,
    getCurrentState,
    isReviewMode: getCurrentState() !== null
  };
}