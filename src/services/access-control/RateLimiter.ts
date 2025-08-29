/**
 * Rate Limiter
 * Token bucket algorithm for rate limiting with memory fallback
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export class RateLimiter {
  private buckets: Map<string, Bucket> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  
  // Default limits per feature type
  private readonly limits = {
    default: { capacity: 100, refillRate: 100 }, // 100 requests per minute
    ai: { capacity: 10, refillRate: 10 },         // 10 AI requests per minute
    search: { capacity: 30, refillRate: 30 },     // 30 searches per minute
    review: { capacity: 200, refillRate: 200 },   // 200 reviews per minute
    sync: { capacity: 5, refillRate: 5 }          // 5 syncs per minute
  };

  constructor() {
    // Start cleanup interval to remove old buckets
    this.startCleanup();
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(identifier: string, feature: string): Promise<RateLimitResult> {
    const key = `${identifier}:${feature}`;
    const config = this.getConfig(feature);
    
    // Get or create bucket
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: config.capacity,
        lastRefill: Date.now(),
        capacity: config.capacity,
        refillRate: config.refillRate
      };
      this.buckets.set(key, bucket);
    }
    
    // Refill tokens based on time passed
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 60000) * bucket.refillRate);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
    
    // Check if request can proceed
    if (bucket.tokens >= 1) {
      bucket.tokens--;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens)
      };
    }
    
    // Calculate retry after
    const timeUntilToken = ((1 - bucket.tokens) / bucket.refillRate) * 60000;
    
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil(timeUntilToken / 1000) // in seconds
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string, feature?: string): void {
    if (feature) {
      const key = `${identifier}:${feature}`;
      this.buckets.delete(key);
    } else {
      // Reset all features for identifier
      for (const key of this.buckets.keys()) {
        if (key.startsWith(`${identifier}:`)) {
          this.buckets.delete(key);
        }
      }
    }
  }

  /**
   * Get remaining tokens for an identifier
   */
  getRemaining(identifier: string, feature: string): number {
    const key = `${identifier}:${feature}`;
    const bucket = this.buckets.get(key);
    
    if (!bucket) {
      const config = this.getConfig(feature);
      return config.capacity;
    }
    
    // Calculate current tokens with refill
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / 60000) * bucket.refillRate);
    const currentTokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    
    return Math.floor(currentTokens);
  }

  /**
   * Get configuration for a feature
   */
  private getConfig(feature: string): { capacity: number; refillRate: number } {
    // Determine feature category
    if (feature.includes('ai_') || feature.includes('generate')) {
      return this.limits.ai;
    }
    if (feature.includes('search') || feature.includes('browse')) {
      return this.limits.search;
    }
    if (feature.includes('review') || feature.includes('practice')) {
      return this.limits.review;
    }
    if (feature.includes('sync')) {
      return this.limits.sync;
    }
    
    return this.limits.default;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Clean up old buckets every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      for (const [key, bucket] of this.buckets.entries()) {
        if (now - bucket.lastRefill > maxAge) {
          this.buckets.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.buckets.clear();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalBuckets: number;
    bucketsByFeature: Record<string, number>;
  } {
    const bucketsByFeature: Record<string, number> = {};
    
    for (const key of this.buckets.keys()) {
      const feature = key.split(':')[1];
      bucketsByFeature[feature] = (bucketsByFeature[feature] || 0) + 1;
    }
    
    return {
      totalBuckets: this.buckets.size,
      bucketsByFeature
    };
  }
}