/**
 * Access Control Types
 * Unified API for checking feature access
 */

import { UserType, Permission } from '../entitlements/types';
import { SubscriptionPlan } from '../subscriptions/types';

export interface AccessCheckResult {
  allowed: boolean;
  reason?: 'not_authenticated' | 'no_permission' | 'limit_reached' | 'subscription_required' | 'feature_disabled';
  limit?: number;
  usage?: number;
  remaining?: number;
  userType: UserType;
  resetAt?: Date; // For daily limits
}

export interface UsageRecord {
  userId: string;
  featureId: string;
  date: string; // YYYY-MM-DD for daily tracking
  count: number;
  lastUsedAt: Date;
}

export interface UserUsageSummary {
  daily: Record<string, number>;
  totals: Record<string, number>;
  lastReset: Date;
}