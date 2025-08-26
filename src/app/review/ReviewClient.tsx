'use client';

import { useState, useEffect } from 'react';
import {
  ReviewDueWidget,
  ReviewSession,
  ProgressDashboard,
  NotificationSettings,
  useUnifiedReview
} from '@/components/unified-review';
import { useLearnTracking } from '@/hooks/useLearnTracking';
import { LearningEvent, UserLearningStats } from '@/types/analytics';

type TabType = 'activity' | 'session' | 'dashboard' | 'settings';

export default function ReviewClient() {
  const [activeTab, setActiveTab] = useState<TabType>('activity');
  const [showSession, setShowSession] = useState(false);
  const { engine, isLoading, isReady, getTotalDueCount } = useUnifiedReview();
  const [reviewStats, setReviewStats] = useState<any>(null);
  
  // Universal Learning Analytics
  const { getStats, getRecentEvents } = useLearnTracking();
  const [learningStats, setLearningStats] = useState<UserLearningStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<LearningEvent[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const handleStartReview = () => {
    setShowSession(true);
  };

  const handleSessionComplete = (summary: any) => {
    setShowSession(false);
    // Optionally show a completion toast or modal
    console.log('Review session completed:', summary);
    // Refresh analytics after review
    loadAnalytics();
  };

  const handleSessionCancel = () => {
    setShowSession(false);
  };

  // Load analytics data
  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [stats, events] = await Promise.all([
        getStats(),
        getRecentEvents(100)
      ]);
      setLearningStats(stats);
      setRecentEvents(events);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Load review stats when engine is ready
  useEffect(() => {
    const loadStats = async () => {
      if (!isReady || !engine) return;
      
      try {
        const dueCount = await getTotalDueCount();
        const stats = await engine.getStats();
        
        setReviewStats({
          dueCount,
          totalItems: stats.totalItems,
          streak: stats.studyStreak,
          accuracy: stats.retentionRate
        });
      } catch (error) {
        console.error('Failed to load review stats:', error);
      }
    };

    loadStats();
  }, [isReady, engine, getTotalDueCount]);

  const tabs = [
    { id: 'activity' as TabType, label: 'Learning Activity', icon: '📊' },
    { id: 'session' as TabType, label: 'Review Session', icon: '📝' },
    { id: 'dashboard' as TabType, label: 'Progress', icon: '📈' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' }
  ];

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get emoji for event type
  const getEventEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      view: '👁️',
      search: '🔍',
      practice: '📝',
      test: '📋',
      success: '✅',
      failure: '❌',
      save: '💾',
      complete: '🎯',
      abandon: '🚪'
    };
    return emojiMap[type] || '📌';
  };

  // Get color for category
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      kanji: 'text-purple-600 bg-purple-100',
      vocabulary: 'text-blue-600 bg-blue-100',
      grammar: 'text-green-600 bg-green-100',
      kana: 'text-pink-600 bg-pink-100',
      article: 'text-orange-600 bg-orange-100',
      video: 'text-red-600 bg-red-100',
      game: 'text-indigo-600 bg-indigo-100',
      drill: 'text-yellow-600 bg-yellow-100'
    };
    return colorMap[category] || 'text-gray-600 bg-gray-100';
  };

  if (showSession) {
    return (
      <div className="min-h-screen bg-background">
        <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
          <ReviewSession
            onSessionComplete={handleSessionComplete}
            onSessionCancel={handleSessionCancel}
            showDetailedProgress={true}
            className="min-h-screen"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="md:mx-16 lg:mx-32 xl:mx-48 2xl:mx-64">
        {/* Review Due Widget - Always at top */}
        <div className="px-4 pt-4 pb-6">
          <ReviewDueWidget
            onStartReview={handleStartReview}
            showBreakdown={true}
            maxBreakdownItems={5}
            refreshInterval={60000} // Refresh every minute
            className="w-full"
          />
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-4">
          <div className="flex bg-card rounded-lg p-1 shadow-sm border border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-lg shadow-sm border border-border min-h-[400px]">
            {(isLoading || loadingAnalytics) && activeTab === 'activity' ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {activeTab === 'activity' && (
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Your Learning Activity</h2>
                    
                    {/* Learning Stats Overview */}
                    {learningStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg border border-purple-200">
                          <div className="text-3xl font-bold text-purple-700">{learningStats.uniqueKanji}</div>
                          <div className="text-sm text-purple-600">Unique Kanji</div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg border border-blue-200">
                          <div className="text-3xl font-bold text-blue-700">{learningStats.uniqueVocab}</div>
                          <div className="text-sm text-blue-600">Vocabulary</div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-green-100 to-green-50 rounded-lg border border-green-200">
                          <div className="text-3xl font-bold text-green-700">{learningStats.studyStreak}</div>
                          <div className="text-sm text-green-600">Day Streak 🔥</div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg border border-orange-200">
                          <div className="text-3xl font-bold text-orange-700">
                            {learningStats.learningVelocity.toFixed(1)}
                          </div>
                          <div className="text-sm text-orange-600">Items/Day</div>
                        </div>
                      </div>
                    )}

                    {/* Recent Activity Timeline */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {recentEvents.length === 0 ? (
                          <p className="text-muted-foreground text-center py-8">
                            No learning activity yet. Start studying to see your progress here!
                          </p>
                        ) : (
                          recentEvents.map((event) => (
                            <div 
                              key={event.id} 
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="text-2xl">{getEventEmoji(event.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(event.category)}`}>
                                    {event.category}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(event.timestamp)}
                                  </span>
                                </div>
                                <div className="font-medium text-foreground">
                                  {event.content.value}
                                </div>
                                {event.metrics && (
                                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                    {event.metrics.duration && (
                                      <span>⏱️ {Math.round(event.metrics.duration / 1000)}s</span>
                                    )}
                                    {event.metrics.accuracy !== undefined && (
                                      <span>🎯 {event.metrics.accuracy}%</span>
                                    )}
                                    {event.metrics.score !== undefined && (
                                      <span>⭐ {event.metrics.score}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Learning Insights */}
                    {learningStats && learningStats.patterns && (
                      <div className="mt-6 p-4 bg-muted rounded-lg">
                        <h3 className="text-md font-semibold text-foreground mb-3">Learning Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Best Study Time:</span>
                            <span className="ml-2 font-medium">{learningStats.patterns.bestTimeToStudy}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preferred Content:</span>
                            <span className="ml-2 font-medium capitalize">{learningStats.patterns.preferredContent}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Session:</span>
                            <span className="ml-2 font-medium">{learningStats.patterns.averageSessionLength} min</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Learning Style:</span>
                            <span className="ml-2 font-medium capitalize">{learningStats.patterns.learningStyle}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recently Studied Items */}
                    {learningStats && learningStats.recentItems && (
                      <div className="mt-6">
                        <h3 className="text-md font-semibold text-foreground mb-3">Recently Studied</h3>
                        <div className="space-y-2">
                          {learningStats.recentItems.kanji.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Kanji:</span>
                              <div className="flex gap-2 flex-wrap">
                                {learningStats.recentItems.kanji.map((k, i) => (
                                  <span key={i} className="text-2xl hover:scale-110 transition-transform cursor-pointer">
                                    {k}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {learningStats.recentItems.vocabulary.length > 0 && (
                            <div className="flex items-start gap-2">
                              <span className="text-sm text-muted-foreground">Words:</span>
                              <div className="flex gap-2 flex-wrap">
                                {learningStats.recentItems.vocabulary.map((v, i) => (
                                  <span key={i} className="px-2 py-1 bg-muted rounded text-sm">
                                    {v}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'session' && (
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Review Session</h2>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Start a review session to practice items that are due for review. 
                        The system will intelligently select items based on your learning progress 
                        and spaced repetition schedule.
                      </p>
                      
                      {reviewStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-foreground">{reviewStats.dueCount || 0}</div>
                            <div className="text-sm text-muted-foreground">Due Now</div>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-foreground">{reviewStats.totalItems || 0}</div>
                            <div className="text-sm text-muted-foreground">Total Items</div>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-foreground">{reviewStats.streak || 0}</div>
                            <div className="text-sm text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="text-center p-4 bg-muted rounded-lg">
                            <div className="text-2xl font-bold text-foreground">
                              {reviewStats.accuracy ? `${(reviewStats.accuracy * 100).toFixed(0)}%` : '0%'}
                            </div>
                            <div className="text-sm text-muted-foreground">Accuracy</div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center mt-8">
                        <button
                          onClick={handleStartReview}
                          disabled={!reviewStats?.dueCount}
                          className={`px-8 py-4 rounded-lg font-medium text-lg transition-all ${
                            reviewStats?.dueCount
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl'
                              : 'bg-muted text-muted-foreground cursor-not-allowed'
                          }`}
                        >
                          {reviewStats?.dueCount 
                            ? `Start Review (${reviewStats.dueCount} items)`
                            : 'No items due for review'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'dashboard' && (
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Progress Dashboard</h2>
                    <ProgressDashboard
                      defaultPeriod={7}
                      showDetailedStats={true}
                      className="w-full"
                    />
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-foreground mb-4">Notification Settings</h2>
                    <NotificationSettings
                      showAdvancedSettings={true}
                      onSettingsSaved={(preferences) => {
                        console.log('Settings saved:', preferences);
                        // Show success toast
                      }}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Help Section */}
        <div className="px-4 pb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {activeTab === 'activity' ? '🎯 Universal Learning Tracking' : 'How the Review System Works'}
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              {activeTab === 'activity' ? (
                <>
                  <p>
                    <strong>Everything you study is tracked!</strong> Every kanji you view, every word you search, 
                    every game you play - it all contributes to your learning profile.
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• <strong>Complete Knowledge Map:</strong> We track your exposure to every piece of content</li>
                    <li>• <strong>Smart Insights:</strong> Discover your learning patterns and optimal study times</li>
                    <li>• <strong>Blind Spot Detection:</strong> Find gaps in your knowledge automatically</li>
                    <li>• <strong>Contextual Learning:</strong> See how many times you've encountered each item</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    The Unified Review Engine uses spaced repetition to optimize your learning. 
                    Items you struggle with appear more frequently, while mastered items appear less often.
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• <strong>FSRS Algorithm:</strong> State-of-the-art spaced repetition with forgetting curves</li>
                    <li>• <strong>Smart Scheduling:</strong> Reviews scheduled at optimal times for retention</li>
                    <li>• <strong>Progress Tracking:</strong> Detailed analytics on your learning progress</li>
                    <li>• <strong>Notifications:</strong> Customizable reminders for review sessions</li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom padding for navbar */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}