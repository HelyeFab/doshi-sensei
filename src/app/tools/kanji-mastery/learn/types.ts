// Types for the 3-round kanji learning system

export interface KanjiWithExamples {
  kanji: string;
  meaning: string;
  onyomi: string[];
  kunyomi: string[];
  jlpt?: string;
  grade?: number;
  strokes?: number;
  examples?: Array<{
    word: string;
    reading: string;
    meaning: string;
  }>;
  sentences?: Array<{
    japanese: string;
    english: string;
  }>;
}

export type TestType = 'meaning' | 'kun' | 'on';
export type UserRating = 1 | 3 | 4 | 5; // Again, Hard, Good, Easy

export interface TestResult {
  questionType: TestType;
  wasCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
}

export interface KanjiProgress {
  kanjiId: string;
  round1Completed: boolean;
  round2Results: TestResult[];
  round2Accuracy: number; // 0-100 percentage
  round3Rating?: UserRating;
}

export interface SessionState {
  kanji: KanjiWithExamples[];
  currentRound: 1 | 2 | 3;
  currentIndex: number;
  progress: Map<string, KanjiProgress>;
  reviewAgainPile: Set<string>; // Kanji that were wrong in round 2
  sessionId: string;
  startTime: Date;
}

export interface MultipleChoiceQuestion {
  kanji: string;
  questionType: TestType;
  question: string;
  options: string[];
  correctAnswer: string;
  correctIndex: number;
}