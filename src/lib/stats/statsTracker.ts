import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Activity event types
export type ActivityType = 'drill' | 'story' | 'article' | 'kanji' | 'game' | 'vocab' | 'flashcard' | 'practice';

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  timestamp: number;
  userId?: string;
  details: {
    itemId?: string;
    itemTitle?: string;
    score?: number;
    duration?: number;
    correct?: number;
    total?: number;
    gameType?: string;
    feature?: string;
  };
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD format
  activities: ActivityEvent[];
  summary: {
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
    totalCorrect: number;
    totalQuestions: number;
  };
}

export interface UserStatsV2 {
  // User identification
  userId: string;
  
  // Core stats
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  lastActiveDate: string; // YYYY-MM-DD format
  firstActiveDate: string; // YYYY-MM-DD format
  
  // Activity totals
  totalActivities: number;
  drillsCompleted: number;
  storiesRead: number;
  articlesRead: number;
  kanjiStudySessions: number;
  gamesPlayed: number;
  vocabStudied: number;
  flashcardsReviewed: number;
  practiceSessionsCompleted: number;
  
  // Performance metrics
  overallAccuracy: number;
  drillAccuracy: number;
  kanjiAccuracy: number;
  gameAccuracy: number;
  
  // Totals
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  totalKanjiLearned: number;
  totalWordsLearned: number;
  totalGameScore: number;
  
  // Pokemon specific
  pokemonCaught: number;
  
  // Unique items tracking (new)
  learnedKanjiSet: string[];
  learnedWordsSet: string[];
  caughtPokemonSet: string[];
  
  // Activity-specific metrics (new)
  drillStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  kanjiStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  gameStats: {
    totalQuestions: number;
    totalCorrect: number;
  };
  
  // Metadata
  lastUpdated: number;
  version: string;
}

// Event listeners
type StatsUpdateListener = (stats: UserStatsV2) => void;

export class StatsTracker {
  private static instance: StatsTracker | null = null;
  private currentUser: User | null = null;
  private isPremium: boolean = false;
  private stats: UserStatsV2 | null = null;
  private activities: Map<string, DailyActivity> = new Map();
  private updateListeners: Set<StatsUpdateListener> = new Set();
  private syncTimer: NodeJS.Timeout | null = null;
  private lastSyncTime: number = 0;
  private pendingActivities: ActivityEvent[] = [];
  
  // Constants
  private static readonly STATS_STORE = 'statsV2';
  private static readonly ACTIVITIES_STORE = 'dailyActivities';
  private static readonly SYNC_INTERVAL = 30000; // 30 seconds
  private static readonly BATCH_SIZE = 50;
  private static readonly VERSION = '2.1';

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): StatsTracker {
    if (!StatsTracker.instance) {
      StatsTracker.instance = new StatsTracker();
    }
    return StatsTracker.instance;
  }

  /**
   * Initialize the stats tracker with user context
   */
  async initialize(user: User | null, isPremium: boolean): Promise<void> {
    console.log(`🎯 [StatsTracker] Initializing for user: ${user?.uid || 'guest'}, premium: ${isPremium}`);
    
    this.currentUser = user;
    this.isPremium = isPremium;
    
    // Load stats from storage
    await this.loadStats();
    
    // Update userId if user logged in and stats exist
    if (user && this.stats && this.stats.userId !== user.uid) {
      console.log(`🔄 [StatsTracker] Updating userId from '${this.stats.userId}' to '${user.uid}'`);
      this.stats.userId = user.uid;
      await this.saveToIndexedDB();
    }
    
    // Start sync timer for premium users
    if (user && isPremium) {
      this.startSyncTimer();
    } else {
      this.stopSyncTimer();
    }
    
    // Process any pending activities
    await this.processPendingActivities();
    
    // Sync Pokemon count if needed
    await this.syncPokemonCount();
  }

  /**
   * Track an activity
   */
  async trackActivity(type: ActivityType, details: Partial<ActivityEvent['details']> = {}): Promise<void> {
    const event: ActivityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      userId: this.currentUser?.uid,
      details
    };

    console.log(`📊 [StatsTracker] Tracking activity:`, event);

    // Add to pending activities
    this.pendingActivities.push(event);

    // Process immediately
    await this.processPendingActivities();
  }

  /**
   * Get current stats
   */
  getStats(): UserStatsV2 {
    if (!this.stats) {
      this.stats = this.createInitialStats();
    }
    return { ...this.stats };
  }

  /**
   * Subscribe to stats updates
   */
  subscribe(listener: StatsUpdateListener): () => void {
    this.updateListeners.add(listener);
    // Send current stats immediately
    if (this.stats) {
      listener(this.getStats());
    }
    
    // Return unsubscribe function
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  /**
   * Force sync to cloud (for premium users)
   */
  async forceSync(): Promise<void> {
    if (!this.currentUser || !this.isPremium) {
      console.log('🔄 [StatsTracker] Sync skipped - not premium user');
      return;
    }

    await this.syncToCloud();
  }

  /**
   * Load stats from storage
   */
  private async loadStats(): Promise<void> {
    try {
      // First try to load from IndexedDB
      const localStats = await this.loadFromIndexedDB();
      
      if (localStats) {
        this.stats = localStats;
        console.log('📊 [StatsTracker] Loaded stats from IndexedDB:', this.stats);
      }

      // If premium user, also check cloud for newer data
      if (this.currentUser && this.isPremium) {
        const cloudStats = await this.loadFromCloud();
        
        if (cloudStats && (!localStats || cloudStats.lastUpdated > localStats.lastUpdated)) {
          this.stats = cloudStats;
          console.log('☁️ [StatsTracker] Using newer stats from cloud:', this.stats);
          // Save cloud stats locally
          await this.saveToIndexedDB();
        }
      }

      // If still no stats, create initial
      if (!this.stats) {
        this.stats = this.createInitialStats();
        await this.saveToIndexedDB();
      }

      // Load activities for the last 90 days
      await this.loadRecentActivities();

      // Validate and fix streak
      await this.validateAndFixStreak();

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading stats:', error);
      this.stats = this.createInitialStats();
    }
  }

  /**
   * Load stats from IndexedDB
   */
  private async loadFromIndexedDB(): Promise<UserStatsV2 | null> {
    try {
      const stored = await EnhancedStorageManager2.getFromStore(
        StatsTracker.STATS_STORE,
        'userStats'
      );
      
      if (stored && stored.version === StatsTracker.VERSION) {
        // Remove the 'id' field added by IndexedDB storage
        const { id, ...cleanStats } = stored;
        return cleanStats as UserStatsV2;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Save stats to IndexedDB
   */
  private async saveToIndexedDB(): Promise<void> {
    if (!this.stats) return;

    try {
      await EnhancedStorageManager2.saveToStore(
        StatsTracker.STATS_STORE,
        'userStats',
        this.stats
      );
      console.log('💾 [StatsTracker] Saved stats to IndexedDB');
    } catch (error) {
      console.error('❌ [StatsTracker] Error saving to IndexedDB:', error);
    }
  }

  /**
   * Load stats from cloud
   */
  private async loadFromCloud(): Promise<UserStatsV2 | null> {
    if (!this.currentUser) return null;

    try {
      const statsRef = doc(db, 'userStats', this.currentUser.uid);
      const snapshot = await getDoc(statsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Convert Firestore timestamp to number
        if (data.lastUpdated?.toMillis) {
          data.lastUpdated = data.lastUpdated.toMillis();
        }
        // Remove any 'id' field that might have been accidentally saved
        const { id, ...cleanData } = data;
        return cleanData as UserStatsV2;
      }
      
      return null;
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading from cloud:', error);
      return null;
    }
  }

  /**
   * Save stats to cloud
   */
  private async saveToCloud(): Promise<void> {
    if (!this.currentUser || !this.stats) return;

    // Additional check for premium status
    if (!this.isPremium) {
      console.log('📊 [StatsTracker] Skipping cloud save - not premium user');
      return;
    }

    // Ensure the userId in stats matches the current user
    if (this.stats.userId !== this.currentUser.uid) {
      console.log('🔄 [StatsTracker] Updating userId in stats to match current user');
      this.stats.userId = this.currentUser.uid;
      await this.saveToIndexedDB();
    }

    try {
      const statsRef = doc(db, 'userStats', this.currentUser.uid);
      
      // Create a clean copy without the 'id' field from IndexedDB
      const { id, ...cleanStats } = this.stats as any;
      
      await setDoc(statsRef, {
        ...cleanStats,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log('☁️ [StatsTracker] Saved stats to cloud');
    } catch (error) {
      console.error('❌ [StatsTracker] Error saving to cloud:', error);
      // Don't throw - just log the error
      // Stats will still work locally
    }
  }

  /**
   * Process pending activities
   */
  private async processPendingActivities(): Promise<void> {
    if (this.pendingActivities.length === 0) return;

    const activities = [...this.pendingActivities];
    this.pendingActivities = [];

    for (const activity of activities) {
      await this.processActivity(activity);
    }

    // Save stats
    await this.saveToIndexedDB();
    
    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Process a single activity
   */
  private async processActivity(event: ActivityEvent): Promise<void> {
    if (!this.stats) {
      this.stats = this.createInitialStats();
    }

    const date = this.getDateString(event.timestamp);
    
    // Get or create daily activity
    let daily = this.activities.get(date);
    if (!daily) {
      daily = this.createDailyActivity(date);
      this.activities.set(date, daily);
    }

    // Add activity to daily record
    daily.activities.push(event);
    
    // Update daily summary
    this.updateDailySummary(daily, event);
    
    // Update overall stats
    this.updateOverallStats(event);
    
    // Update streak
    this.updateStreak(date);
    
    // Save daily activity
    await this.saveDailyActivity(date, daily);
  }

  /**
   * Update daily summary with new activity
   */
  private updateDailySummary(daily: DailyActivity, event: ActivityEvent): void {
    daily.summary.totalActivities++;

    switch (event.type) {
      case 'drill':
        daily.summary.drillsCompleted++;
        break;
      case 'story':
        daily.summary.storiesRead++;
        break;
      case 'article':
        daily.summary.articlesRead++;
        break;
      case 'kanji':
        daily.summary.kanjiStudied++;
        break;
      case 'game':
        daily.summary.gamesPlayed++;
        break;
      case 'vocab':
        daily.summary.vocabStudied++;
        break;
      case 'flashcard':
        daily.summary.flashcardsReviewed++;
        break;
      case 'practice':
        daily.summary.practiceSessionsCompleted++;
        break;
    }

    if (event.details.correct !== undefined && event.details.total !== undefined) {
      daily.summary.totalCorrect += event.details.correct;
      daily.summary.totalQuestions += event.details.total;
    }

    if (event.details.score !== undefined) {
      daily.summary.totalScore += event.details.score;
    }
  }

  /**
   * Update overall stats with new activity
   */
  private updateOverallStats(event: ActivityEvent): void {
    if (!this.stats) return;

    this.stats.totalActivities++;
    this.stats.lastUpdated = Date.now();

    // Validate data before processing
    if (!this.validateActivityData(event)) {
      console.warn('[StatsTracker] Invalid activity data, skipping update', event);
      return;
    }

    switch (event.type) {
      case 'drill':
        this.stats.drillsCompleted++;
        break;
      case 'story':
        this.stats.storiesRead++;
        break;
      case 'article':
        this.stats.articlesRead++;
        break;
      case 'kanji':
        this.stats.kanjiStudySessions++;
        // Track unique kanji learned
        if (event.details.itemId && !this.stats.learnedKanjiSet.includes(event.details.itemId)) {
          this.stats.learnedKanjiSet.push(event.details.itemId);
          this.stats.totalKanjiLearned = this.stats.learnedKanjiSet.length;
        }
        break;
      case 'game':
        this.stats.gamesPlayed++;
        // Track unique Pokemon caught
        if (event.details.gameType === 'pokemon' && event.details.itemId) {
          if (!this.stats.caughtPokemonSet.includes(event.details.itemId)) {
            this.stats.caughtPokemonSet.push(event.details.itemId);
            this.stats.pokemonCaught = this.stats.caughtPokemonSet.length;
          }
        }
        break;
      case 'vocab':
        this.stats.vocabStudied++;
        // Track unique words learned
        if (event.details.itemId && !this.stats.learnedWordsSet.includes(event.details.itemId)) {
          this.stats.learnedWordsSet.push(event.details.itemId);
          this.stats.totalWordsLearned = this.stats.learnedWordsSet.length;
        }
        break;
      case 'flashcard':
        this.stats.flashcardsReviewed++;
        break;
      case 'practice':
        this.stats.practiceSessionsCompleted++;
        break;
    }

    // Update accuracy metrics with activity-specific tracking
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      this.stats.totalCorrectAnswers += event.details.correct;
      this.stats.totalQuestionsAnswered += event.details.total;
      
      // Recalculate overall accuracy
      if (this.stats.totalQuestionsAnswered > 0) {
        this.stats.overallAccuracy = Math.round(
          (this.stats.totalCorrectAnswers / this.stats.totalQuestionsAnswered) * 100
        );
      }

      // Update activity-specific accuracies
      switch (event.type) {
        case 'drill':
          this.stats.drillStats.totalCorrect += event.details.correct;
          this.stats.drillStats.totalQuestions += event.details.total;
          if (this.stats.drillStats.totalQuestions > 0) {
            this.stats.drillAccuracy = Math.round(
              (this.stats.drillStats.totalCorrect / this.stats.drillStats.totalQuestions) * 100
            );
          }
          break;
        case 'kanji':
          this.stats.kanjiStats.totalCorrect += event.details.correct;
          this.stats.kanjiStats.totalQuestions += event.details.total;
          if (this.stats.kanjiStats.totalQuestions > 0) {
            this.stats.kanjiAccuracy = Math.round(
              (this.stats.kanjiStats.totalCorrect / this.stats.kanjiStats.totalQuestions) * 100
            );
          }
          break;
        case 'game':
          this.stats.gameStats.totalCorrect += event.details.correct;
          this.stats.gameStats.totalQuestions += event.details.total;
          if (this.stats.gameStats.totalQuestions > 0) {
            this.stats.gameAccuracy = Math.round(
              (this.stats.gameStats.totalCorrect / this.stats.gameStats.totalQuestions) * 100
            );
          }
          break;
      }
    }

    // Update game score
    if (event.details.score !== undefined) {
      this.stats.totalGameScore += event.details.score;
    }
  }

  /**
   * Validate activity data before processing
   */
  private validateActivityData(event: ActivityEvent): boolean {
    // Check for invalid correct/total combinations
    if (event.details.correct !== undefined && event.details.total !== undefined) {
      if (event.details.correct < 0 || event.details.total < 0) {
        return false;
      }
      if (event.details.correct > event.details.total) {
        return false;
      }
    }

    // Check for invalid scores
    if (event.details.score !== undefined && event.details.score < 0) {
      return false;
    }

    // Check for invalid duration
    if (event.details.duration !== undefined && event.details.duration < 0) {
      return false;
    }

    return true;
  }

  /**
   * Update streak based on activity date
   */
  private updateStreak(activityDate: string): void {
    if (!this.stats) return;

    const today = this.getDateString(Date.now());
    const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);

    // Update last active date
    if (activityDate > this.stats.lastActiveDate || !this.stats.lastActiveDate) {
      this.stats.lastActiveDate = activityDate;
    }

    // Update first active date
    if (!this.stats.firstActiveDate || activityDate < this.stats.firstActiveDate) {
      this.stats.firstActiveDate = activityDate;
    }

    // Check if we need to update streak
    if (activityDate === today) {
      // Activity today - check if streak needs to continue
      if (this.stats.lastActiveDate === yesterday) {
        // Consecutive day - streak continues
        console.log(`🔥 [StatsTracker] Streak continues! Current: ${this.stats.currentStreak}`);
      } else if (this.stats.lastActiveDate === today) {
        // Already active today - no change
      } else {
        // Gap in activity - reset streak
        console.log(`💔 [StatsTracker] Streak broken. Was: ${this.stats.currentStreak}, Last active: ${this.stats.lastActiveDate}`);
        this.stats.currentStreak = 1;
      }
    }

    // Update longest streak
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
    }
  }

  /**
   * Validate and fix streak based on actual activity data
   */
  private async validateAndFixStreak(): Promise<void> {
    if (!this.stats) return;

    console.log('🔍 [StatsTracker] Validating streak...');

    // Get all activity dates
    const activityDates = new Set<string>();
    
    // Add dates from current activities
    this.activities.forEach((_, date) => activityDates.add(date));
    
    // Load more historical data if needed
    const oldestDate = this.getDateString(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const historicalActivities = await this.loadActivitiesRange(oldestDate, this.getDateString(Date.now()));
    
    historicalActivities.forEach(activity => {
      if (activity.summary.totalActivities > 0) {
        activityDates.add(activity.date);
      }
    });

    // Sort dates
    const sortedDates = Array.from(activityDates).sort();
    
    if (sortedDates.length === 0) {
      console.log('📊 [StatsTracker] No activity data found');
      this.stats.currentStreak = 0;
      return;
    }

    // Calculate actual streak
    let actualStreak = 0;
    const today = this.getDateString(Date.now());
    let checkDate = today;

    while (activityDates.has(checkDate)) {
      actualStreak++;
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      checkDate = this.getDateString(prevDate.getTime());
    }

    // Update stats if different
    if (actualStreak !== this.stats.currentStreak) {
      console.log(`✅ [StatsTracker] Fixed streak: ${this.stats.currentStreak} -> ${actualStreak}`);
      this.stats.currentStreak = actualStreak;
      
      if (actualStreak > this.stats.longestStreak) {
        this.stats.longestStreak = actualStreak;
      }
    }

    // Update total days active
    this.stats.totalDaysActive = activityDates.size;
    
    console.log(`📊 [StatsTracker] Validation complete. Streak: ${this.stats.currentStreak}, Total days: ${this.stats.totalDaysActive}`);
  }

  /**
   * Save daily activity to storage
   */
  private async saveDailyActivity(date: string, activity: DailyActivity): Promise<void> {
    try {
      // Don't include the date as a separate field since it's already the key
      const activityToSave = {
        ...activity,
        date // Ensure date is included in the object
      };
      
      await EnhancedStorageManager2.saveToStore(
        StatsTracker.ACTIVITIES_STORE,
        date,
        activityToSave
      );
    } catch (error) {
      console.error(`❌ [StatsTracker] Error saving daily activity for ${date}:`, error);
    }
  }

  /**
   * Load activities for a date range
   */
  private async loadActivitiesRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = [];
    
    try {
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dateStr = this.getDateString(current.getTime());
        const activity = await EnhancedStorageManager2.getFromStore(
          StatsTracker.ACTIVITIES_STORE,
          dateStr
        );
        
        if (activity) {
          // Sanitize loaded activity to ensure all fields are defined
          const sanitized = this.sanitizeDailyActivity(activity as DailyActivity);
          activities.push(sanitized);
          this.activities.set(dateStr, sanitized);
        }
        
        current.setDate(current.getDate() + 1);
      }
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading activities:', error);
    }
    
    return activities;
  }

  /**
   * Load recent activities (last 30 days)
   */
  private async loadRecentActivities(): Promise<void> {
    const thirtyDaysAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const today = this.getDateString(Date.now());
    
    await this.loadActivitiesRange(thirtyDaysAgo, today);
  }

  /**
   * Sync stats to cloud
   */
  private async syncToCloud(): Promise<void> {
    if (!this.currentUser || !this.isPremium) return;

    const now = Date.now();
    
    // Debounce syncs (min 5 seconds between syncs)
    if (now - this.lastSyncTime < 5000) {
      console.log('🔄 [StatsTracker] Sync debounced');
      return;
    }

    this.lastSyncTime = now;

    try {
      // Save stats
      await this.saveToCloud();
      
      // Save recent activities
      const recentActivities = Array.from(this.activities.entries())
        .filter(([date]) => {
          const activityTime = new Date(date).getTime();
          return now - activityTime < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        });

      for (const [date, activity] of recentActivities) {
        const activityRef = doc(db, 'userStats', this.currentUser.uid, 'dailyActivities', date);
        // Ensure all fields are defined before saving to Firebase
        const sanitizedActivity = this.sanitizeDailyActivity(activity);
        
        try {
          // Final sanitization: use JSON stringify/parse to remove any undefined values
          const finalSanitized = JSON.parse(JSON.stringify(sanitizedActivity));
          
          // Debug: Check for any remaining issues
          const debugStr = JSON.stringify(finalSanitized);
          if (debugStr.includes('undefined') || debugStr.includes('null,"')) {
            console.warn(`⚠️ [StatsTracker] Potential issue with activity for ${date}`);
            console.warn('Sanitized data:', finalSanitized);
          }
          
          await setDoc(activityRef, finalSanitized);
        } catch (error) {
          console.error(`❌ [StatsTracker] Error saving activity for ${date}:`, error);
          console.error('Activity data:', sanitizedActivity);
          // Log the stringified version to see what might be wrong
          console.error('Stringified:', JSON.stringify(sanitizedActivity, null, 2));
          
          // Try to identify the problematic field
          if (error.message && error.message.includes('undefined')) {
            console.error('Checking for undefined values...');
            const checkForUndefined = (obj, path = '') => {
              for (const key in obj) {
                const value = obj[key];
                const currentPath = path ? `${path}.${key}` : key;
                
                if (value === undefined) {
                  console.error(`Found undefined at: ${currentPath}`);
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                  checkForUndefined(value, currentPath);
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    if (item === undefined) {
                      console.error(`Found undefined at: ${currentPath}[${index}]`);
                    } else if (item && typeof item === 'object') {
                      checkForUndefined(item, `${currentPath}[${index}]`);
                    }
                  });
                }
              }
            };
            
            checkForUndefined(sanitizedActivity);
          }
        }
      }
      
      console.log(`☁️ [StatsTracker] Synced ${recentActivities.length} daily activities`);
    } catch (error) {
      console.error('❌ [StatsTracker] Sync error:', error);
    }
  }

  /**
   * Start periodic sync timer
   */
  private startSyncTimer(): void {
    this.stopSyncTimer();
    
    this.syncTimer = setInterval(() => {
      this.syncToCloud();
    }, StatsTracker.SYNC_INTERVAL);
    
    console.log('⏱️ [StatsTracker] Sync timer started');
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      console.log('⏹️ [StatsTracker] Sync timer stopped');
    }
  }

  /**
   * Notify all listeners of stats update
   */
  private notifyListeners(): void {
    if (!this.stats) return;
    
    const stats = this.getStats();
    this.updateListeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('❌ [StatsTracker] Listener error:', error);
      }
    });
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

  /**
   * Create initial stats object
   */
  private createInitialStats(): UserStatsV2 {
    const today = this.getDateString(Date.now());
    
    return {
      userId: this.currentUser?.uid || '',
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: today,
      firstActiveDate: today,
      totalActivities: 0,
      drillsCompleted: 0,
      storiesRead: 0,
      articlesRead: 0,
      kanjiStudySessions: 0,
      gamesPlayed: 0,
      vocabStudied: 0,
      flashcardsReviewed: 0,
      practiceSessionsCompleted: 0,
      overallAccuracy: 0,
      drillAccuracy: 0,
      kanjiAccuracy: 0,
      gameAccuracy: 0,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalKanjiLearned: 0,
      totalWordsLearned: 0,
      totalGameScore: 0,
      pokemonCaught: 0,
      // New fields
      learnedKanjiSet: [],
      learnedWordsSet: [],
      caughtPokemonSet: [],
      drillStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      kanjiStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      gameStats: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      lastUpdated: Date.now(),
      version: StatsTracker.VERSION
    };
  }

  /**
   * Create empty daily activity
   */
  private createDailyActivity(date: string): DailyActivity {
    return {
      date,
      activities: [],
      summary: {
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
        totalCorrect: 0,
        totalQuestions: 0
      }
    };
  }

  /**
   * Ensure all fields are defined in a daily activity object
   * This fixes issues with older activities missing new fields
   */
  private sanitizeDailyActivity(activity: any): DailyActivity {
    // Remove any 'id' field that might have been added by storage
    const { id, ...activityWithoutId } = activity;
    // Sanitize individual activity events to ensure no undefined values
    const sanitizedActivities = (activityWithoutId.activities || []).map(event => {
      // Build details object with only defined values
      const cleanDetails: any = {};
      
      if (event.details?.itemId !== undefined && event.details.itemId !== null) {
        cleanDetails.itemId = event.details.itemId;
      }
      if (event.details?.itemTitle !== undefined && event.details.itemTitle !== null) {
        cleanDetails.itemTitle = event.details.itemTitle;
      }
      if (event.details?.score !== undefined && event.details.score !== null) {
        cleanDetails.score = event.details.score;
      }
      if (event.details?.duration !== undefined && event.details.duration !== null) {
        cleanDetails.duration = event.details.duration;
      }
      if (event.details?.correct !== undefined && event.details.correct !== null) {
        cleanDetails.correct = event.details.correct;
      }
      if (event.details?.total !== undefined && event.details.total !== null) {
        cleanDetails.total = event.details.total;
      }
      if (event.details?.gameType !== undefined && event.details.gameType !== null) {
        cleanDetails.gameType = event.details.gameType;
      }
      if (event.details?.feature !== undefined && event.details.feature !== null) {
        cleanDetails.feature = event.details.feature;
      }
      
      const sanitizedEvent: ActivityEvent = {
        id: event.id || '',
        type: event.type || 'practice' as ActivityType,
        timestamp: event.timestamp || Date.now(),
        details: cleanDetails
      };
      
      // Only include userId if it exists
      if (event.userId) {
        sanitizedEvent.userId = event.userId;
      }
      
      return sanitizedEvent;
    });

    return {
      date: activityWithoutId.date || '',
      activities: sanitizedActivities,
      summary: {
        totalActivities: activityWithoutId.summary?.totalActivities || 0,
        drillsCompleted: activityWithoutId.summary?.drillsCompleted || 0,
        storiesRead: activityWithoutId.summary?.storiesRead || 0,
        articlesRead: activityWithoutId.summary?.articlesRead || 0,
        kanjiStudied: activityWithoutId.summary?.kanjiStudied || 0,
        gamesPlayed: activityWithoutId.summary?.gamesPlayed || 0,
        vocabStudied: activityWithoutId.summary?.vocabStudied || 0,
        flashcardsReviewed: activityWithoutId.summary?.flashcardsReviewed || 0,
        practiceSessionsCompleted: activityWithoutId.summary?.practiceSessionsCompleted || 0,
        totalScore: activityWithoutId.summary?.totalScore || 0,
        totalCorrect: activityWithoutId.summary?.totalCorrect || 0,
        totalQuestions: activityWithoutId.summary?.totalQuestions || 0
      }
    };
  }

  /**
   * Sync Pokemon count from existing data
   */
  private async syncPokemonCount(): Promise<void> {
    if (!this.currentUser || !this.stats) return;

    try {
      // Check if we need to sync Pokemon count
      if (this.stats.pokemonCaught === 0) {
        // Try to get Pokemon count from Firebase
        const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
        if (userDoc.exists()) {
          const pokedex = userDoc.data().pokedex;
          if (pokedex && pokedex.caught && Array.isArray(pokedex.caught)) {
            const actualCount = pokedex.caught.length;
            if (actualCount > 0) {
              console.log(`🔄 [StatsTracker] Syncing Pokemon count: ${actualCount}`);
              this.stats.pokemonCaught = actualCount;
              await this.saveToIndexedDB();
              this.notifyListeners();
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [StatsTracker] Error syncing Pokemon count:', error);
    }
  }

  /**
   * Get recent activities (for debugging)
   */
  async getRecentActivities(limit: number = 100): Promise<ActivityEvent[]> {
    const allActivities: ActivityEvent[] = [];
    
    // Collect activities from the last 30 days
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.date.localeCompare(a.date));
    
    for (const daily of activities) {
      allActivities.push(...daily.activities);
      if (allActivities.length >= limit) break;
    }
    
    // Sort by timestamp descending and limit
    return allActivities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Reset all stats (for debugging)
   */
  async resetStats(): Promise<void> {
    console.warn('⚠️ [StatsTracker] Resetting all stats...');
    
    this.stats = this.createInitialStats();
    this.activities.clear();
    this.pendingActivities = [];
    
    await this.saveToIndexedDB();
    
    if (this.currentUser && this.isPremium) {
      await this.saveToCloud();
    }
    
    this.notifyListeners();
  }

}

// Export singleton instance
export const statsTracker = StatsTracker.getInstance();