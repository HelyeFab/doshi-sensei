'use client';

import { useEffect } from 'react';
import { AchievementManager } from '@/lib/achievements/manager';

export function AchievementInitializer() {
  useEffect(() => {
    // Initialize achievement manager on app start
    AchievementManager.initialize().catch(error => {
      console.error('Failed to initialize AchievementManager:', error);
    });
  }, []);

  return null; // This component doesn't render anything
}