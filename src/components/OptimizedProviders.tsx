'use client';

import React, { Suspense, lazy } from 'react';
import { EnvProvider } from "@/components/EnvProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { KanjiSelectionProvider } from "@/contexts/KanjiSelectionContext";

// Group critical providers that need to be loaded immediately
export function CriticalProviders({ children }: { children: React.ReactNode }) {
  return (
    <EnvProvider>
      <SettingsProvider>
        <LanguageProvider>
          <AuthProvider>
            <UserProfileProvider>
              <NavigationProvider>
                <ModalProvider>
                  <NotificationProvider>
                    <KanjiSelectionProvider>
                      {children}
                    </KanjiSelectionProvider>
                  </NotificationProvider>
                </ModalProvider>
              </NavigationProvider>
            </UserProfileProvider>
          </AuthProvider>
        </LanguageProvider>
      </SettingsProvider>
    </EnvProvider>
  );
}

// Lazy load the admin provider
const AdminProvider = lazy(() => 
  import('@/contexts/AdminContext').then(mod => ({ 
    default: mod.AdminProvider 
  }))
);

// Non-critical providers that can be loaded after initial render
export function NonCriticalProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AdminProvider>
        {children}
      </AdminProvider>
    </Suspense>
  );
}