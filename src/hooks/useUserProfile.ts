import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [firestoreUser, setFirestoreUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFirestoreUser() {
      if (!user) {
        setFirestoreUser(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setFirestoreUser(userSnap.data());
      } else {
        setFirestoreUser(null);
      }
      setLoading(false);
    }
    fetchFirestoreUser();
  }, [user]);

  // Merge Auth user and Firestore user (Firestore fields override Auth)
  const profile = user ? { ...user, ...firestoreUser } : null;

  return { user, firestoreUser, profile, loading: authLoading || loading };
}
