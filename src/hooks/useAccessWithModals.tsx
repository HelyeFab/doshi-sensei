/**
 * useAccessWithModals Compatibility Wrapper
 * 
 * @deprecated Use the new unified useFeature hook with showModal option
 * This is a compatibility wrapper for migration purposes only.
 * 
 * Example migration:
 * ```typescript
 * // Old
 * const { checkAndTrack, AccessModals } = useAccessWithModals();
 * 
 * // New
 * const { checkAndTrack, AccessModals } = useFeature('feature_id', {
 *   showModal: true,
 *   showToast: true,
 *   trackUsage: true
 * });
 * ```
 * 
 * @see /src/hooks/useFeature.ts for the new unified hook
 * @see /docs/access-control/README.md for migration guide
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AccessCheckResult } from '@/lib/access/types';

interface UseAccessWithModalsReturn {
  checkAndTrack: (featureId: string) => Promise<boolean>;
  isChecking: boolean;
  AccessModals: () => JSX.Element;
}

export function useAccessWithModals(): UseAccessWithModalsReturn {
  const { user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalFeature, setModalFeature] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  
  const checkAndTrack = useCallback(async (featureId: string): Promise<boolean> => {
    console.warn(`[useAccessWithModals Compat] Using deprecated hook for ${featureId}. Migrate to useFeature.`);
    
    setIsChecking(true);
    
    try {
      // Import access control directly
      const { accessControl } = await import('@/lib/access');
      const result = await accessControl.canUserAccess(user?.uid || null, featureId);
      
      if (!result.allowed) {
        // Show modal instead of notification
        const featureName = featureId.replace(/_/g, ' ');
        
        switch (result.reason) {
          case 'not_authenticated':
            setModalMessage(`Please log in to access ${featureName}`);
            setModalFeature(featureName);
            setShowLoginModal(true);
            break;
            
          case 'subscription_required':
            setModalMessage(`Premium subscription required for ${featureName}`);
            setModalFeature(featureName);
            setShowUpgradeModal(true);
            break;
            
          case 'limit_reached':
            const resetTime = result.resetAt 
              ? ` Resets at ${result.resetAt.toLocaleTimeString()}`
              : '';
            setModalMessage(`Daily limit reached (${result.usage}/${result.limit})${resetTime}`);
            setModalFeature(featureName);
            setShowUpgradeModal(true);
            break;
            
          default:
            setModalMessage(`Cannot access ${featureName}`);
            setModalFeature(featureName);
            setShowUpgradeModal(true);
        }
        
        return false;
      }
      
      // If allowed, track the usage
      await accessControl.trackUsage(user?.uid || null, featureId);
      return true;
    } finally {
      setIsChecking(false);
    }
  }, [user?.uid]);
  
  const AccessModals = () => {
    // Modal components not yet migrated, return null for now
    // Once modal components are migrated, uncomment the code below
    return null;
    
    /*
    try {
      const LoginPromptModal = require('@/components/LoginPromptModal').LoginPromptModal;
      const UpgradeSlideUpModal = require('@/components/UpgradeSlideUpModal').UpgradeSlideUpModal;
      
      return (
        <>
          {LoginPromptModal && (
            <LoginPromptModal
              isOpen={showLoginModal}
              onClose={() => setShowLoginModal(false)}
              message={modalMessage}
              feature={modalFeature}
            />
          )}
          
          {UpgradeSlideUpModal && (
            <UpgradeSlideUpModal
              isOpen={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              message={modalMessage}
              feature={modalFeature}
            />
          )}
        </>
      );
    } catch (error) {
      console.error('[useAccessWithModals Compat] Modal components not found. Please ensure they are migrated.');
      return null;
    }
    */
  };
  
  return {
    checkAndTrack,
    isChecking,
    AccessModals
  };
}