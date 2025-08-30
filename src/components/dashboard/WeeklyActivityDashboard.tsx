'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getWeeklyActivity, getMonthlyActivity, transformActivityData, getDetailedWeeklyActivity, getDetailedMonthlyActivity, ActivityItem, ActivityDetail } from '@/services/activity-tracker';
import { useAuth } from '@/contexts/AuthContext';

type TimeRange = 'weekly' | 'monthly';

export default function WeeklyActivityDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');

  useEffect(() => {
    if (!user) return;

    const fetchActivity = async () => {
      setIsLoading(true);
      try {
        // Use detailed version for weekly, regular for monthly (for now)
        if (timeRange === 'weekly') {
          console.log('Fetching detailed weekly activities for user:', user.uid);
          try {
            const detailedActivities = await getDetailedWeeklyActivity(user.uid);
            console.log('Detailed activities received:', detailedActivities);
            
            // If we got data, use it
            if (detailedActivities && detailedActivities.length > 0) {
              setActivities(detailedActivities);
            } else {
              // Fallback to simple version if no detailed data
              console.log('No detailed data, falling back to simple version');
              const activityData = await getWeeklyActivity(user.uid);
              const transformed = transformActivityData(activityData);
              setActivities(transformed);
            }
          } catch (detailError) {
            console.error('Detailed fetch failed, using simple version:', detailError);
            // Fallback to simple version on error
            const activityData = await getWeeklyActivity(user.uid);
            const transformed = transformActivityData(activityData);
            setActivities(transformed);
          }
        } else {
          // Monthly view - use detailed version
          console.log('Fetching detailed monthly activities for user:', user.uid);
          try {
            const detailedActivities = await getDetailedMonthlyActivity(user.uid);
            console.log('Detailed monthly activities received:', detailedActivities);
            
            if (detailedActivities && detailedActivities.length > 0) {
              setActivities(detailedActivities);
            } else {
              // Fallback to simple version if no detailed data
              console.log('No detailed monthly data, falling back to simple version');
              const activityData = await getMonthlyActivity(user.uid);
              const transformed = transformActivityData(activityData);
              setActivities(transformed);
            }
          } catch (detailError) {
            console.error('Detailed monthly fetch failed, using simple version:', detailError);
            // Fallback to simple version on error
            const activityData = await getMonthlyActivity(user.uid);
            const transformed = transformActivityData(activityData);
            setActivities(transformed);
          }
        }
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [user, timeRange]);

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {timeRange === 'weekly' ? 'Weekly' : 'Monthly'} Activity
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your learning journey this {timeRange === 'weekly' ? 'week' : 'month'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="animate-pulse h-2 w-2 bg-primary rounded-full"></div>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4 w-fit">
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'weekly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
        </div>
        
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-card/50 rounded-xl p-4 h-32">
                <div className="h-10 w-10 bg-muted rounded-lg mb-3"></div>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 mb-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Start Your Learning Journey</h3>
          <p className="text-muted-foreground">
            No activity yet this {timeRange === 'weekly' ? 'week' : 'month'}. Begin exploring to see your progress here!
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 mb-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {timeRange === 'weekly' ? 'Weekly' : 'Monthly'} Activity
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your learning journey this {timeRange === 'weekly' ? 'week' : 'month'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="h-2 w-2 bg-green-500 rounded-full"
            ></motion.div>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4 w-fit">
          <button
            onClick={() => setTimeRange('weekly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'weekly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeRange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              timeRange === 'monthly'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
        </div>

        {/* Activity Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <AnimatePresence mode="popLayout">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
                whileHover={{ scale: 1.05, rotate: [0, -1, 1, 0] }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Navigate directly to favourites page for saved items
                  if (activity.type === 'savedItems') {
                    router.push('/favourites');
                  } else {
                    setSelectedActivity(activity);
                  }
                }}
                className="cursor-pointer"
              >
                <div className="bg-card hover:shadow-lg transition-all duration-300 rounded-xl p-4 relative overflow-hidden group">
                  {/* Background decoration */}
                  <div className={`absolute -top-8 -right-8 w-24 h-24 ${activity.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}></div>
                  
                  {/* Icon */}
                  <div className={`w-10 h-10 ${activity.color} bg-opacity-20 rounded-lg flex items-center justify-center mb-3`}>
                    {activity.icon.startsWith('/') ? (
                      <Image
                        src={activity.icon}
                        alt={activity.label}
                        width={20}
                        height={20}
                        className="opacity-80"
                      />
                    ) : (
                      <span className="text-xl">{activity.icon}</span>
                    )}
                  </div>
                  
                  {/* Count with animation */}
                  <motion.div
                    key={`${activity.type}-${activity.count}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-bold text-foreground mb-1"
                  >
                    {activity.count.toLocaleString()}
                  </motion.div>
                  
                  {/* Label */}
                  <p className="text-xs text-muted-foreground line-clamp-1">{activity.label}</p>
                  
                  {/* Trend indicator (if available) */}
                  {activity.trend && (
                    <div className="absolute top-2 right-2">
                      {activity.trend === 'up' && (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                      {activity.trend === 'down' && (
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pt-6 border-t border-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {activities.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Activities</p>
              </div>
              <div className="h-12 w-px bg-border"></div>
              <div>
                <p className="text-xl font-semibold text-foreground">
                  {activities.length}
                </p>
                <p className="text-sm text-muted-foreground">Active Categories</p>
              </div>
            </div>
            
            {/* Motivational message */}
            <div className="text-right">
              <p className="text-sm font-medium text-primary">
                {getMotivationalMessage(activities)}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Activity Detail Modal */}
      <AnimatePresence>
        {selectedActivity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedActivity(null)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-16 h-16 ${selectedActivity.color} bg-opacity-20 rounded-xl flex items-center justify-center`}>
                  {selectedActivity.icon.startsWith('/') ? (
                    <Image
                      src={selectedActivity.icon}
                      alt={selectedActivity.label}
                      width={32}
                      height={32}
                      className="opacity-80"
                    />
                  ) : (
                    <span className="text-3xl">{selectedActivity.icon}</span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-2">{selectedActivity.label}</h3>
              <p className="text-4xl font-bold text-primary mb-4">{selectedActivity.count.toLocaleString()}</p>
              
              {/* Show detailed information if available */}
              {selectedActivity.details && selectedActivity.details.length > 0 ? (
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">Recent Activity:</p>
                  {selectedActivity.details.slice(0, 5).map((detail, idx) => (
                    <div key={detail.id || idx} className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium text-foreground">{detail.title}</p>
                      {detail.subtitle && (
                        <p className="text-xs text-muted-foreground">{detail.subtitle}</p>
                      )}
                      {detail.timestamp && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(detail.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                  {selectedActivity.details.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      And {selectedActivity.details.length - 5} more...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Great progress this {timeRange === 'weekly' ? 'week' : 'month'}! Keep up the momentum to maintain your learning streak.
                </p>
              )}
              
              <div className="mt-6 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  This {timeRange === 'weekly' ? 'Week' : 'Month'}'s Activity
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function getMotivationalMessage(activities: ActivityItem[]): string {
  const total = activities.reduce((sum, item) => sum + item.count, 0);
  
  if (total >= 100) return "🔥 You're on fire! Incredible week!";
  if (total >= 50) return "⭐ Amazing progress! Keep it up!";
  if (total >= 25) return "💪 Great job! You're building momentum!";
  if (total >= 10) return "👍 Good start! Keep going!";
  return "🌱 Every step counts! You've got this!";
}