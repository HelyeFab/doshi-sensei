'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_PLANS_MAP } from '@/types/subscription';

export function useFreemiumLimits() {
  const {
    userSubscription,
    userType,
    guestUsage,
    isFeatureAvailable,
    canCreateList,
    canDoDrill,
    canSaveProgress,
    showLoginPrompt,
    showUpgradePrompt,
    loading
  } = useSubscription();

  // Get current usage and limits
  const getCurrentUsage = () => {
    if (userType === 'guest' && guestUsage) {
      const today = new Date().toISOString().split('T')[0];
      const isToday = guestUsage.lastDrillDate === today;
      return {
        drillsToday: isToday ? guestUsage.drillsToday : 0,
        listsCount: 0,
        plan: 'guest' as const,
        limits: SUBSCRIPTION_PLANS_MAP.guest.limits
      };
    }

    if (userSubscription) {
      const today = new Date().toISOString().split('T')[0];
      const isToday = userSubscription.currentUsage.lastDrillDate === today;
      return {
        drillsToday: isToday ? userSubscription.currentUsage.drillsToday : 0,
        listsCount: userSubscription.currentUsage.listsCount,
        plan: userSubscription.subscription.plan,
        limits: userSubscription.limits
      };
    }

    return {
      drillsToday: 0,
      listsCount: 0,
      plan: 'guest' as const,
      limits: SUBSCRIPTION_PLANS_MAP.guest.limits
    };
  };

  // Check if user is approaching limits
  const getWarningStatus = () => {
    const usage = getCurrentUsage();
    const warnings = {
      drills: false,
      lists: false,
      nearDrillLimit: false,
      nearListLimit: false
    };

    // Check drill limits
    if (usage.limits.maxDrillsPerDay !== -1) {
      const drillPercentage = (usage.drillsToday / usage.limits.maxDrillsPerDay) * 100;
      warnings.nearDrillLimit = drillPercentage >= 80;
      warnings.drills = drillPercentage >= 100;
    }

    // Check list limits
    if (usage.limits.maxLists !== -1) {
      const listPercentage = (usage.listsCount / usage.limits.maxLists) * 100;
      warnings.nearListLimit = listPercentage >= 80;
      warnings.lists = listPercentage >= 100;
    }

    return warnings;
  };

  // Enforce limits with appropriate prompts
  const enforceLimit = (feature: 'drills' | 'lists' | 'save' | 'sync', context?: string) => {
    // CRITICAL: Don't enforce limits while subscription data is still loading
    if (loading) {
      // Subscription data still loading, allowing action temporarily
      return true; // Allow action while loading to prevent race conditions
    }
    
    if (isFeatureAvailable(feature)) {
      return true; // Feature is available
    }

    // Determine appropriate prompt based on user type and feature
    if (userType === 'guest') {
      if (feature === 'drills') {
        showLoginPrompt(
          `You've used all ${SUBSCRIPTION_PLANS_MAP.guest.limits.maxDrillsPerDay} daily drills. Sign up free for ${SUBSCRIPTION_PLANS_MAP.free.limits.maxDrillsPerDay} drills per day!`,
          'drills'
        );
      } else {
        showLoginPrompt(
          `Sign up free to ${feature === 'save' ? 'save your progress' : feature === 'lists' ? 'create study lists' : 'access this feature'}`,
          feature
        );
      }
    } else {
      // Free user hitting premium limits
      if (feature === 'drills') {
        showUpgradePrompt(
          `You've completed your ${SUBSCRIPTION_PLANS_MAP.free.limits.maxDrillsPerDay} daily drills. Upgrade for unlimited practice!`,
          feature
        );
      } else if (feature === 'lists') {
        showUpgradePrompt(
          `You've reached the limit of ${SUBSCRIPTION_PLANS_MAP.free.limits.maxLists} lists. Upgrade for unlimited lists!`,
          feature
        );
      } else {
        showUpgradePrompt(
          `Upgrade to Premium to ${feature === 'sync' ? 'sync across devices' : 'access this feature'}`,
          feature
        );
      }
    }

    return false; // Feature blocked
  };

  // Get user benefits for current plan
  const getCurrentPlanBenefits = () => {
    const usage = getCurrentUsage();
    return SUBSCRIPTION_PLANS_MAP[usage.plan as keyof typeof SUBSCRIPTION_PLANS_MAP];
  };

  // Get upgrade recommendations
  const getUpgradeRecommendations = () => {
    const warnings = getWarningStatus();
    const recommendations = [];

    if (userType === 'guest') {
      if (warnings.drills || warnings.nearDrillLimit) {
        recommendations.push({
          type: 'signup',
          reason: 'Get more daily drills',
          benefit: `${SUBSCRIPTION_PLANS_MAP.free.limits.maxDrillsPerDay - SUBSCRIPTION_PLANS_MAP.guest.limits.maxDrillsPerDay} extra drill per day`,
          cta: 'Sign Up Free'
        });
      }

      recommendations.push({
        type: 'signup',
        reason: 'Save your progress',
        benefit: 'Create up to 3 study lists and track your learning',
        cta: 'Sign Up Free'
      });
    } else if (userType === 'free') {
      if (warnings.drills || warnings.nearDrillLimit) {
        recommendations.push({
          type: 'upgrade',
          reason: 'Unlimited practice',
          benefit: 'No daily drill limits',
          cta: 'Upgrade to Premium'
        });
      }

      if (warnings.lists || warnings.nearListLimit) {
        recommendations.push({
          type: 'upgrade',
          reason: 'Unlimited lists',
          benefit: 'Create as many study lists as you need',
          cta: 'Upgrade to Premium'
        });
      }

      recommendations.push({
        type: 'upgrade',
        reason: 'Cloud sync',
        benefit: 'Access your progress on any device',
        cta: 'Upgrade to Premium'
      });
    }

    return recommendations;
  };

  return {
    userType,
    getCurrentUsage,
    getWarningStatus,
    enforceLimit,
    getCurrentPlanBenefits,
    getUpgradeRecommendations,
    // Direct access to limit checks
    canCreateList,
    canDoDrill,
    canSaveProgress,
    isFeatureAvailable,
    loading
  };
}
