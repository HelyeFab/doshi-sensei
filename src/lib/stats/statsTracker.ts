import { EnhancedStorageManager2 } from '@/utils/enhancedStorageManager2';
import { User } from 'firebase/auth';
import { collection, doc, setDoc, getDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
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
  lastUpdated?: number; // Timestamp for when this was last updated
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
    
    // If switching to a different user, clear existing data
    if (this.currentUser?.uid !== user?.uid) {
      console.log(`🔄 [StatsTracker] User changed, clearing existing data`);
      this.stats = null;
      this.activities.clear();
      this.pendingActivities = [];
    }
    
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
    
    // Debug logging after processing
    if (this.stats) {
      console.log(`📊 [STATS DEBUG] After tracking ${type} activity:`, {
        type,
        timestamp: new Date().toISOString(),
        currentStreak: this.stats.currentStreak,
        longestStreak: this.stats.longestStreak,
        lastActiveDate: this.stats.lastActiveDate,
        totalDaysActive: this.stats.totalDaysActive,
        totalActivities: this.stats.totalActivities
      });
    }
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
        // Don't reload from cloud if we have very recent local updates (within last 10 seconds)
        const now = Date.now();
        const recentlyUpdated = this.stats && (now - this.stats.lastUpdated < 10000);
        
        if (recentlyUpdated) {
          console.log('⏭️ [StatsTracker] Skipping cloud load - have recent local updates');
        } else {
          const cloudStats = await this.loadFromCloud();
          
          // Only use cloud stats if they're actually newer than what we have in memory
          if (cloudStats && (!localStats || (cloudStats.lastUpdated > localStats.lastUpdated && cloudStats.lastUpdated > (this.stats?.lastUpdated || 0)))) {
            this.stats = cloudStats;
            console.log('☁️ [StatsTracker] Using newer stats from cloud:', this.stats);
            // Save cloud stats locally
            await this.saveToIndexedDB();
          } else if (cloudStats) {
            console.log('📊 [StatsTracker] Keeping current stats (newer than cloud)');
          }
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
    // Guest users should not load from IndexedDB
    if (!this.currentUser) {
      console.log('👤 [StatsTracker] Guest user - skipping IndexedDB load');
      return null;
    }
    
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
    
    // Guest users (no currentUser) should not persist to IndexedDB
    if (!this.currentUser) {
      console.log('👤 [StatsTracker] Guest user - skipping IndexedDB save');
      return;
    }

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
      const userStatsRef = collection(db, 'userStats', this.currentUser.uid, 'current');
      
      // Load all documents in parallel
      const [summaryDoc, activitiesDoc, performanceDoc, metadataDoc] = await Promise.all([
        getDoc(doc(userStatsRef, 'summary')),
        getDoc(doc(userStatsRef, 'activities')),
        getDoc(doc(userStatsRef, 'performance')),
        getDoc(doc(userStatsRef, 'metadata'))
      ]);
      
      // If no documents exist, try loading from old structure
      if (!summaryDoc.exists() && !activitiesDoc.exists()) {
        // Try old structure for backward compatibility
        const oldStatsRef = doc(db, 'userStats', this.currentUser.uid);
        const oldSnapshot = await getDoc(oldStatsRef);
        
        if (oldSnapshot.exists()) {
          const data = oldSnapshot.data();
          // Convert Firestore timestamp to number
          if (data.lastUpdated?.toMillis) {
            data.lastUpdated = data.lastUpdated.toMillis();
          }
          // Remove any 'id' field that might have been accidentally saved
          const { id, ...cleanData } = data;
          
          // Migrate to new structure on next save
          console.log('📊 [StatsTracker] Found old stats structure, will migrate on next save');
          return cleanData as UserStatsV2;
        }
        
        return null;
      }
      
      // Reconstruct stats from new structure
      const stats: Partial<UserStatsV2> = {
        userId: this.currentUser.uid,
        version: '2.1'
      };
      
      // Merge summary data
      if (summaryDoc.exists()) {
        const summaryData = summaryDoc.data();
        Object.assign(stats, {
          currentStreak: summaryData.currentStreak || 0,
          longestStreak: summaryData.longestStreak || 0,
          totalDaysActive: summaryData.totalDaysActive || 0,
          lastActiveDate: summaryData.lastActiveDate || '',
          firstActiveDate: summaryData.firstActiveDate || '',
          totalActivities: summaryData.totalActivities || 0,
          pokemonCaught: summaryData.pokemonCaught || 0
        });
      }
      
      // Merge activities data
      if (activitiesDoc.exists()) {
        const activitiesData = activitiesDoc.data();
        Object.assign(stats, {
          drillsCompleted: activitiesData.drillsCompleted || 0,
          storiesRead: activitiesData.storiesRead || 0,
          articlesRead: activitiesData.articlesRead || 0,
          kanjiStudySessions: activitiesData.kanjiStudySessions || 0,
          gamesPlayed: activitiesData.gamesPlayed || 0,
          flashcardsReviewed: activitiesData.flashcardsReviewed || 0,
          practiceSessionsCompleted: activitiesData.practiceSessionsCompleted || 0,
          vocabStudied: activitiesData.vocabStudied || 0
        });
      }
      
      // Merge performance data
      if (performanceDoc.exists()) {
        const performanceData = performanceDoc.data();
        Object.assign(stats, {
          overallAccuracy: performanceData.overallAccuracy || 0,
          drillAccuracy: performanceData.drillAccuracy || 0,
          kanjiAccuracy: performanceData.kanjiAccuracy || 0,
          gameAccuracy: performanceData.gameAccuracy || 0,
          totalQuestionsAnswered: performanceData.totalQuestionsAnswered || 0,
          totalCorrectAnswers: performanceData.totalCorrectAnswers || 0,
          totalKanjiLearned: performanceData.totalKanjiLearned || 0,
          totalWordsLearned: performanceData.totalWordsLearned || 0,
          totalGameScore: performanceData.totalGameScore || 0,
          drillStats: performanceData.drillStats || { totalQuestions: 0, totalCorrect: 0 },
          kanjiStats: performanceData.kanjiStats || { totalQuestions: 0, totalCorrect: 0 },
          gameStats: performanceData.gameStats || { totalQuestions: 0, totalCorrect: 0 }
        });
      }
      
      // Set default values for missing fields
      const completeStats: UserStatsV2 = {
        ...this.createInitialStats(),
        ...stats,
        lastUpdated: Date.now(),
        learnedKanjiSet: [],
        learnedWordsSet: [],
        caughtPokemonSet: []
      };
      
      // Recalculate totalActivities from individual counts
      // This fixes the issue where totalActivities in Firebase is 0 but actual activities exist
      completeStats.totalActivities = 
        completeStats.drillsCompleted +
        completeStats.storiesRead +
        completeStats.articlesRead +
        completeStats.kanjiStudySessions +
        completeStats.gamesPlayed +
        completeStats.vocabStudied +
        completeStats.flashcardsReviewed +
        completeStats.practiceSessionsCompleted;
      
      console.log('📊 [StatsTracker] Recalculated totalActivities from components:', {
        totalActivities: completeStats.totalActivities,
        breakdown: {
          drills: completeStats.drillsCompleted,
          stories: completeStats.storiesRead,
          articles: completeStats.articlesRead,
          kanji: completeStats.kanjiStudySessions,
          games: completeStats.gamesPlayed,
          vocab: completeStats.vocabStudied,
          flashcards: completeStats.flashcardsReviewed,
          practice: completeStats.practiceSessionsCompleted
        }
      });
      
      return completeStats;
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading from cloud:', error);
      return null;
    }
  }

  /**
   * Save stats to cloud
   */
  private async saveToCloud(): Promise<void> {
    console.log('💾 [StatsTracker] saveToCloud called:', {
      hasUser: !!this.currentUser,
      hasStats: !!this.stats,
      isPremium: this.isPremium
    });
    
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
      const userStatsRef = collection(db, 'userStats', this.currentUser.uid, 'current');
      
      // Save to organized documents
      const batch = [];
      
      // 1. Summary stats document
      batch.push(setDoc(doc(userStatsRef, 'summary'), {
        currentStreak: this.stats.currentStreak,
        longestStreak: this.stats.longestStreak,
        totalDaysActive: this.stats.totalDaysActive,
        lastActiveDate: this.stats.lastActiveDate,
        firstActiveDate: this.stats.firstActiveDate,
        totalActivities: this.stats.totalActivities,
        pokemonCaught: this.stats.pokemonCaught,
        lastUpdated: serverTimestamp()
      }));
      
      // 2. Activity totals document
      batch.push(setDoc(doc(userStatsRef, 'activities'), {
        drillsCompleted: this.stats.drillsCompleted,
        storiesRead: this.stats.storiesRead,
        articlesRead: this.stats.articlesRead,
        kanjiStudySessions: this.stats.kanjiStudySessions,
        gamesPlayed: this.stats.gamesPlayed,
        flashcardsReviewed: this.stats.flashcardsReviewed,
        practiceSessionsCompleted: this.stats.practiceSessionsCompleted,
        vocabStudied: this.stats.vocabStudied,
        lastUpdated: serverTimestamp()
      }));
      
      // 3. Performance metrics document
      batch.push(setDoc(doc(userStatsRef, 'performance'), {
        overallAccuracy: this.stats.overallAccuracy,
        drillAccuracy: this.stats.drillAccuracy,
        kanjiAccuracy: this.stats.kanjiAccuracy,
        gameAccuracy: this.stats.gameAccuracy,
        totalQuestionsAnswered: this.stats.totalQuestionsAnswered,
        totalCorrectAnswers: this.stats.totalCorrectAnswers,
        totalKanjiLearned: this.stats.totalKanjiLearned,
        totalWordsLearned: this.stats.totalWordsLearned,
        totalGameScore: this.stats.totalGameScore,
        drillStats: this.stats.drillStats,
        kanjiStats: this.stats.kanjiStats,
        gameStats: this.stats.gameStats,
        lastUpdated: serverTimestamp()
      }));
      
      // 4. Metadata document
      batch.push(setDoc(doc(userStatsRef, 'metadata'), {
        userId: this.stats.userId,
        email: this.currentUser.email || '',
        version: this.stats.version,
        lastUpdated: serverTimestamp()
      }));
      
      // Execute all saves
      console.log(`📤 [StatsTracker] Saving ${batch.length} documents to Firebase...`);
      console.log('📊 [StatsTracker] Current stats before save:', {
        gamesPlayed: this.stats.gamesPlayed,
        articlesRead: this.stats.articlesRead,
        drillsCompleted: this.stats.drillsCompleted
      });
      
      await Promise.all(batch);
      
      console.log('☁️ [StatsTracker] Saved stats to cloud with new structure');
      console.log('📍 [StatsTracker] Documents saved to:', `userStats/${this.currentUser.uid}/current/`);
      
      // Verify the documents were created and check the content
      const [summaryDoc, activitiesDoc] = await Promise.all([
        getDoc(doc(db, 'userStats', this.currentUser.uid, 'current', 'summary')),
        getDoc(doc(db, 'userStats', this.currentUser.uid, 'current', 'activities'))
      ]);
      
      console.log('✅ [StatsTracker] Verification - docs exist:', {
        summary: summaryDoc.exists(),
        activities: activitiesDoc.exists()
      });
      
      if (activitiesDoc.exists()) {
        console.log('📋 [StatsTracker] Activities in Firebase:', activitiesDoc.data());
      }
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
    
    console.log(`📋 [StatsTracker] Processing ${activities.length} pending activities`);

    for (const activity of activities) {
      await this.processActivity(activity);
    }

    // Update last updated timestamp to ensure we don't overwrite with older cloud data
    if (this.stats) {
      this.stats.lastUpdated = Date.now();
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

    console.log(`📊 [StatsTracker] Updating stats for activity type: ${event.type}`);
    
    switch (event.type) {
      case 'drill':
        this.stats.drillsCompleted++;
        console.log(`✅ Drills completed: ${this.stats.drillsCompleted}`);
        break;
      case 'story':
        this.stats.storiesRead++;
        console.log(`✅ Stories read: ${this.stats.storiesRead}`);
        break;
      case 'article':
        this.stats.articlesRead++;
        console.log(`✅ Articles read: ${this.stats.articlesRead}`);
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
        console.log(`✅ Games played: ${this.stats.gamesPlayed}`);
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
    
    // Debug logging
    console.log(`📊 [StatsTracker] updateStreak called with activityDate: ${activityDate}, today: ${today}, lastActiveDate: ${this.stats.lastActiveDate}`);

    // Update first active date
    if (!this.stats.firstActiveDate || activityDate < this.stats.firstActiveDate) {
      this.stats.firstActiveDate = activityDate;
    }

    // Check if we need to update streak - only process if activity is for today
    if (activityDate === today) {
      // Check previous activity to determine streak status
      if (!this.stats.lastActiveDate || this.stats.lastActiveDate === '') {
        // First activity ever
        console.log(`🎉 [StatsTracker] First activity! Starting streak at 1`);
        this.stats.currentStreak = 1;
      } else if (this.stats.lastActiveDate === today) {
        // Already processed today - no change needed
        console.log(`✅ [StatsTracker] Already active today, maintaining streak: ${this.stats.currentStreak}`);
        return;
      } else if (this.stats.lastActiveDate === yesterday) {
        // Consecutive day - INCREMENT the streak!
        this.stats.currentStreak += 1;
        console.log(`🔥 [StatsTracker] Streak continues! Incremented from ${this.stats.currentStreak - 1} to ${this.stats.currentStreak}`);
      } else {
        // Gap in activity - reset streak to 1
        const previousStreak = this.stats.currentStreak;
        this.stats.currentStreak = 1;
        console.log(`💔 [StatsTracker] Streak broken. Was: ${previousStreak}, Last active: ${this.stats.lastActiveDate}, Resetting to 1`);
      }
      
      // Update last active date AFTER checking (this was the critical bug!)
      this.stats.lastActiveDate = today;
    }

    // Update longest streak
    if (this.stats.currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = this.stats.currentStreak;
      console.log(`🏆 [StatsTracker] New longest streak: ${this.stats.longestStreak}`);
    }
  }

  /**
   * Validate and fix streak based on actual activity data
   */
  private async validateAndFixStreak(): Promise<void> {
    if (!this.stats) return;

    console.log('🔍 [StatsTracker] Validating streak and active days...');

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
    
    console.log(`📊 [StatsTracker] Found ${sortedDates.length} days with activity`);
    if (sortedDates.length > 0) {
      console.log(`📊 [StatsTracker] Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`);
    }
    
    if (sortedDates.length === 0) {
      console.log('📊 [StatsTracker] No activity data found');
      this.stats.currentStreak = 0;
      this.stats.totalDaysActive = 0;
      return;
    }

    // Calculate actual current streak (counting backwards from today)
    let actualStreak = 0;
    const today = this.getDateString(Date.now());
    const yesterday = this.getDateString(Date.now() - 24 * 60 * 60 * 1000);
    let checkDate = today;

    console.log(`📊 [StatsTracker] Checking streak from today (${today}) backwards...`);
    
    // First check if user has activity today
    if (activityDates.has(today)) {
      // User has activity today, count backwards normally
      while (activityDates.has(checkDate)) {
        actualStreak++;
        console.log(`✅ [StatsTracker] Activity found on ${checkDate}, streak now: ${actualStreak}`);
        const prevDate = new Date(checkDate + 'T00:00:00.000Z'); // Ensure UTC
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getDateString(prevDate.getTime());
      }
    } else if (activityDates.has(yesterday)) {
      // No activity today yet, but was active yesterday - preserve streak
      console.log(`⚠️ [StatsTracker] No activity today yet, but was active yesterday - preserving streak`);
      checkDate = yesterday;
      while (activityDates.has(checkDate)) {
        actualStreak++;
        console.log(`✅ [StatsTracker] Activity found on ${checkDate}, streak now: ${actualStreak}`);
        const prevDate = new Date(checkDate + 'T00:00:00.000Z'); // Ensure UTC
        prevDate.setUTCDate(prevDate.getUTCDate() - 1);
        checkDate = this.getDateString(prevDate.getTime());
      }
      console.log(`⏰ [StatsTracker] Streak preserved at ${actualStreak} - activity needed today to continue!`);
    } else {
      // No activity yesterday or today - streak is broken
      console.log(`❌ [StatsTracker] No activity yesterday or today - streak is 0`);
      actualStreak = 0;
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let currentCheckStreak = 0;
    let lastDate: string | null = null;
    
    for (const date of sortedDates) {
      if (lastDate === null) {
        currentCheckStreak = 1;
      } else {
        const lastDateTime = new Date(lastDate + 'T00:00:00.000Z');
        const currentDateTime = new Date(date + 'T00:00:00.000Z');
        const daysDiff = Math.round((currentDateTime.getTime() - lastDateTime.getTime()) / (24 * 60 * 60 * 1000));
        
        if (daysDiff === 1) {
          currentCheckStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentCheckStreak);
          currentCheckStreak = 1;
        }
      }
      lastDate = date;
    }
    longestStreak = Math.max(longestStreak, currentCheckStreak);

    // Update stats if different
    const previousStreak = this.stats.currentStreak;
    const previousLongest = this.stats.longestStreak;
    const previousActive = this.stats.totalDaysActive;
    
    this.stats.currentStreak = actualStreak;
    this.stats.longestStreak = Math.max(longestStreak, actualStreak, this.stats.longestStreak);
    this.stats.totalDaysActive = activityDates.size;
    
    if (actualStreak !== previousStreak || this.stats.longestStreak !== previousLongest || this.stats.totalDaysActive !== previousActive) {
      console.log(`✅ [StatsTracker] Stats updated:`);
      console.log(`   - Current streak: ${previousStreak} → ${this.stats.currentStreak}`);
      console.log(`   - Longest streak: ${previousLongest} → ${this.stats.longestStreak}`);
      console.log(`   - Total active days: ${previousActive} → ${this.stats.totalDaysActive}`);
    } else {
      console.log(`✅ [StatsTracker] Stats validated - no changes needed`);
    }
    
    // Update dates if needed
    if (sortedDates.length > 0) {
      if (!this.stats.firstActiveDate || sortedDates[0] < this.stats.firstActiveDate) {
        this.stats.firstActiveDate = sortedDates[0];
        console.log(`📊 [StatsTracker] Updated first active date: ${this.stats.firstActiveDate}`);
      }
      if (!this.stats.lastActiveDate || sortedDates[sortedDates.length - 1] > this.stats.lastActiveDate) {
        this.stats.lastActiveDate = sortedDates[sortedDates.length - 1];
        console.log(`📊 [StatsTracker] Updated last active date: ${this.stats.lastActiveDate}`);
      }
    }
  }

  /**
   * Save daily activity to storage
   */
  private async saveDailyActivity(date: string, activity: DailyActivity): Promise<void> {
    // Guest users should not persist activities
    if (!this.currentUser) {
      console.log('👤 [StatsTracker] Guest user - skipping activity save');
      return;
    }
    
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
    
    // Guest users should not load from storage
    if (!this.currentUser) {
      console.log('👤 [StatsTracker] Guest user - skipping activity load');
      return activities;
    }
    
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
    
    // First load from IndexedDB
    await this.loadActivitiesRange(thirtyDaysAgo, today);
    
    // For premium users, also check cloud for any newer activities
    if (this.currentUser && this.isPremium) {
      await this.loadActivitiesFromCloud(thirtyDaysAgo, today);
      
      // After loading activities, recalculate totals from daily activities
      // This ensures our stats reflect the actual activities in the database
      await this.recalculateTotalsFromDailyActivities();
    }
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
      console.log('☁️ [StatsTracker] Starting cloud sync...');
      // Save stats
      await this.saveToCloud();
      
      // Save recent activities to new structure
      const recentActivities = Array.from(this.activities.entries())
        .filter(([date]) => {
          const activityTime = new Date(date).getTime();
          return now - activityTime < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        });

      for (const [date, activity] of recentActivities) {
        // New collection structure: /userStats/{userId}/dailyActivities/{date}/
        const activityRef = doc(db, 'userStats', this.currentUser.uid, 'dailyActivities', date);
        
        // Ensure all fields are defined before saving to Firebase
        const sanitizedActivity = this.sanitizeDailyActivity(activity);
        
        try {
          // Final sanitization: use JSON stringify/parse to remove any undefined values
          const finalSanitized = JSON.parse(JSON.stringify(sanitizedActivity));
          
          // Add metadata for the new structure
          const activityData = {
            ...finalSanitized,
            lastUpdated: serverTimestamp()
          };
          
          await setDoc(activityRef, activityData);
        } catch (error) {
          console.error(`❌ [StatsTracker] Error saving activity for ${date}:`, error);
          console.error('Activity data:', sanitizedActivity);
          
          // Try to identify the problematic field
          if (error instanceof Error && error.message && error.message.includes('undefined')) {
            console.error('Checking for undefined values...');
            const checkForUndefined = (obj: any, path = '') => {
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
   * Load activities from cloud for a date range
   */
  private async loadActivitiesFromCloud(startDate: string, endDate: string): Promise<void> {
    if (!this.currentUser || !this.isPremium) return;
    
    try {
      const activitiesRef = collection(db, 'userStats', this.currentUser.uid, 'dailyActivities');
      
      // Query activities within date range
      const q = query(
        activitiesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date')
      );
      
      const snapshot = await getDocs(q);
      
      snapshot.forEach(doc => {
        const activity = doc.data() as DailyActivity;
        const date = doc.id; // Document ID is the date
        
        // Check if cloud version is newer than local
        const localActivity = this.activities.get(date);
        if (!localActivity || 
            (activity.lastUpdated && localActivity.lastUpdated && 
             activity.lastUpdated > localActivity.lastUpdated)) {
          
          // Sanitize and store the cloud activity
          const sanitized = this.sanitizeDailyActivity(activity);
          this.activities.set(date, sanitized);
          
          // Also save to IndexedDB for offline access
          this.saveDailyActivity(date, sanitized);
        }
      });
      
      console.log(`☁️ [StatsTracker] Loaded ${snapshot.size} activities from cloud`);
    } catch (error) {
      console.error('❌ [StatsTracker] Error loading activities from cloud:', error);
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
    return {
      userId: this.currentUser?.uid || '',
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: '',  // Empty string initially - will be set on first activity
      firstActiveDate: '', // Empty string initially - will be set on first activity
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
    const sanitizedActivities = (activityWithoutId.activities || []).map((event: any) => {
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
      // Always sync Pokemon count from Firebase (not just when it's 0)
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        const pokedex = userDoc.data().pokedex;
        if (pokedex && pokedex.caught && Array.isArray(pokedex.caught)) {
          const actualCount = pokedex.caught.length;
          // Update if count has changed
          if (actualCount !== this.stats.pokemonCaught) {
            console.log(`🔄 [StatsTracker] Syncing Pokemon count: ${this.stats.pokemonCaught} → ${actualCount}`);
            this.stats.pokemonCaught = actualCount;
            await this.saveToIndexedDB();
            this.notifyListeners();
          }
        }
      }
    } catch (error) {
      console.error('❌ [StatsTracker] Error syncing Pokemon count:', error);
    }
  }

  /**
   * Force refresh Pokemon count (public method)
   */
  async refreshPokemonCount(): Promise<void> {
    await this.syncPokemonCount();
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
   * Get activities data for StatsBar display
   */
  async getActivitiesData(): Promise<{
    today: DailyActivity | null;
    week: DailyActivity[];
    month: DailyActivity[];
  }> {
    const today = this.getDateString(Date.now());
    const weekAgo = this.getDateString(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = this.getDateString(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Ensure we have recent activities loaded
    await this.loadActivitiesRange(monthAgo, today);
    
    // Get today's activity
    const todayActivity = this.activities.get(today) || null;
    
    // Get last 7 days
    const weekActivities: DailyActivity[] = [];
    const weekStart = new Date(weekAgo);
    const todayDate = new Date(today);
    
    for (let d = new Date(weekStart); d <= todayDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.getDateString(d.getTime());
      const activity = this.activities.get(dateStr);
      if (activity) {
        weekActivities.push(activity);
      }
    }
    
    // Get last 30 days
    const monthActivities: DailyActivity[] = [];
    const monthStart = new Date(monthAgo);
    
    for (let d = new Date(monthStart); d <= todayDate; d.setDate(d.getDate() + 1)) {
      const dateStr = this.getDateString(d.getTime());
      const activity = this.activities.get(dateStr);
      if (activity) {
        monthActivities.push(activity);
      }
    }
    
    return {
      today: todayActivity,
      week: weekActivities,
      month: monthActivities
    };
  }

  /**
   * Manually recalculate and fix streak (for debugging)
   * This is a public method that can be called from browser console
   */
  async recalculateStreak(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      console.log('🔧 [StatsTracker] Manual streak recalculation requested');
      
      const before = {
        currentStreak: this.stats?.currentStreak || 0,
        longestStreak: this.stats?.longestStreak || 0,
        totalDaysActive: this.stats?.totalDaysActive || 0,
        lastActiveDate: this.stats?.lastActiveDate || 'unknown'
      };
      
      await this.validateAndFixStreak();
      
      const after = {
        currentStreak: this.stats?.currentStreak || 0,
        longestStreak: this.stats?.longestStreak || 0,
        totalDaysActive: this.stats?.totalDaysActive || 0,
        lastActiveDate: this.stats?.lastActiveDate || 'unknown'
      };
      
      // Save the corrected stats
      if (this.stats) {
        await this.saveToIndexedDB();
        if (this.currentUser && this.isPremium) {
          await this.saveToCloud();
        }
        this.notifyListeners();
      }
      
      return {
        success: true,
        message: 'Streak recalculated successfully',
        stats: { before, after }
      };
    } catch (error) {
      console.error('❌ [StatsTracker] Error recalculating streak:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        stats: null
      };
    }
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

  /**
   * Recalculate totals from daily activities
   * This ensures stats match the actual activities stored
   */
  private async recalculateTotalsFromDailyActivities(): Promise<void> {
    if (!this.stats) return;
    
    console.log('🔄 [StatsTracker] Recalculating totals from daily activities...');
    
    // Initialize counters
    let totalActivities = 0;
    let drillsCompleted = 0;
    let storiesRead = 0;
    let articlesRead = 0;
    let kanjiStudySessions = 0;
    let gamesPlayed = 0;
    let vocabStudied = 0;
    let flashcardsReviewed = 0;
    let practiceSessionsCompleted = 0;
    
    // Sum up all activities from daily records
    for (const [date, daily] of this.activities) {
      totalActivities += daily.summary.totalActivities;
      drillsCompleted += daily.summary.drillsCompleted;
      storiesRead += daily.summary.storiesRead;
      articlesRead += daily.summary.articlesRead;
      kanjiStudySessions += daily.summary.kanjiStudied;
      gamesPlayed += daily.summary.gamesPlayed;
      vocabStudied += daily.summary.vocabStudied;
      flashcardsReviewed += daily.summary.flashcardsReviewed;
      practiceSessionsCompleted += daily.summary.practiceSessionsCompleted;
    }
    
    // Update stats if different
    const hasChanges = 
      this.stats.totalActivities !== totalActivities ||
      this.stats.drillsCompleted !== drillsCompleted ||
      this.stats.storiesRead !== storiesRead ||
      this.stats.articlesRead !== articlesRead ||
      this.stats.kanjiStudySessions !== kanjiStudySessions ||
      this.stats.gamesPlayed !== gamesPlayed ||
      this.stats.vocabStudied !== vocabStudied ||
      this.stats.flashcardsReviewed !== flashcardsReviewed ||
      this.stats.practiceSessionsCompleted !== practiceSessionsCompleted;
    
    if (hasChanges) {
      console.log('📊 [StatsTracker] Updating stats from daily activities:', {
        before: {
          totalActivities: this.stats.totalActivities,
          articlesRead: this.stats.articlesRead
        },
        after: {
          totalActivities,
          articlesRead
        }
      });
      
      this.stats.totalActivities = totalActivities;
      this.stats.drillsCompleted = drillsCompleted;
      this.stats.storiesRead = storiesRead;
      this.stats.articlesRead = articlesRead;
      this.stats.kanjiStudySessions = kanjiStudySessions;
      this.stats.gamesPlayed = gamesPlayed;
      this.stats.vocabStudied = vocabStudied;
      this.stats.flashcardsReviewed = flashcardsReviewed;
      this.stats.practiceSessionsCompleted = practiceSessionsCompleted;
      
      // Save updated stats
      await this.saveToIndexedDB();
      this.notifyListeners();
    }
  }

  /**
   * Recalculate totalActivities from existing activity counts
   * Useful for fixing stats that have incorrect totalActivities
   */
  async recalculateTotalActivities(): Promise<{ before: number, after: number }> {
    if (!this.stats) {
      throw new Error('Stats not initialized');
    }

    const before = this.stats.totalActivities;
    
    // Calculate total from all activity types
    const calculatedTotal = 
      this.stats.drillsCompleted +
      this.stats.storiesRead +
      this.stats.articlesRead +
      this.stats.kanjiStudySessions +
      this.stats.gamesPlayed +
      this.stats.vocabStudied +
      this.stats.flashcardsReviewed +
      this.stats.practiceSessionsCompleted;
    
    console.log('📊 [StatsTracker] Recalculating totalActivities:', {
      before,
      calculated: calculatedTotal,
      breakdown: {
        drills: this.stats.drillsCompleted,
        stories: this.stats.storiesRead,
        articles: this.stats.articlesRead,
        kanji: this.stats.kanjiStudySessions,
        games: this.stats.gamesPlayed,
        vocab: this.stats.vocabStudied,
        flashcards: this.stats.flashcardsReviewed,
        practice: this.stats.practiceSessionsCompleted
      }
    });
    
    // Update if different
    if (this.stats.totalActivities !== calculatedTotal) {
      this.stats.totalActivities = calculatedTotal;
      this.stats.lastUpdated = Date.now();
      
      // Save to storage
      await this.saveToIndexedDB();
      if (this.currentUser && this.isPremium) {
        await this.saveToCloud();
      }
      
      // Notify listeners
      this.notifyListeners();
    }
    
    return { before, after: calculatedTotal };
  }

}

// Export singleton instance
export const statsTracker = StatsTracker.getInstance();