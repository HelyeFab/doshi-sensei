/**
 * Improved Anki's Spaced Repetition Algorithm (SM-2 variant)
 * 
 * This implementation more closely matches Anki's actual behavior based on
 * the official documentation and source code analysis.
 * 
 * Key improvements:
 * - More accurate interval calculations
 * - Better handling of overdue cards
 * - Configurable parameters matching Anki's settings
 * - Fuzz factor to prevent cards bunching up
 * - Maximum interval enforcement
 */

export interface AnkiSRSData {
  due: Date;              // When the card is due for review
  interval: number;       // Current interval in days
  ease: number;           // Ease factor (default 2.5, min 1.3)
  reviews: number;        // Total number of reviews
  lapses: number;         // Number of times forgotten
  lastReview?: Date;      // Last review timestamp
  status: 'new' | 'learning' | 'review' | 'relearning';
  reps: number;           // Consecutive correct answers in learning phase
  type: number;           // Card type: 0=new, 1=learning, 2=review, 3=relearning
}

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface AnkiConfig {
  // New cards
  newSteps: number[];           // Learning steps in minutes [1, 10]
  graduatingInterval: number;   // Days after graduation (1)
  easyInterval: number;         // Days for easy on new cards (4)
  
  // Reviews
  easyBonus: number;            // Multiplier for easy (1.3)
  intervalModifier: number;     // Global interval modifier (1.0)
  maximumInterval: number;      // Maximum days (36500 = 100 years)
  hardInterval: number;         // Multiplier for hard (1.2)
  
  // Lapses
  lapseSteps: number[];         // Relearning steps in minutes [10]
  newInterval: number;          // Multiplier after lapse (0.0-1.0)
  minimumInterval: number;      // Minimum days after lapse (1)
  leechThreshold: number;       // Number of lapses before leech (8)
  
  // Advanced
  buryRelated: boolean;         // Bury related cards
  maxNewPerDay: number;         // Maximum new cards per day
  maxReviewsPerDay: number;     // Maximum reviews per day
}

export const DEFAULT_ANKI_CONFIG: AnkiConfig = {
  // Anki's actual defaults
  newSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
  
  easyBonus: 1.3,
  intervalModifier: 1.0,
  maximumInterval: 36500,
  hardInterval: 1.2,
  
  lapseSteps: [10],
  newInterval: 0.0,  // Anki default is 0 (full reset)
  minimumInterval: 1,
  leechThreshold: 8,
  
  buryRelated: true,
  maxNewPerDay: 20,
  maxReviewsPerDay: 200
};

export class AnkiSRSImproved {
  private config: AnkiConfig;
  
  constructor(config: Partial<AnkiConfig> = {}) {
    this.config = { ...DEFAULT_ANKI_CONFIG, ...config };
  }
  
  /**
   * Create initial SRS data for a new card
   */
  createInitialData(): AnkiSRSData {
    return {
      due: new Date(),
      interval: 0,
      ease: 2.5,  // Anki's default starting ease
      reviews: 0,
      lapses: 0,
      status: 'new',
      reps: 0,
      type: 0
    };
  }

  /**
   * Calculate the next review data based on rating
   */
  calculateNextReview(
    current: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date = new Date()
  ): AnkiSRSData {
    const updated = { ...current };
    updated.lastReview = reviewTime;
    updated.reviews += 1;

    // Calculate delay (how overdue the card was)
    const delay = this.getDelayDays(current.due, reviewTime);

    switch (current.type) {
      case 0: // New card
        return this.reviewNewCard(updated, rating, reviewTime);
      
      case 1: // Learning card
      case 3: // Relearning card
        return this.reviewLearningCard(updated, rating, reviewTime, delay);
      
      case 2: // Review card
        return this.reviewReviewCard(updated, rating, reviewTime, delay);
      
      default:
        return updated;
    }
  }

  /**
   * Review a new card
   */
  private reviewNewCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date
  ): AnkiSRSData {
    card.type = 1; // Move to learning
    card.status = 'learning';
    
    switch (rating) {
      case 'again':
        card.reps = 0;
        card.due = this.addMinutes(reviewTime, this.config.newSteps[0]);
        break;
      
      case 'hard':
        // Anki doesn't have hard for new cards, treat as again
        card.reps = 0;
        card.due = this.addMinutes(reviewTime, this.config.newSteps[0]);
        break;
      
      case 'good':
        card.reps = 1;
        if (this.config.newSteps.length > 1) {
          card.due = this.addMinutes(reviewTime, this.config.newSteps[1]);
        } else {
          // Graduate immediately
          return this.graduateCard(card, reviewTime, this.config.graduatingInterval);
        }
        break;
      
      case 'easy':
        // Graduate with easy interval
        return this.graduateCard(card, reviewTime, this.config.easyInterval);
    }
    
    return card;
  }

  /**
   * Review a learning/relearning card
   */
  private reviewLearningCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date,
    delay: number
  ): AnkiSRSData {
    const steps = card.type === 3 ? this.config.lapseSteps : this.config.newSteps;
    
    switch (rating) {
      case 'again':
        card.reps = 0;
        if (card.type === 3) {
          card.lapses += 1;
          // Reduce ease more for relearning cards
          card.ease = Math.max(1.3, card.ease - 0.2);
        }
        card.due = this.addMinutes(reviewTime, steps[0]);
        break;
      
      case 'hard':
        // Repeat current step
        const currentStep = Math.min(card.reps, steps.length - 1);
        card.due = this.addMinutes(reviewTime, steps[currentStep]);
        break;
      
      case 'good':
        card.reps += 1;
        if (card.reps >= steps.length) {
          // Graduate
          if (card.type === 3) {
            // Relearning -> Review
            card.type = 2;
            card.status = 'review';
            // Apply new interval with consideration for delay
            const newInt = Math.max(
              this.config.minimumInterval,
              Math.round(card.interval * this.config.newInterval)
            );
            card.interval = this.constrainInterval(newInt + delay / 4);
            card.due = this.addDays(reviewTime, card.interval);
          } else {
            // Learning -> Review
            return this.graduateCard(card, reviewTime, this.config.graduatingInterval);
          }
        } else {
          // Move to next step
          card.due = this.addMinutes(reviewTime, steps[card.reps]);
        }
        break;
      
      case 'easy':
        if (card.type === 3) {
          // Relearning -> Review with bonus
          card.type = 2;
          card.status = 'review';
          card.interval = this.constrainInterval(Math.max(card.interval, this.config.minimumInterval));
          card.due = this.addDays(reviewTime, card.interval);
        } else {
          // Learning -> Review with easy interval
          return this.graduateCard(card, reviewTime, this.config.easyInterval);
        }
        break;
    }
    
    return card;
  }

  /**
   * Review a review card (main algorithm)
   */
  private reviewReviewCard(
    card: AnkiSRSData,
    rating: ReviewRating,
    reviewTime: Date,
    delay: number
  ): AnkiSRSData {
    // Apply delay factor for overdue cards
    const delayFactor = Math.min(2, 1 + delay / card.interval);
    
    switch (rating) {
      case 'again':
        // Move to relearning
        card.lapses += 1;
        card.type = 3;
        card.status = 'relearning';
        card.reps = 0;
        
        // Reduce ease
        card.ease = Math.max(1.3, card.ease - 0.2);
        
        // Reset or reduce interval
        if (this.config.newInterval === 0) {
          card.interval = 1;
        } else {
          card.interval = Math.max(
            this.config.minimumInterval,
            Math.round(card.interval * this.config.newInterval)
          );
        }
        
        card.due = this.addMinutes(reviewTime, this.config.lapseSteps[0]);
        break;
      
      case 'hard':
        // Reduce ease slightly
        card.ease = Math.max(1.3, card.ease - 0.15);
        
        // Calculate new interval
        const hardInterval = card.interval * this.config.hardInterval * this.config.intervalModifier;
        card.interval = this.constrainInterval(
          this.fuzzInterval(Math.max(card.interval + 1, hardInterval * delayFactor))
        );
        card.due = this.addDays(reviewTime, card.interval);
        break;
      
      case 'good':
        // Standard progression
        const goodInterval = (card.interval + delay / 2) * card.ease * this.config.intervalModifier;
        card.interval = this.constrainInterval(
          this.fuzzInterval(Math.max(card.interval + 1, goodInterval))
        );
        card.due = this.addDays(reviewTime, card.interval);
        break;
      
      case 'easy':
        // Increase ease
        card.ease += 0.15;
        
        // Calculate with easy bonus
        const easyInterval = (card.interval + delay) * card.ease * this.config.easyBonus * this.config.intervalModifier;
        card.interval = this.constrainInterval(
          this.fuzzInterval(Math.max(card.interval + 1, easyInterval))
        );
        card.due = this.addDays(reviewTime, card.interval);
        break;
    }
    
    return card;
  }

  /**
   * Graduate a card from learning to review
   */
  private graduateCard(card: AnkiSRSData, reviewTime: Date, interval: number): AnkiSRSData {
    card.type = 2;
    card.status = 'review';
    card.interval = interval;
    card.reps = 0;
    card.due = this.addDays(reviewTime, this.fuzzInterval(interval));
    return card;
  }

  /**
   * Add fuzz to prevent cards bunching up on the same day
   */
  private fuzzInterval(interval: number): number {
    if (interval < 2.5) return interval;
    
    // Anki uses a fuzz range based on interval length
    let fuzz: number;
    if (interval < 7) {
      fuzz = Math.floor(interval * 0.25);
    } else if (interval < 30) {
      fuzz = Math.max(2, Math.floor(interval * 0.15));
    } else {
      fuzz = Math.max(4, Math.floor(interval * 0.05));
    }
    
    // Random fuzz within range
    const minFuzz = -fuzz;
    const maxFuzz = fuzz;
    const randomFuzz = Math.floor(Math.random() * (maxFuzz - minFuzz + 1)) + minFuzz;
    
    return Math.max(1, interval + randomFuzz);
  }

  /**
   * Constrain interval to configured limits
   */
  private constrainInterval(interval: number): number {
    return Math.min(this.config.maximumInterval, Math.max(1, Math.round(interval)));
  }

  /**
   * Get delay in days (how overdue)
   */
  private getDelayDays(due: Date, now: Date): number {
    const diff = now.getTime() - due.getTime();
    return Math.max(0, diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Add minutes to a date
   */
  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }

  /**
   * Helper: Add days to a date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    // Set to start of day + 4 hours (Anki's default)
    result.setHours(4, 0, 0, 0);
    return result;
  }

  /**
   * Get cards due for review
   */
  static getDueCards(cards: AnkiSRSData[], now: Date = new Date()): AnkiSRSData[] {
    return cards.filter(card => card.due <= now);
  }

  /**
   * Check if card is a leech
   */
  isLeech(card: AnkiSRSData): boolean {
    return card.lapses >= this.config.leechThreshold;
  }

  /**
   * Get next review times for preview
   */
  getNextReviewTimes(card: AnkiSRSData): { [key in ReviewRating]: string } {
    const now = new Date();
    const times: { [key in ReviewRating]: string } = {
      again: '',
      hard: '',
      good: '',
      easy: ''
    };

    ['again', 'hard', 'good', 'easy'].forEach(rating => {
      const preview = this.calculateNextReview(card, rating as ReviewRating, now);
      const diff = preview.due.getTime() - now.getTime();
      
      if (diff < 60 * 1000) {
        times[rating as ReviewRating] = '<1m';
      } else if (diff < 60 * 60 * 1000) {
        times[rating as ReviewRating] = `${Math.round(diff / (60 * 1000))}m`;
      } else if (diff < 24 * 60 * 60 * 1000) {
        times[rating as ReviewRating] = `${Math.round(diff / (60 * 60 * 1000))}h`;
      } else {
        times[rating as ReviewRating] = `${Math.round(diff / (24 * 60 * 60 * 1000))}d`;
      }
    });

    return times;
  }

  /**
   * Convert from old format
   */
  static convertFromLegacy(legacyData: any): AnkiSRSData {
    if (legacyData && 'interval' in legacyData && 'ease' in legacyData) {
      const status = legacyData.status || 'review';
      return {
        due: new Date(legacyData.due),
        interval: legacyData.interval,
        ease: Math.max(1.3, legacyData.ease), // Enforce minimum
        reviews: legacyData.reviews || 0,
        lapses: legacyData.lapses || 0,
        lastReview: legacyData.lastReview ? new Date(legacyData.lastReview) : undefined,
        status: status,
        reps: 0,
        type: status === 'new' ? 0 : status === 'learning' ? 1 : status === 'relearning' ? 3 : 2
      };
    }

    const improved = new AnkiSRSImproved();
    return improved.createInitialData();
  }
}