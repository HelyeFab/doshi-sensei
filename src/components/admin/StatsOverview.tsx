'use client';

import { useAdminStats } from '@/hooks/useAdminStats';
import { formatPercentage } from '@/utils/adminStats';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

function StatsCard({ title, value, icon, trend, trendDirection = 'neutral', loading }: StatsCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground',
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-8 bg-muted rounded animate-pulse w-20"></div>
            <div className="h-3 bg-muted rounded animate-pulse w-16"></div>
          </div>
          <div className="text-3xl opacity-50">{icon}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trendColors[trendDirection]} truncate`}>
              {trendDirection === 'up' && '↗ '}
              {trendDirection === 'down' && '↘ '}
              {trend}
            </p>
          )}
        </div>
        <div className="text-2xl sm:text-3xl flex-shrink-0">{icon}</div>
      </div>
    </div>
  );
}

export function StatsOverview() {
  const { userStats, subscriptionStats, featureStats, loading, error } = useAdminStats();

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-medium text-red-900 dark:text-red-100">
              Failed to load statistics
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate growth trends (simplified for demo)
  const userGrowthTrend = userStats?.newUsersThisWeek ? `+${userStats.newUsersThisWeek} this week` : undefined;
  const subscriptionTrend = subscriptionStats?.conversionRate !== undefined && !isNaN(subscriptionStats.conversionRate) 
    ? `${subscriptionStats.conversionRate.toFixed(1)}% conversion` 
    : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">User Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Users"
            value={userStats?.totalUsers ?? 0}
            icon="👥"
            trend={userGrowthTrend}
            trendDirection="up"
            loading={loading}
          />
          <StatsCard
            title="New Users Today"
            value={userStats?.newUsersToday ?? 0}
            icon="🆕"
            loading={loading}
          />
          <StatsCard
            title="Active Today"
            value={userStats?.activeUsersToday ?? 0}
            icon="⚡"
            loading={loading}
          />
          <StatsCard
            title="Registered Users"
            value={userStats?.registeredUsers ?? 0}
            icon="✅"
            trend={`${userStats?.guestUsers ?? 0} guests`}
            trendDirection="neutral"
            loading={loading}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Subscription Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Free Users"
            value={subscriptionStats?.freeUsers ?? 0}
            icon="🆓"
            loading={loading}
          />
          <StatsCard
            title="Premium Users"
            value={(subscriptionStats?.monthlySubscribers ?? 0) + (subscriptionStats?.yearlySubscribers ?? 0)}
            icon="⭐"
            trend={subscriptionTrend}
            trendDirection="up"
            loading={loading}
          />
          <StatsCard
            title="Monthly Subscribers"
            value={subscriptionStats?.monthlySubscribers ?? 0}
            icon="📅"
            loading={loading}
          />
          <StatsCard
            title="Yearly Subscribers"
            value={subscriptionStats?.yearlySubscribers ?? 0}
            icon="🗓️"
            loading={loading}
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Feature Usage</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Drills Today"
            value={featureStats?.drillsCompletedToday ?? 0}
            icon="💪"
            loading={loading}
          />
          <StatsCard
            title="Vocabulary Searches"
            value={featureStats?.vocabularySearchesToday ?? 0}
            icon="🔍"
            loading={loading}
          />
          <StatsCard
            title="Mood Board Views"
            value={featureStats?.moodBoardViewsToday ?? 0}
            icon="🎨"
            loading={loading}
          />
          <StatsCard
            title="Avg Session (min)"
            value={featureStats?.averageSessionDuration?.toFixed(1) ?? '0.0'}
            icon="⏱️"
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
