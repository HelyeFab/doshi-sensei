'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { ADMIN_EMAIL, AdminContextType, AdminSection } from '@/types/admin';
import { logAdminAction } from '@/utils/adminLogs';
import { safeNavigator } from '@/utils/browserCheck';

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [hasLoggedLogin, setHasLoggedLogin] = useState(false);

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
      
      // Log admin login when user is authenticated as admin
      if (isAdmin && !hasLoggedLogin) {
        logAdminAction({
          action: 'admin_login',
          details: {
            loginTime: new Date().toISOString(),
            userAgent: safeNavigator?.userAgent || 'unknown',
          },
        }).then(() => {
          setHasLoggedLogin(true);
        }).catch(err => {
          console.error('Failed to log admin login:', err);
        });
      }
    }
  }, [authLoading, isAdmin, hasLoggedLogin]);

  const value: AdminContextType = {
    isAdmin,
    loading,
    currentSection,
    setCurrentSection,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// Server-side admin verification utility
export async function verifyAdminAccess(email: string): Promise<boolean> {
  return email === ADMIN_EMAIL;
}

// Client-side admin verification
export function isAdminUser(email?: string | null): boolean {
  return email === ADMIN_EMAIL;
}
