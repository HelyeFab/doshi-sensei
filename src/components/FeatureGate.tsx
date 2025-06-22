'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { UserType } from '@/types/subscription';

interface FeatureGateProps {
  children: React.ReactNode;
  feature?: 'lists' | 'drills' | 'sync' | 'save';
  requiredUserType?: UserType | UserType[];
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  upgradeMessage?: string;
  loginMessage?: string;
}

export function FeatureGate({
  children,
  feature,
  requiredUserType,
  fallback,
  showUpgradePrompt = true,
  upgradeMessage,
  loginMessage,
}: FeatureGateProps) {
  const { user } = useAuth();
  const { userType, isFeatureAvailable, showLoginPrompt, showUpgradePrompt: triggerUpgradePrompt } = useSubscription();

  // Check if user type meets requirement
  const hasRequiredUserType = () => {
    if (!requiredUserType) return true;

    if (Array.isArray(requiredUserType)) {
      return requiredUserType.includes(userType);
    }

    return userType === requiredUserType;
  };

  // Check if feature is available
  const hasFeatureAccess = () => {
    if (!feature) return true;
    return isFeatureAvailable(feature);
  };

  // Determine if access should be granted
  const hasAccess = hasRequiredUserType() && hasFeatureAccess();

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show fallback if provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Show appropriate prompt based on user status
  const handlePromptClick = () => {
    if (!user) {
      const message = loginMessage || 'Please log in to access this feature';
      showLoginPrompt(message);
    } else if (showUpgradePrompt) {
      const message = upgradeMessage || 'Upgrade to premium to access this feature';
      triggerUpgradePrompt(message);
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
    <FeatureGate requiredUserType={['free', 'premium']} loginMessage={message}>
      {children}
    </FeatureGate>
  );
}

export function PremiumOnly({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <FeatureGate requiredUserType="premium" upgradeMessage={message}>
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
