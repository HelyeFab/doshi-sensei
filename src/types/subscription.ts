export type UserType = 'guest' | 'free' | 'monthly' | 'yearly' | 'premium';

export interface GuestUsage {
  drillsToday: number;
  lastDrillDate: string;
  kanjiQuestToday: number;
  lastKanjiQuestDate: string;
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

// Default subscription values
export const DEFAULT_FREE_SUBSCRIPTION: UserSubscription = {
  subscription: {
    plan: 'free',
    status: 'active'
  },
  limits: {
    maxLists: 3,
    maxDrillsPerDay: 3,
    maxKanjiQuestPerDay: 3,
    maxStoriesPerDay: 3,
    maxArticlesPerDay: 3,
    canSync: false,
    canSave: true
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
    storiesToday: 0,
    lastStoryDate: new Date().toISOString(),
    articlesToday: 0,
    lastArticleDate: new Date().toISOString()
  }
};

export const DEFAULT_MONTHLY_SUBSCRIPTION: UserSubscription = {
  subscription: {
    plan: 'monthly',
    status: 'active'
  },
  limits: {
    maxLists: -1, // unlimited
    maxDrillsPerDay: -1, // unlimited
    maxKanjiQuestPerDay: -1, // unlimited
    maxStoriesPerDay: -1, // unlimited
    maxArticlesPerDay: -1, // unlimited
    canSync: true,
    canSave: true
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
    storiesToday: 0,
    lastStoryDate: new Date().toISOString(),
    articlesToday: 0,
    lastArticleDate: new Date().toISOString()
  }
};

export const DEFAULT_YEARLY_SUBSCRIPTION: UserSubscription = {
  subscription: {
    plan: 'yearly',
    status: 'active'
  },
  limits: {
    maxLists: -1, // unlimited
    maxDrillsPerDay: -1, // unlimited
    maxKanjiQuestPerDay: -1, // unlimited
    maxStoriesPerDay: -1, // unlimited
    maxArticlesPerDay: -1, // unlimited
    canSync: true,
    canSave: true
  },
  currentUsage: {
    listsCount: 0,
    drillsToday: 0,
    lastDrillDate: new Date().toISOString(),
    kanjiQuestToday: 0,
    lastKanjiQuestDate: new Date().toISOString(),
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

// Legacy support for guest users (non-registered users)
export const GUEST_LIMITS = {
  maxLists: 0,
  maxDrillsPerDay: 3,
  maxKanjiQuestPerDay: 3,
  maxStoriesPerDay: 3,
  maxArticlesPerDay: 3,
  canSync: false,
  canSave: false
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
