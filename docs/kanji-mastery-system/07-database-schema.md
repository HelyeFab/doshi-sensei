# 📊 Database Schema Design

## Overview
Complete database schema design for the Kanji Mastery System, covering both Firebase Firestore structure and local storage strategies.

## Table of Contents
1. [Data Architecture Overview](#data-architecture-overview)
2. [Firebase Firestore Schema](#firebase-firestore-schema)
3. [Local Storage Schema](#local-storage-schema)
4. [Data Synchronization](#data-synchronization)
5. [Performance Optimization](#performance-optimization)
6. [Migration Strategy](#migration-strategy)

## Data Architecture Overview

### Storage Layers

```
┌─────────────────────────────────────────────────┐
│                    Client                       │
├─────────────────────────────────────────────────┤
│  SessionStorage │ LocalStorage │ IndexedDB      │
├─────────────────────────────────────────────────┤
│              Sync Service Layer                 │
├─────────────────────────────────────────────────┤
│            Firebase Firestore                   │
└─────────────────────────────────────────────────┘
```

### Data Categories

```typescript
enum DataCategory {
  // Core progress data
  PROGRESS = 'progress',           // SRS intervals, accuracy
  SESSIONS = 'sessions',           // Study sessions
  
  // Learning intelligence
  PROFILES = 'profiles',           // Learning profiles
  WEAKNESSES = 'weaknesses',       // Weakness analysis
  LEECHES = 'leeches',            // Leech management
  
  // User engagement
  ACHIEVEMENTS = 'achievements',   // Gamification
  STREAKS = 'streaks',            // Streak tracking
  SETTINGS = 'settings',          // User preferences
  
  // Analytics
  METRICS = 'metrics',            // Performance metrics
  INSIGHTS = 'insights',          // Generated insights
}
```

## Firebase Firestore Schema

### Collection Structure

```typescript
// Root collections
interface FirestoreSchema {
  users: {
    [userId: string]: UserDocument;
  };
  
  // Subcollections under users
  users_subcollections: {
    kanjiProgress: KanjiProgressCollection;
    studySessions: StudySessionCollection;
    learningProfiles: LearningProfileCollection;
    leeches: LeechCollection;
    achievements: AchievementCollection;
  };
  
  // Global collections
  kanjiData: KanjiDataCollection;
  systemMetrics: SystemMetricsCollection;
}
```

### User Document

```typescript
// /users/{userId}
interface UserDocument {
  // Basic info
  uid: string;
  email: string;
  displayName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Subscription (flattened structure per SUPERPOWERS-V-III.md)
  subscription: {
    plan: 'free' | 'monthly' | 'yearly';
    status: 'active' | 'canceled' | 'past_due';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Timestamp;
    cancelAtPeriodEnd: boolean;
  };
  
  // Aggregated stats (for quick access)
  stats: {
    totalKanjiLearned: number;
    totalReviews: number;
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: Timestamp;
    accuracyRate: number;
    masteryLevel: number; // 0-6 average
  };
  
  // Settings
  settings: {
    dailyGoal: number;
    reminderTime: string; // "09:00"
    timezone: string;
    studyMode: 'strict' | 'relaxed';
    notificationsEnabled: boolean;
  };
}
```

### Kanji Progress Collection

```typescript
// /users/{userId}/kanjiProgress/{progressId}
interface KanjiProgressDocument {
  // Identity
  progressId: string; // {userId}_{kanjiChar}
  userId: string;
  kanjiChar: string;
  
  // SRS data (FSRS algorithm)
  fsrs: {
    interval: number;        // Days until next review
    repetition: number;      // Number of successful reviews
    easeFactor: number;      // Difficulty modifier (0-1)
    stability: number;       // Memory stability
    difficulty: number;      // Inherent difficulty
    dueDate: Timestamp;      // Next review date
    lastReview: Timestamp;   // Last review date
  };
  
  // Performance metrics
  performance: {
    totalReviews: number;
    correctReviews: number;
    accuracy: number;        // Overall accuracy (0-1)
    
    // By question type
    meaningStats: {
      attempts: number;
      correct: number;
      accuracy: number;
      avgResponseTime: number;
    };
    onyomiStats: {
      attempts: number;
      correct: number;
      accuracy: number;
      avgResponseTime: number;
    };
    kunyomiStats: {
      attempts: number;
      correct: number;
      accuracy: number;
      avgResponseTime: number;
    };
  };
  
  // Mastery tracking
  mastery: {
    level: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Unseen to Burned
    achievedAt?: Timestamp;
    streakDays: number;
    lastMilestone?: string;
  };
  
  // Leech status
  leech?: {
    isLeech: boolean;
    detectedAt: Timestamp;
    severity: 'mild' | 'moderate' | 'severe';
    treatmentPlan?: string;
    treatmentProgress?: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Indexes needed:
  // - userId + dueDate (for review queue)
  // - userId + mastery.level (for progress tracking)
  // - userId + leech.isLeech (for leech management)
}
```

### Study Session Collection

```typescript
// /users/{userId}/studySessions/{sessionId}
interface StudySessionDocument {
  sessionId: string;
  userId: string;
  
  // Session info
  type: 'review' | 'learn' | 'practice' | 'leech_treatment';
  startedAt: Timestamp;
  completedAt: Timestamp;
  duration: number; // milliseconds
  
  // Content
  kanjiStudied: string[];
  totalQuestions: number;
  correctAnswers: number;
  
  // Detailed results
  results: Array<{
    kanjiChar: string;
    questionType: 'meaning' | 'onyomi' | 'kunyomi';
    isCorrect: boolean;
    responseTime: number;
    quality: 1 | 2 | 3 | 4 | 5; // FSRS quality
    userAnswer: string;
    correctAnswer: string;
  }>;
  
  // Analytics
  analytics: {
    accuracy: number;
    avgResponseTime: number;
    focusScore: number;      // Based on consistency
    fatiguePoint?: number;   // Question number where performance dropped
  };
  
  // Adaptive learning data
  adaptive?: {
    difficultyAdjustments: number[];
    weaknessesTargeted: string[];
    improvementAreas: string[];
  };
}
```

### Learning Profile Collection

```typescript
// /users/{userId}/learningProfiles/{profileId}
interface LearningProfileDocument {
  profileId: string;
  userId: string;
  
  // Learning patterns
  patterns: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
    optimalSessionLength: number; // minutes
    bestPerformanceTimes: Array<{
      hour: number;
      score: number;
    }>;
    learningVelocity: number; // Kanji per week
    retentionRate: number;    // After 30 days
  };
  
  // Weaknesses analysis
  weaknesses: {
    byType: {
      meaning: WeaknessData;
      onyomi: WeaknessData;
      kunyomi: WeaknessData;
    };
    
    confusionPairs: Array<{
      kanji1: string;
      kanji2: string;
      confusionCount: number;
      lastConfused: Timestamp;
    }>;
    
    slowRecall: string[]; // Kanji that take >5s
    inconsistent: string[]; // High variance in performance
  };
  
  // Personalization
  preferences: {
    difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
    focusArea: 'balanced' | 'meaning' | 'reading' | 'writing';
    questionTypes: {
      multipleChoice: boolean;
      typing: boolean;
      writing: boolean;
    };
  };
  
  // Historical performance
  history: {
    last30Days: PerformanceSnapshot;
    last90Days: PerformanceSnapshot;
    allTime: PerformanceSnapshot;
  };
  
  updatedAt: Timestamp;
}

interface WeaknessData {
  affectedKanji: string[];
  severity: 'mild' | 'moderate' | 'severe';
  improvementTrend: 'improving' | 'stable' | 'declining';
  recommendedStrategy: string;
}

interface PerformanceSnapshot {
  accuracy: number;
  avgResponseTime: number;
  kanjiLearned: number;
  sessionsCompleted: number;
}
```

### Leech Collection

```typescript
// /users/{userId}/leeches/{leechId}
interface LeechDocument {
  leechId: string; // Same as kanji character
  userId: string;
  kanjiChar: string;
  
  // Leech analysis
  analysis: {
    type: LeechType;
    severity: 'mild' | 'moderate' | 'severe';
    detectedAt: Timestamp;
    
    // Problem patterns
    commonErrors: Array<{
      type: string;
      frequency: number;
    }>;
    confusedWith: string[];
    weakestAspect: 'meaning' | 'reading' | 'writing';
  };
  
  // Treatment
  treatment: {
    currentPlan: {
      planId: string;
      methods: TreatmentMethod[];
      startedAt: Timestamp;
      targetDuration: number; // days
      exercises: string[]; // Exercise IDs
    };
    
    history: Array<{
      method: TreatmentMethod;
      startedAt: Timestamp;
      endedAt?: Timestamp;
      successful: boolean;
      notes?: string;
    }>;
    
    progress: {
      exercisesCompleted: number;
      exercisesTotal: number;
      improvementRate: number;
      currentAccuracy: number;
    };
  };
  
  // Success criteria
  graduation: {
    criteriamet: boolean;
    targetAccuracy: number;
    targetSpeed: number;
    consecutiveCorrect: number;
  };
  
  updatedAt: Timestamp;
}
```

## Local Storage Schema

### IndexedDB Structure

```typescript
// For offline-first and performance
interface IndexedDBSchema {
  // Database: 'KanjiMasteryDB'
  
  // Object stores
  stores: {
    // Kanji static data (rarely changes)
    kanjiData: {
      key: 'character';
      value: KanjiData;
      indexes: ['jlpt', 'grade', 'frequency'];
    };
    
    // User progress (frequently accessed)
    progress: {
      key: 'progressId';
      value: KanjiProgress;
      indexes: ['dueDate', 'masteryLevel', 'isLeech'];
    };
    
    // Session cache
    sessions: {
      key: 'sessionId';
      value: StudySession;
      indexes: ['date', 'type'];
    };
    
    // Review queue cache
    reviewQueue: {
      key: 'date';
      value: ReviewQueue;
      indexes: ['userId'];
    };
    
    // Offline sync queue
    syncQueue: {
      key: 'auto_increment';
      value: SyncOperation;
      indexes: ['timestamp', 'status'];
    };
  };
}

// IndexedDB operations
class IndexedDBService {
  private db: IDBDatabase;
  
  async initialize() {
    const request = indexedDB.open('KanjiMasteryDB', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('kanjiData')) {
        const store = db.createObjectStore('kanjiData', { keyPath: 'character' });
        store.createIndex('jlpt', 'jlpt', { unique: false });
        store.createIndex('grade', 'grade', { unique: false });
        store.createIndex('frequency', 'frequency', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('progress')) {
        const store = db.createObjectStore('progress', { keyPath: 'progressId' });
        store.createIndex('dueDate', 'fsrs.dueDate', { unique: false });
        store.createIndex('masteryLevel', 'mastery.level', { unique: false });
        store.createIndex('isLeech', 'leech.isLeech', { unique: false });
      }
      
      // ... other stores
    };
  }
  
  async bulkLoad(storeName: string, data: any[]) {
    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    for (const item of data) {
      store.put(item);
    }
    
    return transaction.complete;
  }
}
```

### localStorage Structure

```typescript
// For quick access to small data
interface LocalStorageSchema {
  // User preferences
  'userSettings': UserSettings;
  
  // Current session state
  'currentSession': {
    sessionId: string;
    startTime: number;
    questions: Question[];
    currentIndex: number;
  };
  
  // Daily stats cache
  'dailyStats': {
    date: string;
    reviewsCompleted: number;
    accuracy: number;
    newKanjiLearned: number;
  };
  
  // Streak data
  'streakData': {
    current: number;
    longest: number;
    lastStudyDate: string;
  };
  
  // Queue cache
  'reviewQueueCache': {
    date: string;
    items: ReviewItem[];
    generated: number;
  };
}

// Helper functions
const LocalStorageHelper = {
  setJSON<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  },
  
  getJSON<T>(key: string): T | null {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  
  remove(key: string): void {
    localStorage.removeItem(key);
  },
  
  // With expiry
  setWithExpiry<T>(key: string, value: T, ttl: number): void {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    this.setJSON(key, item);
  },
  
  getWithExpiry<T>(key: string): T | null {
    const item = this.getJSON<{ value: T; expiry: number }>(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.remove(key);
      return null;
    }
    
    return item.value;
  },
};
```

## Data Synchronization

### Sync Strategy

```typescript
class DataSyncService {
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  
  /**
   * Bi-directional sync algorithm
   */
  async syncData(userId: string) {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      // 1. Check connection
      if (!navigator.onLine) {
        await this.queueForLaterSync();
        return;
      }
      
      // 2. Get local changes
      const localChanges = await this.getLocalChanges(userId);
      
      // 3. Get remote changes
      const remoteChanges = await this.getRemoteChanges(userId);
      
      // 4. Resolve conflicts
      const resolved = await this.resolveConflicts(localChanges, remoteChanges);
      
      // 5. Apply changes
      await this.applyLocalChanges(resolved.remote);
      await this.applyRemoteChanges(resolved.local);
      
      // 6. Update sync timestamp
      await this.updateSyncTimestamp(userId);
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  /**
   * Conflict resolution strategy
   */
  private resolveConflicts(
    local: ChangeSet,
    remote: ChangeSet
  ): ResolvedChanges {
    const resolved = {
      local: [],
      remote: [],
    };
    
    // For each conflicting item
    local.changes.forEach(localChange => {
      const remoteChange = remote.changes.find(
        r => r.id === localChange.id
      );
      
      if (remoteChange) {
        // Conflict! Use timestamp-based resolution
        if (localChange.timestamp > remoteChange.timestamp) {
          // Local wins
          resolved.local.push(localChange);
        } else {
          // Remote wins
          resolved.remote.push(remoteChange);
        }
      } else {
        // No conflict, apply local
        resolved.local.push(localChange);
      }
    });
    
    // Add non-conflicting remote changes
    remote.changes.forEach(remoteChange => {
      if (!local.changes.find(l => l.id === remoteChange.id)) {
        resolved.remote.push(remoteChange);
      }
    });
    
    return resolved;
  }
  
  /**
   * Offline queue management
   */
  async queueForLaterSync() {
    const operations = await this.getPendingOperations();
    
    // Store in IndexedDB
    const db = await this.openDB();
    const tx = db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    
    for (const op of operations) {
      store.add({
        ...op,
        status: 'pending',
        queuedAt: Date.now(),
      });
    }
  }
  
  /**
   * Process sync queue when online
   */
  async processSyncQueue() {
    const db = await this.openDB();
    const tx = db.transaction(['syncQueue'], 'readwrite');
    const store = tx.objectStore('syncQueue');
    const index = store.index('status');
    
    const pending = await index.getAll('pending');
    
    for (const operation of pending) {
      try {
        await this.executeOperation(operation);
        operation.status = 'completed';
      } catch (error) {
        operation.status = 'failed';
        operation.error = error.message;
      }
      
      store.put(operation);
    }
  }
}
```

### Real-time Updates

```typescript
class RealtimeSync {
  private listeners: Map<string, Function> = new Map();
  
  /**
   * Subscribe to real-time updates
   */
  subscribeToProgress(userId: string, callback: Function) {
    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'kanjiProgress'),
      (snapshot) => {
        const changes = snapshot.docChanges().map(change => ({
          type: change.type,
          data: change.doc.data(),
          id: change.doc.id,
        }));
        
        // Update local cache
        this.updateLocalCache(changes);
        
        // Notify listeners
        callback(changes);
      }
    );
    
    this.listeners.set(userId, unsubscribe);
    
    return () => {
      unsubscribe();
      this.listeners.delete(userId);
    };
  }
  
  /**
   * Optimistic updates
   */
  async updateWithOptimism(
    docPath: string,
    data: any,
    rollback?: Function
  ) {
    // 1. Update local immediately
    await this.updateLocal(docPath, data);
    
    try {
      // 2. Update remote
      await this.updateRemote(docPath, data);
    } catch (error) {
      // 3. Rollback on failure
      if (rollback) {
        await rollback();
      } else {
        await this.revertLocal(docPath);
      }
      
      throw error;
    }
  }
}
```

## Performance Optimization

### Firestore Indexes

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "kanjiProgress",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "fsrs.dueDate", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "kanjiProgress",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "mastery.level", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "kanjiProgress",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "leech.isLeech", "order": "ASCENDING" },
        { "fieldPath": "leech.severity", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "studySessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "completedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Query Optimization

```typescript
class OptimizedQueries {
  /**
   * Get review queue with pagination
   */
  async getReviewQueue(
    userId: string,
    limit: number = 50
  ): Promise<ReviewItem[]> {
    // Use compound query with index
    const q = query(
      collection(db, 'users', userId, 'kanjiProgress'),
      where('userId', '==', userId),
      where('fsrs.dueDate', '<=', Timestamp.now()),
      orderBy('fsrs.dueDate', 'asc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  }
  
  /**
   * Batch operations for efficiency
   */
  async batchUpdateProgress(
    userId: string,
    updates: ProgressUpdate[]
  ) {
    const batch = writeBatch(db);
    
    updates.forEach(update => {
      const ref = doc(
        db,
        'users',
        userId,
        'kanjiProgress',
        update.progressId
      );
      batch.update(ref, update.data);
    });
    
    // Commit all at once
    await batch.commit();
  }
  
  /**
   * Cached aggregations
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // Try cache first
    const cached = await this.getCachedStats(userId);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.stats;
    }
    
    // Calculate fresh
    const stats = await this.calculateStats(userId);
    
    // Update cache
    await this.cacheStats(userId, stats);
    
    return stats;
  }
}
```

## Migration Strategy

### From Current System

```typescript
class MigrationService {
  /**
   * Migrate from current kanjiStudyProgress to new schema
   */
  async migrateKanjiProgress(userId: string) {
    // 1. Read existing data
    const oldProgress = await this.getOldProgress(userId);
    
    // 2. Transform to new schema
    const newProgress = oldProgress.map(old => ({
      progressId: `${userId}_${old.kanjiChar}`,
      userId,
      kanjiChar: old.kanjiChar,
      
      // Map FSRS data
      fsrs: {
        interval: old.interval || 1,
        repetition: old.repetition || 0,
        easeFactor: old.easeFactor || 2.5,
        stability: old.stability || 1,
        difficulty: old.difficulty || 0.5,
        dueDate: old.dueDate || Timestamp.now(),
        lastReview: old.lastReview || Timestamp.now(),
      },
      
      // Map performance
      performance: {
        totalReviews: old.totalReviews || 0,
        correctReviews: old.correctReviews || 0,
        accuracy: old.accuracy || 0,
        
        meaningStats: {
          attempts: old.meaningAttempts || 0,
          correct: old.meaningCorrect || 0,
          accuracy: old.meaningAccuracy || 0,
          avgResponseTime: old.meaningResponseTime || 0,
        },
        // ... other stats
      },
      
      // Calculate mastery level
      mastery: {
        level: this.calculateMasteryLevel(old),
        streakDays: old.streakDays || 0,
      },
      
      // Check for leech status
      leech: this.checkLeechStatus(old),
      
      createdAt: old.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    }));
    
    // 3. Write to new location
    const batch = writeBatch(db);
    
    newProgress.forEach(progress => {
      const ref = doc(
        db,
        'users',
        userId,
        'kanjiProgress',
        progress.progressId
      );
      batch.set(ref, progress);
    });
    
    await batch.commit();
    
    // 4. Update user document
    await this.updateUserStats(userId, newProgress);
    
    return newProgress.length;
  }
  
  /**
   * Rollback mechanism
   */
  async createBackup(userId: string) {
    const data = await this.getAllUserData(userId);
    
    // Store backup
    await setDoc(
      doc(db, 'backups', `${userId}_${Date.now()}`),
      {
        userId,
        timestamp: Timestamp.now(),
        data: JSON.stringify(data),
      }
    );
  }
  
  async rollback(userId: string, backupId: string) {
    const backup = await getDoc(doc(db, 'backups', backupId));
    const data = JSON.parse(backup.data().data);
    
    // Restore data
    await this.restoreUserData(userId, data);
  }
}
```

---

## Next: [Implementation Roadmap](./08-implementation-plan.md)

*Last Updated: January 2025*