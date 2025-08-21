'use client';

import { useUnifiedNotifications } from '@/hooks/useUnifiedNotifications';
import { useEffect } from 'react';

export function UnifiedNotificationProvider() {
  // Initialize the unified notification system
  useUnifiedNotifications();
  
  // This component doesn't render anything, it just sets up the listeners
  return null;
}