import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ActivityTypeConfig {
  type: string;
  displayName: string;
  icon: string;
  statsField: string;
  description: string;
  trackingFunction?: string;
  enabled: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityTypesData {
  types: ActivityTypeConfig[];
  lastUpdated: string;
  version: number;
}

// Minimal fallback for critical errors only
const MINIMAL_FALLBACK_TYPES: ActivityTypeConfig[] = [
  {
    type: 'drill',
    displayName: 'Drill Practice',
    icon: '⚡',
    statsField: 'drillsCompleted',
    description: 'Conjugation drill exercises',
    trackingFunction: 'trackDrillCompleted',
    enabled: true,
    sortOrder: 1
  }
];

export class ActivityTypesManager {
  private static instance: ActivityTypesManager;
  private cache: ActivityTypesData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly DOC_PATH = 'admin/activityTypes';

  static getInstance(): ActivityTypesManager {
    if (!ActivityTypesManager.instance) {
      ActivityTypesManager.instance = new ActivityTypesManager();
    }
    return ActivityTypesManager.instance;
  }

  /**
   * Get all activity types from Firebase with caching
   */
  async getActivityTypes(): Promise<ActivityTypesData> {
    // Check cache first
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const docRef = doc(db, this.DOC_PATH);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ActivityTypesData;
        
        // Update cache
        this.cache = data;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
        
        return data;
      } else {
        // Document doesn't exist, initialize with default data
        const initialData = await this.initializeActivityTypes();
        return initialData;
      }
    } catch (error) {
      console.error('Error fetching activity types:', error);
      
      // Return cache if available, otherwise minimal fallback
      if (this.cache) {
        return this.cache;
      }
      
      return {
        types: MINIMAL_FALLBACK_TYPES,
        lastUpdated: new Date().toISOString(),
        version: 1
      };
    }
  }

  /**
   * Initialize activity types in Firebase with comprehensive default data
   */
  async initializeActivityTypes(): Promise<ActivityTypesData> {
    const defaultTypes: ActivityTypeConfig[] = [
      {
        type: 'drill',
        displayName: 'Drill Practice',
        icon: '⚡',
        statsField: 'drillsCompleted',
        description: 'Conjugation drill exercises',
        trackingFunction: 'trackDrillCompleted',
        enabled: true,
        sortOrder: 1,
        createdAt: new Date().toISOString()
      },
      {
        type: 'story',
        displayName: 'Story Reading',
        icon: '📖',
        statsField: 'storiesRead',
        description: 'Story reading sessions',
        trackingFunction: 'trackStoryRead',
        enabled: true,
        sortOrder: 2,
        createdAt: new Date().toISOString()
      },
      {
        type: 'article',
        displayName: 'Article Reading',
        icon: '📰',
        statsField: 'articlesRead',
        description: 'News article reading',
        trackingFunction: 'trackArticleRead',
        enabled: true,
        sortOrder: 3,
        createdAt: new Date().toISOString()
      },
      {
        type: 'kanji',
        displayName: 'Kanji Study',
        icon: '漢',
        statsField: 'kanjiStudySessions',
        description: 'Kanji learning sessions',
        trackingFunction: 'trackKanjiStudy',
        enabled: true,
        sortOrder: 4,
        createdAt: new Date().toISOString()
      },
      {
        type: 'game',
        displayName: 'Games',
        icon: '🎮',
        statsField: 'gamesPlayed',
        description: 'Educational games',
        trackingFunction: 'trackGamePlayed',
        enabled: true,
        sortOrder: 5,
        createdAt: new Date().toISOString()
      },
      {
        type: 'vocab',
        displayName: 'Vocabulary',
        icon: '📝',
        statsField: 'vocabStudied',
        description: 'Vocabulary study',
        trackingFunction: 'trackVocabStudied',
        enabled: true,
        sortOrder: 6,
        createdAt: new Date().toISOString()
      },
      {
        type: 'flashcard',
        displayName: 'Flashcards',
        icon: '/flat-icons/ui/flash-card.svg',
        statsField: 'flashcardsReviewed',
        description: 'Flashcard reviews',
        trackingFunction: 'trackFlashcardReviewed',
        enabled: true,
        sortOrder: 7,
        createdAt: new Date().toISOString()
      },
      {
        type: 'practice',
        displayName: 'Practice Sessions',
        icon: '🎯',
        statsField: 'practiceSessionsCompleted',
        description: 'General practice sessions (kana, verbs)',
        trackingFunction: 'trackPracticeSession',
        enabled: true,
        sortOrder: 8,
        createdAt: new Date().toISOString()
      }
    ];

    const initialData: ActivityTypesData = {
      types: defaultTypes,
      lastUpdated: new Date().toISOString(),
      version: 1
    };

    try {
      await setDoc(doc(db, this.DOC_PATH), initialData);
      
      // Update cache
      this.cache = initialData;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      
      return initialData;
    } catch (error) {
      console.error('Error initializing activity types:', error);
      throw error;
    }
  }

  /**
   * Update activity types in Firebase
   */
  async updateActivityTypes(types: ActivityTypeConfig[]): Promise<void> {
    try {
      const updatedData: ActivityTypesData = {
        types: types.map(type => ({
          ...type,
          updatedAt: new Date().toISOString()
        })),
        lastUpdated: new Date().toISOString(),
        version: (this.cache?.version || 0) + 1
      };

      await setDoc(doc(db, this.DOC_PATH), updatedData);
      
      // Update cache
      this.cache = updatedData;
      this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    } catch (error) {
      console.error('Error updating activity types:', error);
      throw error;
    }
  }

  /**
   * Add a new activity type
   */
  async addActivityType(newType: Omit<ActivityTypeConfig, 'createdAt' | 'updatedAt'>): Promise<void> {
    const currentData = await this.getActivityTypes();
    
    // Check if type already exists
    if (currentData.types.some(t => t.type === newType.type)) {
      throw new Error(`Activity type '${newType.type}' already exists`);
    }

    const newActivityType: ActivityTypeConfig = {
      ...newType,
      sortOrder: newType.sortOrder || currentData.types.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTypes = [...currentData.types, newActivityType];
    await this.updateActivityTypes(updatedTypes);
  }

  /**
   * Update a specific activity type
   */
  async updateActivityType(type: string, updates: Partial<ActivityTypeConfig>): Promise<void> {
    const currentData = await this.getActivityTypes();
    
    const updatedTypes = currentData.types.map(t => 
      t.type === type 
        ? { ...t, ...updates, updatedAt: new Date().toISOString() }
        : t
    );

    if (!updatedTypes.some(t => t.type === type)) {
      throw new Error(`Activity type '${type}' not found`);
    }

    await this.updateActivityTypes(updatedTypes);
  }

  /**
   * Toggle enabled status of an activity type
   */
  async toggleActivityType(type: string): Promise<void> {
    const currentData = await this.getActivityTypes();
    
    const updatedTypes = currentData.types.map(t => 
      t.type === type 
        ? { ...t, enabled: !t.enabled, updatedAt: new Date().toISOString() }
        : t
    );

    await this.updateActivityTypes(updatedTypes);
  }

  /**
   * Delete an activity type
   */
  async deleteActivityType(type: string): Promise<void> {
    const currentData = await this.getActivityTypes();
    
    const updatedTypes = currentData.types.filter(t => t.type !== type);
    
    if (updatedTypes.length === currentData.types.length) {
      throw new Error(`Activity type '${type}' not found`);
    }

    await this.updateActivityTypes(updatedTypes);
  }

  /**
   * Clear cache to force fresh fetch
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get a specific activity type by its type identifier
   */
  async getActivityType(type: string): Promise<ActivityTypeConfig | null> {
    const data = await this.getActivityTypes();
    return data.types.find(t => t.type === type) || null;
  }

  /**
   * Get only enabled activity types
   */
  async getEnabledActivityTypes(): Promise<ActivityTypeConfig[]> {
    const data = await this.getActivityTypes();
    return data.types.filter(t => t.enabled).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }
}

// Export singleton instance
export const activityTypesManager = ActivityTypesManager.getInstance();