/**
 * Web Worker for heavy stats calculations
 * Offloads CPU-intensive operations from the main thread
 */

import { ActivityEvent, DailyActivity, UserStatsV2 } from '../core/interfaces';

// Worker message types
export type WorkerMessageType =
  | 'calculate_streaks'
  | 'aggregate_daily'
  | 'aggregate_weekly'
  | 'aggregate_monthly'
  | 'calculate_accuracy'
  | 'process_batch'
  | 'validate_data'
  | 'compute_analytics';

// Worker request message
export interface WorkerRequest {
  id: string;
  type: WorkerMessageType;
  data: any;
  timestamp: number;
  priority?: number;
}

// Worker response message
export interface WorkerResponse {
  id: string;
  type: WorkerMessageType;
  data: any;
  error?: string;
  timestamp: number;
  processingTime: number;
}

// Streak calculation data
interface StreakCalculationData {
  activityDates: string[];
  timezone?: string;
  currentDate?: string;
}

// Aggregation data
interface AggregationData {
  activities: ActivityEvent[];
  dateRange?: {
    start: string;
    end: string;
  };
  groupBy?: 'day' | 'week' | 'month';
}

// Analytics calculation data
interface AnalyticsData {
  userStats: UserStatsV2;
  activities: ActivityEvent[];
  timeRange: number; // days
}

// In a real implementation, this would be in a separate worker file
// For TypeScript compatibility, we'll create a worker factory function

class StatsWorkerLogic {
  /**
   * Calculate current and longest streaks from activity dates
   */
  static calculateStreaks(data: StreakCalculationData): {
    currentStreak: number;
    longestStreak: number;
    streakDates: string[];
  } {
    const { activityDates, currentDate = new Date().toISOString().split('T')[0] } = data;
    
    // Sort dates
    const sortedDates = [...new Set(activityDates)].sort();
    
    if (sortedDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, streakDates: [] };
    }
    
    // Calculate current streak
    let currentStreak = 0;
    let currentDate_ms = new Date(currentDate).getTime();
    
    // Check backwards from current date
    for (let i = 0; i < sortedDates.length; i++) {
      const checkDate = new Date(currentDate_ms - (i * 24 * 60 * 60 * 1000))
        .toISOString().split('T')[0];
      
      if (sortedDates.includes(checkDate)) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let streakDates: string[] = [];
    let tempStreakDates: string[] = [];
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
        tempStreakDates = [sortedDates[i]];
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const dayDiff = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
        
        if (dayDiff === 1) {
          // Consecutive day
          tempStreak++;
          tempStreakDates.push(sortedDates[i]);
        } else {
          // Streak broken
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
            streakDates = [...tempStreakDates];
          }
          tempStreak = 1;
          tempStreakDates = [sortedDates[i]];
        }
      }
    }
    
    // Check final streak
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
      streakDates = [...tempStreakDates];
    }
    
    return { currentStreak, longestStreak, streakDates };
  }

  /**
   * Aggregate daily activities
   */
  static aggregateDaily(data: AggregationData): {
    totalActivities: number;
    byType: Record<string, number>;
    totalScore: number;
    totalCorrect: number;
    totalQuestions: number;
    averageAccuracy: number;
    timeSpent: number;
  } {
    const { activities } = data;
    
    const result = {
      totalActivities: activities.length,
      byType: {} as Record<string, number>,
      totalScore: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      averageAccuracy: 0,
      timeSpent: 0
    };
    
    for (const activity of activities) {
      // Count by type
      result.byType[activity.type] = (result.byType[activity.type] || 0) + 1;
      
      // Aggregate scores and accuracy
      if (activity.details.score) {
        result.totalScore += activity.details.score;
      }
      
      if (activity.details.correct !== undefined) {
        result.totalCorrect += activity.details.correct;
      }
      
      if (activity.details.total !== undefined) {
        result.totalQuestions += activity.details.total;
      }
      
      if (activity.details.duration) {
        result.timeSpent += activity.details.duration;
      }
    }
    
    // Calculate average accuracy
    if (result.totalQuestions > 0) {
      result.averageAccuracy = (result.totalCorrect / result.totalQuestions) * 100;
    }
    
    return result;
  }

  /**
   * Calculate comprehensive accuracy metrics
   */
  static calculateAccuracy(data: { activities: ActivityEvent[] }): {
    overall: number;
    byType: Record<string, { correct: number; total: number; accuracy: number }>;
    trends: {
      last7Days: number;
      last30Days: number;
      improvement: number;
    };
    streaks: {
      current: number;
      longest: number;
    };
  } {
    const { activities } = data;
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    
    let totalCorrect = 0;
    let totalQuestions = 0;
    const byType: Record<string, { correct: number; total: number; accuracy: number }> = {};
    
    // Last 7 days accuracy
    let last7DaysCorrect = 0;
    let last7DaysTotal = 0;
    
    // Last 30 days accuracy
    let last30DaysCorrect = 0;
    let last30DaysTotal = 0;
    
    // Accuracy streak calculation
    const dailyAccuracies: { date: string; accuracy: number }[] = [];
    const dailyStats = new Map<string, { correct: number; total: number }>();
    
    for (const activity of activities) {
      const { correct, total } = activity.details;
      if (correct === undefined || total === undefined) continue;
      
      totalCorrect += correct;
      totalQuestions += total;
      
      // By type
      if (!byType[activity.type]) {
        byType[activity.type] = { correct: 0, total: 0, accuracy: 0 };
      }
      byType[activity.type].correct += correct;
      byType[activity.type].total += total;
      
      // Time-based trends
      const activityAge = now - activity.timestamp;
      if (activityAge <= 7 * day) {
        last7DaysCorrect += correct;
        last7DaysTotal += total;
      }
      if (activityAge <= 30 * day) {
        last30DaysCorrect += correct;
        last30DaysTotal += total;
      }
      
      // Daily stats for streak calculation
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      const dayStats = dailyStats.get(date) || { correct: 0, total: 0 };
      dayStats.correct += correct;
      dayStats.total += total;
      dailyStats.set(date, dayStats);
    }
    
    // Calculate accuracy by type
    for (const type of Object.keys(byType)) {
      const stats = byType[type];
      stats.accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    }
    
    // Calculate daily accuracies
    for (const [date, stats] of dailyStats) {
      const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
      dailyAccuracies.push({ date, accuracy });
    }
    
    // Sort by date
    dailyAccuracies.sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate accuracy streaks (days with >80% accuracy)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check current streak from today backwards
    for (let i = dailyAccuracies.length - 1; i >= 0; i--) {
      const { date, accuracy } = dailyAccuracies[i];
      if (accuracy >= 80) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Calculate longest streak
    for (const { accuracy } of dailyAccuracies) {
      if (accuracy >= 80) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Calculate trends
    const last7DaysAccuracy = last7DaysTotal > 0 ? (last7DaysCorrect / last7DaysTotal) * 100 : 0;
    const last30DaysAccuracy = last30DaysTotal > 0 ? (last30DaysCorrect / last30DaysTotal) * 100 : 0;
    const improvement = last7DaysAccuracy - last30DaysAccuracy;
    
    return {
      overall: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      byType,
      trends: {
        last7Days: last7DaysAccuracy,
        last30Days: last30DaysAccuracy,
        improvement
      },
      streaks: {
        current: currentStreak,
        longest: longestStreak
      }
    };
  }

  /**
   * Process batch of activities for analytics
   */
  static processBatch(data: { activities: ActivityEvent[]; batchSize: number }): {
    processed: number;
    summary: {
      totalScore: number;
      totalTime: number;
      averageAccuracy: number;
      topPerformingType: string;
    };
    insights: string[];
  } {
    const { activities, batchSize } = data;
    const batch = activities.slice(0, batchSize);
    
    let totalScore = 0;
    let totalTime = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    const typePerformance = new Map<string, { correct: number; total: number }>();
    
    for (const activity of batch) {
      if (activity.details.score) totalScore += activity.details.score;
      if (activity.details.duration) totalTime += activity.details.duration;
      if (activity.details.correct) totalCorrect += activity.details.correct;
      if (activity.details.total) totalQuestions += activity.details.total;
      
      // Track type performance
      if (activity.details.correct !== undefined && activity.details.total !== undefined) {
        const perf = typePerformance.get(activity.type) || { correct: 0, total: 0 };
        perf.correct += activity.details.correct;
        perf.total += activity.details.total;
        typePerformance.set(activity.type, perf);
      }
    }
    
    // Find top performing type
    let topPerformingType = 'none';
    let bestAccuracy = 0;
    
    for (const [type, perf] of typePerformance) {
      if (perf.total > 0) {
        const accuracy = (perf.correct / perf.total) * 100;
        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          topPerformingType = type;
        }
      }
    }
    
    // Generate insights
    const insights: string[] = [];
    const averageAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    if (averageAccuracy > 90) {
      insights.push('Excellent performance! You\'re mastering the material.');
    } else if (averageAccuracy > 80) {
      insights.push('Good progress! Keep practicing for better retention.');
    } else if (averageAccuracy < 60) {
      insights.push('Consider reviewing fundamentals to improve accuracy.');
    }
    
    if (totalTime > 0) {
      const avgTimePerActivity = totalTime / batch.length;
      if (avgTimePerActivity > 60000) { // > 1 minute
        insights.push('Taking time to think through problems is beneficial for learning.');
      }
    }
    
    if (typePerformance.size > 3) {
      insights.push('Great variety in practice types! This helps comprehensive learning.');
    }
    
    return {
      processed: batch.length,
      summary: {
        totalScore,
        totalTime,
        averageAccuracy,
        topPerformingType
      },
      insights
    };
  }

  /**
   * Validate data integrity
   */
  static validateData(data: { stats: UserStatsV2; activities: DailyActivity[] }): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const { stats, activities } = data;
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    // Validate stats
    if (stats.totalActivities < 0) {
      errors.push('Total activities cannot be negative');
    }
    
    if (stats.currentStreak < 0) {
      errors.push('Current streak cannot be negative');
    }
    
    if (stats.longestStreak < stats.currentStreak) {
      warnings.push('Longest streak should be >= current streak');
    }
    
    if (stats.overallAccuracy < 0 || stats.overallAccuracy > 100) {
      errors.push('Overall accuracy must be between 0-100%');
    }
    
    if (stats.totalCorrectAnswers > stats.totalQuestionsAnswered) {
      errors.push('Correct answers cannot exceed total questions');
    }
    
    // Validate activities
    let totalActivityCount = 0;
    const dateSet = new Set<string>();
    
    for (const dailyActivity of activities) {
      totalActivityCount += dailyActivity.activities.length;
      dateSet.add(dailyActivity.date);
      
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyActivity.date)) {
        errors.push(`Invalid date format: ${dailyActivity.date}`);
      }
      
      // Validate summary matches activities
      const calculatedTotal = dailyActivity.activities.length;
      if (dailyActivity.summary.totalActivities !== calculatedTotal) {
        warnings.push(`Summary mismatch for ${dailyActivity.date}: expected ${calculatedTotal}, got ${dailyActivity.summary.totalActivities}`);
      }
      
      // Validate activity timestamps
      for (const activity of dailyActivity.activities) {
        const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
        if (activityDate !== dailyActivity.date) {
          warnings.push(`Activity timestamp doesn't match daily activity date: ${activity.id}`);
        }
      }
    }
    
    // Cross-validation
    if (Math.abs(stats.totalActivities - totalActivityCount) > activities.length) {
      warnings.push('Significant discrepancy between stats total and activity count');
    }
    
    if (stats.totalDaysActive !== dateSet.size) {
      warnings.push('Total days active doesn\'t match unique activity dates');
    }
    
    // Suggestions
    if (activities.length > 100) {
      suggestions.push('Consider archiving old activities to improve performance');
    }
    
    if (stats.totalActivities > 10000) {
      suggestions.push('Impressive dedication! Consider tracking additional metrics like study time');
    }
    
    if (stats.overallAccuracy < 70) {
      suggestions.push('Focus on accuracy over speed to improve learning retention');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Compute advanced analytics
   */
  static computeAnalytics(data: AnalyticsData): {
    learningVelocity: number;
    consistencyScore: number;
    improvementRate: number;
    predictions: {
      nextMilestone: string;
      estimatedDays: number;
    };
    recommendations: string[];
  } {
    const { userStats, activities, timeRange } = data;
    
    // Learning velocity (activities per day)
    const learningVelocity = userStats.totalActivities / Math.max(userStats.totalDaysActive, 1);
    
    // Consistency score (based on streak and total days)
    const consistencyScore = userStats.totalDaysActive > 0 
      ? (userStats.longestStreak / userStats.totalDaysActive) * 100 
      : 0;
    
    // Improvement rate calculation
    const now = Date.now();
    const cutoff = now - (timeRange * 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => a.timestamp > cutoff);
    
    let recentCorrect = 0;
    let recentTotal = 0;
    let oldCorrect = 0;
    let oldTotal = 0;
    
    const midpoint = cutoff + ((now - cutoff) / 2);
    
    for (const activity of recentActivities) {
      if (activity.details.correct !== undefined && activity.details.total !== undefined) {
        if (activity.timestamp > midpoint) {
          recentCorrect += activity.details.correct;
          recentTotal += activity.details.total;
        } else {
          oldCorrect += activity.details.correct;
          oldTotal += activity.details.total;
        }
      }
    }
    
    const recentAccuracy = recentTotal > 0 ? (recentCorrect / recentTotal) * 100 : 0;
    const oldAccuracy = oldTotal > 0 ? (oldCorrect / oldTotal) * 100 : 0;
    const improvementRate = recentAccuracy - oldAccuracy;
    
    // Predictions
    let nextMilestone = '';
    let estimatedDays = 0;
    
    const upcomingMilestones = [
      { activities: 100, name: '100 Activities' },
      { activities: 500, name: '500 Activities' },
      { activities: 1000, name: '1000 Activities' },
      { activities: 5000, name: '5000 Activities' }
    ];
    
    for (const milestone of upcomingMilestones) {
      if (userStats.totalActivities < milestone.activities) {
        nextMilestone = milestone.name;
        const remaining = milestone.activities - userStats.totalActivities;
        estimatedDays = Math.ceil(remaining / Math.max(learningVelocity, 1));
        break;
      }
    }
    
    // Recommendations
    const recommendations: string[] = [];
    
    if (learningVelocity < 1) {
      recommendations.push('Try to practice daily for better learning retention');
    } else if (learningVelocity > 10) {
      recommendations.push('Excellent pace! Make sure to balance quantity with quality');
    }
    
    if (consistencyScore < 50) {
      recommendations.push('Focus on building a consistent daily practice habit');
    }
    
    if (improvementRate > 10) {
      recommendations.push('Great improvement! Your accuracy is trending upward');
    } else if (improvementRate < -5) {
      recommendations.push('Consider reviewing fundamentals or reducing practice speed');
    }
    
    if (userStats.overallAccuracy < 70) {
      recommendations.push('Prioritize accuracy over speed to build solid foundations');
    }
    
    if (userStats.currentStreak > 7) {
      recommendations.push('Amazing streak! Consider increasing practice difficulty');
    }
    
    return {
      learningVelocity,
      consistencyScore,
      improvementRate,
      predictions: {
        nextMilestone,
        estimatedDays
      },
      recommendations
    };
  }
}

// Export for use in main thread
export { StatsWorkerLogic };

// Worker message handler (this would be in a separate .worker.ts file in a real implementation)
export const createWorkerHandler = () => {
  return (event: MessageEvent<WorkerRequest>) => {
    const { id, type, data, timestamp } = event.data;
    const startTime = performance.now();
    
    try {
      let result: any;
      
      switch (type) {
        case 'calculate_streaks':
          result = StatsWorkerLogic.calculateStreaks(data);
          break;
        case 'aggregate_daily':
          result = StatsWorkerLogic.aggregateDaily(data);
          break;
        case 'calculate_accuracy':
          result = StatsWorkerLogic.calculateAccuracy(data);
          break;
        case 'process_batch':
          result = StatsWorkerLogic.processBatch(data);
          break;
        case 'validate_data':
          result = StatsWorkerLogic.validateData(data);
          break;
        case 'compute_analytics':
          result = StatsWorkerLogic.computeAnalytics(data);
          break;
        default:
          throw new Error(`Unknown worker message type: ${type}`);
      }
      
      const response: WorkerResponse = {
        id,
        type,
        data: result,
        timestamp: Date.now(),
        processingTime: performance.now() - startTime
      };
      
      // In a real worker, this would be:
      // self.postMessage(response);
      return response;
      
    } catch (error) {
      const response: WorkerResponse = {
        id,
        type,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        processingTime: performance.now() - startTime
      };
      
      // In a real worker, this would be:
      // self.postMessage(response);
      return response;
    }
  };
};