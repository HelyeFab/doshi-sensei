'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useStrings } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUnifiedDataStore } from '@/services/review-store/UnifiedDataStore';
import { getEventBus } from '@/services/review-events/EventBus';
import { 
  ReviewEventType, 
  ReviewSource, 
  ReviewResult as EventReviewResult,
  EventPriority 
} from '@/services/review-events/types';
import { 
  UnifiedReviewItem, 
  ContentType,
  ReviewState,
  AlgorithmType 
} from '@/services/review-store/types';
import { Timestamp } from 'firebase/firestore';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import { DesktopContainer } from '@/components/layout/DesktopContainer';
import WeeklyActivityDashboard from '@/components/dashboard/WeeklyActivityDashboard';

interface ReviewStats {
  totalDue: number;
  completedToday: number;
  accuracy: number;
  streak: number;
  nextReview?: Date;
}

interface SourceFilter {
  source: ReviewSource;
  label: string;
  icon: string;
  count: number;
  enabled: boolean;
}

export default function ReviewHubClient() {
  const { user } = useAuth();
  const { subscriptionTier } = useSubscription2();
  const strings = useStrings();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Review data
  const [dueItems, setDueItems] = useState<UnifiedReviewItem[]>([]);
  const [currentItem, setCurrentItem] = useState<UnifiedReviewItem | null>(null);
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    totalDue: 0,
    completedToday: 0,
    accuracy: 0,
    streak: 0
  });
  
  // UI state
  const [showReviewSession, setShowReviewSession] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<ReviewSource>>(new Set());
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Load review data from unified store
  const loadReviewData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dataStore = getUnifiedDataStore();
      
      // Get due items from unified store
      const dueData = await dataStore.getDueItems({
        userId: user.uid,
        sources: selectedSources.size > 0 ? Array.from(selectedSources) : undefined,
        contentTypes: contentTypeFilter !== 'all' ? [contentTypeFilter] : undefined,
        includeOverdue: true,
        limit: 100
      });
      
      setDueItems(dueData.items);
      
      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCompleted = await dataStore.getCompletedToday(user.uid);
      const streak = await dataStore.getCurrentStreak(user.uid);
      
      setReviewStats({
        totalDue: dueData.total,
        completedToday: todayCompleted,
        accuracy: todayCompleted > 0 ? 85 : 0, // Placeholder, calculate from actual data
        streak: streak,
        nextReview: dueData.items[0]?.scheduling.dueDate instanceof Date 
          ? dueData.items[0].scheduling.dueDate 
          : dueData.items[0]?.scheduling.dueDate?.toDate?.()
      });
      
      // Set first item as current if available
      if (dueData.items.length > 0 && !currentItem) {
        setCurrentItem(dueData.items[0]);
      }
      
    } catch (err) {
      console.error('Failed to load review data:', err);
      setError('Failed to load review data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedSources, contentTypeFilter, currentItem]);

  // Setup event listeners
  useEffect(() => {
    const eventBus = getEventBus();
    
    // Listen for review events
    const unsubscribeReviewed = eventBus.subscribe(
      ReviewEventType.ITEM_REVIEWED,
      async (event) => {
        console.log('Item reviewed:', event);
        // Reload data after review
        await loadReviewData();
      }
    );
    
    const unsubscribeSynced = eventBus.subscribe(
      ReviewEventType.SYNC_COMPLETED,
      async (event) => {
        console.log('Sync completed:', event);
        setIsSyncing(false);
        await loadReviewData();
      }
    );
    
    return () => {
      unsubscribeReviewed();
      unsubscribeSynced();
    };
  }, [loadReviewData]);

  // Redirect non-authenticated users to login page with custom message
  useEffect(() => {
    // Mark that we've checked authentication
    setAuthChecked(true);
    
    if (!user) {
      // Redirect to login with a custom message for review system
      const params = new URLSearchParams({
        returnTo: '/review-hub',
        message: 'start-japanese-journey'
      });
      router.replace(`/login?${params.toString()}`);
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    if (user && authChecked) {
      loadReviewData();
    }
  }, [user, authChecked, loadReviewData]);

  // Handle review submission
  const handleReview = async (result: 'correct' | 'incorrect' | 'skip') => {
    if (!currentItem || !user) return;
    
    try {
      const dataStore = getUnifiedDataStore();
      const eventBus = getEventBus();
      
      // Record the review
      await dataStore.recordReview({
        userId: user.uid,
        itemId: currentItem.id,
        result: result === 'correct' ? EventReviewResult.CORRECT : 
                result === 'incorrect' ? EventReviewResult.INCORRECT : 
                EventReviewResult.SKIPPED,
        timeSpent: 5000, // Track actual time in production
        source: currentItem.sourceType,
        metadata: {
          contentType: currentItem.contentType,
          difficulty: currentItem.metadata?.difficulty
        }
      });
      
      // Emit review event
      eventBus.emit({
        type: ReviewEventType.ITEM_REVIEWED,
        source: currentItem.sourceType,
        userId: user.uid,
        data: {
          itemId: currentItem.id,
          result: result === 'correct' ? EventReviewResult.CORRECT : 
                  result === 'incorrect' ? EventReviewResult.INCORRECT : 
                  EventReviewResult.SKIPPED,
          timeSpent: 5000
        },
        priority: EventPriority.HIGH
      });
      
      // Move to next item
      const currentIndex = dueItems.findIndex(item => item.id === currentItem.id);
      if (currentIndex < dueItems.length - 1) {
        setCurrentItem(dueItems[currentIndex + 1]);
      } else {
        setCurrentItem(null);
        setShowReviewSession(false);
      }
      
      // Update stats
      await loadReviewData();
      
    } catch (err) {
      console.error('Failed to record review:', err);
      setError('Failed to save review. Please try again.');
    }
  };

  // Manual sync trigger
  const triggerSync = async () => {
    setIsSyncing(true);
    const dataStore = getUnifiedDataStore();
    
    try {
      await dataStore.syncWithRemote(user?.uid || '');
      await loadReviewData();
    } catch (err) {
      console.error('Sync failed:', err);
      setError('Sync failed. Please check your connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Show loading while checking auth or redirecting
  if (!user && authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mobile-nav-padding">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Redirecting to login...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Don't render anything while auth is being checked
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading review data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Smart Header with sync button */}
      <SmartPageHeader 
        title="Review Hub"
        backHref="/"
        rightContent={
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
            aria-label={isSyncing ? "Syncing..." : "Sync data"}
          >
            <svg 
              className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>
        }
      />

      {/* Desktop Container with proper constraints */}
      <DesktopContainer>
        <MobileAwareContainer className="px-4 py-6">
          {/* Weekly Activity Dashboard */}
          <WeeklyActivityDashboard />
          
          {/* Stats Bar */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Today's Overview</h2>
              {/* Settings Toggle */}
              <button
                onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{reviewStats.totalDue}</p>
                <p className="text-sm text-muted-foreground">Due Now</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{reviewStats.completedToday}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-info">{reviewStats.accuracy}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{reviewStats.streak}</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          {/* Main Content */}
          {showReviewSession && currentItem ? (
            // Review Session
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-lg shadow-sm border border-border p-6"
            >
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-foreground">Review Session</h2>
                <button
                  onClick={() => setShowReviewSession(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close review session"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="text-center py-12">
                <div className="mb-4">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {currentItem.contentType} • {currentItem.sourceType}
                  </span>
                </div>
                
                <div className="text-4xl font-bold mb-4 text-foreground">
                  {currentItem.content.primary}
                </div>
                
                {currentItem.content.secondary && (
                  <div className="text-xl text-muted-foreground mb-2">
                    {currentItem.content.secondary}
                  </div>
                )}
                
                {currentItem.content.reading && (
                  <div className="text-lg text-muted-foreground">
                    {currentItem.content.reading}
                  </div>
                )}
              </div>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => handleReview('incorrect')}
                  className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                >
                  Incorrect
                </button>
                <button
                  onClick={() => handleReview('skip')}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => handleReview('correct')}
                  className="px-6 py-3 bg-success text-success-foreground rounded-lg hover:bg-success/90 transition-colors"
                >
                  Correct
                </button>
              </div>
            </motion.div>
          ) : (
            // Dashboard View
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-lg font-semibold mb-4 text-foreground">Quick Actions</h2>
                
                {dueItems.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You have {dueItems.length} items ready for review
                    </p>
                    <button
                      onClick={() => {
                        setCurrentItem(dueItems[0]);
                        setShowReviewSession(true);
                      }}
                      className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Start Review Session
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-16 h-16 mx-auto mb-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>All caught up! No reviews due right now.</p>
                    {reviewStats.nextReview && (
                      <p className="text-sm mt-2">
                        Next review: {reviewStats.nextReview.toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Due Items List */}
              {dueItems.length > 0 && (
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-lg font-semibold mb-4 text-foreground">Due Items</h2>
                  <div className="space-y-2">
                    {dueItems.slice(0, 10).map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.content.primary}</span>
                          <div className="text-sm text-muted-foreground">
                            <p>{item.content.secondary}</p>
                            <p className="text-xs">{item.contentType} • {item.sourceType}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setCurrentItem(item);
                            setShowReviewSession(true);
                          }}
                          className="px-4 py-2 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                        >
                          Review
                        </button>
                      </div>
                    ))}
                    
                    {dueItems.length > 10 && (
                      <p className="text-center text-sm text-muted-foreground pt-2">
                        And {dueItems.length - 10} more items...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom padding for mobile navbar */}
          <div className="h-20 md:h-0"></div>
        </MobileAwareContainer>
      </DesktopContainer>

      {/* Notification Settings Modal */}
      <AnimatePresence>
        {showNotificationSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowNotificationSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Notification Settings</h3>
                <button
                  onClick={() => setShowNotificationSettings(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg p-1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Daily review reminders</span>
                  <input
                    type="checkbox"
                    className="rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Golden time notifications</span>
                  <input
                    type="checkbox"
                    className="rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                    defaultChecked
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Achievement alerts</span>
                  <input
                    type="checkbox"
                    className="rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-0"
                  />
                </div>

                {subscriptionTier !== 'monthly' && subscriptionTier !== 'yearly' && (
                  <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary">
                      🔄 Upgrade for cross-device sync and advanced notification scheduling.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}