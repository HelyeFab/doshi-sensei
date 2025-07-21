/**
 * Migration utility for transitioning from the current SRS implementation
 * to the improved Anki-accurate algorithm
 */

import { AnkiSRS, AnkiSRSData as OldSRSData } from './ankiSRS';
import { AnkiSRSImproved, AnkiSRSData as NewSRSData } from './ankiSRSImproved';

export class AnkiSRSMigration {
  /**
   * Migrate from old SRS data format to new format
   */
  static migrateData(oldData: OldSRSData): NewSRSData {
    // Map status to type
    let type: number;
    switch (oldData.status) {
      case 'new':
        type = 0;
        break;
      case 'learning':
        type = 1;
        break;
      case 'relearning':
        type = 3;
        break;
      case 'review':
      default:
        type = 2;
        break;
    }

    return {
      due: oldData.due,
      interval: oldData.interval,
      ease: Math.max(1.3, oldData.ease), // Enforce Anki's minimum
      reviews: oldData.reviews,
      lapses: oldData.lapses,
      lastReview: oldData.lastReview,
      status: oldData.status,
      reps: 0, // New field, start at 0
      type: type
    };
  }

  /**
   * Check if data needs migration
   */
  static needsMigration(data: any): boolean {
    return data && !('type' in data) && !('reps' in data);
  }

  /**
   * Batch migrate multiple cards
   */
  static async batchMigrate(
    dataMap: Map<string, OldSRSData>
  ): Promise<Map<string, NewSRSData>> {
    const migrated = new Map<string, NewSRSData>();
    
    for (const [id, oldData] of dataMap) {
      if (this.needsMigration(oldData)) {
        migrated.set(id, this.migrateData(oldData));
      } else {
        // Already migrated or in new format
        migrated.set(id, oldData as any);
      }
    }
    
    return migrated;
  }

  /**
   * Compare algorithms for testing/validation
   */
  static compareAlgorithms(
    card: OldSRSData,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ): {
    old: OldSRSData;
    new: NewSRSData;
    differences: string[];
  } {
    // Calculate with old algorithm
    const oldResult = AnkiSRS.calculateNextReview(card, rating);
    
    // Convert and calculate with new algorithm
    const newCard = this.migrateData(card);
    const srs = new AnkiSRSImproved();
    const newResult = srs.calculateNextReview(newCard, rating);
    
    // Find differences
    const differences: string[] = [];
    
    if (oldResult.interval !== newResult.interval) {
      differences.push(`Interval: ${oldResult.interval} → ${newResult.interval}`);
    }
    
    if (oldResult.ease !== newResult.ease) {
      differences.push(`Ease: ${oldResult.ease.toFixed(2)} → ${newResult.ease.toFixed(2)}`);
    }
    
    const oldDue = oldResult.due.getTime();
    const newDue = newResult.due.getTime();
    if (Math.abs(oldDue - newDue) > 60000) { // More than 1 minute difference
      differences.push(`Due: ${oldResult.due.toISOString()} → ${newResult.due.toISOString()}`);
    }
    
    return {
      old: oldResult,
      new: newResult,
      differences
    };
  }
}