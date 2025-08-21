// Sentence types for shadowing practice

export interface Sentence {
  id: string;
  text: string;
  furigana?: string;
  translation?: string;
  source: {
    type: 'article' | 'story' | 'tatoeba';
    id: string;
    title: string;
    url?: string;
  };
  metadata?: {
    difficulty?: string;
    grammar?: string[];
    vocabulary?: string[];
  };
}

export interface SentenceList {
  id: string;
  name: string;
  description?: string;
  sentenceIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string; // Pastel color for the pill
}

export interface SavedSentence {
  id: string;
  sentence: Sentence;
  savedAt: Date;
  listIds: string[]; // Which lists this sentence belongs to
}

export interface SentenceListStats {
  totalLists: number;
  totalSentences: number;
  averageSentencesPerList: number;
}