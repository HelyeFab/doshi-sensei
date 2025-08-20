'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getDefaultSubscription, UserSubscription, getUserType, UserType } from '@/types/subscription';

interface AuthContextType {
  user: User | null;
  userType: UserType;
  subscription: UserSubscription | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<User | null>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [loading, setLoading] = useState(true);

  // Function to refresh subscription data
  const refreshSubscription = async () => {
    if (user) {
      const sub = await fetchUserSubscription(user.uid);
      setSubscription(sub);
      setUserType(getUserType(sub));
    }
  };

  useEffect(() => {
    // Handle redirect result from Google sign-in
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const sub = await createOrUpdateUserDocument(result.user);
          setSubscription(sub);
          setUserType(getUserType(sub));
        }
      } catch (error: any) {
        // Only log actual errors, not null results
        if (error?.code && error.code !== 'auth/no-auth-event') {
          console.error('Redirect sign-in error:', error);
        }
      }
    };
    
    handleRedirectResult();
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Create/update user document and fetch subscription
        const sub = await createOrUpdateUserDocument(currentUser);
        setSubscription(sub);
        setUserType(getUserType(sub));
      } else {
        // User signed out
        setSubscription(null);
        setUserType('guest');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    
    // Fetch subscription after sign in
    if (result.user) {
      const sub = await fetchUserSubscription(result.user.uid);
      setSubscription(sub);
      setUserType(getUserType(sub));
    }
    
    return result;
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update the user's display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Create user document with default subscription
    if (result.user) {
      const sub = await createOrUpdateUserDocument(result.user);
      setSubscription(sub);
      setUserType(getUserType(sub));
    }
    
    return result.user;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    // Force account selection even if user is already signed in to Google
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      // Try popup first (better UX on desktop)
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        try {
          const result = await signInWithPopup(auth, provider);
          // Create/update user document in Firestore
          if (result.user) {
            const sub = await createOrUpdateUserDocument(result.user);
            setSubscription(sub);
            setUserType(getUserType(sub));
          }
          return;
        } catch (popupError: any) {
          // If popup fails (blocked, COOP issues, etc.), fall back to redirect
          if (popupError.code !== 'auth/popup-closed-by-user') {
            console.log('Popup blocked or failed, using redirect method');
            await signInWithRedirect(auth, provider);
          }
          // If user closed the popup, just return silently (not an error)
        }
      } else {
        // Use redirect for mobile devices
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setSubscription(null);
    setUserType('guest');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const deleteAccount = async () => {
    if (!user) throw new Error('No user logged in');
    
    // Get the user's ID token
    const idToken = await user.getIdToken();
    
    // Call the delete account API
    const response = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete account');
    }
    
    // Sign out locally (the account is already deleted on the server)
    await signOut(auth);
    setSubscription(null);
    setUserType('guest');
  };

  const value: AuthContextType = {
    user,
    userType,
    subscription,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    resetPassword,
    deleteAccount,
    refreshSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}