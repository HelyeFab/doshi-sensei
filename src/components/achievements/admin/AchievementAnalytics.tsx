'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Achievement } from '@/lib/achievements/types';
import { useAchievementAdmin } from '@/hooks/useAchievementAdmin';

interface AchievementStats {
  totalAchievements: number;
  totalUnlocks: number;
  averageUnlocksPerUser: number;
  mostPopularAchievement: Achievement | null;
  rarestAchievement: Achievement | null;
  categoryBreakdown: Record<string, number>;
  rarityBreakdown: Record<string, number>;
  unlockTrends: Array<{ date: string; unlocks: number }>;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionTime: number;
  };
}

interface AchievementAnalyticsProps {
  className?: string;
}

export function AchievementAnalytics({ className = '' }: AchievementAnalyticsProps) {
  const { achievements, getAchievementStats } = useAchievementAdmin();
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      
      // Mock analytics data (in a real app, this would come from your analytics service)
      const mockStats: AchievementStats = {
        totalAchievements: achievements.length,
        totalUnlocks: 1247,
        averageUnlocksPerUser: 8.3,
        mostPopularAchievement: achievements.find(a => a.id === 'first_day') || null,
        rarestAchievement: achievements.find(a => a.rarity === 'legendary') || null,
        categoryBreakdown: {
          streaks: 342,
          drills: 298,
          words: 267,
          reading: 189,
          stories: 98,
          games: 53,
          hidden: 12
        },
        rarityBreakdown: {
          common: 789,
          rare: 312,
          epic: 123,
          legendary: 23
        },
        unlockTrends: generateMockTrends(selectedTimeRange),
        engagementMetrics: {
          dailyActiveUsers: 156,
          weeklyActiveUsers: 892,
          monthlyActiveUsers: 2341,
          averageSessionTime: 18.5
        }
      };

      setStats(mockStats);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockTrends = (timeRange: string) => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        unlocks: Math.floor(Math.random() * 50) + 10
      });
    }
    
    return trends;
  };

  if (isLoading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg p-6 border">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Achievement Analytics</h2>
          <p className="text-muted-foreground">
            Insights into user engagement and achievement performance
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">🏆</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.totalAchievements}</div>
              <div className="text-sm text-muted-foreground">Total Achievements</div>
            </div>
          </div>
          <div className="text-xs text-green-600">
            +{achievements.filter(a => a.isCustom).length} custom
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-lg p-6 border"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">🎯</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.totalUnlocks.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Unlocks</div>
            </div>
          </div>
          <div className="text-xs text-green-600">
            {stats.averageUnlocksPerUser} avg per user
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-lg p-6 border"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">👥</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.engagementMetrics.dailyActiveUsers}</div>
              <div className="text-sm text-muted-foreground">Daily Active Users</div>
            </div>
          </div>
          <div className="text-xs text-green-600">
            {stats.engagementMetrics.weeklyActiveUsers} weekly
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-lg p-6 border"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">⏱️</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.engagementMetrics.averageSessionTime}m</div>
              <div className="text-sm text-muted-foreground">Avg Session Time</div>
            </div>
          </div>
          <div className="text-xs text-green-600">
            +2.3m from last month
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-lg p-6 border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Unlocks by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats.categoryBreakdown).map(([category, count], index) => {
              const percentage = (count / stats.totalUnlocks) * 100;
              const categoryIcons: Record<string, string> = {
                streaks: '🔥',
                drills: '📝',
                words: '📚',
                reading: '📖',
                stories: '📜',
                games: '🎮',
                hidden: '🎭'
              };

              return (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-lg">{categoryIcons[category]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {category}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Rarity Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-lg p-6 border"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Unlocks by Rarity</h3>
          <div className="space-y-3">
            {Object.entries(stats.rarityBreakdown).map(([rarity, count], index) => {
              const percentage = (count / stats.totalUnlocks) * 100;
              const rarityColors: Record<string, string> = {
                common: '#6b7280',
                rare: '#3b82f6',
                epic: '#8b5cf6',
                legendary: '#fbbf24'
              };

              return (
                <div key={rarity} className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: rarityColors[rarity] }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {rarity}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: rarityColors[rarity] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Achievement Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Most Popular Achievement */}
        {stats.mostPopularAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-card rounded-lg p-6 border"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Most Popular Achievement</h3>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${stats.mostPopularAchievement.color}20` }}
              >
                {stats.mostPopularAchievement.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">
                  {stats.mostPopularAchievement.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {stats.mostPopularAchievement.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>342 unlocks</span>
                  <span>89% of users</span>
                  <span className="capitalize">{stats.mostPopularAchievement.rarity}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Rarest Achievement */}
        {stats.rarestAchievement && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-card rounded-lg p-6 border"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">Rarest Achievement</h3>
            <div className="flex items-center gap-4">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${stats.rarestAchievement.color}20` }}
              >
                {stats.rarestAchievement.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-1">
                  {stats.rarestAchievement.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {stats.rarestAchievement.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>23 unlocks</span>
                  <span>1.8% of users</span>
                  <span className="capitalize">{stats.rarestAchievement.rarity}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Unlock Trends */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-card rounded-lg p-6 border"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Unlock Trends</h3>
        <div className="h-64 flex items-end justify-between gap-1">
          {stats.unlockTrends.map((trend, index) => {
            const maxUnlocks = Math.max(...stats.unlockTrends.map(t => t.unlocks));
            const height = (trend.unlocks / maxUnlocks) * 100;
            
            return (
              <div key={trend.date} className="flex-1 flex flex-col items-center">
                <motion.div
                  className="w-full bg-primary rounded-t"
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: 0.9 + index * 0.02, duration: 0.5 }}
                />
                <div className="text-xs text-muted-foreground mt-2 transform -rotate-45 origin-left">
                  {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200"
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">📊 Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">🎯 Engagement Opportunity</h4>
            <p className="text-sm text-muted-foreground">
              Hidden achievements have low unlock rates. Consider adding more hints or making them more discoverable.
            </p>
          </div>
          <div className="bg-white/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">🏆 Popular Categories</h4>
            <p className="text-sm text-muted-foreground">
              Streak achievements are most popular. Consider adding more streak-based challenges with different themes.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}