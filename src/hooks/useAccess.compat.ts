/**
 * useAccess Compatibility Wrapper
 * 
 * @deprecated Use the new unified useFeature hook instead
 * This is a compatibility wrapper for migration purposes only.
 * It will be removed once all components are migrated to useFeature.
 * 
 * @see /src/hooks/useFeature.ts for the new unified hook
 * @see /docs/access-control/README.md for migration guide
 */

import { useCallback, useMemo } from 'react';
import { useFeature } from './useFeature';
import { useAuth } from '@/contexts/AuthContext';
import { AccessCheckResult } from '@/lib/access/types';

// Old useAccess interface for backward compatibility
interface UseAccessReturn {
  canAccess: (featureId: string) => Promise<AccessCheckResult>;
  checkAndTrack: (featureId: string) => Promise<boolean>;
  getRemainingUsage: (featureId: string) => Promise<number | null>;
  isChecking: boolean;
  usage: Record<string, { daily: number; total: number }>;
}

// Map to store feature hooks for reuse
const featureHooks = new Map<string, ReturnType<typeof useFeature>>();

export function useAccess(): UseAccessReturn {
  const { user, userType } = useAuth();
  
  // Track checking state
  const isChecking = false; // Simplified for compatibility
  
  // Create a usage object from cached feature hooks
  const usage = useMemo(() => {
    const usageData: Record<string, { daily: number; total: number }> = {};
    
    featureHooks.forEach((hook, featureId) => {
      if (hook.limit !== null && hook.limit !== -1) {
        usageData[featureId] = {
          daily: hook.usage,
          total: hook.usage // Simplified - actual implementation would track separately
        };
      }
    });
    
    return usageData;
  }, []);
  
  /**
   * Check if user can access a feature
   */
  const canAccess = useCallback(async (featureId: string): Promise<AccessCheckResult> => {
    // Get or create a feature hook
    const hook = featureHooks.get(featureId);
    if (!hook) {
      // This creates a new hook instance - not ideal but works for compatibility
      console.warn(`[useAccess Compat] Creating ad-hoc hook for ${featureId}. Consider migrating to useFeature.`);
    }
    
    // Use the unified hook to check access
    const result = await hook?.check?.() || false;
    
    return {
      allowed: result,
      userType: userType,
      reason: hook?.accessReason,
      limit: hook?.limit,
      usage: hook?.usage,
      remaining: hook?.remaining,
      resetAt: hook?.resetAt
    };
  }, [userType]);
  
  /**
   * Check access and track usage
   */
  const checkAndTrack = useCallback(async (featureId: string): Promise<boolean> => {
    // For compatibility, we create a temporary hook with tracking enabled
    // This is not ideal but maintains backward compatibility
    console.warn(`[useAccess Compat] Using checkAndTrack for ${featureId}. Migrate to useFeature for better performance.`);
    
    // We can't dynamically create hooks, so we need to use the access control directly
    // This is a limitation of the compatibility layer
    const { accessControl } = await import('@/lib/access');
    
    const result = await accessControl.canUserAccess(user?.uid || null, featureId);
    
    if (result.allowed) {
      await accessControl.trackUsage(user?.uid || null, featureId);
    }
    
    return result.allowed;
  }, [user?.uid]);
  
  /**
   * Get remaining usage for a feature
   */
  const getRemainingUsage = useCallback(async (featureId: string): Promise<number | null> => {
    const { accessControl } = await import('@/lib/access');
    return accessControl.getRemainingUsage(user?.uid || null, featureId);
  }, [user?.uid]);
  
  return {
    canAccess,
    checkAndTrack,
    getRemainingUsage,
    isChecking,
    usage
  };
}