import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ExposedWord {
  wordId: string;
  exposedAt: Date;
  sessionCount: number; // How many sessions this word has appeared in
}

interface LessonExposure {
  lessonId: string;
  exposedWords: Map<string, ExposedWord>; // wordId -> exposure data
  totalWords: number;
  lastSessionDate: Date;
  cyclesCompleted: number; // How many times all words have been seen
}

/**
 * Tracks which words have been shown/exposed in learning sessions
 * This is different from "learned" words - these are just words that have been selected
 * for study, regardless of whether the user mastered them or not.
 */
class ExposedWordsStorage {
  private dbName = 'WordExposureTracking';
  private storeName = 'exposedWords';
  private lessonStoreName = 'lessonExposure';
  private version = 1;
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for individual exposed words
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { 
            keyPath: ['lessonId', 'wordId'] 
          });
          store.createIndex('lessonId', 'lessonId', { unique: false });
          store.createIndex('exposedAt', 'exposedAt', { unique: false });
        }

        // Store for lesson exposure summary
        if (!db.objectStoreNames.contains(this.lessonStoreName)) {
          const lessonStore = db.createObjectStore(this.lessonStoreName, { 
            keyPath: 'lessonId' 
          });
          lessonStore.createIndex('lastSessionDate', 'lastSessionDate', { unique: false });
        }
      };
    });
  }

  /**
   * Mark words as exposed in a session
   * This should be called when a session starts with selected words
   */
  async markWordsAsExposed(
    userId: string, 
    lessonId: string, 
    wordIds: string[],
    totalWordsInLesson: number
  ): Promise<void> {
    await this.initDB();
    
    // Get current exposure data
    const currentExposure = await this.getLessonExposureLocal(lessonId);
    
    // Update exposure data for each word
    for (const wordId of wordIds) {
      const existing = currentExposure.exposedWords.get(wordId);
      const exposedWord: ExposedWord = {
        wordId,
        exposedAt: new Date(),
        sessionCount: (existing?.sessionCount || 0) + 1
      };
      
      await this.saveExposedWordLocal(lessonId, exposedWord);
      currentExposure.exposedWords.set(wordId, exposedWord);
    }
    
    // Check if we've completed a cycle (all words have been exposed at least once)
    const uniqueExposedCount = currentExposure.exposedWords.size;
    const previousCycles = currentExposure.cyclesCompleted || 0;
    const newCyclesCompleted = uniqueExposedCount >= totalWordsInLesson 
      ? previousCycles + 1 
      : previousCycles;
    
    // Update lesson exposure summary
    await this.updateLessonExposureLocal(
      lessonId, 
      currentExposure.exposedWords,
      totalWordsInLesson,
      newCyclesCompleted
    );
    
    // Sync to Firebase if authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.syncExposureToFirebase(
          userId, 
          lessonId, 
          Array.from(currentExposure.exposedWords.values()),
          totalWordsInLesson,
          newCyclesCompleted
        );
      } catch (error) {

      }
    }
  }

  /**
   * Get unexposed words for a lesson
   * Returns word IDs that haven't been shown yet, or all words if all have been shown
   */
  async getUnexposedWords(
    userId: string, 
    lessonId: string, 
    allWordIds: string[]
  ): Promise<{
    unexposedWords: string[];
    exposedWords: string[];
    cyclesCompleted: number;
    shouldReset: boolean;
  }> {
    await this.initDB();
    
    // Try Firebase first if authenticated
    let exposureData: LessonExposure | null = null;
    
    if (userId && userId !== 'guest') {
      try {
        exposureData = await this.getLessonExposureFromFirebase(userId, lessonId);
      } catch (error) {

      }
    }
    
    // Fall back to local storage
    if (!exposureData) {
      exposureData = await this.getLessonExposureLocal(lessonId);
    }
    
    const exposedWordIds = Array.from(exposureData.exposedWords.keys());
    const unexposedWords = allWordIds.filter(id => !exposedWordIds.includes(id));
    
    // If all words have been exposed, we should consider resetting or starting a new cycle
    const shouldReset = unexposedWords.length === 0 && exposedWordIds.length > 0;
    
    return {
      unexposedWords,
      exposedWords: exposedWordIds,
      cyclesCompleted: exposureData.cyclesCompleted || 0,
      shouldReset
    };
  }

  /**
   * Get smart word selection for a session
   * Prioritizes unexposed words, but includes some exposed ones if needed
   */
  async getSmartWordSelection(
    userId: string,
    lessonId: string,
    allWords: Array<{ id: string; [key: string]: any }>,
    requestedCount: number,
    mode: 'new' | 'review' | 'all'
  ): Promise<Array<{ id: string; [key: string]: any }>> {
    const allWordIds = allWords.map(w => w.id);
    const { unexposedWords, exposedWords, cyclesCompleted, shouldReset } = 
      await this.getUnexposedWords(userId, lessonId, allWordIds);
    
    let selectedWordIds: string[] = [];
    
    if (mode === 'new' || mode === 'all') {
      // Prioritize unexposed words
      if (unexposedWords.length >= requestedCount) {
        // We have enough unexposed words
        selectedWordIds = this.shuffleArray(unexposedWords).slice(0, requestedCount);
      } else if (unexposedWords.length > 0) {
        // Use all unexposed words and fill the rest with least-recently-exposed words
        selectedWordIds = [...unexposedWords];
        
        if (mode === 'all' && selectedWordIds.length < requestedCount) {
          // Get exposure data to sort by least recent
          const exposureData = await this.getLessonExposureLocal(lessonId);
          const sortedExposed = exposedWords.sort((a, b) => {
            const aData = exposureData.exposedWords.get(a);
            const bData = exposureData.exposedWords.get(b);
            if (!aData || !bData) return 0;
            return aData.exposedAt.getTime() - bData.exposedAt.getTime();
          });
          
          const additionalCount = requestedCount - selectedWordIds.length;
          selectedWordIds.push(...sortedExposed.slice(0, additionalCount));
        }
      } else if (shouldReset) {
        // All words have been exposed, start a new cycle
        console.log(`All words in lesson ${lessonId} have been exposed. Starting new cycle (${cyclesCompleted + 1})`);
        selectedWordIds = this.shuffleArray(allWordIds).slice(0, requestedCount);
      }
    } else if (mode === 'review') {
      // For review mode, only select from exposed words
      selectedWordIds = this.shuffleArray(exposedWords).slice(0, requestedCount);
    }
    
    // Map IDs back to word objects
    return allWords.filter(w => selectedWordIds.includes(w.id));
  }

  /**
   * Reset exposure tracking for a lesson
   */
  async resetLessonExposure(userId: string, lessonId: string): Promise<void> {
    await this.initDB();
    
    // Clear local data
    await this.clearLessonExposureLocal(lessonId);
    
    // Clear Firebase data if authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.clearLessonExposureFirebase(userId, lessonId);
      } catch (error) {

      }
    }
  }

  /**
   * Get exposure statistics for a lesson
   */
  async getExposureStats(userId: string, lessonId: string, totalWords: number): Promise<{
    exposedCount: number;
    unexposedCount: number;
    percentageComplete: number;
    cyclesCompleted: number;
    averageExposureCount: number;
  }> {
    await this.initDB();
    
    const exposureData = await this.getLessonExposureLocal(lessonId);
    const exposedCount = exposureData.exposedWords.size;
    const unexposedCount = totalWords - exposedCount;
    const percentageComplete = (exposedCount / totalWords) * 100;
    
    // Calculate average exposure count
    let totalExposures = 0;
    exposureData.exposedWords.forEach(word => {
      totalExposures += word.sessionCount;
    });
    const averageExposureCount = exposedCount > 0 ? totalExposures / exposedCount : 0;
    
    return {
      exposedCount,
      unexposedCount,
      percentageComplete,
      cyclesCompleted: exposureData.cyclesCompleted || 0,
      averageExposureCount
    };
  }

  // Local storage methods
  private async saveExposedWordLocal(lessonId: string, word: ExposedWord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put({ lessonId, ...word });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getLessonExposureLocal(lessonId: string): Promise<LessonExposure> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.lessonStoreName], 'readonly');
      const store = transaction.objectStore(this.lessonStoreName);
      const request = store.get(lessonId);

      request.onsuccess = () => {
        if (request.result) {
          // Convert stored data back to Map
          const data = request.result;
          const exposedWords = new Map<string, ExposedWord>();
          if (data.exposedWords) {
            Object.entries(data.exposedWords).forEach(([key, value]) => {
              exposedWords.set(key, value as ExposedWord);
            });
          }
          resolve({
            ...data,
            exposedWords,
            lastSessionDate: new Date(data.lastSessionDate)
          });
        } else {
          // Return empty exposure data
          resolve({
            lessonId,
            exposedWords: new Map(),
            totalWords: 0,
            lastSessionDate: new Date(),
            cyclesCompleted: 0
          });
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async updateLessonExposureLocal(
    lessonId: string, 
    exposedWords: Map<string, ExposedWord>,
    totalWords: number,
    cyclesCompleted: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.lessonStoreName], 'readwrite');
      const store = transaction.objectStore(this.lessonStoreName);
      
      // Convert Map to object for storage
      const exposedWordsObj: { [key: string]: ExposedWord } = {};
      exposedWords.forEach((value, key) => {
        exposedWordsObj[key] = value;
      });
      
      const exposure: LessonExposure = {
        lessonId,
        exposedWords: exposedWords, // Will be converted to object in storage
        totalWords,
        lastSessionDate: new Date(),
        cyclesCompleted
      };
      
      // Store with object instead of Map
      const request = store.put({
        ...exposure,
        exposedWords: exposedWordsObj
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearLessonExposureLocal(lessonId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.storeName, this.lessonStoreName], 
        'readwrite'
      );
      
      // Clear from lesson store
      const lessonStore = transaction.objectStore(this.lessonStoreName);
      lessonStore.delete(lessonId);
      
      // Clear individual words
      const wordStore = transaction.objectStore(this.storeName);
      const index = wordStore.index('lessonId');
      const request = index.openCursor(IDBKeyRange.only(lessonId));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Firebase methods
  private async syncExposureToFirebase(
    userId: string, 
    lessonId: string, 
    exposedWords: ExposedWord[],
    totalWords: number,
    cyclesCompleted: number
  ): Promise<void> {
    const exposureRef = doc(db, 'users', userId, 'wordExposureTracking', lessonId);
    
    const exposedWordsObj: { [key: string]: any } = {};
    exposedWords.forEach(word => {
      exposedWordsObj[word.wordId] = {
        exposedAt: word.exposedAt.toISOString(),
        sessionCount: word.sessionCount
      };
    });
    
    await setDoc(exposureRef, {
      lessonId,
      exposedWords: exposedWordsObj,
      totalWords,
      lastSessionDate: new Date().toISOString(),
      cyclesCompleted
    }, { merge: true });
  }

  private async getLessonExposureFromFirebase(
    userId: string, 
    lessonId: string
  ): Promise<LessonExposure | null> {
    const exposureRef = doc(db, 'users', userId, 'wordExposureTracking', lessonId);
    const exposureDoc = await getDoc(exposureRef);
    
    if (!exposureDoc.exists()) {
      return null;
    }
    
    const data = exposureDoc.data();
    const exposedWords = new Map<string, ExposedWord>();
    
    if (data.exposedWords) {
      Object.entries(data.exposedWords).forEach(([wordId, wordData]: [string, any]) => {
        exposedWords.set(wordId, {
          wordId,
          exposedAt: new Date(wordData.exposedAt),
          sessionCount: wordData.sessionCount
        });
      });
    }
    
    return {
      lessonId,
      exposedWords,
      totalWords: data.totalWords || 0,
      lastSessionDate: new Date(data.lastSessionDate),
      cyclesCompleted: data.cyclesCompleted || 0
    };
  }

  private async clearLessonExposureFirebase(userId: string, lessonId: string): Promise<void> {
    const exposureRef = doc(db, 'users', userId, 'wordExposureTracking', lessonId);
    await deleteDoc(exposureRef);
  }

  // Utility methods
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const exposedWordsStorage = new ExposedWordsStorage();