import { statsTracker } from './statsTracker';

/**
 * Centralized tracking events for consistent stats recording
 */

// Drill tracking
export async function trackDrillCompleted(
  drillType: string,
  questionsAnswered: number,
  correctAnswers: number,
  wordsStudied?: string[]
): Promise<void> {
  await statsTracker.trackActivity('drill', {
    feature: drillType,
    total: questionsAnswered,
    correct: correctAnswers,
    itemId: wordsStudied?.join(',')
  });
}

// Story tracking
export async function trackStoryRead(
  storyId: string,
  storyTitle: string,
  completionTime?: number
): Promise<void> {
  await statsTracker.trackActivity('story', {
    itemId: storyId,
    itemTitle: storyTitle,
    duration: completionTime
  });
}

// Article tracking
export async function trackArticleRead(
  articleId: string,
  articleTitle: string,
  completionTime?: number
): Promise<void> {
  await statsTracker.trackActivity('article', {
    itemId: articleId,
    itemTitle: articleTitle,
    duration: completionTime
  });
}

// Kanji tracking
export async function trackKanjiStudy(
  kanjiCharacter: string,
  correct: boolean,
  sessionType: 'mood' | 'browser' | 'flashcard'
): Promise<void> {
  await statsTracker.trackActivity('kanji', {
    itemId: kanjiCharacter,
    feature: sessionType,
    correct: correct ? 1 : 0,
    total: 1
  });
}

// Game tracking
export async function trackGamePlayed(
  gameType: 'kana-drop' | 'kanji-quest',
  score: number,
  questionsAnswered?: number,
  correctAnswers?: number
): Promise<void> {
  await statsTracker.trackActivity('game', {
    gameType,
    score,
    total: questionsAnswered,
    correct: correctAnswers
  });
}

// Pokemon tracking
export async function trackPokemonCaught(
  pokemonId: string,
  pokemonName: string
): Promise<void> {
  await statsTracker.trackActivity('game', {
    gameType: 'pokemon',
    itemId: pokemonId,
    itemTitle: pokemonName,
    score: 1
  });
}

// Vocabulary tracking
export async function trackVocabStudied(
  wordId: string,
  word: string,
  studyType: 'list' | 'practice' | 'browse'
): Promise<void> {
  await statsTracker.trackActivity('vocab', {
    itemId: wordId,
    itemTitle: word,
    feature: studyType
  });
}

// Flashcard tracking
export async function trackFlashcardReviewed(
  cardId: string,
  correct: boolean,
  difficulty: number
): Promise<void> {
  await statsTracker.trackActivity('flashcard', {
    itemId: cardId,
    correct: correct ? 1 : 0,
    total: 1,
    score: difficulty
  });
}

// Practice page tracking (verb conjugation practice)
export async function trackPracticeSession(
  verbForm: string,
  duration: number
): Promise<void> {
  await statsTracker.trackActivity('practice', {
    feature: verbForm,
    duration
  });
}

// Kana practice tracking
export async function trackKanaPractice(
  practiceType: 'hiragana' | 'katakana' | 'both',
  totalItems: number,
  correctItems: number,
  duration: number
): Promise<void> {
  await statsTracker.trackActivity('practice', {
    feature: `kana-${practiceType}`,
    total: totalItems,
    correct: correctItems,
    duration
  });
}