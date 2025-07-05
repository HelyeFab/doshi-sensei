/**
 * React Hook for User Entitlements
 * 
 * This hook provides an easy way to check feature entitlements,
 * validate access, and handle limit enforcement in React components.
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { subscriptionValidator } from '@/utils/subscriptionValidator';
import { 
  getEntitlementsForUserType, 
  isFeatureEnabled, 
  getFeatureLimit,
  isUnlimited,
  UserEntitlements 
} from '@/utils/userEntitlements';
import { UserType } from '@/types/subscription';

export interface EntitlementCheck {
  allowed: boolean;
  limit?: number;
  used?: number;
  remaining?: number;
  unlimited: boolean;
  reason?: string;
}

export interface UseEntitlementsReturn {
  // Current user type
  userType: UserType;
  
  // Full entitlements object
  entitlements: UserEntitlements;
  
  // Check if a feature is enabled
  isEnabled: (featurePath: string) => boolean;
  
  // Get limit for a feature
  getLimit: (featurePath: string, limitType?: 'daily' | 'total') => number | undefined;
  
  // Check if user can access a feature (considering current usage)
  canAccess: (featurePath: string, currentUsage?: { daily?: number; total?: number }) => EntitlementCheck;
  
  // Check specific features with usage data
  canPlayGame: (gameType: 'kanjiQuest' | 'kanaDrop' | 'otherGames') => EntitlementCheck;
  canCreateList: () => EntitlementCheck;
  canBookmark: () => EntitlementCheck;
  canDoDrill: () => EntitlementCheck;
  canReadStory: () => EntitlementCheck;
  canReadArticle: () => EntitlementCheck;
  
  // Trigger login/upgrade prompts
  promptForAccess: (featureName: string, customMessage?: string) => void;
  
  // Loading state
  loading: boolean;
}

export function useEntitlements(): UseEntitlementsReturn {
  const { user, loading: authLoading } = useAuth();
  const { 
    userSubscription, 
    guestUsage, 
    loading: subscriptionLoading,
    showLoginPrompt,
    showUpgradePrompt,
    userType: contextUserType
  } = useSubscription();
  
  const [userType, setUserType] = useState<UserType>('guest');
  const [entitlements, setEntitlements] = useState<UserEntitlements>(
    getEntitlementsForUserType('guest')
  );
  
  // Update user type and entitlements when auth/subscription changes
  useEffect(() => {
    if (!authLoading && !subscriptionLoading) {
      const validation = subscriptionValidator.validate(user, userSubscription, false);
      const currentUserType = validation.userType;
      setUserType(currentUserType);
      setEntitlements(getEntitlementsForUserType(currentUserType));
    }
  }, [user, userSubscription, authLoading, subscriptionLoading]);
  
  // Check if a feature is enabled
  const isEnabled = useCallback((featurePath: string): boolean => {
    return isFeatureEnabled(userType, featurePath);
  }, [userType]);
  
  // Get limit for a feature
  const getLimit = useCallback((featurePath: string, limitType: 'daily' | 'total' = 'daily'): number | undefined => {
    return getFeatureLimit(userType, featurePath, limitType);
  }, [userType]);
  
  // Generic access check with usage consideration
  const canAccess = useCallback((
    featurePath: string, 
    currentUsage?: { daily?: number; total?: number }
  ): EntitlementCheck => {
    const enabled = isEnabled(featurePath);
    
    if (!enabled) {
      return {
        allowed: false,
        unlimited: false,
        reason: 'Feature not available for your plan'
      };
    }
    
    const dailyLimit = getLimit(featurePath, 'daily');
    const totalLimit = getLimit(featurePath, 'total');
    
    const result: EntitlementCheck = {
      allowed: true,
      unlimited: false,
      limit: dailyLimit || totalLimit,
    };
    
    // Check daily limit
    if (dailyLimit !== undefined) {
      result.unlimited = isUnlimited(dailyLimit);
      
      if (!result.unlimited && currentUsage?.daily !== undefined) {
        result.used = currentUsage.daily;
        result.remaining = Math.max(0, dailyLimit - currentUsage.daily);
        
        if (currentUsage.daily >= dailyLimit) {
          result.allowed = false;
          result.reason = `Daily limit reached (${currentUsage.daily}/${dailyLimit})`;
        }
      }
    }
    
    // Check total limit if no daily limit or daily is ok
    if (result.allowed && totalLimit !== undefined && !isUnlimited(totalLimit)) {
      if (currentUsage?.total !== undefined && currentUsage.total >= totalLimit) {
        result.allowed = false;
        result.limit = totalLimit;
        result.used = currentUsage.total;
        result.remaining = 0;
        result.reason = `Total limit reached (${currentUsage.total}/${totalLimit})`;
      }
    }
    
    return result;
  }, [isEnabled, getLimit]);
  
  // Get current usage for different features
  const getCurrentGameUsage = useCallback((gameType: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (userType === 'guest' && guestUsage) {
      if (gameType === 'kanaDrop') {
        const isToday = guestUsage.lastKanaDropDate === today;
        return {
          daily: isToday ? guestUsage.kanaDropToday : 0
        };
      } else {
        // Default to KanjiQuest for other games
        const isToday = guestUsage.lastKanjiQuestDate === today;
        return {
          daily: isToday ? guestUsage.kanjiQuestToday : 0
        };
      }
    } else if (userSubscription) {
      if (gameType === 'kanaDrop') {
        const isToday = userSubscription.currentUsage.lastKanaDropDate === today;
        return {
          daily: isToday ? (userSubscription.currentUsage.kanaDropToday || 0) : 0
        };
      } else {
        // Default to KanjiQuest for other games
        const isToday = userSubscription.currentUsage.lastKanjiQuestDate === today;
        return {
          daily: isToday ? (userSubscription.currentUsage.kanjiQuestToday || 0) : 0
        };
      }
    }
    
    return { daily: 0 };
  }, [userType, guestUsage, userSubscription]);
  
  // Specific feature checks
  const canPlayGame = useCallback((gameType: 'kanjiQuest' | 'kanaDrop' | 'otherGames'): EntitlementCheck => {
    const usage = getCurrentGameUsage(gameType);
    return canAccess(`games.${gameType}`, usage);
  }, [canAccess, getCurrentGameUsage]);
  
  const canCreateList = useCallback((): EntitlementCheck => {
    const currentCount = userSubscription?.currentUsage?.listsCount || 0;
    return canAccess('storage.lists', { total: currentCount });
  }, [canAccess, userSubscription]);
  
  const canBookmark = useCallback((): EntitlementCheck => {
    // TODO: Get actual bookmark count from storage
    return canAccess('storage.bookmarks', { total: 0 });
  }, [canAccess]);
  
  const canDoDrill = useCallback((): EntitlementCheck => {
    const today = new Date().toISOString().split('T')[0];
    let dailyUsage = 0;
    
    if (userType === 'guest' && guestUsage) {
      const isToday = guestUsage.lastDrillDate === today;
      dailyUsage = isToday ? guestUsage.drillsToday : 0;
    } else if (userSubscription) {
      const isToday = userSubscription.currentUsage.lastDrillDate === today;
      dailyUsage = isToday ? userSubscription.currentUsage.drillsToday : 0;
    }
    
    return canAccess('learning.drills', { daily: dailyUsage });
  }, [canAccess, userType, guestUsage, userSubscription]);
  
  const canReadStory = useCallback((): EntitlementCheck => {
    const today = new Date().toISOString().split('T')[0];
    let dailyUsage = 0;
    
    if (userType === 'guest' && guestUsage) {
      const isToday = guestUsage.lastStoryDate === today;
      dailyUsage = isToday ? guestUsage.storiesToday : 0;
    } else if (userSubscription) {
      const isToday = userSubscription.currentUsage.lastStoryDate === today;
      dailyUsage = isToday ? (userSubscription.currentUsage.storiesToday || 0) : 0;
    }
    
    return canAccess('learning.stories', { daily: dailyUsage });
  }, [canAccess, userType, guestUsage, userSubscription]);
  
  const canReadArticle = useCallback((): EntitlementCheck => {
    const today = new Date().toISOString().split('T')[0];
    let dailyUsage = 0;
    
    if (userType === 'guest' && guestUsage) {
      const isToday = guestUsage.lastArticleDate === today;
      dailyUsage = isToday ? guestUsage.articlesToday : 0;
    } else if (userSubscription) {
      const isToday = userSubscription.currentUsage.lastArticleDate === today;
      dailyUsage = isToday ? (userSubscription.currentUsage.articlesToday || 0) : 0;
    }
    
    return canAccess('learning.articles', { daily: dailyUsage });
  }, [canAccess, userType, guestUsage, userSubscription]);
  
  // Prompt for access based on user type
  const promptForAccess = useCallback((featureName: string, customMessage?: string) => {
    if (userType === 'guest') {
      const message = customMessage || 
        `Sign up free to access ${featureName} and save your progress!`;
      showLoginPrompt(message, featureName);
    } else if (userType === 'free') {
      const message = customMessage || 
        `Upgrade to Premium for unlimited ${featureName} access!`;
      showUpgradePrompt(message, featureName);
    }
  }, [userType, showLoginPrompt, showUpgradePrompt]);
  
  return {
    userType,
    entitlements,
    isEnabled,
    getLimit,
    canAccess,
    canPlayGame,
    canCreateList,
    canBookmark,
    canDoDrill,
    canReadStory,
    canReadArticle,
    promptForAccess,
    loading: authLoading || subscriptionLoading
  };
}