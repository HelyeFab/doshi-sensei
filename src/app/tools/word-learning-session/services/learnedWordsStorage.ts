import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LearnedWord {
  wordId: string;
  lessonId: string;
  learnedAt: Date;
}

interface LessonProgress {
  lessonId: string;
  learnedWords: string[];
  totalWords: number;
  lastUpdated: Date;
}

class LearnedWordsStorage {
  private dbName = 'WordLearningProgress';
  private storeName = 'learnedWords';
  private progressStoreName = 'lessonProgress';
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
        
        // Store for individual learned words
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'wordId' });
          store.createIndex('lessonId', 'lessonId', { unique: false });
          store.createIndex('learnedAt', 'learnedAt', { unique: false });
        }

        // Store for lesson progress summary
        if (!db.objectStoreNames.contains(this.progressStoreName)) {
          const progressStore = db.createObjectStore(this.progressStoreName, { keyPath: 'lessonId' });
          progressStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }
      };
    });
  }

  // Mark a word as learned
  async markWordAsLearned(userId: string, wordId: string, lessonId: string): Promise<void> {
    await this.initDB();
    
    const learnedWord: LearnedWord = {
      wordId,
      lessonId,
      learnedAt: new Date()
    };

    // Save locally
    await this.saveLearnedWordLocal(learnedWord);
    
    // Update lesson progress locally
    await this.updateLessonProgressLocal(lessonId, wordId);
    
    // Sync to Firebase if authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.syncLearnedWordToFirebase(userId, learnedWord);
      } catch (error) {
        console.warn('Failed to sync learned word to Firebase:', error);
      }
    }
  }

  // Mark a word as unlearned (for review)
  async unmarkWordAsLearned(userId: string, wordId: string, lessonId: string): Promise<void> {
    await this.initDB();
    
    // Remove locally
    await this.removeLearnedWordLocal(wordId);
    
    // Update lesson progress locally
    await this.updateLessonProgressLocal(lessonId, wordId, true);
    
    // Sync to Firebase if authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.removeLearnedWordFromFirebase(userId, wordId, lessonId);
      } catch (error) {
        console.warn('Failed to remove learned word from Firebase:', error);
      }
    }
  }

  // Get all learned words for a lesson
  async getLearnedWords(userId: string, lessonId: string): Promise<string[]> {
    await this.initDB();
    
    // Try Firebase first if authenticated
    if (userId && userId !== 'guest') {
      try {
        const firebaseWords = await this.getLearnedWordsFromFirebase(userId, lessonId);
        if (firebaseWords.length > 0) {
          // Sync to local storage
          await this.syncFirebaseToLocal(lessonId, firebaseWords);
          return firebaseWords;
        }
      } catch (error) {
        console.warn('Failed to get learned words from Firebase:', error);
      }
    }
    
    // Fall back to local storage
    return await this.getLearnedWordsLocal(lessonId);
  }

  // Get lesson progress
  async getLessonProgress(userId: string, lessonId: string, totalWords: number): Promise<LessonProgress> {
    await this.initDB();
    
    const learnedWords = await this.getLearnedWords(userId, lessonId);
    
    return {
      lessonId,
      learnedWords,
      totalWords,
      lastUpdated: new Date()
    };
  }

  // Reset progress for a lesson
  async resetLessonProgress(userId: string, lessonId: string): Promise<void> {
    await this.initDB();
    
    // Get all learned words for this lesson
    const learnedWords = await this.getLearnedWordsLocal(lessonId);
    
    // Remove each word locally
    for (const wordId of learnedWords) {
      await this.removeLearnedWordLocal(wordId);
    }
    
    // Clear lesson progress
    await this.clearLessonProgressLocal(lessonId);
    
    // Sync to Firebase if authenticated
    if (userId && userId !== 'guest') {
      try {
        await this.resetLessonProgressFirebase(userId, lessonId);
      } catch (error) {
        console.warn('Failed to reset lesson progress in Firebase:', error);
      }
    }
  }

  // Local storage methods
  private async saveLearnedWordLocal(word: LearnedWord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(word);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async removeLearnedWordLocal(wordId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(wordId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getLearnedWordsLocal(lessonId: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('lessonId');
      const request = index.getAll(lessonId);

      request.onsuccess = () => {
        const words = request.result.map((w: LearnedWord) => w.wordId);
        resolve(words);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async updateLessonProgressLocal(lessonId: string, wordId: string, remove = false): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const learnedWords = await this.getLearnedWordsLocal(lessonId);
    const updatedWords = remove 
      ? learnedWords.filter(w => w !== wordId)
      : [...new Set([...learnedWords, wordId])];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.progressStoreName], 'readwrite');
      const store = transaction.objectStore(this.progressStoreName);
      
      const progress: Omit<LessonProgress, 'totalWords'> = {
        lessonId,
        learnedWords: updatedWords,
        lastUpdated: new Date()
      };
      
      const request = store.put(progress);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearLessonProgressLocal(lessonId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.progressStoreName], 'readwrite');
      const store = transaction.objectStore(this.progressStoreName);
      const request = store.delete(lessonId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Firebase methods
  private async syncLearnedWordToFirebase(userId: string, word: LearnedWord): Promise<void> {
    const progressRef = doc(db, 'users', userId, 'wordLearningProgress', word.lessonId);
    
    const progressDoc = await getDoc(progressRef);
    const currentData = progressDoc.data() || { learnedWords: [] };
    
    const updatedWords = [...new Set([...currentData.learnedWords, word.wordId])];
    
    await setDoc(progressRef, {
      lessonId: word.lessonId,
      learnedWords: updatedWords,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
  }

  private async removeLearnedWordFromFirebase(userId: string, wordId: string, lessonId: string): Promise<void> {
    const progressRef = doc(db, 'users', userId, 'wordLearningProgress', lessonId);
    
    const progressDoc = await getDoc(progressRef);
    const currentData = progressDoc.data();
    
    if (currentData) {
      const updatedWords = currentData.learnedWords.filter((w: string) => w !== wordId);
      
      await updateDoc(progressRef, {
        learnedWords: updatedWords,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  private async getLearnedWordsFromFirebase(userId: string, lessonId: string): Promise<string[]> {
    const progressRef = doc(db, 'users', userId, 'wordLearningProgress', lessonId);
    const progressDoc = await getDoc(progressRef);
    
    return progressDoc.data()?.learnedWords || [];
  }

  private async resetLessonProgressFirebase(userId: string, lessonId: string): Promise<void> {
    const progressRef = doc(db, 'users', userId, 'wordLearningProgress', lessonId);
    
    await setDoc(progressRef, {
      lessonId,
      learnedWords: [],
      lastUpdated: new Date().toISOString()
    });
  }

  private async syncFirebaseToLocal(lessonId: string, firebaseWords: string[]): Promise<void> {
    // Clear local words for this lesson first
    const localWords = await this.getLearnedWordsLocal(lessonId);
    for (const wordId of localWords) {
      await this.removeLearnedWordLocal(wordId);
    }
    
    // Add Firebase words to local storage
    for (const wordId of firebaseWords) {
      await this.saveLearnedWordLocal({
        wordId,
        lessonId,
        learnedAt: new Date()
      });
    }
  }
}

export const learnedWordsStorage = new LearnedWordsStorage();