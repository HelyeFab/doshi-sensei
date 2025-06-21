'use client';

import { useState, useEffect } from 'react';
import {
  ReadingAnalyticsManager,
  ReadingAnalytics,
  ReadingSession,
  formatReadingTime,
  getReadingSpeedCategory,
  getComprehensionLevel
} from '@/utils/readingAnalytics';
import { NewsArticle } from '@/types/news';

interface ReadingDashboardProps {
  onSelectArticle?: (articleId: string) => void;
}

interface DashboardStats {
  totalArticles: number;
  totalReadingTime: number;
  averageSpeed: number;
  averageComprehension: number;
  currentStreak: number;
  weeklyProgress: number[];
  recentSessions: ReadingSession[];
  topCategories: Array<{ category: string; count: number }>;
  vocabularyGrowth: number;
}

export function ReadingDashboard({ onSelectArticle }: ReadingDashboardProps) {
  const [analytics, setAnalytics] = useState<ReadingAnalytics | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'all'>('month');
  const [loading, setLoading] = useState(true);

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = () => {
      try {
        const userAnalytics = ReadingAnalyticsManager.getReadingAnalytics();
        setAnalytics(userAnalytics);

        // Calculate dashboard stats
        const sessions = getAllSessions();
        const stats = calculateDashboardStats(sessions, selectedTimeRange);
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error loading reading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [selectedTimeRange]);

  const getAllSessions = (): ReadingSession[] => {
    try {
      const stored = localStorage.getItem('doshi_reading_sessions');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const calculateDashboardStats = (sessions: ReadingSession[], timeRange: string): DashboardStats => {
    const now = new Date();
    let filterDate: Date;

    switch (timeRange) {
      case 'week':
        filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        filterDate = new Date(0); // All time
    }

    const filteredSessions = sessions.filter(s =>
      s.completed && new Date(s.startTime) >= filterDate
    );

    // Calculate weekly progress for last 7 days
    const weeklyProgress: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(day.setHours(0, 0, 0, 0));
      const dayEnd = new Date(day.setHours(23, 59, 59, 999));

      const dayProgress = sessions.filter(s => {
        const sessionDate = new Date(s.startTime);
        return s.completed && sessionDate >= dayStart && sessionDate <= dayEnd;
      }).length;

      weeklyProgress.push(dayProgress);
    }

    // Calculate top categories (mock data for now, would be enhanced with real article data)
    const categories = ['weather', 'technology', 'society', 'sports', 'politics'];
    const topCategories = categories.map(cat => ({
      category: cat,
      count: Math.floor(Math.random() * filteredSessions.length)
    })).sort((a, b) => b.count - a.count).slice(0, 3);

    return {
      totalArticles: filteredSessions.length,
      totalReadingTime: filteredSessions.reduce((sum, s) => sum + s.readingTimeSeconds, 0),
      averageSpeed: filteredSessions.length > 0
        ? filteredSessions.reduce((sum, s) => sum + s.wordsPerMinute, 0) / filteredSessions.length
        : 0,
      averageComprehension: filteredSessions.filter(s => s.comprehensionScore).length > 0
        ? filteredSessions
            .filter(s => s.comprehensionScore)
            .reduce((sum, s) => sum + (s.comprehensionScore || 0), 0) /
          filteredSessions.filter(s => s.comprehensionScore).length
        : 0,
      currentStreak: calculateCurrentStreak(sessions),
      weeklyProgress,
      recentSessions: filteredSessions.slice(-5).reverse(),
      topCategories,
      vocabularyGrowth: filteredSessions.reduce((sum, s) => sum + s.vocabularyEncountered.length, 0)
    };
  };

  const calculateCurrentStreak = (sessions: ReadingSession[]): number => {
    const completedSessions = sessions
      .filter(s => s.completed)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    if (completedSessions.length === 0) return 0;

    let streak = 1;
    let currentDate = new Date(completedSessions[0].startTime);
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < completedSessions.length; i++) {
      const sessionDate = new Date(completedSessions[i].startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        streak++;
        currentDate = sessionDate;
      } else if (daysDiff > 1) {
        break;
      }
    }

    return streak;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !dashboardStats) {
    return (
      <div className="p-6 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">まだ読書記録がありません</h2>
        <p className="text-muted-foreground mb-4">
          日本語の記事を読んで、あなたの進捗を追跡しましょう！
        </p>
        <button
          onClick={() => onSelectArticle?.('browse')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          記事を読み始める
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">📊 読書分析ダッシュボード</h1>

        {/* Time Range Selector */}
        <div className="flex bg-muted rounded-lg p-1">
          {['week', 'month', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range as any)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedTimeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {{
                week: '1週間',
                month: '1ヶ月',
                all: '全期間'
              }[range]}
            </button>
          ))}
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">📖</span>
            <h3 className="font-medium text-foreground">読了記事数</h3>
          </div>
          <div className="text-2xl font-bold text-primary">{dashboardStats.totalArticles}</div>
          <div className="text-sm text-muted-foreground">
            {selectedTimeRange === 'all' ? '全期間' :
             selectedTimeRange === 'month' ? '今月' : '今週'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⏱️</span>
            <h3 className="font-medium text-foreground">読書時間</h3>
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatReadingTime(dashboardStats.totalReadingTime)}
          </div>
          <div className="text-sm text-muted-foreground">累計時間</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🚀</span>
            <h3 className="font-medium text-foreground">読書速度</h3>
          </div>
          <div className="text-2xl font-bold text-primary">
            {Math.round(dashboardStats.averageSpeed)}
          </div>
          <div className="text-sm text-muted-foreground">
            {getReadingSpeedCategory(dashboardStats.averageSpeed)} (wpm)
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <h3 className="font-medium text-foreground">連続日数</h3>
          </div>
          <div className="text-2xl font-bold text-primary">{dashboardStats.currentStreak}</div>
          <div className="text-sm text-muted-foreground">日連続</div>
        </div>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Progress Chart */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-4">📈 週間進捗</h3>
          <div className="flex items-end justify-between h-32 gap-2">
            {dashboardStats.weeklyProgress.map((count, index) => {
              const maxCount = Math.max(...dashboardStats.weeklyProgress, 1);
              const height = (count / maxCount) * 100;
              const date = new Date();
              date.setDate(date.getDate() - (6 - index));

              return (
                <div key={index} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className="bg-primary rounded-t flex-shrink-0"
                    style={{
                      height: `${height}%`,
                      minHeight: count > 0 ? '4px' : '0px',
                      width: '100%'
                    }}
                  />
                  <div className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('ja-JP', { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium text-foreground">{count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comprehension Score */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-4">🎯 理解度スコア</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${dashboardStats.averageComprehension * 2.51} 251`}
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-foreground">
                  {Math.round(dashboardStats.averageComprehension)}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-muted-foreground">
              {getComprehensionLevel(dashboardStats.averageComprehension)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reading Sessions */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-4">📚 最近の読書履歴</h3>

        {dashboardStats.recentSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            まだ読書記録がありません
          </div>
        ) : (
          <div className="space-y-3">
            {dashboardStats.recentSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                onClick={() => onSelectArticle?.(session.articleId)}
              >
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    記事 #{session.articleId.slice(-8)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(session.startTime).toLocaleDateString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {formatReadingTime(session.readingTimeSeconds)}
                    </div>
                    <div className="text-xs text-muted-foreground">時間</div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {Math.round(session.wordsPerMinute)}
                    </div>
                    <div className="text-xs text-muted-foreground">wpm</div>
                  </div>

                  {session.comprehensionScore && (
                    <div className="text-center">
                      <div className="font-medium text-foreground">
                        {session.comprehensionScore}%
                      </div>
                      <div className="text-xs text-muted-foreground">理解度</div>
                    </div>
                  )}

                  <div className="text-center">
                    <div className="font-medium text-foreground">
                      {session.vocabularyEncountered.length}
                    </div>
                    <div className="text-xs text-muted-foreground">単語</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Categories */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-4">🏷️ よく読むカテゴリー</h3>
        <div className="space-y-2">
          {dashboardStats.topCategories.map((category, index) => {
            const maxCount = Math.max(...dashboardStats.topCategories.map(c => c.count), 1);
            const width = (category.count / maxCount) * 100;

            return (
              <div key={category.category} className="flex items-center gap-3">
                <div className="w-16 text-sm text-muted-foreground capitalize">
                  {category.category}
                </div>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <div className="w-8 text-sm font-medium text-foreground text-right">
                  {category.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vocabulary Growth */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-4">📝 語彙の成長</h3>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-primary">
            {dashboardStats.vocabularyGrowth}
          </div>
          <div>
            <div className="font-medium text-foreground">遭遇した単語数</div>
            <div className="text-sm text-muted-foreground">
              {selectedTimeRange === 'all' ? '全期間' :
               selectedTimeRange === 'month' ? '今月' : '今週'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReadingDashboard;
