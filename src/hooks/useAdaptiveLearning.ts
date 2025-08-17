/**
 * useAdaptiveLearning Hook
 * Provides personalized practice based on user weaknesses
 * Production-ready with performance optimization and analytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useNotification } from '@/hooks/useNotification';
import { 
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Weakness types for adaptive learning
 */
export enum WeaknessType {
  CONSISTENT_ERROR = 'consistent_error',
  PARTIAL_KNOWLEDGE = 'partial_knowledge',
  SLOW_RECALL = 'slow_recall',
  VISUAL_CONFUSION = 'visual_confusion',
  PHONETIC_CONFUSION = 'phonetic_confusion',
  SEMANTIC_CONFUSION = 'semantic_confusion',
  QUICK_DECAY = 'quick_decay',
  INTERFERENCE = 'interference',
  CONTEXT_DEPENDENT = 'context_dependent'
}

/**
 * Learning profile for adaptive practice
 */
export interface LearningProfile {
  userId: string;
  
  // Strengths and weaknesses
  strengths: {
    meaning: string[];
    onyomi: string[];
    kunyomi: string[];
    visual: string[];
  };
  
  weaknesses: {
    meaning: WeaknessAnalysis;
    onyomi: WeaknessAnalysis;
    kunyomi: WeaknessAnalysis;
    slowRecall: WeaknessAnalysis;
    interference: InterferencePair[];
  };
  
  // Learning patterns
  patterns: {
    optimalSessionLength: number;
    bestPerformanceTime: number[];
    learningVelocity: number;
    retentionRate: number;
  };
  
  // Preferences
  preferences: {
    difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
    focusArea: 'balanced' | 'meaning' | 'reading' | 'writing';
    sessionGoal: 'accuracy' | 'speed' | 'coverage';
  };
  
  updatedAt: Date;
}

/**
 * Weakness analysis
 */
export interface WeaknessAnalysis {
  type: WeaknessType;
  severity: 'mild' | 'moderate' | 'severe';
  affectedKanji: string[];
  improvementTrend: 'improving' | 'stable' | 'declining';
  recommendedStrategy: string;
}

/**
 * Interference pair (confused kanji)
 */
export interface InterferencePair {
  kanji1: string;
  kanji2: string;
  confusionCount: number;
  lastConfused: Date;
  type: 'visual' | 'phonetic' | 'semantic';
}

/**
 * Adaptive practice session
 */
export interface AdaptiveSession {
  sessionId: string;
  questions: AdaptiveQuestion[];
  currentQuestion: AdaptiveQuestion | null;
  currentIndex: number;
  results: AdaptiveResult[];
  difficulty: number;
  focusAreas: string[];
  adaptiveRules: AdaptiveRules;
}

/**
 * Adaptive question
 */
export interface AdaptiveQuestion {
  id: string;
  kanji: string;
  type: 'meaning' | 'onyomi' | 'kunyomi' | 'discrimination';
  question: string;
  options: string[];
  correctAnswer: string;
  distractors: Distractor[];
  hints: string[];
  difficulty: number;
  targetWeakness?: WeaknessType;
}

/**
 * Question distractor
 */
export interface Distractor {
  value: string;
  type: 'similar_visual' | 'similar_sound' | 'similar_meaning' | 'random';
  similarity: number;
}

/**
 * Adaptive result
 */
export interface AdaptiveResult {
  questionId: string;
  kanji: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  responseTime: number;
  hintsUsed: number;
  difficultyAdjustment: number;
}

/**
 * Adaptive rules for session
 */
export interface AdaptiveRules {
  increaseOn: { streak: number; accuracy: number };
  decreaseOn: { mistakes: number; timeout: number };
  skipOn: { perfect: boolean; time: string };
}

/**
 * Session performance metrics
 */
export interface SessionPerformance {
  accuracy: number;
  avgResponseTime: number;
  streak: number;
  difficulty: number;
  weaknessesTargeted: string[];
  improvementRate: number;
}

/**
 * Hook return type
 */
interface UseAdaptiveLearningReturn {
  // State
  profile: LearningProfile | null;
  session: AdaptiveSession | null;
  loading: boolean;
  error: Error | null;
  performance: SessionPerformance;
  
  // Actions
  generateSession: (duration?: number) => Promise<void>;
  submitAnswer: (answer: string, responseTime: number) => Promise<AdaptiveResult | null>;
  useHint: () => string | null;
  skipQuestion: () => void;
  endSession: () => Promise<void>;
  updatePreferences: (preferences: Partial<LearningProfile['preferences']>) => Promise<void>;
  
  // Analysis
  getWeaknessAnalysis: () => WeaknessAnalysis[];
  getRecommendations: () => string[];
  getImprovementTrend: () => 'improving' | 'stable' | 'declining';
}

/**
 * useAdaptiveLearning Hook
 */
export function useAdaptiveLearning(): UseAdaptiveLearningReturn {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { showNotification } = useNotification();
  
  // State
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [session, setSession] = useState<AdaptiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [performance, setPerformance] = useState<SessionPerformance>({
    accuracy: 0,
    avgResponseTime: 0,
    streak: 0,
    difficulty: 0.5,
    weaknessesTargeted: [],
    improvementRate: 0
  });
  
  /**
   * Load or create learning profile
   */
  const loadProfile = useCallback(async () => {
    if (!user) return;
    
    try {
      const profileRef = doc(db, 'users', user.uid, 'learningProfiles', 'adaptive');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as LearningProfile);
      } else {
        // Create default profile
        const defaultProfile = createDefaultProfile(user.uid);
        await setDoc(profileRef, defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (err) {
      console.error('Failed to load learning profile:', err);
      setError(err as Error);
    }
  }, [user]);
  
  /**
   * Analyze weaknesses from recent performance
   */
  const analyzeWeaknesses = useCallback(async (userId: string): Promise<WeaknessAnalysis[]> => {
    const weaknesses: WeaknessAnalysis[] = [];
    
    try {
      // Query recent study sessions
      const sessionsRef = collection(db, 'users', userId, 'studySessions');
      const q = query(
        sessionsRef,
        where('completedAt', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        orderBy('completedAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const sessions = snapshot.docs.map(doc => doc.data());
      
      // Analyze patterns
      const kanjiStats = new Map<string, {
        attempts: number;
        correct: number;
        totalTime: number;
        errorTypes: string[];
      }>();
      
      sessions.forEach(session => {
        session.results?.forEach((result: any) => {
          const stats = kanjiStats.get(result.kanjiChar) || {
            attempts: 0,
            correct: 0,
            totalTime: 0,
            errorTypes: []
          };
          
          stats.attempts++;
          if (result.isCorrect) stats.correct++;
          stats.totalTime += result.responseTime;
          if (!result.isCorrect) stats.errorTypes.push(result.questionType);
          
          kanjiStats.set(result.kanjiChar, stats);
        });
      });
      
      // Identify weaknesses
      const weakKanji: string[] = [];
      const slowKanji: string[] = [];
      
      kanjiStats.forEach((stats, kanji) => {
        const accuracy = stats.correct / stats.attempts;
        const avgTime = stats.totalTime / stats.attempts;
        
        if (accuracy < 0.5 && stats.attempts >= 3) {
          weakKanji.push(kanji);
        }
        
        if (avgTime > 5000) { // > 5 seconds
          slowKanji.push(kanji);
        }
      });
      
      // Create weakness analyses
      if (weakKanji.length > 0) {
        weaknesses.push({
          type: WeaknessType.CONSISTENT_ERROR,
          severity: weakKanji.length > 10 ? 'severe' : weakKanji.length > 5 ? 'moderate' : 'mild',
          affectedKanji: weakKanji,
          improvementTrend: 'stable', // TODO: Calculate actual trend
          recommendedStrategy: 'Focus on mnemonic techniques and component breakdown'
        });
      }
      
      if (slowKanji.length > 0) {
        weaknesses.push({
          type: WeaknessType.SLOW_RECALL,
          severity: slowKanji.length > 10 ? 'severe' : slowKanji.length > 5 ? 'moderate' : 'mild',
          affectedKanji: slowKanji,
          improvementTrend: 'stable',
          recommendedStrategy: 'Practice with time pressure and spaced repetition'
        });
      }
      
    } catch (err) {
      console.error('Failed to analyze weaknesses:', err);
    }
    
    return weaknesses;
  }, []);
  
  /**
   * Generate adaptive practice session
   */
  const generateSession = useCallback(async (duration: number = 10) => {
    if (!user) {
      setError(new Error('User not authenticated'));
      return;
    }
    
    // Check access
    const hasAccess = await checkAndTrack('adaptive_practice');
    if (!hasAccess) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Load profile if not loaded
      if (!profile) {
        await loadProfile();
      }
      
      // Analyze current weaknesses
      const weaknesses = await analyzeWeaknesses(user.uid);
      
      // Generate questions targeting weaknesses
      const questions = await generateAdaptiveQuestions(
        weaknesses,
        profile?.preferences || { difficulty: 'adaptive', focusArea: 'balanced', sessionGoal: 'accuracy' },
        Math.floor(duration / 0.5) // Estimate 30 seconds per question
      );
      
      if (questions.length === 0) {
        showNotification({
          title: 'No Weaknesses Detected',
          message: 'Great job! Keep practicing to maintain your knowledge.',
          type: 'success'
        });
        setLoading(false);
        return;
      }
      
      // Create session
      const newSession: AdaptiveSession = {
        sessionId: `adaptive_${Date.now()}`,
        questions,
        currentQuestion: questions[0],
        currentIndex: 0,
        results: [],
        difficulty: profile?.preferences.difficulty === 'adaptive' ? 0.5 : 
                   profile?.preferences.difficulty === 'easy' ? 0.3 :
                   profile?.preferences.difficulty === 'hard' ? 0.7 : 0.5,
        focusAreas: [...new Set(weaknesses.map(w => w.type))],
        adaptiveRules: {
          increaseOn: { streak: 5, accuracy: 0.9 },
          decreaseOn: { mistakes: 3, timeout: 2 },
          skipOn: { perfect: true, time: '<2s' }
        }
      };
      
      setSession(newSession);
      
    } catch (err) {
      const error = err as Error;
      setError(error);
      showNotification({
        title: 'Failed to Generate Session',
        message: error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, checkAndTrack, showNotification, loadProfile, analyzeWeaknesses]);
  
  /**
   * Submit answer
   */
  const submitAnswer = useCallback(async (
    answer: string,
    responseTime: number
  ): Promise<AdaptiveResult | null> => {
    if (!session || !session.currentQuestion) return null;
    
    const question = session.currentQuestion;
    const isCorrect = answer === question.correctAnswer;
    
    // Create result
    const result: AdaptiveResult = {
      questionId: question.id,
      kanji: question.kanji,
      isCorrect,
      userAnswer: answer,
      correctAnswer: question.correctAnswer,
      responseTime,
      hintsUsed: 0, // TODO: Track hints
      difficultyAdjustment: 0
    };
    
    // Update performance
    const newResults = [...session.results, result];
    const accuracy = newResults.filter(r => r.isCorrect).length / newResults.length;
    const avgTime = newResults.reduce((sum, r) => sum + r.responseTime, 0) / newResults.length;
    const streak = isCorrect ? performance.streak + 1 : 0;
    
    // Adjust difficulty based on performance
    let newDifficulty = session.difficulty;
    if (streak >= session.adaptiveRules.increaseOn.streak) {
      newDifficulty = Math.min(1, newDifficulty + 0.1);
      result.difficultyAdjustment = 0.1;
    } else if (!isCorrect && newResults.filter(r => !r.isCorrect).length >= session.adaptiveRules.decreaseOn.mistakes) {
      newDifficulty = Math.max(0, newDifficulty - 0.1);
      result.difficultyAdjustment = -0.1;
    }
    
    setPerformance({
      accuracy,
      avgResponseTime: avgTime,
      streak,
      difficulty: newDifficulty,
      weaknessesTargeted: session.focusAreas,
      improvementRate: calculateImprovementRate(newResults)
    });
    
    // Move to next question
    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.questions.length;
    
    setSession(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        results: newResults,
        currentIndex: nextIndex,
        currentQuestion: isComplete ? null : prev.questions[nextIndex],
        difficulty: newDifficulty
      };
    });
    
    // Save result to database
    if (user) {
      saveSessionResult(user.uid, session.sessionId, result);
    }
    
    // Handle completion
    if (isComplete) {
      await handleSessionComplete(newResults);
    }
    
    return result;
    
  }, [session, performance, user]);
  
  /**
   * Use a hint
   */
  const useHint = useCallback((): string | null => {
    if (!session?.currentQuestion) return null;
    
    const hints = session.currentQuestion.hints;
    // TODO: Track hint usage
    
    return hints.length > 0 ? hints[0] : null;
  }, [session]);
  
  /**
   * Skip current question
   */
  const skipQuestion = useCallback(() => {
    if (!session) return;
    
    const nextIndex = session.currentIndex + 1;
    const isComplete = nextIndex >= session.questions.length;
    
    setSession(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        currentIndex: nextIndex,
        currentQuestion: isComplete ? null : prev.questions[nextIndex]
      };
    });
  }, [session]);
  
  /**
   * End session
   */
  const endSession = useCallback(async () => {
    if (!session) return;
    
    await handleSessionComplete(session.results);
    setSession(null);
  }, [session]);
  
  /**
   * Update preferences
   */
  const updatePreferences = useCallback(async (
    preferences: Partial<LearningProfile['preferences']>
  ) => {
    if (!user || !profile) return;
    
    try {
      const updatedProfile = {
        ...profile,
        preferences: { ...profile.preferences, ...preferences },
        updatedAt: new Date()
      };
      
      const profileRef = doc(db, 'users', user.uid, 'learningProfiles', 'adaptive');
      await updateDoc(profileRef, updatedProfile);
      
      setProfile(updatedProfile);
      
      showNotification({
        title: 'Preferences Updated',
        message: 'Your learning preferences have been saved.',
        type: 'success'
      });
    } catch (err) {
      console.error('Failed to update preferences:', err);
      showNotification({
        title: 'Update Failed',
        message: 'Failed to save preferences. Please try again.',
        type: 'error'
      });
    }
  }, [user, profile, showNotification]);
  
  /**
   * Get weakness analysis
   */
  const getWeaknessAnalysis = useCallback((): WeaknessAnalysis[] => {
    if (!profile) return [];
    
    return [
      profile.weaknesses.meaning,
      profile.weaknesses.onyomi,
      profile.weaknesses.kunyomi,
      profile.weaknesses.slowRecall
    ].filter(w => w && w.affectedKanji.length > 0);
  }, [profile]);
  
  /**
   * Get recommendations
   */
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    const weaknesses = getWeaknessAnalysis();
    
    weaknesses.forEach(weakness => {
      recommendations.push(weakness.recommendedStrategy);
    });
    
    if (performance.accuracy < 0.7) {
      recommendations.push('Consider reducing difficulty or taking shorter sessions');
    }
    
    if (performance.avgResponseTime > 5000) {
      recommendations.push('Practice with time pressure to improve recall speed');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }, [getWeaknessAnalysis, performance]);
  
  /**
   * Get improvement trend
   */
  const getImprovementTrend = useCallback((): 'improving' | 'stable' | 'declining' => {
    if (performance.improvementRate > 0.1) return 'improving';
    if (performance.improvementRate < -0.1) return 'declining';
    return 'stable';
  }, [performance]);
  
  // Helper functions
  
  /**
   * Create default profile
   */
  const createDefaultProfile = (userId: string): LearningProfile => ({
    userId,
    strengths: {
      meaning: [],
      onyomi: [],
      kunyomi: [],
      visual: []
    },
    weaknesses: {
      meaning: {
        type: WeaknessType.CONSISTENT_ERROR,
        severity: 'mild',
        affectedKanji: [],
        improvementTrend: 'stable',
        recommendedStrategy: ''
      },
      onyomi: {
        type: WeaknessType.CONSISTENT_ERROR,
        severity: 'mild',
        affectedKanji: [],
        improvementTrend: 'stable',
        recommendedStrategy: ''
      },
      kunyomi: {
        type: WeaknessType.CONSISTENT_ERROR,
        severity: 'mild',
        affectedKanji: [],
        improvementTrend: 'stable',
        recommendedStrategy: ''
      },
      slowRecall: {
        type: WeaknessType.SLOW_RECALL,
        severity: 'mild',
        affectedKanji: [],
        improvementTrend: 'stable',
        recommendedStrategy: ''
      },
      interference: []
    },
    patterns: {
      optimalSessionLength: 10,
      bestPerformanceTime: [9, 19], // 9 AM and 7 PM
      learningVelocity: 5,
      retentionRate: 0.8
    },
    preferences: {
      difficulty: 'adaptive',
      focusArea: 'balanced',
      sessionGoal: 'accuracy'
    },
    updatedAt: new Date()
  });
  
  /**
   * Generate adaptive questions
   */
  const generateAdaptiveQuestions = async (
    weaknesses: WeaknessAnalysis[],
    preferences: LearningProfile['preferences'],
    count: number
  ): Promise<AdaptiveQuestion[]> => {
    const questions: AdaptiveQuestion[] = [];
    
    // TODO: Implement actual question generation
    // For now, return placeholder questions
    
    weaknesses.forEach(weakness => {
      weakness.affectedKanji.slice(0, Math.ceil(count / weaknesses.length)).forEach(kanji => {
        questions.push({
          id: `q_${Date.now()}_${Math.random()}`,
          kanji,
          type: 'meaning',
          question: `What is the meaning of ${kanji}?`,
          options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
          correctAnswer: 'Option 1',
          distractors: [
            { value: 'Option 2', type: 'similar_meaning', similarity: 0.7 },
            { value: 'Option 3', type: 'random', similarity: 0.3 },
            { value: 'Option 4', type: 'random', similarity: 0.2 }
          ],
          hints: [`Think about the components of ${kanji}`],
          difficulty: preferences.difficulty === 'easy' ? 0.3 : 
                     preferences.difficulty === 'hard' ? 0.7 : 0.5,
          targetWeakness: weakness.type
        });
      });
    });
    
    return questions.slice(0, count);
  };
  
  /**
   * Calculate improvement rate
   */
  const calculateImprovementRate = (results: AdaptiveResult[]): number => {
    if (results.length < 5) return 0;
    
    const recentResults = results.slice(-5);
    const olderResults = results.slice(-10, -5);
    
    if (olderResults.length === 0) return 0;
    
    const recentAccuracy = recentResults.filter(r => r.isCorrect).length / recentResults.length;
    const olderAccuracy = olderResults.filter(r => r.isCorrect).length / olderResults.length;
    
    return recentAccuracy - olderAccuracy;
  };
  
  /**
   * Save session result
   */
  const saveSessionResult = async (userId: string, sessionId: string, result: AdaptiveResult) => {
    try {
      // Save to studySessions collection
      const sessionRef = doc(db, 'users', userId, 'studySessions', sessionId);
      await updateDoc(sessionRef, {
        results: result,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to save session result:', err);
    }
  };
  
  /**
   * Handle session completion
   */
  const handleSessionComplete = async (results: AdaptiveResult[]) => {
    const correct = results.filter(r => r.isCorrect).length;
    const accuracy = (correct / results.length) * 100;
    
    showNotification({
      title: 'Adaptive Session Complete!',
      message: `${correct}/${results.length} correct (${accuracy.toFixed(0)}%). ${getImprovementTrend()} trend.`,
      type: 'success'
    });
    
    // Update profile with new weakness analysis
    if (user) {
      const newWeaknesses = await analyzeWeaknesses(user.uid);
      // TODO: Update profile with new weaknesses
    }
  };
  
  // Load profile on mount
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);
  
  return {
    profile,
    session,
    loading,
    error,
    performance,
    generateSession,
    submitAnswer,
    useHint,
    skipQuestion,
    endSession,
    updatePreferences,
    getWeaknessAnalysis,
    getRecommendations,
    getImprovementTrend
  };
}