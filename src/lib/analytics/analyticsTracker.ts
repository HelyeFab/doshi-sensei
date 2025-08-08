import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

// Analytics event types
export type AnalyticsEventType = 
  // Content events
  | 'article_view' | 'article_complete' | 'story_start' | 'story_complete' 
  | 'moodboard_view'
  // Feature events  
  | 'game_start' | 'game_complete' | 'drill_start' | 'drill_complete'
  | 'flashcard_session' | 'flashcard_session_started' | 'flashcard_session_completed' | 'flashcard_undo_used'
  | 'list_created' | 'list_used'
  // Quick Context events
  | 'quick_context_save' | 'quick_context_lookup' | 'quick_context_tts' 
  | 'quick_context_ai' | 'quick_context_copy'
  // Anki events
  | 'anki_set_creation_started' | 'anki_set_creation_completed' | 'anki_set_creation_error'
  | 'anki_import_started' | 'anki_import_completed' | 'anki_import_error'
  // Behavior events
  | 'page_view' | 'feature_discovered' | 'session_start' | 'session_end'
  | 'error_occurred'
  // Conversion events
  | 'limit_reached' | 'upgrade_modal_shown' | 'upgrade_modal_clicked'
  | 'user_registered' | 'subscription_started';

interface AnalyticsEvent {
  type: AnalyticsEventType;
  timestamp: number;
  data: Record<string, any>;
  userType: 'guest' | 'free' | 'premium';
  userId?: string; // Only for registered users
  sessionId: string; // Temporary for guests
  metadata: {
    timezone?: string;
    locale?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    screenSize?: 'small' | 'medium' | 'large';
    browser?: string;
  };
}

interface BatchedEvents {
  events: AnalyticsEvent[];
  lastSync: number;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId: string | null = null;
  private userType: 'guest' | 'free' | 'premium' = 'guest';
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Batching configuration
  private readonly BATCH_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly BATCH_SIZE = 50;
  private readonly MAX_QUEUE_SIZE = 200; // Prevent memory issues

  // Session configuration
  private sessionStartTime: number;
  private lastActivityTime: number;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }

  /**
   * Initialize analytics with user information
   */
  async initialize(userId: string | null, isPremium: boolean): Promise<void> {
    this.userId = userId;
    this.userType = !userId ? 'guest' : isPremium ? 'premium' : 'free';
    this.isInitialized = true;

    // Start session
    this.track('session_start', {
      userType: this.userType,
      timestamp: this.sessionStartTime
    });

    // Start batch timer
    this.startBatchTimer();

    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush(true); // Force sync on page unload
      });
    }

    console.log('📊 [Analytics] Initialized:', {
      userType: this.userType,
      sessionId: this.sessionId,
      userId: this.userId ? 'set' : 'anonymous'
    });
  }

  /**
   * Track an analytics event
   */
  track(type: AnalyticsEventType, data: Record<string, any> = {}): void {
    if (!this.isInitialized) {
      console.warn('📊 [Analytics] Not initialized, skipping event:', type);
      return;
    }

    // Update last activity time
    this.lastActivityTime = Date.now();

    // Create event
    const event: AnalyticsEvent = {
      type,
      timestamp: Date.now(),
      data,
      userType: this.userType,
      sessionId: this.sessionId,
      metadata: this.getMetadata()
    };

    // Add userId only for registered users
    if (this.userId) {
      event.userId = this.userId;
    }

    // Add to queue
    this.eventQueue.push(event);

    // Check if we should batch
    if (this.eventQueue.length >= this.BATCH_SIZE) {
      this.flush();
    }

    // Prevent queue overflow
    if (this.eventQueue.length > this.MAX_QUEUE_SIZE) {
      console.warn('📊 [Analytics] Queue overflow, dropping oldest events');
      this.eventQueue = this.eventQueue.slice(-this.MAX_QUEUE_SIZE);
    }

    console.log('📊 [Analytics] Event tracked:', type, {
      queueSize: this.eventQueue.length,
      data
    });
  }

  /**
   * Get device and browser metadata
   */
  private getMetadata(): AnalyticsEvent['metadata'] {
    if (typeof window === 'undefined') return {};

    const metadata: AnalyticsEvent['metadata'] = {};

    // Timezone and locale
    try {
      metadata.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      metadata.locale = navigator.language;
    } catch (e) {
      // Fallback for older browsers
    }

    // Device type
    const width = window.innerWidth;
    if (width < 768) {
      metadata.deviceType = 'mobile';
      metadata.screenSize = 'small';
    } else if (width < 1024) {
      metadata.deviceType = 'tablet';
      metadata.screenSize = 'medium';
    } else {
      metadata.deviceType = 'desktop';
      metadata.screenSize = 'large';
    }

    // Browser detection (simplified)
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) metadata.browser = 'Chrome';
    else if (userAgent.includes('Safari')) metadata.browser = 'Safari';
    else if (userAgent.includes('Firefox')) metadata.browser = 'Firefox';
    else if (userAgent.includes('Edge')) metadata.browser = 'Edge';
    else metadata.browser = 'Other';

    return metadata;
  }

  /**
   * Generate a temporary session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }

      // Check for session timeout
      if (Date.now() - this.lastActivityTime > this.SESSION_TIMEOUT) {
        this.endSession();
      }
    }, this.BATCH_INTERVAL);
  }

  /**
   * End the current session
   */
  private endSession(): void {
    this.track('session_end', {
      duration: Date.now() - this.sessionStartTime,
      eventCount: this.eventQueue.length
    });
    
    this.flush(true);
    
    // Generate new session ID for next activity
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
  }

  /**
   * Flush events to Firebase
   */
  async flush(force: boolean = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // For guests, we only aggregate and never store individual events
    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.syncToFirebase(events);
      // Only log Firebase sync for authenticated users
      if (this.userId && this.userType !== 'guest') {
        console.log(`📊 [Analytics] Flushed ${events.length} events to Firebase`);
      }
    } catch (error) {
      // Only log errors for authenticated users
      if (this.userId && this.userType !== 'guest') {
        console.error('📊 [Analytics] Failed to sync events:', error);
      }
      // Re-queue events on failure (with limit)
      if (this.eventQueue.length < this.MAX_QUEUE_SIZE) {
        this.eventQueue = [...events, ...this.eventQueue].slice(0, this.MAX_QUEUE_SIZE);
      }
    }
  }

  /**
   * Sync aggregated data to Firebase
   */
  private async syncToFirebase(events: AnalyticsEvent[]): Promise<void> {
    // Skip Firebase sync for guest users
    if (!this.userId || this.userType === 'guest') {
      console.log('📊 [Analytics] Skipping Firebase sync for guest user');
      return;
    }
    
    if (!db) {
      console.warn('📊 [Analytics] Firebase not initialized');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const analyticsRef = doc(db, 'site-analytics', today, 'daily', 'aggregated');

    // Aggregate events
    const aggregates = this.aggregateEvents(events);

    try {
      // Use setDoc with merge to create or update
      await setDoc(analyticsRef, {
        ...aggregates,
        lastUpdated: serverTimestamp()
      }, { merge: true });

    } catch (error) {
      console.error('📊 [Analytics] Firebase sync error:', error);
      throw error;
    }
  }

  /**
   * Aggregate events into metrics
   */
  private aggregateEvents(events: AnalyticsEvent[]): Record<string, any> {
    const aggregates: Record<string, any> = {
      summary: {
        totalEvents: increment(events.length),
        guestEvents: increment(events.filter(e => e.userType === 'guest').length),
        freeUserEvents: increment(events.filter(e => e.userType === 'free').length),
        premiumUserEvents: increment(events.filter(e => e.userType === 'premium').length),
      },
      content: {},
      features: {},
      behavior: {},
      conversions: {}
    };

    // Process each event
    events.forEach(event => {
      switch (event.type) {
        // Content events
        case 'article_view':
          aggregates.content[`articles.viewed.${event.data.category || 'uncategorized'}`] = increment(1);
          break;
        case 'article_complete':
          aggregates.content[`articles.completed.${event.data.category || 'uncategorized'}`] = increment(1);
          aggregates.content['articles.totalReadTime'] = increment(event.data.readTime || 0);
          break;
        case 'story_start':
          aggregates.content[`stories.started.${event.data.level || 'unknown'}`] = increment(1);
          break;
        case 'story_complete':
          aggregates.content[`stories.completed.${event.data.level || 'unknown'}`] = increment(1);
          aggregates.content['stories.totalReadTime'] = increment(event.data.readTime || 0);
          break;
        case 'moodboard_view':
          aggregates.content['moodboards.viewed'] = increment(1);
          aggregates.content['moodboards.totalViewTime'] = increment(event.data.viewTime || 0);
          break;

        // Feature events
        case 'game_start':
          aggregates.features[`games.started.${event.data.game || 'unknown'}`] = increment(1);
          break;
        case 'game_complete':
          aggregates.features[`games.completed.${event.data.game || 'unknown'}`] = increment(1);
          if (event.data.score) {
            aggregates.features[`games.totalScore.${event.data.game}`] = increment(event.data.score);
          }
          break;
        case 'drill_start':
          aggregates.features[`drills.started.${event.data.type || 'unknown'}`] = increment(1);
          break;
        case 'drill_complete':
          aggregates.features[`drills.completed.${event.data.type || 'unknown'}`] = increment(1);
          if (event.data.correct && event.data.total) {
            aggregates.features['drills.totalCorrect'] = increment(event.data.correct);
            aggregates.features['drills.totalQuestions'] = increment(event.data.total);
          }
          break;

        // Quick Context events
        case 'quick_context_save':
          aggregates.features['quickContext.saves'] = increment(1);
          break;
        case 'quick_context_lookup':
          aggregates.features['quickContext.lookups'] = increment(1);
          break;
        case 'quick_context_tts':
          aggregates.features['quickContext.tts'] = increment(1);
          break;
        case 'quick_context_ai':
          aggregates.features['quickContext.ai'] = increment(1);
          aggregates.features[`quickContext.ai.${event.data.type || 'unknown'}`] = increment(1);
          break;
        case 'quick_context_copy':
          aggregates.features['quickContext.copies'] = increment(1);
          break;

        // Behavior events
        case 'page_view':
          aggregates.behavior[`pageViews.${event.data.page || 'unknown'}`] = increment(1);
          break;
        case 'feature_discovered':
          aggregates.behavior[`discoveries.${event.data.feature || 'unknown'}`] = increment(1);
          break;
        case 'error_occurred':
          aggregates.behavior[`errors.${event.data.type || 'unknown'}`] = increment(1);
          break;

        // Conversion events
        case 'limit_reached':
          aggregates.conversions[`limitsReached.${event.data.feature || 'unknown'}`] = increment(1);
          break;
        case 'upgrade_modal_shown':
          aggregates.conversions['upgradeModals.shown'] = increment(1);
          aggregates.conversions[`upgradeModals.trigger.${event.data.trigger || 'unknown'}`] = increment(1);
          break;
        case 'upgrade_modal_clicked':
          aggregates.conversions['upgradeModals.clicked'] = increment(1);
          break;
        case 'user_registered':
          aggregates.conversions['registrations.total'] = increment(1);
          aggregates.conversions[`registrations.source.${event.data.fromPage || 'unknown'}`] = increment(1);
          break;
      }

      // Geographic distribution (privacy-preserving)
      if (event.metadata.timezone) {
        const region = this.getRegionFromTimezone(event.metadata.timezone);
        aggregates.behavior[`regions.${region}`] = increment(1);
      }

      // Device tracking
      if (event.metadata.deviceType) {
        aggregates.behavior[`devices.${event.metadata.deviceType}`] = increment(1);
      }
    });

    return aggregates;
  }

  /**
   * Get region from timezone (privacy-preserving)
   */
  private getRegionFromTimezone(timezone: string): string {
    if (timezone.includes('America')) return 'americas';
    if (timezone.includes('Europe')) return 'europe';
    if (timezone.includes('Africa')) return 'africa';
    if (timezone.includes('Asia')) return 'asia';
    if (timezone.includes('Australia') || timezone.includes('Pacific')) return 'oceania';
    return 'unknown';
  }

  /**
   * Helper methods for common tracking scenarios
   */
  
  trackPageView(page: string): void {
    this.track('page_view', { page });
  }

  trackArticleView(category: string, articleId?: string): void {
    this.track('article_view', { category, articleId });
  }

  trackArticleComplete(category: string, readTime: number, articleId?: string): void {
    this.track('article_complete', { category, readTime, articleId });
  }

  trackGameComplete(game: string, score: number, accuracy?: number): void {
    this.track('game_complete', { game, score, accuracy });
  }

  trackDrillComplete(type: string, correct: number, total: number): void {
    this.track('drill_complete', { type, correct, total });
  }

  trackLimitReached(feature: string): void {
    this.track('limit_reached', { feature });
  }

  trackUpgradeModalShown(trigger: string, feature?: string): void {
    this.track('upgrade_modal_shown', { trigger, feature });
  }

  trackError(type: string, message: string): void {
    this.track('error_occurred', { type, message });
  }
}

// Export singleton instance
export const analyticsTracker = AnalyticsTracker.getInstance();

// Export types
export type { AnalyticsEvent };
