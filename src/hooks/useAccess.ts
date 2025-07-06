/**
 * useAccess Hook
 * Primary hook for checking feature access in components
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accessControl } from '@/lib/access';
import { AccessCheckResult } from '@/lib/access/types';
import { useModal } from '@/contexts/ModalContext';
import { useNotification } from '@/contexts/NotificationContext';

interface UseAccessReturn {
  // Check if user can access a feature
  canAccess: (featureId: string) => Promise<AccessCheckResult>;
  // Check and track usage in one call
  checkAndTrack: (featureId: string) => Promise<boolean>;
  // Get remaining usage for a feature
  getRemainingUsage: (featureId: string) => Promise<number | null>;
  // Show appropriate prompt (login or upgrade)
  showAccessPrompt: (featureId: string, featureName?: string) => void;
  // Loading state
  isChecking: boolean;
}

export function useAccess(): UseAccessReturn {
  const { user } = useAuth();
  const { setModal, closeModal } = useModal();
  const { showNotification } = useNotification();
  const [isChecking, setIsChecking] = useState(false);
  
  const canAccess = useCallback(async (featureId: string): Promise<AccessCheckResult> => {
    setIsChecking(true);
    try {
      const result = await accessControl.canUserAccess(user?.uid || null, featureId);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, [user]);
  
  const checkAndTrack = useCallback(async (featureId: string): Promise<boolean> => {
    const result = await canAccess(featureId);
    
    if (result.allowed) {
      // Track usage
      await accessControl.trackUsage(user?.uid || null, featureId);
    } else {
      // Show appropriate prompt based on the reason
      const feature = await accessControl.getFeature(featureId);
      const featureName = feature?.name || featureId.replace(/_/g, ' ');
      
      switch (result.reason) {
        case 'not_authenticated':
          setModal({
            type: 'login',
            isOpen: true,
            onClose: closeModal,
            message: `Please log in to access ${featureName}`
          });
          break;
          
        case 'subscription_required':
          setModal({
            type: 'upgrade',
            isOpen: true,
            onClose: closeModal,
            message: `Premium subscription required for ${featureName}`,
            feature: featureId
          });
          break;
          
        case 'limit_reached':
          const resetTime = result.resetAt 
            ? ` Resets at ${result.resetAt.toLocaleTimeString()}`
            : '';
          setModal({
            type: 'upgrade',
            isOpen: true,
            onClose: closeModal,
            message: `Daily limit reached (${result.usage}/${result.limit})${resetTime}`,
            feature: featureId
          });
          break;
          
        default:
          // For other cases, use notification
          showNotification({
            title: 'Access Denied',
            message: `Cannot access ${featureName}`,
            type: 'error'
          });
      }
    }
    
    return result.allowed;
  }, [user, canAccess, setModal, closeModal, showNotification]);
  
  const getRemainingUsage = useCallback(async (featureId: string): Promise<number | null> => {
    return accessControl.getRemainingUsage(user?.uid || null, featureId);
  }, [user]);
  
  const showAccessPrompt = useCallback((featureId: string, featureName?: string) => {
    canAccess(featureId).then(result => {
      if (!result.allowed) {
        const displayName = featureName || featureId.replace(/_/g, ' ');
        
        switch (result.reason) {
          case 'not_authenticated':
            setModal({
              type: 'login',
              isOpen: true,
              onClose: closeModal,
              message: `Please log in to access ${displayName}`
            });
            break;
          
          case 'subscription_required':
            setModal({
              type: 'upgrade',
              isOpen: true,
              onClose: closeModal,
              message: `Premium subscription required for ${displayName}`,
              feature: featureId
            });
            break;
          
          case 'limit_reached':
            const resetTime = result.resetAt 
              ? ` Resets at ${result.resetAt.toLocaleTimeString()}`
              : '';
            setModal({
              type: 'upgrade',
              isOpen: true,
              onClose: closeModal,
              message: `Daily limit reached (${result.usage}/${result.limit})${resetTime}`,
              feature: featureId
            });
            break;
          
          default:
            showNotification({
              title: 'Access Denied',
              message: `Cannot access ${displayName}`,
              type: 'error'
            });
        }
      }
    });
  }, [canAccess, setModal, closeModal, showNotification]);
  
  return {
    canAccess,
    checkAndTrack,
    getRemainingUsage,
    showAccessPrompt,
    isChecking
  };
}