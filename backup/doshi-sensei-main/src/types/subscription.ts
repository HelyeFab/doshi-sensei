export type SubscriptionPlan = 'free' | 'monthly' | 'yearly';

export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  renewalDate?: string;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
}

export interface UsageLimits {
  maxLists: number;
  maxDrillsPerDay: number;
  canSync: boolean;
}

export interface UserSubscription {
  subscription: Subscription;
  limits: UsageLimits;
  currentUsage: {
    listsCount: number;
    drillsToday: number;
    lastDrillDate: string;
  };
}

// Plan configurations
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      maxLists: 3,
      maxDrillsPerDay: 3,
      canSync: false,
    },
    features: [
      'Up to 3 word lists',
      '3 drills per day',
      'Basic conjugation practice',
      'Local storage only'
    ]
  },
  monthly: {
    name: 'Monthly',
    price: 3.99,
    limits: {
      maxLists: -1, // unlimited
      maxDrillsPerDay: -1, // unlimited
      canSync: true,
    },
    features: [
      'Unlimited word lists',
      'Unlimited drills',
      'Cloud sync across devices',
      'Advanced analytics',
      'Priority support'
    ]
  },
  yearly: {
    name: 'Yearly',
    price: 39.99,
    limits: {
      maxLists: -1, // unlimited
      maxDrillsPerDay: -1, // unlimited
      canSync: true,
    },
    features: [
      'Unlimited word lists',
      'Unlimited drills',
      'Cloud sync across devices',
      'Advanced analytics',
      'Priority support',
      '2 months free!'
    ]
  }
} as const;
