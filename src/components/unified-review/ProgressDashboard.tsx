'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentType, ReviewRating } from '@/lib/unified-review';
import { useUnifiedReview } from '@/hooks/useUnifiedReview';

interface ProgressStats {
  overview: {
    totalItems: number;
    itemsLearned: number;
    retentionRate: number;
    currentStreak: number;
    longestStreak: number;
    totalReviews: number;
    averageAccuracy: number;
  };
  contentTypes: {
    [key in ContentType]: {
      total: number;
      learned: number;
      mastery: number;
      dueToday: number;
    };
  };
  performance: {
    last7Days: {
      date: string;
      reviews: number;
      accuracy: number;
    }[];
    last30Days: {
      date: string;
      reviews: number;
      accuracy: number;
    }[];
    ratingDistribution: {
      [key in ReviewRating]: number;
    };
  };
  upcoming: {
    today: number;
    tomorrow: number;
    thisWeek: number;
    nextWeek: number;
  };
}

interface ProgressDashboardProps {
  /**
   * Time period for charts (7, 30, or 90 days)
   */
  defaultPeriod?: 7 | 30 | 90;
  
  /**
   * Whether to show detailed breakdowns
   */
  showDetailedStats?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const CONTENT_TYPE_CONFIG = {
  [ContentType.KANJI]: { label: 'Kanji', icon: '漢', color: 'bg-red-500' },
  [ContentType.VOCABULARY]: { label: 'Vocabulary', icon: '語', color: 'bg-blue-500' },
  [ContentType.FLASHCARD]: { label: 'Flashcards', icon: '📚', color: 'bg-green-500' },
  [ContentType.GRAMMAR]: { label: 'Grammar', icon: '文', color: 'bg-purple-500' },
  [ContentType.SENTENCE]: { label: 'Sentences', icon: '例', color: 'bg-orange-500' },
  [ContentType.RADICAL]: { label: 'Radicals', icon: '部', color: 'bg-pink-500' },
  [ContentType.CUSTOM]: { label: 'Custom', icon: '⭐', color: 'bg-yellow-500' }
};

const RATING_CONFIG = {
  [ReviewRating.AGAIN]: { label: 'Again', color: 'bg-red-500' },
  [ReviewRating.HARD]: { label: 'Hard', color: 'bg-orange-500' },
  [ReviewRating.GOOD]: { label: 'Good', color: 'bg-blue-500' },
  [ReviewRating.EASY]: { label: 'Easy', color: 'bg-green-500' }
};

export default function ProgressDashboard({
  defaultPeriod = 30,
  showDetailedStats = true,
  className = ''
}: ProgressDashboardProps) {
  const { engine, isReady } = useUnifiedReview();
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(defaultPeriod);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch progress statistics
  const fetchStats = async () => {
    if (!engine || !isReady) return;

    setIsLoading(true);
    setError(null);

    try {
      // This would be implemented in the actual URE
      // For now, we'll create mock data structure
      const mockStats: ProgressStats = {
        overview: {
          totalItems: 1250,
          itemsLearned: 890,
          retentionRate: 87.5,
          currentStreak: 12,
          longestStreak: 45,
          totalReviews: 3420,
          averageAccuracy: 78.3
        },
        contentTypes: {
          [ContentType.KANJI]: { total: 400, learned: 280, mastery: 70, dueToday: 25 },
          [ContentType.VOCABULARY]: { total: 600, learned: 450, mastery: 75, dueToday: 35 },
          [ContentType.FLASHCARD]: { total: 150, learned: 120, mastery: 80, dueToday: 8 },
          [ContentType.GRAMMAR]: { total: 80, learned: 35, mastery: 44, dueToday: 12 },
          [ContentType.SENTENCE]: { total: 20, learned: 5, mastery: 25, dueToday: 3 },
          [ContentType.RADICAL]: { total: 0, learned: 0, mastery: 0, dueToday: 0 },
          [ContentType.CUSTOM]: { total: 0, learned: 0, mastery: 0, dueToday: 0 }
        },
        performance: {
          last7Days: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reviews: Math.floor(Math.random() * 50) + 10,
            accuracy: Math.floor(Math.random() * 30) + 65
          })).reverse(),
          last30Days: Array.from({ length: 30 }, (_, i) => ({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            reviews: Math.floor(Math.random() * 50) + 10,
            accuracy: Math.floor(Math.random() * 30) + 65
          })).reverse(),
          ratingDistribution: {
            [ReviewRating.AGAIN]: 15,
            [ReviewRating.HARD]: 25,
            [ReviewRating.GOOD]: 45,
            [ReviewRating.EASY]: 15
          }
        },
        upcoming: {
          today: 83,
          tomorrow: 45,
          thisWeek: 280,
          nextWeek: 195
        }
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Failed to fetch progress stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  // Load stats on mount and when engine becomes ready
  useEffect(() => {
    if (isReady) {
      fetchStats();
    }
  }, [isReady]);

  // Refresh stats when period changes
  useEffect(() => {
    if (stats) {
      fetchStats();
    }
  }, [selectedPeriod]);

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="animate-pulse h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-4">
            Error loading dashboard: {error}
          </div>
          <Button onClick={fetchStats}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <CardContent className="p-6 text-center text-muted-foreground">
          No statistics available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items Learned</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overview.itemsLearned.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  of {stats.overview.totalItems.toLocaleString()} total
                </p>
              </div>
              <div className="text-2xl">📚</div>
            </div>
            <Progress 
              value={(stats.overview.itemsLearned / stats.overview.totalItems) * 100} 
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Retention Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overview.retentionRate}%
                </p>
                <p className="text-xs text-green-600">
                  Excellent retention
                </p>
              </div>
              <div className="text-2xl">🧠</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overview.currentStreak}
                </p>
                <p className="text-xs text-muted-foreground">
                  Longest: {stats.overview.longestStreak} days
                </p>
              </div>
              <div className="text-2xl">🔥</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats.overview.averageAccuracy}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {stats.overview.totalReviews.toLocaleString()} reviews
                </p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Tabs defaultValue="content-types" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content-types">Content Types</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Content Types Breakdown */}
        <TabsContent value="content-types" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Progress by Content Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(stats.contentTypes)
                .filter(([_, data]) => data.total > 0)
                .map(([type, data]) => {
                  const config = CONTENT_TYPE_CONFIG[type as ContentType];
                  const progress = data.total > 0 ? (data.learned / data.total) * 100 : 0;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <span className="font-medium text-foreground">{config.label}</span>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{data.learned} / {data.total}</div>
                          <div>{data.dueToday} due today</div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Math.round(progress)}% learned</span>
                          <span>{data.mastery}% mastery</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Performance Trends
                </CardTitle>
                <div className="flex gap-2">
                  {[7, 30, 90].map(period => (
                    <Button
                      key={period}
                      onClick={() => setSelectedPeriod(period as 7 | 30 | 90)}
                      size="sm"
                      variant={selectedPeriod === period ? "default" : "outline"}
                    >
                      {period}d
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Simple chart representation */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Daily Reviews</h4>
                <div className="h-32 bg-muted rounded p-4 flex items-end justify-between gap-1">
                  {(selectedPeriod === 7 ? stats.performance.last7Days : stats.performance.last30Days)
                    .slice(-14) // Show last 14 days for visual clarity
                    .map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div 
                        className="bg-blue-500 rounded-t w-4"
                        style={{ height: `${(day.reviews / 60) * 100}%` }}
                      ></div>
                      <div className="text-xs text-muted-foreground transform -rotate-45">
                        {new Date(day.date).getDate()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Rating Distribution</h4>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(stats.performance.ratingDistribution).map(([rating, count]) => {
                    const config = RATING_CONFIG[rating as unknown as ReviewRating];
                    const total = Object.values(stats.performance.ratingDistribution).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                      <div key={rating} className="text-center">
                        <div className={`h-16 ${config.color} rounded mb-2 flex items-end justify-center pb-2`}>
                          <span className="text-white font-bold">{count}</span>
                        </div>
                        <div className="text-sm text-foreground">{config.label}</div>
                        <div className="text-xs text-muted-foreground">{Math.round(percentage)}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Reviews */}
        <TabsContent value="upcoming" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Upcoming Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{stats.upcoming.today}</div>
                  <div className="text-sm text-muted-foreground">Today</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{stats.upcoming.tomorrow}</div>
                  <div className="text-sm text-muted-foreground">Tomorrow</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{stats.upcoming.thisWeek}</div>
                  <div className="text-sm text-muted-foreground">This Week</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{stats.upcoming.nextWeek}</div>
                  <div className="text-sm text-muted-foreground">Next Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Learning Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-800">Strong Performance</div>
                  <div className="text-sm text-green-700">
                    Your retention rate of {stats.overview.retentionRate}% is excellent! Keep up the consistent practice.
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800">Study Recommendation</div>
                  <div className="text-sm text-blue-700">
                    Focus on grammar items - you have {stats.contentTypes[ContentType.GRAMMAR].dueToday} items due today.
                  </div>
                </div>
                
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="font-medium text-orange-800">Streak Goal</div>
                  <div className="text-sm text-orange-700">
                    You're {stats.overview.longestStreak - stats.overview.currentStreak} days away from beating your longest streak!
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}