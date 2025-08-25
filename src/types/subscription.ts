import { getEntitlementsForUserType, getFeatureLimit } from '@/utils/userEntitlements';
import {
  UserProfile,
  UserType,
  LegacyUserType,
  AuthStatus,
  SubscriptionTier,
  createUserProfile,
  createUserProfileFromLegacy,
  getAuthStatusFromLegacy,
  getSubscriptionTierFromLegacy,
  getSubscriptionTierFromData
} from './user-profile';

/**
 * @deprecated Use AuthStatus and SubscriptionTier from user-profile.ts instead
 * Keeping for backward compatibility during migration
 */
export type { UserType, LegacyUserType };

export interface GuestUsage {
  drillsToday: number;
  lastDrillDate: string;
  kanjiQuestToday: number;
  lastKanjiQuestDate: string;
  kanaDropToday: number;
  lastKanaDropDate: string;
  storiesToday: number;
  lastStoryDate: string;
  articlesToday: number;
  lastArticleDate: string;
}

export interface UserSubscription {
  id?: string;
  userId?: string;
  // Flattened structure as per Firebase Functions migration
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
  
  // Payment provider information
  paymentProvider?: 'stripe' | 'paypal' | 'googlepay';
  providerSubscriptionId?: string; // Generic provider subscription ID
  providerCustomerId?: string; // Generic provider customer ID
  
  // Legacy Stripe fields (kept for backwards compatibility)
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  
  // PayPal specific fields
  paypalSubscriptionId?: string;
  paypalPayerId?: string;
  paypalPlanId?: string;
  
  // Google Pay transaction info (Google Pay uses Stripe for subscriptions)
  googlePayTransactionId?: string;
  
  // Common subscription fields
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  
  // Payment method details
  lastPaymentMethod?: {
    type: 'card' | 'paypal' | 'googlepay';
    last4?: string; // For cards
    brand?: string; // Card brand (visa, mastercard, etc.)
    email?: string; // For PayPal
  };
  
  metadata?: {
    source: 'stripe' | 'paypal' | 'googlepay' | 'admin';
    createdAt?: Date;
    updatedAt?: Date;
    upgradedBy?: string;
  };
  limits?: {
    maxLists: number; // -1 means unlimited
    maxDrillsPerDay: number; // -1 means unlimited
    maxKanjiQuestPerDay: number; // -1 means unlimited
    maxStoriesPerDay: number; // -1 means unlimited
    maxArticlesPerDay: number; // -1 means unlimited
    canSync: boolean;
    canSave: boolean;
  };
  currentUsage?: {
    listsCount: number;
    drillsToday: number;
    lastDrillDate: string;
    kanjiQuestToday?: number;
    lastKanjiQuestDate?: string;
    kanaDropToday?: number;
    lastKanaDropDate?: string;
    storiesToday?: number;
    lastStoryDate?: string;
    articlesToday?: number;
    lastArticleDate?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId: string;
  popular?: boolean;
}

export interface SubscriptionFeature {
  id: string;
  name: string;
  description: string;
  included: {
    free: boolean;
    monthly: boolean;
    yearly: boolean;
  };
  limits?: {
    free: number;
    monthly: number | 'unlimited';
    yearly: number | 'unlimited';
  };
}

// Default subscription values - using entitlements system
const freeEntitlements = getEntitlementsForUserType('free');
export const DEFAULT_FREE_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  status: 'active',
  limits: {
    maxLists: getFeatureLimit('free', 'storage.lists', 'total') || 3,
    maxDrillsPerDay: getFeatureLimit('free', 'learning.drills', 'daily') || 3,
    maxKanjiQuestPerDay: getFeatureLimit('free', 'games.kanjiQuest', 'daily') || 3,
    maxStoriesPerDay: getFeatureLimit('free', 'learning.stories', 'daily') || 3,
    maxArticlesPerDay: getFeatureLimit('free', 'learning.articles', 'daily') || 3,
    canSync: freeEntitlements.system.cloudSync.enabled,
    canSave: freeEntitlements.system.progressTracking.enabled
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
    kanaDropToday: 0,
    lastKanaDropDate: new Date().toISOString(),
    storiesToday: 0,
    lastStoryDate: new Date().toISOString(),
    articlesToday: 0,
    lastArticleDate: new Date().toISOString()
  }
};

const monthlyEntitlements = getEntitlementsForUserType('monthly');
export const DEFAULT_MONTHLY_SUBSCRIPTION: UserSubscription = {
  plan: 'monthly',
  status: 'active',
  limits: {
    maxLists: getFeatureLimit('monthly', 'storage.lists', 'total') || -1,
    maxDrillsPerDay: getFeatureLimit('monthly', 'learning.drills', 'daily') || -1,
    maxKanjiQuestPerDay: getFeatureLimit('monthly', 'games.kanjiQuest', 'daily') || -1,
    maxStoriesPerDay: getFeatureLimit('monthly', 'learning.stories', 'daily') || -1,
    maxArticlesPerDay: getFeatureLimit('monthly', 'learning.articles', 'daily') || -1,
    canSync: monthlyEntitlements.system.cloudSync.enabled,
    canSave: monthlyEntitlements.system.progressTracking.enabled
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
    kanaDropToday: 0,
    lastKanaDropDate: new Date().toISOString(),
    storiesToday: 0,
    lastStoryDate: new Date().toISOString(),
    articlesToday: 0,
    lastArticleDate: new Date().toISOString()
  }
};

const yearlyEntitlements = getEntitlementsForUserType('yearly');
export const DEFAULT_YEARLY_SUBSCRIPTION: UserSubscription = {
  plan: 'yearly',
  status: 'active',
  limits: {
    maxLists: getFeatureLimit('yearly', 'storage.lists', 'total') || -1,
    maxDrillsPerDay: getFeatureLimit('yearly', 'learning.drills', 'daily') || -1,
    maxKanjiQuestPerDay: getFeatureLimit('yearly', 'games.kanjiQuest', 'daily') || -1,
    maxStoriesPerDay: getFeatureLimit('yearly', 'learning.stories', 'daily') || -1,
    maxArticlesPerDay: getFeatureLimit('yearly', 'learning.articles', 'daily') || -1,
    canSync: yearlyEntitlements.system.cloudSync.enabled,
    canSave: yearlyEntitlements.system.progressTracking.enabled
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
    kanaDropToday: 0,
    lastKanaDropDate: new Date().toISOString(),
    storiesToday: 0,
    lastStoryDate: new Date().toISOString(),
    articlesToday: 0,
    lastArticleDate: new Date().toISOString()
  }
};

// Utility functions
export function getDefaultSubscription(plan: 'free' | 'monthly' | 'yearly'): UserSubscription {
  switch (plan) {
    case 'monthly':
      return { ...DEFAULT_MONTHLY_SUBSCRIPTION };
    case 'yearly':
      return { ...DEFAULT_YEARLY_SUBSCRIPTION };
    case 'free':
    default:
      return { ...DEFAULT_FREE_SUBSCRIPTION };
  }
}

export function isPremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'yearly';
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function formatLimit(value: number): string {
  return isUnlimited(value) ? '∞' : value.toString();
}

// Legacy support for guest users (non-registered users) - using entitlements system
const guestEntitlements = getEntitlementsForUserType('guest');
export const GUEST_LIMITS = {
  maxLists: getFeatureLimit('guest', 'storage.lists', 'total') || 0,
  maxDrillsPerDay: getFeatureLimit('guest', 'learning.drills', 'daily') || 3,
  maxKanjiQuestPerDay: getFeatureLimit('guest', 'games.kanjiQuest', 'daily') || 3,
  maxStoriesPerDay: getFeatureLimit('guest', 'learning.stories', 'daily') || 3,
  maxArticlesPerDay: getFeatureLimit('guest', 'learning.articles', 'daily') || 3,
  canSync: guestEntitlements.system.cloudSync.enabled,
  canSave: guestEntitlements.system.progressTracking.enabled
};

// Default subscription plans as array
// These are DEFAULT/FALLBACK values only - actual prices come from Stripe
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started with Japanese learning',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '3 drill questions per day',
      'Unlimited vocabulary searches',
      'Basic mood boards access',
      'Community support'
    ],
    stripePriceId: '',
  },
  {
    id: 'monthly',
    name: 'Monthly Premium',
    description: 'Unlock unlimited access to all features',
    price: 0, // Price will be loaded from Stripe
    currency: 'GBP', // Default currency
    interval: 'month',
    features: [
      'Unlimited Anki card imports & SRS',
      'YouTube video shadowing practice',
      'All textbook lessons (Genki & Minna)',
      'Unlimited games & drills',
      'AI context explanations',
      'Cloud sync across devices',
      'Advanced analytics & progress',
      'Priority support',
      'Offline mode'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    description: 'Best value - save with annual billing',
    price: 0, // Price will be loaded from Stripe
    currency: 'GBP', // Default currency
    interval: 'year',
    features: [
      'Unlimited Anki card imports & SRS',
      'YouTube video shadowing practice',
      'All textbook lessons (Genki & Minna)',
      'Unlimited games & drills',
      'AI context explanations',
      'Cloud sync across devices',
      'Advanced analytics & progress',
      'Priority support',
      'Save 17% vs monthly'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID || 'price_yearly',
  },
];

// Subscription plans as object for easy access (backwards compatibility)
export const SUBSCRIPTION_PLANS_MAP = {
  guest: {
    id: 'guest',
    name: 'Guest',
    limits: GUEST_LIMITS
  },
  free: {
    id: 'free',
    name: 'Free',
    limits: DEFAULT_FREE_SUBSCRIPTION.limits
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly Premium',
    limits: DEFAULT_MONTHLY_SUBSCRIPTION.limits
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Premium',
    limits: DEFAULT_YEARLY_SUBSCRIPTION.limits
  }
};

// For backwards compatibility, add properties to SUBSCRIPTION_PLANS
Object.assign(SUBSCRIPTION_PLANS, SUBSCRIPTION_PLANS_MAP);

// Utility function to normalize user type
export function normalizeUserType(userType: UserType): 'guest' | 'free' | 'monthly' | 'yearly' {
  return userType as 'guest' | 'free' | 'monthly' | 'yearly';
}

// Helper function to check if a user type is premium (monthly or yearly)
export function isPremiumUserType(userType: UserType): boolean {
  return userType === 'monthly' || userType === 'yearly';
}

// === NEW USER PROFILE FUNCTIONS ===

/**
 * Get UserProfile with separated authentication and subscription concerns
 * Recommended for new code
 */
export function getUserProfile(subscription: UserSubscription | null, userId?: string): UserProfile {
  if (!subscription) {
    // No subscription = anonymous user
    return createUserProfile('anonymous', 'free');
  }
  
  const plan = subscription.plan;
  const status = subscription.status;
  
  // Check if subscription is actually active
  const isActive = status === 'active' || status === 'trialing';
  
  // Determine subscription tier
  let subscriptionTier: SubscriptionTier;
  if ((plan === 'monthly' || plan === 'yearly') && isActive) {
    subscriptionTier = plan as SubscriptionTier;
  } else {
    // Downgrade to free if subscription is not active
    subscriptionTier = 'free';
  }
  
  // User with subscription is authenticated (even if on free tier)
  return createUserProfile('authenticated', subscriptionTier, userId);
}

/**
 * Get authentication status from subscription
 */
export function getAuthStatus(subscription: UserSubscription | null): AuthStatus {
  return subscription ? 'authenticated' : 'anonymous';
}

/**
 * Get subscription tier from subscription, respecting active status
 */
export function getSubscriptionTier(subscription: UserSubscription | null): SubscriptionTier {
  if (!subscription) return 'free';
  
  const plan = subscription.plan;
  const status = subscription.status;
  const isActive = status === 'active' || status === 'trialing';
  
  if ((plan === 'monthly' || plan === 'yearly') && isActive) {
    return plan as SubscriptionTier;
  }
  
  return 'free';
}

// === LEGACY COMPATIBILITY FUNCTIONS ===

/**
 * @deprecated Use getUserProfile() instead for new code
 * 
 * Legacy function to get user type from subscription.
 * Internally uses the new separated type system but maintains backward compatibility.
 * 
 * Migration path:
 * - Old: const userType = getUserType(subscription)
 * - New: const profile = getUserProfile(subscription, userId)
 * 
 * @param subscription - User subscription data or null for anonymous users
 * @returns Legacy UserType for backward compatibility
 */
export function getUserType(subscription: UserSubscription | null): UserType {
  // Use new separated types internally for consistency
  const authStatus = subscription ? 'authenticated' : 'anonymous';
  const subscriptionTier = getSubscriptionTierFromData(subscription);
  
  // Create UserProfile with separated concerns
  const profile = createUserProfile(authStatus, subscriptionTier);
  
  // Return legacy format for backward compatibility
  // This ensures consistency between old and new approaches
  return profile.legacyUserType as UserType;
}