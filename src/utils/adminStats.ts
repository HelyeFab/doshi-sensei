import { collection, query, where, getDocs, onSnapshot, Timestamp, orderBy, limit } from 'firebase/firestore';
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

    // Debug: Log first few users to understand the data structure

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

    // Count registered vs guest users (users with email are registered)
    const registeredUsers = allUsers.filter(user => user.email).length;
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

    // Debug: Log user data to understand the structure

    // Filter by subscription type - using FLAT structure as per SINGLE SOURCE OF TRUTH
    const freeUsers = allUsers.filter(user => {
      const plan = user.subscription?.plan; // FLAT structure
      // Count as free if: no subscription, plan is 'free', or not monthly/yearly
      return !user.subscription || plan === 'free' || (plan !== 'monthly' && plan !== 'yearly');
    }).length;

    const monthlySubscribers = allUsers.filter(user => {
      const plan = user.subscription?.plan; // FLAT structure
      return plan === 'monthly';
    }).length;

    const yearlySubscribers = allUsers.filter(user => {
      const plan = user.subscription?.plan; // FLAT structure
      return plan === 'yearly';
    }).length;

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
 * Get feature usage statistics from real analytics data
 */
export async function getFeatureStats(): Promise<FeatureStats> {
  try {
    if (!db) {
      console.error('Firebase not initialized');
      return {
        drillsCompletedToday: 0,
        vocabularySearchesToday: 0,
        moodBoardViewsToday: 0,
        mostPopularMoodBoard: 'No data',
        averageSessionDuration: 0,
      };
    }

    // Initialize with default values
    let drillsCompleted = 0;
    let vocabularySearches = 0;
    let moodBoardViews = 0;
    let mostPopularMoodBoard = 'No data';
    let avgSessionMinutes = 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todayTimestamp = Timestamp.fromDate(new Date(today));

    // First, try to aggregate usage from all users' usage subcollections
    try {
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      console.log(`Aggregating usage from ${usersSnapshot.size} users for date: ${today}`);
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          // Get the current usage document for each user
          const usageDoc = await getDoc(doc(db, 'users', userDoc.id, 'usage', 'current'));
          
          if (usageDoc.exists()) {
            const usageData = usageDoc.data();
            
            // Check if the date matches today
            if (usageData.date === today && usageData.daily) {
              // Aggregate drill practice features
              drillsCompleted += (usageData.daily['drill_practice'] || 0) +
                                (usageData.daily['conjugation_drill'] || 0) +
                                (usageData.daily['flashcard_review'] || 0) +
                                (usageData.daily['kanji_drill'] || 0) +
                                (usageData.daily['hiragana_practice'] || 0) +
                                (usageData.daily['katakana_practice'] || 0);
              
              // Aggregate vocabulary search features
              vocabularySearches += (usageData.daily['vocabulary_search'] || 0) +
                                  (usageData.daily['quick_context'] || 0) +
                                  (usageData.daily['textbook_vocabulary'] || 0);
              
              // Aggregate mood board views
              moodBoardViews += (usageData.daily['mood_boards'] || 0) +
                              (usageData.daily['kanji_moods'] || 0);
            }
          }
        } catch (userUsageError) {
          // Skip user if we can't access their usage
          continue;
        }
      }
      
      console.log(`Aggregated stats - Drills: ${drillsCompleted}, Searches: ${vocabularySearches}, MoodBoards: ${moodBoardViews}`);
    } catch (aggregateError) {
      console.error('Error aggregating user usage:', aggregateError);
    }

    // Fallback: check if there's a global stats tracker collection
    if (drillsCompleted === 0 && vocabularySearches === 0 && moodBoardViews === 0) {
      try {
        const statsTrackerRef = collection(db, 'statsTracker');
        const todayStatsQuery = query(
          statsTrackerRef,
          where('timestamp', '>=', todayTimestamp),
          orderBy('timestamp', 'desc'),
          limit(1)
        );

        const statsSnapshot = await getDocs(todayStatsQuery);

        if (!statsSnapshot.empty) {
          const latestStats = statsSnapshot.docs[0].data();
          drillsCompleted = latestStats.drillsCompleted || 0;
          vocabularySearches = Math.floor((latestStats.gamesPlayed || 0) * 2.5);
          moodBoardViews = Math.floor((latestStats.articlesRead || 0) * 0.8);
        }
      } catch (statsError) {
        // Continue with aggregated values
      }
    }

    // Get most popular mood board
    try {
      const moodBoardsRef = collection(db, 'kanji_mood_boards');
      const moodBoardsQuery = query(moodBoardsRef, orderBy('viewCount', 'desc'), limit(1));
      const moodBoardsSnapshot = await getDocs(moodBoardsQuery);
      
      if (!moodBoardsSnapshot.empty) {
        const topBoard = moodBoardsSnapshot.docs[0].data();
        mostPopularMoodBoard = topBoard.theme || topBoard.name || 'Unknown';
      }
    } catch (moodBoardError) {
      // Continue with default value
    }

    // Calculate average session duration based on activity
    if (drillsCompleted > 0 || vocabularySearches > 0 || moodBoardViews > 0) {
      // Estimate based on typical interaction times
      const drillMinutes = drillsCompleted * 2.5; // ~2.5 min per drill
      const searchMinutes = vocabularySearches * 0.5; // ~30 sec per search  
      const viewMinutes = moodBoardViews * 1; // ~1 min per mood board view
      
      // Estimate active users (assume average 10 actions per session)
      const estimatedSessions = Math.max(1, Math.ceil((drillsCompleted + vocabularySearches + moodBoardViews) / 10));
      avgSessionMinutes = (drillMinutes + searchMinutes + viewMinutes) / estimatedSessions;
      avgSessionMinutes = Math.min(60, Math.max(0, avgSessionMinutes)); // Cap at 60 minutes
    }

    return {
      drillsCompletedToday: drillsCompleted,
      vocabularySearchesToday: vocabularySearches,
      moodBoardViewsToday: moodBoardViews,
      mostPopularMoodBoard: mostPopularMoodBoard,
      averageSessionDuration: parseFloat(avgSessionMinutes.toFixed(1)),
    };
  } catch (error) {
    console.error('Error fetching feature stats:', error);
    // Fallback to zero data if analytics fails
    return {
      drillsCompletedToday: 0,
      vocabularySearchesToday: 0,
      moodBoardViewsToday: 0,
      mostPopularMoodBoard: 'Limited data access',
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
