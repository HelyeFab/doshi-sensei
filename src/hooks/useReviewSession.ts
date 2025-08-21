'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  SessionState, 
  SessionPreferences, 
  ReviewResponse, 
  ReviewItem,
  SessionSummary,
  ReviewProgress,
  ContentType
} from '@/lib/unified-review';
import { useUnifiedReview } from '@/hooks/useUnifiedReview';
import { useFeature } from '@/hooks/useFeature';

interface ReviewSessionHookState {
  sessionState: SessionState | null;
  currentItem: ReviewItem | null;
  isLoading: boolean;
  isSessionActive: boolean;
  error: string | null;
}

interface UseReviewSessionReturn extends ReviewSessionHookState {
  /**
   * Start a new review session
   */
  startSession: (preferences?: SessionPreferences) => Promise<void>;
  
  /**
   * Submit a review response for the current item
   */
  submitReview: (response: ReviewResponse) => Promise<void>;
  
  /**
   * End the current session and get summary
   */
  endSession: () => Promise<SessionSummary | null>;
  
  /**
   * Skip the current item
   */
  skipItem: () => Promise<void>;
  
  /**
   * Get session statistics
   */
  getSessionStats: () => {
    totalItems: number;
    currentIndex: number;
    completed: number;
    remaining: number;
    accuracy: number;
  } | null;
}

/**
 * Custom hook for managing review sessions
 * 
 * This hook handles:
 * - Session lifecycle (start, progress, end)
 * - Item navigation and state management
 * - Response submission and tracking
 * - Integration with access control
 */
export function useReviewSession(): UseReviewSessionReturn {
  const { engine, isReady } = useUnifiedReview();
  const { checkAndTrack } = useFeature('review_session');
  
  const [state, setState] = useState<ReviewSessionHookState>({
    sessionState: null,
    currentItem: null,
    isLoading: false,
    isSessionActive: false,
    error: null
  });
  
  const sessionIdRef = useRef<string | null>(null);

  // Start a new review session
  const startSession = async (preferences: SessionPreferences = {}) => {
    if (!engine || !isReady) {
      setState(prev => ({ ...prev, error: 'Review engine not ready' }));
      return;
    }

    // Check access before starting session
    const hasAccess = await checkAndTrack();
    if (!hasAccess) {
      setState(prev => ({ ...prev, error: 'Access denied for review sessions' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionIdRef.current = sessionId;

      // Get items for review based on preferences
      const items = await engine.getDueItems({
        limit: preferences.maxItems || 20,
        contentTypes: preferences.contentTypes,
        includeNew: preferences.includeNew || false,
        newItemsLimit: preferences.newItemsLimit || 5
      });

      if (items.length === 0) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: 'No items available for review' 
        }));
        return;
      }

      // Create session state
      const sessionState: SessionState = {
        sessionId,
        userId: engine.getUserId?.() || 'anonymous',
        items: items,
        currentIndex: 0,
        startTime: new Date(),
        preferences: {
          maxItems: preferences.maxItems || 20,
          maxDuration: preferences.maxDuration || 60,
          contentTypes: preferences.contentTypes || Object.values(ContentType),
          includeNew: preferences.includeNew || false,
          newItemsLimit: preferences.newItemsLimit || 5,
          ...preferences
        },
        completed: [],
        stats: {
          totalReviewed: 0,
          correctAnswers: 0,
          averageResponseTime: 0,
          ratingDistribution: {
            1: 0, // AGAIN
            2: 0, // HARD  
            3: 0, // GOOD
            4: 0  // EASY
          },
          studyModeStats: {}
        }
      };

      // Get current item details
      const currentItem = await engine.getReviewItem(items[0].itemId);

      setState({
        sessionState,
        currentItem,
        isLoading: false,
        isSessionActive: true,
        error: null
      });

    } catch (error) {
      console.error('Failed to start review session:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start session'
      }));
    }
  };

  // Submit a review response
  const submitReview = async (response: ReviewResponse) => {
    if (!state.sessionState || !state.currentItem || !engine) {
      throw new Error('No active session or engine not available');
    }

    const { sessionState, currentItem } = state;
    const currentProgress = sessionState.items[sessionState.currentIndex];

    try {
      // Process the review through the engine
      const updatedProgress = await engine.processReview(
        currentItem,
        response.rating,
        response.responseTime,
        currentProgress
      );

      // Update session statistics
      const newStats = { ...sessionState.stats };
      newStats.totalReviewed += 1;
      newStats.ratingDistribution[response.rating] += 1;
      
      if (response.rating >= 3) { // GOOD or EASY
        newStats.correctAnswers += 1;
      }

      // Calculate new average response time
      const totalTime = newStats.averageResponseTime * (newStats.totalReviewed - 1) + response.responseTime;
      newStats.averageResponseTime = totalTime / newStats.totalReviewed;

      // Add to completed items
      const reviewResult = {
        itemId: currentItem.id,
        response,
        progress: updatedProgress,
        timestamp: new Date()
      };

      // Check if session is complete
      const nextIndex = sessionState.currentIndex + 1;
      const isLastItem = nextIndex >= sessionState.items.length;

      if (isLastItem) {
        // Session complete
        const updatedSessionState: SessionState = {
          ...sessionState,
          currentIndex: nextIndex,
          completed: [...sessionState.completed, reviewResult],
          stats: newStats
        };

        setState(prev => ({
          ...prev,
          sessionState: updatedSessionState,
          currentItem: null,
          isSessionActive: false
        }));
      } else {
        // Move to next item
        const nextItemProgress = sessionState.items[nextIndex];
        const nextItem = await engine.getReviewItem(nextItemProgress.itemId);

        const updatedSessionState: SessionState = {
          ...sessionState,
          currentIndex: nextIndex,
          completed: [...sessionState.completed, reviewResult],
          stats: newStats
        };

        setState(prev => ({
          ...prev,
          sessionState: updatedSessionState,
          currentItem: nextItem
        }));
      }

    } catch (error) {
      console.error('Failed to submit review:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit review'
      }));
    }
  };

  // End session and get summary
  const endSession = async (): Promise<SessionSummary | null> => {
    if (!state.sessionState) {
      return null;
    }

    const { sessionState } = state;
    const endTime = new Date();
    const duration = (endTime.getTime() - sessionState.startTime.getTime()) / (1000 * 60); // minutes

    // Calculate items needing work (rated AGAIN or HARD)
    const itemsNeedingWork = sessionState.completed
      .filter(result => result.response.rating <= 2)
      .map(result => result.itemId);

    // Generate suggestions based on performance
    const suggestions: string[] = [];
    const accuracy = sessionState.stats.totalReviewed > 0 
      ? (sessionState.stats.correctAnswers / sessionState.stats.totalReviewed) * 100 
      : 0;

    if (accuracy < 50) {
      suggestions.push('Consider reviewing these items more frequently');
      suggestions.push('Try using different study modes for difficult items');
    } else if (accuracy < 75) {
      suggestions.push('Good progress! Focus on items you found difficult');
    } else {
      suggestions.push('Excellent work! You\'re mastering these items well');
    }

    if (sessionState.stats.averageResponseTime > 10) {
      suggestions.push('Try to respond more quickly to build fluency');
    }

    // Estimate next review time (simple heuristic)
    const nextReviewEstimate = new Date();
    nextReviewEstimate.setHours(nextReviewEstimate.getHours() + 4); // 4 hours default

    const summary: SessionSummary = {
      ...sessionState.stats,
      duration,
      itemsNeedingWork,
      nextReviewEstimate,
      suggestions
    };

    // Clear session state
    setState(prev => ({
      ...prev,
      sessionState: null,
      currentItem: null,
      isSessionActive: false
    }));

    sessionIdRef.current = null;
    return summary;
  };

  // Skip current item
  const skipItem = async () => {
    if (!state.sessionState || !engine) {
      return;
    }

    // Treat skip as a neutral response
    const skipResponse: ReviewResponse = {
      rating: 2, // HARD rating
      responseTime: 0,
      studyMode: 'recognition' as any,
      hintsUsed: true, // Mark as hint used since it was skipped
      context: { skipped: true }
    };

    await submitReview(skipResponse);
  };

  // Get current session statistics
  const getSessionStats = () => {
    if (!state.sessionState) {
      return null;
    }

    const { sessionState } = state;
    return {
      totalItems: sessionState.items.length,
      currentIndex: sessionState.currentIndex,
      completed: sessionState.completed.length,
      remaining: sessionState.items.length - sessionState.currentIndex,
      accuracy: sessionState.stats.totalReviewed > 0 
        ? (sessionState.stats.correctAnswers / sessionState.stats.totalReviewed) * 100 
        : 0
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.isSessionActive) {
        endSession();
      }
    };
  }, []);

  return {
    ...state,
    startSession,
    submitReview,
    endSession,
    skipItem,
    getSessionStats
  };
}