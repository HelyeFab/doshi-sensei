'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewSourceRegistry } from '@/lib/review-sources/registry';
import { 
  ReviewSource, 
  AggregatedStats, 
  SourcePriority,
  GroupedReviewItems,
  ReviewSourceEvent 
} from '@/lib/review-sources/review-source.interface';
import {
  REVIEW_SOURCE_CONFIGS,
  PRIORITY_CONFIGS,
  CONTENT_TYPE_CONFIGS,
  TIME_CONSTANTS
} from '@/lib/review-sources/constants';
import { ContentType, StudyMode } from '@/lib/unified-review/types';

// Mock implementations for review sources (would be actual implementations)
import { createTextbookVocabularySource } from '@/lib/review-sources/sources/textbook-vocabulary';
import { createKanjiMasterySource } from '@/lib/review-sources/sources/kanji-mastery';
import { createFlashcardsSource } from '@/lib/review-sources/sources/flashcards';

interface UnifiedReviewHubProps {
  className?: string;
}

interface GoldenTimeStatus {
  isActive: boolean;
  nextWindow?: {
    type: 'morning' | 'evening';
    startsAt: Date;
    duration: number; // minutes
  };
  currentBonus?: number; // multiplier
}

const UnifiedReviewHub: React.FC<UnifiedReviewHubProps> = ({ className = '' }) => {
  const router = useRouter();
  const { user, userType, subscriptionTier } = useAuth();
  
  // Registry and data state
  const [registry, setRegistry] = useState<ReviewSourceRegistry | null>(null);
  const [aggregatedStats, setAggregatedStats] = useState<AggregatedStats | null>(null);
  const [groupedItems, setGroupedItems] = useState<GroupedReviewItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [priorityEditMode, setPriorityEditMode] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [draggedSourceId, setDraggedSourceId] = useState<string | null>(null);

  // Initialize registry and sources
  useEffect(() => {
    const initializeRegistry = async () => {
      try {
        setLoading(true);
        
        // Create registry instance
        const registryInstance = ReviewSourceRegistry.getInstance({
          debug: process.env.NODE_ENV === 'development'
        });

        // Register available sources
        await registryInstance.register(
          await createTextbookVocabularySource(user?.uid),
          SourcePriority.HIGH
        );
        
        await registryInstance.register(
          await createKanjiMasterySource(user?.uid),
          SourcePriority.HIGH
        );
        
        await registryInstance.register(
          await createFlashcardsSource(user?.uid),
          SourcePriority.MEDIUM
        );

        // Initialize the registry
        await registryInstance.init();
        
        setRegistry(registryInstance);
      } catch (err) {
        console.error('Failed to initialize registry:', err);
        setError('Failed to initialize review system');
      } finally {
        setLoading(false);
      }
    };

    initializeRegistry();
  }, [user?.uid]);

  // Load data when registry is ready
  useEffect(() => {
    if (!registry) return;

    const loadData = async () => {
      try {
        const [stats, items] = await Promise.all([
          registry.getAggregatedStats(),
          registry.getAllDueItems({ limit: 200 })
        ]);
        
        setAggregatedStats(stats);
        setGroupedItems(items);
      } catch (err) {
        console.error('Failed to load review data:', err);
        setError('Failed to load review data');
      }
    };

    // Load initial data
    loadData();

    // Set up event listeners for real-time updates
    const handleSourceUpdate = () => {
      loadData(); // Refresh data when sources update
    };

    registry.addEventListener(ReviewSourceEvent.ITEMS_UPDATED, handleSourceUpdate);
    registry.addEventListener(ReviewSourceEvent.CONFIG_CHANGED, handleSourceUpdate);
    registry.addEventListener(ReviewSourceEvent.STATS_UPDATED, handleSourceUpdate);

    return () => {
      registry.removeEventListener(ReviewSourceEvent.ITEMS_UPDATED, handleSourceUpdate);
      registry.removeEventListener(ReviewSourceEvent.CONFIG_CHANGED, handleSourceUpdate);
      registry.removeEventListener(ReviewSourceEvent.STATS_UPDATED, handleSourceUpdate);
    };
  }, [registry]);

  // Calculate golden time status (function to recalculate on every render for tests)
  const getGoldenTimeStatus = (): GoldenTimeStatus => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Create a time value in minutes since midnight for precise comparison
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const morningStartMinutes = TIME_CONSTANTS.GOLDEN_TIME.MORNING_START * 60;
    const morningEndMinutes = TIME_CONSTANTS.GOLDEN_TIME.MORNING_END * 60;
    const eveningStartMinutes = TIME_CONSTANTS.GOLDEN_TIME.EVENING_START * 60;
    const eveningEndMinutes = TIME_CONSTANTS.GOLDEN_TIME.EVENING_END * 60;
    
    
    // Check if we're in golden time
    // Morning: 7:00 AM (420 min) to 9:59 AM (599 min)
    // Evening: 6:00 PM (1080 min) to 8:59 PM (1259 min)  
    const inMorningWindow = currentTimeInMinutes >= morningStartMinutes && 
                           currentTimeInMinutes < morningEndMinutes;
    const inEveningWindow = currentTimeInMinutes >= eveningStartMinutes && 
                           currentTimeInMinutes < eveningEndMinutes;
    
    if (inMorningWindow || inEveningWindow) {
      return {
        isActive: true,
        currentBonus: TIME_CONSTANTS.GOLDEN_TIME.BONUS_MULTIPLIER
      };
    }

    // Calculate next window
    let nextWindow;
    if (currentHour < TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) {
      // Before morning window
      const startsAt = new Date(now);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.MORNING_START, 0, 0, 0);
      nextWindow = {
        type: 'morning' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.MORNING_END - TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) * 60
      };
    } else if (currentHour < TIME_CONSTANTS.GOLDEN_TIME.EVENING_START) {
      // Between windows
      const startsAt = new Date(now);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.EVENING_START, 0, 0, 0);
      nextWindow = {
        type: 'evening' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.EVENING_END - TIME_CONSTANTS.GOLDEN_TIME.EVENING_START) * 60
      };
    } else {
      // After evening window - next morning
      const startsAt = new Date(now);
      startsAt.setDate(startsAt.getDate() + 1);
      startsAt.setHours(TIME_CONSTANTS.GOLDEN_TIME.MORNING_START, 0, 0, 0);
      nextWindow = {
        type: 'morning' as const,
        startsAt,
        duration: (TIME_CONSTANTS.GOLDEN_TIME.MORNING_END - TIME_CONSTANTS.GOLDEN_TIME.MORNING_START) * 60
      };
    }

    return {
      isActive: false,
      nextWindow
    };
  };

  // Get golden time status (calculated fresh each render for test compatibility)
  const goldenTimeStatus = getGoldenTimeStatus();

  // Priority management handlers
  const handlePriorityChange = useCallback(async (sourceId: string, newPriority: SourcePriority) => {
    if (!registry) return;
    
    try {
      registry.updateSourcePriority(sourceId, newPriority);
      // Data will refresh via event listener
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  }, [registry]);

  const handleSourceToggle = useCallback(async (sourceId: string, enabled: boolean) => {
    if (!registry) return;
    
    try {
      registry.setSourceEnabled(sourceId, enabled);
      // Data will refresh via event listener
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  }, [registry]);

  // Navigation helpers
  const navigateToSource = useCallback((path: string) => {
    // Store return path in session storage
    sessionStorage.setItem('reviewReturnPath', '/review');
    router.push(`${path}?returnTo=/review`);
  }, [router]);

  const startUnifiedReview = useCallback(() => {
    sessionStorage.setItem('reviewReturnPath', '/review');
    router.push('/review/session');
  }, [router]);

  // Get prioritized sources for display
  const prioritizedSources = useMemo(() => {
    if (!registry) return [];
    return registry.getPrioritizedSources();
  }, [registry]);

  // Check if user has paid subscription (monthly or yearly)
  const isPremium = useMemo(() => {
    return subscriptionTier === 'monthly' || subscriptionTier === 'yearly';
  }, [subscriptionTier]);

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="mobile-nav-padding">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="mobile-nav-padding">
          <div className="px-4 py-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Review Hub</h2>
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="mobile-nav-padding">
        {/* Header */}
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review Hub</h1>
              <p className="text-gray-600">Unified spaced repetition system</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Golden Time Indicator */}
              <AnimatePresence>
                {goldenTimeStatus.isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200 rounded-lg"
                  >
                    <span className="text-amber-600 text-sm font-medium">🌅 Golden Time</span>
                    <span className="text-amber-700 text-xs">
                      {goldenTimeStatus.currentBonus}× bonus
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Settings Toggle */}
              <button
                onClick={() => setShowNotificationSettings(!showNotificationSettings)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Aggregated Statistics - Premium Only */}
        {isPremium && aggregatedStats ? (
          <div className="px-4 pb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Today's Overview</h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Due Today */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {aggregatedStats.totals.dueToday}
                  </div>
                  <div className="text-sm text-gray-600">Due Today</div>
                  {aggregatedStats.totals.overdue > 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      +{aggregatedStats.totals.overdue} overdue
                    </div>
                  )}
                </div>

                {/* Study Streak */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {aggregatedStats.performance.studyStreak}
                  </div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                  <div className="text-xs text-orange-500 mt-1">
                    🔥 Keep it up!
                  </div>
                </div>

                {/* Retention Rate */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {(aggregatedStats.performance.overallRetention * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600">Retention</div>
                  <div className="text-xs text-green-500 mt-1">
                    {aggregatedStats.performance.overallRetention >= 0.8 ? '✨ Excellent' : 
                     aggregatedStats.performance.overallRetention >= 0.6 ? '👍 Good' : '💪 Improving'}
                  </div>
                </div>

                {/* Total Items */}
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {aggregatedStats.totals.items.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Items</div>
                  <div className="text-xs text-blue-500 mt-1">
                    {aggregatedStats.totals.activeSources} sources
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !isPremium ? (
          /* Upgrade Prompt for Non-Premium Users */
          <div className="px-4 pb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-blue-900 mb-2">Unlock Detailed Statistics</h2>
                  <p className="text-blue-700 text-sm">
                    Get insights into your learning progress with detailed statistics, streaks, and retention metrics.
                  </p>
                </div>
                <Link
                  href="/subscription"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                >
                  Upgrade Now →
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Quick Actions - Available to All Users */}
        <div className="px-4 pb-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={startUnifiedReview}
              disabled={!aggregatedStats || aggregatedStats.totals.dueToday === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                aggregatedStats && aggregatedStats.totals.dueToday > 0
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Review {aggregatedStats ? `(${aggregatedStats.totals.dueToday})` : ''}
            </button>
            
            <button
              onClick={() => setPriorityEditMode(!priorityEditMode)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
              {priorityEditMode ? 'Done' : 'Manage Priorities'}
            </button>

            {goldenTimeStatus.nextWindow && !goldenTimeStatus.isActive && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Next golden time: {goldenTimeStatus.nextWindow.type} ({new Date(goldenTimeStatus.nextWindow.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </div>
            )}
          </div>
        </div>

        {/* Review Source Cards */}
        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Review Sources</h2>
            {priorityEditMode && (
              <span className="text-sm text-gray-500">Drag to reorder priority</span>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {prioritizedSources.map((source) => {
                const config = REVIEW_SOURCE_CONFIGS[source.type];
                const userPrefs = registry?.getUserPreferences();
                const isEnabled = userPrefs?.enabled[source.id] !== false;
                const priority = userPrefs?.priorities[source.id] || SourcePriority.MEDIUM;
                const priorityConfig = PRIORITY_CONFIGS[priority];
                const sourceStats = aggregatedStats?.bySource[source.id];
                const sourceItems = groupedItems?.bySource[source.id];

                return (
                  <motion.div
                    key={source.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={`bg-white rounded-lg shadow-sm border transition-all ${
                      isEnabled ? 'border-gray-100 hover:shadow-md' : 'border-gray-200 opacity-60'
                    } ${priorityEditMode ? 'cursor-move' : 'cursor-pointer'}`}
                    onClick={!priorityEditMode ? () => navigateToSource(config.paths.main) : undefined}
                    draggable={priorityEditMode}
                    onDragStart={() => setDraggedSourceId(source.id)}
                    onDragEnd={() => setDraggedSourceId(null)}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{config.icon}</div>
                          <div>
                            <h3 className="font-medium text-gray-900">{config.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{config.description}</p>
                          </div>
                        </div>
                        
                        {priorityEditMode && (
                          <div className="flex flex-col items-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSourceToggle(source.id, !isEnabled);
                              }}
                              className={`w-8 h-4 rounded-full transition-colors ${
                                isEnabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                                isEnabled ? 'translate-x-4' : 'translate-x-0.5'
                              }`} />
                            </button>
                            
                            <select
                              value={priority}
                              onChange={(e) => {
                                e.stopPropagation();
                                handlePriorityChange(source.id, parseInt(e.target.value) as SourcePriority);
                              }}
                              className="text-xs border border-gray-200 rounded px-1 py-0.5"
                            >
                              {Object.entries(PRIORITY_CONFIGS).map(([value, config]) => (
                                <option key={value} value={value}>
                                  {config.icon} {config.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      {sourceStats && isEnabled && (
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-red-600">
                              {sourceStats.dueToday}
                            </div>
                            <div className="text-xs text-gray-500">Due</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-blue-600">
                              {sourceStats.totalItems}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-green-600">
                              {(sourceStats.retentionRate * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-500">Rate</div>
                          </div>
                        </div>
                      )}

                      {/* Priority Badge */}
                      <div className="flex items-center justify-between">
                        <div
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${priorityConfig.color}20`,
                            color: priorityConfig.color
                          }}
                        >
                          <span>{priorityConfig.icon}</span>
                          <span>{priorityConfig.label}</span>
                        </div>

                        {!priorityEditMode && isEnabled && (
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>

                      {/* Preview Items */}
                      {sourceItems && sourceItems.items.length > 0 && isEnabled && !priorityEditMode && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-500 mb-2">Next items:</div>
                          <div className="flex flex-wrap gap-1">
                            {sourceItems.items.slice(0, 3).map((item, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-50 text-xs rounded"
                              >
                                {item.content.primary}
                              </span>
                            ))}
                            {sourceItems.items.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{sourceItems.items.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Disabled State */}
                      {!isEnabled && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400 text-center">Source disabled</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Notification Settings Modal */}
        <AnimatePresence>
          {showNotificationSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowNotificationSettings(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Notification Settings</h3>
                  <button
                    onClick={() => setShowNotificationSettings(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Daily review reminders</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Golden time notifications</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Achievement alerts</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  
                  {!isPremium && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        🔄 Upgrade to Premium for cross-device sync and advanced notification scheduling.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insights Section */}
        {aggregatedStats?.insights && (
          <div className="px-4 pb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
              
              <div className="space-y-3">
                {aggregatedStats.insights.recommendations.map((recommendation, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-blue-600 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-700 flex-1">{recommendation}</p>
                  </div>
                ))}
              </div>

              {aggregatedStats.insights.nextReviewEstimate && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Next review estimate:</span>{' '}
                    {aggregatedStats.insights.nextReviewEstimate.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
      </div>
    </div>
  );
};

export default UnifiedReviewHub;