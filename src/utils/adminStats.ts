import { collection, query, where, getDocs, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserStats, SubscriptionStats, FeatureStats } from '@/types/admin';
import { UserSubscription } from '@/types/subscription';

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

// Helper function to get date ranges
function getDateRanges() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { today, weekAgo, monthAgo };
}

// Convert Firestore timestamp to Date
function timestampToDate(timestamp: any): Date {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

/**
 * Get comprehensive user statistics
 */
export async function getUserStats(): Promise<UserStats> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const { today, weekAgo, monthAgo } = getDateRanges();
    const usersRef = collection(db, 'users');

    // Get all users
    const allUsersSnapshot = await getDocs(usersRef);
    const allUsers: FirebaseUser[] = allUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseUser));

    const totalUsers = allUsers.length;

    // Filter users by registration date
    const newUsersToday = allUsers.filter(user => {
      const createdAt = timestampToDate(user.createdAt);
      return createdAt >= today;
    }).length;

    const newUsersThisWeek = allUsers.filter(user => {
      const createdAt = timestampToDate(user.createdAt);
      return createdAt >= weekAgo;
    }).length;

    const newUsersThisMonth = allUsers.filter(user => {
      const createdAt = timestampToDate(user.createdAt);
      return createdAt >= monthAgo;
    }).length;

    // Filter by activity (users who logged in today)
    const activeUsersToday = allUsers.filter(user => {
      const lastLoginAt = timestampToDate(user.lastLoginAt);
      return lastLoginAt >= today;
    }).length;

    // Count registered vs guest users (users with subscription data are registered)
    const registeredUsers = allUsers.filter(user => user.subscription).length;
    const guestUsers = totalUsers - registeredUsers;

    return {
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      activeUsersToday,
      guestUsers,
      registeredUsers,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    // Return fallback stats
    return {
      totalUsers: 0,
      newUsersToday: 0,
      newUsersThisWeek: 0,
      newUsersThisMonth: 0,
      activeUsersToday: 0,
      guestUsers: 0,
      registeredUsers: 0,
    };
  }
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  try {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    const usersRef = collection(db, 'users');
    const allUsersSnapshot = await getDocs(usersRef);
    const allUsers: FirebaseUser[] = allUsersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirebaseUser));

    // Filter by subscription type
    const freeUsers = allUsers.filter(user =>
      user.subscription?.subscription?.plan === 'free'
    ).length;

    const monthlySubscribers = allUsers.filter(user =>
      user.subscription?.subscription?.plan === 'monthly'
    ).length;

    const yearlySubscribers = allUsers.filter(user =>
      user.subscription?.subscription?.plan === 'yearly'
    ).length;

    const totalSubscribers = monthlySubscribers + yearlySubscribers;
    const totalUsers = allUsers.length;

    // Calculate conversion rate (premium users / total users)
    const conversionRate = totalUsers > 0 ? (totalSubscribers / totalUsers) * 100 : 0;

    // Calculate revenue estimates (these are rough estimates)
    const monthlyRecurringRevenue = (monthlySubscribers * 3.99) + (yearlySubscribers * 39.99 / 12);
    const averageRevenuePerUser = totalUsers > 0 ? monthlyRecurringRevenue / totalUsers : 0;

    return {
      freeUsers,
      monthlySubscribers,
      yearlySubscribers,
      conversionRate: Math.round(conversionRate * 100) / 100,
      monthlyRecurringRevenue: Math.round(monthlyRecurringRevenue * 100) / 100,
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return {
      freeUsers: 0,
      monthlySubscribers: 0,
      yearlySubscribers: 0,
      conversionRate: 0,
      monthlyRecurringRevenue: 0,
      averageRevenuePerUser: 0,
    };
  }
}

/**
 * Get feature usage statistics (placeholder - will be enhanced later)
 */
export async function getFeatureStats(): Promise<FeatureStats> {
  try {
    // These would come from usage analytics in a real implementation
    // For now, we'll return placeholder data
    return {
      drillsCompletedToday: 45,
      vocabularySearchesToday: 128,
      moodBoardViewsToday: 23,
      mostPopularMoodBoard: 'Nature N5',
      averageSessionDuration: 12.5, // minutes
    };
  } catch (error) {
    console.error('Error fetching feature stats:', error);
    return {
      drillsCompletedToday: 0,
      vocabularySearchesToday: 0,
      moodBoardViewsToday: 0,
      mostPopularMoodBoard: 'Unknown',
      averageSessionDuration: 0,
    };
  }
}

/**
 * Real-time listener for user statistics
 */
export function subscribeToUserStats(callback: (stats: UserStats) => void): () => void {
  if (!db) {
    console.error('Firebase not initialized');
    return () => {};
  }

  const usersRef = collection(db, 'users');

  return onSnapshot(usersRef, async (snapshot) => {
    try {
      const stats = await getUserStats();
      callback(stats);
    } catch (error) {
      console.error('Error in user stats subscription:', error);
    }
  }, (error) => {
    console.error('Error subscribing to user stats:', error);
  });
}

/**
 * Real-time listener for subscription statistics
 */
export function subscribeToSubscriptionStats(callback: (stats: SubscriptionStats) => void): () => void {
  if (!db) {
    console.error('Firebase not initialized');
    return () => {};
  }

  const usersRef = collection(db, 'users');

  return onSnapshot(usersRef, async (snapshot) => {
    try {
      const stats = await getSubscriptionStats();
      callback(stats);
    } catch (error) {
      console.error('Error in subscription stats subscription:', error);
    }
  }, (error) => {
    console.error('Error subscribing to subscription stats:', error);
  });
}

/**
 * Calculate growth percentage between two periods
 */
export function calculateGrowthPercentage(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
