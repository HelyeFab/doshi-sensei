'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { showPasswordPrompt } from '@/utils/dialogHelpers';
import { authDebug } from '@/utils/authDebug';
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
import { doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
      
      // Clean subscription data - remove any undefined values and fix dates
      const cleanSubscription = JSON.parse(JSON.stringify(defaultSubscription));
      
      await setDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || '',
        subscription: cleanSubscription,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        isActive: true,
      });
      return defaultSubscription;
    } else {
      // Update existing user document with latest info
      await updateDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || '',
        lastLoginAt: serverTimestamp(),
        isActive: true,
      });
      
      // Return existing subscription
      const userData = userSnap.data();
      return userData?.subscription || getDefaultSubscription('free');
    }
  } catch (error) {
    // Error creating/updating user document
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
    // Error fetching user subscription
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
      const newUserType = getUserType(sub ?? null);
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
        if (auth) {
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
      if (!auth) return;
      
      // Check if we're expecting a redirect result
      const isRedirectFlow = sessionStorage.getItem('googleAuthRedirect');
      
      // Only check for redirect result if we're expecting one
      if (isRedirectFlow === 'pending') {
        try {
          // Checking for redirect result
          const result = await getRedirectResult(auth);
          
          // Clear the redirect flag immediately after checking
          sessionStorage.removeItem('googleAuthRedirect');
          
          if (result?.user) {
            // Redirect sign-in successful
            const sub = await createOrUpdateUserDocument(result.user);
            setSubscription(sub);
            const newUserType = getUserType(sub ?? null);
            const newUserProfile = getUserProfile(sub, result.user.uid);
            setUserType(newUserType);
            setUserProfile(newUserProfile);
          } else if (result === null) {
            // No redirect result but flag was set - might indicate an issue
            // No redirect result found despite pending flag
            // Run diagnostics to help identify the issue
            authDebug.checkEnvironment();
            authDebug.logRedirectInfo();
            authDebug.diagnoseIssues();
          }
        } catch (error) {
          // Clear the redirect flag on error
          sessionStorage.removeItem('googleAuthRedirect');
          
          // Only log actual errors, not null results
          if ((error as { code?: string })?.code && (error as { code?: string }).code !== 'auth/no-auth-event') {
            // Redirect sign-in error
            
            // Log specific error details for debugging
            const errorCode = (error as { code?: string })?.code;
            const errorMessage = (error as { message?: string })?.message;
            // Error details logged
            
            // Run diagnostics on error
            authDebug.checkEnvironment();
            authDebug.diagnoseIssues();
          }
        }
      }
    };
    
    handleRedirectResult();
    
    if (!auth) {
      console.log('[Auth] No auth instance for onAuthStateChanged');
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Create/update user document and fetch subscription
        const sub = await createOrUpdateUserDocument(currentUser);
        // Subscription data loaded
        setSubscription(sub);
        const newUserType = getUserType(sub ?? null);
        // User type computed
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
    if (!auth) throw new Error('Auth not initialized');
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Fetch subscription after sign in
    if (result.user) {
      const sub = await fetchUserSubscription(result.user.uid);
      setSubscription(sub);
      const newUserType = getUserType(sub ?? null);
      const newUserProfile = getUserProfile(sub, result.user.uid);
      setUserType(newUserType);
      setUserProfile(newUserProfile);
    }
    
    return result;
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    if (!auth) throw new Error('Auth not initialized');
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update the user's display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Create user document with default subscription
    if (result.user) {
      const sub = await createOrUpdateUserDocument(result.user);
      setSubscription(sub);
      const newUserType = getUserType(sub ?? null);
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
    
    if (!auth) {
      console.error('[Auth] CRITICAL: Auth not initialized!');
      console.error('[Auth] This usually means Firebase config is missing or incorrect');
      throw new Error('Auth not initialized - check Firebase configuration');
    }
    
    console.log('[Auth] Creating GoogleAuthProvider...');
    const provider = new GoogleAuthProvider();
    
    // Force account selection
    provider.setCustomParameters({
      prompt: 'select_account',
      // Add additional parameters for better production handling
      access_type: 'offline',
      include_granted_scopes: 'true'
    });
    
    console.log('[Auth] Auth config check:', {
      authDomain: auth.app.options.authDomain,
      apiKey: auth.app.options.apiKey ? 'SET' : 'MISSING',
      projectId: auth.app.options.projectId,
      appName: auth.app.name,
      currentUser: auth.currentUser?.email || 'none'
    });
    
    try {
      // Check if we're in a redirect flow (important for production)
      if (typeof window !== 'undefined') {
        // Set a flag in sessionStorage to track redirect initiation
        const isRedirectFlow = sessionStorage.getItem('googleAuthRedirect');
        
        // If we just initiated a redirect, don't try again
        if (isRedirectFlow === 'pending') {
          // Redirect already in progress
          return;
        }
        
        // Try popup first (better UX on desktop)
        if (window.innerWidth > 768) {
          try {
            if (!auth) throw new Error('Auth not initialized');
            const result = await signInWithPopup(auth, provider);
            // Create/update user document in Firestore
            if (result.user) {
              const sub = await createOrUpdateUserDocument(result.user);
              setSubscription(sub);
              const newUserType = getUserType(sub ?? null);
              const newUserProfile = getUserProfile(sub, result.user.uid);
              setUserType(newUserType);
              setUserProfile(newUserProfile);
              // Clear any redirect flags
              sessionStorage.removeItem('googleAuthRedirect');
            }
            return;
          } catch (popupError) {
            // If popup fails (blocked, COOP issues, etc.), fall back to redirect
            if ((popupError as { code?: string }).code !== 'auth/popup-closed-by-user') {
              // Popup blocked or failed, using redirect method
              // Mark redirect as pending
              sessionStorage.setItem('googleAuthRedirect', 'pending');
              if (auth) await signInWithRedirect(auth, provider);
            }
            // If user closed the popup, just return silently (not an error)
          }
        } else {
          // Use redirect for mobile devices
          // Mark redirect as pending
          sessionStorage.setItem('googleAuthRedirect', 'pending');
          if (auth) await signInWithRedirect(auth, provider);
        }
      }
    } catch (error) {
      // Google sign-in error
      // Clear redirect flag on error
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('googleAuthRedirect');
      }
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) throw new Error('Auth not initialized');
    await signOut(auth);
    setSubscription(null);
    setUserType('guest');
    setUserProfile(createUserProfile('anonymous', 'free'));
  };

  const resetPassword = async (email: string) => {
    console.log('[Auth] resetPassword called for email:', email);
    
    if (!auth) {
      console.error('[Auth] CRITICAL: Auth not initialized for password reset!');
      throw new Error('Auth not initialized');
    }
    
    console.log('[Auth] Auth domain for password reset:', auth.app.options.authDomain);
    
    try {
      console.log('[Auth] Sending password reset email...');
      await sendPasswordResetEmail(auth, email);
      console.log('[Auth] Password reset email sent successfully');
    } catch (error: any) {
      console.error('[Auth] Password reset error:', {
        code: error.code,
        message: error.message,
        email: email,
        authDomain: auth.app.options.authDomain
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
          // Error deleting Firestore data
          // Continue anyway
        }
      }
      
      // Now delete the auth user account (this should work after reauthentication)
      await user.delete();
      
      // Clear local state
      setSubscription(null);
      setUserType('guest');
      setUserProfile(createUserProfile('anonymous', 'free'));
      
      // Account deleted successfully
    } catch (error: any) {
      // Delete account error
      
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