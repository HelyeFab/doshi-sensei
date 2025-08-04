export interface WordItem {
  id: string;
  kanji?: string;
  kana: string;
  meaning: string;
  partOfSpeech?: string;
  example?: {
    japanese: string;
    reading?: string;
    english: string;
  };
  audio?: string;
  image?: string;
}

export interface VocabularySet {
  id: string;
  name: string;
  type: 'vocabulary' | 'kanji';
  words: WordItem[];
}

export interface SessionData {
  id: string;
  setId: string;
  words: WordItem[];
  startedAt: Date;
  completedAt: Date | null;
  score: number;
  weakWords: string[];
}

export type SessionPhase = 'selection' | 'exposure' | 'recognition' | 'recall' | 'audio-matching' | 'complete';

export interface RecognitionQuestion {
  type: 'audio' | 'meaning' | 'sentence';
  correctAnswer: string;
  options: string[];
  audioUrl?: string;
  sentence?: string;
}

export interface RecallQuestion {
  type: 'show-english' | 'fill-gap';
  prompt: string;
  correctAnswer: string;
  sentence?: string;
}