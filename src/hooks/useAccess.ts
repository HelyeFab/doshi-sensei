'use client';

import { useAuth } from '@/contexts/AuthContext';
import { getFeature, requiresAuth, requiresSubscription } from '@/lib/features/registry';
import { getLimit, hasAccess, isUnlimited } from '@/lib/entitlements/rules';
import { getPermissionForFeature } from '@/lib/access';
import { useToast as useToastHook } from '@/components/Toast';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UsageData {
  [featureId: string]: {
    daily: number;
    total: number;
    lastResetDate: string;
  };
}

export function useAccess() {
  const { user, userType } = useAuth();
  const { toast } = useToastHook();
  const [usage, setUsage] = useState<UsageData>({});
  const [loading, setLoading] = useState(true);

  // Load usage data from Firestore or localStorage
  useEffect(() => {
    const loadUsage = async () => {
      if (user && db) {
        // Load from Firestore for logged-in users
        try {
          const usageRef = doc(db, 'usage', user.uid);
          const usageDoc = await getDoc(usageRef);
          
          if (usageDoc.exists()) {
            const data = usageDoc.data() as UsageData;
            // Reset daily counts if it's a new day
            const today = new Date().toDateString();
            const updatedData = { ...data };
            let hasChanges = false;
            
            Object.keys(updatedData).forEach(featureId => {
              if (updatedData[featureId].lastResetDate !== today) {
                updatedData[featureId].daily = 0;
                updatedData[featureId].lastResetDate = today;
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              await setDoc(usageRef, updatedData);
            }
            
            setUsage(updatedData);
          }
        } catch (error) {
          console.error('Error loading usage from Firestore:', error);
        }
      } else {
        // Load from localStorage for guests
        const stored = localStorage.getItem('doshi_usage');
        if (stored) {
          const data = JSON.parse(stored) as UsageData;
          // Reset daily counts if it's a new day
          const today = new Date().toDateString();
          const updatedData = { ...data };
          
          Object.keys(updatedData).forEach(featureId => {
            if (updatedData[featureId].lastResetDate !== today) {
              updatedData[featureId].daily = 0;
              updatedData[featureId].lastResetDate = today;
            }
          });
          
          localStorage.setItem('doshi_usage', JSON.stringify(updatedData));
          setUsage(updatedData);
        }
      }
      setLoading(false);
    };

    loadUsage();
  }, [user]);

  // Track usage for a feature
  const trackUsage = useCallback(async (featureId: string) => {
    const today = new Date().toDateString();
    const currentUsage = usage[featureId] || {
      daily: 0,
      total: 0,
      lastResetDate: today,
    };

    // Reset daily count if it's a new day
    if (currentUsage.lastResetDate !== today) {
      currentUsage.daily = 0;
      currentUsage.lastResetDate = today;
    }

    // Increment usage
    currentUsage.daily += 1;
    currentUsage.total += 1;

    const newUsage = {
      ...usage,
      [featureId]: currentUsage,
    };

    setUsage(newUsage);

    // Save to storage
    if (user && db) {
      // Save to Firestore for logged-in users
      try {
        const usageRef = doc(db, 'usage', user.uid);
        await setDoc(usageRef, newUsage, { merge: true });
      } catch (error) {
        console.error('Error saving usage to Firestore:', error);
      }
    } else {
      // Save to localStorage for guests
      localStorage.setItem('doshi_usage', JSON.stringify(newUsage));
    }
  }, [usage, user]);

  // Check if user can access a feature
  const canAccess = useCallback((featureId: string): boolean => {
    const feature = getFeature(featureId);
    if (!feature) return false;

    // Check authentication requirement
    if (requiresAuth(featureId) && !user) {
      return false;
    }

    // Check subscription requirement
    if (requiresSubscription(featureId) && userType !== 'premium') {
      return false;
    }

    // Check usage limits
    const limitType = feature.limitType;
    if (limitType === 'none') return true;

    const limit = getLimit(userType, featureId, limitType);
    if (limit === -1) return true; // Unlimited
    if (limit === 0) return false; // No access

    const currentUsage = usage[featureId];
    if (!currentUsage) return true; // No usage yet

    const usageCount = limitType === 'daily' ? currentUsage.daily : currentUsage.total;
    return usageCount < limit;
  }, [user, userType, usage]);

  // Get remaining uses for a feature
  const getRemainingUses = useCallback((featureId: string): number | null => {
    const feature = getFeature(featureId);
    if (!feature) return null;

    const limitType = feature.limitType;
    if (limitType === 'none') return null; // No limit

    const limit = getLimit(userType, featureId, limitType);
    if (limit === -1) return null; // Unlimited
    if (limit === 0) return 0; // No access

    const currentUsage = usage[featureId];
    if (!currentUsage) return limit; // No usage yet

    const usageCount = limitType === 'daily' ? currentUsage.daily : currentUsage.total;
    return Math.max(0, limit - usageCount);
  }, [userType, usage]);

  // Main function: Check access and track usage
  const checkAndTrack = useCallback(async (featureId: string): Promise<boolean> => {
    const feature = getFeature(featureId);
    if (!feature) {
      toast.error('Feature not found');
      return false;
    }

    // Check authentication requirement
    if (requiresAuth(featureId) && !user) {
      toast.warning('Please sign in to access this feature');
      // TODO: Show auth modal
      return false;
    }

    // Check subscription requirement
    if (requiresSubscription(featureId) && userType !== 'premium') {
      toast.warning('Premium subscription required', 'Upgrade to access this feature');
      // TODO: Show upgrade modal
      return false;
    }

    // Check usage limits
    if (!canAccess(featureId)) {
      const limitType = feature.limitType;
      // Convert limitType to limitPeriod (exclude 'none')
      const limitPeriod = limitType === 'none' ? 'total' : limitType;
      const limit = getLimit(userType, featureId, limitPeriod);
      
      if (limit === 0) {
        if (userType === 'guest') {
          toast.warning('Sign in required', 'Please sign in to access this feature');
          // TODO: Show auth modal
        } else {
          toast.warning('Premium feature', 'Upgrade for unlimited access');
          // TODO: Show upgrade modal
        }
      } else {
        const periodText = limitType === 'daily' ? 'today' : 'in total';
        toast.warning('Limit reached', `You've reached your limit for ${periodText}`);
        // TODO: Show upgrade modal
      }
      
      return false;
    }

    // Track usage if there's a limit
    if (feature.limitType !== 'none') {
      await trackUsage(featureId);
    }

    return true;
  }, [user, userType, canAccess, trackUsage, toast]);

  // Get usage statistics for a feature
  const getUsageStats = useCallback((featureId: string) => {
    const feature = getFeature(featureId);
    if (!feature) return null;

    const limitType = feature.limitType;
    if (limitType === 'none') return null;

    const limit = getLimit(userType, featureId, limitType);
    const currentUsage = usage[featureId];
    const usageCount = currentUsage 
      ? (limitType === 'daily' ? currentUsage.daily : currentUsage.total)
      : 0;

    return {
      used: usageCount,
      limit: limit === -1 ? null : limit,
      remaining: limit === -1 ? null : Math.max(0, limit - usageCount),
      isUnlimited: limit === -1,
      hasAccess: limit !== 0,
      percentage: limit > 0 ? (usageCount / limit) * 100 : 0,
    };
  }, [userType, usage]);

  return {
    checkAndTrack,
    canAccess,
    getRemainingUses,
    getUsageStats,
    loading,
    userType,
    isAuthenticated: !!user,
    isPremium: userType === 'premium',
  };
}