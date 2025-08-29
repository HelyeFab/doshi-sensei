'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import { getEventBus } from '@/services/review-events/EventBus';
import { getUnifiedDataStore } from '@/services/review-store/UnifiedDataStore';
import { ReviewEventType, ReviewSource, ReviewResult } from '@/services/review-events/types';
import { UnifiedReviewItem, ContentType } from '@/services/review-store/types';
import { motion, AnimatePresence } from 'framer-motion';

interface ReviewStats {
  totalDue: number;
  overdueCount: number;
  dueTodayCount: number;
  dueTomorrowCount: number;
  completedToday: number;
  currentStreak: number;
  accuracy: number;
}

interface SourceStatus {
  source: ReviewSource;
  name: string;
  icon: string;
  dueCount: number;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  lastSync?: Date;
  enabled: boolean;
}

export default function UnifiedReviewHub() {
  const { user } = useAuth();
  const strings = useStrings();
  const [stats, setStats] = useState<ReviewStats>({
    totalDue: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    dueTomorrowCount: 0,
    completedToday: 0,
    currentStreak: 0,
    accuracy: 0
  });
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [currentItem, setCurrentItem] = useState<UnifiedReviewItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedSources, setSelectedSources] = useState<Set<ReviewSource>>(new Set());
  const [contentFilter, setContentFilter] = useState<ContentType | 'all'>('all');

  // Initialize and load data
  useEffect(() => {
    if (!user) return;

    loadReviewData();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, [user]);

  const loadReviewData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const dataStore = getUnifiedDataStore();
      
      // Get due items from all sources
      const dueData = await dataStore.getDueItems({
        userId: user.uid,
        sources: selectedSources.size > 0 ? Array.from(selectedSources) : undefined,
        contentTypes: contentFilter !== 'all' ? [contentFilter] : undefined,
        includeOverdue: true
      });

      // Update stats
      setStats({
        totalDue: dueData.total,
        overdueCount: dueData.overdue,
        dueTodayCount: dueData.dueToday,
        dueTomorrowCount: dueData.dueTomorrow,
        completedToday: await getCompletedToday(user.uid),
        currentStreak: await getCurrentStreak(user.uid),
        accuracy: await getTodayAccuracy(user.uid)
      });

      // Update source statuses
      const sourceStatuses = await getSourceStatuses(user.uid);
      setSources(sourceStatuses);

      // Load first item if available
      if (dueData.items.length > 0) {
        setCurrentItem(dueData.items[0]);
      }
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupEventListeners = () => {
    const eventBus = getEventBus();

    // Listen for review completions
    eventBus.subscribe(
      ReviewEventType.ITEM_REVIEWED,
      handleItemReviewed
    );

    // Listen for sync updates
    eventBus.subscribe(
      ReviewEventType.SYNC_STARTED,
      handleSyncStarted
    );

    eventBus.subscribe(
      ReviewEventType.SYNC_COMPLETED,
      handleSyncCompleted
    );

    // Listen for real-time updates
    eventBus.subscribe(
      ReviewEventType.ITEM_UPDATED,
      handleItemUpdated
    );
  };

  const cleanupEventListeners = () => {
    // Event bus handles cleanup automatically
  };

  const handleItemReviewed = async (event: any) => {
    // Update stats
    setStats(prev => ({
      ...prev,
      completedToday: prev.completedToday + 1,
      accuracy: calculateNewAccuracy(prev.accuracy, event.data.result === ReviewResult.CORRECT)
    }));

    // Load next item
    loadNextItem();
  };

  const handleSyncStarted = () => {
    setIsSyncing(true);
  };

  const handleSyncCompleted = () => {
    setIsSyncing(false);
    loadReviewData(); // Refresh data after sync
  };

  const handleItemUpdated = (event: any) => {
    // Update current item if it's the one being updated
    if (currentItem && currentItem.id === event.data.itemId) {
      loadReviewData();
    }
  };

  const loadNextItem = async () => {
    if (!user) return;

    const dataStore = getUnifiedDataStore();
    const dueData = await dataStore.getDueItems({
      userId: user.uid,
      sources: selectedSources.size > 0 ? Array.from(selectedSources) : undefined,
      contentTypes: contentFilter !== 'all' ? [contentFilter] : undefined,
      limit: 1
    });

    if (dueData.items.length > 0) {
      setCurrentItem(dueData.items[0]);
    } else {
      setCurrentItem(null);
    }
  };

  const handleReview = async (rating: number) => {
    if (!user || !currentItem) return;

    const dataStore = getUnifiedDataStore();
    const eventBus = getEventBus();

    try {
      // Record the review
      await dataStore.recordReview({
        userId: user.uid,
        itemId: currentItem.id,
        source: currentItem.sourceType,
        result: rating >= 3 ? ReviewResult.CORRECT : ReviewResult.INCORRECT,
        rating,
        responseTime: 0, // Would track actual time
        metadata: {
          contentType: currentItem.contentType,
          studyMode: 'recognition'
        }
      });

      // The event will be emitted automatically by the data store
    } catch (error) {
      console.error('Failed to record review:', error);
    }
  };

  const toggleSourceFilter = (source: ReviewSource) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(source)) {
        newSet.delete(source);
      } else {
        newSet.add(source);
      }
      return newSet;
    });
  };

  // Helper functions
  const getCompletedToday = async (userId: string): Promise<number> => {
    // This would query the actual completed count from the data store
    return 0;
  };

  const getCurrentStreak = async (userId: string): Promise<number> => {
    // This would calculate the current streak from review history
    return 0;
  };

  const getTodayAccuracy = async (userId: string): Promise<number> => {
    // This would calculate today's accuracy from review results
    return 85;
  };

  const calculateNewAccuracy = (currentAccuracy: number, isCorrect: boolean): number => {
    // Simple weighted average
    const weight = 0.1;
    const newValue = isCorrect ? 100 : 0;
    return Math.round(currentAccuracy * (1 - weight) + newValue * weight);
  };

  const getSourceStatuses = async (userId: string): Promise<SourceStatus[]> => {
    // This would get the actual status of each source
    return [
      {
        source: ReviewSource.KANJI_MASTERY,
        name: 'Kanji Mastery',
        icon: '🈷️',
        dueCount: 15,
        syncStatus: 'synced',
        lastSync: new Date(),
        enabled: true
      },
      {
        source: ReviewSource.TEXTBOOK_VOCAB,
        name: 'Textbook Vocabulary',
        icon: '📚',
        dueCount: 23,
        syncStatus: 'synced',
        lastSync: new Date(),
        enabled: true
      },
      {
        source: ReviewSource.FLASHCARDS,
        name: 'Flashcards',
        icon: '🗃️',
        dueCount: 8,
        syncStatus: 'synced',
        lastSync: new Date(),
        enabled: true
      },
      {
        source: ReviewSource.DRILLS,
        name: 'Practice Drills',
        icon: '🎯',
        dueCount: 5,
        syncStatus: 'synced',
        lastSync: new Date(),
        enabled: true
      },
      {
        source: ReviewSource.GAMES,
        name: 'Games',
        icon: '🎮',
        dueCount: 12,
        syncStatus: 'synced',
        lastSync: new Date(),
        enabled: true
      }
    ];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with sync indicator */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              Review Hub
            </h1>
            <div className="flex items-center gap-4">
              {isSyncing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-blue-600"
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Syncing...
                </motion.div>
              )}
              <button
                onClick={loadReviewData}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalDue}</div>
              <div className="text-xs text-gray-500">Total Due</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
              <div className="text-xs text-gray-500">Overdue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.dueTodayCount}</div>
              <div className="text-xs text-gray-500">Due Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.dueTomorrowCount}</div>
              <div className="text-xs text-gray-500">Tomorrow</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completedToday}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.currentStreak}🔥</div>
              <div className="text-xs text-gray-500">Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.accuracy}%</div>
              <div className="text-xs text-gray-500">Accuracy</div>
            </div>
          </div>
        </div>
      </div>

      {/* Source Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {sources.map(source => (
              <button
                key={source.source}
                onClick={() => toggleSourceFilter(source.source)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedSources.has(source.source)
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{source.icon}</span>
                <span>{source.name}</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                  {source.dueCount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Review Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentItem ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-lg shadow-lg p-8"
            >
              {/* Source Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100">
                  {sources.find(s => s.source === currentItem.sourceType)?.icon} 
                  {' '}
                  {sources.find(s => s.source === currentItem.sourceType)?.name}
                </span>
                <span className="text-sm text-gray-500">
                  {currentItem.contentType}
                </span>
              </div>

              {/* Content */}
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  {currentItem.content.primary}
                </h2>
                {currentItem.content.secondary && (
                  <p className="text-xl text-gray-600 mb-2">
                    {currentItem.content.secondary}
                  </p>
                )}
                {currentItem.content.meaning && (
                  <p className="text-lg text-gray-500">
                    {currentItem.content.meaning}
                  </p>
                )}
              </div>

              {/* Rating Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleReview(1)}
                  className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Again
                </button>
                <button
                  onClick={() => handleReview(2)}
                  className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Hard
                </button>
                <button
                  onClick={() => handleReview(3)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Good
                </button>
                <button
                  onClick={() => handleReview(4)}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Easy
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              All caught up!
            </h2>
            <p className="text-gray-600">
              You've completed all your reviews for now. Great job!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}