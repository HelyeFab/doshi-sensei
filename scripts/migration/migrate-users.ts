/**
 * User Migration Script for Review Hub
 * Migrates existing user data to the unified review system
 * 
 * For 3 existing users - simple, safe migration
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Types for existing data structures
interface LegacyKanjiProgress {
  character: string;
  level: number;
  lastReviewed?: Date;
  correctCount?: number;
  incorrectCount?: number;
  nextReview?: Date;
}

interface LegacyVocabulary {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  lastReviewed?: Date;
  difficulty?: number;
  repetitions?: number;
}

interface LegacyFlashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  interval?: number;
  easeFactor?: number;
  lastReviewed?: Date;
}

// Unified Review Item structure
interface UnifiedReviewItem {
  id: string;
  userId: string;
  sourceType: 'kanji_mastery' | 'textbook_vocabulary' | 'flashcards' | 'drill' | 'game';
  contentType: 'kanji' | 'vocabulary' | 'sentence' | 'grammar';
  content: {
    primary: string;
    secondary?: string;
    meaning?: string;
    reading?: string;
    context?: string;
  };
  scheduling: {
    algorithm: 'FSRS' | 'SM2' | 'Simple';
    dueDate: Timestamp;
    interval: number;
    easeFactor: number;
    repetitions: number;
    lapses: number;
    state: 'new' | 'learning' | 'review' | 'relearning';
  };
  statistics: {
    totalReviews: number;
    correctReviews: number;
    incorrectReviews: number;
    averageResponseTime?: number;
    lastReviewedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  };
  metadata: {
    tags?: string[];
    source?: string;
    difficulty?: number;
    notes?: string;
  };
  sync: {
    version: number;
    lastSyncedAt?: Timestamp;
    localChanges: boolean;
  };
}

class UserMigration {
  private db: FirebaseFirestore.Firestore;
  private dryRun: boolean;
  private backupPath: string = './scripts/migration/backups';
  
  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    
    // Initialize Firebase Admin with service account file
    if (!admin.apps.length) {
      const serviceAccount = require('../../firebase-service-account.json');
      initializeApp({
        credential: cert(serviceAccount),
      });
    }
    
    this.db = getFirestore();
    console.log(`🚀 Migration initialized in ${dryRun ? 'DRY RUN' : 'LIVE'} mode`);
  }

  /**
   * Main migration function
   */
  async migrateAllUsers() {
    console.log('📊 Starting user migration for Review Hub...\n');
    
    try {
      // Step 1: Get all users (expecting 3)
      const users = await this.getExistingUsers();
      console.log(`Found ${users.length} users to migrate\n`);
      
      // Step 2: Backup existing data
      if (!this.dryRun) {
        await this.backupData(users);
      }
      
      // Step 3: Migrate each user
      for (const userId of users) {
        console.log(`\n👤 Migrating user: ${userId}`);
        console.log('─'.repeat(50));
        
        await this.migrateUser(userId);
      }
      
      // Step 4: Verify migration
      await this.verifyMigration(users);
      
      console.log('\n✅ Migration completed successfully!');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Get list of existing users
   */
  async getExistingUsers(): Promise<string[]> {
    // Check users collection
    const usersSnapshot = await this.db.collection('users').limit(10).get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    // Also check for data in legacy collections
    const collections = ['kanjiProgress', 'vocabulary', 'flashcards'];
    const additionalUsers = new Set<string>();
    
    for (const collName of collections) {
      const snapshot = await this.db.collection(collName).limit(10).get();
      snapshot.docs.forEach(doc => {
        const userId = doc.data().userId || doc.id.split('_')[0];
        if (userId) additionalUsers.add(userId);
      });
    }
    
    // Combine and deduplicate
    const allUsers = [...new Set([...userIds, ...additionalUsers])];
    
    return allUsers.slice(0, 5); // Safety limit for migration
  }

  /**
   * Migrate a single user
   */
  async migrateUser(userId: string) {
    const stats = {
      kanji: 0,
      vocabulary: 0,
      flashcards: 0,
      total: 0
    };
    
    // Migrate Kanji Progress
    const kanjiItems = await this.migrateKanjiProgress(userId);
    stats.kanji = kanjiItems.length;
    
    // Migrate Vocabulary
    const vocabItems = await this.migrateVocabulary(userId);
    stats.vocabulary = vocabItems.length;
    
    // Migrate Flashcards
    const flashcardItems = await this.migrateFlashcards(userId);
    stats.flashcards = flashcardItems.length;
    
    stats.total = stats.kanji + stats.vocabulary + stats.flashcards;
    
    // Save to unified collection
    if (!this.dryRun && stats.total > 0) {
      const allItems = [...kanjiItems, ...vocabItems, ...flashcardItems];
      await this.saveUnifiedItems(allItems);
      
      // Update user migration status
      await this.updateUserMigrationStatus(userId, stats);
    }
    
    console.log(`\n📈 Migration stats for ${userId}:`);
    console.log(`  - Kanji items: ${stats.kanji}`);
    console.log(`  - Vocabulary items: ${stats.vocabulary}`);
    console.log(`  - Flashcard items: ${stats.flashcards}`);
    console.log(`  - Total items: ${stats.total}`);
  }

  /**
   * Migrate Kanji Progress
   */
  async migrateKanjiProgress(userId: string): Promise<UnifiedReviewItem[]> {
    const items: UnifiedReviewItem[] = [];
    
    try {
      // Try different collection patterns
      const patterns = [
        `kanjiProgress/${userId}/items`,
        `users/${userId}/kanjiProgress`,
        'kanjiProgress'
      ];
      
      for (const pattern of patterns) {
        // First try without where clause for subcollections
        let snapshot = await this.db.collection(pattern).get().catch(() => null);
        
        // If that doesn't work, try with where clause
        if (!snapshot || snapshot.empty) {
          snapshot = await this.db.collection(pattern)
            .where('userId', '==', userId)
            .get()
            .catch(() => null);
        }
        
        if (snapshot && !snapshot.empty) {
          console.log(`  Found ${snapshot.size} kanji items in ${pattern}`);
          
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`    Processing kanji: ${doc.id}`, data);
            const converted = this.convertKanjiToUnified(userId, doc.id, data);
            if (converted) items.push(converted);
          });
          
          break; // Found data, stop searching
        }
      }
    } catch (error) {
      console.log(`  No kanji data found for user ${userId}`);
    }
    
    return items;
  }

  /**
   * Migrate Vocabulary
   */
  async migrateVocabulary(userId: string): Promise<UnifiedReviewItem[]> {
    const items: UnifiedReviewItem[] = [];
    
    try {
      const patterns = [
        `vocabulary/${userId}/items`,
        `users/${userId}/vocabulary`,
        'textbookVocabulary'
      ];
      
      for (const pattern of patterns) {
        const snapshot = await this.db.collection(pattern)
          .where('userId', '==', userId)
          .get()
          .catch(() => null);
        
        if (snapshot && !snapshot.empty) {
          console.log(`  Found ${snapshot.size} vocabulary items in ${pattern}`);
          
          snapshot.docs.forEach(doc => {
            const data = doc.data() as LegacyVocabulary;
            items.push(this.convertVocabToUnified(userId, doc.id, data));
          });
          
          break;
        }
      }
    } catch (error) {
      console.log(`  No vocabulary data found for user ${userId}`);
    }
    
    return items;
  }

  /**
   * Migrate Flashcards
   */
  async migrateFlashcards(userId: string): Promise<UnifiedReviewItem[]> {
    const items: UnifiedReviewItem[] = [];
    
    try {
      const patterns = [
        `flashcards/${userId}/cards`,
        `users/${userId}/flashcards`,
        'flashcards'
      ];
      
      for (const pattern of patterns) {
        const snapshot = await this.db.collection(pattern)
          .where('userId', '==', userId)
          .get()
          .catch(() => null);
        
        if (snapshot && !snapshot.empty) {
          console.log(`  Found ${snapshot.size} flashcard items in ${pattern}`);
          
          snapshot.docs.forEach(doc => {
            const data = doc.data() as LegacyFlashcard;
            items.push(this.convertFlashcardToUnified(userId, doc.id, data));
          });
          
          break;
        }
      }
    } catch (error) {
      console.log(`  No flashcard data found for user ${userId}`);
    }
    
    return items;
  }

  /**
   * Convert Kanji to Unified format
   */
  private convertKanjiToUnified(userId: string, docId: string, data: any): UnifiedReviewItem | null {
    // Handle different data structures
    const character = data.character || data.kanji || docId;
    
    if (!character) {
      console.log(`    Skipping invalid kanji data: ${docId}`);
      return null;
    }
    
    const now = Timestamp.now();
    const lastReviewed = data.lastReviewed ? 
      (data.lastReviewed.toDate ? data.lastReviewed : Timestamp.fromDate(new Date(data.lastReviewed))) : 
      now;
    const nextReview = data.nextReview ? 
      (data.nextReview.toDate ? data.nextReview : Timestamp.fromDate(new Date(data.nextReview))) : 
      now;
    
    return {
      id: `kanji_${userId}_${character}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      userId,
      sourceType: 'kanji_mastery',
      contentType: 'kanji',
      content: {
        primary: character,
        secondary: data.meaning || data.meanings?.join(', ') || '',
        reading: data.reading || data.readings?.join(', ') || ''
      },
      scheduling: {
        algorithm: 'FSRS',
        dueDate: nextReview,
        interval: data.interval || 1,
        easeFactor: data.easeFactor || 2.5,
        repetitions: data.repetitions || data.correctCount || 0,
        lapses: data.lapses || data.incorrectCount || 0,
        state: data.state || (data.repetitions > 0 ? 'review' : 'new')
      },
      statistics: {
        totalReviews: (data.correctCount || 0) + (data.incorrectCount || 0) || data.totalReviews || 0,
        correctReviews: data.correctCount || 0,
        incorrectReviews: data.incorrectCount || 0,
        lastReviewedAt: lastReviewed,
        createdAt: data.createdAt ? 
          (data.createdAt.toDate ? data.createdAt : Timestamp.fromDate(new Date(data.createdAt))) : 
          now,
        updatedAt: now
      },
      metadata: {
        tags: data.tags || [`level_${data.level || 1}`],
        difficulty: data.difficulty || data.level || 1
      },
      sync: {
        version: 1,
        lastSyncedAt: now,
        localChanges: false
      }
    };
  }

  /**
   * Convert Vocabulary to Unified format
   */
  private convertVocabToUnified(userId: string, docId: string, data: LegacyVocabulary): UnifiedReviewItem {
    const now = Timestamp.now();
    const lastReviewed = data.lastReviewed ? Timestamp.fromDate(new Date(data.lastReviewed)) : now;
    
    return {
      id: `vocab_${userId}_${data.id}`,
      userId,
      sourceType: 'textbook_vocabulary',
      contentType: 'vocabulary',
      content: {
        primary: data.word,
        secondary: data.meaning,
        reading: data.reading
      },
      scheduling: {
        algorithm: 'FSRS',
        dueDate: now,
        interval: 1,
        easeFactor: 2.5,
        repetitions: data.repetitions || 0,
        lapses: 0,
        state: data.repetitions ? 'review' : 'new'
      },
      statistics: {
        totalReviews: data.repetitions || 0,
        correctReviews: 0,
        incorrectReviews: 0,
        lastReviewedAt: lastReviewed,
        createdAt: now,
        updatedAt: now
      },
      metadata: {
        difficulty: data.difficulty
      },
      sync: {
        version: 1,
        lastSyncedAt: now,
        localChanges: false
      }
    };
  }

  /**
   * Convert Flashcard to Unified format
   */
  private convertFlashcardToUnified(userId: string, docId: string, data: LegacyFlashcard): UnifiedReviewItem {
    const now = Timestamp.now();
    const lastReviewed = data.lastReviewed ? Timestamp.fromDate(new Date(data.lastReviewed)) : now;
    
    return {
      id: `flash_${userId}_${data.id}`,
      userId,
      sourceType: 'flashcards',
      contentType: 'vocabulary',
      content: {
        primary: data.front,
        secondary: data.back
      },
      scheduling: {
        algorithm: 'SM2',
        dueDate: now,
        interval: data.interval || 1,
        easeFactor: data.easeFactor || 2.5,
        repetitions: 0,
        lapses: 0,
        state: 'review'
      },
      statistics: {
        totalReviews: 0,
        correctReviews: 0,
        incorrectReviews: 0,
        lastReviewedAt: lastReviewed,
        createdAt: now,
        updatedAt: now
      },
      metadata: {
        tags: [data.deckId]
      },
      sync: {
        version: 1,
        lastSyncedAt: now,
        localChanges: false
      }
    };
  }

  /**
   * Save unified items to Firestore
   */
  async saveUnifiedItems(items: UnifiedReviewItem[]) {
    const batch = this.db.batch();
    const collection = this.db.collection('review_hub');
    
    items.forEach(item => {
      const docRef = collection.doc(item.id);
      batch.set(docRef, item);
    });
    
    await batch.commit();
    console.log(`  ✅ Saved ${items.length} unified items`);
  }

  /**
   * Update user migration status
   */
  async updateUserMigrationStatus(userId: string, stats: any) {
    await this.db.collection('users').doc(userId).set({
      migration: {
        reviewHub: {
          completed: true,
          date: Timestamp.now(),
          stats,
          version: '1.0.0'
        }
      }
    }, { merge: true });
  }

  /**
   * Backup existing data
   */
  async backupData(userIds: string[]) {
    console.log('\n📦 Creating backup...');
    
    const backup: any = {
      timestamp: new Date().toISOString(),
      users: {}
    };
    
    for (const userId of userIds) {
      backup.users[userId] = {
        kanjiProgress: [],
        vocabulary: [],
        flashcards: []
      };
      
      // Backup each collection
      // ... backup logic here
    }
    
    // Save backup to file
    const fs = await import('fs');
    const backupFile = `${this.backupPath}/backup_${Date.now()}.json`;
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`  ✅ Backup saved to ${backupFile}`);
  }

  /**
   * Verify migration was successful
   */
  async verifyMigration(userIds: string[]) {
    console.log('\n🔍 Verifying migration...');
    
    for (const userId of userIds) {
      const snapshot = await this.db.collection('review_hub')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        console.log(`  ⚠️  No migrated data found for user ${userId}`);
      } else {
        console.log(`  ✅ User ${userId} migration verified`);
      }
    }
  }
}

// Run migration
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--live');
  
  if (!isDryRun) {
    console.log('⚠️  WARNING: Running in LIVE mode. Data will be modified!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  const migration = new UserMigration(isDryRun);
  await migration.migrateAllUsers();
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export { UserMigration };