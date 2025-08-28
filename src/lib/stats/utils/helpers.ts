/**
 * Helper utilities for the stats system
 * Common utility functions and formatters
 */

import { 
  UserStatsV2, 
  DailyActivity,
  ActivityType,
  StatsError
} from '../core/interfaces';
import { LOG_PREFIXES } from '../core/constants';

/**
 * Date and time utilities
 */
export class DateUtils {
  /**
   * Get date string in YYYY-MM-DD format using UTC timezone
   * FIXED: Already correctly using UTC - toISOString() always returns UTC
   */
  static getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get timestamp from date string
   * FIXED: Already correctly using UTC with explicit 'Z' suffix
   */
  static getTimestamp(dateString: string): number {
    return new Date(dateString + 'T00:00:00.000Z').getTime();
  }

  /**
   * Check if date is today (using UTC timezone)
   * FIXED: Consistent UTC timezone usage
   */
  static isToday(dateString: string): boolean {
    return dateString === this.getDateString(Date.now());
  }

  /**
   * Check if date is yesterday (using UTC timezone)
   * FIXED: Consistent UTC timezone usage
   */
  static isYesterday(dateString: string): boolean {
    const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);
    return dateString === yesterday;
  }

  /**
   * Get days difference between two dates
   * FIXED: Already correctly using UTC timezone with explicit 'Z' suffix
   */
  static getDaysDifference(date1: string, date2: string): number {
    const d1 = new Date(date1 + 'T00:00:00.000Z');
    const d2 = new Date(date2 + 'T00:00:00.000Z');
    return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
  }

  /**
   * Get date range array
   */
  static getDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      dates.push(this.getDateString(current.getTime()));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Format duration in human readable form
   */
  static formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Statistics calculation utilities
 */
export class StatsUtils {
  /**
   * Calculate accuracy percentage
   */
  static calculateAccuracy(correct: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((correct / total) * 100);
  }

  /**
   * Calculate average
   */
  static calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }

  /**
   * Calculate median
   */
  static calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0 
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  /**
   * Calculate percentile
   */
  static calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  /**
   * Calculate growth rate
   */
  static calculateGrowthRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  /**
   * Format large numbers
   */
  static formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    } else {
      return num.toString();
    }
  }

  /**
   * Format percentage
   */
  static formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate activity type
   */
  static isValidActivityType(type: string): type is ActivityType {
    const validTypes: ActivityType[] = [
      'drill', 'story', 'article', 'kanji', 'game', 'vocab', 'flashcard', 'practice'
    ];
    return validTypes.includes(type as ActivityType);
  }

  /**
   * Validate date string format
   */
  static isValidDateString(date: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    
    const dateObj = new Date(date + 'T00:00:00.000Z');
    return dateObj.toISOString().split('T')[0] === date;
  }

  /**
   * Validate user ID
   */
  static isValidUserId(userId: string): boolean {
    return typeof userId === 'string' && 
           userId.length > 0 && 
           !this.isGuestUser(userId);
  }

  /**
   * Centralized helper to identify guest users
   * This is the single source of truth for guest user detection
   * Prevents guest data from accidentally reaching Firestore
   * 
   * @param userId - User ID to check
   * @returns true if user is a guest user
   */
  static isGuestUser(userId: string | null | undefined): boolean {
    if (!userId || typeof userId !== 'string') {
      return true; // Treat null/undefined as guest
    }

    // All patterns for guest user identification
    return userId === 'guest' ||                    // Exact match
           userId === 'anonymous' ||                // Anonymous pattern  
           userId.includes('guest') ||              // Contains guest
           userId.startsWith('anon') ||             // Anonymous prefix
           userId.endsWith('_guest') ||             // Guest suffix
           userId === 'anonymous_donor' ||          // Donation anonymous
           userId.length === 0;                     // Empty string
  }

  /**
   * Log warning when guest user attempts protected operation
   * @param operation - Description of the operation attempted
   * @param userId - The user ID that was checked
   */
  static logGuestWarning(operation: string, userId: string | null | undefined): void {
    const safeUserId = userId ? `"${userId.substr(0, 12)}..."` : 'null/undefined';
    console.warn(`${LOG_PREFIXES.STATS} Guest user attempted ${operation} - blocked. UserID: ${safeUserId}`);
  }

  /**
   * Validate numeric range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
  }

  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 255): string {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, maxLength);
  }
}

/**
 * Debug and logging utilities
 */
export class DebugUtils {
  /**
   * Create safe logger that doesn't expose sensitive data
   */
  static createLogger(prefix: string): (message: string) => void {
    return (message: string) => {
      const timestamp = new Date().toISOString().substr(11, 8);
      console.log(`${prefix}:${timestamp} ${message}`);
    };
  }

  /**
   * Format object for logging (removes sensitive fields)
   */
  static formatForLogging(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'email'];
    const cleaned: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        cleaned[key] = '[REDACTED]';
      } else if (key === 'userId' && typeof value === 'string') {
        cleaned[key] = value.substr(0, 8) + '...';
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Measure execution time
   */
  static async measureTime<T>(
    operation: () => Promise<T>, 
    operationName: string,
    logger: (message: string) => void = console.log
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - start;
      logger(`${LOG_PREFIXES.STATS} ${operationName} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger(`${LOG_PREFIXES.STATS} ${operationName} failed after ${duration}ms: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Create performance monitor
   */
  static createPerformanceMonitor() {
    const timers: Map<string, number> = new Map();
    
    return {
      start: (name: string) => {
        timers.set(name, Date.now());
      },
      
      end: (name: string): number => {
        const start = timers.get(name);
        if (!start) return 0;
        
        const duration = Date.now() - start;
        timers.delete(name);
        return duration;
      },
      
      getActive: (): string[] => {
        return Array.from(timers.keys());
      }
    };
  }
}

/**
 * Error handling utilities
 */
export class ErrorUtils {
  /**
   * Create standardized stats error
   */
  static createStatsError(
    message: string, 
    code: string, 
    recoverable: boolean = true
  ): StatsError {
    return new StatsError(message, code, recoverable);
  }

  /**
   * Check if error is recoverable
   */
  static isRecoverableError(error: any): boolean {
    if (error instanceof StatsError) {
      return error.recoverable;
    }

    // Network errors are usually recoverable
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('network') || 
             message.includes('timeout') || 
             message.includes('offline') ||
             message.includes('fetch');
    }

    return true; // Default to recoverable
  }

  /**
   * Extract meaningful error message
   */
  static getErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Categorize error type
   */
  static categorizeError(error: any): 'network' | 'validation' | 'storage' | 'sync' | 'unknown' {
    if (error instanceof StatsError) {
      return error.code.toLowerCase().includes('validation') ? 'validation' :
             error.code.toLowerCase().includes('storage') ? 'storage' :
             error.code.toLowerCase().includes('sync') ? 'sync' : 'unknown';
    }

    const message = this.getErrorMessage(error).toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 'network';
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    if (message.includes('storage') || message.includes('database')) {
      return 'storage';
    }
    
    if (message.includes('sync')) {
      return 'sync';
    }
    
    return 'unknown';
  }
}

/**
 * Memory and performance utilities
 */
export class PerformanceUtils {
  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T, 
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Create batch processor for operations
   * @deprecated Use ActivityBatchProcessor for stats activities for better error handling
   */
  static createBatchProcessor<T>(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 50,
    delay: number = 100
  ) {
    let batch: T[] = [];
    let timeoutId: NodeJS.Timeout | null = null;

    const processBatch = async () => {
      if (batch.length === 0) return;
      
      const items = [...batch];
      batch = [];
      
      try {
        await processor(items);
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    };

    return {
      add: (item: T) => {
        batch.push(item);
        
        if (batch.length >= batchSize) {
          if (timeoutId) clearTimeout(timeoutId);
          processBatch();
        } else if (!timeoutId) {
          timeoutId = setTimeout(() => {
            timeoutId = null;
            processBatch();
          }, delay);
        }
      },
      
      flush: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        return processBatch();
      },
      
      size: () => batch.length
    };
  }
}