export type UserType = 'guest' | 'free' | 'premium';

export interface UserSubscription {
  id?: string;
  userId?: string;
  plan: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'inactive' | 'canceled' | 'past_due';
  
  // Payment provider information
  paymentProvider?: 'stripe' | 'paypal' | 'googlepay';
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  
  // Stripe fields
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  stripePriceId?: string;
  
  // Common subscription fields
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date;
  
  // Payment method details
  lastPaymentMethod?: {
    type: 'card' | 'paypal' | 'googlepay';
    last4?: string;
    brand?: string;
    email?: string;
  };
  
  metadata?: {
    source: 'stripe' | 'paypal' | 'googlepay' | 'admin';
    createdAt?: Date;
    updatedAt?: Date;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}

// Default subscription for free users
export function getDefaultSubscription(plan: 'free' | 'monthly' | 'yearly'): UserSubscription {
  return {
    plan,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper functions
export function isPremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'yearly';
}

export function getUserType(subscription?: UserSubscription): UserType {
  if (!subscription) return 'guest';
  if (isPremiumPlan(subscription.plan) && subscription.status === 'active') {
    return 'premium';
  }
  return 'free';
}