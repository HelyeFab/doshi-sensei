'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, DrillQuestion, WordList, KanjiList, WordType } from '@/types';
import { ExtendedConjugationForms } from '@/types/conjugation-extended';
import { searchWords } from '@/utils/api';
import { getCachedCommonWordsForPractice } from '@/utils/practiceCache';
import { ExtendedConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '@/utils/conjugation-extended';
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
import DrillSettingsDropdown from '@/components/drill/DrillSettingsDropdown';

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
  "keywords": [
    "Japanese quiz",
    "verb conjugation test",
    "Japanese grammar drill",
    "JLPT practice",
    "Japanese learning quiz",
    "vocabulary review"
  ]
};

export default function DrillPage() {
  const router = useRouter();
  const { settings, isLoading: settingsLoading, updateSetting } = useSettings();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('drill_practice');
  const { isPremium, userType } = useSubscription2();
  const { trackDrillComplete } = useAnalytics();
  const { updateProgress } = useAchievements();
  const strings = useStrings();

  // Conjugation drill state
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [wordTypeFilter, setWordTypeFilter] = useState<'all' | 'verbs' | 'adjectives'>('all');
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [kanjiLists, setKanjiLists] = useState<KanjiList[]>([]);
  const [conjugableLists, setConjugableLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<'random' | 'lists'>('random');
  const [autoAdvance, setAutoAdvance] = useState(false);

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
    targetForm: keyof ExtendedConjugationForms,
    correctAnswer: string
  ): DrillQuestion => {
    const stem = generateQuestionStem(word, targetForm);
    const distractors = generateDistractors(word, targetForm, correctAnswer);
    const options = shuffleArray([correctAnswer, ...distractors]);

    return {
      id: `${word.id}-${targetForm}`,
      word,
      targetForm,
      stem,
      correctAnswer,
      options,
      rule: ExtendedConjugationEngine.getConjugationRule(word.type, targetForm)
    };
  };

  const generateDistractors = (word: JapaneseWord, targetForm: keyof ExtendedConjugationForms, correctAnswer: string): string[] => {

    const conjugations = ExtendedConjugationEngine.conjugate(word);

    const allForms = Object.values(conjugations).filter(form => form && form !== correctAnswer);

    const distractors: string[] = [];

    // Add conjugation forms as distractors
    for (let i = 0; i < Math.min(4, allForms.length); i++) {
      if (!distractors.includes(allForms[i])) {
        distractors.push(allForms[i]);
      }
    }

    // Generate artificial distractors if needed
    while (distractors.length < 4) {
      const kanjiStem = word.kanji.slice(0, -1);
      const endings = ['る', 'た', 'ない', 'ます', 'て', 'ぬ', 'ば', 'れる', 'せる'];

      for (const ending of endings) {
        if (distractors.length >= 4) break;

        const distractor = kanjiStem + ending;
        if (!distractors.includes(distractor) &&
            distractor !== correctAnswer &&
            !allForms.includes(distractor) &&
            distractor !== word.kanji) {
          distractors.push(distractor);
        }
      }

      // Emergency fallback
      if (distractors.length < 4) {
        const emergency = [`${kanjiStem}XX`, `${kanjiStem}YY`, `${kanjiStem}ZZ`];
        for (const emerg of emergency) {
          if (distractors.length >= 4) break;
          if (!distractors.includes(emerg)) {
            distractors.push(emerg);
          }
        }
      }

      break; // Prevent infinite loop
    }

    return distractors.slice(0, 4); // Return exactly 4 distractors
  };

  const loadWordLists = useCallback(async () => {
    try {

      // Load unified study lists and convert them to legacy format for compatibility
      const studyLists = await StudyListManager.getAllStudyLists();

      const legacyWordLists: WordList[] = studyLists.map(studyList => ({
        id: studyList.id,
        name: studyList.name,
        description: studyList.description,
        wordIds: studyList.itemIds,
        createdAt: studyList.createdAt,
        updatedAt: studyList.updatedAt,
        color: studyList.color,
        isConjugable: studyList.type === 'drillable'
      }));

      // Use the converted lists
      setWordLists(legacyWordLists);
    } catch (err) {
      console.error('Error loading word lists:', err);
      // No lists available
      setWordLists([]);
    }
  }, []);

  const loadKanjiLists = useCallback(async () => {
    try {
      // For now, load legacy kanji lists until we fully migrate
      const lists = await KanjiListManager.getAllKanjiLists();
      setKanjiLists(lists);
    } catch (err) {
      console.error('Error loading kanji lists:', err);
    }
  }, []);

  const loadAllLists = useCallback(async () => {
    await Promise.all([loadWordLists(), loadKanjiLists()]);
  }, [loadWordLists, loadKanjiLists]);

  const loadQuestionsForWord = useCallback(async (word: JapaneseWord) => {

    try {
      setLoading(true);
      const forms: (keyof ExtendedConjugationForms)[] = [
        'present', 'past', 'negative', 'pastNegative',
        'polite', 'politePast', 'teForm'
      ];

      const applicableForms = forms.filter(form => {
        const conjugations = ExtendedConjugationEngine.conjugate(word);
        return conjugations[form] !== undefined;
      });

      const selectedForms = shuffleArray([...applicableForms]).slice(0, 5);
      const conjugations = ExtendedConjugationEngine.conjugate(word);
      const drillQuestions = selectedForms.map(form => {
        const correctAnswer = conjugations[form];
        if (!correctAnswer) {
          return generateDrillQuestion(word, 'present', conjugations.present);
        }
        return generateDrillQuestion(word, form, correctAnswer);
      });

      setQuestions(drillQuestions);
    } catch (error) {
      console.error('Error loading questions for word:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

        // Debug: log word types before filtering
        words.forEach((word, index) => {
        });

        // Keep track of all words before filtering
        const allWords = [...words];

        // Filter for conjugable words using strict validation
        const originalCount = words.length;
        words = words.filter(word => {
          // Check for explicit conjugable types
          const conjugableTypes: WordType[] = ['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];
          if (conjugableTypes.includes(word.type)) {
            return true;
          }

          // For words that might be misclassified, try to fix them via API lookup
          return false; // We'll handle API lookup separately
        });

        // If we have few or no conjugable words, try to fix misclassified ones
        if (words.length < 5) {
          const remainingWords = allWords.filter((w: JapaneseWord) => !words.includes(w));

          for (const word of remainingWords.slice(0, 10)) { // Limit API calls
            try {
              const fixedWord = await fixWordType(word);
              const conjugableTypes: WordType[] = ['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];
              if (conjugableTypes.includes(fixedWord.type)) {
                words.push(fixedWord);
              }
            } catch (error) {
              console.error(`Failed to fix word type for ${word.kanji}:`, error);
            }
          }
        }

        if (words.length === 0) {
          setQuestions([]);
          return;
        }
      } else {
        words = await getCachedCommonWordsForPractice();
      }

      const filteredWords = words.filter(word => {
        if (wordTypeFilter === 'verbs') {
          return word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular';
        } else if (wordTypeFilter === 'adjectives') {
          return word.type === 'i-adjective' || word.type === 'na-adjective';
        }
        return true;
      });

      if (filteredWords.length === 0) {
        setQuestions([]);
        return;
      }

      const shuffledWords = shuffleArray(filteredWords);
      const drillQuestions = await generateDrillQuestions(shuffledWords, settings.dailyGoal);
      setQuestions(drillQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [drillMode, selectedLists, settings.dailyGoal, wordTypeFilter]);

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
        const apiWord = apiResults[0];

        // If API gives us a conjugable type, use it
        if (['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'].includes(apiWord.type)) {
          return { ...word, type: apiWord.type };
        }
      }

      // If kanji lookup fails, try kana lookup
      if (word.kana && word.kanji !== word.kana) {
        const kanaResults = await searchWords(word.kana, 1);
        if (kanaResults.length > 0) {
          const kanaWord = kanaResults[0];

          if (['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'].includes(kanaWord.type)) {
            return { ...word, type: kanaWord.type };
          }
        }
      }

    } catch (error) {
      console.error(`🔧 API lookup failed for ${word.kanji} (${word.kana}):`, error);
    }

    return word; // No change needed or API failed
  };

  // Pattern-based word type classification (fallback when API fails)
  const fixWordTypeByPattern = (word: JapaneseWord): JapaneseWord => {
    const kana = word.kana || word.kanji; // Fallback to kanji if kana is undefined
    const kanji = word.kanji;

    // Common verb patterns
    if (kana && kana.endsWith('る')) {
      // Check for ichidan verb patterns
      const ichidanEndings = ['える', 'いる', 'きる', 'ぎる', 'じる', 'ちる', 'にる', 'びる', 'みる', 'りる'];
      if (ichidanEndings.some(ending => kana.endsWith(ending))) {
        return { ...word, type: 'Ichidan' };
      }
      // Could be godan る verb
      return { ...word, type: 'Godan' };
    }

    // Godan verb endings
    const godanEndings = ['う', 'く', 'ぐ', 'す', 'つ', 'ぬ', 'ぶ', 'む'];
    if (kana && godanEndings.some(ending => kana.endsWith(ending))) {
      return { ...word, type: 'Godan' };
    }

    // i-adjective pattern
    if (kana && kana.endsWith('い') && !kana.endsWith('しい') && !kanji.includes('綺麗') && !kanji.includes('嫌い')) {
      return { ...word, type: 'i-adjective' };
    }

    // Common irregular verbs
    const irregularVerbs = ['する', 'くる', '来る', 'いく', '行く'];
    if (irregularVerbs.includes(kanji) || (kana && irregularVerbs.includes(kana))) {
      return { ...word, type: 'Irregular' };
    }

    // Common na-adjectives (these are often misclassified as nouns)
    const commonNaAdjectives = [
      '元気', '静か', '綺麗', '有名', '便利', '簡単', '複雑', '安全', '危険', '自由',
      '特別', '大切', '大丈夫', '親切', '丁寧', '正直', '素直', '真面目', '不思議'
    ];
    if (commonNaAdjectives.includes(kanji)) {
      return { ...word, type: 'na-adjective' };
    }

    return word; // No pattern match found
  };

  // Cache for API lookups to avoid repeated calls
  const wordTypeCache = new Map<string, JapaneseWord>();

  // Wrapper that uses cache for performance
  const fixWordType = async (word: JapaneseWord): Promise<JapaneseWord> => {
    const cacheKey = `${word.kanji}-${word.kana}`;

    if (wordTypeCache.has(cacheKey)) {
      return wordTypeCache.get(cacheKey)!;
    }

    const fixedWord = await fixWordTypeWithAPI(word);
    wordTypeCache.set(cacheKey, fixedWord);
    return fixedWord;
  };

  const generateDrillQuestions = async (words: JapaneseWord[], targetCount: number): Promise<DrillQuestion[]> => {
    const questions: DrillQuestion[] = [];

    for (let i = 0; i < targetCount; i++) {
      // Cycle through words if we need more questions than words available
      const originalWord = words[i % words.length];
      const word = await fixWordType(originalWord); // Fix word type before conjugation

      const targetForm = getRandomConjugationForm(word.type);
      const conjugations = ExtendedConjugationEngine.conjugate(word);
      const correctAnswer = conjugations[targetForm];

      // Skip words that have empty/invalid conjugations
      if (!correctAnswer || correctAnswer.trim() === '') {

        // Try present form as fallback
        if (conjugations.present && conjugations.present.trim() !== '') {
          questions.push(generateDrillQuestion(word, 'present', conjugations.present));
        } else {
          // Skip this word entirely if no valid conjugations exist
          continue;
        }
      } else {
        questions.push(generateDrillQuestion(word, targetForm, correctAnswer));
      }
    }

    return questions;
  };

  useEffect(() => {
    const initializeSystem = async () => {
      // Only initialize if we haven't already done so
      const hasInitialized = localStorage.getItem('doshi_sensei_system_initialized');
      if (!hasInitialized) {
        await StudyListManager.initializeNewSystem();
        localStorage.setItem('doshi_sensei_system_initialized', 'true');
      }
      loadAllLists();
      
      // Preload practice cache for quick drill preview
      PracticeCache.preloadCache().catch(err => {
        console.error('Error preloading practice cache:', err);
      });
    };

    initializeSystem();
  }, [loadAllLists]);

  // Update computed states after lists are loaded
  useEffect(() => {
    // Filter only conjugable word lists for conjugation drills
    const conjugableOnly = wordLists.filter(list => list.isConjugable);
    setConjugableLists(conjugableOnly);
  }, [wordLists]);

  useEffect(() => {
    const loadInitialQuestions = async () => {
      if (settingsLoading) return;

      if (typeof window !== 'undefined') {
        const storedWord = sessionStorage.getItem('drillWord');
        if (storedWord) {
          try {
            const word = JSON.parse(storedWord);
            await loadQuestionsForWord(word);
            sessionStorage.removeItem('drillWord');
          } catch (err) {
            console.error('Error parsing stored word:', err);
            loadQuestions();
          }
        } else {
          loadQuestions();
        }
      } else {
        loadQuestions();
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

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowRules(false);
    } else {
      if (gameStarted && questions.length > 0) {
        await recordDrillSession();
      }
    }
  };

  const handleRestart = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setShowRules(false);
    setGameStarted(false);
    loadQuestions();
  };

  const startGame = async () => {

    // Check if user can do drill
    const canDo = await checkAndTrack('drill_practice');

    if (!canDo) {

      return;
    }

    setGameStarted(true);
  };

  const handleListToggle = (listId: string) => {

    setSelectedLists(prev => {
      const newSelection = prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId];
      return newSelection;
    });
  };

  const recordDrillSession = async (finalScore?: number) => {
    const actualScore = finalScore !== undefined ? finalScore : score;

    try {
      const wordsStudied = questions.map(q => q.word.id);
      await trackDrillCompleted('conjugation-drill', questions.length, actualScore, wordsStudied);
      
      // Track in new analytics system
      trackDrillComplete('conjugation', actualScore, questions.length);

      // Usage tracking is now handled automatically by checkAndTrack
    } catch (err) {
      console.error('Error recording drill session:', err);
    }
  };

  // Check drill limits
  if (!featureLoading && access && !access.allowed && remaining === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title={strings.drill.title} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto">
            <div className="text-6xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Daily Drill Limit Reached
            </h3>
            <p className="text-muted-foreground mb-6">
              You've completed {access.usage || 0} out of {access.limit || 3} drills today.
            </p>
            <button
              onClick={() => router.push('/account')}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title={strings.drill.title} />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">{strings.common.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isFinished = currentQuestionIndex >= questions.length - 1 && showResult;

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title={strings.drill.title} />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(drillStructuredData),
          }}
        />

        {/* Score Display when in game */}
        {gameStarted && (
          <div className="text-right mb-4">
            <div className="text-sm text-muted-foreground">
              {strings.drill.score}: {score}/{questions.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1} {strings.common.of} {questions.length}
            </div>
          </div>
        )}

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
              <div className="py-6 md:py-12">
                {/* Header Card */}
                <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
                  <div className="text-4xl mb-3">🎯</div>
                  <h2 className="text-2xl font-semibold mb-2 text-card-foreground">
                    Conjugation Practice
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Master Japanese verb and adjective conjugations
                  </p>
                </div>

                {/* Mobile Settings Dropdown */}
                <DrillSettingsDropdown
                  dailyGoal={settings.dailyGoal}
                  onDailyGoalChange={(value) => updateSetting('dailyGoal', value)}
                  wordTypeFilter={wordTypeFilter}
                  onWordTypeFilterChange={setWordTypeFilter}
                  drillMode={drillMode}
                  onDrillModeChange={setDrillMode}
                  autoAdvance={autoAdvance}
                  onAutoAdvanceChange={setAutoAdvance}
                  conjugableLists={conjugableLists}
                  selectedLists={selectedLists}
                  onListToggle={handleListToggle}
                />

                {/* Desktop Settings (hidden on mobile) */}
                <div className="hidden md:block bg-card border border-border rounded-lg p-6 mb-6">
                  <div className="space-y-6">
                    {/* Daily Goal */}
                    <div className="bg-muted/30 rounded-lg p-4">
                      <DailyGoalSlider 
                        value={settings.dailyGoal} 
                        onChange={(value) => updateSetting('dailyGoal', value)}
                      />
                    </div>

                    {/* Practice Type */}
                    <div>
                      <div className="text-sm text-muted-foreground mb-3">Practice with:</div>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {(['all', 'verbs', 'adjectives'] as const).map((filter) => (
                          <button
                            key={filter}
                            onClick={() => setWordTypeFilter(filter)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              wordTypeFilter === filter
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-foreground border-input hover:bg-muted'
                            }`}
                          >
                            {filter === 'all' ? 'All Types' :
                             filter === 'verbs' ? 'Verbs Only' : 'Adjectives Only'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drill Mode */}
                    <div>
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

                      {/* List Selection */}
                      {drillMode === 'lists' && (
                        <div className="mb-4">
                          {conjugableLists.length > 0 ? (
                            <div className="space-y-3">
                              <div className="text-sm text-muted-foreground">Select conjugable lists to drill:</div>
                              <div className="max-h-48 overflow-y-auto space-y-2 bg-muted/30 rounded-lg p-3">
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
                                      />
                                      <span className="text-sm text-foreground">{list.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({list.wordIds.length} words)
                                      </span>
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

                    {/* Auto-Advance */}
                    <div>
                      <label className="flex items-center justify-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoAdvance}
                          onChange={(e) => setAutoAdvance(e.target.checked)}
                          className="rounded border-border"
                        />
                        <div>
                          <span className="text-sm text-foreground block">Auto-advance to next question</span>
                          <span className="text-xs text-muted-foreground">(automatically moves to next after 2 seconds)</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Start Drill Card */}
                  <button
                    onClick={startGame}
                    disabled={drillMode === 'lists' && selectedLists.length === 0}
                    className="bg-card border-2 border-primary hover:bg-primary/10 rounded-lg p-6 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🚀</div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">Start Practice</h3>
                    <p className="text-sm text-muted-foreground">
                      Begin with {questions.length} questions
                    </p>
                  </button>

                  {/* Quick Practice Card */}
                  <button
                    onClick={() => loadQuestions()}
                    className="bg-card border border-border hover:bg-muted/50 rounded-lg p-6 transition-all hover:shadow-lg group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔄</div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">Refresh Questions</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a new set of practice questions
                    </p>
                  </button>
                </div>
                
                {/* Additional Info Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">📊</div>
                    <div className="text-xs text-muted-foreground">Questions</div>
                    <div className="text-lg font-semibold text-card-foreground">{questions.length}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-xs text-muted-foreground">Goal</div>
                    <div className="text-lg font-semibold text-card-foreground">{settings.dailyGoal}</div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">📝</div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="text-lg font-semibold text-card-foreground">
                      {wordTypeFilter === 'all' ? 'All' : wordTypeFilter === 'verbs' ? 'Verbs' : 'Adj'}
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-4 text-center">
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-xs text-muted-foreground">Mode</div>
                    <div className="text-lg font-semibold text-card-foreground">
                      {drillMode === 'random' ? 'Random' : 'Lists'}
                    </div>
                  </div>
                </div>
                
                {/* Quick Drill Preview - Show pre-selected words for random mode */}
                {drillMode === 'random' && (
                  <QuickDrillPreview 
                    onSelectWord={async (word) => {

                      await loadQuestionsForWord(word);

                      await startGame();

                    }}
                  />
                )}
              </div>
            ) : isFinished ? (
              // Results Screen
              <div className="py-6 md:py-12">
                {/* Results Header Card */}
                <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center">
                  <div className="text-5xl mb-3">
                    {score / questions.length >= 0.8 ? '🏆' : score / questions.length >= 0.6 ? '✨' : '💪'}
                  </div>
                  <h2 className="text-2xl font-semibold mb-2 text-card-foreground">
                    {score / questions.length >= 0.8 ? 'Excellent!' : score / questions.length >= 0.6 ? 'Good Job!' : 'Keep Practicing!'}
                  </h2>
                  <div className="text-4xl font-bold text-primary mb-2">
                    {score}/{questions.length}
                  </div>
                  <div className="text-lg text-muted-foreground">
                    {Math.round((score / questions.length) * 100)}% accuracy
                  </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleRestart}
                    className="bg-card border-2 border-primary hover:bg-primary/10 rounded-lg p-6 transition-all hover:shadow-lg group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔄</div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">Try Again</h3>
                    <p className="text-sm text-muted-foreground">
                      Practice with the same questions
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      loadQuestions();
                      setGameStarted(false);
                    }}
                    className="bg-card border border-border hover:bg-muted/50 rounded-lg p-6 transition-all hover:shadow-lg group"
                  >
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🎲</div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">New Practice</h3>
                    <p className="text-sm text-muted-foreground">
                      Get a fresh set of questions
                    </p>
                  </button>
                </div>
              </div>
            ) : (
              // Question Screen
              <div className="bg-card border border-border rounded-lg p-6 mb-6">
                {/* Question */}
                <div className="text-center mb-8">
                  <div className="text-sm text-muted-foreground mb-2">
                    {strings.drill.question}
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl japanese-text font-medium text-card-foreground mr-3">
                      {currentQuestion.word.kanji}
                    </span>
                    {currentQuestion.word.kana && (
                      <span className="text-lg japanese-text text-muted-foreground mr-3">
                        ({currentQuestion.word.kana})
                      </span>
                    )}
                    {(currentQuestion.word.meaning || currentQuestion.word.english) && (
                      <span className="text-sm text-muted-foreground">
                        "{currentQuestion.word.meaning || currentQuestion.word.english}"
                      </span>
                    )}
                  </div>
                  <div className="text-xl text-foreground mb-2">
                    {(strings.conjugation.forms as Record<string, string>)[currentQuestion.targetForm]} form:
                  </div>
                  <div className="text-3xl japanese-text font-bold text-primary">
                    {currentQuestion.stem}
                  </div>
                </div>

                {/* Options */}
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === currentQuestion.correctAnswer;
                    const isIncorrect = showResult && isSelected && !isCorrect;

                    return (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={showResult}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          showResult
                            ? isCorrect
                              ? 'bg-green-500/10 border-green-500 text-green-400'
                              : isIncorrect
                              ? 'bg-red-500/10 border-red-500 text-red-400'
                              : 'bg-muted border-border text-muted-foreground'
                            : isSelected
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-background border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="japanese-text text-lg font-medium">
                          {option}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Result */}
                {showResult && (
                  <div className="text-center mb-6">
                    <div className={`text-lg font-medium mb-2 ${
                      selectedAnswer === currentQuestion.correctAnswer
                        ? 'text-green-400'
                        : 'text-red-400'
                    }`}>
                      {selectedAnswer === currentQuestion.correctAnswer
                        ? strings.drill.correct
                        : strings.drill.incorrect}
                    </div>

                    {selectedAnswer !== currentQuestion.correctAnswer && (
                      <div className="text-muted-foreground">
                        {strings.drill.showAnswer}: <span className="japanese-text font-medium text-foreground">{currentQuestion.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rules */}
                <div className="border-t border-border pt-4">
                  <button
                    onClick={() => setShowRules(!showRules)}
                    className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                  >
                    {showRules ? strings.drill.hideRules : strings.drill.showRules}
                  </button>

                  {showRules && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">
                        <strong>{strings.verbTypes[currentQuestion.word.type.toLowerCase().replace('-', '') as keyof typeof strings.verbTypes]}:</strong>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {currentQuestion.rule}
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Button */}
                {showResult && (
                  <div className="text-center mt-6">
                    <button
                      onClick={handleNextQuestion}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      {currentQuestionIndex < questions.length - 1 ? strings.drill.nextQuestion : 'Finish'}
                    </button>
                  </div>
                )}
              </div>
            )}
        </main>
      </div>
    </div>
  );
}
