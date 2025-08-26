/**
 * Rate Limiter for Authentication
 * In-memory rate limiting with automatic cleanup
 */

import { AUTH_CONFIG, AUTH_ERRORS } from './constants';
import { RateLimitConfig } from './types';

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up old entries every 5 minutes
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Check if an action is rate limited
   */
  async checkLimit(
    identifier: string,
    action: keyof typeof AUTH_CONFIG.RATE_LIMITS
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const config = AUTH_CONFIG.RATE_LIMITS[action];
    const key = `${action}:${identifier}`;
    const now = Date.now();
    
    const entry = this.limits.get(key);
    
    // No previous attempts
    if (!entry) {
      this.limits.set(key, {
        attempts: 1,
        firstAttempt: now,
      });
      return { allowed: true };
    }
    
    // Check if blocked
    if (entry.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000),
      };
    }
    
    // Check if window has expired
    if (now - entry.firstAttempt > config.windowMs) {
      // Reset the window
      this.limits.set(key, {
        attempts: 1,
        firstAttempt: now,
      });
      return { allowed: true };
    }
    
    // Within window, check attempts
    if (entry.attempts >= config.maxAttempts) {
      // Block the user
      entry.blockedUntil = now + config.blockDurationMs;
      this.limits.set(key, entry);
      
      // Log suspicious activity if too many attempts
      if (entry.attempts > config.maxAttempts * 2) {
        await this.logSuspiciousActivity(identifier, action);
      }
      
      return {
        allowed: false,
        retryAfter: Math.ceil(config.blockDurationMs / 1000),
      };
    }
    
    // Increment attempts
    entry.attempts++;
    this.limits.set(key, entry);
    
    return { allowed: true };
  }

  /**
   * Reset rate limit for a specific identifier and action
   */
  reset(identifier: string, action?: keyof typeof AUTH_CONFIG.RATE_LIMITS) {
    if (action) {
      this.limits.delete(`${action}:${identifier}`);
    } else {
      // Reset all actions for this identifier
      for (const key of this.limits.keys()) {
        if (key.includes(`:${identifier}`)) {
          this.limits.delete(key);
        }
      }
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    const maxAge = Math.max(
      ...Object.values(AUTH_CONFIG.RATE_LIMITS).map(
        config => config.windowMs + config.blockDurationMs
      )
    );
    
    for (const [key, entry] of this.limits.entries()) {
      if (now - entry.firstAttempt > maxAge) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Log suspicious activity for admin monitoring
   */
  private async logSuspiciousActivity(identifier: string, action: string) {
    if (typeof window === 'undefined') return;
    
    try {
      // This will be picked up by the security monitoring system
      await fetch('/api/auth/security/suspicious', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          action,
          timestamp: new Date().toISOString(),
          type: 'excessive_rate_limit_attempts',
        }),
      });
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * Get current limits for monitoring
   */
  getCurrentLimits(): Map<string, RateLimitEntry> {
    return new Map(this.limits);
  }

  /**
   * Cleanup on unmount
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Helper function to check rate limit with error throwing
 */
export async function enforceRateLimit(
  identifier: string,
  action: keyof typeof AUTH_CONFIG.RATE_LIMITS
): Promise<void> {
  const limiter = getRateLimiter();
  const { allowed, retryAfter } = await limiter.checkLimit(identifier, action);
  
  if (!allowed) {
    const error = new Error(
      `Too many attempts. Please try again in ${retryAfter} seconds.`
    );
    (error as any).code = AUTH_ERRORS.TOO_MANY_ATTEMPTS;
    (error as any).retryAfter = retryAfter;
    throw error;
  }
}