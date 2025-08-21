/**
 * Golden Time Calculator for Unified Review Engine
 * 
 * Determines optimal times for reviews based on:
 * - Time of day preferences
 * - User's historical performance patterns  
 * - Spaced repetition principles
 * - Circadian rhythm research
 */

import { ReviewProgress, PerformanceMetrics } from '../types';

/**
 * Golden time configuration options
 */
export interface GoldenTimeConfig {
  /** User's preferred study times (24h format) */
  preferredTimes?: number[];
  
  /** Time zone offset */
  timezoneOffset?: number;
  
  /** Consider user's performance patterns */
  usePerformancePatterns?: boolean;
  
  /** Minimum gap between study sessions (minutes) */
  minSessionGap?: number;
  
  /** Maximum daily study duration (minutes) */
  maxDailyStudy?: number;
}

/**
 * Golden time assessment result
 */
export interface GoldenTimeResult {
  /** Whether current time is optimal */
  isOptimal: boolean;
  
  /** Optimization score (0-100) */
  score: number;
  
  /** Reason for the assessment */
  reason: string;
  
  /** Suggestion for improvement */
  suggestion?: string;
  
  /** Next optimal time */
  nextOptimalTime?: Date;
  
  /** Peak performance hours for this user */
  peakHours: number[];
}

/**
 * User's performance pattern data
 */
export interface PerformancePattern {
  /** Hour of day (0-23) */
  hour: number;
  
  /** Average accuracy at this hour */
  accuracy: number;
  
  /** Average response time at this hour */
  responseTime: number;
  
  /** Number of sessions at this hour */
  sessionCount: number;
  
  /** Success rate trend */
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Default golden time configuration
 */
const DEFAULT_CONFIG: Required<GoldenTimeConfig> = {
  preferredTimes: [9, 14, 19], // 9 AM, 2 PM, 7 PM
  timezoneOffset: 0,
  usePerformancePatterns: true,
  minSessionGap: 240, // 4 hours
  maxDailyStudy: 120 // 2 hours
};

/**
 * Golden Time Calculator
 */
export class GoldenTimeCalculator {
  private config: Required<GoldenTimeConfig>;
  private performanceCache = new Map<number, PerformancePattern>();

  constructor(config: Partial<GoldenTimeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if current time is optimal for studying
   */
  public assessCurrentTime(
    userProgress?: ReviewProgress[],
    lastStudySession?: Date
  ): GoldenTimeResult {
    const now = new Date();
    const hour = now.getHours();
    
    // Check basic circadian rhythm optimization
    const circadianScore = this.getCircadianScore(hour);
    
    // Check user's performance patterns if available
    let performanceScore = 50; // Neutral if no data
    if (this.config.usePerformancePatterns && userProgress) {
      performanceScore = this.getPerformanceScore(hour, userProgress);
    }
    
    // Check session timing (avoid too frequent sessions)
    const timingScore = this.getTimingScore(lastStudySession);
    
    // Calculate composite score
    const score = Math.round(
      (circadianScore * 0.4) + 
      (performanceScore * 0.4) + 
      (timingScore * 0.2)
    );
    
    const isOptimal = score >= 70;
    const assessment = this.generateAssessment(score, hour, lastStudySession);
    
    return {
      isOptimal,
      score,
      reason: assessment.reason,
      suggestion: assessment.suggestion,
      nextOptimalTime: this.getNextOptimalTime(now),
      peakHours: this.getPeakHours(userProgress)
    };
  }

  /**
   * Get optimal times for the next week
   */
  public getWeeklyOptimalTimes(
    startDate: Date = new Date(),
    userProgress?: ReviewProgress[]
  ): Array<{
    date: Date;
    score: number;
    type: 'peak' | 'good' | 'acceptable';
  }> {
    const optimalTimes: Array<{
      date: Date;
      score: number;
      type: 'peak' | 'good' | 'acceptable';
    }> = [];

    const peakHours = this.getPeakHours(userProgress);
    
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Generate optimal times for this day
      for (const hour of this.config.preferredTimes) {
        const timeSlot = new Date(currentDate);
        timeSlot.setHours(hour, 0, 0, 0);
        
        const circadianScore = this.getCircadianScore(hour);
        const performanceScore = this.config.usePerformancePatterns && userProgress
          ? this.getPerformanceScore(hour, userProgress)
          : 50;
        
        const score = Math.round((circadianScore * 0.6) + (performanceScore * 0.4));
        
        let type: 'peak' | 'good' | 'acceptable';
        if (score >= 85 || peakHours.includes(hour)) {
          type = 'peak';
        } else if (score >= 70) {
          type = 'good';
        } else {
          type = 'acceptable';
        }
        
        optimalTimes.push({
          date: timeSlot,
          score,
          type
        });
      }
    }
    
    return optimalTimes.sort((a, b) => b.score - a.score);
  }

  /**
   * Update performance patterns based on user history
   */
  public updatePerformancePatterns(progressHistory: ReviewProgress[]): void {
    const hourlyStats = new Map<number, {
      totalAccuracy: number;
      totalResponseTime: number;
      sessionCount: number;
      sessions: Date[];
    }>();

    // Aggregate performance data by hour
    for (const progress of progressHistory) {
      if (progress.lastReview) {
        const hour = progress.lastReview.getHours();
        const accuracy = progress.retentionRate;
        const responseTime = progress.averageResponseTime;
        
        if (!hourlyStats.has(hour)) {
          hourlyStats.set(hour, {
            totalAccuracy: 0,
            totalResponseTime: 0,
            sessionCount: 0,
            sessions: []
          });
        }
        
        const stats = hourlyStats.get(hour)!;
        stats.totalAccuracy += accuracy;
        stats.totalResponseTime += responseTime;
        stats.sessionCount++;
        stats.sessions.push(progress.lastReview);
      }
    }

    // Convert to performance patterns
    for (const [hour, stats] of hourlyStats) {
      if (stats.sessionCount >= 3) { // Minimum data for reliable patterns
        const pattern: PerformancePattern = {
          hour,
          accuracy: stats.totalAccuracy / stats.sessionCount,
          responseTime: stats.totalResponseTime / stats.sessionCount,
          sessionCount: stats.sessionCount,
          trend: this.calculateTrend(stats.sessions, progressHistory)
        };
        
        this.performanceCache.set(hour, pattern);
      }
    }
  }

  /**
   * Get user's peak performance hours
   */
  public getPeakHours(userProgress?: ReviewProgress[]): number[] {
    if (!userProgress || !this.config.usePerformancePatterns) {
      return this.config.preferredTimes;
    }

    // Update patterns if we have progress data
    if (userProgress.length > 10) {
      this.updatePerformancePatterns(userProgress);
    }

    // Find hours with best performance
    const patterns = Array.from(this.performanceCache.values())
      .filter(p => p.sessionCount >= 3)
      .sort((a, b) => {
        // Prioritize accuracy, then response time
        const aScore = a.accuracy * 0.7 + (1 / a.responseTime) * 0.3;
        const bScore = b.accuracy * 0.7 + (1 / b.responseTime) * 0.3;
        return bScore - aScore;
      });

    const peakHours = patterns.slice(0, 3).map(p => p.hour);
    
    // Fall back to defaults if insufficient data
    return peakHours.length > 0 ? peakHours : this.config.preferredTimes;
  }

  /**
   * Get circadian rhythm optimization score for an hour
   */
  private getCircadianScore(hour: number): number {
    // Based on research about circadian rhythms and cognitive performance
    const circadianCurve = [
      // 12 AM - 11 PM
      20, 15, 10, 5, 5,     // 00:00 - 04:00 (very poor)
      30, 50, 70, 85, 90,   // 05:00 - 09:00 (morning peak)
      85, 80, 75, 70, 75,   // 10:00 - 14:00 (good)
      80, 85, 90, 85, 75,   // 15:00 - 19:00 (afternoon peak)  
      65, 50, 35, 25        // 20:00 - 23:00 (declining)
    ];
    
    return circadianCurve[hour] || 50;
  }

  /**
   * Get performance score based on user's historical patterns
   */
  private getPerformanceScore(hour: number, userProgress: ReviewProgress[]): number {
    const pattern = this.performanceCache.get(hour);
    
    if (!pattern || pattern.sessionCount < 3) {
      return 50; // Neutral score for insufficient data
    }
    
    // Convert accuracy and response time to score
    const accuracyScore = pattern.accuracy * 100;
    const speedScore = Math.max(0, 100 - (pattern.responseTime - 2) * 10); // Penalty for slow responses
    const trendBonus = pattern.trend === 'improving' ? 10 : 
                      pattern.trend === 'declining' ? -10 : 0;
    
    return Math.min(100, Math.max(0, 
      accuracyScore * 0.6 + speedScore * 0.3 + trendBonus
    ));
  }

  /**
   * Get timing score based on last session
   */
  private getTimingScore(lastSession?: Date): number {
    if (!lastSession) {
      return 100; // No previous session, perfect timing
    }
    
    const now = new Date();
    const hoursSinceLastSession = (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60);
    const minGapHours = this.config.minSessionGap / 60;
    
    if (hoursSinceLastSession < 1) {
      return 20; // Too soon
    } else if (hoursSinceLastSession < minGapHours / 2) {
      return 40; // A bit soon
    } else if (hoursSinceLastSession >= minGapHours) {
      return 100; // Perfect timing
    } else {
      // Gradual improvement as time passes
      const ratio = hoursSinceLastSession / minGapHours;
      return 40 + (ratio * 60);
    }
  }

  /**
   * Generate human-readable assessment
   */
  private generateAssessment(
    score: number, 
    hour: number, 
    lastSession?: Date
  ): { reason: string; suggestion?: string } {
    if (score >= 85) {
      return {
        reason: 'Excellent time for focused learning! Your brain is at peak performance.'
      };
    } else if (score >= 70) {
      return {
        reason: 'Good time for studying with solid retention potential.'
      };
    } else if (score >= 50) {
      if (hour >= 23 || hour < 6) {
        return {
          reason: 'Late night studying may affect memory consolidation.',
          suggestion: 'Consider morning or afternoon sessions for better retention.'
        };
      } else if (lastSession && this.getTimingScore(lastSession) < 50) {
        return {
          reason: 'Recent study session detected - spacing reviews improves retention.',
          suggestion: `Wait ${Math.round(this.config.minSessionGap / 60)} hours between sessions for optimal results.`
        };
      } else {
        return {
          reason: 'Acceptable time for review, though not optimal.',
          suggestion: 'Peak performance hours are typically morning and early evening.'
        };
      }
    } else {
      return {
        reason: 'Suboptimal time for learning - fatigue may impact retention.',
        suggestion: 'Try studying during your peak performance hours for better results.'
      };
    }
  }

  /**
   * Get the next optimal time for studying
   */
  private getNextOptimalTime(from: Date): Date {
    const peakHours = this.config.preferredTimes;
    const currentHour = from.getHours();
    
    // Find next peak hour today
    for (const hour of peakHours.sort((a, b) => a - b)) {
      if (hour > currentHour) {
        const nextTime = new Date(from);
        nextTime.setHours(hour, 0, 0, 0);
        return nextTime;
      }
    }
    
    // No peak hours remaining today, get first one tomorrow
    const tomorrow = new Date(from);
    tomorrow.setDate(from.getDate() + 1);
    tomorrow.setHours(peakHours[0], 0, 0, 0);
    
    return tomorrow;
  }

  /**
   * Calculate performance trend for an hour
   */
  private calculateTrend(
    sessions: Date[], 
    allProgress: ReviewProgress[]
  ): 'improving' | 'stable' | 'declining' {
    if (sessions.length < 6) {
      return 'stable'; // Need more data for trend
    }
    
    // Get recent vs older performance
    const sorted = sessions.sort((a, b) => a.getTime() - b.getTime());
    const recentSessions = sorted.slice(-3);
    const olderSessions = sorted.slice(0, 3);
    
    const recentPerf = this.calculateAveragePerformance(recentSessions, allProgress);
    const olderPerf = this.calculateAveragePerformance(olderSessions, allProgress);
    
    const improvement = recentPerf.accuracy - olderPerf.accuracy;
    
    if (improvement > 0.05) return 'improving';
    if (improvement < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate average performance for session dates
   */
  private calculateAveragePerformance(
    sessionDates: Date[], 
    allProgress: ReviewProgress[]
  ): { accuracy: number; responseTime: number } {
    const relevantProgress = allProgress.filter(p => 
      p.lastReview && sessionDates.some(date => 
        Math.abs(date.getTime() - p.lastReview!.getTime()) < 60000 // Within 1 minute
      )
    );
    
    if (relevantProgress.length === 0) {
      return { accuracy: 0.5, responseTime: 5 };
    }
    
    const totalAccuracy = relevantProgress.reduce((sum, p) => sum + p.retentionRate, 0);
    const totalResponseTime = relevantProgress.reduce((sum, p) => sum + p.averageResponseTime, 0);
    
    return {
      accuracy: totalAccuracy / relevantProgress.length,
      responseTime: totalResponseTime / relevantProgress.length
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<GoldenTimeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): GoldenTimeConfig {
    return { ...this.config };
  }
}