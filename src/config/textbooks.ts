// Centralized configuration for textbook vocabulary feature
export const TEXTBOOK_CONFIG = {
  // Available textbooks
  textbooks: {
    genki: {
      id: 'genki',
      name: 'Genki',
      edition: '3rd',
      lessons: 23,
      description: 'Popular beginner Japanese textbook series',
    },
    'minna-no-nihongo': {
      id: 'minna-no-nihongo',
      name: 'Minna no Nihongo',
      edition: '2nd',
      lessons: 50,
      description: 'Comprehensive Japanese learning textbook',
    },
  },

  // JLPT levels available
  jlptLevels: ['N5', 'N4', 'N3', 'N2', 'N1'] as const,

  // Theme categories
  themes: [
    'all',
    'numbers',
    'time',
    'family',
    'school',
    'food',
    'transportation',
    'shopping',
    'weather',
    'hobbies',
    'work',
    'health',
    'travel',
    'culture',
    'technology',
    'nature',
  ] as const,

  // Premium content limits
  premiumLimits: {
    // Free users can only access first 2 lessons
    freeUserMaxLesson: 2,
    // Daily review limit for free users
    freeUserDailyReviews: 20,
    // Maximum cards per study session for free users
    freeUserMaxCardsPerSession: 30,
  },

  // Study session configuration
  studySession: {
    defaultCardsPerSession: 20,
    minCardsPerSession: 5,
    maxCardsPerSession: 100,
    // Time in milliseconds before a card is considered "not known"
    cardTimeoutMs: 10000,
  },

  // Spaced repetition intervals (in days)
  spacedRepetition: {
    intervals: {
      again: 0, // Same day
      hard: 1,  // Next day
      good: 3,  // 3 days
      easy: 7,  // 1 week
    },
    // Golden time is when cards are due within this many hours
    goldenTimeHours: 4,
  },

  // UI Configuration
  ui: {
    // Animation durations in ms
    animations: {
      cardFlip: 300,
      cardTransition: 200,
      fadeIn: 150,
    },
    // Grid layout
    grid: {
      columnsDesktop: 4,
      columnsTablet: 3,
      columnsMobile: 2,
    },
  },
} as const;

// Type exports for better TypeScript support
export type TextbookId = keyof typeof TEXTBOOK_CONFIG.textbooks;
export type JLPTLevel = typeof TEXTBOOK_CONFIG.jlptLevels[number];
export type Theme = typeof TEXTBOOK_CONFIG.themes[number];

// Helper functions
export const isPremiumLesson = (lesson: number): boolean => {
  return lesson > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson;
};

export const getTextbookMetadata = (textbookId: TextbookId) => {
  return TEXTBOOK_CONFIG.textbooks[textbookId];
};

export const getMaxLessonForUser = (isPremium: boolean, textbookId: TextbookId): number => {
  if (isPremium) {
    return TEXTBOOK_CONFIG.textbooks[textbookId].lessons;
  }
  return TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson;
};