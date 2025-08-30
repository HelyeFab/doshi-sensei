/**
 * Mock data source connectors for the Unified Review System
 * Provides sample data for testing the Review Hub functionality
 */

import type { UnifiedReviewItem, ContentType, AlgorithmType, ReviewState } from './types';
import { ReviewSource } from '../review-events/types';

interface SourceConnectorParams {
  userId: string;
  contentTypes?: ContentType[];
  limit?: number;
  offset?: number;
  includeOverdue?: boolean;
}

/**
 * Generate mock Kanji Mastery items
 */
export async function getKanjiMasteryItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  const mockKanji = [
    { character: '食', meanings: ['eat', 'food'], kun: ['た.べる', 'く.う'], on: ['ショク'], grade: 2 },
    { character: '飲', meanings: ['drink'], kun: ['の.む'], on: ['イン'], grade: 3 },
    { character: '見', meanings: ['see', 'look'], kun: ['み.る'], on: ['ケン'], grade: 1 },
    { character: '聞', meanings: ['hear', 'listen'], kun: ['き.く'], on: ['ブン', 'モン'], grade: 2 },
    { character: '話', meanings: ['talk', 'speak'], kun: ['はな.す'], on: ['ワ'], grade: 2 },
  ];

  const now = new Date();
  
  return mockKanji.slice(0, params.limit || 5).map((kanji, index) => ({
    id: `kanji-mastery-${kanji.character}`,
    sourceId: kanji.character,
    sourceType: ReviewSource.KANJI_MASTERY,
    userId: params.userId,
    
    contentType: 'kanji' as ContentType,
    content: {
      primary: kanji.character,
      secondary: kanji.meanings.join(', '),
      reading: kanji.kun.join(', '),
      metadata: {
        onyomi: kanji.on.join(', '),
        grade: kanji.grade,
      }
    },
    
    scheduling: {
      algorithm: 'FSRS' as AlgorithmType,
      dueDate: new Date(now.getTime() - (index * 60000)), // Stagger due times
      nextReviewAt: new Date(now.getTime() - (index * 60000)),
      interval: index + 1,
      easeFactor: 2.5,
      repetitions: index,
      lapses: 0,
      state: index === 0 ? 'NEW' as ReviewState : 'LEARNING' as ReviewState,
      lastReviewedAt: index > 0 ? new Date(now.getTime() - 86400000) : undefined
    },
    
    metadata: {
      createdAt: new Date(now.getTime() - 7 * 86400000),
      updatedAt: new Date(now.getTime() - 86400000),
      lastReviewedAt: index > 0 ? new Date(now.getTime() - 86400000) : undefined,
      lastReviewSource: ReviewSource.KANJI_MASTERY,
      tags: [`grade:${kanji.grade}`, 'jlpt:n5'],
      properties: {}
    },
    
    sync: {
      version: 1,
      lastSyncedAt: now,
      localChanges: false,
      remoteChanges: false,
      conflictStatus: 'none'
    }
  }));
}

/**
 * Generate mock Textbook Vocabulary items
 */
export async function getTextbookVocabularyItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  const mockVocab = [
    { japanese: '食べる', reading: 'たべる', english: 'to eat', lesson: 'Genki L3' },
    { japanese: '飲む', reading: 'のむ', english: 'to drink', lesson: 'Genki L3' },
    { japanese: '見る', reading: 'みる', english: 'to see', lesson: 'Genki L2' },
    { japanese: '聞く', reading: 'きく', english: 'to listen', lesson: 'Genki L2' },
    { japanese: '話す', reading: 'はなす', english: 'to speak', lesson: 'Genki L4' },
  ];

  const now = new Date();
  
  return mockVocab.slice(0, params.limit || 5).map((word, index) => ({
    id: `textbook-vocab-${index}`,
    sourceId: `vocab-${index}`,
    sourceType: ReviewSource.TEXTBOOK_VOCAB,
    userId: params.userId,
    
    contentType: 'vocabulary' as ContentType,
    content: {
      primary: word.japanese,
      secondary: word.english,
      reading: word.reading,
      metadata: {
        lesson: word.lesson,
      }
    },
    
    scheduling: {
      algorithm: 'FSRS' as AlgorithmType,
      dueDate: new Date(now.getTime() + (index * 120000)), // Future due times
      nextReviewAt: new Date(now.getTime() + (index * 120000)),
      interval: index + 2,
      easeFactor: 2.5,
      repetitions: index * 2,
      lapses: 0,
      state: 'LEARNING' as ReviewState,
      lastReviewedAt: new Date(now.getTime() - 43200000)
    },
    
    metadata: {
      createdAt: new Date(now.getTime() - 14 * 86400000),
      updatedAt: new Date(now.getTime() - 43200000),
      lastReviewedAt: new Date(now.getTime() - 43200000),
      lastReviewSource: ReviewSource.TEXTBOOK_VOCAB,
      tags: [word.lesson],
      properties: {}
    },
    
    sync: {
      version: 1,
      lastSyncedAt: now,
      localChanges: false,
      remoteChanges: false,
      conflictStatus: 'none'
    }
  }));
}

/**
 * Generate mock Flashcard items
 */
export async function getFlashcardItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  const mockFlashcards = [
    { front: '日本', back: 'Japan', reading: 'にほん' },
    { front: '学生', back: 'student', reading: 'がくせい' },
    { front: '先生', back: 'teacher', reading: 'せんせい' },
  ];

  const now = new Date();
  
  return mockFlashcards.slice(0, params.limit || 3).map((card, index) => ({
    id: `flashcard-${index}`,
    sourceId: `card-${index}`,
    sourceType: ReviewSource.FLASHCARDS,
    userId: params.userId,
    
    contentType: 'flashcard' as ContentType,
    content: {
      primary: card.front,
      secondary: card.back,
      reading: card.reading,
      metadata: {}
    },
    
    scheduling: {
      algorithm: 'SM2' as AlgorithmType,
      dueDate: now,
      nextReviewAt: now,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      state: 'NEW' as ReviewState,
      lastReviewedAt: undefined
    },
    
    metadata: {
      createdAt: new Date(now.getTime() - 3 * 86400000),
      updatedAt: now,
      lastReviewedAt: undefined,
      lastReviewSource: ReviewSource.FLASHCARDS,
      tags: ['custom-deck'],
      properties: {}
    },
    
    sync: {
      version: 1,
      lastSyncedAt: now,
      localChanges: false,
      remoteChanges: false,
      conflictStatus: 'none'
    }
  }));
}

/**
 * Empty implementations for other sources
 */
export async function getStudyListItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  return [];
}

export async function getDrillPracticeItems(params: SourceConnectorParams): Promise<UnifiedReviewItem[]> {
  return [];
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
    getDrillPracticeItems(params)
  ]);
  
  const allItems: UnifiedReviewItem[] = [];
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }
  
  // Sort by due date
  const sorted = allItems.sort((a, b) => 
    a.scheduling.dueDate.getTime() - b.scheduling.dueDate.getTime()
  );
  
  if (params.limit) {
    return sorted.slice(params.offset || 0, (params.offset || 0) + params.limit);
  }
  
  return sorted;
}