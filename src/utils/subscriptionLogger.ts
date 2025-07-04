/**
 * Centralized Subscription State Logger
 *
 * This utility provides a single point for logging subscription state changes
 * and can be easily toggled on/off for production environments.
 */

import { UserSubscription, UserType } from '@/types/subscription';
import { User } from 'firebase/auth';

interface SubscriptionLogData {
  user: User | null;
  userSubscription: UserSubscription | null;
  userType: UserType;
  loading: boolean;
  timestamp: string;
  event: 'login' | 'subscription_update' | 'logout' | 'feature_check';
  details?: Record<string, any>;
}

class SubscriptionLogger {
  private enabled: boolean;

  constructor() {
    // Only enable logging in development or if explicitly enabled
    this.enabled = process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_DEBUG_SUBSCRIPTIONS === 'true';
  }

  /**
   * Main logging method for subscription state
   */
  logSubscriptionState(data: SubscriptionLogData): void {
    if (!this.enabled) return;

    const logEntry = {
      '🔐 SUBSCRIPTION STATE': data.event.toUpperCase().replace('_', ' '),
      '⏰ Timestamp': data.timestamp,
      '👤 User': {
        email: data.user?.email || 'Not logged in',
        uid: data.user?.uid || 'N/A',
        isAuthenticated: !!data.user
      },
      '💳 Subscription': data.userSubscription ? {
        status: data.userSubscription.subscription.status,
        plan: data.userSubscription.subscription.plan,
        stripeId: data.userSubscription.subscription.stripeSubscriptionId || 'N/A',
        cancelAtPeriodEnd: data.userSubscription.subscription.cancelAtPeriodEnd || false,
        renewalDate: data.userSubscription.subscription.renewalDate || 'N/A'
      } : 'No subscription data',
      '🏷️ User Type': data.userType,
      '📊 Limits': data.userSubscription?.limits || 'N/A',
      '📈 Current Usage': data.userSubscription?.currentUsage || 'N/A',
      '⏳ Loading': data.loading,
      '🔍 Additional Details': data.details || {}
    };

    // Use console.table for better readability
    console.group(`🔐 Doshi Sensei Subscription State - ${data.event}`);
    console.table(logEntry);
    console.groupEnd();
  }

  /**
   * Log user login event with subscription state
   */
  logUserLogin(
    user: User | null,
    userSubscription: UserSubscription | null,
    userType: UserType,
    loading: boolean
  ): void {
    this.logSubscriptionState({
      user,
      userSubscription,
      userType,
      loading,
      timestamp: new Date().toISOString(),
      event: 'login',
      details: {
        loginMethod: user?.providerData?.[0]?.providerId || 'unknown',
        isPremium: userType === 'premium' ||
          (userSubscription?.subscription?.status === 'active' &&
            ['monthly', 'yearly'].includes(userSubscription?.subscription?.plan || ''))
      }
    });
  }

  /**
   * Log subscription update event
   */
  logSubscriptionUpdate(
    user: User | null,
    userSubscription: UserSubscription | null,
    userType: UserType,
    previousPlan?: string
  ): void {
    this.logSubscriptionState({
      user,
      userSubscription,
      userType,
      loading: false,
      timestamp: new Date().toISOString(),
      event: 'subscription_update',
      details: {
        previousPlan,
        newPlan: userSubscription?.subscription?.plan || 'free',
        planChanged: previousPlan !== userSubscription?.subscription?.plan
      }
    });
  }

  /**
   * Log feature access check
   */
  logFeatureCheck(
    feature: string,
    allowed: boolean,
    user: User | null,
    userSubscription: UserSubscription | null,
    userType: UserType
  ): void {
    if (!this.enabled) return;

    console.log(`🔑 Feature Access Check: ${feature}`, {
      allowed,
      userType,
      userEmail: user?.email || 'guest',
      isPremium: userType === 'premium',
      limits: userSubscription?.limits || 'N/A',
      currentUsage: userSubscription?.currentUsage || 'N/A'
    });
  }

  /**
   * Enable/disable logging dynamically
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const subscriptionLogger = new SubscriptionLogger();

// Export type for use in components
export type { SubscriptionLogData };

/**
 * Pretty, all-in-one debug log for user, subscription, limits, usage, and KanjiQuest info
 * Prints a single, emoji-rich, user-friendly log for quick debugging
 */
export function logFullUserDebugInfo({
  user,
  userSubscription,
  userType,
  loading,
  kanjiQuest,
  context = 'Debug Info',
  extra = {}
}: {
  user: User | null,
  userSubscription: UserSubscription | null,
  userType: UserType,
  loading: boolean,
  kanjiQuest?: any,
  context?: string,
  extra?: Record<string, any>
}) {
  // Helper for checkmark/cross
  const yes = '✅';
  const no = '❌';
  const dash = '—';
  const get = (v: any, fallback = dash) => v !== undefined && v !== null ? v : fallback;

  // User Info
  const userInfo = [
    `👤  Email: ${get(user?.email, 'Not logged in')}`,
    `🆔  UID: ${get(user?.uid, 'N/A')}`,
    `🔑  Authenticated: ${user ? yes : no}`
  ].join('\n');

  // Subscription Info
  const sub = userSubscription?.subscription;
  const subInfo = [
    `💳  Plan: ${get(sub?.plan, 'N/A')}${userType === 'premium' ? ' 🌟' : ''}`,
    `📅  Status: ${get(sub?.status, 'N/A')}`,
    `♾️  Unlimited: ${userSubscription?.hasUnlimited ? yes : no}`,
    `🆔  Stripe ID: ${get(sub?.stripeSubscriptionId, 'N/A')}`,
    `⏳  Cancel At: ${get(sub?.cancelAtPeriodEnd, dash)}`,
    `🔁  Renewal: ${get(sub?.renewalDate, dash)}`
  ].join('\n');

  // Limits
  const limits = userSubscription?.limits || {};
  const limitsInfo = [
    `🈚  Max Kanji: ${get(limits.maxKanji)}`,
    `📝  Max Drills: ${get(limits.maxDrill)}`,
    `📚  Max Stories: ${get(limits.maxStories)}`,
    `📰  Max Articles: ${get(limits.maxArticles)}`,
    `📋  Max Lists: ${get(limits.maxLists)}`,
    `💾  Can Save: ${limits.canSave ? yes : no}`,
    `🔄  Can Sync: ${limits.canSync ? yes : no}`
  ].join('\n');

  // Usage
  const usage = userSubscription?.currentUsage || {};
  const usageInfo = [
    `🈴  Kanji Used: ${get(usage.kanji, 0)}`,
    `📝  Drills Used: ${get(usage.drills, 0)}`,
    `📚  Stories Used: ${get(usage.stories, 0)}`,
    `📰  Articles Used: ${get(usage.articles, 0)}`,
    `📋  Lists Used: ${get(usage.lists, 0)}`
  ].join('\n');

  // KanjiQuest
  const kq = kanjiQuest || {};
  const kqInfo = [
    `🏆  Battles Today: ${get(kq.battles, dash)}`,
    `🕒  Last Play: ${get(kq.lastPlayDate, dash)}`
  ].join('\n');

  // All Checks
  const allChecks = [
    `🟢  All Checks Passed: ${userSubscription?.allChecksPassed ? yes : no}`,
    `🌟  Is Premium: ${userType === 'premium' ? yes : no}`,
    `🔄  Loading: ${loading ? yes : no}`
  ].join('\n');

  // Extra (if any)
  const extraInfo = Object.keys(extra).length
    ? '\n' + Object.entries(extra).map(([k, v]) => `🔸 ${k}: ${v}`).join('\n')
    : '';

  // Print all in a single, pretty log
  console.group(`🚦 Doshi Sensei User Debug - ${context}`);
  console.log(`\n${userInfo}\n\n${subInfo}\n\n${limitsInfo}\n\n${usageInfo}\n\n${kqInfo}\n\n${allChecks}${extraInfo}\n`);
  console.groupEnd();
}
