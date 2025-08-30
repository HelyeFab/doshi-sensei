/**
 * Kana Study Integration with Review Hub
 * Tracks hiragana and katakana practice activities
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, ReviewSource, EventPriority } from '../review-events/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

export class KanaStudyIntegration {
  private eventBus = getEventBus();
  
  /**
   * Track when a kana character is practiced
   */
  async trackKanaPractice(
    character: string,
    type: 'hiragana' | 'katakana',
    correct: boolean,
    responseTime: number,
    userId: string
  ) {
    // Emit event to Review Hub
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_REVIEWED,
      source: ReviewSource.KANA_STUDY,
      userId,
      data: {
        itemId: `${type}-${character}`,
        itemType: 'kana',
        content: {
          primary: character,
          secondary: type
        },
        result: correct ? 'correct' : 'incorrect',
        duration: responseTime,
        metadata: {
          kanaType: type,
          accuracy: correct
        }
      },
      priority: EventPriority.NORMAL
    });
    
    // Update Firebase progress
    const kanaId = `${type}-${character}`;
    const progressRef = doc(db, 'users', userId, 'kanaProgress', kanaId);
    
    const now = new Date();
    const nextReview = this.calculateNextReview(correct, responseTime);
    
    await setDoc(progressRef, {
      character,
      type,
      romaji: this.getRomaji(character),
      practiceCount: increment(1),
      lastPracticed: serverTimestamp(),
      nextReview,
      accuracy: correct ? increment(1) : increment(0),
      totalAttempts: increment(1),
      averageSpeed: responseTime,
      mastered: false, // Will be true after consistent success
      interval: 1,
      easeFactor: 2.5,
      mistakes: correct ? 0 : increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  
  /**
   * Track when a kana practice session starts
   */
  async trackSessionStart(
    type: 'hiragana' | 'katakana' | 'mixed',
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.SESSION_STARTED,
      source: ReviewSource.KANA_STUDY,
      userId,
      data: {
        sessionType: type,
        timestamp: new Date()
      },
      priority: EventPriority.LOW
    });
  }
  
  /**
   * Track when a kana practice session completes
   */
  async trackSessionComplete(
    stats: {
      correct: number;
      incorrect: number;
      averageTime: number;
      kanaType: 'hiragana' | 'katakana' | 'mixed';
    },
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.SESSION_COMPLETED,
      source: ReviewSource.KANA_STUDY,
      userId,
      data: {
        cardsStudied: stats.correct + stats.incorrect,
        cardsCorrect: stats.correct,
        accuracy: (stats.correct / (stats.correct + stats.incorrect)) * 100,
        averageResponseTime: stats.averageTime,
        kanaType: stats.kanaType,
        timestamp: new Date()
      },
      priority: EventPriority.NORMAL
    });
  }
  
  /**
   * Track when a kana character is mastered
   */
  async trackKanaMastered(
    character: string,
    type: 'hiragana' | 'katakana',
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.ACHIEVEMENT_UNLOCKED,
      source: ReviewSource.KANA_STUDY,
      userId,
      data: {
        achievement: 'kana_mastered',
        character,
        type,
        timestamp: new Date()
      },
      priority: EventPriority.HIGH
    });
    
    // Update Firebase to mark as mastered
    const kanaId = `${type}-${character}`;
    const progressRef = doc(db, 'users', userId, 'kanaProgress', kanaId);
    
    await updateDoc(progressRef, {
      mastered: true,
      masteredAt: serverTimestamp()
    });
  }
  
  /**
   * Calculate next review time based on performance
   */
  private calculateNextReview(correct: boolean, responseTime: number): Date {
    const now = new Date();
    
    if (!correct) {
      // Review again soon if incorrect
      now.setMinutes(now.getMinutes() + 10);
    } else if (responseTime < 1000) {
      // Fast and correct - longer interval
      now.setHours(now.getHours() + 24);
    } else if (responseTime < 2000) {
      // Normal speed - moderate interval
      now.setHours(now.getHours() + 6);
    } else {
      // Slow but correct - shorter interval
      now.setHours(now.getHours() + 2);
    }
    
    return now;
  }
  
  /**
   * Get romaji for a kana character
   */
  private getRomaji(character: string): string {
    // Simplified mapping - in production, use a complete mapping table
    const kanaMap: Record<string, string> = {
      'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
      'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
      'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
      'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
      // ... add complete mapping
    };
    
    return kanaMap[character] || character;
  }
}

export const kanaStudyIntegration = new KanaStudyIntegration();