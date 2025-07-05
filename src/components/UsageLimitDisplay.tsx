'use client';

import React from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useEntitlements } from '@/hooks/useEntitlements';

interface UsageLimitDisplayProps {
  type: 'drills' | 'lists';
  className?: string;
}

export function UsageLimitDisplay({ type, className = '' }: UsageLimitDisplayProps) {
  const { userSubscription, userType, guestUsage } = useSubscription();
  const { getLimit } = useEntitlements();

  // Get limits from entitlements system
  const drillLimit = getLimit('learning.drills', 'daily') || 3;
  const listLimit = getLimit('storage.lists', 'total') || 3;

  if (userType === 'guest') {
    if (type === 'drills' && guestUsage) {
      const maxDrills = drillLimit;
      const today = new Date().toISOString().split('T')[0];
      const isToday = guestUsage.lastDrillDate === today;
      const currentUsage = isToday ? guestUsage.drillsToday : 0;

      return (
        <div className={`text-sm text-muted-foreground ${className}`}>
          <span className="font-medium">Drills today:</span> {currentUsage}/{maxDrills}
          {currentUsage >= maxDrills && (
            <span className="text-orange-400 ml-2">• Limit reached</span>
          )}
        </div>
      );
    }

    if (type === 'lists') {
      return (
        <div className={`text-sm text-muted-foreground ${className}`}>
          <span className="text-orange-400">• Login required to create lists</span>
        </div>
      );
    }
  }

  if (!userSubscription) return null;

  if (type === 'drills') {
    const maxDrills = userSubscription.limits.maxDrillsPerDay;
    const currentUsage = userSubscription.currentUsage.drillsToday;
    const today = new Date().toISOString().split('T')[0];
    const isToday = userSubscription.currentUsage.lastDrillDate === today;
    const actualUsage = isToday ? currentUsage : 0;

    if (maxDrills === -1) {
      return (
        <div className={`text-sm text-green-400 ${className}`}>
          <span className="font-medium">Drills:</span> Unlimited ✨
        </div>
      );
    }

    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <span className="font-medium">Drills today:</span> {actualUsage}/{maxDrills}
        {actualUsage >= maxDrills && (
          <span className="text-red-400 ml-2">• Limit reached</span>
        )}
      </div>
    );
  }

  if (type === 'lists') {
    const maxLists = userSubscription.limits.maxLists;
    const currentUsage = userSubscription.currentUsage.listsCount;

    if (maxLists === -1) {
      return (
        <div className={`text-sm text-green-400 ${className}`}>
          <span className="font-medium">Lists:</span> Unlimited ✨
        </div>
      );
    }

    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <span className="font-medium">Lists:</span> {currentUsage}/{maxLists}
        {currentUsage >= maxLists && (
          <span className="text-red-400 ml-2">• Limit reached</span>
        )}
      </div>
    );
  }

  return null;
}

interface UsageProgressBarProps {
  type: 'drills' | 'lists';
  className?: string;
}

export function UsageProgressBar({ type, className = '' }: UsageProgressBarProps) {
  const { userSubscription, userType, guestUsage } = useSubscription();
  const { getLimit } = useEntitlements();

  // Get limits from entitlements system
  const drillLimit = getLimit('learning.drills', 'daily') || 3;
  const listLimit = getLimit('storage.lists', 'total') || 3;

  let current = 0;
  let max = 0;
  let color = 'bg-primary';

  if (userType === 'guest') {
    if (type === 'drills' && guestUsage) {
      max = drillLimit;
      const today = new Date().toISOString().split('T')[0];
      const isToday = guestUsage.lastDrillDate === today;
      current = isToday ? guestUsage.drillsToday : 0;
    } else if (type === 'lists') {
      max = 1; // Show as blocked
      current = 1;
      color = 'bg-orange-400';
    }
  } else if (userSubscription) {
    if (type === 'drills') {
      max = userSubscription.limits.maxDrillsPerDay;
      const today = new Date().toISOString().split('T')[0];
      const isToday = userSubscription.currentUsage.lastDrillDate === today;
      current = isToday ? userSubscription.currentUsage.drillsToday : 0;
    } else if (type === 'lists') {
      max = userSubscription.limits.maxLists;
      current = userSubscription.currentUsage.listsCount;
    }
  }

  if (max === -1) {
    return (
      <div className={`w-full bg-green-100 dark:bg-green-900/30 rounded-full h-2 ${className}`}>
        <div className="bg-green-500 h-2 rounded-full w-full"></div>
      </div>
    );
  }

  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  if (percentage >= 100) {
    color = 'bg-red-400';
  } else if (percentage >= 80) {
    color = 'bg-orange-400';
  }

  return (
    <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
      <div
        className={`${color} h-2 rounded-full transition-all duration-300`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
}
