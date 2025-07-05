import { getEntitlementsForUserType, getFeatureLimit } from '@/utils/userEntitlements';

export type UserType = 'guest' | 'free' | 'monthly' | 'yearly' | 'premium';

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
  subscription: {
    plan: 'free' | 'monthly' | 'yearly';
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    priceId?: string;
    renewalDate?: string;
  };
  limits: {
    maxLists: number; // -1 means unlimited
    maxDrillsPerDay: number; // -1 means unlimited
    maxKanjiQuestPerDay: number; // -1 means unlimited
    maxStoriesPerDay: number; // -1 means unlimited
    maxArticlesPerDay: number; // -1 means unlimited
    canSync: boolean;
    canSave: boolean;
  };
  currentUsage: {
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
  subscription: {
    plan: 'free',
    status: 'active'
  },
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
  subscription: {
    plan: 'monthly',
    status: 'active'
  },
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
  subscription: {
    plan: 'yearly',
    status: 'active'
  },
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
    price: 3.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited drill questions',
      'Unlimited Kanji Quest games',
      'Unlimited vocabulary searches',
      'All mood boards access',
      'Advanced progress tracking',
      'Priority support',
      'Offline mode',
      'Custom study lists',
      'Cloud-synced Pokédex'
    ],
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_monthly',
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly Premium',
    description: 'Best value - save 30% with annual billing',
    price: 39.99,
    currency: 'USD',
    interval: 'year',
    features: [
      'Unlimited drill questions',
      'Unlimited Kanji Quest games',
      'Unlimited vocabulary searches',
      'All mood boards access',
      'Advanced progress tracking',
      'Priority support',
      'Offline mode',
      'Custom study lists',
      '30% savings vs monthly'
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
  },
  // Legacy premium support - maps to monthly for backwards compatibility
  premium: {
    id: 'premium',
    name: 'Premium',
    limits: DEFAULT_MONTHLY_SUBSCRIPTION.limits
  }
};

// For backwards compatibility, add properties to SUBSCRIPTION_PLANS
Object.assign(SUBSCRIPTION_PLANS, SUBSCRIPTION_PLANS_MAP);

// Utility function to normalize user type from legacy 'premium' to specific plan
export function normalizeUserType(userType: UserType): 'guest' | 'free' | 'monthly' | 'yearly' {
  if (userType === 'premium') {
    return 'monthly'; // Default premium to monthly for backwards compatibility
  }
  return userType as 'guest' | 'free' | 'monthly' | 'yearly';
}

// Helper function to check if a user type is premium (monthly or yearly)
export function isPremiumUserType(userType: UserType): boolean {
  return userType === 'premium' || userType === 'monthly' || userType === 'yearly';
}
