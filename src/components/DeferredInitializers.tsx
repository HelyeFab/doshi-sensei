'use client';

import { useEffect, useState } from 'react';
import JMdictInitializer from '@/components/JMdictInitializer';
import { CacheSystemInitializer } from '@/components/CacheSystemInitializer';
import { AchievementInitializer } from '@/components/achievements/AchievementInitializer';
import { KanjiPreloadInitializer } from '@/components/KanjiPreloadInitializer';
import { SEOLogger } from '@/components/SEOLogger';

/**
 * Defers heavy initializations to prevent blocking the initial render
 * and navigation interactions.
 */
export function DeferredInitializers() {
  const [shouldInitialize, setShouldInitialize] = useState(false);
  
  useEffect(() => {
    // Wait for initial hydration and interactions to be ready
    // Using requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      const idleCallbackId = window.requestIdleCallback(() => {
        setShouldInitialize(true);
      }, { timeout: 1000 }); // Max 1 second wait
      
      return () => {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId);
        }
      };
    } else {
      // Fallback for browsers without requestIdleCallback
      const timeoutId = setTimeout(() => {
        setShouldInitialize(true);
      }, 500); // Wait 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, []);
  
  if (!shouldInitialize) {
    return null;
  }
  
  return (
    <>
      <JMdictInitializer />
      <CacheSystemInitializer />
      <AchievementInitializer />
      <KanjiPreloadInitializer />
      <SEOLogger />
    </>
  );
}