'use client';

import React, { Suspense, lazy, useEffect, useState } from 'react';

// Lazy load non-critical contexts
const AdminContext = lazy(() => import('@/contexts/AdminContext').then(mod => ({ default: mod.AdminProvider })));
const JishoSearchProvider = lazy(() => import('@/contexts/JishoSearchContext').then(mod => ({ default: mod.JishoSearchProvider })));
const ConjugationSettingsProvider = lazy(() => import('@/contexts/ConjugationSettingsContext').then(mod => ({ default: mod.ConjugationSettingsProvider })));
const LocalSRSContextProvider = lazy(() => import('@/contexts/LocalSRSContext').then(mod => ({ default: mod.LocalSRSContextProvider })));
const DownloadProgressProvider = lazy(() => import('@/contexts/DownloadProgressContext').then(mod => ({ default: mod.DownloadProgressProvider })));
const TransferProgressProvider = lazy(() => import('@/contexts/TransferProgressContext').then(mod => ({ default: mod.TransferProgressProvider })));

interface LazyContextWrapperProps {
  children: React.ReactNode;
}

// Critical contexts that need to be loaded immediately
export function CriticalContextWrapper({ children }: LazyContextWrapperProps) {
  return <>{children}</>;
}

// Non-critical contexts that can be lazy loaded
export function NonCriticalContextWrapper({ children }: LazyContextWrapperProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Delay loading non-critical contexts until after initial render
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    return <>{children}</>;
  }

  return (
    <Suspense fallback={<>{children}</>}>
      <AdminContext>
        <JishoSearchProvider>
          <ConjugationSettingsProvider>
            <LocalSRSContextProvider>
              <DownloadProgressProvider>
                <TransferProgressProvider>
                  {children}
                </TransferProgressProvider>
              </DownloadProgressProvider>
            </LocalSRSContextProvider>
          </ConjugationSettingsProvider>
        </JishoSearchProvider>
      </AdminContext>
    </Suspense>
  );
}