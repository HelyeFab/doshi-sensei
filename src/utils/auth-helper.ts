import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Wait for Firebase Auth to be ready and return the current user
 * This helps avoid race conditions where Firestore operations happen
 * before the auth state is fully loaded
 */
export function waitForAuth(): Promise<typeof auth.currentUser> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Get the current user's ID token with retry logic
 * This is useful for ensuring we have fresh auth tokens for Firestore
 */
export async function getFreshIdToken(): Promise<string | null> {
  const user = await waitForAuth();
  if (!user) return null;
  
  try {
    // Force refresh the ID token
    return await user.getIdToken(true);
  } catch (error) {
    console.error('Error getting fresh ID token:', error);
    return null;
  }
}