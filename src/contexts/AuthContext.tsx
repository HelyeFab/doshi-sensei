'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { showPasswordPrompt } from '@/utils/dialogHelpers';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, getAuthInstance } from '@/lib/firebase';
import { 
  getDefaultSubscription, 
  UserSubscription, 
  getUserType, 
  getUserProfile,
  getAuthStatus,
  getSubscriptionTier,
  UserType 
} from '@/types/subscription';
import {
  UserProfile,
  AuthStatus,
  SubscriptionTier,
  createUserProfile
} from '@/types/user-profile';

interface AuthContextType {
  user: User | null;
  userType: UserType;
  subscription: UserSubscription | null;
  loading: boolean;
  // NEW: Separated concerns
  userProfile: UserProfile;
  authStatus: AuthStatus;
  subscriptionTier: SubscriptionTier;
  // Methods
  signInWithEmail: (email: string, password: string) => Promise<import('firebase/auth').UserCredential>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context for direct access when needed
export { AuthContext };

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to create/update user document in Firestore
const createOrUpdateUserDocument = async (user: User) => {
  if (!db || !user) return null;

  const userRef = doc(db, 'users', user.uid);

  try {
    // Check if user document already exists
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create new user document with default free subscription
      const defaultSubscription = getDefaultSubscription('free');
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        subscription: defaultSubscription,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      });
      return defaultSubscription;
    } else {
      // Update existing user document with latest info
      await updateDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        lastLoginAt: new Date(),
        isActive: true,
      });
      
      // Return existing subscription
      const userData = userSnap.data();
      return userData?.subscription || getDefaultSubscription('free');
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
    return null;
  }
};

// Helper function to fetch user subscription
const fetchUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  if (!db || !userId) return null;

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData?.subscription || getDefaultSubscription('free');
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [userType, setUserType] = useState<UserType>('guest');
  const [userProfile, setUserProfile] = useState<UserProfile>(createUserProfile('anonymous', 'free'));
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Function to refresh subscription data
  const refreshSubscription = async () => {
    if (user) {
      const sub = await fetchUserSubscription(user.uid);
      setSubscription(sub);
      const newUserType = getUserType(sub ?? undefined);
      const newUserProfile = getUserProfile(sub, user.uid);
      setUserType(newUserType);
      setUserProfile(newUserProfile);
    }
  };

  // Wait for auth to be available on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !authInitialized) {
      // Give Firebase a moment to initialize
      const checkAuth = setInterval(() => {
        const authInstance = getAuthInstance();
        if (authInstance) {
          console.log('[Auth] Auth instance now available');
          setAuthInitialized(true);
          clearInterval(checkAuth);
        }
      }, 100);
      
      // Timeout after 3 seconds
      setTimeout(() => clearInterval(checkAuth), 3000);
    }
  }, [authInitialized]);
  
  useEffect(() => {
    // Only run after auth is initialized
    if (!authInitialized) return;
    
    // Handle redirect result from Google sign-in
    const handleRedirectResult = async () => {
      console.log('[Auth] Checking for redirect result...');
      
      const authInstance = getAuthInstance();
      if (!authInstance) {
        console.log('[Auth] No auth instance, skipping redirect check');
        return;
      }
      
      try {
        console.log('[Auth] Calling getRedirectResult...');
        const result = await getRedirectResult(authInstance);
        
        if (result?.user) {
          console.log('[Auth] ✅ Redirect sign-in successful!', {
            email: result.user.email,
            uid: result.user.uid,
            provider: result.providerId
          });
          
          const sub = await createOrUpdateUserDocument(result.user);
          setSubscription(sub);
          const newUserType = getUserType(sub ?? undefined);
          const newUserProfile = getUserProfile(sub, result.user.uid);
          setUserType(newUserType);
          setUserProfile(newUserProfile);
          setUser(result.user);
          
          console.log('[Auth] User state updated after redirect');
        } else {
          console.log('[Auth] No redirect result (normal page load)');
        }
      } catch (error: any) {
        // Only log actual errors, not null results
        if (error.code && error.code !== 'auth/no-auth-event') {
          console.error('[Auth] ❌ Redirect sign-in error:', {
            code: error.code,
            message: error.message,
            details: error.customData
          });
        }
      }
    };
    
    handleRedirectResult();
    
    const authInstance = getAuthInstance();
    if (!authInstance) {
      console.log('[Auth] No auth instance for onAuthStateChanged');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Create/update user document and fetch subscription
        const sub = await createOrUpdateUserDocument(currentUser);
        console.log('[AuthContext Debug] Subscription data:', sub);
        console.log('[AuthContext Debug] Subscription plan:', sub?.plan);
        console.log('[AuthContext Debug] Subscription status:', sub?.status);
        setSubscription(sub);
        const newUserType = getUserType(sub ?? undefined);
        console.log('[AuthContext Debug] Computed userType:', newUserType);
        const newUserProfile = getUserProfile(sub, currentUser.uid);
        setUserType(newUserType);
        setUserProfile(newUserProfile);
      } else {
        // User signed out
        setSubscription(null);
        setUserType('guest');
        setUserProfile(createUserProfile('anonymous', 'free'));
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [authInitialized]);

  const signInWithEmail = async (email: string, password: string) => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Auth not initialized');
    const result = await signInWithEmailAndPassword(authInstance, email, password);
    
    // Fetch subscription after sign in
    if (result.user) {
      const sub = await fetchUserSubscription(result.user.uid);
      setSubscription(sub);
      const newUserType = getUserType(sub ?? undefined);
      const newUserProfile = getUserProfile(sub, result.user.uid);
      setUserType(newUserType);
      setUserProfile(newUserProfile);
    }
    
    return result;
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Auth not initialized');
    const result = await createUserWithEmailAndPassword(authInstance, email, password);

    // Update the user's display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Create user document with default subscription
    if (result.user) {
      const sub = await createOrUpdateUserDocument(result.user);
      setSubscription(sub);
      const newUserType = getUserType(sub ?? undefined);
      const newUserProfile = getUserProfile(sub, result.user.uid);
      setUserType(newUserType);
      setUserProfile(newUserProfile);
    }
    
    return result.user;
  };

  const signInWithGoogle = async () => {
    console.log('[Auth] signInWithGoogle called');
    console.log('[Auth] Auth object exists?', !!auth);
    console.log('[Auth] Window location:', window.location.href);
    
    const authInstance = getAuthInstance();
    if (!authInstance) {
      console.error('[Auth] CRITICAL: Auth not initialized!');
      console.error('[Auth] This usually means Firebase config is missing or incorrect');
      throw new Error('Auth not initialized - check Firebase configuration');
    }
    
    console.log('[Auth] Creating GoogleAuthProvider...');
    const provider = new GoogleAuthProvider();
    
    // Force account selection
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    console.log('[Auth] Auth config check:', {
      authDomain: authInstance.app.options.authDomain,
      apiKey: authInstance.app.options.apiKey ? 'SET' : 'MISSING',
      projectId: authInstance.app.options.projectId,
      appName: authInstance.app.name,
      currentUser: authInstance.currentUser?.email || 'none'
    });
    
    try {
      // Always use redirect method for consistent behavior
      console.log('[Auth] About to call signInWithRedirect...');
      console.log('[Auth] Provider:', provider);
      console.log('[Auth] Auth instance:', authInstance);
      
      await signInWithRedirect(authInstance, provider);
      
      console.log('[Auth] signInWithRedirect completed - page should redirect to Google now');
      // Note: This function will cause a page redirect, so code after this won't execute
    } catch (error: any) {
      console.error('[Auth] ❌ Google sign-in error details:', {
        code: error.code,
        message: error.message,
        customData: error.customData,
        name: error.name,
        stack: error.stack
      });
      
      // Check for specific error types
      if (error.code === 'auth/unauthorized-domain') {
        console.error('[Auth] Domain not authorized in Firebase Console');
      } else if (error.code === 'auth/operation-not-allowed') {
        console.error('[Auth] Google sign-in not enabled in Firebase Console');
      }
      
      throw error;
    }
  };

  const logout = async () => {
    const authInstance = getAuthInstance();
    if (!authInstance) throw new Error('Auth not initialized');
    await signOut(authInstance);
    setSubscription(null);
    setUserType('guest');
    setUserProfile(createUserProfile('anonymous', 'free'));
  };

  const resetPassword = async (email: string) => {
    console.log('[Auth] resetPassword called for email:', email);
    
    const authInstance = getAuthInstance();
    if (!authInstance) {
      console.error('[Auth] CRITICAL: Auth not initialized for password reset!');
      throw new Error('Auth not initialized');
    }
    
    console.log('[Auth] Auth domain for password reset:', authInstance.app.options.authDomain);
    
    try {
      console.log('[Auth] Sending password reset email...');
      await sendPasswordResetEmail(authInstance, email);
      console.log('[Auth] Password reset email sent successfully');
    } catch (error: any) {
      console.error('[Auth] Password reset error:', {
        code: error.code,
        message: error.message,
        email: email,
        authDomain: authInstance.app.options.authDomain
      });
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('No user logged in');
    await sendEmailVerification(user);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('No user logged in');
    
    try {
      // For account deletion to work, we need a recent authentication
      // Let's prompt the user to re-enter their password
      const email = user.email;
      if (!email) throw new Error('No email found for user');
      
      // Ask for password using secure dialog
      let password: string;
      try {
        password = await showPasswordPrompt(
          'Confirm Account Deletion',
          'Please enter your password to permanently delete your account. This action cannot be undone.',
          'Enter your password',
          'danger'
        );
      } catch (error) {
        throw new Error('Account deletion cancelled');
      }
      
      // Re-authenticate the user
      const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
      const credential = EmailAuthProvider.credential(email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Now we can delete - first get the UID
      const uid = user.uid;
      
      // Delete Firestore data first (while we still have auth)
      if (db) {
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (error) {
          console.log('Error deleting Firestore data:', error);
          // Continue anyway
        }
      }
      
      // Now delete the auth user account (this should work after reauthentication)
      await user.delete();
      
      // Clear local state
      setSubscription(null);
      setUserType('guest');
      setUserProfile(createUserProfile('anonymous', 'free'));
      
      console.log('Account deleted successfully');
    } catch (error: any) {
      console.error('Delete account error:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Authentication failed. Please try again.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again.');
      }
      
      throw new Error(error.message || 'Failed to delete account');
    }
  };

  const value: AuthContextType = {
    user,
    userType,
    subscription,
    loading,
    // NEW: Separated concerns
    userProfile,
    authStatus: userProfile.authStatus,
    subscriptionTier: userProfile.subscriptionTier,
    // Methods
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    resetPassword,
    sendVerificationEmail,
    deleteAccount,
    refreshSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}