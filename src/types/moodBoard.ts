export interface MoodBoard {
  id: string;
  title: string;
  emoji: string;
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  background: string;
  description: string;
  kanji: KanjiItem[];
}

export interface KanjiItem {
  char: string;
  meaning: string;
  readings: {
    on: string[];
    kun: string[];
  };
  examples: string[];
  difficulty: number; // 1-5
}

export interface BoardProgress {
  boardId: string;
  learnedKanji: string[]; // kanji characters
  completedAt?: Date;
  lastStudied: Date;
  totalKanji: number;
  progressPercentage: number;
}

export interface MoodBoardsProgress {
  [boardId: string]: BoardProgress;
}

// Helper types for component props
export interface MoodBoardCardProps {
  board: MoodBoard;
  progress?: BoardProgress;
  onClick: (boardId: string) => void;
}

export interface KanjiCardProps {
  kanji: KanjiItem;
  isLearned: boolean;
  onToggleLearned: (char: string) => void;
  showBack?: boolean;
}
