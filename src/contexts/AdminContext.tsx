'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { AdminContextType, AdminSection } from '@/types/admin';
import { logAdminAction } from '@/utils/adminLogs';
import { safeNavigator } from '@/utils/browserCheck';
import { auth } from '@/lib/firebase';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [hasLoggedLogin, setHasLoggedLogin] = useState(false);

  // Verify admin status through server-side API
  useEffect(() => {
    const verifyAdminStatus = async () => {
      if (!authLoading && user) {
        try {
          // Get the current user's ID token
          const token = await auth?.currentUser?.getIdToken();
          if (!token) {
            setIsAdmin(false);
            setLoading(false);
            return;
          }

          // Call the server-side verification endpoint
          console.log('[Admin Debug] Verifying admin status for:', user.email);
          const response = await fetch('/api/admin/verify-role', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[Admin Debug] Verification response:', data);
            setIsAdmin(data.isAdmin === true);
            
            // Log admin login if verified as admin
            if (data.isAdmin && !hasLoggedLogin) {
              logAdminAction({
                action: 'admin_login',
                details: {
                  loginTime: new Date().toISOString(),
                  userAgent: safeNavigator?.userAgent || 'unknown',
                  verificationMethod: data.verificationMethod,
                },
              }).then(() => {
                setHasLoggedLogin(true);
              }).catch(err => {
                console.error('Failed to log admin login:', err);
              });
            }
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Failed to verify admin status:', error);
          setIsAdmin(false);
        }
      } else if (!authLoading && !user) {
        // No user logged in
        setIsAdmin(false);
      }
      
      if (!authLoading) {
        setLoading(false);
      }
    };

    verifyAdminStatus();
  }, [authLoading, user, hasLoggedLogin]);

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