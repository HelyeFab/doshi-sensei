/**
 * Subscriptions System Types
 * Handles payment status and subscription management
 */

export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';
export type SubscriptionSource = 'stripe' | 'admin' | 'promo' | 'system';

export interface Subscription {
  userId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  metadata: {
    source: SubscriptionSource;
    createdAt: Date;
    updatedAt: Date;
    // For debugging
    migrationVersion?: number;
  };
}

export interface SubscriptionCheckResult {
  isActive: boolean;
  plan: SubscriptionPlan;
  daysRemaining?: number;
}