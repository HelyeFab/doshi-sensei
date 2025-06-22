import { FlashcardProgress, FlashcardQuality } from '@/types';

/**
 * Advanced Spaced Repetition System
 * Based on FSRS (Free Spaced Repetition Scheduler) and modern cognitive research
 * Features adaptive learning, memory stability modeling, and optimized scheduling
 */

export interface SpacedRepetitionResult {
  interval: number;
  repetitions: number;
  easeFactor: number;
  nextReviewDate: Date;
  stability: number;
  difficulty: number;
  retrievability: number;
  lapses: number;
}

export interface AdvancedMemoryModel {
  stability: number;        // How long the memory will last
  difficulty: number;       // Intrinsic difficulty of the card (0-10)
  retrievability: number;   // Current recall probability (0-1)
  lapses: number;          // Number of times forgotten
  lastInterval: number;     // Previous interval length
  responseHistory: number[]; // Recent response times
  qualityHistory: FlashcardQuality[]; // Recent quality ratings
}

/**
 * FSRS Algorithm Parameters - Optimized for Japanese language learning
 */
const FSRS_PARAMS = {
  // Initial stability for different grades
  initialStability: [0.4, 0.6, 1.2, 2.4, 4.8], // Days for grades 1-5

  // Learning steps (in minutes)
  learningSteps: [1, 10], // 1 minute, 10 minutes for new cards

  // Graduation intervals
  graduatingInterval: 1, // Days
  easyInterval: 4,      // Days

  // Memory model parameters
  memoryDecay: 0.05,     // Forgetting rate per day
  stabilityGrowth: 1.3,  // How much stability grows on success
  difficultyAdjustment: 0.15, // How much difficulty changes

  // Response time factors
  fastResponseBonus: 1.2,    // Bonus for quick responses
  slowResponsePenalty: 0.8,  // Penalty for slow responses
  responseTimeThreshold: 3000, // 3 seconds threshold

  // Japanese-specific parameters
  kanjiDifficultyMultiplier: 1.4,  // Kanji are harder than vocabulary
  grammarDifficultyMultiplier: 1.2, // Grammar patterns are moderately harder

  // Adaptive parameters
  maxInterval: 365,          // Maximum interval (1 year)
  minInterval: 0.0007,       // Minimum interval (1 minute)
  intervalModifier: 1.0,     // Global interval modifier

  // Forgetting curve parameters
  forgettingCurveSharpness: 2.0,
  memoryStabilityThreshold: 0.9,
};

/**
 * Calculate memory retrievability using forgetting curve
 */
function calculateRetrievability(stability: number, daysSinceReview: number): number {
  if (daysSinceReview <= 0) return 1.0;

  // Exponential forgetting curve: R = exp(-t/S)
  const retrievability = Math.exp(-daysSinceReview / Math.max(stability, 0.1));
  return Math.max(0.01, Math.min(1.0, retrievability));
}

/**
 * Calculate new stability based on retrievability and quality
 */
function calculateNewStability(
  oldStability: number,
  retrievability: number,
  quality: FlashcardQuality,
  difficulty: number
): number {
  // FSRS stability calculation
  if (quality < 3) {
    // Failed recall - reduce stability
    return Math.max(0.1, oldStability * 0.7 * Math.pow(difficulty / 10, 0.5));
  }

  // Successful recall - increase stability
  const successFactor = 1 + (quality - 3) * 0.3; // 1.0 to 1.6
  const retrievabilityFactor = Math.pow(1 - retrievability, 0.5);
  const difficultyFactor = Math.pow(11 - difficulty, 0.2) / 2;

  return oldStability * FSRS_PARAMS.stabilityGrowth * successFactor * retrievabilityFactor * difficultyFactor;
}

/**
 * Calculate new difficulty based on quality and response time
 */
function calculateNewDifficulty(
  oldDifficulty: number,
  quality: FlashcardQuality,
  responseTime: number,
  isKanji: boolean = false
): number {
  let adjustment = 0;

  // Quality-based adjustment
  if (quality < 3) {
    adjustment = FSRS_PARAMS.difficultyAdjustment * (4 - quality); // Increase difficulty
  } else {
    adjustment = -FSRS_PARAMS.difficultyAdjustment * (quality - 2) * 0.5; // Decrease difficulty slowly
  }

  // Response time adjustment
  if (responseTime > FSRS_PARAMS.responseTimeThreshold * 2) {
    adjustment += 0.05; // Very slow response
  } else if (responseTime < FSRS_PARAMS.responseTimeThreshold * 0.5) {
    adjustment -= 0.03; // Very fast response
  }

  // Content type adjustment
  if (isKanji) {
    adjustment += 0.1; // Kanji inherently more difficult
  }

  return Math.max(1, Math.min(10, oldDifficulty + adjustment));
}

/**
 * Calculate optimal interval using FSRS algorithm
 */
function calculateOptimalInterval(
  stability: number,
  difficulty: number,
  quality: FlashcardQuality,
  requestedRetention: number = 0.9
): number {
  // Target retention rate (0.9 = 90% chance of remembering)
  const targetRetention = Math.max(0.8, Math.min(0.98, requestedRetention));

  // Calculate interval for target retention: I = S * ln(R) / ln(target)
  const interval = stability * Math.log(targetRetention) / Math.log(0.9);

  // Apply difficulty modifier
  const difficultyModifier = Math.pow(difficulty / 5, 0.3);
  const adjustedInterval = interval / difficultyModifier;

  // Apply quality modifier
  const qualityModifier = quality >= 3 ? 1 + (quality - 3) * 0.15 : 0.7;

  return Math.max(
    FSRS_PARAMS.minInterval,
    Math.min(FSRS_PARAMS.maxInterval, adjustedInterval * qualityModifier)
  );
}

/**
 * Advanced spaced repetition calculation with FSRS algorithm
 */
export function calculateNextReview(
  quality: FlashcardQuality,
  repetitions: number,
  easeFactor: number,
  interval: number,
  memoryModel?: AdvancedMemoryModel,
  responseTime: number = 3000,
  cardType: 'word' | 'kanji' | 'grammar' = 'word'
): SpacedRepetitionResult {
  // Initialize memory model if not provided
  const model: AdvancedMemoryModel = memoryModel || {
    stability: FSRS_PARAMS.initialStability[Math.min(4, Math.max(0, quality - 1))],
    difficulty: 5, // Medium difficulty
    retrievability: 0.9,
    lapses: 0,
    lastInterval: interval,
    responseHistory: [],
    qualityHistory: []
  };

  // Calculate days since last review
  const daysSinceReview = interval;

  // Update retrievability based on time elapsed
  const currentRetrievability = calculateRetrievability(model.stability, daysSinceReview);

  // Handle learning phase (new cards)
  if (repetitions === 0) {
    const newStability = quality >= 3 ?
      FSRS_PARAMS.initialStability[quality - 1] :
      FSRS_PARAMS.initialStability[0];

    const newInterval = quality >= 3 ?
      FSRS_PARAMS.graduatingInterval :
      FSRS_PARAMS.learningSteps[0] / 1440; // Convert minutes to days

    return {
      interval: newInterval,
      repetitions: quality >= 3 ? 1 : 0,
      easeFactor: easeFactor,
      nextReviewDate: new Date(Date.now() + newInterval * 24 * 60 * 60 * 1000),
      stability: newStability,
      difficulty: calculateNewDifficulty(model.difficulty, quality, responseTime, cardType === 'kanji'),
      retrievability: currentRetrievability,
      lapses: quality < 3 ? model.lapses + 1 : model.lapses
    };
  }

  // Calculate new stability
  const newStability = calculateNewStability(
    model.stability,
    currentRetrievability,
    quality,
    model.difficulty
  );

  // Calculate new difficulty
  const newDifficulty = calculateNewDifficulty(
    model.difficulty,
    quality,
    responseTime,
    cardType === 'kanji'
  );

  // Handle failed reviews (lapse)
  if (quality < 3) {
    const lapseInterval = Math.max(FSRS_PARAMS.minInterval, newStability * 0.25);

    return {
      interval: lapseInterval,
      repetitions: 0, // Reset repetitions on lapse
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      nextReviewDate: new Date(Date.now() + lapseInterval * 24 * 60 * 60 * 1000),
      stability: newStability,
      difficulty: newDifficulty,
      retrievability: calculateRetrievability(newStability, lapseInterval),
      lapses: model.lapses + 1
    };
  }

  // Calculate optimal interval for successful reviews
  const baseInterval = calculateOptimalInterval(newStability, newDifficulty, quality);

  // Apply response time modifier
  let intervalModifier = 1.0;
  if (responseTime < FSRS_PARAMS.responseTimeThreshold * 0.7) {
    intervalModifier = FSRS_PARAMS.fastResponseBonus;
  } else if (responseTime > FSRS_PARAMS.responseTimeThreshold * 1.5) {
    intervalModifier = FSRS_PARAMS.slowResponsePenalty;
  }

  // Apply quality-based modifier
  const qualityModifier = 1 + (quality - 3) * 0.15;

  // Calculate final interval
  const finalInterval = baseInterval * intervalModifier * qualityModifier;
  const clampedInterval = Math.max(
    daysSinceReview * 1.1, // Minimum 10% increase
    Math.min(FSRS_PARAMS.maxInterval, finalInterval)
  );

  // Update ease factor (legacy compatibility)
  const newEaseFactor = Math.max(1.3, Math.min(2.5,
    easeFactor + (quality - 3) * 0.1 - (model.lapses * 0.05)
  ));

  const nextReviewDate = new Date(Date.now() + clampedInterval * 24 * 60 * 60 * 1000);

  return {
    interval: clampedInterval,
    repetitions: repetitions + 1,
    easeFactor: newEaseFactor,
    nextReviewDate,
    stability: newStability,
    difficulty: newDifficulty,
    retrievability: calculateRetrievability(newStability, clampedInterval),
    lapses: model.lapses
  };
}

/**
 * Initialize flashcard progress with advanced memory model
 */
export function initializeFlashcardProgress(wordId: string, userId: string, cardType: 'word' | 'kanji' | 'grammar' = 'word'): FlashcardProgress {
  const now = new Date();
  const initialDifficulty = cardType === 'kanji' ? 6 : cardType === 'grammar' ? 5.5 : 5;

  // First review in 10 minutes for immediate reinforcement
  const firstReview = new Date(now.getTime() + FSRS_PARAMS.learningSteps[0] * 60 * 1000);

  return {
    id: `${userId}_${wordId}`,
    userId,
    wordId,
    easeFactor: 2.5,
    interval: FSRS_PARAMS.learningSteps[0] / 1440, // Convert to days
    repetitions: 0,
    nextReviewDate: firstReview,
    lastReviewDate: now,
    difficulty: 'learning',
    totalReviews: 0,
    correctReviews: 0,
    averageResponseTime: 0,
    createdAt: now,
    updatedAt: now,
    // Advanced fields
    stability: FSRS_PARAMS.initialStability[0],
    memoryDifficulty: initialDifficulty,
    retrievability: 1.0,
    lapses: 0,
    responseHistory: [],
    qualityHistory: [],
    cardType: cardType
  };
}

/**
 * Update flashcard progress with advanced FSRS algorithm
 */
export function updateFlashcardProgress(
  progress: FlashcardProgress,
  quality: FlashcardQuality,
  responseTime: number
): FlashcardProgress {
  // Prepare memory model
  const memoryModel: AdvancedMemoryModel = {
    stability: progress.stability || FSRS_PARAMS.initialStability[0],
    difficulty: progress.memoryDifficulty || 5,
    retrievability: progress.retrievability || 0.9,
    lapses: progress.lapses || 0,
    lastInterval: progress.interval,
    responseHistory: progress.responseHistory || [],
    qualityHistory: progress.qualityHistory || []
  };

  // Update response and quality history (keep last 10)
  const newResponseHistory = [...memoryModel.responseHistory, responseTime].slice(-10);
  const newQualityHistory = [...memoryModel.qualityHistory, quality].slice(-10);

  const result = calculateNextReview(
    quality,
    progress.repetitions,
    progress.easeFactor,
    progress.interval,
    { ...memoryModel, responseHistory: newResponseHistory, qualityHistory: newQualityHistory },
    responseTime,
    progress.cardType || 'word'
  );

  // Determine difficulty level based on advanced metrics
  let difficulty: FlashcardProgress['difficulty'] = 'learning';

  if (result.lapses === 0 && result.repetitions >= 8 && result.stability > 30) {
    difficulty = 'mastered';
  } else if (result.repetitions >= 3 && result.stability > 7) {
    difficulty = 'reviewing';
  } else if (result.lapses > 3) {
    difficulty = 'difficult';
  }

  // Calculate new average response time with recent bias
  const recentWeight = 0.3;
  const newAverageResponseTime = progress.totalReviews === 0 ?
    responseTime :
    progress.averageResponseTime * (1 - recentWeight) + responseTime * recentWeight;

  return {
    ...progress,
    easeFactor: result.easeFactor,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReviewDate: result.nextReviewDate,
    lastReviewDate: new Date(),
    difficulty,
    totalReviews: progress.totalReviews + 1,
    correctReviews: progress.correctReviews + (quality >= 3 ? 1 : 0),
    averageResponseTime: newAverageResponseTime,
    updatedAt: new Date(),
    // Advanced fields
    stability: result.stability,
    memoryDifficulty: result.difficulty,
    retrievability: result.retrievability,
    lapses: result.lapses,
    responseHistory: newResponseHistory,
    qualityHistory: newQualityHistory
  };
}

/**
 * Check if a card is due for review with fuzzing and session buffer
 */
export function isCardDueForReview(
  progress: FlashcardProgress,
  fuzzingEnabled: boolean = true,
  excludeRecentSession: boolean = true
): boolean {
  const now = new Date();
  let dueDate = progress.nextReviewDate;

  // Add session buffer to prevent immediate due status after study session
  if (excludeRecentSession) {
    const sessionBuffer = 2 * 60 * 60 * 1000; // 2 hours minimum buffer
    const minDueTime = new Date(progress.lastReviewDate.getTime() + sessionBuffer);

    // If the card was reviewed recently and the due date is within the session buffer, don't mark as due
    if (dueDate < minDueTime) {
      return false;
    }
  }

  if (fuzzingEnabled && progress.interval > 2) {
    // Add fuzzing to prevent review bunching (±5% of interval)
    const fuzzRange = progress.interval * 0.05;
    const fuzz = (Math.random() - 0.5) * 2 * fuzzRange;
    dueDate = new Date(dueDate.getTime() + fuzz * 24 * 60 * 60 * 1000);
  }

  return dueDate <= now;
}

/**
 * Check if a card needs immediate review (within current session)
 */
export function isCardForImmediateReview(progress: FlashcardProgress): boolean {
  const now = new Date();
  const dueDate = progress.nextReviewDate;
  const sessionBuffer = 2 * 60 * 60 * 1000; // 2 hours

  // Card is for immediate review if:
  // 1. It's due now, AND
  // 2. It was reviewed recently (within session buffer)
  return dueDate <= now &&
         (now.getTime() - progress.lastReviewDate.getTime()) < sessionBuffer;
}

/**
 * Get cards due for review with advanced prioritization
 */
export function getDueCards(progressList: FlashcardProgress[]): FlashcardProgress[] {
  const now = new Date();

  return progressList
    .filter(progress => isCardDueForReview(progress))
    .sort((a, b) => {
      // Priority scoring system
      const getScore = (p: FlashcardProgress) => {
        const overdueHours = Math.max(0, (now.getTime() - p.nextReviewDate.getTime()) / (1000 * 60 * 60));
        const difficultyWeight = p.difficulty === 'difficult' ? 3 : p.difficulty === 'learning' ? 2 : 1;
        const lapseWeight = Math.min(5, p.lapses || 0);
        const stabilityWeight = 1 / Math.max(0.1, p.stability || 1);

        return overdueHours * 2 + difficultyWeight * 10 + lapseWeight * 5 + stabilityWeight * 3;
      };

      return getScore(b) - getScore(a); // Higher score = higher priority
    });
}

/**
 * Calculate comprehensive study statistics
 */
export function calculateStudyStats(progressList: FlashcardProgress[]) {
  const total = progressList.length;
  if (total === 0) return {
    total: 0, learning: 0, reviewing: 0, mastered: 0, difficult: 0,
    dueToday: 0, overallAccuracy: 0, avgResponseTime: 0,
    avgStability: 0, avgDifficulty: 0, totalLapses: 0,
    learningVelocity: 0, retentionRate: 0
  };

  const learning = progressList.filter(p => p.difficulty === 'learning').length;
  const reviewing = progressList.filter(p => p.difficulty === 'reviewing').length;
  const mastered = progressList.filter(p => p.difficulty === 'mastered').length;
  const difficult = progressList.filter(p => p.difficulty === 'difficult').length;
  const dueToday = getDueCards(progressList).length;

  const totalReviews = progressList.reduce((sum, p) => sum + p.totalReviews, 0);
  const totalCorrect = progressList.reduce((sum, p) => sum + p.correctReviews, 0);
  const overallAccuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

  const avgResponseTime = progressList.reduce((sum, p) => sum + (p.averageResponseTime || 0), 0) / total;
  const avgStability = progressList.reduce((sum, p) => sum + (p.stability || 0), 0) / total;
  const avgDifficulty = progressList.reduce((sum, p) => sum + (p.memoryDifficulty || 5), 0) / total;
  const totalLapses = progressList.reduce((sum, p) => sum + (p.lapses || 0), 0);

  // Learning velocity: average stability gain per review
  const learningVelocity = avgStability / Math.max(1, totalReviews / total);

  // Retention rate: percentage of cards with stability > 7 days
  const retentionRate = progressList.filter(p => (p.stability || 0) > 7).length / total * 100;

  return {
    total,
    learning,
    reviewing,
    mastered,
    difficult,
    dueToday,
    overallAccuracy: Math.round(overallAccuracy),
    avgResponseTime: Math.round(avgResponseTime),
    avgStability: Math.round(avgStability * 10) / 10,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    totalLapses,
    learningVelocity: Math.round(learningVelocity * 100) / 100,
    retentionRate: Math.round(retentionRate)
  };
}

/**
 * Enhanced quality rating descriptions with learning guidance
 */
export const qualityDescriptions: Record<FlashcardQuality, string> = {
  0: 'Complete blackout - Could not recall at all',
  1: 'Wrong answer - But the correct answer rang a bell',
  2: 'Wrong answer - But it felt familiar when revealed',
  3: 'Correct answer - With serious difficulty or hesitation',
  4: 'Correct answer - After some thought or slight hesitation',
  5: 'Correct answer - Perfect recall with confidence'
};

/**
 * Get personalized study recommendations
 */
export function getStudyRecommendations(progressList: FlashcardProgress[]): {
  recommendedSessionSize: number;
  focusAreas: string[];
  optimalStudyTime: string;
  difficultyBalance: string;
} {
  const stats = calculateStudyStats(progressList);
  const dueCards = getDueCards(progressList);

  // Recommended session size based on due cards and difficulty distribution
  let sessionSize = Math.min(25, dueCards.length);
  if (stats.difficult > stats.total * 0.3) sessionSize = Math.min(15, sessionSize);
  if (stats.learning > stats.total * 0.5) sessionSize = Math.min(20, sessionSize);

  // Focus areas
  const focusAreas: string[] = [];
  if (stats.difficult > stats.total * 0.2) focusAreas.push('Review difficult cards');
  if (stats.learning > stats.total * 0.4) focusAreas.push('Focus on new material');
  if (stats.retentionRate < 70) focusAreas.push('Strengthen weak memories');
  if (stats.avgResponseTime > 5000) focusAreas.push('Improve recall speed');

  // Optimal study time
  const avgSessionTime = Math.ceil(sessionSize * stats.avgResponseTime / 1000 / 60);
  const optimalStudyTime = `${Math.max(5, avgSessionTime)} minutes`;

  // Difficulty balance
  let difficultyBalance = 'Balanced';
  if (stats.difficult > stats.total * 0.3) difficultyBalance = 'High difficulty - consider reviewing fundamentals';
  if (stats.mastered > stats.total * 0.7) difficultyBalance = 'Well mastered - ready for new challenges';

  return {
    recommendedSessionSize: sessionSize,
    focusAreas,
    optimalStudyTime,
    difficultyBalance
  };
}

/**
 * Predict memory retention over time
 */
export function predictRetention(progress: FlashcardProgress, daysAhead: number): number {
  const stability = progress.stability || 1;
  return calculateRetrievability(stability, daysAhead);
}

/**
 * Get recommended study session size with advanced logic
 */
export function getRecommendedSessionSize(dueCount: number, timeAvailable: number, userLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'): number {
  const baseTime = userLevel === 'beginner' ? 45 : userLevel === 'intermediate' ? 30 : 20; // seconds per card
  const maxCardsForTime = Math.floor((timeAvailable * 60) / baseTime);

  const maxRecommended = userLevel === 'beginner' ? 15 : userLevel === 'intermediate' ? 25 : 40;

  return Math.min(dueCount, maxCardsForTime, maxRecommended);
}
