'use client';

import React, { ReactNode, memo } from 'react';
import { CombinedAuthProvider } from './CombinedAuthProvider';
import { CombinedUIProvider } from './CombinedUIProvider';
import { CombinedFeatureProvider } from './CombinedFeatureProvider';
import { NotificationServiceProvider } from './NotificationServiceContext';
import { VirtualCompanionProvider } from './VirtualCompanionContext';
import { ToastProvider } from '@/components/ui/Toast';
import { EnhancedToastProvider } from '@/components/ui/EnhancedToast';
import { QuickContextProvider } from '@/components/QuickContext';

/**
 * Optimized provider that combines all essential providers
 * to reduce nesting depth and improve navigation performance
 */
export const OptimizedProviders = memo(function OptimizedProviders({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <CombinedUIProvider>
      <CombinedAuthProvider>
        <CombinedFeatureProvider>
          <NotificationServiceProvider>
            <VirtualCompanionProvider>
              <QuickContextProvider>
                <ToastProvider>
                  <EnhancedToastProvider>
                    {children}
                  </EnhancedToastProvider>
                </ToastProvider>
              </QuickContextProvider>
            </VirtualCompanionProvider>
          </NotificationServiceProvider>
        </CombinedFeatureProvider>
      </CombinedAuthProvider>
    </CombinedUIProvider>
  );
});