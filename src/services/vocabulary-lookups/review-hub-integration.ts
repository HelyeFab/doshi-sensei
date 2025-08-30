/**
 * Vocabulary Lookups Integration with Review Hub
 * Tracks words looked up on the vocabulary page
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, ReviewSource, EventPriority } from '../review-events/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp, getDoc } from 'firebase/firestore';

interface VocabularyLookup {
  word: string;
  reading: string;
  meaning: string;
  jlptLevel?: string;
  frequency?: number;
  partOfSpeech?: string;
  exampleSentence?: string;
  sourceContext?: string; // Where they looked it up from (reading, kanji browser, etc.)
}

export class VocabularyLookupsIntegration {
  private eventBus = getEventBus();
  
  /**
   * Track when a word is looked up on the vocabulary page
   */
  async trackVocabularyLookup(
    vocab: VocabularyLookup,
    userId: string
  ) {
    const vocabId = this.generateVocabId(vocab.word);
    
    // Check if this word has been looked up before
    const lookupRef = doc(db, 'users', userId, 'vocabularyLookups', vocabId);
    const existingDoc = await getDoc(lookupRef);
    const isFirstLookup = !existingDoc.exists();
    const lookupCount = existingDoc.exists() ? (existingDoc.data().lookupCount || 0) + 1 : 1;
    
    // Emit event to Review Hub
    await this.eventBus.emit({
      type: isFirstLookup ? ReviewEventType.ITEM_ADDED : ReviewEventType.ITEM_UPDATED,
      source: ReviewSource.VOCABULARY_PAGE,
      userId,
      data: {
        itemId: vocabId,
        itemType: 'vocabulary',
        content: {
          primary: vocab.word,
          secondary: vocab.meaning,
          reading: vocab.reading
        },
        metadata: {
          lookupCount,
          sourceContext: vocab.sourceContext,
          jlptLevel: vocab.jlptLevel,
          isFirstLookup
        }
      },
      priority: EventPriority.LOW
    });
    
    // Update or create Firebase document
    const now = new Date();
    const nextReview = this.calculateInitialReview(lookupCount);
    
    await setDoc(lookupRef, {
      word: vocab.word,
      reading: vocab.reading,
      meaning: vocab.meaning,
      jlptLevel: vocab.jlptLevel,
      frequency: vocab.frequency,
      partOfSpeech: vocab.partOfSpeech,
      exampleSentence: vocab.exampleSentence,
      sourceContext: vocab.sourceContext,
      
      // Tracking data
      lookupCount,
      firstLookup: isFirstLookup ? serverTimestamp() : existingDoc.data()?.firstLookup,
      lastLookup: serverTimestamp(),
      
      // Review data
      needsReview: true,
      nextReview,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      failureCount: 0,
      confidence: 0,
      bookmarked: existingDoc.data()?.bookmarked || false,
      
      // Timestamps
      createdAt: isFirstLookup ? serverTimestamp() : existingDoc.data()?.createdAt,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  
  /**
   * Track when a looked-up word is reviewed
   */
  async trackVocabularyReview(
    vocabId: string,
    quality: number, // 1-5 scale
    userId: string
  ) {
    const lookupRef = doc(db, 'users', userId, 'vocabularyLookups', vocabId);
    const vocabDoc = await getDoc(lookupRef);
    
    if (!vocabDoc.exists()) return;
    
    const data = vocabDoc.data();
    
    // Emit review event
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_REVIEWED,
      source: ReviewSource.VOCABULARY_PAGE,
      userId,
      data: {
        itemId: vocabId,
        itemType: 'vocabulary',
        quality,
        metadata: {
          word: data.word,
          lookupCount: data.lookupCount,
          reviewCount: data.reviewCount + 1
        }
      },
      priority: EventPriority.NORMAL
    });
    
    // Calculate next review using SM2 algorithm
    const { interval, easeFactor } = this.calculateSM2(
      data.interval || 1,
      data.easeFactor || 2.5,
      quality
    );
    
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    // Update confidence based on quality
    const newConfidence = Math.min(100, (data.confidence || 0) + (quality - 3) * 10);
    
    await updateDoc(lookupRef, {
      lastReviewed: serverTimestamp(),
      nextReview,
      interval,
      easeFactor,
      reviewCount: increment(1),
      failureCount: quality < 3 ? increment(1) : data.failureCount,
      confidence: newConfidence,
      needsReview: quality < 4, // Keep reviewing if quality is low
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Track when a word is bookmarked for later study
   */
  async trackVocabularyBookmark(
    vocabId: string,
    bookmarked: boolean,
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_UPDATED,
      source: ReviewSource.VOCABULARY_PAGE,
      userId,
      data: {
        itemId: vocabId,
        action: bookmarked ? 'bookmarked' : 'unbookmarked',
        timestamp: new Date()
      },
      priority: EventPriority.LOW
    });
    
    const lookupRef = doc(db, 'users', userId, 'vocabularyLookups', vocabId);
    await updateDoc(lookupRef, {
      bookmarked,
      updatedAt: serverTimestamp()
    });
  }
  
  /**
   * Track vocabulary study session
   */
  async trackVocabularySession(
    stats: {
      wordsLookedUp: number;
      wordsReviewed: number;
      averageQuality: number;
      duration: number;
    },
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.SESSION_COMPLETED,
      source: ReviewSource.VOCABULARY_PAGE,
      userId,
      data: {
        wordsLookedUp: stats.wordsLookedUp,
        wordsReviewed: stats.wordsReviewed,
        averageQuality: stats.averageQuality,
        duration: stats.duration,
        timestamp: new Date()
      },
      priority: EventPriority.NORMAL
    });
  }
  
  /**
   * Generate a consistent ID for a vocabulary word
   */
  private generateVocabId(word: string): string {
    // Simple ID generation - could be improved with better normalization
    return word.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龯]/g, '-');
  }
  
  /**
   * Calculate initial review time based on lookup count
   */
  private calculateInitialReview(lookupCount: number): Date {
    const now = new Date();
    
    if (lookupCount === 1) {
      // First lookup - review in 1 day
      now.setDate(now.getDate() + 1);
    } else if (lookupCount < 3) {
      // Multiple lookups - review sooner
      now.setHours(now.getHours() + 12);
    } else {
      // Many lookups - needs immediate review
      now.setHours(now.getHours() + 2);
    }
    
    return now;
  }
  
  /**
   * SM2 algorithm for spaced repetition
   */
  private calculateSM2(
    previousInterval: number,
    previousEaseFactor: number,
    quality: number
  ): { interval: number; easeFactor: number } {
    let easeFactor = previousEaseFactor;
    let interval = previousInterval;
    
    // Update ease factor
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    // Calculate new interval
    if (quality < 3) {
      // Failed - reset interval
      interval = 1;
    } else {
      // Passed - increase interval
      if (previousInterval === 1) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * easeFactor);
      }
    }
    
    return { interval, easeFactor };
  }
}

export const vocabularyLookupsIntegration = new VocabularyLookupsIntegration();