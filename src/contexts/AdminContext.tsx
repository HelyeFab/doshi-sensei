'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { ADMIN_EMAIL, AdminContextType, AdminSection } from '@/types/admin';

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

  // Check if current user is admin
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading]);

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
