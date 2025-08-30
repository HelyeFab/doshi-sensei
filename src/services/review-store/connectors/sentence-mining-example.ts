/**
 * Example: Sentence Mining Connector
 * 
 * This connector integrates user-collected sentences from reading/watching content
 * Each sentence contains new vocabulary or grammar patterns to review
 */

import type { UnifiedReviewItem, ContentType } from '../types';
import { AlgorithmType, ReviewState } from '../types';
import { ReviewSource } from '../../review-events/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

// Add to ReviewSource enum:
// SENTENCE_MINING = 'sentence_mining'

interface MinedSentence {
  id: string;
  sentence: string;           // Original Japanese sentence
  translation: string;        // English translation
  targetWord: string;         // The word/phrase being learned
  reading: string;           // Furigana for target
  source: string;            // Where it came from (anime, book, etc.)
  context?: string;          // Additional context
  audioUrl?: string;         // Optional audio
  imageUrl?: string;         // Optional screenshot/image
  difficulty: number;        // 1-10 scale
  tags: string[];           // User tags
  
  // Review tracking
  lastReviewed?: Date;
  nextReview: Date;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  lapses: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

interface SentenceMiningParams {
  userId: string;
  contentTypes?: ContentType[];
  limit?: number;
  offset?: number;
  includeOverdue?: boolean;
  sourceFilter?: string[];    // Filter by source (anime, manga, etc.)
  difficultyMax?: number;     // Max difficulty to include
}

/**
 * Connector for Sentence Mining items
 * Fetches sentences that users have collected from immersion content
 */
export async function getSentenceMiningItems(
  params: SentenceMiningParams
): Promise<UnifiedReviewItem[]> {
  try {
    if (!params.userId) return [];
    
    // Build Firebase query
    const sentencesRef = collection(db, 'users', params.userId, 'minedSentences');
    
    // Query for due sentences
    const constraints = [
      where('nextReview', '<=', new Date()),
      orderBy('nextReview', 'asc')
    ];
    
    // Add difficulty filter if specified
    if (params.difficultyMax) {
      constraints.push(where('difficulty', '<=', params.difficultyMax));
    }
    
    // Add limit
    constraints.push(limit(params.limit || 30));
    
    const q = query(sentencesRef, ...constraints);
    const snapshot = await getDocs(q);
    
    // Transform to UnifiedReviewItem format
    return snapshot.docs.map(doc => {
      const data = doc.data() as MinedSentence;
      
      return {
        // Unique identifier
        id: `sentence-mining-${doc.id}`,
        sourceId: doc.id,
        sourceType: ReviewSource.SENTENCE_MINING,
        userId: params.userId,
        
        // Content - sentence as primary, target word as secondary
        contentType: 'sentence' as ContentType,
        content: {
          primary: data.sentence,
          secondary: data.translation,
          reading: data.targetWord,  // The word being learned
          metadata: {
            source: data.source,
            context: data.context,
            audioUrl: data.audioUrl,
            imageUrl: data.imageUrl,
            targetReading: data.reading,
            difficulty: data.difficulty,
            tags: data.tags
          }
        },
        
        // Scheduling using FSRS for optimal spacing
        scheduling: {
          algorithm: AlgorithmType.FSRS,
          dueDate: data.nextReview instanceof Date ? data.nextReview : new Date(data.nextReview),
          nextReviewAt: data.nextReview instanceof Date ? data.nextReview : new Date(data.nextReview),
          interval: data.interval || 1,
          easeFactor: data.easeFactor || 2.5,
          repetitions: data.reviewCount || 0,
          lapses: data.lapses || 0,
          state: determineReviewState(data),
          lastReviewedAt: data.lastReviewed ? 
            (data.lastReviewed instanceof Date ? data.lastReviewed : new Date(data.lastReviewed)) : 
            undefined
        },
        
        // Rich metadata for tracking
        metadata: {
          createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt),
          lastReviewedAt: data.lastReviewed ? 
            (data.lastReviewed instanceof Date ? data.lastReviewed : new Date(data.lastReviewed)) : 
            undefined,
          lastReviewSource: ReviewSource.SENTENCE_MINING,
          tags: [...data.tags, `source:${data.source}`, `difficulty:${data.difficulty}`],
          properties: {
            source: data.source,
            difficulty: data.difficulty,
            hasAudio: !!data.audioUrl,
            hasImage: !!data.imageUrl,
            sentenceLength: data.sentence.length,
            targetWord: data.targetWord
          }
        },
        
        // Sync configuration
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
    console.error('Error fetching Sentence Mining items:', error);
    return [];
  }
}

/**
 * Helper to determine review state based on progress
 */
function determineReviewState(sentence: MinedSentence): ReviewState {
  if (sentence.reviewCount === 0) return ReviewState.NEW;
  if (sentence.lapses > 2) return ReviewState.RELEARNING;
  if (sentence.interval > 21) return ReviewState.GRADUATED;
  return ReviewState.LEARNING;
}

/**
 * Get statistics for sentence mining
 */
export async function getSentenceMiningStats(userId: string) {
  try {
    const sentencesRef = collection(db, 'users', userId, 'minedSentences');
    const snapshot = await getDocs(sentencesRef);
    
    const stats = {
      total: snapshot.size,
      due: 0,
      new: 0,
      learning: 0,
      graduated: 0,
      bySource: {} as Record<string, number>,
      avgDifficulty: 0
    };
    
    const now = new Date();
    let totalDifficulty = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data() as MinedSentence;
      
      // Count due items
      if (new Date(data.nextReview) <= now) {
        stats.due++;
      }
      
      // Count by state
      const state = determineReviewState(data);
      if (state === ReviewState.NEW) stats.new++;
      else if (state === ReviewState.LEARNING) stats.learning++;
      else if (state === ReviewState.GRADUATED) stats.graduated++;
      
      // Count by source
      stats.bySource[data.source] = (stats.bySource[data.source] || 0) + 1;
      
      // Sum difficulty
      totalDifficulty += data.difficulty;
    });
    
    stats.avgDifficulty = stats.total > 0 ? totalDifficulty / stats.total : 0;
    
    return stats;
  } catch (error) {
    console.error('Error getting sentence mining stats:', error);
    return null;
  }
}

/**
 * Integration class for tracking sentence mining events
 */
export class SentenceMiningIntegration {
  private eventBus: any; // Import actual EventBus type
  
  constructor() {
    // Initialize with event bus
    // this.eventBus = getEventBus();
  }
  
  /**
   * Track when a sentence is reviewed
   */
  async trackReview(sentenceId: string, quality: number, userId: string) {
    // Emit review event
    await this.eventBus?.emit({
      type: 'ITEM_REVIEWED',
      source: 'SENTENCE_MINING',
      userId,
      data: {
        itemId: sentenceId,
        itemType: 'sentence',
        quality,
        timestamp: new Date()
      },
      priority: 1
    });
  }
  
  /**
   * Track when a new sentence is mined
   */
  async trackNewSentence(sentence: string, source: string, userId: string) {
    await this.eventBus?.emit({
      type: 'ITEM_ADDED',
      source: 'SENTENCE_MINING',
      userId,
      data: {
        sentence,
        source,
        timestamp: new Date()
      },
      priority: 0
    });
  }
  
  /**
   * Track mining session completion
   */
  async trackMiningSession(stats: any, userId: string) {
    await this.eventBus?.emit({
      type: 'SESSION_COMPLETED',
      source: 'SENTENCE_MINING',
      userId,
      data: {
        sentencesAdded: stats.added,
        sentencesReviewed: stats.reviewed,
        duration: stats.duration,
        timestamp: new Date()
      },
      priority: 1
    });
  }
}

// Export singleton instance
export const sentenceMiningIntegration = new SentenceMiningIntegration();