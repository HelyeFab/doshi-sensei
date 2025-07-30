'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { UserProfileProvider, useUserProfile } from './UserProfileContext';
import { AdminProvider, useAdmin } from './AdminContext';

// Combined context that provides all auth-related contexts
interface CombinedAuthContextType {
  auth: ReturnType<typeof useAuth>;
  userProfile: ReturnType<typeof useUserProfile>;
  admin: ReturnType<typeof useAdmin>;
}

const CombinedAuthContext = createContext<CombinedAuthContextType | null>(null);

// Hook to use combined auth context
export function useCombinedAuth() {
  const context = useContext(CombinedAuthContext);
  if (!context) {
    throw new Error('useCombinedAuth must be used within CombinedAuthProvider');
  }
  return context;
}

// Inner component that has access to all individual contexts
function CombinedAuthInner({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userProfile = useUserProfile();
  const admin = useAdmin();

  const value = React.useMemo(() => ({
    auth,
    userProfile,
    admin
  }), [auth, userProfile, admin]);

  return (
    <CombinedAuthContext.Provider value={value}>
      {children}
    </CombinedAuthContext.Provider>
  );
}

// Main provider that wraps all auth-related providers
export function CombinedAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <AdminProvider>
          <CombinedAuthInner>
            {children}
          </CombinedAuthInner>
        </AdminProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}

// Export individual hooks for backward compatibility
export { useAuth } from './AuthContext';
export { useUserProfile } from './UserProfileContext';
export { useAdmin } from './AdminContext';