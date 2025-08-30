/**
 * Saved Items Integration with Review Hub
 * Tracks items users save from various parts of the app for later study
 */

import { getEventBus } from '../review-events/EventBus';
import { ReviewEventType, ReviewSource, EventPriority } from '../review-events/types';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';

interface SavedItem {
  content: string;           // The actual content (kanji, word, sentence)
  meaning: string;          // English meaning/translation
  reading?: string;         // Pronunciation/reading
  itemType: 'kanji' | 'vocabulary' | 'sentence' | 'phrase' | 'grammar';
  savedFrom: string;        // Source page/feature
  context?: string;         // Original context where it appeared
  category?: string;        // User-defined category
  tags?: string[];         // User tags
  userNotes?: string;      // Personal notes
  priority?: 'low' | 'normal' | 'high';
  starred?: boolean;       // Special importance
}

export class SavedItemsIntegration {
  private eventBus = getEventBus();
  
  /**
   * Track when an item is saved for later study
   */
  async trackItemSaved(
    item: SavedItem,
    userId: string
  ): Promise<string> {
    // Create a new saved item document
    const savedItemsRef = collection(db, 'users', userId, 'savedItems');
    const docRef = await addDoc(savedItemsRef, {
      ...item,
      savedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Review scheduling
      nextReview: this.calculateInitialReview(item.priority),
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      mistakeCount: 0,
      lastReviewed: null,
      
      // Status
      archived: false,
      mastered: false,
      starred: item.starred || false
    });
    
    // Emit event to Review Hub
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_ADDED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        itemId: docRef.id,
        itemType: item.itemType,
        content: {
          primary: item.content,
          secondary: item.meaning,
          reading: item.reading
        },
        metadata: {
          savedFrom: item.savedFrom,
          category: item.category,
          priority: item.priority,
          starred: item.starred
        }
      },
      priority: EventPriority.LOW
    });
    
    return docRef.id;
  }
  
  /**
   * Track when a saved item is reviewed
   */
  async trackItemReviewed(
    itemId: string,
    quality: number, // 1-5 scale
    userId: string
  ) {
    const itemRef = doc(db, 'users', userId, 'savedItems', itemId);
    
    // Calculate next review using SM2
    const { interval, easeFactor } = this.calculateSM2(1, 2.5, quality);
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);
    
    // Update the item
    await updateDoc(itemRef, {
      lastReviewed: serverTimestamp(),
      nextReview,
      interval,
      easeFactor,
      reviewCount: increment(1),
      mistakeCount: quality < 3 ? increment(1) : increment(0),
      updatedAt: serverTimestamp()
    });
    
    // Emit review event
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_REVIEWED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        itemId,
        itemType: 'saved_item',
        quality,
        metadata: {
          interval,
          easeFactor
        }
      },
      priority: EventPriority.NORMAL
    });
  }
  
  /**
   * Track when an item is starred/unstarred
   */
  async trackItemStarred(
    itemId: string,
    starred: boolean,
    userId: string
  ) {
    const itemRef = doc(db, 'users', userId, 'savedItems', itemId);
    
    await updateDoc(itemRef, {
      starred,
      updatedAt: serverTimestamp()
    });
    
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_UPDATED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        itemId,
        action: starred ? 'starred' : 'unstarred',
        timestamp: new Date()
      },
      priority: EventPriority.LOW
    });
  }
  
  /**
   * Track when an item is archived
   */
  async trackItemArchived(
    itemId: string,
    archived: boolean,
    userId: string
  ) {
    const itemRef = doc(db, 'users', userId, 'savedItems', itemId);
    
    await updateDoc(itemRef, {
      archived,
      archivedAt: archived ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });
    
    await this.eventBus.emit({
      type: archived ? ReviewEventType.ITEM_REMOVED : ReviewEventType.ITEM_ADDED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        itemId,
        action: archived ? 'archived' : 'unarchived',
        timestamp: new Date()
      },
      priority: EventPriority.LOW
    });
  }
  
  /**
   * Track when an item is marked as mastered
   */
  async trackItemMastered(
    itemId: string,
    userId: string
  ) {
    const itemRef = doc(db, 'users', userId, 'savedItems', itemId);
    
    await updateDoc(itemRef, {
      mastered: true,
      masteredAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await this.eventBus.emit({
      type: ReviewEventType.ACHIEVEMENT_UNLOCKED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        achievement: 'item_mastered',
        itemId,
        timestamp: new Date()
      },
      priority: EventPriority.HIGH
    });
  }
  
  /**
   * Track bulk operations (e.g., adding multiple items at once)
   */
  async trackBulkSave(
    items: SavedItem[],
    source: string,
    userId: string
  ) {
    const savedIds: string[] = [];
    
    // Save all items
    for (const item of items) {
      const id = await this.trackItemSaved(item, userId);
      savedIds.push(id);
    }
    
    // Emit bulk operation event
    await this.eventBus.emit({
      type: ReviewEventType.ITEM_ADDED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        action: 'bulk_save',
        count: items.length,
        source,
        itemIds: savedIds,
        timestamp: new Date()
      },
      priority: EventPriority.NORMAL
    });
    
    return savedIds;
  }
  
  /**
   * Track study session for saved items
   */
  async trackStudySession(
    stats: {
      itemsReviewed: number;
      correctAnswers: number;
      duration: number;
      categories?: string[];
    },
    userId: string
  ) {
    await this.eventBus.emit({
      type: ReviewEventType.SESSION_COMPLETED,
      source: ReviewSource.SAVED_ITEMS,
      userId,
      data: {
        itemsReviewed: stats.itemsReviewed,
        correctAnswers: stats.correctAnswers,
        accuracy: (stats.correctAnswers / stats.itemsReviewed) * 100,
        duration: stats.duration,
        categories: stats.categories,
        timestamp: new Date()
      },
      priority: EventPriority.NORMAL
    });
  }
  
  /**
   * Calculate initial review time based on priority
   */
  private calculateInitialReview(priority?: 'low' | 'normal' | 'high'): Date {
    const now = new Date();
    
    switch (priority) {
      case 'high':
        now.setHours(now.getHours() + 4);
        break;
      case 'low':
        now.setDate(now.getDate() + 3);
        break;
      case 'normal':
      default:
        now.setDate(now.getDate() + 1);
        break;
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
    
    easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    
    if (quality < 3) {
      interval = 1;
    } else {
      if (previousInterval === 1) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * easeFactor);
      }
    }
    
    return { interval, easeFactor };
  }
}

export const savedItemsIntegration = new SavedItemsIntegration();