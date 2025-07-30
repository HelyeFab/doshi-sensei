'use client';

import dynamic from 'next/dynamic';

// Lazy load all heavy initializers
export const LazyInitializers = dynamic(
  () => import('./DeferredInitializers').then(mod => ({ default: mod.DeferredInitializers })),
  {
    ssr: false,
    loading: () => null // Don't show anything while loading
  }
);