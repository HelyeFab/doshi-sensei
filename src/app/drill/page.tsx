'use client';

import { useState, useEffect, useCallback } from 'react';
import { JapaneseWord, DrillQuestion, ConjugationForms, WordList, KanjiList, FlashcardQuality, WordType } from '@/types';
import { getCommonWordsForPractice, searchWords } from '@/utils/api';
import { ConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { Analytics } from '@/utils/analytics';
import StudyListManager from '@/utils/studyListManager';
import WordListManager from '@/utils/wordLists';
import KanjiListManager from '@/utils/kanjiListManager';
import StatsManager from '@/utils/stats';
import flashcardManager, { FlashcardQuestion, FlashcardSessionConfig } from '@/utils/flashcards';
import FlashcardCard from '@/components/flashcards/FlashcardCard';
import CompanionTrigger from '@/components/CompanionTrigger';

// Structured Data for Drill Page
const drillStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Conjugation Quiz & Flashcard Review",
  "description": "Interactive Japanese verb and adjective conjugation quizzes plus spaced repetition flashcard review. Test your knowledge and improve your Japanese grammar skills.",
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
    "Vocabulary memorization",
    "Spaced repetition learning",
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
    "flashcard review",
    "spaced repetition",
    "JLPT practice",
    "Japanese learning quiz",
    "vocabulary review"
  ]
};

export default function DrillPage() {
  const { settings, isLoading: settingsLoading } = useSettings();
  const {
    userSubscription,
    canDoDrill,
    incrementDrillCount,
    incrementGuestDrillCount,
    userType,
    guestUsage,
    showLoginPrompt,
    showUpgradePrompt
  } = useSubscription();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'conjugation' | 'flashcards'>('conjugation');

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
  const [allLists, setAllLists] = useState<(WordList | KanjiList)[]>([]);
  const [conjugableLists, setConjugableLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<'random' | 'lists'>('random');
  const [autoAdvance, setAutoAdvance] = useState(false);

  // Flashcard state
  const [flashcardQuestions, setFlashcardQuestions] = useState<FlashcardQuestion[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardGameStarted, setFlashcardGameStarted] = useState(false);
  const [flashcardScore, setFlashcardScore] = useState(0);
  const [flashcardSession, setFlashcardSession] = useState<any>(null);
  const [flashcardStats, setFlashcardStats] = useState<any>(null);
  const [showHints, setShowHints] = useState(false);
  const [cardDirection, setCardDirection] = useState<'kanji-first' | 'english-first' | 'mixed'>('mixed');
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [immediateCards, setImmediateCards] = useState<any[]>([]);
  const [studyRecommendations, setStudyRecommendations] = useState<any>(null);

  // Initialize flashcard manager with user
  useEffect(() => {
    if (user) {
      flashcardManager.setUser(user.uid);
      loadFlashcardStats();
    }
  }, [user]);

  const loadFlashcardStats = async () => {
    if (!user) return;
    try {
      const stats = await flashcardManager.getStudyStats();
      setFlashcardStats(stats);

      // Load both due cards and immediate review cards
      const { dueCards: actualDueCards, immediateCards: immediateReviewCards } = await flashcardManager.getAllReviewCards();
      setDueCards(actualDueCards);
      setImmediateCards(immediateReviewCards);

      // Load study recommendations
      const allProgress = await flashcardManager.getAllFlashcardProgress();
      const { getStudyRecommendations } = await import('@/utils/spacedRepetition');
      const recommendations = getStudyRecommendations(allProgress);
      setStudyRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading flashcard stats:', error);
    }
  };

  const loadFlashcardQuestions = async () => {
    if (!user || selectedLists.length === 0) return;

    try {
      setFlashcardLoading(true);

      // Get all words and kanji from unified study lists
      let allWords: JapaneseWord[] = [];

      for (const listId of selectedLists) {
        const { words: listWords, kanji: listKanji } = await StudyListManager.getItemsInList(listId);

        // Add words directly
        allWords = [...allWords, ...listWords];

        // Convert kanji to JapaneseWord format for flashcards
        const kanjiAsWords: JapaneseWord[] = listKanji.map(kanji => ({
          id: `kanji_${kanji.kanji}`,
          kanji: kanji.kanji,
          kana: kanji.onyomi.length > 0 ? kanji.onyomi[0] : kanji.kunyomi[0],
          romaji: '', // Not needed for flashcards
          meaning: kanji.meaning,
          type: 'noun', // Default type for kanji
          jlpt: kanji.jlpt || 'N5',
          frequency: 0,
          tags: ['kanji'] // Required property
        }));
        allWords = [...allWords, ...kanjiAsWords];
      }


      if (allWords.length === 0) {
        setFlashcardQuestions([]);
        return;
      }

      // Create flashcard questions manually since we have mixed content
      const shuffledWords = allWords.sort(() => Math.random() - 0.5);
      const limitedWords = shuffledWords.slice(0, 20);

      const questions: FlashcardQuestion[] = limitedWords.map(word => {
        let cardType: 'kanji-to-meaning' | 'meaning-to-kanji';

        // Determine card type based on user preference
        if (cardDirection === 'kanji-first') {
          cardType = 'kanji-to-meaning';
        } else if (cardDirection === 'english-first') {
          cardType = 'meaning-to-kanji';
        } else {
          // Mixed mode - random selection
          cardType = Math.random() < 0.5 ? 'kanji-to-meaning' : 'meaning-to-kanji';
        }

        return {
          word,
          cardType,
          question: cardType === 'kanji-to-meaning' ? word.kanji : word.meaning,
          answer: cardType === 'kanji-to-meaning' ? word.meaning : word.kanji,
          hint: word.kana
        };
      });

      setFlashcardQuestions(questions);

      if (questions.length > 0) {
        const config: FlashcardSessionConfig = {
          wordListIds: selectedLists,
          maxCards: 20,
          cardTypes: ['kanji-to-meaning', 'meaning-to-kanji'],
          reviewDueOnly: false
        };
        const session = await flashcardManager.createSession(config);
        setFlashcardSession(session);
      }
    } catch (error) {
      console.error('Error loading flashcard questions:', error);
    } finally {
      setFlashcardLoading(false);
    }
  };

  const handleFlashcardAnswer = async (quality: FlashcardQuality, responseTime: number) => {
    if (!flashcardSession || !flashcardQuestions[currentFlashcardIndex]) return;

    const currentQuestion = flashcardQuestions[currentFlashcardIndex];
    const wasCorrect = quality >= 3;

    try {
      // Determine card type for advanced algorithm
      const cardType = currentQuestion.word.id.startsWith('kanji_') ? 'kanji' :
                      currentQuestion.word.tags?.includes('grammar') ? 'grammar' : 'word';

      // Get or create progress with proper card type
      const currentProgress = await flashcardManager.getOrCreateFlashcardProgress(
        currentQuestion.word.id,
        cardType
      );

      // Update flashcard progress
      const updatedProgress = await flashcardManager.updateProgress(
        currentQuestion.word.id,
        quality,
        responseTime
      );

      // Record the review
      await flashcardManager.recordReview(
        flashcardSession.id,
        currentQuestion.word.id,
        currentQuestion.cardType,
        quality,
        responseTime,
        wasCorrect,
        updatedProgress.interval,
        updatedProgress.interval
      );

      // Update score
      if (wasCorrect) {
        setFlashcardScore(prev => prev + 1);
      }

      // Move to next card or finish session
      if (currentFlashcardIndex < flashcardQuestions.length - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
      } else {
        // Session completed
        await flashcardManager.completeSession(
          flashcardSession.id,
          flashcardQuestions.length,
          flashcardScore + (wasCorrect ? 1 : 0)
        );
        setFlashcardGameStarted(false);
      }
    } catch (error) {
      console.error('Error handling flashcard answer:', error);
    }
  };

  const startFlashcardSession = () => {
    setFlashcardGameStarted(true);
    setCurrentFlashcardIndex(0);
    setFlashcardScore(0);
  };

  const restartFlashcardSession = () => {
    setFlashcardGameStarted(false);
    setCurrentFlashcardIndex(0);
    setFlashcardScore(0);
    loadFlashcardQuestions();
  };

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
      targetForm,
      stem,
      correctAnswer,
      options,
      rule: ConjugationEngine.getConjugationRule(word.type, targetForm)
    };
  };

  const generateDistractors = (word: JapaneseWord, targetForm: keyof ConjugationForms, correctAnswer: string): string[] => {

    const conjugations = ConjugationEngine.conjugate(word);

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

      for (let ending of endings) {
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
        for (let emerg of emergency) {
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

      // Also try loading from legacy WordListManager as fallback
      let legacyLists: WordList[] = [];
      try {
        legacyLists = await WordListManager.getAllWordLists();
      } catch (legacyErr) {
      }

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

      // Combine unified lists with any legacy lists
      const combinedLists = [...legacyWordLists, ...legacyLists];

      setWordLists(combinedLists);
    } catch (err) {
      console.error('Error loading word lists:', err);
      // Try fallback to legacy system only
      try {
        const legacyLists = await WordListManager.getAllWordLists();
        setWordLists(legacyLists);
      } catch (fallbackErr) {
        console.error('Error loading legacy word lists:', fallbackErr);
        setWordLists([]);
      }
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

  const loadQuestionsForWord = useCallback((word: JapaneseWord) => {
    try {
      setLoading(true);
      const forms: (keyof ConjugationForms)[] = [
        'present', 'past', 'negative', 'pastNegative',
        'polite', 'politePast', 'teForm'
      ];

      const applicableForms = forms.filter(form => {
        const conjugations = ConjugationEngine.conjugate(word);
        return conjugations[form] !== undefined;
      });

      const selectedForms = shuffleArray([...applicableForms]).slice(0, 5);
      const conjugations = ConjugationEngine.conjugate(word);
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
        words = await getCommonWordsForPractice();
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
      if (word.kanji !== word.kana) {
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
    const kana = word.kana;
    const kanji = word.kanji;

    // Common verb patterns
    if (kana.endsWith('る')) {
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
    if (godanEndings.some(ending => kana.endsWith(ending))) {
      return { ...word, type: 'Godan' };
    }

    // i-adjective pattern
    if (kana.endsWith('い') && !kana.endsWith('しい') && !kanji.includes('綺麗') && !kanji.includes('嫌い')) {
      return { ...word, type: 'i-adjective' };
    }

    // Common irregular verbs
    const irregularVerbs = ['する', 'くる', '来る', 'いく', '行く'];
    if (irregularVerbs.includes(kanji) || irregularVerbs.includes(kana)) {
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
      const conjugations = ConjugationEngine.conjugate(word);
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
    };

    initializeSystem();
  }, [loadAllLists]);

  // Update computed states after lists are loaded
  useEffect(() => {
    // Create unified list for flashcards (all lists)
    const unified = [...wordLists, ...kanjiLists];
    setAllLists(unified);

    // Filter only conjugable word lists for conjugation drills
    const conjugableOnly = wordLists.filter(list => list.isConjugable);
    setConjugableLists(conjugableOnly);
  }, [wordLists, kanjiLists]);

  useEffect(() => {
    if (settingsLoading) return;

    if (typeof window !== 'undefined') {
      const storedWord = sessionStorage.getItem('drillWord');
      if (storedWord) {
        try {
          const word = JSON.parse(storedWord);
          loadQuestionsForWord(word);
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
  }, [settings.dailyGoal, settingsLoading, drillMode, selectedLists, loadQuestions, loadQuestionsForWord]);

  // Load flashcard questions when lists or card direction change
  useEffect(() => {
    if (activeTab === 'flashcards' && selectedLists.length > 0) {
      loadFlashcardQuestions();
    }
  }, [activeTab, selectedLists, cardDirection]);

  // Ensure lists are loaded when switching to flashcard tab
  useEffect(() => {
    if (activeTab === 'flashcards') {

      // Force load all lists immediately when switching to flashcards
      const forceLoadLists = async () => {

        // Load the lists directly and update state immediately
        try {
          const [loadedWordLists, loadedKanjiLists] = await Promise.all([
            (async () => {
              const studyLists = await StudyListManager.getAllStudyLists();
              const legacyWordLists = studyLists.map(studyList => ({
                id: studyList.id,
                name: studyList.name,
                description: studyList.description,
                wordIds: studyList.itemIds,
                createdAt: studyList.createdAt,
                updatedAt: studyList.updatedAt,
                color: studyList.color,
                isConjugable: studyList.type === 'drillable'
              }));
              setWordLists(legacyWordLists);
              return legacyWordLists;
            })(),
            (async () => {
              const lists = await KanjiListManager.getAllKanjiLists();
              setKanjiLists(lists);
              return lists;
            })()
          ]);

          // Immediately update allLists with the combined results
          const combinedLists = [...loadedWordLists, ...loadedKanjiLists];
          setAllLists(combinedLists);

          // Also update conjugableLists
          const conjugableOnly = loadedWordLists.filter(list => list.isConjugable);
          setConjugableLists(conjugableOnly);

        } catch (error) {
          console.error('🎴 Error force loading lists:', error);
        }
      };

      forceLoadLists();
    }
  }, [activeTab]);

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

  const startGame = () => {
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
      await StatsManager.recordDrillSession(questions.length, actualScore, wordsStudied);

      // Increment drill count based on user type
      if (user) {
        await incrementDrillCount();
      } else {
        incrementGuestDrillCount();
      }
    } catch (err) {
      console.error('Error recording drill session:', err);
    }
  };

  // Check drill limits
  if (!canDoDrill()) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-6xl mb-4">⚡</div>
          <h3 className="text-xl font-semibold text-foreground mb-4">
            Daily Drill Limit Reached
          </h3>
          <p className="text-muted-foreground mb-6">
            You've completed {userSubscription?.currentUsage.drillsToday || 0} out of {userSubscription?.limits.maxDrillsPerDay || 3} drills today.
          </p>
          <button
            onClick={() => window.location.href = '/account'}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Upgrade Plan
          </button>
        </div>
      </div>
    );
  }

  if (loading && activeTab === 'conjugation') {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{strings.common.loading}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isFinished = currentQuestionIndex >= questions.length - 1 && showResult;
  const flashcardFinished = currentFlashcardIndex >= flashcardQuestions.length && flashcardGameStarted;

  return (
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(drillStructuredData),
          }}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <PageHeader title={strings.drill.title} />

        {((activeTab === 'conjugation' && gameStarted) || (activeTab === 'flashcards' && flashcardGameStarted)) && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {strings.drill.score}: {activeTab === 'conjugation' ? `${score}/${questions.length}` : `${flashcardScore}/${flashcardQuestions.length}`}
            </div>
            <div className="text-sm text-muted-foreground">
              {activeTab === 'conjugation'
                ? `${currentQuestionIndex + 1} ${strings.common.of} ${questions.length}`
                : `${currentFlashcardIndex + 1} ${strings.common.of} ${flashcardQuestions.length}`
              }
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation - Hide when drill game is active */}
      {!gameStarted && !flashcardGameStarted && (
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <button
              onClick={() => setActiveTab('conjugation')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'conjugation'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚡ Conjugation Drills
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
                activeTab === 'flashcards'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🎴 Flashcard Review
              {dueCards.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {dueCards.length > 99 ? '99+' : dueCards.length}
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        {activeTab === 'conjugation' ? (
          // Conjugation Drills Content
          <>
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
                  <div className="bg-muted/50 rounded-lg p-3 mb-6">
                    <div className="text-sm text-muted-foreground">
                      <span className="text-primary font-medium">Daily Goal:</span> {settings.dailyGoal} questions
                      <span className="ml-2 text-xs">(Change in Settings)</span>
                    </div>
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

                  {/* Auto-Advance Toggle */}
                  <div className="mb-6">
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoAdvance}
                        onChange={(e) => setAutoAdvance(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Auto-advance to next question</span>
                      <span className="text-xs text-muted-foreground">(automatically moves to next after 2 seconds)</span>
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
                  <div className="text-lg text-muted-foreground mb-4">
                    {Math.round((score / questions.length) * 100)}% accuracy
                  </div>
                  <button
                    onClick={handleRestart}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Try Again
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
                    <span className="text-lg japanese-text text-muted-foreground mr-3">
                      ({currentQuestion.word.kana})
                    </span>
                    <span className="text-sm text-muted-foreground">
                      "{currentQuestion.word.meaning}"
                    </span>
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
          </>
        ) : (
          // Flashcard Review Content
          <>
            {flashcardLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading flashcards...</p>
              </div>
            ) : allLists.length === 0 ? (
              <div className="text-center max-w-md mx-auto">
                <div className="text-6xl mb-4">🎴</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Lists Found
                </h3>
                <p className="text-muted-foreground mb-4">
                  No lists found. Please create some study lists first.
                </p>
                <button
                  onClick={() => setActiveTab('conjugation')}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Conjugation Drills
                </button>
              </div>
            ) : !flashcardGameStarted ? (
              <div className="space-y-6">
                {/* Study Dashboard */}
                {flashcardStats && (
                  <div className="bg-card border border-border rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                      📊 Study Dashboard
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{flashcardStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total Cards</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-500">{dueCards.length}</div>
                        <div className="text-xs text-muted-foreground">Due Today</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-500">{flashcardStats.overallAccuracy}%</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-500">{flashcardStats.avgStability}d</div>
                        <div className="text-xs text-muted-foreground">Avg Stability</div>
                      </div>
                    </div>

                    {dueCards.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-red-400 font-medium text-sm">
                            {dueCards.length} cards ready for review!
                          </span>
                        </div>
                        <div className="text-xs text-red-300">
                          Regular review is key to long-term retention. Don't let your memories fade!
                        </div>
                      </div>
                    )}

                    {studyRecommendations && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Recommended Session</div>
                          <div className="font-medium">{studyRecommendations.recommendedSessionSize} cards</div>
                          <div className="text-xs text-muted-foreground">{studyRecommendations.optimalStudyTime}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="text-muted-foreground mb-1">Focus Areas</div>
                          <div className="font-medium text-xs">
                            {studyRecommendations.focusAreas.length > 0
                              ? studyRecommendations.focusAreas.slice(0, 2).join(', ')
                              : 'Keep up the good work!'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-card border border-border rounded-lg p-8">
                  <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
                    Ready for flashcard review?
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Select lists to create flashcards for review
                  </p>

                  {/* List Selection for Flashcards */}
                  <div className="mb-6">
                    {allLists.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Select lists to review:
                          {dueCards.length > 0 && (
                            <span className="ml-2 text-red-400 text-xs">
                              ⚠️ Lists with 🔴 contain cards due for review
                            </span>
                          )}
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {allLists.map((list) => {
                            const isKanjiList = 'kanjiIds' in list;

                            // Check if this list actually contains due cards
                            const listItemIds = isKanjiList ? (list as KanjiList).kanjiIds : (list as WordList).wordIds;


                            // Count how many due cards this list contains
                            const listDueCards = dueCards.filter(dueCard => {
                              const hasDirectMatch = listItemIds.includes(dueCard.wordId);
                              const hasKanjiMatch = dueCard.wordId.startsWith('kanji_') &&
                                                   listItemIds.includes(dueCard.wordId.replace('kanji_', ''));
                              return hasDirectMatch || hasKanjiMatch;
                            });

                            const listHasDueCards = listDueCards.length > 0;

                            return (
                              <label key={list.id} className={`flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50 ${
                                listHasDueCards && dueCards.length > 0 ? 'bg-red-500/5 border border-red-500/20' : ''
                              }`}>
                                <input
                                  type="checkbox"
                                  checked={selectedLists.includes(list.id)}
                                  onChange={() => handleListToggle(list.id)}
                                  className="rounded border-border"
                                />
                                <div className="flex items-center gap-2 flex-1">
                                  {dueCards.length > 0 && listHasDueCards && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                  )}
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: list.color }}
                                  ></div>
                                  <span className="text-sm text-foreground">{list.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    ({isKanjiList ? (list as KanjiList).kanjiIds.length + ' kanji' : (list as WordList).wordIds.length + ' words'})
                                  </span>
                                  <span className="text-xs text-blue-400">
                                    {isKanjiList ? '漢字' : '📚'}
                                  </span>
                                  {dueCards.length > 0 && listHasDueCards && (
                                    <span className="text-xs text-red-400 font-medium">
                                      📅 Has due cards
                                    </span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {dueCards.length > 0 && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                            <div className="text-blue-400 font-medium mb-1">💡 How Due Cards Work:</div>
                            <div className="text-blue-300 text-xs space-y-1">
                              <div>• Due cards come from your existing lists (words/kanji you've already studied)</div>
                              <div>• The spaced repetition algorithm schedules when each card needs review</div>
                              <div>• Select any list containing cards you've studied before to see due cards</div>
                              <div>• New cards (never studied) won't appear as "due"</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
                        No lists found. Create lists in the Vocabulary or Kanji sections.
                      </div>
                    )}
                  </div>

                  {selectedLists.length > 0 && flashcardQuestions.length > 0 && (
                    <p className="text-muted-foreground mb-4">
                      Ready to review {flashcardQuestions.length} cards from your selected lists
                    </p>
                  )}

                  {/* Card Direction Selection */}
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-3">Card Direction:</div>
                    <div className="flex gap-2 justify-center flex-wrap mb-4">
                      <button
                        onClick={() => setCardDirection('kanji-first')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          cardDirection === 'kanji-first'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        漢字 → English
                      </button>
                      <button
                        onClick={() => setCardDirection('english-first')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          cardDirection === 'english-first'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        English → 漢字
                      </button>
                      <button
                        onClick={() => setCardDirection('mixed')}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          cardDirection === 'mixed'
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-foreground border-input hover:bg-muted'
                        }`}
                      >
                        Mixed
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {cardDirection === 'kanji-first'
                        ? 'Show Japanese characters, guess English meaning'
                        : cardDirection === 'english-first'
                        ? 'Show English meaning, guess Japanese characters'
                        : 'Random mix of both directions'}
                    </div>
                  </div>

                  {/* Hint Toggle */}
                  <div className="mb-6">
                    <label className="flex items-center justify-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHints}
                        onChange={(e) => setShowHints(e.target.checked)}
                        className="rounded border-border"
                      />
                      <span className="text-sm text-foreground">Show hints on flashcards</span>
                      <span className="text-xs text-muted-foreground">(reading/pronunciation help)</span>
                    </label>
                  </div>

                  <button
                    onClick={startFlashcardSession}
                    disabled={selectedLists.length === 0}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Review Session
                  </button>
                </div>
              </div>
            ) : flashcardFinished ? (
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8">
                  <h2 className="text-3xl font-semibold mb-4 text-card-foreground">
                    Review Complete! 🎉
                  </h2>
                  <div className="text-6xl font-bold text-primary mb-2">
                    {flashcardScore}/{flashcardQuestions.length}
                  </div>
                  <div className="text-lg text-muted-foreground mb-4">
                    {Math.round((flashcardScore / flashcardQuestions.length) * 100)}% accuracy
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={restartFlashcardSession}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium mr-3"
                    >
                      Review Again
                    </button>
                    <button
                      onClick={() => setActiveTab('conjugation')}
                      className="bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/90 transition-colors font-medium"
                    >
                      Try Conjugation Drills
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Flashcard Session
              <FlashcardCard
                question={flashcardQuestions[currentFlashcardIndex]}
                onAnswer={handleFlashcardAnswer}
                showHint={showHints}
              />
            )}
          </>
        )}
      </main>
    </div>
    </>
  );
}
