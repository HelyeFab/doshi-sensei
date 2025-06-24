'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Analytics } from '@/utils/analytics';
import { getDefaultSubscription } from '@/types/subscription';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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
  if (!db || !user) return;

  const userRef = doc(db, 'users', user.uid);
  
  try {
    // Check if user document already exists
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user document
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        subscription: getDefaultSubscription('free'),
        createdAt: new Date(),
        lastLoginAt: new Date(),
        isActive: true,
      });
      console.log('Created new user document for:', user.email);
    } else {
      // Update existing user document with latest info
      await updateDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        lastLoginAt: new Date(),
        isActive: true,
      });
      console.log('Updated user document for:', user.email);
    }
  } catch (error) {
    console.error('Error creating/updating user document:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let previousUser: User | null = null;
    
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      // Create/update user document in Firestore
      if (currentUser) {
        await createOrUpdateUserDocument(currentUser);
      }
      
      // Track session start when user logs in
      if (currentUser && !previousUser) {
        try {
          Analytics.trackSessionStart(currentUser.uid, {
            loginMethod: 'auth_state_change',
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.warn('Failed to track session start:', error);
        }
      }
      
      // Note: Session end tracking is now handled in the logout function
      // to avoid permission errors when the user is already signed out
      
      previousUser = currentUser;
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Update the user's display name if provided
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }

    // Create user document in Firestore
    if (result.user) {
      await createOrUpdateUserDocument(result.user);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Create/update user document in Firestore
    if (result.user) {
      await createOrUpdateUserDocument(result.user);
    }
  };

  const logout = async () => {
    // Track session end BEFORE signing out (while user still has permissions)
    if (user) {
      try {
        await Analytics.trackSessionEnd(user.uid, {
          logoutMethod: 'manual_logout',
          timestamp: new Date().toISOString(),
        });
        
        // Brief delay to ensure analytics event is sent before signing out
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Failed to track session end on logout:', error);
        // Don't prevent logout if analytics fails
      }
    }
    
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const value: AuthContextType = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
