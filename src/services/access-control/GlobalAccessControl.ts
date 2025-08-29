/**
 * Global Access Control
 * Enhanced access control integrated with Review Hub architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, EventPriority, ReviewSource } from '../review-events/types';
import { accessControl } from '@/lib/access';
import { RateLimiter } from './RateLimiter';
import { UsageTracker } from './UsageTracker';

// Access denial reasons
export enum AccessDenialReason {
  NOT_AUTHENTICATED = 'not_authenticated',
  DAILY_LIMIT_REACHED = 'daily_limit_reached',
  RATE_LIMITED = 'rate_limited',
  SUBSCRIPTION_REQUIRED = 'subscription_required',
  FEATURE_DISABLED = 'feature_disabled',
  NO_PERMISSION = 'no_permission',
  MAINTENANCE_MODE = 'maintenance_mode'
}

// Access result interface
export interface GlobalAccessResult {
  allowed: boolean;
  reason?: AccessDenialReason;
  remaining?: number;
  resetAt?: Date;
  retryAfter?: number;
  upgradeUrl?: string;
  unlimited?: boolean;
  requiresAuth?: boolean;
}

// Access check parameters
export interface AccessCheckParams {
  userId: string | null;
  feature: string;
  action?: string;
  subscriptionTier?: 'free' | 'monthly' | 'yearly';
  skipRateLimit?: boolean;
  skipUsageTracking?: boolean;
}

// Request with access control
export interface RequestWithAccessControl extends NextRequest {
  accessControl?: GlobalAccessResult;
  userId?: string;
  feature?: string;
}

/**
 * GlobalAccessControl - Unified access control for Review Hub
 */
export class GlobalAccessControl {
  private static instance: GlobalAccessControl;
  private rateLimiter: RateLimiter;
  private usageTracker: UsageTracker;
  private eventBus = getEventBus();
  private maintenanceMode = false;
  private bypassList: Set<string> = new Set();

  private constructor() {
    this.rateLimiter = new RateLimiter();
    this.usageTracker = new UsageTracker();
    
    // Initialize bypass list for legacy endpoints (temporary)
    this.initializeBypassList();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GlobalAccessControl {
    if (!this.instance) {
      this.instance = new GlobalAccessControl();
    }
    return this.instance;
  }

  /**
   * Middleware for Next.js API routes
   */
  static middleware() {
    const instance = GlobalAccessControl.getInstance();
    
    return async (req: RequestWithAccessControl, res: NextResponse, next: () => void) => {
      try {
        // Extract feature from URL path
        const feature = instance.extractFeature(req);
        
        // Check if bypassed (temporary for legacy endpoints)
        if (instance.shouldBypass(req.url)) {
          console.log(`[GlobalAccess] Bypassing access control for ${req.url}`);
          return next();
        }
        
        // Get user ID from session/auth
        const userId = await instance.getUserId(req);
        
        // Perform access check
        const result = await instance.checkAccess({
          userId,
          feature,
          action: req.method
        });
        
        if (!result.allowed) {
          // Emit access denied event
          await instance.emitAccessDeniedEvent(userId, feature, result.reason!);
          
          return NextResponse.json({
            error: result.reason,
            remaining: result.remaining,
            resetAt: result.resetAt,
            retryAfter: result.retryAfter,
            upgradeUrl: result.upgradeUrl
          }, { status: 403 });
        }
        
        // Attach access info to request
        req.accessControl = result;
        req.userId = userId || undefined;
        req.feature = feature;
        
        // Continue to route handler
        next();
        
        // Track usage after successful request (non-blocking)
        if (!result.unlimited && userId) {
          instance.trackUsageAsync(userId, feature);
        }
        
      } catch (error) {
        console.error('[GlobalAccess] Middleware error:', error);
        return NextResponse.json({
          error: 'Internal server error'
        }, { status: 500 });
      }
    };
  }

  /**
   * Check access for a feature
   */
  async checkAccess(params: AccessCheckParams): Promise<GlobalAccessResult> {
    const { userId, feature, subscriptionTier, skipRateLimit, skipUsageTracking } = params;
    
    // 1. Check maintenance mode
    if (this.maintenanceMode && !this.isAdmin(userId)) {
      return {
        allowed: false,
        reason: AccessDenialReason.MAINTENANCE_MODE
      };
    }
    
    // 2. Use existing access control for core logic
    const accessResult = await accessControl.canUserAccess(userId, feature);
    
    // 3. Convert to GlobalAccessResult
    if (!accessResult.allowed) {
      const reason = this.mapAccessReason(accessResult.reason);
      return {
        allowed: false,
        reason,
        remaining: accessResult.remaining,
        resetAt: accessResult.resetAt,
        requiresAuth: reason === AccessDenialReason.NOT_AUTHENTICATED,
        upgradeUrl: reason === AccessDenialReason.SUBSCRIPTION_REQUIRED ? '/pricing' : undefined
      };
    }
    
    // 4. Check rate limits (if not skipped)
    if (!skipRateLimit) {
      const rateLimitOk = await this.rateLimiter.checkLimit(userId || 'anonymous', feature);
      if (!rateLimitOk.allowed) {
        return {
          allowed: false,
          reason: AccessDenialReason.RATE_LIMITED,
          retryAfter: rateLimitOk.retryAfter
        };
      }
    }
    
    // 5. Return success with details
    return {
      allowed: true,
      remaining: accessResult.remaining,
      resetAt: accessResult.resetAt,
      unlimited: accessResult.limit === -1
    };
  }

  /**
   * Track usage after successful action
   */
  async trackUsage(params: {
    userId: string;
    feature: string;
    amount?: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { userId, feature, amount = 1, metadata } = params;
    
    // Track in existing system
    await accessControl.trackUsage(userId, feature);
    
    // Track in our enhanced tracker
    await this.usageTracker.increment(userId, feature, amount);
    
    // Emit usage event
    await this.eventBus.emit({
      type: ReviewEventType.USAGE_TRACKED,
      source: ReviewSource.REVIEW_HUB,
      userId,
      data: {
        itemId: feature,
        itemType: 'kanji',
        metadata: {
          ...metadata,
          remaining: await accessControl.getRemainingUsage(userId, feature)
        }
      },
      priority: EventPriority.LOW
    });
  }

  /**
   * Get usage statistics for a user
   */
  async getUsageStats(userId: string, feature?: string): Promise<{
    daily: Record<string, number>;
    total: Record<string, number>;
    limits: Record<string, number>;
    resetAt: Date;
  }> {
    const stats = await this.usageTracker.getStats(userId);
    
    // Get limits from entitlement system
    const userSummary = await accessControl.getUserAccessSummary(userId);
    const limits: Record<string, number> = {};
    
    for (const [featureId, access] of Object.entries(userSummary.features)) {
      if (access.limit !== undefined) {
        limits[featureId] = access.limit;
      }
    }
    
    return {
      daily: stats.daily,
      total: stats.total,
      limits,
      resetAt: this.getNextResetTime()
    };
  }

  /**
   * Admin: Reset usage for a user
   */
  async resetUsage(userId: string, feature?: string): Promise<void> {
    if (feature) {
      await this.usageTracker.reset(userId, feature);
    } else {
      await this.usageTracker.resetAll(userId);
    }
    
    // Emit event
    await this.eventBus.emit({
      type: ReviewEventType.USAGE_TRACKED,
      source: ReviewSource.REVIEW_HUB,
      userId: 'admin',
      data: {
        itemId: 'usage_reset',
        itemType: 'kanji',
        metadata: {
          targetUserId: userId,
          feature
        }
      },
      priority: EventPriority.LOW
    });
  }

  /**
   * Set maintenance mode
   */
  setMaintenanceMode(enabled: boolean): void {
    this.maintenanceMode = enabled;
    
    if (enabled) {
      this.eventBus.emit({
        type: ReviewEventType.MAINTENANCE_MODE,
        source: ReviewSource.REVIEW_HUB,
        userId: 'system',
        data: {
          itemId: 'maintenance',
          itemType: 'kanji',
          metadata: { enabled }
        },
        priority: EventPriority.CRITICAL
      });
    }
  }

  /**
   * Add endpoint to bypass list (temporary for migration)
   */
  addBypass(pattern: string): void {
    this.bypassList.add(pattern);
  }

  /**
   * Remove endpoint from bypass list
   */
  removeBypass(pattern: string): void {
    this.bypassList.delete(pattern);
  }

  // Private helper methods

  private extractFeature(req: NextRequest): string {
    // Extract feature from URL path
    // e.g., /api/review/kanji-mastery/submit -> kanji_mastery
    const path = req.nextUrl.pathname;
    const parts = path.split('/');
    
    // Look for feature identifier in path
    if (parts.includes('api') && parts.length > 2) {
      const feature = parts[parts.indexOf('api') + 1];
      return feature.replace(/-/g, '_');
    }
    
    return 'unknown';
  }

  private async getUserId(req: NextRequest): Promise<string | null> {
    // Get user ID from session/auth
    // This would integrate with your auth system
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      // Parse JWT or session token
      // For now, return mock user ID
      return 'user_123';
    }
    
    return null;
  }

  private mapAccessReason(reason?: string): AccessDenialReason {
    switch (reason) {
      case 'not_authenticated':
        return AccessDenialReason.NOT_AUTHENTICATED;
      case 'limit_reached':
        return AccessDenialReason.DAILY_LIMIT_REACHED;
      case 'subscription_required':
        return AccessDenialReason.SUBSCRIPTION_REQUIRED;
      case 'feature_disabled':
        return AccessDenialReason.FEATURE_DISABLED;
      case 'no_permission':
        return AccessDenialReason.NO_PERMISSION;
      default:
        return AccessDenialReason.NO_PERMISSION;
    }
  }

  private shouldBypass(url: string): boolean {
    // Check if URL matches any bypass pattern
    for (const pattern of this.bypassList) {
      if (url.includes(pattern)) {
        return true;
      }
    }
    return false;
  }

  private initializeBypassList(): void {
    // Temporary bypasses for legacy endpoints during migration
    this.bypassList.add('/api/auth');
    this.bypassList.add('/api/health');
    this.bypassList.add('/api/public');
    // Will be removed after full migration
  }

  private isAdmin(userId: string | null): boolean {
    // Check if user is admin
    // This would integrate with your auth system
    return userId === 'admin' || userId?.startsWith('admin_');
  }

  private getNextResetTime(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private async trackUsageAsync(userId: string, feature: string): Promise<void> {
    // Non-blocking usage tracking
    setImmediate(async () => {
      try {
        await this.trackUsage({ userId, feature });
      } catch (error) {
        console.error('[GlobalAccess] Failed to track usage:', error);
      }
    });
  }

  private async emitAccessDeniedEvent(
    userId: string | null,
    feature: string,
    reason: AccessDenialReason
  ): Promise<void> {
    await this.eventBus.emit({
      type: ReviewEventType.LIMIT_REACHED,
      source: ReviewSource.REVIEW_HUB,
      userId: userId || 'anonymous',
      data: {
        itemId: feature,
        itemType: 'kanji',
        metadata: {
          reason,
          timestamp: new Date()
        }
      },
      priority: EventPriority.NORMAL
    });
  }
}

// Export singleton instance
export const globalAccessControl = GlobalAccessControl.getInstance();