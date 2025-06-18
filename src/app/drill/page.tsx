'use client';

import { useState, useEffect, useCallback } from 'react';
import { JapaneseWord, DrillQuestion, ConjugationForms, WordList, FlashcardQuality } from '@/types';
import { getCommonWordsForPractice } from '@/utils/api';
import { ConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import WordListManager from '@/utils/wordLists';
import StatsManager from '@/utils/stats';
import flashcardManager, { FlashcardQuestion, FlashcardSessionConfig } from '@/utils/flashcards';
import FlashcardCard from '@/components/flashcards/FlashcardCard';

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
  const { userSubscription, canDoDrill, incrementDrillCount } = useSubscription();
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
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<'random' | 'lists'>('random');

  // Flashcard state
  const [flashcardQuestions, setFlashcardQuestions] = useState<FlashcardQuestion[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardGameStarted, setFlashcardGameStarted] = useState(false);
  const [flashcardScore, setFlashcardScore] = useState(0);
  const [flashcardSession, setFlashcardSession] = useState<any>(null);
  const [flashcardStats, setFlashcardStats] = useState<any>(null);

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
    } catch (error) {
      console.error('Error loading flashcard stats:', error);
    }
  };

  const loadFlashcardQuestions = async () => {
    if (!user || selectedLists.length === 0) return;

    try {
      setFlashcardLoading(true);
      const config: FlashcardSessionConfig = {
        wordListIds: selectedLists,
        maxCards: 20,
        cardTypes: ['kanji-to-meaning', 'meaning-to-kanji'],
        reviewDueOnly: false
      };

      const questions = await flashcardManager.generateFlashcardQuestions(config);
      setFlashcardQuestions(questions);

      if (questions.length > 0) {
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
    const availableForms = allForms.filter(form => form);

    for (let i = 0; i < Math.min(4, availableForms.length); i++) {
      if (!distractors.includes(availableForms[i])) {
        distractors.push(availableForms[i]);
      }
    }

    if (distractors.length < 5) {
      const kanjiStem = word.kanji.slice(0, -1);
      const commonEndings = ['る', 'た', 'ない', 'ます', 'て'];

      for (let ending of commonEndings) {
        const distractor = kanjiStem + ending;
        if (!distractors.includes(distractor) && distractor !== correctAnswer && !availableForms.includes(distractor)) {
          distractors.push(distractor);
          break;
        }
      }
    }

    return distractors.slice(0, 5);
  };

  const loadWordLists = useCallback(async () => {
    try {
      const lists = await WordListManager.getAllWordLists();
      setWordLists(lists);
    } catch (err) {
      console.error('Error loading word lists:', err);
    }
  }, []);

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
        words = await WordListManager.getWordsFromLists(selectedLists);
        if (words.length === 0) {
          setQuestions([]);
          return;
        }

        words = words.filter(word =>
          word.type === 'Ichidan' ||
          word.type === 'Godan' ||
          word.type === 'Irregular' ||
          word.type === 'i-adjective' ||
          word.type === 'na-adjective'
        );

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
      const limitedWords = shuffledWords.slice(0, settings.dailyGoal);
      const drillQuestions = generateDrillQuestions(limitedWords);
      setQuestions(drillQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [drillMode, selectedLists, settings.dailyGoal, wordTypeFilter]);

  const generateDrillQuestions = (words: JapaneseWord[]): DrillQuestion[] => {
    return words.map((word) => {
      const targetForm = getRandomConjugationForm(word.type);
      const conjugations = ConjugationEngine.conjugate(word);
      const correctAnswer = conjugations[targetForm];

      if (!correctAnswer) {
        return generateDrillQuestion(word, 'present', conjugations.present);
      }

      return generateDrillQuestion(word, targetForm, correctAnswer);
    });
  };

  useEffect(() => {
    loadWordLists();
  }, [loadWordLists]);

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

  // Load flashcard questions when lists change
  useEffect(() => {
    if (activeTab === 'flashcards' && selectedLists.length > 0) {
      loadFlashcardQuestions();
    }
  }, [activeTab, selectedLists]);

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
      }, 100);
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
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const recordDrillSession = async (finalScore?: number) => {
    const actualScore = finalScore !== undefined ? finalScore : score;

    try {
      const wordsStudied = questions.map(q => q.word.id);
      await StatsManager.recordDrillSession(questions.length, actualScore, wordsStudied);
      await incrementDrillCount();
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

      {/* Tab Navigation */}
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
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'flashcards'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🎴 Flashcard Review
          </button>
        </div>
      </div>

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
                  <p className="text-muted-foreground mb-6">
                    Test your knowledge with {questions.length} conjugation questions
                  </p>

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
                        My Lists ({wordLists.length})
                      </button>
                    </div>

                    {/* List Selection */}
                    {drillMode === 'lists' && (
                      <div className="mb-4">
                        {wordLists.length > 0 ? (
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground">Select lists to drill:</div>
                            <div className="max-h-48 overflow-y-auto space-y-2">
                              {wordLists.map((list) => (
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
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
                            No word lists found. Create lists in the Vocabulary section.
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
                      <div className="text-sm text-foreground mt-1">
                        {currentQuestion.rule}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            {gameStarted && !isFinished && showResult && (
              <div className="text-center">
                <button
                  onClick={handleNextQuestion}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {currentQuestionIndex < questions.length - 1 ? strings.drill.nextQuestion : strings.common.success}
                </button>
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
            ) : !user ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔐</div>
                <h3 className="text-lg font-medium text-foreground mb-2">Sign In Required</h3>
                <p className="text-muted-foreground mb-4">
                  Please sign in to use flashcard review with spaced repetition.
                </p>
                <button
                  onClick={() => window.location.href = '/account'}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  Sign In
                </button>
              </div>
            ) : selectedLists.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8">
                  <div className="text-6xl mb-4">🎴</div>
                  <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
                    Flashcard Review
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Review any words from your saved lists using spaced repetition for optimal learning.
                  </p>

                  {/* Stats Display */}
                  {flashcardStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-primary">{flashcardStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total Cards</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-yellow-400">{flashcardStats.dueToday}</div>
                        <div className="text-xs text-muted-foreground">Due Today</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-green-400">{flashcardStats.mastered}</div>
                        <div className="text-xs text-muted-foreground">Mastered</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="text-2xl font-bold text-blue-400">{flashcardStats.overallAccuracy}%</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                    </div>
                  )}

                  {/* List Selection for Flashcards */}
                  <div className="mb-6">
                    <div className="text-sm text-muted-foreground mb-3">Select lists to review:</div>
                    {wordLists.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {wordLists.map((list) => (
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
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
                        No word lists found. Create lists in the Vocabulary section to start reviewing with flashcards.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (selectedLists.length > 0) {
                        loadFlashcardQuestions();
                      }
                    }}
                    disabled={selectedLists.length === 0}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Flashcard Review
                  </button>
                </div>
              </div>
            ) : flashcardQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-foreground mb-2">No Cards Available</h3>
                <p className="text-muted-foreground mb-4">
                  The selected lists don't contain any words for flashcard review.
                </p>
                <button
                  onClick={() => setSelectedLists([])}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Select Different Lists
                </button>
              </div>
            ) : !flashcardGameStarted ? (
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8">
                  <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
                    Ready for flashcard review?
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Review {flashcardQuestions.length} cards from your selected lists
                  </p>
                  <button
                    onClick={startFlashcardSession}
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
                  >
                    Start Review Session
                  </button>
                </div>
              </div>
            ) : flashcardFinished ? (
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg p-8">
                  <h2 className="text-3xl font-semibold mb-4 text-card-foreground">
                    Review Complete!
                  </h2>
                  <div className="text-6xl font-bold text-primary mb-2">
                    {flashcardScore}/{flashcardQuestions.length}
                  </div>
                  <div className="text-lg text-muted-foreground mb-4">
                    {Math.round((flashcardScore / flashcardQuestions.length) * 100)}% accuracy
                  </div>
                  <p className="text-muted-foreground mb-6">
                    Great work! Your progress has been saved and review intervals have been updated.
                  </p>
                  <button
                    onClick={restartFlashcardSession}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Review Again
                  </button>
                </div>
              </div>
            ) : (
              <FlashcardCard
                question={flashcardQuestions[currentFlashcardIndex]}
                onAnswer={handleFlashcardAnswer}
                showHint={true}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
