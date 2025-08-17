# 🐛 Leech Management System

## Overview
Leeches are kanji that consistently resist memorization despite multiple reviews. The Leech Management System identifies these problematic kanji and provides targeted interventions to break through learning plateaus.

## Table of Contents
1. [Understanding Leeches](#understanding-leeches)
2. [Detection Algorithm](#detection-algorithm)
3. [Treatment Strategies](#treatment-strategies)
4. [Implementation Details](#implementation-details)
5. [User Interface Design](#user-interface-design)
6. [Success Metrics](#success-metrics)

## Understanding Leeches

### What Makes a Kanji a Leech?

```typescript
interface LeechCriteria {
  // Quantitative markers
  minAttempts: 8;              // Minimum reviews to qualify
  maxAccuracy: 0.5;            // Consistently below 50%
  resetCount: 3;               // Times fallen back to day 1
  lapseRate: 0.4;              // Fails 40%+ of reviews
  
  // Temporal patterns
  noImprovement: 14;           // Days without improvement
  intervalRegression: true;     // Intervals getting shorter
  
  // Cognitive indicators
  slowRecall: 5000;            // Takes >5 seconds even when correct
  inconsistentPerformance: 0.3; // High variance in accuracy
}
```

### Types of Leeches

```typescript
enum LeechType {
  // Memory-based
  MEMORY_LEECH = 'memory_leech',           // Can't remember at all
  PARTIAL_LEECH = 'partial_leech',         // Remembers sometimes
  SLOW_LEECH = 'slow_leech',              // Knows but takes forever
  
  // Confusion-based
  INTERFERENCE_LEECH = 'interference_leech', // Confuses with others
  COMPONENT_LEECH = 'component_leech',      // Confuses components
  
  // Context-based
  ISOLATION_LEECH = 'isolation_leech',      // Only knows in context
  PRODUCTION_LEECH = 'production_leech',    // Recognizes but can't produce
}

interface LeechProfile {
  kanji: string;
  type: LeechType;
  severity: 'mild' | 'moderate' | 'severe';
  
  // History
  firstSeen: Date;
  attemptCount: number;
  failureCount: number;
  currentStreak: number;
  
  // Patterns
  commonErrors: ErrorPattern[];
  confusedWith: string[];
  weakestAspect: 'meaning' | 'reading' | 'writing';
  
  // Treatment
  treatmentsAttempted: TreatmentMethod[];
  currentTreatment: TreatmentPlan;
  improvementRate: number;
}
```

## Detection Algorithm

### Core Detection Logic

```typescript
class LeechDetector {
  private readonly thresholds = {
    mild: {
      attempts: 8,
      accuracy: 0.5,
      lapses: 2,
    },
    moderate: {
      attempts: 15,
      accuracy: 0.4,
      lapses: 4,
    },
    severe: {
      attempts: 25,
      accuracy: 0.3,
      lapses: 6,
    },
  };
  
  /**
   * Detect leeches in user's kanji progress
   */
  async detectLeeches(userId: string): Promise<LeechProfile[]> {
    const allProgress = await this.getAllKanjiProgress(userId);
    const leeches: LeechProfile[] = [];
    
    for (const progress of allProgress) {
      const leechScore = this.calculateLeechScore(progress);
      
      if (leechScore > 0) {
        const profile = await this.createLeechProfile(progress, leechScore);
        leeches.push(profile);
      }
    }
    
    // Sort by severity
    return leeches.sort((a, b) => 
      this.getSeverityScore(b.severity) - this.getSeverityScore(a.severity)
    );
  }
  
  /**
   * Calculate leech score (0-1, higher = worse leech)
   */
  private calculateLeechScore(progress: KanjiProgress): number {
    let score = 0;
    const weights = {
      accuracy: 0.3,
      lapses: 0.25,
      attempts: 0.2,
      regression: 0.15,
      variance: 0.1,
    };
    
    // Low accuracy contribution
    if (progress.accuracy < 0.5) {
      score += (0.5 - progress.accuracy) * 2 * weights.accuracy;
    }
    
    // High lapse rate
    const lapseRate = progress.lapses / Math.max(1, progress.reviews);
    score += Math.min(1, lapseRate * 2) * weights.lapses;
    
    // Many attempts without mastery
    if (progress.reviews > 8) {
      score += Math.min(1, progress.reviews / 30) * weights.attempts;
    }
    
    // Interval regression (getting worse)
    if (this.hasIntervalRegression(progress)) {
      score += weights.regression;
    }
    
    // High variance (inconsistent)
    const variance = this.calculateVariance(progress.history);
    score += Math.min(1, variance) * weights.variance;
    
    return Math.min(1, score);
  }
  
  /**
   * Check if intervals are regressing
   */
  private hasIntervalRegression(progress: KanjiProgress): boolean {
    const recentIntervals = progress.intervalHistory.slice(-5);
    if (recentIntervals.length < 3) return false;
    
    // Check if intervals are decreasing
    let decreasing = 0;
    for (let i = 1; i < recentIntervals.length; i++) {
      if (recentIntervals[i] < recentIntervals[i - 1]) {
        decreasing++;
      }
    }
    
    return decreasing >= recentIntervals.length * 0.6;
  }
  
  /**
   * Create detailed leech profile
   */
  private async createLeechProfile(
    progress: KanjiProgress,
    leechScore: number
  ): Promise<LeechProfile> {
    const history = await this.getDetailedHistory(progress.kanjiId);
    const errors = this.analyzeErrors(history);
    
    return {
      kanji: progress.kanji,
      type: this.determineLeechType(progress, errors),
      severity: this.determineSeverity(leechScore),
      
      // History
      firstSeen: progress.firstSeen,
      attemptCount: progress.reviews,
      failureCount: progress.lapses,
      currentStreak: progress.currentStreak,
      
      // Patterns
      commonErrors: errors.patterns,
      confusedWith: errors.confusions,
      weakestAspect: this.findWeakestAspect(progress),
      
      // Treatment
      treatmentsAttempted: progress.treatments || [],
      currentTreatment: await this.generateTreatmentPlan(progress, errors),
      improvementRate: this.calculateImprovementRate(history),
    };
  }
  
  /**
   * Determine type of leech
   */
  private determineLeechType(
    progress: KanjiProgress,
    errors: ErrorAnalysis
  ): LeechType {
    // Check for interference patterns
    if (errors.confusions.length > 0 && errors.confusionRate > 0.3) {
      return LeechType.INTERFERENCE_LEECH;
    }
    
    // Check for slow recall
    if (progress.avgResponseTime > 5000 && progress.accuracy > 0.6) {
      return LeechType.SLOW_LEECH;
    }
    
    // Check for partial knowledge
    if (progress.accuracy > 0.3 && progress.accuracy < 0.6) {
      return LeechType.PARTIAL_LEECH;
    }
    
    // Check for component confusion
    if (errors.componentErrors > errors.totalErrors * 0.4) {
      return LeechType.COMPONENT_LEECH;
    }
    
    // Check for context dependency
    if (progress.contextAccuracy > progress.isolationAccuracy * 1.5) {
      return LeechType.ISOLATION_LEECH;
    }
    
    // Check for production issues
    if (progress.recognitionAccuracy > progress.productionAccuracy * 1.5) {
      return LeechType.PRODUCTION_LEECH;
    }
    
    // Default to memory leech
    return LeechType.MEMORY_LEECH;
  }
}
```

### Advanced Pattern Recognition

```typescript
class LeechPatternAnalyzer {
  /**
   * Analyze error patterns to understand why it's a leech
   */
  analyzeLeechPatterns(leech: LeechProfile): LeechAnalysis {
    return {
      temporal: this.analyzeTemporalPatterns(leech),
      cognitive: this.analyzeCognitivePatterns(leech),
      interference: this.analyzeInterference(leech),
      suggestions: this.generateSuggestions(leech),
    };
  }
  
  /**
   * Analyze when errors occur
   */
  private analyzeTemporalPatterns(leech: LeechProfile): TemporalAnalysis {
    const patterns = {
      forgettingCurve: this.calculateForgettingRate(leech),
      timeOfDayEffect: this.analyzeTimeOfDayPerformance(leech),
      spacingEffect: this.analyzeSpacingEffect(leech),
      fatiguePoint: this.findFatiguePoint(leech),
    };
    
    return {
      ...patterns,
      recommendation: this.getTemporalRecommendation(patterns),
    };
  }
  
  /**
   * Analyze cognitive load patterns
   */
  private analyzeCognitivePatterns(leech: LeechProfile): CognitiveAnalysis {
    return {
      workingMemoryLoad: this.assessMemoryLoad(leech),
      visualComplexity: this.assessVisualComplexity(leech.kanji),
      phoneticComplexity: this.assessPhoneticComplexity(leech),
      semanticComplexity: this.assessSemanticComplexity(leech),
      
      bottleneck: this.identifyBottleneck(leech),
    };
  }
  
  /**
   * Identify cognitive bottleneck
   */
  private identifyBottleneck(leech: LeechProfile): CognitiveBottleneck {
    const scores = {
      encoding: this.assessEncodingIssues(leech),      // Can't form memory
      storage: this.assessStorageIssues(leech),        // Can't retain
      retrieval: this.assessRetrievalIssues(leech),    // Can't recall
    };
    
    const maxScore = Math.max(...Object.values(scores));
    const bottleneck = Object.entries(scores)
      .find(([_, score]) => score === maxScore)?.[0] as CognitiveStage;
    
    return {
      stage: bottleneck,
      severity: maxScore,
      evidence: this.gatherEvidence(leech, bottleneck),
    };
  }
}
```

## Treatment Strategies

### Treatment Method Library

```typescript
enum TreatmentMethod {
  // Memory techniques
  MNEMONIC = 'mnemonic',                   // Story/image association
  RADICAL_BREAKDOWN = 'radical_breakdown',  // Component analysis
  ETYMOLOGY = 'etymology',                  // Historical origin
  
  // Multi-sensory
  WRITING_PRACTICE = 'writing_practice',    // Muscle memory
  VISUALIZATION = 'visualization',          // Mental imagery
  VOCALIZATION = 'vocalization',           // Say aloud
  
  // Context-based
  SENTENCE_PRACTICE = 'sentence_practice',  // Use in context
  WORD_FAMILY = 'word_family',             // Related vocabulary
  REAL_USAGE = 'real_usage',               // Authentic materials
  
  // Contrast-based
  MINIMAL_PAIRS = 'minimal_pairs',         // Similar kanji contrast
  ERROR_ANALYSIS = 'error_analysis',       // Understand mistakes
  DISCRIMINATION = 'discrimination',        // Focus on differences
  
  // Intensive
  OVERLEARNING = 'overlearning',           // Excessive practice
  IMMERSION = 'immersion',                 // Concentrated exposure
  SPACED_MICROLEARNING = 'microlearning',  // Tiny frequent sessions
}

class TreatmentPlanner {
  /**
   * Generate personalized treatment plan
   */
  generateTreatmentPlan(leech: LeechProfile): TreatmentPlan {
    const methods = this.selectTreatmentMethods(leech);
    const schedule = this.createSchedule(methods, leech.severity);
    const exercises = this.generateExercises(methods, leech);
    
    return {
      leechId: leech.kanji,
      methods,
      schedule,
      exercises,
      duration: this.estimateDuration(leech.severity),
      successCriteria: this.defineSuccess(leech),
    };
  }
  
  /**
   * Select appropriate treatment methods
   */
  private selectTreatmentMethods(leech: LeechProfile): TreatmentMethod[] {
    const methods: TreatmentMethod[] = [];
    
    // Base selection on leech type
    switch (leech.type) {
      case LeechType.MEMORY_LEECH:
        methods.push(
          TreatmentMethod.MNEMONIC,
          TreatmentMethod.RADICAL_BREAKDOWN,
          TreatmentMethod.WRITING_PRACTICE
        );
        break;
        
      case LeechType.INTERFERENCE_LEECH:
        methods.push(
          TreatmentMethod.MINIMAL_PAIRS,
          TreatmentMethod.DISCRIMINATION,
          TreatmentMethod.ERROR_ANALYSIS
        );
        break;
        
      case LeechType.SLOW_LEECH:
        methods.push(
          TreatmentMethod.OVERLEARNING,
          TreatmentMethod.SPACED_MICROLEARNING,
          TreatmentMethod.VISUALIZATION
        );
        break;
        
      case LeechType.COMPONENT_LEECH:
        methods.push(
          TreatmentMethod.RADICAL_BREAKDOWN,
          TreatmentMethod.ETYMOLOGY,
          TreatmentMethod.VISUALIZATION
        );
        break;
        
      case LeechType.ISOLATION_LEECH:
        methods.push(
          TreatmentMethod.SENTENCE_PRACTICE,
          TreatmentMethod.WORD_FAMILY,
          TreatmentMethod.REAL_USAGE
        );
        break;
        
      case LeechType.PRODUCTION_LEECH:
        methods.push(
          TreatmentMethod.WRITING_PRACTICE,
          TreatmentMethod.VOCALIZATION,
          TreatmentMethod.OVERLEARNING
        );
        break;
    }
    
    // Filter out already attempted methods that failed
    return methods.filter(m => 
      !leech.treatmentsAttempted.includes(m) ||
      this.wasPartiallySuccessful(m, leech)
    );
  }
  
  /**
   * Generate specific exercises for treatment
   */
  private generateExercises(
    methods: TreatmentMethod[],
    leech: LeechProfile
  ): Exercise[] {
    const exercises: Exercise[] = [];
    
    methods.forEach(method => {
      switch (method) {
        case TreatmentMethod.MNEMONIC:
          exercises.push(this.generateMnemonicExercise(leech));
          break;
          
        case TreatmentMethod.RADICAL_BREAKDOWN:
          exercises.push(this.generateRadicalExercise(leech));
          break;
          
        case TreatmentMethod.MINIMAL_PAIRS:
          exercises.push(this.generateMinimalPairsExercise(leech));
          break;
          
        case TreatmentMethod.WRITING_PRACTICE:
          exercises.push(this.generateWritingExercise(leech));
          break;
          
        case TreatmentMethod.SENTENCE_PRACTICE:
          exercises.push(this.generateSentenceExercise(leech));
          break;
      }
    });
    
    return exercises;
  }
}
```

### Specific Treatment Implementations

```typescript
class TreatmentExercises {
  /**
   * Generate mnemonic exercise
   */
  generateMnemonicExercise(leech: LeechProfile): MnemonicExercise {
    const components = this.breakDownKanji(leech.kanji);
    const story = this.generateStory(components, leech.kanji);
    const visual = this.generateVisualMnemonic(leech.kanji);
    
    return {
      type: 'mnemonic',
      kanji: leech.kanji,
      
      // Story-based mnemonic
      story: {
        text: story,
        keywords: this.extractKeywords(story),
        components: components.map(c => ({
          character: c,
          meaning: this.getComponentMeaning(c),
          role: this.getComponentRole(c, leech.kanji),
        })),
      },
      
      // Visual mnemonic
      visual: {
        imageUrl: visual.url,
        description: visual.description,
        associations: visual.associations,
      },
      
      // Interactive elements
      practice: {
        fillInBlanks: this.createFillInBlanks(story),
        storyRecall: this.createStoryRecall(story),
        visualRecall: this.createVisualRecall(visual),
      },
      
      // Reinforcement
      reinforcement: {
        interval: 1, // Review after 1 day
        repetitions: 5,
        variations: this.createVariations(story),
      },
    };
  }
  
  /**
   * Generate minimal pairs exercise
   */
  generateMinimalPairsExercise(leech: LeechProfile): MinimalPairsExercise {
    const confusedKanji = leech.confusedWith[0]; // Most confused with
    
    return {
      type: 'minimal_pairs',
      target: leech.kanji,
      contrast: confusedKanji,
      
      // Visual comparison
      visual: {
        sideBySide: true,
        differences: this.highlightDifferences(leech.kanji, confusedKanji),
        animations: this.createComparisonAnimation(leech.kanji, confusedKanji),
      },
      
      // Meaning contrast
      meaning: {
        target: this.getMeaning(leech.kanji),
        contrast: this.getMeaning(confusedKanji),
        mnemonicDistinction: this.createDistinctionMnemonic(leech.kanji, confusedKanji),
      },
      
      // Practice activities
      activities: [
        {
          type: 'discrimination',
          description: 'Choose the correct kanji',
          questions: this.generateDiscriminationQuestions(leech.kanji, confusedKanji),
        },
        {
          type: 'spot_difference',
          description: 'Identify the differences',
          challenges: this.generateSpotDifferencesChallenges(leech.kanji, confusedKanji),
        },
        {
          type: 'context_choice',
          description: 'Choose the right kanji for the context',
          sentences: this.generateContextSentences(leech.kanji, confusedKanji),
        },
      ],
      
      // Success criteria
      mastery: {
        accuracyRequired: 0.9,
        speedRequired: 2000, // ms
        consecutiveCorrect: 10,
      },
    };
  }
  
  /**
   * Generate writing practice exercise
   */
  generateWritingExercise(leech: LeechProfile): WritingExercise {
    const strokeOrder = this.getStrokeOrder(leech.kanji);
    
    return {
      type: 'writing',
      kanji: leech.kanji,
      
      // Guided practice
      guided: {
        strokeOrder,
        strokeAnimation: this.createStrokeAnimation(strokeOrder),
        checkpoints: this.createCheckpoints(strokeOrder),
        hints: this.createStrokeHints(strokeOrder),
      },
      
      // Free practice
      free: {
        canvas: true,
        strokeRecognition: true,
        feedback: 'immediate',
        tolerance: 0.8, // Stroke accuracy required
      },
      
      // Memory techniques
      memory: {
        rhythmPattern: this.createRhythmPattern(strokeOrder),
        muscleMemory: this.createMuscleMemoryExercise(strokeOrder),
        blindWriting: this.createBlindWritingChallenge(leech.kanji),
      },
      
      // Progression
      progression: {
        stages: [
          { name: 'Trace', required: 5 },
          { name: 'Copy', required: 10 },
          { name: 'Recall', required: 10 },
          { name: 'Blind', required: 5 },
        ],
        currentStage: 0,
      },
    };
  }
}
```

## Implementation Details

### Service Architecture

```typescript
// src/services/leechManagement/index.ts

export class LeechManagementService {
  private detector: LeechDetector;
  private analyzer: LeechPatternAnalyzer;
  private planner: TreatmentPlanner;
  private tracker: TreatmentTracker;
  
  constructor() {
    this.detector = new LeechDetector();
    this.analyzer = new LeechPatternAnalyzer();
    this.planner = new TreatmentPlanner();
    this.tracker = new TreatmentTracker();
  }
  
  /**
   * Full leech management workflow
   */
  async manageLeeches(userId: string): Promise<LeechManagementResult> {
    // 1. Detect leeches
    const leeches = await this.detector.detectLeeches(userId);
    
    // 2. Analyze patterns
    const analyzed = await Promise.all(
      leeches.map(leech => this.analyzer.analyzeLeechPatterns(leech))
    );
    
    // 3. Generate treatment plans
    const plans = leeches.map(leech => 
      this.planner.generateTreatmentPlan(leech)
    );
    
    // 4. Track ongoing treatments
    const progress = await this.tracker.getProgress(userId);
    
    return {
      leeches,
      analyses: analyzed,
      treatments: plans,
      progress,
      recommendations: this.generateRecommendations(leeches, progress),
    };
  }
  
  /**
   * Start treatment for a leech
   */
  async startTreatment(
    userId: string,
    leechId: string,
    planId: string
  ): Promise<TreatmentSession> {
    const plan = await this.planner.getPlan(planId);
    const session = this.createSession(plan);
    
    await this.tracker.startTracking(userId, leechId, session);
    
    return session;
  }
  
  /**
   * Update treatment progress
   */
  async updateProgress(
    sessionId: string,
    result: ExerciseResult
  ): Promise<ProgressUpdate> {
    const progress = await this.tracker.updateProgress(sessionId, result);
    
    // Check if treatment is successful
    if (progress.successCriteriaMet) {
      await this.graduateLeech(progress.leechId);
    }
    
    // Adjust treatment if not improving
    if (progress.improvementRate < 0.1) {
      const newPlan = await this.adjustTreatment(progress);
      return { ...progress, newPlan };
    }
    
    return progress;
  }
}
```

### React Components

```typescript
// src/components/LeechManager/LeechDashboard.tsx

export function LeechDashboard() {
  const { user } = useAuth();
  const [leeches, setLeeches] = useState<LeechProfile[]>([]);
  const [selectedLeech, setSelectedLeech] = useState<LeechProfile | null>(null);
  const [treatment, setTreatment] = useState<TreatmentPlan | null>(null);
  
  useEffect(() => {
    loadLeeches();
  }, [user]);
  
  const loadLeeches = async () => {
    if (!user) return;
    
    const service = new LeechManagementService();
    const result = await service.manageLeeches(user.uid);
    setLeeches(result.leeches);
  };
  
  const startTreatment = async (leech: LeechProfile) => {
    const service = new LeechManagementService();
    const plan = await service.generateTreatmentPlan(leech);
    setTreatment(plan);
    setSelectedLeech(leech);
  };
  
  return (
    <div className="leech-dashboard">
      {/* Overview */}
      <div className="overview">
        <h2>Leech Management</h2>
        <div className="stats">
          <Stat label="Total Leeches" value={leeches.length} />
          <Stat label="Severe" value={leeches.filter(l => l.severity === 'severe').length} />
          <Stat label="In Treatment" value={leeches.filter(l => l.currentTreatment).length} />
        </div>
      </div>
      
      {/* Leech List */}
      <div className="leech-grid">
        {leeches.map(leech => (
          <LeechCard
            key={leech.kanji}
            leech={leech}
            onStartTreatment={() => startTreatment(leech)}
          />
        ))}
      </div>
      
      {/* Treatment Modal */}
      {treatment && selectedLeech && (
        <TreatmentModal
          leech={selectedLeech}
          plan={treatment}
          onClose={() => {
            setTreatment(null);
            setSelectedLeech(null);
          }}
        />
      )}
    </div>
  );
}
```

## User Interface Design

### Leech Card Component

```tsx
// Visual representation of a leech
<LeechCard>
  <div className="leech-header">
    <KanjiDisplay character="待" size="large" />
    <SeverityBadge severity="moderate" />
  </div>
  
  <div className="leech-stats">
    <div className="stat">
      <span className="label">Attempts</span>
      <span className="value">23</span>
    </div>
    <div className="stat">
      <span className="label">Accuracy</span>
      <span className="value">35%</span>
    </div>
    <div className="stat">
      <span className="label">Type</span>
      <span className="value">Interference</span>
    </div>
  </div>
  
  <div className="confusion-info">
    <span>Often confused with:</span>
    <div className="confused-kanji">
      <KanjiChip character="持" />
      <KanjiChip character="時" />
    </div>
  </div>
  
  <div className="actions">
    <button className="start-treatment">
      Start Treatment
    </button>
    <button className="view-analysis">
      View Analysis
    </button>
  </div>
</LeechCard>
```

### Treatment Session Interface

```tsx
// Treatment exercise screen
<TreatmentSession>
  <ProgressHeader>
    <h3>Treating: 待</h3>
    <ProgressBar value={60} max={100} />
    <span>Day 3 of 7</span>
  </ProgressHeader>
  
  <ExerciseArea>
    {/* Mnemonic Exercise Example */}
    <MnemonicExercise>
      <StorySection>
        <h4>Remember this story:</h4>
        <p>
          A TEMPLE (寺) where people WAIT (待) by walking 
          around (⻌) in circles, checking their watches
        </p>
        <ComponentBreakdown>
          <Component radical="⻌" meaning="walk" />
          <Component radical="寺" meaning="temple" />
        </ComponentBreakdown>
      </StorySection>
      
      <VisualMnemonic>
        <img src="/mnemonics/wait-temple.svg" />
      </VisualMnemonic>
      
      <RecallTest>
        <p>Fill in the blanks:</p>
        <p>
          People ___ at the ___ by ___ around
        </p>
        <input type="text" placeholder="Your answer" />
      </RecallTest>
    </MnemonicExercise>
  </ExerciseArea>
  
  <NavigationControls>
    <button>Previous</button>
    <button>Skip</button>
    <button>Next</button>
  </NavigationControls>
</TreatmentSession>
```

## Success Metrics

### Tracking Treatment Effectiveness

```typescript
interface TreatmentMetrics {
  // Individual leech metrics
  leech: {
    pretreatmentAccuracy: number;
    postTreatmentAccuracy: number;
    timeToGraduation: number; // Days
    relapsRate: number;       // % that become leeches again
  };
  
  // Treatment method effectiveness
  methodEffectiveness: Map<TreatmentMethod, {
    successRate: number;
    avgTimeToSuccess: number;
    bestForType: LeechType[];
  }>;
  
  // User engagement
  engagement: {
    treatmentCompletionRate: number;
    avgSessionsPerLeech: number;
    userSatisfaction: number;
  };
  
  // System performance
  detection: {
    precision: number;  // True leeches / detected
    recall: number;     // Detected / all leeches
    earlyDetection: number; // Detected before severe
  };
}

class TreatmentAnalytics {
  /**
   * Measure treatment success
   */
  async measureSuccess(
    leechId: string,
    userId: string
  ): Promise<TreatmentSuccess> {
    const before = await this.getPreTreatmentMetrics(leechId, userId);
    const after = await this.getPostTreatmentMetrics(leechId, userId);
    
    return {
      accuracyImprovement: after.accuracy - before.accuracy,
      speedImprovement: before.responseTime - after.responseTime,
      retentionImprovement: after.retention - before.retention,
      graduated: after.accuracy > 0.8 && after.retention > 0.7,
      daysInTreatment: after.endDate - before.startDate,
    };
  }
  
  /**
   * Track method effectiveness
   */
  async analyzeMethodEffectiveness(): Promise<MethodAnalysis> {
    const results = await this.getAllTreatmentResults();
    const byMethod = new Map<TreatmentMethod, TreatmentResult[]>();
    
    // Group by method
    results.forEach(result => {
      result.methods.forEach(method => {
        const list = byMethod.get(method) || [];
        list.push(result);
        byMethod.set(method, list);
      });
    });
    
    // Calculate effectiveness
    const effectiveness = new Map();
    
    byMethod.forEach((results, method) => {
      const successful = results.filter(r => r.graduated);
      
      effectiveness.set(method, {
        successRate: successful.length / results.length,
        avgTime: average(successful.map(r => r.duration)),
        bestFor: this.findBestTypes(method, results),
      });
    });
    
    return effectiveness;
  }
}
```

### A/B Testing Framework

```typescript
class LeechTreatmentABTest {
  /**
   * Run A/B test for treatment methods
   */
  async runTest(
    testConfig: ABTestConfig
  ): Promise<ABTestResult> {
    const { controlMethod, testMethod, sampleSize } = testConfig;
    
    // Randomly assign leeches to groups
    const leeches = await this.getEligibleLeeches(sampleSize * 2);
    const control = leeches.slice(0, sampleSize);
    const test = leeches.slice(sampleSize);
    
    // Apply treatments
    await this.applyTreatment(control, controlMethod);
    await this.applyTreatment(test, testMethod);
    
    // Wait for results
    await this.waitForCompletion(testConfig.duration);
    
    // Analyze results
    return {
      control: await this.analyzeGroup(control),
      test: await this.analyzeGroup(test),
      significance: this.calculateSignificance(control, test),
      recommendation: this.makeRecommendation(control, test),
    };
  }
}
```

---

## Next: [Database Schema Design](./07-database-schema.md)

*Last Updated: January 2025*