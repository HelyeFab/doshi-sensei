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
  tags?: string[];
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

// Settings Interface
export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
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
