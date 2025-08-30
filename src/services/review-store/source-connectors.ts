/**
 * Data source connectors for the Unified Review System
 * Connects to all existing review sources to retrieve due items
 */

import type { UnifiedReviewItem, ContentType } from './types';
import { AlgorithmType, ReviewState } from './types';
import { ReviewSource } from '../review-events/types';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

// Import existing services
import { TextbookVocabularyService } from '@/services/textbook-vocabulary';
import { kanjiStorage } from '@/services/kanji-mastery/storage';

interface SourceConnectorParams {
  userId: string;
  contentTypes?: ContentType[];
  limit?: number;
  offset?: number;
  includeOverdue?: boolean;
}

/**
 * Connector for Kanji Mastery items
 */
export async function getKanjiMasteryItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    // Get all kanji progress for the user
    const allProgress = await kanjiStorage.getAllProgress();
    
    // Filter for due items (items that need review)
    const now = Date.now();
    const dueItems = allProgress.filter(item => {
      if (!item.nextReview) return true; // New items
      return new Date(item.nextReview).getTime() <= now;
    });
    
    return dueItems.map(item => ({
      id: `kanji-mastery-${item.id}`,
      sourceId: item.id,
      sourceType: ReviewSource.KANJI_MASTERY,
      userId: params.userId,
      
      contentType: 'kanji' as ContentType,
      content: {
        primary: item.id, // The kanji character
        secondary: '', // No meaning in KanjiProgress
        reading: '', // No reading in KanjiProgress
        metadata: {
          difficulty: item.difficulty,
          retentionRate: item.retentionRate
        }
      },
      
      scheduling: {
        algorithm: AlgorithmType.FSRS,
        dueDate: item.nextReview ? new Date(item.nextReview) : new Date(),
        nextReviewAt: item.nextReview ? new Date(item.nextReview) : new Date(),
        interval: item.interval || 1,
        easeFactor: item.easeFactor || 2.5,
        repetitions: item.reviewCount || 0,
        lapses: item.lapses || 0,
        state: ReviewState.LEARNING,
        lastReviewedAt: item.lastReviewed ? new Date(item.lastReviewed) : undefined
      },
      
      metadata: {
        createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        lastReviewedAt: item.lastReviewed ? new Date(item.lastReviewed) : undefined,
        lastReviewSource: ReviewSource.KANJI_MASTERY,
        tags: [],
        properties: {
          lastQuality: item.lastQuality,
          retentionRate: item.retentionRate,
          studyModes: item.studyModes
        }
      },
      
      sync: {
        version: 1,
        lastSyncedAt: new Date(),
        localChanges: false,
        remoteChanges: false,
        conflictStatus: 'none'
      }
    }));
  } catch (error) {
    console.error('Error fetching Kanji Mastery items:', error);
    return [];
  }
}

/**
 * Connector for Textbook Vocabulary items
 * Reads from Firebase first (if user is logged in), then falls back to IndexedDB
 */
export async function getTextbookVocabularyItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    // First, try to get items from Firebase if user is authenticated
    if (params.userId && params.userId !== 'anonymous') {
      try {
        const vocabRef = collection(db, 'users', params.userId, 'textbookVocabularyProgress');
        const q = query(
          vocabRef,
          where('nextReview', '<=', new Date().toISOString()),
          orderBy('nextReview'),
          limit(params.limit || 100)
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          console.log(`📚 Found ${snapshot.size} vocabulary items from Firebase`);
          
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: `textbook-vocab-${doc.id}`,
              sourceId: doc.id,
              sourceType: ReviewSource.TEXTBOOK_VOCAB,
              userId: params.userId,
              
              contentType: 'vocabulary' as ContentType,
              content: {
                primary: data.japanese || data.primary || '',
                secondary: data.english || data.secondary || '',
                reading: data.reading || '',
                metadata: {
                  textbook: data.textbook,
                  lesson: data.lesson,
                  partOfSpeech: data.partOfSpeech || []
                }
              },
              
              scheduling: {
                algorithm: AlgorithmType.FSRS,
                dueDate: new Date(data.nextReview),
                nextReviewAt: new Date(data.nextReview),
                interval: data.interval || 1,
                easeFactor: data.easeFactor || 2.5,
                repetitions: data.reviewCount || 0,
                lapses: data.lapses || 0,
                state: data.state || ReviewState.LEARNING,
                lastReviewedAt: data.lastReviewed ? new Date(data.lastReviewed) : undefined
              },
              
              metadata: {
                createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
                lastReviewedAt: data.lastReviewed ? new Date(data.lastReviewed) : undefined,
                lastReviewSource: ReviewSource.TEXTBOOK_VOCAB,
                tags: [`textbook:${data.textbook}`, `lesson:${data.lesson}`],
                properties: {
                  sourceType: data.sourceType,
                  originalData: data.originalData
                }
              },
              
              sync: {
                version: 1,
                lastSyncedAt: new Date(),
                localChanges: false,
                remoteChanges: false,
                conflictStatus: 'none'
              }
            };
          });
        }
      } catch (firebaseError) {
        console.log('📚 Could not fetch from Firebase, falling back to local storage:', firebaseError);
      }
    }
    
    // Fall back to local IndexedDB using TextbookVocabularyService
    const service = new TextbookVocabularyService(params.userId);
    
    // Initialize the service
    await service.init();
    
    const dueItems = await service.getDueItems({ limit: params.limit || 100 });
    
    return dueItems.map(item => ({
      id: `textbook-vocab-${item.id}`,
      sourceId: item.id,
      sourceType: ReviewSource.TEXTBOOK_VOCAB,
      userId: params.userId,
      
      contentType: 'vocabulary' as ContentType,
      content: {
        primary: item.japanese,
        secondary: item.meaning,
        reading: item.reading,
        metadata: {
          textbook: item.textbook,
          lesson: item.lesson,
          exampleSentence: item.exampleSentence,
          exampleTranslation: item.exampleTranslation
        }
      },
      
      scheduling: {
        algorithm: AlgorithmType.FSRS,
        dueDate: item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate),
        nextReviewAt: item.dueDate instanceof Date ? item.dueDate : new Date(item.dueDate),
        interval: item.difficulty || 1,
        easeFactor: item.difficulty || 5,
        repetitions: 0,
        lapses: 0,
        state: ReviewState.NEW,
        lastReviewedAt: undefined
      },
      
      metadata: {
        createdAt: item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt),
        updatedAt: item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt),
        lastReviewedAt: undefined,
        lastReviewSource: ReviewSource.TEXTBOOK_VOCAB,
        tags: [`textbook:${item.textbook}`, `lesson:${item.lesson}`],
        properties: {
          partOfSpeech: item.partOfSpeech,
          audioUrl: item.audioUrl
        }
      },
      
      sync: {
        version: 1,
        lastSyncedAt: new Date(),
        localChanges: false,
        remoteChanges: false,
        conflictStatus: 'none'
      }
    }));
  } catch (error) {
    console.warn('Error fetching Textbook Vocabulary items:', error);
    // Return empty array but don't crash
    return [];
  }
}

/**
 * Connector for Flashcard items from Firebase
 */
export async function getFlashcardItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Query flashcards from Firebase
    const flashcardsRef = collection(db, 'users', params.userId, 'flashcards');
    const q = query(
      flashcardsRef,
      where('nextReview', '<=', new Date()),
      orderBy('nextReview', 'asc'),
      limit(params.limit || 100)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: `flashcard-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.FLASHCARDS,
        userId: params.userId,
        
        contentType: 'flashcard' as ContentType,
        content: {
          primary: data.front,
          secondary: data.back,
          reading: data.reading,
          metadata: {
            deck: data.deck,
            tags: data.tags
          }
        },
        
        scheduling: {
          algorithm: AlgorithmType.SM2,
          dueDate: data.nextReview?.toDate() || new Date(),
          nextReviewAt: data.nextReview?.toDate() || new Date(),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.repetitions || 0,
          lapses: data.lapses || 0,
          state: data.state || ReviewState.NEW,
          lastReviewedAt: data.lastReview?.toDate()
        },
        
        metadata: {
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastReviewedAt: data.lastReview?.toDate(),
          lastReviewSource: ReviewSource.FLASHCARDS,
          tags: data.tags || [],
          properties: {
            deck: data.deck,
            reversible: data.reversible
          }
        },
        
        sync: {
          version: data.version || 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false,
          conflictStatus: 'none'
        }
      };
    });
  } catch (error) {
    console.error('Error fetching Flashcard items:', error);
    return [];
  }
}

/**
 * Connector for Study List items from Firebase
 */
export async function getStudyListItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Query study lists from Firebase
    const listsRef = collection(db, 'users', params.userId, 'studyLists');
    const listsSnapshot = await getDocs(listsRef);
    
    const allItems: UnifiedReviewItem[] = [];
    
    for (const listDoc of listsSnapshot.docs) {
      const listData = listDoc.data();
      const itemsRef = collection(db, 'users', params.userId, 'studyLists', listDoc.id, 'items');
      const itemsQuery = query(
        itemsRef,
        where('nextReview', '<=', new Date()),
        orderBy('nextReview', 'asc'),
        limit(params.limit ? Math.floor(params.limit / listsSnapshot.size) : 20)
      );
      
      const itemsSnapshot = await getDocs(itemsQuery);
      
      const items = itemsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: `study-list-${listDoc.id}-${doc.id}`,
          sourceId: doc.id,
          sourceType: ReviewSource.VOCABULARY_PAGE,
          userId: params.userId,
          
          contentType: 'vocabulary' as ContentType,
          content: {
            primary: data.word,
            secondary: data.meaning,
            reading: data.reading,
            metadata: {
              listName: listData.name,
              listId: listDoc.id
            }
          },
          
          scheduling: {
            algorithm: AlgorithmType.SIMPLE,
            dueDate: data.nextReview?.toDate() || new Date(),
            nextReviewAt: data.nextReview?.toDate() || new Date(),
            interval: data.interval || 1,
            easeFactor: 2.5,
            repetitions: data.reviews || 0,
            lapses: 0,
            state: data.mastered ? ReviewState.GRADUATED : ReviewState.LEARNING,
            lastReviewedAt: data.lastReview?.toDate()
          },
          
          metadata: {
            createdAt: data.addedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            lastReviewedAt: data.lastReview?.toDate(),
            lastReviewSource: ReviewSource.VOCABULARY_PAGE,
            tags: [`list:${listData.name}`],
            properties: {
              listId: listDoc.id,
              listName: listData.name
            }
          },
          
          sync: {
            version: 1,
            lastSyncedAt: new Date(),
            localChanges: false,
            remoteChanges: false,
            conflictStatus: 'none'
          }
        };
      });
      
      allItems.push(...items);
    }
    
    return allItems;
  } catch (error) {
    console.error('Error fetching Study List items:', error);
    return [];
  }
}

/**
 * Connector for Drill Practice items
 */
export async function getDrillPracticeItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    // Drills are typically session-based, not spaced repetition
    // Return items that haven't been practiced today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Query drill history from Firebase
    if (!params.userId) return [];
    
    const drillsRef = collection(db, 'users', params.userId, 'drillHistory');
    const q = query(
      drillsRef,
      where('lastPracticed', '<', today),
      limit(params.limit || 50)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: `drill-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.DRILL_PRACTICE,
        userId: params.userId,
        
        contentType: data.type === 'conjugation' ? 'sentence' as ContentType : 'vocabulary' as ContentType,
        content: {
          primary: data.content,
          secondary: data.answer,
          reading: data.reading,
          metadata: {
            drillType: data.type,
            difficulty: data.difficulty
          }
        },
        
        scheduling: {
          algorithm: AlgorithmType.SIMPLE,
          dueDate: today,
          nextReviewAt: today,
          interval: 1,
          easeFactor: 2.5,
          repetitions: data.timesCorrect || 0,
          lapses: data.timesWrong || 0,
          state: ReviewState.LEARNING,
          lastReviewedAt: data.lastPracticed?.toDate()
        },
        
        metadata: {
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: new Date(),
          lastReviewedAt: data.lastPracticed?.toDate(),
          lastReviewSource: ReviewSource.DRILL_PRACTICE,
          tags: [`drill:${data.type}`],
          properties: {
            drillType: data.type,
            difficulty: data.difficulty
          }
        },
        
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false,
          conflictStatus: 'none'
        }
      };
    });
  } catch (error) {
    console.error('Error fetching Drill Practice items:', error);
    return [];
  }
}

/**
 * Connector for Hiragana/Katakana practice items
 */
export async function getKanaStudyItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Query kana practice from Firebase
    const kanaRef = collection(db, 'users', params.userId, 'kanaProgress');
    const q = query(
      kanaRef,
      where('nextReview', '<=', new Date()),
      orderBy('nextReview', 'asc'),
      limit(params.limit || 50)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: `kana-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.KANA_STUDY,
        userId: params.userId,
        
        contentType: 'kana' as ContentType,
        content: {
          primary: data.character,  // The kana character (あ, カ, etc.)
          secondary: data.romaji,   // Romaji (a, ka, etc.)
          reading: data.type,       // 'hiragana' or 'katakana'
          metadata: {
            type: data.type,
            strokeOrder: data.strokeOrder,
            examples: data.examples
          }
        },
        
        scheduling: {
          algorithm: AlgorithmType.SIMPLE,
          dueDate: data.nextReview?.toDate() || new Date(),
          nextReviewAt: data.nextReview?.toDate() || new Date(),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.practiceCount || 0,
          lapses: data.mistakes || 0,
          state: data.mastered ? ReviewState.GRADUATED : ReviewState.LEARNING,
          lastReviewedAt: data.lastPracticed?.toDate()
        },
        
        metadata: {
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastReviewedAt: data.lastPracticed?.toDate(),
          lastReviewSource: ReviewSource.KANA_STUDY,
          tags: [`type:${data.type}`],
          properties: {
            accuracy: data.accuracy,
            speed: data.averageSpeed,
            practiceCount: data.practiceCount
          }
        },
        
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false,
          conflictStatus: 'none'
        }
      };
    });
  } catch (error) {
    console.error('Error fetching Kana Study items:', error);
    return [];
  }
}

/**
 * Connector for Vocabulary page lookup items
 * Tracks words that users have looked up but not yet mastered
 */
export async function getVocabularyLookupItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Query vocabulary lookups from Firebase
    const lookupsRef = collection(db, 'users', params.userId, 'vocabularyLookups');
    const q = query(
      lookupsRef,
      where('needsReview', '==', true),
      where('nextReview', '<=', new Date()),
      orderBy('nextReview', 'asc'),
      limit(params.limit || 50)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: `vocab-lookup-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.VOCABULARY_PAGE,
        userId: params.userId,
        
        contentType: 'vocabulary' as ContentType,
        content: {
          primary: data.word,        // Japanese word
          secondary: data.meaning,   // English meaning
          reading: data.reading,     // Hiragana reading
          metadata: {
            jlptLevel: data.jlptLevel,
            frequency: data.frequency,
            partOfSpeech: data.partOfSpeech,
            exampleSentence: data.exampleSentence,
            lookupCount: data.lookupCount,
            sourceContext: data.sourceContext  // Where they looked it up from
          }
        },
        
        scheduling: {
          algorithm: AlgorithmType.SM2,
          dueDate: data.nextReview?.toDate() || new Date(),
          nextReviewAt: data.nextReview?.toDate() || new Date(),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.reviewCount || 0,
          lapses: data.failureCount || 0,
          state: determineVocabState(data),
          lastReviewedAt: data.lastReviewed?.toDate()
        },
        
        metadata: {
          createdAt: data.firstLookup?.toDate() || new Date(),
          updatedAt: data.lastLookup?.toDate() || new Date(),
          lastReviewedAt: data.lastReviewed?.toDate(),
          lastReviewSource: ReviewSource.VOCABULARY_PAGE,
          tags: [
            `jlpt:${data.jlptLevel || 'unknown'}`,
            `lookups:${data.lookupCount}`,
            data.bookmarked && 'bookmarked'
          ].filter(Boolean) as string[],
          properties: {
            lookupCount: data.lookupCount,
            bookmarked: data.bookmarked,
            confidence: data.confidence,
            sourceContext: data.sourceContext
          }
        },
        
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false,
          conflictStatus: 'none'
        }
      };
    });
  } catch (error) {
    console.error('Error fetching Vocabulary Lookup items:', error);
    return [];
  }
}

/**
 * Connector for Saved Items from various parts of the app
 * These are items users explicitly save for later study
 */
export async function getSavedItemsReviewItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Query saved items from Firebase
    const savedRef = collection(db, 'users', params.userId, 'savedItems');
    const q = query(
      savedRef,
      where('archived', '!=', true),  // Exclude archived items
      where('nextReview', '<=', new Date()),
      orderBy('nextReview', 'asc'),
      limit(params.limit || 50)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: `saved-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.SAVED_ITEMS,
        userId: params.userId,
        
        contentType: data.itemType as ContentType, // Could be 'kanji', 'vocabulary', 'sentence', etc.
        content: {
          primary: data.content,        // Main content (word, kanji, sentence)
          secondary: data.meaning,      // Translation/meaning
          reading: data.reading,        // Pronunciation
          metadata: {
            source: data.savedFrom,     // Where it was saved from
            category: data.category,    // User-defined category
            notes: data.userNotes,      // Personal notes
            tags: data.tags,
            originalContext: data.context,
            savedDate: data.savedAt
          }
        },
        
        scheduling: {
          algorithm: AlgorithmType.SM2,
          dueDate: data.nextReview?.toDate() || new Date(),
          nextReviewAt: data.nextReview?.toDate() || new Date(),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.reviewCount || 0,
          lapses: data.mistakeCount || 0,
          state: determineSavedItemState(data),
          lastReviewedAt: data.lastReviewed?.toDate()
        },
        
        metadata: {
          createdAt: data.savedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastReviewedAt: data.lastReviewed?.toDate(),
          lastReviewSource: ReviewSource.SAVED_ITEMS,
          tags: [
            ...(data.tags || []),
            `category:${data.category || 'uncategorized'}`,
            `source:${data.savedFrom}`,
            data.starred && 'starred'
          ].filter(Boolean) as string[],
          properties: {
            starred: data.starred || false,
            category: data.category,
            savedFrom: data.savedFrom,
            reviewPriority: data.priority || 'normal',
            userNotes: data.userNotes
          }
        },
        
        sync: {
          version: 1,
          lastSyncedAt: new Date(),
          localChanges: false,
          remoteChanges: false,
          conflictStatus: 'none'
        }
      };
    });
  } catch (error) {
    console.error('Error fetching Saved Items:', error);
    return [];
  }
}

/**
 * Helper function to determine saved item state
 */
function determineSavedItemState(data: any): ReviewState {
  if (data.reviewCount === 0) return ReviewState.NEW;
  if (data.mastered || (data.reviewCount > 10 && data.mistakeCount === 0)) return ReviewState.GRADUATED;
  if (data.mistakeCount > data.reviewCount * 0.3) return ReviewState.RELEARNING;
  return ReviewState.LEARNING;
}

/**
 * Helper function to determine vocabulary state based on lookup data
 */
function determineVocabState(data: any): ReviewState {
  if (data.reviewCount === 0) return ReviewState.NEW;
  if (data.confidence >= 80 && data.interval > 30) return ReviewState.GRADUATED;
  if (data.failureCount > 2) return ReviewState.RELEARNING;
  return ReviewState.LEARNING;
}

/**
 * Helper function to map FSRS states to ReviewState
 */
function mapFSRSState(fsrsState?: number): ReviewState {
  switch (fsrsState) {
    case 0: return ReviewState.NEW;
    case 1: return ReviewState.LEARNING;
    case 2: return ReviewState.REVIEW;
    case 3: return ReviewState.RELEARNING;
    default: return ReviewState.NEW;
  }
}

/**
 * Main connector function that aggregates from all sources
 */
export async function getAllSourceDueItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  const results = await Promise.allSettled([
    getKanjiMasteryItems(params),
    getTextbookVocabularyItems(params),
    getFlashcardItems(params),
    getStudyListItems(params),
    getDrillPracticeItems(params),
    getKanaStudyItems(params),
    getVocabularyLookupItems(params),
    getSavedItemsReviewItems(params)
  ]);
  
  const allItems: UnifiedReviewItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      console.error('Error fetching from source:', result.reason);
    }
  }
  
  // Sort by due date and apply limit
  const sorted = allItems.sort((a, b) => 
    a.scheduling.dueDate.getTime() - b.scheduling.dueDate.getTime()
  );
  
  if (params.limit) {
    return sorted.slice(params.offset || 0, (params.offset || 0) + params.limit);
  }
  
  return sorted;
}