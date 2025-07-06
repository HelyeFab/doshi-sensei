/**
 * useFeature Hook
 * Hook for working with a specific feature
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accessControl, featureManager } from '@/lib/access';
import { Feature } from '@/lib/features/types';
import { AccessCheckResult } from '@/lib/access/types';

interface UseFeatureReturn {
  // Feature information
  feature: Feature | undefined;
  // Access check result
  access: AccessCheckResult | null;
  // Loading states
  isLoading: boolean;
  // Refetch access
  refetch: () => void;
  // Quick checks
  isAvailable: boolean;
  canUse: boolean;
  remaining: number | null;
}

export function useFeature(featureId: string): UseFeatureReturn {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<AccessCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get feature info (static, doesn't need to be in state)
  const feature = featureManager.getFeature(featureId);
  
  // Check access
  const checkAccess = async () => {
    // Don't check if auth is still loading
    if (authLoading) {
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await accessControl.canUserAccess(user?.uid || null, featureId);
      setAccess(result);
    } catch (error) {
      console.error('Error checking feature access:', error);
      setAccess({
        allowed: false,
        reason: 'feature_disabled',
        userType: 'guest'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check when auth is ready and when user changes
  useEffect(() => {
    if (!authLoading) {
      checkAccess();
    }
  }, [authLoading, user, featureId]);
  
  return {
    feature,
    access,
    isLoading: authLoading || isLoading,
    refetch: checkAccess,
    isAvailable: feature?.status === 'active' || false,
    canUse: access?.allowed || false,
    remaining: access?.remaining ?? null
  };
}