// Centralized configuration for textbook vocabulary feature
export const TEXTBOOK_CONFIG = {
  // Available textbooks with metadata
  textbooks: {
    'genki-1': {
      id: 'genki-1',
      name: 'Genki',
      title: 'Genki 1',
      edition: '3rd',
      lessons: 12,
      lessonOffset: 0,
      color: 'from-pink-400 to-purple-500',
      description: 'Popular beginner Japanese textbook series',
    },
    'genki-2-complete': {
      id: 'genki-2-complete',
      name: 'Genki',
      title: 'Genki 2 (Complete)',
      edition: '3rd',
      lessons: 11,
      lessonOffset: 12,
      color: 'from-purple-400 to-indigo-500',
      description: 'Popular beginner Japanese textbook series - Complete Edition',
    },
    'minna-1': {
      id: 'minna-1',
      name: 'Minna no Nihongo',
      title: 'Minna no Nihongo 1',
      edition: '2nd',
      lessons: 25,
      lessonOffset: 0,
      color: 'from-green-400 to-teal-500',
      description: 'Comprehensive Japanese learning textbook',
    },
    'minna-2': {
      id: 'minna-2',
      name: 'Minna no Nihongo',
      title: 'Minna no Nihongo 2',
      edition: '2nd',
      lessons: 25,
      lessonOffset: 0,
      color: 'from-teal-400 to-blue-500',
      description: 'Comprehensive Japanese learning textbook',
    },
    'kaishi-15k': {
      id: 'kaishi-15k',
      name: 'Kaishi Core',
      title: 'Kaishi Core 1.5k',
      edition: '1.0',
      lessons: 5, // Organized by JLPT levels (N5-N1)
      lessonOffset: 0,
      color: 'from-orange-400 to-red-500',
      description: 'Frequency-based core vocabulary for efficient learning',
    },
    'kanji-in-context': {
      id: 'kanji-in-context',
      name: 'Kanji in Context',
      title: 'Kanji in Context',
      edition: 'Revised',
      lessons: 50, // 50 chapters
      lessonOffset: 0,
      color: 'from-blue-400 to-cyan-500',
      description: 'Comprehensive kanji compounds and vocabulary',
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