import { collection, doc, setDoc, getDoc, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly';

export interface TimeBasedStats {
  totalActivities: number;
  drillsCompleted: number;
  storiesRead: number;
  articlesRead: number;
  kanjiStudied: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  practiceSessionsCompleted: number;
  totalScore: number;
  lastUpdated: Timestamp | null;
}

/**
 * Get the date key for a given timestamp and granularity
 */
export function getDateKey(timestamp: number, granularity: TimeGranularity): string {
  const date = new Date(timestamp);
  
  switch (granularity) {
    case 'daily':
      // YYYY-MM-DD format
      return date.toISOString().split('T')[0];
      
    case 'weekly':
      // Get Monday of the week in YYYY-MM-DD format
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      monday.setDate(diff);
      return monday.toISOString().split('T')[0];
      
    case 'monthly':
      // YYYY-MM format
      return date.toISOString().substring(0, 7);
  }
}

/**
 * Get the start date for a time period
 */
export function getStartDate(period: 'today' | 'this-week' | 'this-month'): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'today':
      return now;
      
    case 'this-week':
      // Get Monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      now.setDate(diff);
      return now;
      
    case 'this-month':
      now.setDate(1);
      return now;
  }
}

/**
 * Update time-based stats for a user activity
 */
export async function updateTimeBasedStats(
  userId: string,
  activityType: string,
  score: number = 0
): Promise<void> {
  const now = Date.now();
  
  // Update daily stats
  const dailyKey = getDateKey(now, 'daily');
  const dailyRef = doc(db, 'userStats', userId, 'timeBasedStats', `daily_${dailyKey}`);
  
  // Update weekly stats
  const weeklyKey = getDateKey(now, 'weekly');
  const weeklyRef = doc(db, 'userStats', userId, 'timeBasedStats', `weekly_${weeklyKey}`);
  
  // Update monthly stats
  const monthlyKey = getDateKey(now, 'monthly');
  const monthlyRef = doc(db, 'userStats', userId, 'timeBasedStats', `monthly_${monthlyKey}`);
  
  // Prepare update data
  const updateData: any = {
    totalActivities: increment(1),
    totalScore: increment(score),
    lastUpdated: serverTimestamp()
  };
  
  // Add activity-specific increment
  switch (activityType) {
    case 'drill':
      updateData.drillsCompleted = increment(1);
      break;
    case 'story':
      updateData.storiesRead = increment(1);
      break;
    case 'article':
      updateData.articlesRead = increment(1);
      break;
    case 'kanji':
      updateData.kanjiStudied = increment(1);
      break;
    case 'game':
      updateData.gamesPlayed = increment(1);
      break;
    case 'vocab':
      updateData.vocabStudied = increment(1);
      break;
    case 'flashcard':
      updateData.flashcardsReviewed = increment(1);
      break;
    case 'practice':
      updateData.practiceSessionsCompleted = increment(1);
      break;
  }
  
  // Update all time periods in parallel
  await Promise.all([
    setDoc(dailyRef, updateData, { merge: true }),
    setDoc(weeklyRef, updateData, { merge: true }),
    setDoc(monthlyRef, updateData, { merge: true })
  ]);
}

/**
 * Get time-based stats for a specific period
 */
export async function getTimeBasedStats(
  userId: string,
  period: 'today' | 'this-week' | 'this-month'
): Promise<TimeBasedStats | null> {
  // Validate userId
  if (!userId || userId.trim() === '') {
    console.warn('[getTimeBasedStats] Invalid userId provided');
    return null;
  }

  let granularity: TimeGranularity;
  let dateKey: string;
  
  switch (period) {
    case 'today':
      granularity = 'daily';
      dateKey = getDateKey(Date.now(), 'daily');
      break;
    case 'this-week':
      granularity = 'weekly';
      dateKey = getDateKey(Date.now(), 'weekly');
      break;
    case 'this-month':
      granularity = 'monthly';
      dateKey = getDateKey(Date.now(), 'monthly');
      break;
  }
  
  try {
    const statsRef = doc(db, 'userStats', userId, 'timeBasedStats', `${granularity}_${dateKey}`);
    const statsDoc = await getDoc(statsRef);
    
    if (!statsDoc.exists()) {
      return null;
    }
    
    return statsDoc.data() as TimeBasedStats;
  } catch (error) {
    console.error('[getTimeBasedStats] Error fetching stats:', error);
    return null;
  }
}

/**
 * Initialize default time-based stats structure
 */
export function createDefaultTimeBasedStats(): TimeBasedStats {
  return {
    totalActivities: 0,
    drillsCompleted: 0,
    storiesRead: 0,
    articlesRead: 0,
    kanjiStudied: 0,
    gamesPlayed: 0,
    vocabStudied: 0,
    flashcardsReviewed: 0,
    practiceSessionsCompleted: 0,
    totalScore: 0,
    lastUpdated: null
  };
}