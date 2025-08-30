'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart
} from 'recharts';
import { useUnifiedReview } from '@/hooks/useUnifiedReview';
import { useStats } from '@/hooks/useStats';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/services/notifications/NotificationService';
import Link from 'next/link';

// Content type configurations - using theme system properly
const CONTENT_TYPES = {
  kanji: { 
    label: 'Kanji', 
    icon: '漢', 
    bgClass: 'bg-destructive/10 hover:bg-destructive/20',
    borderClass: 'border-destructive/20',
    textClass: 'text-destructive',
    href: '/kanji-browser'
  },
  vocabulary: { 
    label: 'Vocabulary', 
    icon: '語', 
    bgClass: 'bg-primary/10 hover:bg-primary/20',
    borderClass: 'border-primary/20',
    textClass: 'text-primary',
    href: '/vocabulary'
  },
  grammar: { 
    label: 'Grammar', 
    icon: '文', 
    bgClass: 'bg-secondary/10 hover:bg-secondary/20',
    borderClass: 'border-secondary/20',
    textClass: 'text-secondary-foreground',
    href: '/practice/conjugation'
  },
  flashcard: { 
    label: 'Flashcards', 
    icon: '📚', 
    bgClass: 'bg-accent/10 hover:bg-accent/20',
    borderClass: 'border-accent/20',
    textClass: 'text-accent-foreground',
    href: '/tools/textbook-vocabulary'
  },
  sentence: { 
    label: 'Sentences', 
    icon: '例', 
    bgClass: 'bg-muted hover:bg-muted/80',
    borderClass: 'border-border',
    textClass: 'text-muted-foreground',
    href: '/stories'
  }
};

// Get CSS variable value for charts
const getCSSVariableValue = (variable: string) => {
  if (typeof window === 'undefined') return 'hsl(0 0% 50%)';
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable);
  return `hsl(${value})`;
};

export default function ReviewHub() {
  const { user } = useAuth();
  const { engine, isReady } = useUnifiedReview();
  const { stats, activities } = useStats();
  const [reviewData, setReviewData] = useState<any>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<any>(null);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartColors, setChartColors] = useState({
    primary: '',
    secondary: '',
    accent: '',
    muted: '',
    destructive: ''
  });

  // Load theme colors for charts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setChartColors({
        primary: getCSSVariableValue('--primary'),
        secondary: getCSSVariableValue('--secondary'),
        accent: getCSSVariableValue('--accent'),
        muted: getCSSVariableValue('--muted'),
        destructive: getCSSVariableValue('--destructive')
      });
    }
  }, []);

  // Load review data
  useEffect(() => {
    const loadData = async () => {
      if (!isReady || !engine) return;
      
      try {
        setLoading(true);
        
        // Get due items breakdown
        const dueItems = await engine.getDueItems();
        const breakdown: Record<string, number> = {};
        let total = 0;
        
        dueItems.forEach(item => {
          const type = item.contentType || 'other';
          breakdown[type] = (breakdown[type] || 0) + 1;
          total++;
        });

        // Get stats
        const engineStats = await engine.getStats();
        
        // Get notification preferences
        if (user) {
          const prefs = await notificationService.getPreferences();
          setNotificationPrefs(prefs);
        }

        setReviewData({
          dueCount: total,
          breakdown,
          stats: engineStats,
          dueItems: dueItems.slice(0, 10) // First 10 for preview
        });
      } catch (error) {
        console.error('Failed to load review data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isReady, engine, user]);

  // Prepare chart data with theme colors
  const pieChartData = reviewData?.breakdown 
    ? Object.entries(reviewData.breakdown).map(([type, count]) => ({
        name: CONTENT_TYPES[type as keyof typeof CONTENT_TYPES]?.label || type,
        value: count as number,
        fill: type === 'kanji' ? chartColors.destructive :
              type === 'vocabulary' ? chartColors.primary :
              type === 'grammar' ? chartColors.secondary :
              type === 'flashcard' ? chartColors.accent :
              chartColors.muted
      }))
    : [];

  // Mastery level data for radial chart
  const masteryData = [
    { name: 'Beginner', value: 30, fill: chartColors.muted },
    { name: 'Learning', value: 45, fill: chartColors.accent },
    { name: 'Familiar', value: 60, fill: chartColors.secondary },
    { name: 'Proficient', value: 75, fill: chartColors.primary },
    { name: 'Master', value: 90, fill: chartColors.destructive }
  ];

  // Weekly progress data
  const weeklyData = activities?.week?.map((day: any) => ({
    day: new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
    reviews: day.summary.reviewsCompleted || 0,
    new: day.summary.newItemsLearned || 0,
    accuracy: day.summary.accuracy || 0
  })) || [];

  // Handle content type selection for quick review
  const handleQuickReview = (contentType: string) => {
    setSelectedContentType(contentType);
    // Navigate to specific review or show filtered session
    window.location.href = `${CONTENT_TYPES[contentType as keyof typeof CONTENT_TYPES].href}?review=true`;
  };

  // Toggle notifications
  const handleNotificationToggle = async () => {
    if (!notificationPrefs) {
      // Request permission
      const success = await notificationService.requestPermission();
      if (success) {
        const prefs = await notificationService.getPreferences();
        setNotificationPrefs(prefs);
      }
    } else {
      // Toggle enabled state
      await notificationService.updatePreferences({
        enabled: !notificationPrefs.enabled
      });
      setNotificationPrefs({ ...notificationPrefs, enabled: !notificationPrefs.enabled });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Review Hub
          </h1>
          <p className="text-muted-foreground">
            Your personalized learning command center
          </p>
        </header>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">📚</span>
              <span className="text-sm text-accent-foreground bg-accent px-2 py-1 rounded">
                +{stats?.todayActivities || 0} today
              </span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {reviewData?.dueCount || 0}
            </div>
            <div className="text-sm text-muted-foreground">Due for Review</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🔥</span>
              <span className="text-sm text-destructive">Active</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {stats?.currentStreak || 0}
            </div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🎯</span>
              <span className="text-sm text-primary">{stats?.overallAccuracy || 0}%</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {reviewData?.stats?.retentionRate ? 
                `${(reviewData.stats.retentionRate * 100).toFixed(0)}%` : '0%'}
            </div>
            <div className="text-sm text-muted-foreground">Retention Rate</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">🎓</span>
              <span className="text-sm text-secondary-foreground">Total</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              {reviewData?.stats?.totalItems || 0}
            </div>
            <div className="text-sm text-muted-foreground">Items Learned</div>
          </motion.div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Due Reviews Pie Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Reviews by Type
            </h2>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No reviews due
              </div>
            )}
          </motion.div>

          {/* Mastery Levels Radial Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Mastery Progress
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="90%" data={masteryData}>
                <RadialBar dataKey="value" cornerRadius={10} />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Weekly Activity Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Weekly Activity
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.muted} />
                <XAxis dataKey="day" stroke={chartColors.muted} />
                <YAxis stroke={chartColors.muted} />
                <Tooltip />
                <Area type="monotone" dataKey="reviews" stackId="1" stroke={chartColors.primary} fill={chartColors.primary} />
                <Area type="monotone" dataKey="new" stackId="1" stroke={chartColors.accent} fill={chartColors.accent} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Quick Review Section */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Quick Review by Type
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(CONTENT_TYPES).map(([key, config]) => {
              const count = reviewData?.breakdown[key] || 0;
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickReview(key)}
                  disabled={count === 0}
                  className={`relative p-6 rounded-xl ${config.bgClass} ${config.borderClass} border-2 
                    ${count > 0 ? 'hover:shadow-lg cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                    transition-all duration-200`}
                >
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs font-bold 
                      rounded-full w-6 h-6 flex items-center justify-center">
                      {count}
                    </span>
                  )}
                  <div className="text-3xl mb-2">{config.icon}</div>
                  <div className={`text-sm font-medium ${config.textClass}`}>
                    {config.label}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Notifications & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Notification Settings */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Review Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Daily Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when reviews are due
                  </p>
                </div>
                <button
                  onClick={handleNotificationToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${notificationPrefs?.enabled ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform
                      ${notificationPrefs?.enabled ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              
              {notificationPrefs?.enabled && (
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    Notification Schedule:
                  </p>
                  <div className="flex gap-2">
                    {['Morning', 'Afternoon', 'Evening'].map(time => (
                      <button
                        key={time}
                        className="px-3 py-1 text-sm rounded-lg bg-muted hover:bg-muted/80 
                          transition-colors"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card rounded-xl shadow-lg p-6 border border-border"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Link
                href="/review?autoStart=true"
                className="block w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg 
                  hover:bg-primary/90 transition-colors text-center font-medium"
              >
                Start Full Review Session ({reviewData?.dueCount || 0} items)
              </Link>
              <Link
                href="/tools/kanji-mastery"
                className="block w-full px-4 py-3 bg-secondary text-secondary-foreground rounded-lg 
                  hover:bg-secondary/90 transition-colors text-center"
              >
                Practice Kanji
              </Link>
              <Link
                href="/tools/textbook-vocabulary"
                className="block w-full px-4 py-3 bg-accent text-accent-foreground rounded-lg 
                  hover:bg-accent/90 transition-colors text-center"
              >
                Study Textbook Vocabulary
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}