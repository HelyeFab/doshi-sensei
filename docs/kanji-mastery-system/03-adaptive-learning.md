# 🎯 Adaptive Learning System

## Overview
The Adaptive Learning System personalizes the learning experience by analyzing user performance data to identify weaknesses, adjust difficulty, and optimize learning paths for each individual user.

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Weakness Detection Algorithms](#weakness-detection-algorithms)
3. [Adaptive Difficulty System](#adaptive-difficulty-system)
4. [Personalized Practice Generation](#personalized-practice-generation)
5. [Implementation Architecture](#implementation-architecture)
6. [Code Examples](#code-examples)
7. [Testing & Validation](#testing--validation)

## Core Concepts

### Learning Profile Model

```typescript
interface LearningProfile {
  userId: string;
  
  // Performance metrics
  strengths: {
    meaning: KanjiSet;      // Kanji with >90% accuracy
    onyomi: KanjiSet;      // Strong on readings
    kunyomi: KanjiSet;     // Strong kun readings
    visual: KanjiSet;      // Quick visual recognition
  };
  
  weaknesses: {
    meaning: WeaknessAnalysis;
    onyomi: WeaknessAnalysis;
    kunyomi: WeaknessAnalysis;
    slowRecall: WeaknessAnalysis;
    interference: InterferencePairs[];
  };
  
  // Learning patterns
  patterns: {
    optimalSessionLength: number;    // Minutes before fatigue
    bestPerformanceTime: TimeSlot[]; // When user performs best
    learningVelocity: number;        // Kanji learned per week
    retentionRate: number;           // % retained after 30 days
  };
  
  // Personalization settings
  preferences: {
    difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
    focusArea: 'balanced' | 'meaning' | 'reading' | 'writing';
    sessionGoal: 'accuracy' | 'speed' | 'coverage';
  };
}
```

### Weakness Categories

```typescript
enum WeaknessType {
  // Systematic errors
  CONSISTENT_ERROR = 'consistent_error',     // Always gets wrong
  PARTIAL_KNOWLEDGE = 'partial_knowledge',   // Sometimes right, sometimes wrong
  SLOW_RECALL = 'slow_recall',              // Knows it but takes time
  
  // Confusion patterns
  VISUAL_CONFUSION = 'visual_confusion',     // Confuses similar-looking kanji
  PHONETIC_CONFUSION = 'phonetic_confusion', // Confuses similar-sounding
  SEMANTIC_CONFUSION = 'semantic_confusion', // Confuses similar meanings
  
  // Memory patterns
  QUICK_DECAY = 'quick_decay',              // Forgets quickly
  INTERFERENCE = 'interference',            // New learning interferes with old
  CONTEXT_DEPENDENT = 'context_dependent',   // Only knows in specific context
}

interface WeaknessAnalysis {
  type: WeaknessType;
  severity: 'mild' | 'moderate' | 'severe';
  affectedKanji: KanjiSet;
  recommendedStrategy: LearningStrategy;
  improvementTrend: 'improving' | 'stable' | 'declining';
}
```

## Weakness Detection Algorithms

### 1. Statistical Analysis Algorithm

```typescript
class WeaknessDetector {
  /**
   * Analyze user's performance to identify weak areas
   */
  async detectWeaknesses(
    userId: string,
    timeframe: number = 30 // days
  ): Promise<WeaknessProfile> {
    const history = await this.getStudyHistory(userId, timeframe);
    
    return {
      systematic: this.findSystematicErrors(history),
      temporal: this.findTemporalPatterns(history),
      interference: this.findInterferencePairs(history),
      cognitive: this.analyzeCognitiveLoad(history),
    };
  }
  
  /**
   * Find kanji with consistent errors
   */
  private findSystematicErrors(history: StudyHistory[]): SystematicError[] {
    const kanjiStats = new Map<string, KanjiStatistics>();
    
    // Aggregate statistics per kanji
    history.forEach(session => {
      session.results.forEach(result => {
        const stats = kanjiStats.get(result.kanjiChar) || {
          attempts: 0,
          correct: 0,
          responseTime: [],
          errorTypes: [],
        };
        
        stats.attempts++;
        if (result.isCorrect) stats.correct++;
        stats.responseTime.push(result.responseTime);
        if (!result.isCorrect) {
          stats.errorTypes.push(result.questionType);
        }
        
        kanjiStats.set(result.kanjiChar, stats);
      });
    });
    
    // Identify problematic kanji
    const errors: SystematicError[] = [];
    
    kanjiStats.forEach((stats, kanji) => {
      const accuracy = stats.correct / stats.attempts;
      
      if (accuracy < 0.5 && stats.attempts >= 5) {
        errors.push({
          kanji,
          accuracy,
          attempts: stats.attempts,
          avgResponseTime: average(stats.responseTime),
          problemType: this.categorizeProblem(stats),
          severity: this.calculateSeverity(accuracy, stats.attempts),
        });
      }
    });
    
    return errors.sort((a, b) => a.accuracy - b.accuracy);
  }
  
  /**
   * Find pairs of kanji that user confuses
   */
  private findInterferencePairs(history: StudyHistory[]): InterferencePair[] {
    const confusionMatrix = new Map<string, Map<string, number>>();
    
    // Build confusion matrix from wrong answers
    history.forEach(session => {
      session.results
        .filter(r => !r.isCorrect)
        .forEach(result => {
          const { correctAnswer, userAnswer } = result;
          
          if (!confusionMatrix.has(correctAnswer)) {
            confusionMatrix.set(correctAnswer, new Map());
          }
          
          const row = confusionMatrix.get(correctAnswer)!;
          row.set(userAnswer, (row.get(userAnswer) || 0) + 1);
        });
    });
    
    // Extract significant confusion pairs
    const pairs: InterferencePair[] = [];
    
    confusionMatrix.forEach((confused, correct) => {
      confused.forEach((count, wrong) => {
        if (count >= 3) { // At least 3 confusions
          pairs.push({
            kanji1: correct,
            kanji2: wrong,
            confusionCount: count,
            type: this.analyzeConfusionType(correct, wrong),
            suggestion: this.generateDistinguishingHint(correct, wrong),
          });
        }
      });
    });
    
    return pairs.sort((a, b) => b.confusionCount - a.confusionCount);
  }
  
  /**
   * Analyze temporal patterns (forgetting curve)
   */
  private findTemporalPatterns(history: StudyHistory[]): TemporalPattern {
    const retentionByInterval = new Map<number, number[]>();
    
    // Group by days since last review
    history.forEach(session => {
      session.results.forEach(result => {
        const daysSinceLastReview = result.daysSinceLastReview || 0;
        const accuracies = retentionByInterval.get(daysSinceLastReview) || [];
        accuracies.push(result.isCorrect ? 1 : 0);
        retentionByInterval.set(daysSinceLastReview, accuracies);
      });
    });
    
    // Calculate retention curve
    const retentionCurve: Point[] = [];
    
    retentionByInterval.forEach((accuracies, days) => {
      retentionCurve.push({
        x: days,
        y: average(accuracies),
      });
    });
    
    return {
      curve: retentionCurve.sort((a, b) => a.x - b.x),
      optimalInterval: this.findOptimalInterval(retentionCurve),
      decayRate: this.calculateDecayRate(retentionCurve),
    };
  }
  
  /**
   * Analyze cognitive load patterns
   */
  private analyzeCognitiveLoad(history: StudyHistory[]): CognitivePattern {
    const performanceByPosition = new Map<number, number[]>();
    
    // Track accuracy by position in session
    history.forEach(session => {
      session.results.forEach((result, index) => {
        const accuracies = performanceByPosition.get(index) || [];
        accuracies.push(result.isCorrect ? 1 : 0);
        performanceByPosition.set(index, accuracies);
      });
    });
    
    // Find fatigue point
    let fatiguePoint = -1;
    let previousAccuracy = 1.0;
    
    performanceByPosition.forEach((accuracies, position) => {
      const accuracy = average(accuracies);
      
      if (accuracy < previousAccuracy * 0.8 && fatiguePoint === -1) {
        fatiguePoint = position;
      }
      
      previousAccuracy = accuracy;
    });
    
    return {
      optimalSessionLength: fatiguePoint > 0 ? fatiguePoint : 20,
      accuracyDecline: this.calculateDecline(performanceByPosition),
      recoveryNeeded: fatiguePoint > 0 && fatiguePoint < 15,
    };
  }
}
```

### 2. Pattern Recognition Algorithm

```typescript
class PatternRecognizer {
  /**
   * Identify learning patterns unique to the user
   */
  async recognizePatterns(userId: string): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];
    
    // Visual learner pattern
    const visualPattern = await this.checkVisualLearner(userId);
    if (visualPattern.confidence > 0.7) {
      patterns.push(visualPattern);
    }
    
    // Contextual learner pattern
    const contextPattern = await this.checkContextualLearner(userId);
    if (contextPattern.confidence > 0.7) {
      patterns.push(contextPattern);
    }
    
    // Analytical learner pattern
    const analyticalPattern = await this.checkAnalyticalLearner(userId);
    if (analyticalPattern.confidence > 0.7) {
      patterns.push(analyticalPattern);
    }
    
    return patterns;
  }
  
  private async checkVisualLearner(userId: string): Promise<LearningPattern> {
    const history = await this.getHistory(userId);
    
    // Compare performance on visually distinct vs similar kanji
    const distinctKanji = this.getVisuallyDistinctKanji();
    const similarKanji = this.getVisuallySimilarKanji();
    
    const distinctAccuracy = this.calculateAccuracy(history, distinctKanji);
    const similarAccuracy = this.calculateAccuracy(history, similarKanji);
    
    const difference = distinctAccuracy - similarAccuracy;
    
    return {
      type: 'visual',
      confidence: Math.min(difference * 2, 1), // Scale to 0-1
      recommendation: difference > 0.2 
        ? 'Use color coding and visual mnemonics'
        : 'Focus on component analysis',
    };
  }
  
  private async checkContextualLearner(userId: string): Promise<LearningPattern> {
    const history = await this.getHistory(userId);
    
    // Compare isolated vs in-context performance
    const isolatedPerformance = history.filter(h => h.type === 'isolated');
    const contextPerformance = history.filter(h => h.type === 'sentence');
    
    const isolatedAcc = this.calculateOverallAccuracy(isolatedPerformance);
    const contextAcc = this.calculateOverallAccuracy(contextPerformance);
    
    return {
      type: 'contextual',
      confidence: contextAcc > isolatedAcc ? (contextAcc - isolatedAcc) * 3 : 0,
      recommendation: 'Learn kanji through sentences and real usage',
    };
  }
}
```

## Adaptive Difficulty System

### Dynamic Difficulty Adjustment

```typescript
class AdaptiveDifficulty {
  private readonly targetAccuracy = 0.75; // Sweet spot for learning
  private readonly adjustmentRate = 0.1;
  
  /**
   * Adjust difficulty based on recent performance
   */
  adjustDifficulty(
    currentDifficulty: number, // 0-1 scale
    recentAccuracy: number,
    responseTime: number
  ): number {
    // Calculate performance score
    const performanceScore = this.calculatePerformance(
      recentAccuracy,
      responseTime
    );
    
    // Determine adjustment
    let adjustment = 0;
    
    if (performanceScore > 0.85) {
      // Too easy, increase difficulty
      adjustment = this.adjustmentRate;
    } else if (performanceScore < 0.65) {
      // Too hard, decrease difficulty
      adjustment = -this.adjustmentRate;
    }
    
    // Apply adjustment with bounds
    const newDifficulty = Math.max(0, Math.min(1, currentDifficulty + adjustment));
    
    return newDifficulty;
  }
  
  /**
   * Generate practice session with adaptive difficulty
   */
  generateAdaptiveSession(
    profile: LearningProfile,
    targetKanji: Kanji[]
  ): PracticeSession {
    const difficulty = profile.preferences.difficulty === 'adaptive'
      ? this.calculateOptimalDifficulty(profile)
      : this.mapDifficultyPreference(profile.preferences.difficulty);
    
    return {
      questions: targetKanji.map(kanji => ({
        kanji,
        type: this.selectQuestionType(kanji, profile),
        distractors: this.generateDistractors(kanji, difficulty),
        timeLimit: this.calculateTimeLimit(kanji, difficulty),
        hints: this.generateHints(kanji, difficulty),
      })),
      
      adaptiveRules: {
        increaseOn: { streak: 5, accuracy: 0.9 },
        decreaseOn: { mistakes: 3, timeout: 2 },
        skipOn: { perfect: true, time: '<2s' },
      },
    };
  }
  
  /**
   * Generate smart distractors based on difficulty
   */
  private generateDistractors(
    target: Kanji,
    difficulty: number
  ): Distractor[] {
    const distractorPool = this.getDistractorPool(target);
    
    // Sort by similarity to target
    const scored = distractorPool.map(d => ({
      ...d,
      similarity: this.calculateSimilarity(target, d),
    }));
    
    // Select based on difficulty
    // Easy: very different distractors
    // Hard: very similar distractors
    const targetSimilarity = difficulty;
    
    return scored
      .sort((a, b) => 
        Math.abs(a.similarity - targetSimilarity) - 
        Math.abs(b.similarity - targetSimilarity)
      )
      .slice(0, 3)
      .map(d => ({
        value: d.value,
        type: d.type,
        similarity: d.similarity,
      }));
  }
  
  private calculateSimilarity(kanji1: Kanji, kanji2: Kanji): number {
    let similarity = 0;
    
    // Visual similarity (shared components)
    const sharedComponents = this.getSharedComponents(kanji1, kanji2);
    similarity += sharedComponents.length * 0.2;
    
    // Phonetic similarity
    const phoneticSim = this.phoneticSimilarity(kanji1.readings, kanji2.readings);
    similarity += phoneticSim * 0.3;
    
    // Semantic similarity
    const semanticSim = this.semanticSimilarity(kanji1.meaning, kanji2.meaning);
    similarity += semanticSim * 0.3;
    
    // Stroke count similarity
    const strokeDiff = Math.abs(kanji1.strokes - kanji2.strokes);
    similarity += Math.max(0, 1 - strokeDiff / 10) * 0.2;
    
    return Math.min(1, similarity);
  }
}
```

## Personalized Practice Generation

### Intelligent Question Generation

```typescript
class PracticeGenerator {
  /**
   * Generate personalized practice session
   */
  async generatePractice(
    profile: LearningProfile,
    duration: number = 10 // minutes
  ): Promise<PracticeSession> {
    // 1. Select target kanji based on weaknesses
    const targets = await this.selectTargetKanji(profile);
    
    // 2. Determine question distribution
    const distribution = this.calculateQuestionDistribution(profile);
    
    // 3. Generate questions
    const questions = this.generateQuestions(targets, distribution, profile);
    
    // 4. Order questions optimally
    const ordered = this.optimizeQuestionOrder(questions);
    
    // 5. Add adaptive elements
    const adaptive = this.addAdaptiveElements(ordered, profile);
    
    return {
      sessionId: generateId(),
      questions: adaptive,
      estimatedDuration: duration,
      focusAreas: this.identifyFocusAreas(profile),
      adaptiveRules: this.getAdaptiveRules(profile),
    };
  }
  
  /**
   * Select kanji to practice based on weaknesses
   */
  private async selectTargetKanji(
    profile: LearningProfile
  ): Promise<TargetKanji[]> {
    const targets: TargetKanji[] = [];
    
    // Priority 1: Overdue reviews
    const overdue = await this.getOverdueKanji(profile.userId);
    targets.push(...overdue.map(k => ({ ...k, priority: 1 })));
    
    // Priority 2: Weak kanji
    const weak = this.getWeakKanji(profile.weaknesses);
    targets.push(...weak.map(k => ({ ...k, priority: 2 })));
    
    // Priority 3: Interference pairs
    const interference = this.getInterferenceKanji(profile.weaknesses.interference);
    targets.push(...interference.map(k => ({ ...k, priority: 3 })));
    
    // Priority 4: Slow recall
    const slow = profile.weaknesses.slowRecall.affectedKanji;
    targets.push(...slow.map(k => ({ ...k, priority: 4 })));
    
    // Remove duplicates and sort by priority
    const unique = this.removeDuplicates(targets);
    return unique.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Calculate optimal question type distribution
   */
  private calculateQuestionDistribution(
    profile: LearningProfile
  ): QuestionDistribution {
    const base = {
      meaning: 0.34,
      onyomi: 0.33,
      kunyomi: 0.33,
    };
    
    // Adjust based on weaknesses
    const weaknesses = profile.weaknesses;
    
    if (weaknesses.meaning.severity === 'severe') {
      base.meaning += 0.2;
      base.onyomi -= 0.1;
      base.kunyomi -= 0.1;
    }
    
    if (weaknesses.onyomi.severity === 'severe') {
      base.onyomi += 0.2;
      base.meaning -= 0.1;
      base.kunyomi -= 0.1;
    }
    
    if (weaknesses.kunyomi.severity === 'severe') {
      base.kunyomi += 0.2;
      base.meaning -= 0.1;
      base.onyomi -= 0.1;
    }
    
    return base;
  }
  
  /**
   * Optimize question order for maximum learning
   */
  private optimizeQuestionOrder(questions: Question[]): Question[] {
    // Interleaving strategy: mix different types and difficulties
    const byType = this.groupByType(questions);
    const interleaved: Question[] = [];
    
    // Round-robin through types
    let typeIndex = 0;
    const types = Object.keys(byType);
    
    while (interleaved.length < questions.length) {
      const type = types[typeIndex % types.length];
      const typeQuestions = byType[type];
      
      if (typeQuestions.length > 0) {
        interleaved.push(typeQuestions.shift()!);
      }
      
      typeIndex++;
    }
    
    // Add spacing for interference pairs
    return this.spaceInterferencePairs(interleaved);
  }
  
  /**
   * Space out confusable kanji
   */
  private spaceInterferencePairs(questions: Question[]): Question[] {
    const spaced: Question[] = [];
    const recentKanji = new Set<string>();
    const delayed: Question[] = [];
    
    questions.forEach(q => {
      const hasInterference = this.checkInterference(q.kanji, recentKanji);
      
      if (hasInterference && spaced.length < questions.length - 5) {
        // Delay this question
        delayed.push(q);
      } else {
        spaced.push(q);
        recentKanji.add(q.kanji.character);
        
        // Keep recent window to 5 items
        if (recentKanji.size > 5) {
          const oldest = spaced[spaced.length - 6].kanji.character;
          recentKanji.delete(oldest);
        }
      }
    });
    
    // Add delayed questions at the end
    spaced.push(...delayed);
    
    return spaced;
  }
}
```

## Implementation Architecture

### Service Layer Structure

```typescript
// src/services/adaptiveLearning/index.ts

export class AdaptiveLearningService {
  private weaknessDetector: WeaknessDetector;
  private patternRecognizer: PatternRecognizer;
  private difficultyAdjuster: AdaptiveDifficulty;
  private practiceGenerator: PracticeGenerator;
  private profileManager: ProfileManager;
  
  constructor() {
    this.weaknessDetector = new WeaknessDetector();
    this.patternRecognizer = new PatternRecognizer();
    this.difficultyAdjuster = new AdaptiveDifficulty();
    this.practiceGenerator = new PracticeGenerator();
    this.profileManager = new ProfileManager();
  }
  
  /**
   * Main entry point for adaptive learning
   */
  async getAdaptiveSession(
    userId: string,
    options: SessionOptions = {}
  ): Promise<AdaptiveSession> {
    // 1. Load or create learning profile
    const profile = await this.profileManager.getProfile(userId);
    
    // 2. Update profile with recent performance
    await this.updateProfile(profile);
    
    // 3. Generate adaptive practice
    const practice = await this.practiceGenerator.generatePractice(
      profile,
      options.duration || 10
    );
    
    // 4. Apply difficulty adjustments
    const adjusted = this.applyDifficultyAdjustments(practice, profile);
    
    // 5. Add analytics hooks
    const withAnalytics = this.addAnalytics(adjusted);
    
    return withAnalytics;
  }
  
  /**
   * Update learning profile with recent data
   */
  private async updateProfile(profile: LearningProfile): Promise<void> {
    // Get recent performance data
    const recentHistory = await this.getRecentHistory(profile.userId, 7);
    
    // Update weaknesses
    profile.weaknesses = await this.weaknessDetector.detectWeaknesses(
      profile.userId
    );
    
    // Update patterns
    const patterns = await this.patternRecognizer.recognizePatterns(
      profile.userId
    );
    profile.patterns = this.mergePatterns(profile.patterns, patterns);
    
    // Update optimal times
    profile.patterns.bestPerformanceTime = await this.findOptimalTimes(
      recentHistory
    );
    
    // Save updated profile
    await this.profileManager.saveProfile(profile);
  }
}
```

### React Hook Implementation

```typescript
// src/hooks/useAdaptiveLearning.ts

export function useAdaptiveLearning(userId?: string) {
  const [session, setSession] = useState<AdaptiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [performance, setPerformance] = useState<SessionPerformance>({
    accuracy: 0,
    avgResponseTime: 0,
    streak: 0,
    difficulty: 0.5,
  });
  
  const service = useMemo(() => new AdaptiveLearningService(), []);
  
  /**
   * Generate new adaptive session
   */
  const generateSession = useCallback(async (options?: SessionOptions) => {
    if (!userId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const newSession = await service.getAdaptiveSession(userId, options);
      setSession(newSession);
      
      return newSession;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to generate adaptive session:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, service]);
  
  /**
   * Submit answer and get adapted next question
   */
  const submitAnswer = useCallback(async (
    questionId: string,
    answer: string,
    responseTime: number
  ) => {
    if (!session) return;
    
    const question = session.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const isCorrect = answer === question.correctAnswer;
    
    // Update performance metrics
    setPerformance(prev => {
      const newAccuracy = (prev.accuracy * session.answered + (isCorrect ? 1 : 0)) 
        / (session.answered + 1);
      const newAvgTime = (prev.avgResponseTime * session.answered + responseTime) 
        / (session.answered + 1);
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      
      // Adjust difficulty based on performance
      const newDifficulty = service.adjustDifficulty(
        prev.difficulty,
        newAccuracy,
        newAvgTime
      );
      
      return {
        accuracy: newAccuracy,
        avgResponseTime: newAvgTime,
        streak: newStreak,
        difficulty: newDifficulty,
      };
    });
    
    // Record result
    await service.recordResult({
      sessionId: session.sessionId,
      questionId,
      answer,
      isCorrect,
      responseTime,
    });
    
    // Get next question (may be adapted based on performance)
    const nextQuestion = await service.getNextQuestion(
      session.sessionId,
      performance
    );
    
    if (nextQuestion) {
      setSession(prev => ({
        ...prev!,
        currentQuestion: nextQuestion,
        answered: prev!.answered + 1,
      }));
    } else {
      // Session complete
      const results = await service.getSessionResults(session.sessionId);
      return results;
    }
  }, [session, performance, service]);
  
  return {
    session,
    loading,
    error,
    performance,
    generateSession,
    submitAnswer,
  };
}
```

## Code Examples

### Weakness Detection in Action

```typescript
// Example: Detecting and categorizing weaknesses

async function analyzeUserWeaknesses(userId: string) {
  const detector = new WeaknessDetector();
  const weaknesses = await detector.detectWeaknesses(userId);
  
  // Categorize by severity
  const critical = weaknesses.systematic
    .filter(w => w.severity === 'severe')
    .map(w => ({
      kanji: w.kanji,
      accuracy: w.accuracy,
      suggestion: getSuggestion(w.problemType),
    }));
  
  // Find confusion pairs
  const confusions = weaknesses.interference
    .filter(p => p.confusionCount > 5)
    .map(p => ({
      pair: [p.kanji1, p.kanji2],
      hint: p.suggestion,
      practice: generateContrastPractice(p.kanji1, p.kanji2),
    }));
  
  // Identify learning patterns
  const patterns = weaknesses.cognitive;
  
  return {
    critical,
    confusions,
    patterns,
    recommendations: generateRecommendations(weaknesses),
  };
}

function generateRecommendations(weaknesses: WeaknessProfile): string[] {
  const recommendations: string[] = [];
  
  if (weaknesses.systematic.length > 10) {
    recommendations.push('Focus on systematic review of problem kanji');
  }
  
  if (weaknesses.temporal.decayRate > 0.5) {
    recommendations.push('Increase review frequency to combat forgetting');
  }
  
  if (weaknesses.interference.length > 5) {
    recommendations.push('Practice distinguishing similar kanji');
  }
  
  if (weaknesses.cognitive.optimalSessionLength < 10) {
    recommendations.push('Take more frequent breaks to maintain focus');
  }
  
  return recommendations;
}
```

### Adaptive Session Component

```typescript
// src/components/AdaptivePractice.tsx

export function AdaptivePractice() {
  const { user } = useAuth();
  const { session, generateSession, submitAnswer, performance } = useAdaptiveLearning(user?.uid);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  
  useEffect(() => {
    if (user) {
      generateSession({ duration: 10 });
    }
  }, [user]);
  
  const handleAnswer = async (answer: string) => {
    setCurrentAnswer(answer);
    setShowFeedback(true);
    
    const result = await submitAnswer(
      session!.currentQuestion.id,
      answer,
      Date.now() - session!.currentQuestion.startTime
    );
    
    setTimeout(() => {
      setShowFeedback(false);
      setCurrentAnswer('');
      
      if (result) {
        // Session complete
        showResults(result);
      }
    }, 1500);
  };
  
  if (!session) return <Loading />;
  
  return (
    <div className="adaptive-practice">
      {/* Difficulty Indicator */}
      <DifficultyBar level={performance.difficulty} />
      
      {/* Performance Metrics */}
      <div className="metrics">
        <Stat label="Accuracy" value={`${Math.round(performance.accuracy * 100)}%`} />
        <Stat label="Streak" value={performance.streak} />
        <Stat label="Avg Time" value={`${performance.avgResponseTime / 1000}s`} />
      </div>
      
      {/* Question */}
      <QuestionCard
        question={session.currentQuestion}
        onAnswer={handleAnswer}
        showFeedback={showFeedback}
        isCorrect={currentAnswer === session.currentQuestion.correctAnswer}
      />
      
      {/* Adaptive Hints */}
      {performance.accuracy < 0.5 && (
        <HintSection hints={session.currentQuestion.hints} />
      )}
      
      {/* Progress */}
      <ProgressBar
        current={session.answered}
        total={session.questions.length}
      />
    </div>
  );
}
```

## Testing & Validation

### Unit Tests for Weakness Detection

```typescript
// src/services/__tests__/weaknessDetector.test.ts

describe('WeaknessDetector', () => {
  let detector: WeaknessDetector;
  
  beforeEach(() => {
    detector = new WeaknessDetector();
  });
  
  describe('findSystematicErrors', () => {
    it('should identify kanji with <50% accuracy', async () => {
      const history = createMockHistory({
        '水': { attempts: 10, correct: 3 },
        '火': { attempts: 10, correct: 8 },
        '木': { attempts: 10, correct: 4 },
      });
      
      const errors = await detector.findSystematicErrors(history);
      
      expect(errors).toHaveLength(2);
      expect(errors[0].kanji).toBe('水');
      expect(errors[0].accuracy).toBe(0.3);
    });
    
    it('should require minimum attempts threshold', async () => {
      const history = createMockHistory({
        '水': { attempts: 2, correct: 0 }, // Too few attempts
        '火': { attempts: 10, correct: 3 }, // Should be detected
      });
      
      const errors = await detector.findSystematicErrors(history);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].kanji).toBe('火');
    });
  });
  
  describe('findInterferencePairs', () => {
    it('should detect confused kanji pairs', async () => {
      const history = createMockHistoryWithErrors([
        { correct: '待', selected: '持' },
        { correct: '待', selected: '持' },
        { correct: '待', selected: '持' },
        { correct: '右', selected: '石' },
        { correct: '右', selected: '石' },
      ]);
      
      const pairs = await detector.findInterferencePairs(history);
      
      expect(pairs).toHaveLength(1);
      expect(pairs[0].kanji1).toBe('待');
      expect(pairs[0].kanji2).toBe('持');
      expect(pairs[0].confusionCount).toBe(3);
    });
  });
});
```

### Integration Tests

```typescript
// src/services/__tests__/adaptiveLearning.integration.test.ts

describe('AdaptiveLearning Integration', () => {
  it('should generate easier questions after poor performance', async () => {
    const service = new AdaptiveLearningService();
    const userId = 'test-user';
    
    // Simulate poor performance
    await simulatePerformance(userId, {
      accuracy: 0.4,
      avgResponseTime: 8000,
    });
    
    // Generate new session
    const session = await service.getAdaptiveSession(userId);
    
    // Should have easier distractors
    const firstQuestion = session.questions[0];
    const distractorSimilarity = firstQuestion.distractors
      .map(d => d.similarity)
      .reduce((a, b) => a + b) / firstQuestion.distractors.length;
    
    expect(distractorSimilarity).toBeLessThan(0.5);
  });
  
  it('should focus on weak areas', async () => {
    const service = new AdaptiveLearningService();
    const userId = 'test-user';
    
    // Create weakness in meanings
    await createWeakness(userId, 'meaning', ['水', '火', '木']);
    
    // Generate session
    const session = await service.getAdaptiveSession(userId);
    
    // Should have more meaning questions
    const meaningQuestions = session.questions
      .filter(q => q.type === 'meaning');
    
    expect(meaningQuestions.length).toBeGreaterThan(
      session.questions.length * 0.4
    );
  });
});
```

## Metrics & Analytics

### Performance Tracking

```typescript
interface AdaptiveMetrics {
  // Learning efficiency
  adaptationEffectiveness: number;  // % improvement with adaptation
  weaknessResolutionRate: number;   // % of weaknesses resolved
  
  // User engagement
  sessionCompletionRate: number;
  avgSessionDuration: number;
  returnRate: number;
  
  // Algorithm performance
  predictionAccuracy: number;       // How well we predict difficulty
  adaptationSpeed: number;          // How quickly we adapt
}

class AdaptiveAnalytics {
  trackAdaptation(sessionId: string, event: AdaptationEvent) {
    analytics.track('adaptive_adjustment', {
      sessionId,
      previousDifficulty: event.previous,
      newDifficulty: event.new,
      trigger: event.trigger,
      performance: event.performance,
    });
  }
  
  trackWeaknessDetection(userId: string, weaknesses: Weakness[]) {
    analytics.track('weaknesses_detected', {
      userId,
      count: weaknesses.length,
      types: weaknesses.map(w => w.type),
      severity: weaknesses.map(w => w.severity),
    });
  }
}
```

---

## Next: [Leech Management System](./04-leech-management.md)

*Last Updated: January 2025*