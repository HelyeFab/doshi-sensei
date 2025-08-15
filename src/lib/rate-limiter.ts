/**
 * Enhanced rate limiter for API endpoints
 * TODO: Replace with Redis-based implementation for production multi-instance deployments
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Auto-cleanup every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request is allowed
   * @param identifier Unique identifier (e.g., user email or IP)
   * @returns true if allowed, false if rate limited
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      // New entry or expired window
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
        firstRequest: now
      });
      return true;
    }

    // Check if we've exceeded the limit
    if (entry.count >= this.maxRequests) {
      // Log potential abuse
      if (entry.count === this.maxRequests) {
        console.warn(`Rate limit exceeded for identifier: ${identifier.substring(0, 10)}...`);
      }
      return false;
    }

    // Increment count
    entry.count++;
    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  /**
   * Get reset time for an identifier
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    return entry?.resetTime || Date.now() + this.windowMs;
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime + this.windowMs) { // Keep entries for one extra window
        this.limits.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {

    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Create rate limiters for different endpoints with stricter limits
export const loginRateLimiter = new RateLimiter(900000, 3); // 3 attempts per 15 minutes
export const registrationRateLimiter = new RateLimiter(3600000, 2); // 2 per hour
export const apiRateLimiter = new RateLimiter(60000, 60); // 60 requests per minute for authenticated users
export const publicApiRateLimiter = new RateLimiter(60000, 20); // 20 requests per minute for public endpoints
export const updateLimitRateLimiter = new RateLimiter(60000, 30); // 30 requests per minute
export const debugRateLimiter = new RateLimiter(60000, 60); // 60 requests per minute

/**
 * Express-style rate limit middleware for Next.js API routes
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (identifier: string) => {
    const allowed = limiter.isAllowed(identifier);
    const remaining = limiter.getRemainingRequests(identifier);
    const resetTime = limiter.getResetTime(identifier);

    return {
      allowed,
      remaining,
      resetTime,
      headers: {
        'X-RateLimit-Limit': limiter['maxRequests'].toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetTime.toString()
      }
    };
  };
}