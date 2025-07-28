'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, DrillQuestion, ConjugationForms, WordList, KanjiList, WordType } from '@/types';
import { searchWords } from '@/utils/api';
import { getCachedCommonWordsForPractice } from '@/utils/practiceCache';
import { ConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '@/utils/conjugation';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { DailyGoalSlider } from '@/components/DailyGoalSlider';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { Analytics } from '@/utils/analytics';
import StudyListManager from '@/utils/studyListManager';
import KanjiListManager from '@/utils/kanjiListManager';
import { trackDrillCompleted } from '@/lib/stats/trackingEvents';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAchievements } from '@/hooks/useAchievements';
import { QuickDrillPreview } from '@/components/drill/QuickDrillPreview';
import { PracticeCache } from '@/utils/practiceCache';

// Structured Data for Drill Page
const drillStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Conjugation Quiz",
  "description": "Interactive Japanese verb and adjective conjugation quizzes. Test your knowledge and improve your Japanese grammar skills.",
  "url": "https://doshisensei.com/drill",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Quiz",
  "about": {
    "@type": "Thing",
    "name": "Japanese Language",
    "description": "Japanese grammar, verb conjugations, and vocabulary testing"
  },
  "teaches": [
    "Japanese verb conjugation",
    "Grammar pattern recognition",
    "JLPT preparation",
    "Interactive Japanese practice"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "audience": {
    "@type": "EducationalAudience",
    "educationalRole": "student"
  }
};

export default function DrillClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAccess, canDrill, resetDailyLimit } = useAccess();
  const { isFeatureEnabled, getFeature, checkFeatureAccess } = useFeature();
  const { isPremium } = useSubscription2();
  const { trackEvent, trackDrillComplete } = useAnalytics();
  const { updateProgress } = useAchievements();
  const { settings, updateSetting, loading: settingsLoading } = useSettings();
  const strings = useStrings();

  // State for quiz logic
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [loading, setLoading] = useState(false);

  // State for configuration
  const [wordTypeFilter, setWordTypeFilter] = useState<'all' | 'verbs' | 'adjectives'>('all');
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [kanjiLists, setKanjiLists] = useState<KanjiList[]>([]);
  const [conjugableLists, setConjugableLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<'random' | 'lists'>('random');
  const [autoAdvance, setAutoAdvance] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Existing conjugation drill functions
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateDrillQuestion = (
    word: JapaneseWord,
    targetForm: keyof ConjugationForms,
    correctAnswer: string
  ): DrillQuestion => {
    const stem = generateQuestionStem(word, targetForm);
    const distractors = generateDistractors(word, targetForm, correctAnswer);
    const options = shuffleArray([correctAnswer, ...distractors]);

    return {
      id: `${word.id}-${targetForm}`,
      word,
      question: stem,
      options,
      correctAnswer,
      conjugationForm: targetForm,
      conjugations: ConjugationEngine.conjugate(word)
    };
  };

  const generateDistractors = (
    word: JapaneseWord,
    targetForm: keyof ConjugationForms,
    correctAnswer: string
  ): string[] => {
    const distractors: string[] = [];
    const conjugations = ConjugationEngine.conjugate(word);

    // Add other conjugation forms as distractors
    const otherForms = Object.entries(conjugations)
      .filter(([form, value]) => form !== targetForm && value !== correctAnswer)
      .map(([, value]) => value);

    distractors.push(...otherForms.slice(0, 3));

    // If we don't have enough distractors, create variations
    while (distractors.length < 3) {
      const variation = createDistractorVariation(correctAnswer, distractors);
      if (variation && !distractors.includes(variation)) {
        distractors.push(variation);
      } else {
        // Add a random conjugation from a different word type
        const randomDistractor = getRandomDistractor(word.type);
        if (randomDistractor && !distractors.includes(randomDistractor)) {
          distractors.push(randomDistractor);
        }
      }
    }

    return distractors.slice(0, 3);
  };

  const createDistractorVariation = (correctAnswer: string, existingDistractors: string[]): string => {
    // Create plausible wrong answers based on common mistakes
    const variations = [
      correctAnswer.replace(/ない$/, 'なかった'),
      correctAnswer.replace(/ます$/, 'ません'),
      correctAnswer.replace(/た$/, 'て'),
      correctAnswer.replace(/て$/, 'た'),
      correctAnswer.replace(/れば$/, 'たら'),
      correctAnswer.replace(/たら$/, 'れば'),
    ];

    return variations.find(v => v !== correctAnswer && !existingDistractors.includes(v)) || correctAnswer + 'です';
  };

  const getRandomDistractor = (wordType: string): string => {
    const commonEndings = {
      verb: ['ます', 'ました', 'ません', 'ませんでした', 'て', 'た', 'ない', 'なかった'],
      'i-adjective': ['い', 'くない', 'かった', 'くなかった'],
      'na-adjective': ['だ', 'ではない', 'だった', 'ではなかった'],
    };

    const endings = commonEndings[wordType as keyof typeof commonEndings] || commonEndings.verb;
    return endings[Math.floor(Math.random() * endings.length)];
  };

  // Pattern-based word type classification
  const fixWordTypeByPattern = (word: JapaneseWord): JapaneseWord => {
    if (!word.reading || !word.kanji) return word;

    const reading = word.reading;
    
    // Check for i-adjectives (ending in い but not えい)
    if (reading.endsWith('い') && !reading.endsWith('えい')) {
      // Special cases that are NOT i-adjectives
      const notIAdjectives = ['きらい', 'せかい', 'じょうだい'];
      if (!notIAdjectives.some(exception => reading.endsWith(exception))) {
        return { ...word, type: 'i-adjective' };
      }
    }
    
    // Check for na-adjectives (common patterns)
    const naAdjectiveEndings = ['てき', 'か', 'やか'];
    if (naAdjectiveEndings.some(ending => reading.endsWith(ending))) {
      return { ...word, type: 'na-adjective' };
    }
    
    // Check for Ichidan verbs (ending in る with specific patterns)
    if (reading.endsWith('る')) {
      // Check if it's an Ichidan verb based on the preceding sound
      const ichiданPatterns = ['える', 'ける', 'せる', 'てる', 'ねる', 'べる', 'める', 'れる', 'げる', 'じる', 'ちる', 'にる', 'びる', 'みる', 'りる'];
      if (ichiданPatterns.some(pattern => reading.endsWith(pattern))) {
        return { ...word, type: 'Ichidan' };
      }
    }
    
    // Check for Godan verbs
    const godanEndings = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む'];
    if (godanEndings.some(ending => reading.endsWith(ending))) {
      return { ...word, type: 'Godan' };
    }
    
    // Check for する verbs
    if (reading.endsWith('する') || word.kanji.endsWith('する')) {
      return { ...word, type: 'Irregular' };
    }
    
    return word;
  };

  // Enhanced word type lookup with pattern matching fallback
  const fixWordTypeWithAPI = async (word: JapaneseWord): Promise<JapaneseWord> => {
    if (word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular' || word.type === 'i-adjective' || word.type === 'na-adjective') {
      return word; // Already correctly classified
    }

    // First try pattern-based classification (faster and doesn't rely on API)
    const patternFixedWord = fixWordTypeByPattern(word);
    if (patternFixedWord.type !== word.type) {
      return patternFixedWord;
    }

    // If pattern matching didn't work, try API lookup (with better error handling)
    try {
      // Use existing searchWords API to get authoritative word type
      const apiResults = await searchWords(word.kanji, 1);
      
      if (apiResults.length > 0) {
        const matchingWord = apiResults.find(w => 
          w.kanji === word.kanji || w.reading === word.reading
        );
        
        if (matchingWord && matchingWord.type && matchingWord.type !== 'Unknown') {
          return { ...word, type: matchingWord.type };
        }
      }
    } catch (error) {
      console.warn(`API lookup failed for word ${word.kanji}, using pattern matching`, error);
    }

    return word;
  };

  const fixWordType = async (word: JapaneseWord): Promise<JapaneseWord> => {
    // Skip if already has a valid type
    if (word.type && word.type !== 'Unknown' && word.type !== 'verb') {
      return word;
    }

    try {
      const fixedWord = await fixWordTypeWithAPI(word);
      return fixedWord;
    } catch (error) {
      console.warn(`Failed to fix word type for ${word.kanji}:`, error);
      return word;
    }
  };

  const generateDrillQuestions = async (words: JapaneseWord[], targetCount: number): Promise<DrillQuestion[]> => {
    const questions: DrillQuestion[] = [];

    for (let i = 0; i < targetCount; i++) {
      // Cycle through words if we need more questions than words available
      const originalWord = words[i % words.length];
      const word = await fixWordType(originalWord); // Fix word type before conjugation

      const targetForm = getRandomConjugationForm(word.type);
      const conjugations = ConjugationEngine.conjugate(word);
      const correctAnswer = conjugations[targetForm];

      if (correctAnswer && correctAnswer !== '-') {
        const question = generateDrillQuestion(word, targetForm, correctAnswer);
        questions.push(question);
      } else {
        // Try another form if this one doesn't have a conjugation
        console.warn(`No conjugation for ${word.kanji} in form ${targetForm}`);
        i--; // Retry with a different form
      }
    }

    return questions;
  };

  // Strict validation for conjugable words
  const isStrictlyConjugable = (word: JapaneseWord): boolean => {
    if (!word.type) return false;
    
    const conjugableTypes = ['verb', 'Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];
    return conjugableTypes.includes(word.type);
  };

  // Load user lists
  useEffect(() => {
    const loadUserLists = async () => {
      if (!user) return;

      try {
        const [fetchedWordLists, fetchedKanjiLists] = await Promise.all([
          StudyListManager.getLists(user.uid),
          KanjiListManager.getLists(user.uid)
        ]);

        setWordLists(fetchedWordLists);
        setKanjiLists(fetchedKanjiLists);

        // Filter for conjugable lists
        const conjugable = fetchedWordLists.filter(list => list.isConjugable);
        setConjugableLists(conjugable);
      } catch (error) {
        console.error('Error loading user lists:', error);
      }
    };

    loadUserLists();
  }, [user]);

  // Load questions based on mode and selection
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);

      let words: JapaneseWord[] = [];

      if (drillMode === 'lists' && selectedLists.length > 0) {
        // Use the new unified system to get words from lists
        for (const listId of selectedLists) {
          const { words: listWords } = await StudyListManager.getItemsInList(listId);
          words = [...words, ...listWords];
        }

        if (words.length === 0) {
          setQuestions([]);
          return;
        }

        // Keep track of all words before filtering
        const allWords = [...words];

        // Filter for conjugable words using strict validation
        words = words.filter(isStrictlyConjugable);

        if (words.length === 0) {
          console.warn('No conjugable words found in selected lists');
          setQuestions([]);
          return;
        }
      } else {
        // Random mode - get common words
        const cachedWords = await getCachedCommonWordsForPractice();
        words = cachedWords.filter(isStrictlyConjugable);
      }

      // Apply word type filter
      if (wordTypeFilter !== 'all') {
        words = words.filter(word => {
          if (wordTypeFilter === 'verbs') {
            return ['verb', 'Ichidan', 'Godan', 'Irregular'].includes(word.type || '');
          } else if (wordTypeFilter === 'adjectives') {
            return ['i-adjective', 'na-adjective'].includes(word.type || '');
          }
          return true;
        });
      }

      if (words.length === 0) {
        setQuestions([]);
        return;
      }

      // Generate questions
      const targetCount = Math.min(settings.dailyGoal || 10, words.length * 3);
      const generatedQuestions = await generateDrillQuestions(words, targetCount);
      setQuestions(shuffleArray(generatedQuestions));

    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [drillMode, selectedLists, settings.dailyGoal, wordTypeFilter]);

  // Load questions for a specific word (from Quick Drill Preview)
  const loadQuestionsForWord = useCallback(async (word: JapaneseWord) => {
    try {
      setLoading(true);

      // Fix word type if needed
      const fixedWord = await fixWordType(word);
      
      // Generate multiple questions for this single word
      const questions: DrillQuestion[] = [];
      const conjugationForms = Object.keys(ConjugationEngine.conjugate(fixedWord)) as (keyof ConjugationForms)[];
      
      // Create questions for different conjugation forms
      for (const form of conjugationForms.slice(0, 5)) { // Limit to 5 forms
        const conjugations = ConjugationEngine.conjugate(fixedWord);
        const correctAnswer = conjugations[form];
        
        if (correctAnswer && correctAnswer !== '-') {
          const question = generateDrillQuestion(fixedWord, form, correctAnswer);
          questions.push(question);
        }
      }

      setQuestions(shuffleArray(questions));
    } catch (error) {
      console.error('Error loading questions for word:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial questions when settings are ready
  useEffect(() => {
    const loadInitialQuestions = async () => {
      if (!settingsLoading && settings.dailyGoal && drillMode === 'random') {
        await loadQuestions();
      } else if (drillMode === 'lists' && selectedLists.length > 0) {
        await loadQuestions();
      }
    };

    loadInitialQuestions();
  }, [settings.dailyGoal, settingsLoading, drillMode, selectedLists, loadQuestions, loadQuestionsForWord]);

  const handleAnswerSelect = async (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const newScore = answer === currentQuestion.correctAnswer ? score + 1 : score;
    if (answer === currentQuestion.correctAnswer) {
      setScore(newScore);
    }

    const isLastQuestion = currentQuestionIndex >= questions.length - 1;
    if (isLastQuestion && gameStarted && questions.length > 0) {
      setTimeout(async () => {
        await recordDrillSession(newScore);

        // Track drill completion analytics
        Analytics.trackDrillCompleted(user?.uid, {
          score: newScore,
          totalQuestions: questions.length,
          accuracy: Math.round((newScore / questions.length) * 100),
          mode: drillMode,
          completedAt: new Date().toISOString(),
        });
        
        // Track in new analytics system
        trackDrillComplete(drillMode, newScore, questions.length);
        
        // Update achievement progress
        try {
          const newlyUnlocked = await updateProgress('drillsCompleted');
          if (newlyUnlocked.length > 0) {
            console.log('🏆 [Achievements] New achievements unlocked:', newlyUnlocked);
          }
        } catch (error) {
          console.error('Error updating achievement progress:', error);
        }
      }, 100);
    }

    // Auto-advance to next question if enabled
    if (autoAdvance && !isLastQuestion) {
      setTimeout(() => {
        handleNextQuestion();
      }, 2000); // Wait 2 seconds before advancing
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer('');
      setShowResult(false);
    } else {
      setIsFinished(true);
    }
  };

  const startGame = async () => {
    if (!checkAccess('drill')) {
      return;
    }

    setGameStarted(true);
    setIsFinished(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShowResult(false);

    // Track drill start
    trackEvent('drill_started', { 
      mode: drillMode,
      wordType: wordTypeFilter,
      totalQuestions: questions.length
    });
  };

  const resetGame = () => {
    setGameStarted(false);
    setIsFinished(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setShowResult(false);
    loadQuestions();
  };

  const recordDrillSession = async (finalScore: number) => {
    if (!user || questions.length === 0) return;

    try {
      await trackDrillCompleted(questions.length, finalScore);
    } catch (error) {
      console.error('Error recording drill session:', error);
    }
  };

  const handleListToggle = (listId: string) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  if (!strings || !strings.drill) {
    return null;
  }

  const accuracyPercentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(drillStructuredData),
        }}
      />

      <SmartPageHeader title={strings.drill?.title || 'Conjugation Drill'} />

      <div className="px-4 md:px-6 lg:px-8">
        <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
            {questions.length === 0 ? (
              <div className="text-center max-w-md mx-auto">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {drillMode === 'lists' && selectedLists.length === 0
                    ? 'Select Lists to Drill'
                    : drillMode === 'lists'
                    ? 'No Conjugable Words Found'
                    : 'Failed to Load Data'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {drillMode === 'lists' && selectedLists.length === 0
                    ? 'Please select at least one list to drill from your saved word lists.'
                    : drillMode === 'lists'
                    ? 'The selected lists contain only nouns or non-conjugable words. Please save verbs and adjectives to your lists for conjugation practice.'
                    : 'Unable to load practice questions. Please try again.'}
                </p>
                <button
                  onClick={loadQuestions}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {strings.common.retry}
                </button>
              </div>
            ) : !gameStarted ? (
              // Start Screen
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8 mb-8">
                  <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
                    Ready to practice?
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Test your knowledge with {questions.length} conjugation questions
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <DailyGoalSlider 
                      value={settings.dailyGoal} 
                      onChange={(value) => updateSetting('dailyGoal', value)}
                    />
                  </div>

                  {/* Drill Mode Selection */}
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-3">Drill Mode:</div>
                    <div className="flex gap-2 justify-center flex-wrap mb-4">
                      <button
                        onClick={() => setDrillMode('random')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          drillMode === 'random'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        Random Words
                      </button>
                      <button
                        onClick={() => setDrillMode('lists')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          drillMode === 'lists'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        My Lists ({conjugableLists.length})
                      </button>
                    </div>

                    {/* List Selection - Only Conjugable Lists */}
                    {drillMode === 'lists' && (
                      <div className="mb-4">
                        {conjugableLists.length > 0 ? (
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">Select conjugable lists to drill:</div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {conjugableLists.map((list) => (
                                <label key={list.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                                  <input
                                    type="checkbox"
                                    checked={selectedLists.includes(list.id)}
                                    onChange={() => handleListToggle(list.id)}
                                    className="rounded border-border"
                                  />
                                  <div className="flex items-center gap-2 flex-1">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: list.color }}
                                    ></div>
                                    <span className="text-sm text-foreground">{list.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                      ({list.wordIds.length} words)
                                    </span>
                                    {list.isConjugable && (
                                      <span className="text-xs text-green-400">✓ conjugable</span>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
                            No conjugable lists found. Create vocabulary lists with verbs and adjectives to use conjugation drills.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Word Type Filter */}
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-3">Practice with:</div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        onClick={() => setWordTypeFilter('all')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          wordTypeFilter === 'all'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        All Types
                      </button>
                      <button
                        onClick={() => setWordTypeFilter('verbs')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          wordTypeFilter === 'verbs'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        Verbs Only
                      </button>
                      <button
                        onClick={() => setWordTypeFilter('adjectives')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          wordTypeFilter === 'adjectives'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        Adjectives Only
                      </button>
                    </div>
                  </div>

                  {/* Auto-advance toggle */}
                  <div className="mb-6">
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(e) => setAutoAdvance(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Auto-advance to next question</span>
                    </label>
                  </div>

                  <button
                    onClick={startGame}
                    disabled={drillMode === 'lists' && selectedLists.length === 0}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Conjugation Drill
                  </button>
                </div>
                
                {/* Quick Drill Preview - Show pre-selected words for random mode */}
                {drillMode === 'random' && (
                  <QuickDrillPreview 
                    onSelectWord={async (word) => {
                      console.log('Drill page: onSelectWord called with:', word);
                      await loadQuestionsForWord(word);
                      console.log('Drill page: Questions loaded');
                      await startGame();
                      console.log('Drill page: Game started');
                    }}
                  />
                )}
              </div>
            ) : isFinished ? (
              // Results Screen
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8">
                  <h2 className="text-3xl font-semibold mb-4 text-card-foreground">
                    {strings.common.success}
                  </h2>
                  <div className="text-6xl font-bold text-primary mb-2">
                    {score}/{questions.length}
                  </div>
                  <p className="text-xl text-muted-foreground mb-2">
                    {accuracyPercentage}% accuracy
                  </p>
                  <p className="text-muted-foreground mb-6">
                    {score === questions.length
                      ? 'Perfect score! 🎉'
                      : score >= questions.length * 0.8
                      ? 'Great job! 👏'
                      : score >= questions.length * 0.6
                      ? 'Good effort! 👍'
                      : 'Keep practicing! 💪'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={resetGame}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Practice Again
                    </button>
                    <button
                      onClick={() => router.push('/')}
                      className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Question Screen
              <div className="py-8">
                <div className="mb-4 flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    Score: {score}
                  </p>
                </div>

                <div className="bg-card border border-border rounded-lg p-8 mb-6">
                  <h2 className="text-2xl font-semibold mb-2 text-card-foreground">
                    {currentQuestion.word.kanji}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-1">
                    {currentQuestion.word.reading}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {currentQuestion.word.meanings.join(', ')}
                  </p>
                  <p className="text-lg font-medium text-foreground">
                    {currentQuestion.question}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showResult}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        showResult
                          ? option === currentQuestion.correctAnswer
                            ? 'bg-success/20 border-success text-success-foreground'
                            : option === selectedAnswer
                            ? 'bg-destructive/20 border-destructive text-destructive-foreground'
                            : 'bg-muted border-border text-muted-foreground'
                          : 'bg-background border-border hover:bg-muted hover:border-input text-foreground'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {showResult && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <p className={`font-medium ${selectedAnswer === currentQuestion.correctAnswer ? 'text-success' : 'text-destructive'}`}>
                      {selectedAnswer === currentQuestion.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    {selectedAnswer !== currentQuestion.correctAnswer && (
                      <p className="text-sm text-muted-foreground mt-1">
                        The correct answer is: <span className="font-medium text-foreground">{currentQuestion.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                )}

                {showResult && (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  </button>
                )}
              </div>
            )}
          </main>
      </div>
    </div>
  );
}