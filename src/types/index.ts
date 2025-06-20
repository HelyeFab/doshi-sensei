// JLPT Levels
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

// Word Types
export type WordType = 'Ichidan' | 'Godan' | 'Irregular' | 'i-adjective' | 'na-adjective' | 'noun' | 'adverb' | 'particle' | 'other';

// Base Japanese Word Interface
export interface JapaneseWord {
  id: string;
  kanji: string;
  kana: string;
  romaji: string;
  meaning: string;
  type: WordType;
  jlpt: JLPTLevel;
  tags: string[];
  // Enhanced fields for vocabulary data
  allKanji?: string[];
  allReadings?: string[];
  katakanaReadings?: string[];
  detailedMeaning?: {
    partOfSpeech: string[];
    glosses: string[];
    examples: string[];
  }[];
  priority?: string;
  examples?: string[];
  frequency?: number;
}

// Conjugation Forms
export interface ConjugationForms {
  // Basic Plain Forms
  present: string;
  past: string;
  negative: string;
  pastNegative: string;
  volitional: string;

  // Polite Forms
  polite: string;
  politePast: string;
  politeNegative: string;
  politePastNegative: string;
  politeVolitional: string;

  // Te-Forms
  teForm: string;
  negativeTeForm: string;
  naiDeForm: string; // ないで form

  // Stems
  masuStem: string;
  negativeStem: string;

  // Imperative Forms
  imperativePlain: string;
  imperativePolite: string;

  // Conditional Forms
  provisional: string;
  provisionalNegative: string;
  conditional: string;
  conditionalNegative: string;

  // Potential Forms
  potential: string;
  potentialNegative: string;
  potentialPast: string;
  potentialPastNegative: string;
  potentialPolite: string;
  potentialPoliteNegative: string;
  potentialPolitePast: string;
  potentialPolitePastNegative: string;

  // Passive Forms
  passive: string;
  passiveNegative: string;
  passivePast: string;
  passivePastNegative: string;
  passivePolite: string;
  passivePoliteNegative: string;
  passivePolitePast: string;
  passivePolitePastNegative: string;

  // Causative Forms
  causative: string;
  causativeNegative: string;
  causativePast: string;
  causativePastNegative: string;
  causativePolite: string;
  causativePoliteNegative: string;
  causativePolitePast: string;
  causativePolitePastNegative: string;

  // Causative Passive Forms
  causativePassive: string;
  causativePassiveNegative: string;
  causativePassivePast: string;
  causativePassivePastNegative: string;
  causativePassivePolite: string;
  causativePassivePoliteNegative: string;
  causativePassivePolitePast: string;
  causativePassivePolitePastNegative: string;

  // Tai Forms (want to do)
  taiForm: string;
  taiFormNegative: string;
  taiFormPast: string;
  taiFormPastNegative: string;

  // Alternative and other forms
  alternativeForm: string;
  adverbialNegative: string;

  // Progressive forms
  progressive?: string;
  progressivePolite?: string;
  progressiveNegative?: string;
  progressivePoliteNegative?: string;

  // Request forms
  request?: string;
  requestNegative?: string;

  // Negative volitional
  volitionalNegative?: string;

  // Colloquial and Classical Forms
  colloquialNegative?: string;
  formalNegative?: string;
  classicalNegative?: string;
}

// Drill Question Interface
export interface DrillQuestion {
  id: string;
  word: JapaneseWord;
  targetForm: keyof ConjugationForms;
  stem: string;
  correctAnswer: string;
  options: string[];
  rule?: string;
}

// API Response Types
export interface JishoAPIResponse {
  meta: {
    status: number;
  };
  data: JishoWord[];
}

export interface JishoWord {
  slug: string;
  is_common: boolean;
  tags: string[];
  jlpt: string[];
  japanese: Array<{
    word?: string;
    reading: string;
  }>;
  senses: Array<{
    english_definitions: string[];
    parts_of_speech: string[];
    tags: string[];
  }>;
}

// Theme and Color Scheme Types
export type ThemeMode = 'dark' | 'light' | 'system';
export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'purple' | 'rose' | 'emerald' | 'amber';

export interface ColorPalette {
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
  };
}

// Settings Interface
export interface AppSettings {
  theme: ThemeMode;
  colorScheme: ColorScheme;
  showRomaji: boolean;
  dailyGoal: number;
  practiceReminders: boolean;
}

// Filter Options
export interface FilterOptions {
  jlptLevel?: JLPTLevel | 'all';
  wordType?: WordType | 'all';
  searchTerm?: string;
}

// Drill Session
export interface DrillSession {
  id: string;
  questions: DrillQuestion[];
  currentQuestionIndex: number;
  score: number;
  completed: boolean;
  startTime: Date;
  endTime?: Date;
}

// Progress Data Types
export interface UserProgress {
  id: string;
  wordId: string;
  correctAnswers: number;
  totalAttempts: number;
  lastReviewed: Date;
  difficulty: 'easy' | 'medium' | 'hard';
  nextReviewDate: Date;
  masteryLevel: number; // 0-100
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  wordsStudied: string[];
  accuracy: number;
  sessionType: 'drill' | 'practice' | 'review';
}

export interface RecentlyViewedWord {
  id: string;
  wordId: string;
  viewedAt: Date;
  context?: string; // Where it was viewed (drill, vocabulary, etc.)
}

// Cached Data Types
export interface CachedVocabularyData {
  id: string;
  jlptLevel: JLPTLevel;
  words: JapaneseWord[];
  cacheDate: Date;
  expiryDate: Date;
}

export interface CachedAPIResponse {
  id: string;
  endpoint: string;
  params: Record<string, any>;
  response: any;
  cacheDate: Date;
  expiryDate: Date;
}

// Unified Study List Types
export type StudyListType = 'drillable' | 'flashcard';
export type StudyItemType = 'word' | 'kanji';

export interface StudyList {
  id: string;
  name: string;
  description?: string;
  type: StudyListType; // 'drillable' for verbs/adjectives, 'flashcard' for all content
  itemIds: string[]; // IDs of words or kanji in this list
  createdAt: Date;
  updatedAt: Date;
  color: string; // Pastel color for the pill
}

export interface SavedStudyItem {
  id: string;
  itemType: StudyItemType; // 'word' or 'kanji'
  word?: JapaneseWord; // Present if itemType is 'word'
  kanji?: Kanji; // Present if itemType is 'kanji'
  savedAt: Date;
  listIds: string[]; // Which lists this item belongs to
}

// Legacy types for backward compatibility (will be removed)
export interface WordList {
  id: string;
  name: string;
  description?: string;
  wordIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
  isConjugable?: boolean;
}

export interface SavedWord {
  id: string;
  word: JapaneseWord;
  savedAt: Date;
  listIds: string[];
}

// Flashcard System Types
export interface FlashcardSession {
  id: string;
  userId: string;
  wordListIds: string[];
  startTime: Date;
  endTime?: Date;
  cardsReviewed: number;
  cardsCorrect: number;
  sessionType: 'review' | 'learn' | 'practice';
  avgResponseTime: number;
}

export interface FlashcardProgress {
  id: string;
  userId: string;
  wordId: string;
  easeFactor: number; // 1.3 - 2.5 (SuperMemo algorithm)
  interval: number; // Days until next review
  repetitions: number; // Number of successful reviews
  nextReviewDate: Date;
  lastReviewDate: Date;
  difficulty: 'learning' | 'reviewing' | 'mastered';
  totalReviews: number;
  correctReviews: number;
  averageResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashcardReview {
  id: string;
  userId: string;
  wordId: string;
  sessionId: string;
  reviewDate: Date;
  responseTime: number; // milliseconds
  quality: 0 | 1 | 2 | 3 | 4 | 5; // SuperMemo quality rating
  wasCorrect: boolean;
  cardType: 'kanji-to-meaning' | 'meaning-to-kanji' | 'reading-recognition';
  previousInterval: number;
  newInterval: number;
}

export type FlashcardType = 'kanji-to-meaning' | 'meaning-to-kanji' | 'reading-recognition';
export type FlashcardQuality = 0 | 1 | 2 | 3 | 4 | 5;

// Kanji System Types
export interface Kanji {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt: JLPTLevel;
}

export interface SavedKanji {
  id: string;
  kanji: Kanji;
  savedAt: Date;
  listIds: string[]; // Which lists this kanji belongs to
}

export interface KanjiByLevel {
  [key: string]: Kanji[];
}

// Kanji List Types (similar to WordList)
export interface KanjiList {
  id: string;
  name: string;
  description?: string;
  kanjiIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string; // Pastel color for the pill
}

// Database Schema
export interface DatabaseSchema {
  settings: AppSettings & { id: string; updatedAt: Date };
  progress: UserProgress;
  studySessions: StudySession;
  recentlyViewed: RecentlyViewedWord;
  vocabularyCache: CachedVocabularyData;
  apiCache: CachedAPIResponse;
  words: JapaneseWord;
  drillSessions: DrillSession;
  // New unified study list system
  studyLists: StudyList;
  savedStudyItems: SavedStudyItem;
  // Legacy types (for backward compatibility)
  wordLists: WordList;
  savedWords: SavedWord;
  flashcardProgress: FlashcardProgress;
  flashcardSessions: FlashcardSession;
  flashcardReviews: FlashcardReview;
  savedKanji: SavedKanji;
  kanjiLists: KanjiList;
}

// IndexedDB Configuration
export interface DatabaseConfig {
  name: string;
  version: number;
  stores: {
    [K in keyof DatabaseSchema]: {
      keyPath: string;
      autoIncrement?: boolean;
      indexes?: Array<{
        name: string;
        keyPath: string | string[];
        unique?: boolean;
      }>;
    };
  };
}
