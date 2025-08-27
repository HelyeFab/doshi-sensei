'use client';

import React, { Suspense, lazy } from 'react';
import { EnvProvider } from "@/components/EnvProvider";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminProvider } from "@/contexts/AdminContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { ModalProvider } from "@/contexts/ModalContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { KanjiSelectionProvider } from "@/contexts/KanjiSelectionContext";

// Group critical providers that need to be loaded immediately
export function CriticalProviders({ children }: { children: React.ReactNode }) {
  return (
    <EnvProvider>
      <LanguageProvider>
        <AuthProvider>
          <AdminProvider>
            <SettingsProvider>
              <UserProfileProvider>
                <ModalProvider>
                  <NotificationProvider>
                    <KanjiSelectionProvider>
                      {children}
                    </KanjiSelectionProvider>
                  </NotificationProvider>
                </ModalProvider>
              </UserProfileProvider>
            </SettingsProvider>
          </AdminProvider>
        </AuthProvider>
      </LanguageProvider>
    </EnvProvider>
  );
}

// Non-critical providers that can be loaded after initial render
export function NonCriticalProviders({ children }: { children: React.ReactNode }) {
  // AdminProvider moved to CriticalProviders since components depend on it
  // Using React.Fragment explicitly to avoid hydration issues
  return <React.Fragment>{children}</React.Fragment>;
}