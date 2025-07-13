'use client';

import { useEffect } from 'react';
import { CacheInitializer } from '@/lib/cache/cacheInitializer';

export function CacheSystemInitializer() {
  useEffect(() => {
    // Initialize cache system on app mount
    CacheInitializer.initialize().then(() => {
      console.log('[CacheSystem] Initialized successfully');
    }).catch(error => {
      console.error('[CacheSystem] Failed to initialize:', error);
    });
  }, []);

  // This component doesn't render anything
  return null;
}