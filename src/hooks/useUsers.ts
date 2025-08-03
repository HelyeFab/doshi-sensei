'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, onSnapshot, getDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminUserDetails } from '@/types/admin';
import { UserSubscription, getDefaultSubscription } from '@/types/subscription';
import { logAdminAction } from '@/utils/adminLogs';

interface UseUsersReturn {
  users: AdminUserDetails[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  upgradeUserToPremium: (userId: string, plan: 'monthly' | 'yearly') => Promise<void>;
}

// Interface for Firebase user document
interface FirebaseUser {
  id: string;
  email?: string;
  displayName?: string;
  subscription?: UserSubscription;
  createdAt?: any; // Firestore timestamp
  lastLoginAt?: any; // Firestore timestamp
  isActive?: boolean;
  [key: string]: any; // Allow other properties
}

// Convert Firestore timestamp to Date
function timestampToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return null;
}

// Convert Firebase user to AdminUserDetails
function convertFirebaseUser(firebaseUser: FirebaseUser): AdminUserDetails {
  return {
    id: firebaseUser.id,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName,
    subscription: firebaseUser.subscription || getDefaultSubscription('free'),
    createdAt: timestampToDate(firebaseUser.createdAt) || new Date(),
    lastLoginAt: timestampToDate(firebaseUser.lastLoginAt) || undefined,
    isActive: firebaseUser.isActive ?? true,
  };
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<AdminUserDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      setError(null);
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const fetchedUsers: AdminUserDetails[] = snapshot.docs.map(doc => {
        const firebaseUser: FirebaseUser = {
          id: doc.id,
          ...doc.data()
        };
        
        // Debug: Log raw Firebase user data
        
        return convertFirebaseUser(firebaseUser);
      });

      setUsers(fetchedUsers);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    setLoading(true);
    await fetchUsers();
  };

  const upgradeUserToPremium = async (userId: string, plan: 'monthly' | 'yearly') => {
    try {
      if (!db) {
        throw new Error('Firebase not initialized');
      }

      const userRef = doc(db, 'users', userId);

      // Calculate period end date
      const now = new Date();
      const periodEnd = new Date(now);
      if (plan === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Get existing data
      const userDoc = await getDoc(userRef);
      const existingData = userDoc.data();
      
      // Create CLEAN subscription structure matching the new architecture
      // This should match EXACTLY what the webhook creates
      const subscriptionData = {
        status: 'active',
        plan: plan,
        stripeCustomerId: existingData?.subscription?.stripeCustomerId || 'admin_manual_upgrade',
        stripeSubscriptionId: existingData?.subscription?.stripeSubscriptionId || `admin_${plan}_${Date.now()}`,
        stripePriceId: plan === 'yearly' ? 'price_1RakzXHdrJomitOwE7B56erf' : 'price_1RakzXHdrJomitOwZc0HJC4J',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        metadata: {
          source: 'admin',
          createdAt: now,
          updatedAt: now,
          upgradedBy: 'admin'
        }
      };

      // Update ONLY the subscription field (clean structure)
      // This matches the webhook's update() approach
      await updateDoc(userRef, {
        subscription: subscriptionData,
        updatedAt: now
      });

      // Update local state with the new subscription structure
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, subscription: subscriptionData as any }
            : user
        )
      );

      // Log admin action
      await logAdminAction({
        action: 'user_upgraded_to_premium',
        targetUserId: userId,
        details: {
          newPlan: plan,
          previousPlan: existingData?.subscription?.plan || 'free',
        },
      });

      // Also log to webhook_logs for consistency
      try {
        const webhookLogsRef = collection(db, 'webhook_logs');
        await addDoc(webhookLogsRef, {
          eventId: `admin_upgrade_${Date.now()}`,
          type: 'admin_subscription_upgrade',
          status: 'success',
          timestamp: now,
          data: {
            userId: userId,
            email: existingData?.email || 'unknown',
            plan: plan,
            upgradedBy: 'admin'
          }
        });
      } catch (logError) {
        console.error('Failed to create webhook log:', logError);
        // Don't throw - the upgrade was successful
      }

    } catch (err) {
      console.error('Error upgrading user to premium:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to upgrade user');
    }
  };


  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupRealtimeListener = () => {
      if (!db) {
        setError('Firebase not initialized');
        setLoading(false);
        return;
      }

      const usersRef = collection(db, 'users');

      unsubscribe = onSnapshot(
        usersRef,
        (snapshot) => {
          try {
            const fetchedUsers: AdminUserDetails[] = snapshot.docs.map(doc => {
              const firebaseUser: FirebaseUser = {
                id: doc.id,
                ...doc.data()
              };
              return convertFirebaseUser(firebaseUser);
            });

            setUsers(fetchedUsers);
            setLoading(false);
            setError(null);
          } catch (err) {
            console.error('Error processing user snapshot:', err);
            setError(err instanceof Error ? err.message : 'Failed to process users');
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error in users snapshot listener:', err);
          setError(err.message || 'Failed to listen to user changes');
          setLoading(false);
        }
      );
    };

    setupRealtimeListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return {
    users,
    loading,
    error,
    refreshUsers,
    upgradeUserToPremium,
  };
}

// Utility function to search users
export function searchUsers(users: AdminUserDetails[], query: string): AdminUserDetails[] {
  if (!query.trim()) return users;

  const searchTerm = query.toLowerCase();
  return users.filter(user =>
    user.email.toLowerCase().includes(searchTerm) ||
    user.displayName?.toLowerCase().includes(searchTerm) ||
    user.id.toLowerCase().includes(searchTerm)
  );
}

// Utility function to filter users by subscription type
// FIXED: Now checks the FLAT structure (subscription.plan) instead of nested
export function filterUsersBySubscription(
  users: AdminUserDetails[],
  filterType: 'all' | 'free' | 'premium' | 'active'
): AdminUserDetails[] {
  switch (filterType) {
    case 'free':
      return users.filter(user => user.subscription?.plan === 'free');
    case 'premium':
      return users.filter(user =>
        user.subscription?.plan === 'monthly' ||
        user.subscription?.plan === 'yearly'
      );
    case 'active':
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return users.filter(user =>
        user.lastLoginAt && new Date(user.lastLoginAt) >= today
      );
    default:
      return users;
  }
}