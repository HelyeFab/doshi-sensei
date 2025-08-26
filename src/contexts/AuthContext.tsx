'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getAuthService } from '@/lib/auth/auth-service';
import { getEmailVerificationService } from '@/lib/auth/email-verification';
import { AuthUser, AuthSession } from '@/lib/auth/types';
import { SECURITY_MESSAGES } from '@/lib/auth/constants';
import { 
  getDefaultSubscription, 
  UserSubscription, 
  getUserType, 
  getUserProfile,
  UserType 
} from '@/types/subscription';
import {
  UserProfile,
  AuthStatus,
  SubscriptionTier,
  createUserProfile
} from '@/types/user-profile';

interface AuthContextType {
  // User state
  user: User | null;
  authUser: AuthUser | null;
  userType: UserType;
  subscription: UserSubscription | null;
  loading: boolean;
  
  // Separated concerns
  userProfile: UserProfile;
  authStatus: AuthStatus;
  subscriptionTier: SubscriptionTier;
  session: AuthSession | null;
  
  // Auth methods (simplified with magic links)
  sendMagicLink: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyMagicLink: (email: string, token: string, link?: string) => Promise<{ success: boolean; message?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  
  // Email verification
  sendVerificationEmail: () => Promise<{ success: boolean; message: string }>;
  isEmailVerified: () => boolean;
  
  // GDPR compliance
  requestAccountDeletion: (reason?: string) => Promise<{ success: boolean; message: string; scheduledDate?: Date }>;
  cancelAccountDeletion: () => Promise<{ success: boolean; message: string }>;
  exportUserData: () => Promise<{ success: boolean; downloadUrl?: string; message?: string }>;
  
  // Profile management
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<{ success: boolean; message?: string }>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Core auth state
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Subscription state
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [userType, setUserType] = useState<UserType>('guest');
  const [userProfile, setUserProfile] = useState<UserProfile>(createUserProfile('anonymous', 'free'));
  
  // Get service instances
  const authService = getAuthService();
  const emailVerificationService = getEmailVerificationService();

  /**
   * Fetch user subscription from Firestore
   */
  const fetchUserSubscription = useCallback(async (userId: string): Promise<UserSubscription | null> => {
    if (!userId || !db) return null;
    
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData?.subscription || getDefaultSubscription('free');
      }
      
      return getDefaultSubscription('free');
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
      return getDefaultSubscription('free');
    }
  }, []);

  /**
   * Refresh subscription data
   */
  const refreshSubscription = useCallback(async () => {
    if (user) {
      const sub = await fetchUserSubscription(user.uid);
      setSubscription(sub);
      const newUserType = getUserType(sub);
      const newUserProfile = getUserProfile(sub, user.uid);
      setUserType(newUserType);
      setUserProfile(newUserProfile);
    }
  }, [user, fetchUserSubscription]);

  /**
   * Handle auth state changes
   */
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Create AuthUser object
        const authUserData: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          createdAt: new Date(firebaseUser.metadata.creationTime!),
          lastLoginAt: new Date(firebaseUser.metadata.lastSignInTime!),
          provider: 'email', // Will be updated based on provider
          metadata: {
            trustScore: 50, // Will be updated by security monitor
          },
        };
        setAuthUser(authUserData);
        
        // Get current session
        const currentSession = authService.getCurrentSession();
        setSession(currentSession);
        
        // Fetch subscription
        const sub = await fetchUserSubscription(firebaseUser.uid);
        setSubscription(sub);
        
        // Update user type and profile
        const newUserType = getUserType(sub);
        const newUserProfile = getUserProfile(sub, firebaseUser.uid);
        setUserType(newUserType);
        setUserProfile(newUserProfile);
        
        // Check email verification
        if (!firebaseUser.emailVerified) {
          const verificationStatus = await emailVerificationService.checkVerificationStatus(firebaseUser);
          if (verificationStatus.reminderNeeded) {
            console.log('Email verification reminder needed');
          }
        }
      } else {
        // User signed out
        setAuthUser(null);
        setSession(null);
        setSubscription(null);
        setUserType('guest');
        setUserProfile(createUserProfile('anonymous', 'free'));
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserSubscription, authService, emailVerificationService]);

  /**
   * Send magic link for passwordless sign in
   */
  const sendMagicLink = async (email: string) => {
    return await authService.sendMagicLink(email, {
      userAgent: navigator.userAgent,
    });
  };

  /**
   * Verify magic link and complete sign in
   */
  const verifyMagicLink = async (email: string, token: string, link?: string) => {
    const result = await authService.verifyMagicLink(email, token, link);
    
    if (result.success && result.user) {
      setAuthUser(result.user);
      await refreshSubscription();
    }
    
    return {
      success: result.success,
      message: result.message,
    };
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    const result = await authService.signInWithGoogle({
      userAgent: navigator.userAgent,
    });
    
    if (result.success && result.user) {
      setAuthUser(result.user);
      await refreshSubscription();
    }
    
    return {
      success: result.success,
      message: result.message,
    };
  };

  /**
   * Sign out
   */
  const logout = async () => {
    await authService.signOut();
  };

  /**
   * Send email verification
   */
  const sendVerificationEmail = async () => {
    return await authService.sendEmailVerification({
      userAgent: navigator.userAgent,
    });
  };

  /**
   * Check if email is verified
   */
  const isEmailVerified = () => {
    return user?.emailVerified || false;
  };

  /**
   * Request account deletion (GDPR compliant)
   */
  const requestAccountDeletion = async (reason?: string) => {
    return await authService.requestAccountDeletion(reason);
  };

  /**
   * Cancel account deletion request
   */
  const cancelAccountDeletion = async () => {
    return await authService.cancelAccountDeletion();
  };

  /**
   * Export user data (GDPR compliant)
   */
  const exportUserData = async () => {
    return await authService.exportUserData();
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates: { displayName?: string; photoURL?: string }) => {
    const result = await authService.updateUserProfile(updates);
    
    if (result.success && authUser) {
      setAuthUser({
        ...authUser,
        displayName: updates.displayName ?? authUser.displayName,
        photoURL: updates.photoURL ?? authUser.photoURL,
      });
    }
    
    return result;
  };

  const value: AuthContextType = {
    // User state
    user,
    authUser,
    userType,
    subscription,
    loading,
    
    // Separated concerns
    userProfile,
    authStatus: userProfile.authStatus,
    subscriptionTier: userProfile.subscriptionTier,
    session,
    
    // Auth methods
    sendMagicLink,
    verifyMagicLink,
    signInWithGoogle,
    logout,
    
    // Email verification
    sendVerificationEmail,
    isEmailVerified,
    
    // GDPR compliance
    requestAccountDeletion,
    cancelAccountDeletion,
    exportUserData,
    
    // Profile management
    updateProfile,
    refreshSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}