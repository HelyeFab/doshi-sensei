// JLPT Levels
export type JLPTLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

// Word Types
export type WordType = 'Ichidan' | 'Godan' | 'Irregular' | 'i-adjective' | 'na-adjective';

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
  present: string;
  past: string;
  negative: string;
  pastNegative: string;
  polite: string;
  politePast: string;
  politeNegative: string;
  politePastNegative: string;
  teForm?: string;
  potential?: string;
  passive?: string;
  causative?: string;
  conditional?: string;
  volitional?: string;
  imperative?: string;
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
