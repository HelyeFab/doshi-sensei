'use client';

import { useState, useEffect } from 'react';
import {
  ReviewDueWidget,
  ReviewSession,
  ProgressDashboard,
  NotificationSettings,
  useUnifiedReview
} from '@/components/unified-review';

type TabType = 'session' | 'dashboard' | 'settings';

export default function ReviewClient() {
  const [activeTab, setActiveTab] = useState<TabType>('session');
  const [showSession, setShowSession] = useState(false);
  const { engine, isLoading, isReady, getTotalDueCount } = useUnifiedReview();
  const [reviewStats, setReviewStats] = useState<any>(null);

  const handleStartReview = () => {
    setShowSession(true);
  };

  const handleSessionComplete = (summary: any) => {
    setShowSession(false);
    // Optionally show a completion toast or modal
    console.log('Review session completed:', summary);
  };

  const handleSessionCancel = () => {
    setShowSession(false);
  };

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
    { id: 'session' as TabType, label: 'Review Session', icon: '📝' },
    { id: 'dashboard' as TabType, label: 'Progress', icon: '📊' },
    { id: 'settings' as TabType, label: 'Settings', icon: '⚙️' }
  ];

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
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
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
            <h3 className="text-lg font-semibold text-foreground mb-3">How the Review System Works</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
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
            </div>
          </div>
        </div>

        {/* Bottom padding for navbar */}
        <div className="h-20"></div>
      </div>
    </div>
  );
}