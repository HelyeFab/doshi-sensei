/**
 * Unified Feature Access Hook
 * 
 * This is the ONE hook for all feature access control in Doshi Sensei.
 * It replaces useAccess, useAccessWithModals, and the old useFeature.
 * 
 * @see /docs/access-control/README.md for complete documentation
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accessControl, featureManager } from '@/lib/access';
import { Feature } from '@/lib/features/types';
import { AccessCheckResult } from '@/lib/access/types';
import { useToast as useToastHook } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';

// Types
export type AccessDenialReason = 
  | 'not_authenticated'
  | 'subscription_required'
  | 'limit_reached'
  | 'feature_disabled'
  | 'no_permission';

export interface UseFeatureOptions {
  // UI Feedback Options
  showToast?: boolean;
  showModal?: boolean;
  toastPosition?: 'top' | 'bottom' | 'center';
  
  // Behavior Options
  trackUsage?: boolean;
  checkOnly?: boolean;
  silent?: boolean;
  
  // Custom Handlers
  onLimitReached?: (remaining: number, limit: number) => void;
  onAccessDenied?: (reason: AccessDenialReason) => void;
  onSubscriptionRequired?: () => void;
  onLoginRequired?: () => void;
  
  // Performance Options
  cache?: boolean;
  realtimeUpdates?: boolean;
}

export interface UseFeatureReturn {
  // Status
  canUse: boolean;
  isLoading: boolean;
  error: Error | null;
  
  // Access Details
  userType: 'guest' | 'free' | 'monthly' | 'yearly';
  accessReason?: AccessDenialReason;
  
  // Limits
  limit: number | null;
  usage: number;
  remaining: number | null;
  resetAt?: Date;
  
  // Actions
  checkAndTrack: () => Promise<boolean>;
  check: () => Promise<boolean>;
  track: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // UI Components (conditionally included)
  AccessModals?: () => React.ReactElement | null;
}

// Cache for access results (1 minute TTL)
const accessCache = new Map<string, { result: AccessCheckResult; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

/**
 * Unified Feature Access Hook
 */
export function useFeature(
  featureId: string,
  options: UseFeatureOptions = {}
): UseFeatureReturn {
  // Default options
  const {
    showToast = false,
    showModal = false,
    toastPosition = 'bottom',
    trackUsage = false,
    checkOnly = false,
    silent = false,
    cache = true,
    realtimeUpdates = false,
    onLimitReached,
    onAccessDenied,
    onSubscriptionRequired,
    onLoginRequired
  } = options;

  // Hooks
  const { user, userType, loading: authLoading } = useAuth();
  const { toast } = useToastHook();
  const router = useRouter();
  
  // State
  const [accessResult, setAccessResult] = useState<AccessCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  // Refs for callbacks
  const lastCheckTime = useRef<number>(0);
  const checkInProgress = useRef<boolean>(false);

  // Get feature info
  const feature = featureManager.getFeature(featureId);

  /**
   * Check access for the feature
   */
  const checkAccess = useCallback(async (): Promise<AccessCheckResult> => {
    // Check cache first
    if (cache) {
      const cached = accessCache.get(`${user?.uid || 'guest'}_${featureId}`);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      }
    }

    try {
      const result = await accessControl.canUserAccess(user?.uid || null, featureId);
      
      // Cache the result
      if (cache) {
        accessCache.set(`${user?.uid || 'guest'}_${featureId}`, {
          result,
          timestamp: Date.now()
        });
      }
      
      return result;
    } catch (err) {
      console.error('Error checking feature access:', err);
      // Return safe default on error
      return {
        allowed: false,
        reason: 'feature_disabled',
        userType: 'guest'
      };
    }
  }, [user?.uid, featureId, cache]);

  /**
   * Handle access denial with UI feedback
   */
  const handleAccessDenial = useCallback((result: AccessCheckResult) => {
    const reason = result.reason as AccessDenialReason;
    const featureName = feature?.name || featureId.replace(/_/g, ' ');
    
    // Call custom handler if provided
    if (onAccessDenied) {
      onAccessDenied(reason);
    }

    // Handle specific denial reasons
    switch (reason) {
      case 'not_authenticated':
        if (onLoginRequired) {
          onLoginRequired();
        } else if (showModal) {
          setModalMessage(`Please log in to access ${featureName}`);
          setShowLoginModal(true);
        } else if (showToast) {
          toast.warning('Login Required', 'Please sign in to use this feature');
        }
        break;

      case 'subscription_required':
        if (onSubscriptionRequired) {
          onSubscriptionRequired();
        } else if (showModal) {
          setModalMessage(`Premium subscription required for ${featureName}`);
          setShowUpgradeModal(true);
        } else if (showToast) {
          toast.warning('Premium Feature', 'Upgrade to access this feature');
        }
        break;

      case 'limit_reached':
        const message = result.resetAt 
          ? `Daily limit reached (${result.usage}/${result.limit}). Resets at ${result.resetAt.toLocaleTimeString()}`
          : `Limit reached (${result.usage}/${result.limit})`;
        
        if (onLimitReached) {
          onLimitReached(result.remaining || 0, result.limit || 0);
        } else if (showModal) {
          setModalMessage(message);
          setShowUpgradeModal(true);
        } else if (showToast) {
          toast.warning('Limit Reached', message);
        }
        break;

      case 'feature_disabled':
        if (showToast) {
          toast.error('Feature Unavailable', 'This feature is currently disabled');
        }
        break;

      case 'no_permission':
        if (showToast) {
          toast.error('Access Denied', 'You don\'t have permission to use this feature');
        }
        break;
    }
  }, [
    feature,
    featureId,
    showModal,
    showToast,
    toast,
    onAccessDenied,
    onLimitReached,
    onLoginRequired,
    onSubscriptionRequired
  ]);

  /**
   * Main check function
   */
  const check = useCallback(async (): Promise<boolean> => {
    // Prevent rapid repeated checks
    if (checkInProgress.current) {
      return accessResult?.allowed || false;
    }
    
    checkInProgress.current = true;
    
    try {
      const result = await checkAccess();
      setAccessResult(result);
      
      if (!result.allowed && !silent) {
        handleAccessDenial(result);
      }
      
      return result.allowed;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      checkInProgress.current = false;
      lastCheckTime.current = Date.now();
    }
  }, [checkAccess, handleAccessDenial, silent, accessResult]);

  /**
   * Track usage for the feature
   */
  const track = useCallback(async (): Promise<void> => {
    if (!user?.uid || checkOnly) return;
    
    try {
      await accessControl.trackUsage(user.uid, featureId);
      // Invalidate cache after tracking
      accessCache.delete(`${user.uid}_${featureId}`);
      // Re-check access after tracking
      const result = await checkAccess();
      setAccessResult(result);
    } catch (err) {
      console.error('Error tracking usage:', err);
    }
  }, [user?.uid, featureId, checkOnly, checkAccess]);

  /**
   * Check and track in one call
   */
  const checkAndTrack = useCallback(async (): Promise<boolean> => {
    const hasAccess = await check();
    
    if (hasAccess && trackUsage && !checkOnly) {
      await track();
    }
    
    return hasAccess;
  }, [check, track, trackUsage, checkOnly]);

  /**
   * Refresh access status
   */
  const refresh = useCallback(async (): Promise<void> => {
    // Clear cache
    accessCache.delete(`${user?.uid || 'guest'}_${featureId}`);
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await checkAccess();
      setAccessResult(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, featureId, checkAccess]);

  // Initial load and auth changes
  useEffect(() => {
    if (!authLoading) {
      refresh();
    }
  }, [authLoading, user, featureId, refresh]);

  // Realtime subscription updates
  useEffect(() => {
    if (!realtimeUpdates || !user?.uid) return;
    
    // This would listen to subscription changes
    // For now, we'll rely on the AuthContext subscription tracking
    const interval = setInterval(() => {
      refresh();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [realtimeUpdates, user?.uid, refresh]);

  // Build return object
  const returnValue: UseFeatureReturn = {
    // Status
    canUse: accessResult?.allowed || false,
    isLoading: authLoading || isLoading,
    error,
    
    // Access Details
    userType,
    accessReason: !accessResult?.allowed ? (accessResult?.reason as AccessDenialReason) : undefined,
    
    // Limits
    limit: accessResult?.limit ?? null,
    usage: accessResult?.usage || 0,
    remaining: accessResult?.remaining ?? null,
    resetAt: accessResult?.resetAt,
    
    // Actions
    checkAndTrack,
    check,
    track,
    refresh
  };

  // Add AccessModals component if modal option is enabled
  if (showModal) {
    returnValue.AccessModals = () => {
      // Try to lazy load modal components
      try {
        // We'll need to check if these components exist
        // For now, return null as placeholder
        // The actual modal components will be imported when they're migrated
        return null;
        
        // Once modal components are migrated, uncomment this:
        /*
        const LoginPromptModal = require('@/components/LoginPromptModal').LoginPromptModal;
        const UpgradeSlideUpModal = require('@/components/UpgradeSlideUpModal').UpgradeSlideUpModal;
        
        return (
          <>
            <LoginPromptModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
              message={modalMessage}
              feature={feature?.name || featureId}
            />
            <UpgradeSlideUpModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              message={modalMessage}
              feature={feature?.name || featureId}
            />
          </>
        );
        */
      } catch (error) {
        console.warn('[useFeature] Modal components not yet migrated');
        return null;
      }
    };
  }

  return returnValue;
}