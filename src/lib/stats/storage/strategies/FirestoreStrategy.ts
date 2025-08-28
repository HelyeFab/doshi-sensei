/**
 * Firestore storage strategy implementation
 * Handles cloud storage for premium users
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IStorageStrategy, UserStatsV2, StorageError } from '../../core/interfaces';
import { FIREBASE_PATHS, TIMEOUTS, LOG_PREFIXES } from '../../core/constants';
import { ValidationUtils } from '../../utils/helpers';

export class FirestoreStrategy implements IStorageStrategy {
  private readonly userId: string;
  private readonly logger: (message: string) => void;

  constructor(
    userId: string,
    logger: (message: string) => void = console.log
  ) {
    if (ValidationUtils.isGuestUser(userId)) {
      ValidationUtils.logGuestWarning('Firestore strategy initialization', userId);
      throw new StorageError('Invalid user ID for Firestore strategy - guest users cannot use Firestore', 'initialization');
    }
    this.userId = userId;
    this.logger = logger;
  }

  getName(): string {
    return 'Firestore';
  }

  /**
   * Load stats from Firestore with timeout protection
   */
  async load(): Promise<UserStatsV2 | null> {
    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Loading stats from Firestore for user ${this.userId.substr(0, 8)}...`);

      const userStatsRef = collection(db, 'userStats', this.userId, 'current');

      // Load all documents in parallel with timeout
      const loadPromise = Promise.all([
        getDoc(doc(userStatsRef, 'summary')),
        getDoc(doc(userStatsRef, 'activities')),
        getDoc(doc(userStatsRef, 'performance')),
        getDoc(doc(userStatsRef, 'metadata'))
      ]);

      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore load timeout')), TIMEOUTS.CLOUD_LOAD);
      });

      const [summaryDoc, activitiesDoc, performanceDoc, metadataDoc] = await Promise.race([
        loadPromise,
        timeoutPromise
      ]);

      // Check if documents exist
      if (!summaryDoc.exists() && !activitiesDoc.exists()) {
        // Try old structure for backward compatibility
        const oldStatsRef = doc(db, 'userStats', this.userId);
        const oldSnapshot = await getDoc(oldStatsRef);

        if (oldSnapshot.exists()) {
          this.logger(`${LOG_PREFIXES.STORAGE} Found old structure, migrating...`);
          const data = oldSnapshot.data();
          
          // Convert Firestore timestamps
          if (data.lastUpdated?.toMillis) {
            data.lastUpdated = data.lastUpdated.toMillis();
          }
          
          const { id, ...cleanData } = data;
          return cleanData as UserStatsV2;
        }

        this.logger(`${LOG_PREFIXES.STORAGE} No stats found in Firestore`);
        return null;
      }

      // Reconstruct stats from new document structure
      const stats = this.reconstructStats(summaryDoc, activitiesDoc, performanceDoc, metadataDoc);
      this.logger(`${LOG_PREFIXES.STORAGE} Successfully loaded stats from Firestore`);
      
      return stats;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for network errors
      if (this.isNetworkError(error)) {
        throw new StorageError(`Network error loading from Firestore: ${message}`, 'load');
      }
      
      this.logger(`${LOG_PREFIXES.STORAGE} Firestore load failed: ${message}`);
      throw new StorageError(`Failed to load from Firestore: ${message}`, 'load');
    }
  }

  /**
   * Save stats to Firestore with organized document structure
   */
  async save(stats: UserStatsV2): Promise<void> {
    try {
      this.logger(`${LOG_PREFIXES.STORAGE} Saving stats to Firestore for user ${this.userId.substr(0, 8)}...`);

      const userStatsRef = collection(db, 'userStats', this.userId, 'current');
      
      // Update timestamp
      const updatedStats = {
        ...stats,
        userId: this.userId,
        lastUpdated: Date.now()
      };

      // Save to organized documents
      const batch = [];

      // 1. Summary document
      batch.push(setDoc(doc(userStatsRef, 'summary'), {
        currentStreak: updatedStats.currentStreak,
        longestStreak: updatedStats.longestStreak,
        totalDaysActive: updatedStats.totalDaysActive,
        lastActiveDate: updatedStats.lastActiveDate,
        firstActiveDate: updatedStats.firstActiveDate,
        totalActivities: updatedStats.totalActivities,
        pokemonCaught: updatedStats.pokemonCaught,
        lastUpdated: serverTimestamp()
      }));

      // 2. Activities document
      batch.push(setDoc(doc(userStatsRef, 'activities'), {
        drillsCompleted: updatedStats.drillsCompleted,
        storiesRead: updatedStats.storiesRead,
        articlesRead: updatedStats.articlesRead,
        kanjiStudySessions: updatedStats.kanjiStudySessions,
        gamesPlayed: updatedStats.gamesPlayed,
        flashcardsReviewed: updatedStats.flashcardsReviewed,
        practiceSessionsCompleted: updatedStats.practiceSessionsCompleted,
        vocabStudied: updatedStats.vocabStudied,
        lastUpdated: serverTimestamp()
      }));

      // 3. Performance document
      batch.push(setDoc(doc(userStatsRef, 'performance'), {
        overallAccuracy: updatedStats.overallAccuracy,
        drillAccuracy: updatedStats.drillAccuracy,
        kanjiAccuracy: updatedStats.kanjiAccuracy,
        gameAccuracy: updatedStats.gameAccuracy,
        totalQuestionsAnswered: updatedStats.totalQuestionsAnswered,
        totalCorrectAnswers: updatedStats.totalCorrectAnswers,
        totalKanjiLearned: updatedStats.totalKanjiLearned,
        totalWordsLearned: updatedStats.totalWordsLearned,
        totalGameScore: updatedStats.totalGameScore,
        drillStats: updatedStats.drillStats,
        kanjiStats: updatedStats.kanjiStats,
        gameStats: updatedStats.gameStats,
        lastUpdated: serverTimestamp()
      }));

      // 4. Metadata document
      batch.push(setDoc(doc(userStatsRef, 'metadata'), {
        userId: updatedStats.userId,
        version: updatedStats.version,
        lastUpdated: serverTimestamp()
      }));

      // Execute all saves with timeout protection
      const savePromise = Promise.all(batch);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore save timeout')), TIMEOUTS.CLOUD_SAVE);
      });

      await Promise.race([savePromise, timeoutPromise]);

      // Verify critical documents were saved
      const [summaryDoc, activitiesDoc] = await Promise.all([
        getDoc(doc(userStatsRef, 'summary')),
        getDoc(doc(userStatsRef, 'activities'))
      ]);

      if (!summaryDoc.exists() || !activitiesDoc.exists()) {
        throw new Error('Verification failed - documents not created properly');
      }

      this.logger(`${LOG_PREFIXES.STORAGE} Successfully saved stats to Firestore`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for network/timeout errors
      if (this.isNetworkError(error) || message.includes('timeout')) {
        throw new StorageError(`Network error saving to Firestore: ${message}`, 'save');
      }
      
      this.logger(`${LOG_PREFIXES.STORAGE} Firestore save failed: ${message}`);
      throw new StorageError(`Failed to save to Firestore: ${message}`, 'save');
    }
  }

  /**
   * Clear Firestore data (not typically used)
   */
  async clear(): Promise<void> {
    // Firestore clear is not implemented as it's destructive
    // This would require careful consideration for data retention
    throw new StorageError('Firestore clear operation not supported', 'clear');
  }

  /**
   * Reconstruct stats from Firestore document structure
   */
  private reconstructStats(summaryDoc: any, activitiesDoc: any, performanceDoc: any, metadataDoc: any): UserStatsV2 {
    // Create initial stats structure
    const stats: Partial<UserStatsV2> = {
      userId: this.userId,
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

    // Handle metadata timestamp
    let lastUpdated = Date.now();
    if (metadataDoc.exists()) {
      const metadata = metadataDoc.data();
      if (metadata.lastUpdated?.toMillis) {
        lastUpdated = metadata.lastUpdated.toMillis();
      } else if (metadata.lastUpdated && typeof metadata.lastUpdated === 'number') {
        lastUpdated = metadata.lastUpdated;
      }
    }

    // Set defaults and missing fields
    const completeStats: UserStatsV2 = {
      userId: this.userId,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      lastActiveDate: '',
      firstActiveDate: '',
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
      learnedKanjiSet: [],
      learnedWordsSet: [],
      caughtPokemonSet: [],
      drillStats: { totalQuestions: 0, totalCorrect: 0 },
      kanjiStats: { totalQuestions: 0, totalCorrect: 0 },
      gameStats: { totalQuestions: 0, totalCorrect: 0 },
      lastUpdated,
      version: '2.1',
      ...stats
    };

    // Recalculate totalActivities from individual counts
    completeStats.totalActivities = 
      completeStats.drillsCompleted +
      completeStats.storiesRead +
      completeStats.articlesRead +
      completeStats.kanjiStudySessions +
      completeStats.gamesPlayed +
      completeStats.vocabStudied +
      completeStats.flashcardsReviewed +
      completeStats.practiceSessionsCompleted;

    return completeStats;
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    if (!error || typeof error !== 'object') return false;
    
    const message = error.message?.toLowerCase() || '';
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('offline') ||
           message.includes('fetch') ||
           message.includes('connection');
  }
}