/**
 * Review Optimization Service for Kanji Mastery
 * Ensures reviews are shown at the optimal time for memory retention
 */

export class ReviewOptimizer {
  /**
   * Check if a review is truly due based on spaced repetition principles
   * @param nextReviewDate The scheduled next review date
   * @param options Configuration options
   * @returns Whether the review should be shown now
   */
  static isReviewDue(
    nextReviewDate: Date | string,
    options: {
      bufferMinutes?: number; // Grace period before showing as due
      allowEarlyReview?: boolean; // Allow reviews slightly before due time
      maxEarlyMinutes?: number; // Maximum minutes before due time to allow
    } = {}
  ): boolean {
    const {
      bufferMinutes = 0, // No buffer by default - show exactly when due
      allowEarlyReview = false,
      maxEarlyMinutes = 30
    } = options;

    const now = new Date();
    const dueDate = new Date(nextReviewDate);
    
    // Check if the review is overdue (past the scheduled time)
    if (dueDate <= now) {
      return true;
    }
    
    // Check if early review is allowed and within the allowed window
    if (allowEarlyReview) {
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
      if (minutesUntilDue <= maxEarlyMinutes) {
        return true;
      }
    }
    
    // Apply buffer if specified (makes reviews appear slightly later)
    if (bufferMinutes > 0) {
      const bufferedDueDate = new Date(dueDate.getTime() + bufferMinutes * 60 * 1000);
      return bufferedDueDate <= now;
    }
    
    return false;
  }

  /**
   * Get the urgency level of a review
   * @param nextReviewDate The scheduled review date
   * @returns Urgency level and recommended action
   */
  static getReviewUrgency(nextReviewDate: Date | string): {
    level: 'overdue' | 'due' | 'soon' | 'scheduled';
    hoursOverdue?: number;
    hoursUntilDue?: number;
    message: string;
    color: string;
  } {
    const now = new Date();
    const dueDate = new Date(nextReviewDate);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 0) {
      // Overdue
      const hoursOverdue = Math.abs(diffHours);
      
      if (hoursOverdue > 24) {
        return {
          level: 'overdue',
          hoursOverdue,
          message: `Overdue by ${Math.floor(hoursOverdue / 24)} days`,
          color: 'text-red-600'
        };
      } else if (hoursOverdue > 1) {
        return {
          level: 'overdue',
          hoursOverdue,
          message: `Overdue by ${Math.floor(hoursOverdue)} hours`,
          color: 'text-orange-600'
        };
      } else {
        return {
          level: 'overdue',
          hoursOverdue,
          message: 'Due now',
          color: 'text-green-600'
        };
      }
    } else if (diffHours <= 1) {
      // Due within the hour
      return {
        level: 'due',
        hoursUntilDue: diffHours,
        message: 'Due within 1 hour',
        color: 'text-yellow-600'
      };
    } else if (diffHours <= 24) {
      // Due today
      return {
        level: 'soon',
        hoursUntilDue: diffHours,
        message: `Due in ${Math.floor(diffHours)} hours`,
        color: 'text-blue-600'
      };
    } else {
      // Scheduled for future
      const daysUntil = Math.floor(diffHours / 24);
      return {
        level: 'scheduled',
        hoursUntilDue: diffHours,
        message: `Due in ${daysUntil} days`,
        color: 'text-gray-600'
      };
    }
  }

  /**
   * Group reviews by optimal study time
   * @param reviews Array of kanji progress with review dates
   * @returns Grouped reviews for efficient studying
   */
  static groupReviewsByTiming(reviews: Array<{ nextReview: Date | string; [key: string]: any }>) {
    const now = new Date();
    const groups = {
      overdue: [] as any[],
      dueToday: [] as any[],
      dueTomorrow: [] as any[],
      dueThisWeek: [] as any[],
      future: [] as any[]
    };
    
    reviews.forEach(review => {
      const urgency = this.getReviewUrgency(review.nextReview);
      
      if (urgency.level === 'overdue') {
        groups.overdue.push(review);
      } else if (urgency.level === 'due' || urgency.level === 'soon') {
        if (urgency.hoursUntilDue! <= 24) {
          groups.dueToday.push(review);
        }
      } else {
        const daysUntil = urgency.hoursUntilDue! / 24;
        if (daysUntil <= 1) {
          groups.dueTomorrow.push(review);
        } else if (daysUntil <= 7) {
          groups.dueThisWeek.push(review);
        } else {
          groups.future.push(review);
        }
      }
    });
    
    // Sort each group by urgency
    Object.keys(groups).forEach(key => {
      groups[key as keyof typeof groups].sort((a, b) => 
        new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
      );
    });
    
    return groups;
  }

  /**
   * Calculate the optimal review session size based on available reviews
   * @param overdueCount Number of overdue reviews
   * @param dueTodayCount Number of reviews due today
   * @param userLevel User's subscription level
   * @returns Recommended session size
   */
  static getOptimalSessionSize(
    overdueCount: number,
    dueTodayCount: number,
    userLevel: 'guest' | 'free' | 'premium'
  ): number {
    const maxSizes = {
      guest: 10,
      free: 20,
      premium: 50
    };
    
    const maxSize = maxSizes[userLevel];
    
    // Prioritize overdue reviews
    if (overdueCount > 0) {
      // If many overdue, suggest a focused session
      if (overdueCount > maxSize) {
        return maxSize;
      } else if (overdueCount > 10) {
        return Math.min(overdueCount, maxSize);
      } else {
        // Mix overdue with some due today
        return Math.min(overdueCount + Math.floor(dueTodayCount / 2), maxSize);
      }
    }
    
    // If no overdue, suggest reasonable session from due today
    if (dueTodayCount > 0) {
      if (dueTodayCount <= 5) {
        return dueTodayCount;
      } else if (dueTodayCount <= 20) {
        return Math.min(10, maxSize);
      } else {
        return Math.min(20, maxSize);
      }
    }
    
    // Default suggestion for new learning
    return 5;
  }

  /**
   * Check if it's a good time for review based on time of day
   * @returns Whether it's an optimal time for studying
   */
  static isOptimalStudyTime(): {
    isOptimal: boolean;
    reason: string;
    suggestion?: string;
  } {
    const now = new Date();
    const hour = now.getHours();
    
    // Late night (11 PM - 5 AM) - not optimal
    if (hour >= 23 || hour < 5) {
      return {
        isOptimal: false,
        reason: 'Late night studying may affect retention',
        suggestion: 'Consider reviewing in the morning for better retention'
      };
    }
    
    // Early morning (5 AM - 9 AM) - optimal
    if (hour >= 5 && hour < 9) {
      return {
        isOptimal: true,
        reason: 'Morning is great for memory retention'
      };
    }
    
    // Late morning to afternoon (9 AM - 3 PM) - good
    if (hour >= 9 && hour < 15) {
      return {
        isOptimal: true,
        reason: 'Good time for focused study'
      };
    }
    
    // Late afternoon (3 PM - 6 PM) - okay
    if (hour >= 15 && hour < 18) {
      return {
        isOptimal: true,
        reason: 'Afternoon review helps consolidation'
      };
    }
    
    // Evening (6 PM - 11 PM) - good for review
    if (hour >= 18 && hour < 23) {
      return {
        isOptimal: true,
        reason: 'Evening reviews aid long-term retention'
      };
    }
    
    return {
      isOptimal: true,
      reason: 'Good time for study'
    };
  }
}

export default ReviewOptimizer;