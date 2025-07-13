'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { UserType } from '@/types/subscription';

interface FeatureGateProps {
  children: React.ReactNode;
  feature?: 'lists' | 'drills' | 'sync' | 'save' | 'articles' | 'stories' | 'games';
  requiredUserType?: UserType | UserType[];
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradeMessage?: string;
  loginMessage?: string;
}

// Map old feature names to new feature IDs
const featureMap: Record<string, string> = {
  lists: 'word_lists',
  drills: 'drill_practice',
  sync: 'cloud_sync',
  save: 'progress_saving',
  articles: 'article_reading',
  stories: 'story_reading',
  games: 'kanji_quest' // or 'kana_drop'
};

export function FeatureGate({
  children,
  feature,
  requiredUserType,
  fallback,
  showUpgradePrompt = true,
  upgradeMessage,
  loginMessage,
}: FeatureGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { userType } = useSubscription2();
  const { canAccess, showAccessPrompt } = useAccess();
  const [hasAccess, setHasAccess] = useState(true);
  const [checking, setChecking] = useState(false);

  // Get the mapped feature ID
  const featureId = feature ? featureMap[feature] : undefined;

  // Check access when component mounts or dependencies change
  useEffect(() => {
    const checkAccess = async () => {
      // If auth is still loading, allow access temporarily
      if (authLoading) {
        setHasAccess(true);
        return;
      }

      // Check user type requirement
      if (requiredUserType) {
        const typeOk = Array.isArray(requiredUserType) 
          ? requiredUserType.includes(userType)
          : userType === requiredUserType;
        
        if (!typeOk) {
          setHasAccess(false);
          return;
        }
      }

      // Check feature access if feature is specified
      if (featureId) {
        setChecking(true);
        try {
          const result = await canAccess(featureId);
          setHasAccess(result.allowed);
        } catch (error) {
          console.error('Error checking feature access:', error);
          setHasAccess(false);
        } finally {
          setChecking(false);
        }
      } else {
        // No feature specified, just check user type
        setHasAccess(true);
      }
    };

    checkAccess();
  }, [authLoading, userType, requiredUserType, featureId, canAccess]);

  // Allow access while checking
  if (checking || authLoading) {
    return <>{children}</>;
  }

  // Grant access if allowed
  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show appropriate prompt based on user status
  const handlePromptClick = () => {
    if (featureId) {
      // Let the access system handle the prompt
      showAccessPrompt(featureId, upgradeMessage || loginMessage);
    } else if (!user) {
      // Manual prompt for non-feature gates
      showAccessPrompt('', loginMessage || 'Please log in to access this feature');
    } else if (showUpgradePrompt) {
      // Manual upgrade prompt
      showAccessPrompt('', upgradeMessage || 'Upgrade to premium to access this feature');
    }
  };

  // Default fallback UI
  return (
    <div className="text-center p-4 border border-border rounded-lg bg-muted/50">
      <div className="text-sm text-muted-foreground mb-2">
        {!user
          ? 'Login required to access this feature'
          : 'Premium feature'
        }
      </div>
      <button
        onClick={handlePromptClick}
        className="text-sm text-primary hover:text-primary/80 underline"
      >
        {!user ? 'Log in' : 'Upgrade to Premium'}
      </button>
    </div>
  );
}

// Convenience components for common use cases
export function LoginRequired({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <FeatureGate requiredUserType={['free', 'monthly', 'yearly']} loginMessage={message}>
      {children}
    </FeatureGate>
  );
}

export function PremiumOnly({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <FeatureGate requiredUserType={['monthly', 'yearly']} upgradeMessage={message}>
      {children}
    </FeatureGate>
  );
}

export function ListsGate({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate feature="lists" upgradeMessage="Upgrade to create unlimited lists">
      {children}
    </FeatureGate>
  );
}

export function DrillsGate({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate feature="drills" upgradeMessage="Upgrade for unlimited drills">
      {children}
    </FeatureGate>
  );
}

export function SaveGate({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate feature="save" loginMessage="Log in to save your progress">
      {children}
    </FeatureGate>
  );
}

export function SyncGate({ children }: { children: React.ReactNode }) {
  return (
    <FeatureGate feature="sync" upgradeMessage="Upgrade for cloud sync across devices">
      {children}
    </FeatureGate>
  );
}
