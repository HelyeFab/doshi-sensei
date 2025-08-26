/**
 * Subscription Helper Functions
 * Centralized utilities for checking subscription status
 */

import { Subscription, SubscriptionPlan } from './types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from 'firebase/auth';

/**
 * Check if a user has an active paid subscription (monthly or yearly)
 */
export function hasPaidPlan(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  
  const isActivePlan = subscription.status === 'active' || subscription.status === 'trialing';
  const isPaidPlan = subscription.plan === 'monthly' || subscription.plan === 'yearly';
  
  return isActivePlan && isPaidPlan;
}

/**
 * Check if a user can sync data to cloud
 * Only users with active paid plans can sync
 */
export function canSyncToCloud(subscription: Subscription | null): boolean {
  return hasPaidPlan(subscription);
}

/**
 * Get subscription from user document
 * Used when we only have a User object and need to check their subscription
 */
export async function getUserSubscription(user: User | null): Promise<Subscription | null> {
  if (!user || !user.uid) return null;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) return null;
    
    const data = userDoc.data();
    return data.subscription as Subscription || null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

/**
 * Check if a user has an active paid plan by their user ID
 * Convenience method that fetches and checks in one go
 */
export async function userHasPaidPlan(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return false;
    
    const data = userDoc.data();
    const subscription = data.subscription as Subscription;
    
    return hasPaidPlan(subscription);
  } catch (error) {
    console.error('Error checking user paid plan:', error);
    return false;
  }
}