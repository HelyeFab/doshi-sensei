'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  avatar?: string | null; // Custom avatar from Firestore
  // Add other Firestore fields as needed
}

interface UserProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  profilePicture: string | null; // The picture to actually display
}

const UserProfileContext = createContext<UserProfileContextType>({
  profile: null,
  loading: true,
  profilePicture: null,
});

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [firestoreLoading, setFirestoreLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFirestoreData(null);
      setFirestoreLoading(false);
      return;
    }

    // Use realtime listener for instant updates
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setFirestoreData(snapshot.data());
        } else {
          setFirestoreData(null);
        }
        setFirestoreLoading(false);
      },
      (error) => {
        console.error('Error fetching user profile:', error);
        setFirestoreData(null);
        setFirestoreLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Memoize the merged profile and profile picture
  const { profile, profilePicture } = useMemo(() => {
    if (!user) {
      return { profile: null, profilePicture: null };
    }

    // Merge auth user with Firestore data
    const mergedProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      ...firestoreData, // Firestore data overrides auth data
    };

    // Determine which picture to show
    // Priority: custom avatar > Google photo > null
    const picture = mergedProfile.avatar || mergedProfile.photoURL;

    return { profile: mergedProfile, profilePicture: picture };
  }, [user, firestoreData]);

  // Only show loading while both auth and initial Firestore load are happening
  const loading = authLoading || (user && firestoreLoading);

  return (
    <UserProfileContext.Provider value={{ profile, loading, profilePicture }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
}