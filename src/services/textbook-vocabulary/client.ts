'use client';

// Client-only wrapper for textbook vocabulary services
// This prevents Fast Refresh issues by ensuring these are only imported in React components

export { vocabStorage } from './storage';
export type { VocabularyProgress, StudySession } from './storage';
export { spacedRepetition } from './spaced-repetition';
export type { ReviewResult } from './spaced-repetition';
export { textbookVocabularySyncManager } from './sync-manager';