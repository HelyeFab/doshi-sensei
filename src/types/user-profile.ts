/**
 * User Profile Types - Separation of Authentication and Subscription Concerns
 * 
 * This module separates authentication status from subscription tier to eliminate
 * semantic confusion between 'guest' (unauthenticated) and 'free' (authenticated, no subscription).
 * 
 * Key Benefits:
 * - Clear separation of authentication vs payment concerns
 * - Better type safety for user permissions
 * - Easier testing and business logic
 * - Backward compatible with existing code
 */

import { User } from 'firebase/auth';

// === NEW SEPARATED TYPES ===

/**
 * Authentication status - whether user is logged in or not
 */
export type AuthStatus = 'authenticated' | 'anonymous';

/**
 * Subscription tier - the user's payment/subscription level
 */
export type SubscriptionTier = 'free' | 'monthly' | 'yearly';

/**
 * Combined user profile with separated concerns
 */
export interface UserProfile {
  authStatus: AuthStatus;
  subscriptionTier: SubscriptionTier;
  userId?: string; // Only present when authenticated
  
  /**
   * Helper to get legacy UserType for backward compatibility
   * @deprecated Use authStatus and subscriptionTier directly
   */
  get legacyUserType(): LegacyUserType;
}

// === LEGACY COMPATIBILITY ===

/**
 * @deprecated Use UserProfile with separated AuthStatus and SubscriptionTier instead
 */
export type LegacyUserType = 'guest' | 'free' | 'monthly' | 'yearly';

// Re-export as UserType for existing code compatibility
export type UserType = LegacyUserType;

// === HELPER FUNCTIONS ===

/**
 * Create a UserProfile from separated concerns
 */
export function createUserProfile(
  authStatus: AuthStatus, 
  subscriptionTier: SubscriptionTier,
  userId?: string
): UserProfile {
  return {
    authStatus,
    subscriptionTier,
    userId,
    get legacyUserType(): LegacyUserType {
      return authStatus === 'anonymous' ? 'guest' : subscriptionTier;
    }
  };
}

/**
 * Create UserProfile from legacy UserType
 * @deprecated Use createUserProfile with separated concerns instead
 */
export function createUserProfileFromLegacy(
  legacyUserType: LegacyUserType,
  userId?: string
): UserProfile {
  if (legacyUserType === 'guest') {
    return createUserProfile('anonymous', 'free');
  }
  
  return createUserProfile('authenticated', legacyUserType as SubscriptionTier, userId);
}

/**
 * Convert UserProfile to legacy UserType
 * @deprecated Use profile.legacyUserType getter instead
 */
export function toLegacyUserType(profile: UserProfile): LegacyUserType {
  return profile.legacyUserType;
}

/**
 * Get AuthStatus from legacy UserType
 */
export function getAuthStatusFromLegacy(legacyUserType: LegacyUserType): AuthStatus {
  return legacyUserType === 'guest' ? 'anonymous' : 'authenticated';
}

/**
 * Get SubscriptionTier from legacy UserType
 */
export function getSubscriptionTierFromLegacy(legacyUserType: LegacyUserType): SubscriptionTier {
  return legacyUserType === 'guest' ? 'free' : legacyUserType as SubscriptionTier;
}

// === REQUIRED HELPER FUNCTIONS ===

/**
 * Convert UserProfile to legacy UserType
 * For backward compatibility with existing code
 */
export function toUserProfile(userType: UserType): UserProfile {
  return createUserProfileFromLegacy(userType as LegacyUserType);
}

/**
 * Convert legacy UserType to UserProfile
 * For backward compatibility with existing code
 */
export function fromUserProfile(profile: UserProfile): UserType {
  return profile.legacyUserType as UserType;
}

/**
 * Get AuthStatus from Firebase User (direct from auth)
 * Useful when you have Firebase User but no subscription data yet
 */
export function getAuthStatus(user: User | null): AuthStatus {
  return user ? 'authenticated' : 'anonymous';
}

/**
 * Get SubscriptionTier from subscription data
 * This is a pure function that only looks at subscription status
 * @param subscription - Can be null for anonymous users
 */
export function getSubscriptionTierFromData(subscription: { plan?: string; status?: string } | null): SubscriptionTier {
  if (!subscription) return 'free';
  
  const plan = subscription.plan;
  const status = subscription.status;
  
  // Check if subscription is active
  const isActive = status === 'active' || status === 'trialing';
  
  if ((plan === 'monthly' || plan === 'yearly') && isActive) {
    return plan as SubscriptionTier;
  }
  
  return 'free';
}

// === TYPE GUARDS ===

/**
 * Check if user is authenticated
 */
export function isAuthenticated(profile: UserProfile): boolean {
  return profile.authStatus === 'authenticated';
}

/**
 * Check if user has premium subscription
 */
export function hasPremiumSubscription(profile: UserProfile): boolean {
  return profile.subscriptionTier === 'monthly' || profile.subscriptionTier === 'yearly';
}

/**
 * Check if user is authenticated with premium subscription
 */
export function isPremiumUser(profile: UserProfile): boolean {
  return isAuthenticated(profile) && hasPremiumSubscription(profile);
}

/**
 * Check if legacy UserType is premium
 * @deprecated Use hasPremiumSubscription with UserProfile instead
 */
export function isLegacyPremium(legacyUserType: LegacyUserType): boolean {
  return legacyUserType === 'monthly' || legacyUserType === 'yearly';
}

/**
 * Check if legacy UserType is authenticated
 * @deprecated Use isAuthenticated with UserProfile instead
 */
export function isLegacyAuthenticated(legacyUserType: LegacyUserType): boolean {
  return legacyUserType !== 'guest';
}

// === MIGRATION HELPERS ===

/**
 * Migration utility: Convert all possible user type representations to UserProfile
 */
export function normalizeToUserProfile(
  input: LegacyUserType | UserProfile | { authStatus: AuthStatus; subscriptionTier: SubscriptionTier },
  userId?: string
): UserProfile {
  if (typeof input === 'string') {
    // Legacy UserType string
    return createUserProfileFromLegacy(input, userId);
  }
  
  if ('legacyUserType' in input) {
    // Already a UserProfile
    return input;
  }
  
  // Object with separated concerns
  return createUserProfile(input.authStatus, input.subscriptionTier, userId);
}

/**
 * Migration utility: Safely extract legacy UserType from any input
 */
export function extractLegacyUserType(
  input: LegacyUserType | UserProfile | { authStatus: AuthStatus; subscriptionTier: SubscriptionTier }
): LegacyUserType {
  const profile = normalizeToUserProfile(input);
  return profile.legacyUserType;
}