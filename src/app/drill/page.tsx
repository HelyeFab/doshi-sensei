'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, DrillQuestion, ConjugationForms, WordList } from '@/types';
import { getCommonWordsForPractice } from '@/utils/api';
import { ConjugationEngine, getRandomConjugationForm, generateQuestionStem } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import WordListManager from '@/utils/wordLists';
import StatsManager from '@/utils/stats';

export default function DrillPage() {
  const { settings, isLoading: settingsLoading } = useSettings();
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

  useEffect(() => {
    loadWordLists();
  }, []);

  useEffect(() => {
    // Don't load questions until settings are loaded
    if (settingsLoading) return;

    // Check if there's a specific word to drill from sessionStorage (from vocabulary page)
    if (typeof window !== 'undefined') {
      const storedWord = sessionStorage.getItem('drillWord');
      if (storedWord) {
        try {
          const word = JSON.parse(storedWord);
          loadQuestionsForWord(word);
          // Clear the stored word to prevent it from being loaded again on refresh
          sessionStorage.removeItem('drillWord');
        } catch (err) {
          console.error('Error parsing stored word:', err);
          loadQuestions(); // Fallback to regular questions
        }
      } else {
        loadQuestions();
      }
    } else {
      loadQuestions();
    }
  }, [settings.dailyGoal, settingsLoading, drillMode, selectedLists]); // Reload when daily goal changes or settings finish loading

  const loadWordLists = async () => {
    try {
      const lists = await WordListManager.getAllWordLists();
      setWordLists(lists);
    } catch (err) {
      console.error('Error loading word lists:', err);
    }
  };

  // Load questions for a specific word
  const loadQuestionsForWord = (word: JapaneseWord) => {
    try {
      setLoading(true);
      // Generate multiple questions for different conjugation forms of the same word
      const forms: (keyof ConjugationForms)[] = [
        'present', 'past', 'negative', 'pastNegative',
        'polite', 'politePast', 'teForm'
      ];

      // Filter forms based on word type
      const applicableForms = forms.filter(form => {
        const conjugations = ConjugationEngine.conjugate(word);
        return conjugations[form] !== undefined;
      });

      // Take up to 5 random forms
      const selectedForms = shuffleArray([...applicableForms]).slice(0, 5);

      // Generate questions for each selected form
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
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);

      let words: JapaneseWord[] = [];

      if (drillMode === 'lists' && selectedLists.length > 0) {
        console.log('Loading words from selected lists:', selectedLists);
        // Load words from selected lists
        words = await WordListManager.getWordsFromLists(selectedLists);
        console.log('Words loaded from lists:', words.length, words);

        if (words.length === 0) {
          console.warn('No words found in selected lists');
          setQuestions([]);
          return;
        }

        // Filter out words that can't be conjugated if needed
        words = words.filter(word =>
          word.type === 'Ichidan' ||
          word.type === 'Godan' ||
          word.type === 'Irregular' ||
          word.type === 'i-adjective' ||
          word.type === 'na-adjective'
        );

        console.log('Words after conjugation filter:', words.length);

        if (words.length === 0) {
          console.warn('No conjugable words found in selected lists');
          // Check what types of words are in the lists
          const allWords = await WordListManager.getWordsFromLists(selectedLists);
          const wordTypes = allWords.map(w => w.type);
          console.log('Word types in selected lists:', wordTypes);
          setQuestions([]);
          return;
        }
      } else {
        // Load random words (original behavior)
        words = await getCommonWordsForPractice();
      }

      // Filter words based on type
      const filteredWords = words.filter(word => {
        if (wordTypeFilter === 'verbs') {
          return word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular';
        } else if (wordTypeFilter === 'adjectives') {
          return word.type === 'i-adjective' || word.type === 'na-adjective';
        }
        return true; // 'all' shows everything
      });

      console.log('Words after type filter:', filteredWords.length);

      if (filteredWords.length === 0) {
        console.warn('No words found after filtering');
        setQuestions([]);
        return;
      }

      // Shuffle and limit to daily goal
      const shuffledWords = shuffleArray(filteredWords);
      const limitedWords = shuffledWords.slice(0, settings.dailyGoal);

      console.log('Final words for questions:', limitedWords.length);

      const drillQuestions = generateDrillQuestions(limitedWords);
      console.log('Generated questions:', drillQuestions.length);
      setQuestions(drillQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const generateDrillQuestions = (words: JapaneseWord[]): DrillQuestion[] => {
    return words.map((word, index) => {
      const targetForm = getRandomConjugationForm(word.type);
      const conjugations = ConjugationEngine.conjugate(word);
      const correctAnswer = conjugations[targetForm];

      if (!correctAnswer) {
        // Fallback to present form if target form is not available
        return generateDrillQuestion(word, 'present', conjugations.present);
      }

      return generateDrillQuestion(word, targetForm, correctAnswer);
    });
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

    // Get distractors from actual conjugations first
    const distractors: string[] = [];
    const availableForms = allForms.filter(form => form);

    // Add some actual conjugations as distractors
    for (let i = 0; i < Math.min(4, availableForms.length); i++) {
      if (!distractors.includes(availableForms[i])) {
        distractors.push(availableForms[i]);
      }
    }

    // Add one more distractor using kanji stem if needed
    if (distractors.length < 5) {
      const kanjiStem = word.kanji.slice(0, -1); // Use kanji stem, not kana stem
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

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleAnswerSelect = (answer: string) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    if (answer === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowRules(false);
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{strings.common.loading}</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
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
          {drillMode === 'lists' && selectedLists.length > 0 && (
            <div className="text-sm text-muted-foreground mb-4 p-3 bg-muted/50 rounded-lg">
              <strong>Tip:</strong> Only verbs (Ichidan, Godan, Irregular) and adjectives (i-adjective, na-adjective) can be used for conjugation drills.
            </div>
          )}
          <button
            onClick={loadQuestions}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {strings.common.retry}
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isFinished = currentQuestionIndex >= questions.length - 1 && showResult;

  // Record drill session when finished
  useEffect(() => {
    if (isFinished && gameStarted && questions.length > 0) {
      recordDrillSession();
    }
  }, [isFinished, gameStarted, questions.length, score]);

  const recordDrillSession = async () => {
    try {
      const wordsStudied = questions.map(q => q.word.id);
      await StatsManager.recordDrillSession(questions.length, score, wordsStudied);
      console.log(`Drill session recorded: ${score}/${questions.length} correct`);
    } catch (err) {
      console.error('Error recording drill session:', err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <PageHeader title={strings.drill.title} />

        {gameStarted && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              {strings.drill.score}: {score}/{questions.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentQuestionIndex + 1} {strings.common.of} {questions.length}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto mb-32 md:mb-8 pb-safe">
        {!gameStarted ? (
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
                        {selectedLists.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {selectedLists.length} list{selectedLists.length !== 1 ? 's' : ''} selected
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg">
                        No word lists found. Create lists in the Vocabulary section to drill specific words.
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
                      onClick={() => {
                        setWordTypeFilter(filter);
                      }}
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
                {strings.drill.title}
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
              <div className="text-6xl font-bold text-primary mb-4">
                {score}/{questions.length}
              </div>
              <p className="text-muted-foreground mb-6">
                {score === questions.length
                  ? "Perfect score! Excellent work!"
                  : score >= questions.length * 0.8
                  ? "Great job! Keep practicing!"
                  : "Good effort! Try again to improve your score."}
              </p>
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
                {strings.conjugation.forms[currentQuestion.targetForm]} form:
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
      </main>
    </div>
  );
}
