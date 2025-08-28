'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import SmartHeader from '@/components/SmartHeader';

export default function StatsPage() {
  const strings = useStrings();
  const { user } = useAuth();
  const { stats, activities, loading: statsLoading, refreshStats } = useStats();
  
  // Get achievement badges
  const getAchievementLevel = (total: number, type: string) => {
    const thresholds = {
      reading: [
        { min: 100, badge: '🎓', label: 'Scholar' },
        { min: 50, badge: '🚀', label: 'Speed Reader' },
        { min: 25, badge: '📚', label: 'Bookworm' },
        { min: 10, badge: '⭐', label: 'Rising Star' },
        { min: 5, badge: '🎯', label: 'Getting Started' },
        { min: 1, badge: '📰', label: 'First Steps' }
      ],
      kanji: [
        { min: 500, badge: '🏆', label: 'Kanji Master' },
        { min: 200, badge: '💎', label: 'Kanji Expert' },
        { min: 100, badge: '🌟', label: 'Kanji Scholar' },
        { min: 50, badge: '📖', label: 'Kanji Student' },
        { min: 20, badge: '✨', label: 'Kanji Learner' },
        { min: 1, badge: '🔤', label: 'Beginner' }
      ],
      practice: [
        { min: 100, badge: '🥇', label: 'Practice Champion' },
        { min: 50, badge: '🥈', label: 'Practice Expert' },
        { min: 25, badge: '🥉', label: 'Practice Pro' },
        { min: 10, badge: '💪', label: 'Dedicated' },
        { min: 5, badge: '🎯', label: 'Consistent' },
        { min: 1, badge: '🌱', label: 'Started' }
      ]
    };
    
    const levels = thresholds[type] || thresholds.practice;
    return levels.find(l => total >= l.min) || { badge: '🌱', label: 'Beginner' };
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SmartHeader title="Learning Stats" />
        <div className="px-4 py-8 text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your stats</p>
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartHeader title="Learning Stats" />
      
      <div className="mobile-nav-padding px-4 pb-4">
        {statsLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Overall Progress Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Streak Card */}
              <div className="bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/20 dark:to-orange-800/10 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="text-3xl mb-1">{stats?.currentStreak > 0 ? '🔥' : '📅'}</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {stats?.currentStreak || 0}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-500">Day Streak</div>
                {stats?.longestStreak > 0 && (
                  <div className="text-xs text-orange-500 dark:text-orange-600 mt-1">
                    Best: {stats.longestStreak} days
                  </div>
                )}
              </div>
              
              {/* Total Activities */}
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="text-3xl mb-1">✨</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {stats?.totalActivities || 0}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-500">Total Activities</div>
                <div className="text-xs text-blue-500 dark:text-blue-600 mt-1">
                  {stats?.totalDaysActive || 0} active days
                </div>
              </div>
              
              {/* Accuracy */}
              <div className="bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="text-3xl mb-1">🎯</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {stats?.overallAccuracy || 0}%
                </div>
                <div className="text-sm text-green-600 dark:text-green-500">Accuracy</div>
                <div className="text-xs text-green-500 dark:text-green-600 mt-1">
                  {stats?.totalCorrectAnswers || 0}/{stats?.totalQuestionsAnswered || 0}
                </div>
              </div>
              
              {/* Learning Total */}
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/20 dark:to-purple-800/10 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-3xl mb-1">🎓</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {(stats?.totalKanjiLearned || 0) + (stats?.totalWordsLearned || 0)}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-500">Items Learned</div>
                <div className="text-xs text-purple-500 dark:text-purple-600 mt-1">
                  {stats?.totalKanjiLearned || 0} kanji, {stats?.totalWordsLearned || 0} words
                </div>
              </div>
            </div>
            
            {/* Activity Breakdown */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Reading Stats */}
              <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">📖</span> Reading Progress
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Articles Read</span>
                    <span className="font-semibold text-foreground">{stats?.articlesRead || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Stories Read</span>
                    <span className="font-semibold text-foreground">{stats?.storiesRead || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Reading</span>
                    <span className="font-bold text-primary">
                      {(stats?.articlesRead || 0) + (stats?.storiesRead || 0)}
                    </span>
                  </div>
                  
                  {/* Reading Achievement Badge */}
                  {(() => {
                    const total = (stats?.articlesRead || 0) + (stats?.storiesRead || 0);
                    const achievement = getAchievementLevel(total, 'reading');
                    return (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Achievement</p>
                          <p className="text-sm font-medium text-foreground">{achievement.label}</p>
                        </div>
                        <span className="text-2xl">{achievement.badge}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Practice Stats */}
              <div className="bg-card rounded-lg p-4 border border-border shadow-sm">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <span className="text-xl">⚡</span> Practice Activities
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Drills Completed</span>
                    <span className="font-semibold text-foreground">{stats?.drillsCompleted || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Games Played</span>
                    <span className="font-semibold text-foreground">{stats?.gamesPlayed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Practice Sessions</span>
                    <span className="font-semibold text-foreground">{stats?.practiceSessionsCompleted || 0}</span>
                  </div>
                  
                  {/* Practice Achievement Badge */}
                  {(() => {
                    const total = (stats?.drillsCompleted || 0) + (stats?.gamesPlayed || 0) + (stats?.practiceSessionsCompleted || 0);
                    const achievement = getAchievementLevel(total, 'practice');
                    return (
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Achievement</p>
                          <p className="text-sm font-medium text-foreground">{achievement.label}</p>
                        </div>
                        <span className="text-2xl">{achievement.badge}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Weekly Activity Chart */}
            {activities?.week && activities.week.length > 0 && (
              <div className="bg-card rounded-lg p-4 border border-border shadow-sm mb-6">
                <h3 className="font-semibold text-foreground mb-4">This Week's Activity</h3>
                <div className="flex items-end justify-between gap-1 h-32">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const dateStr = date.toISOString().split('T')[0];
                    const dayData = activities.week.find(d => d.date === dateStr);
                    const dayTotal = dayData?.summary.totalActivities || 0;
                    const maxTotal = Math.max(...activities.week.map(d => d.summary.totalActivities), 1);
                    const height = dayTotal > 0 ? (dayTotal / maxTotal) * 100 : 5;
                    const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="relative w-full flex items-end justify-center" style={{ height: '100px' }}>
                          <div 
                            className={`w-full max-w-[30px] rounded-t transition-all duration-300 ${
                              dayTotal > 0 ? 'bg-primary' : 'bg-muted'
                            } ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          />
                          {dayTotal > 0 && (
                            <span className="absolute -top-5 text-xs font-medium text-foreground">
                              {dayTotal}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                          {dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Refresh Button */}
            <div className="text-center">
              <button
                onClick={() => refreshStats()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Stats
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}