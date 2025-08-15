'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from './useAccess';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';
import { useAnalytics } from '@/hooks/useAnalytics';

interface UseAccessWithModalsReturn {
  checkAndTrack: (featureId: string) => Promise<boolean>;
  isChecking: boolean;
  AccessModals: () => JSX.Element;
}

export function useAccessWithModals(): UseAccessWithModalsReturn {
  const { user } = useAuth();
  const { canAccess, checkAndTrack: originalCheckAndTrack, isChecking } = useAccess();
  const { trackLimitReached } = useAnalytics();
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalFeature, setModalFeature] = useState('');
  
  const checkAndTrack = useCallback(async (featureId: string): Promise<boolean> => {
    const result = await canAccess(featureId);
    
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
          
          // Track limit reached
          trackLimitReached(featureId);

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
    return await originalCheckAndTrack(featureId);
  }, [canAccess, originalCheckAndTrack]);
  
  const AccessModals = () => (
    <>
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message={modalMessage}
        feature={modalFeature}
      />
      
      <UpgradeSlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message={modalMessage}
        feature={modalFeature}
      />
    </>
  );
  
  return {
    checkAndTrack,
    isChecking,
    AccessModals
  };
}