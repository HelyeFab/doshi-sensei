'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, DrillQuestion, WordList } from '@/types';
import { ExtendedConjugationForms } from '@/types/conjugation-extended';
import { ExtendedConjugationEngine, getRandomConjugationForm as getRandomForm, generateQuestionStem as generateStem } from '@/utils/conjugation-extended';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';

// Wrapper functions for compatibility
const getRandomConjugationForm = (word: JapaneseWord, conjugations: ExtendedConjugationForms) => {
  const form = getRandomForm(word.type);
  const value = conjugations[form];
  return { form, value };
};

const generateQuestionStem = (form: keyof ExtendedConjugationForms, word: JapaneseWord) => {
  return generateStem(word, form);
};

import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { Analytics } from '@/utils/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import StudyListManager from '@/utils/studyListManager';
import { trackDrillCompleted } from '@/lib/stats/trackingEvents';
import { QuickDrillPreview } from '@/components/drill/QuickDrillPreview';
import { PracticeCache } from '@/utils/practiceCache';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

// Structured Data for Conjugation Drill Page
const conjugationDrillStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Conjugation Drill - Interactive Grammar Practice",
  "description": "Interactive Japanese verb and adjective conjugation drills. Practice all forms including present, past, negative, polite, te-form, and more with instant feedback.",
  "url": "https://doshisensei.com/drill/conjugation",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Quiz",
  "about": {
    "@type": "Thing",
    "name": "Japanese Grammar",
    "description": "Japanese verb conjugations and adjective forms"
  },
  "teaches": [
    "Japanese verb conjugation",
    "Ichidan verb forms",
    "Godan verb forms",
    "Irregular verb forms",
    "I-adjective conjugation",
    "Na-adjective conjugation",
    "Grammar pattern recognition",
    "JLPT preparation"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese conjugation drill",
    "verb conjugation quiz",
    "Japanese grammar practice",
    "conjugation test",
    "JLPT grammar",
    "Japanese learning quiz",
    "verb forms practice"
  ]
};

export default function ConjugationDrillPage() {
  const router = useRouter();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const { checkAndTrack, canUse, remaining, isLoading: featureLoading } = useFeature('drill_practice', {
    showToast: true,
    showModal: true,
    trackUsage: true
  });
  const { isPremium, userType } = useSubscription2();
  const { track } = useAnalytics();
  const strings = useStrings();

  // Drill state
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
  const [conjugableLists, setConjugableLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [drillMode, setDrillMode] = useState<'random' | 'lists'>('random');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);

  // Check if user came from vocabulary page with preselected word
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const wordData = sessionStorage.getItem('drillWord');
      if (wordData) {
        const word = JSON.parse(wordData);
        sessionStorage.removeItem('drillWord');
        
        // Start drill with this specific word
        generateQuestionsForWords([word]);
        setGameStarted(true);
      }
    }
  }, []);

  // Load user's word lists and cached words on mount
  useEffect(() => {
    if (user) {
      loadUserLists();
    }
    loadCachedWordsForPractice();
  }, [user]);

  const loadUserLists = async () => {
    try {
      // Load all study lists and filter for conjugable ones
      const studyLists = await StudyListManager.getAllStudyLists();
      
      // Filter for drillable lists (conjugable)
      const drillableLists = studyLists.filter(list => list.type === 'drillable');
      
      // Convert to legacy WordList format for compatibility
      const legacyWordLists: WordList[] = drillableLists.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        wordIds: list.itemIds,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        color: list.color,
        isConjugable: true
      }));
      
      setConjugableLists(legacyWordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
    }
  };

  const loadCachedWordsForPractice = async () => {
    try {
      setLoading(true);
      const cachedWords = await PracticeCache.getCommonWordsForPractice();
      if (cachedWords.length === 0) {
        await PracticeCache.preloadCache();
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading cached words:', error);
      setLoading(false);
    }
  };

  const generateQuestionsForWords = (words: JapaneseWord[]) => {
    const drillQuestions: DrillQuestion[] = [];
    const questionsPerWord = 3;

    words.forEach(word => {
      const conjugations = ExtendedConjugationEngine.conjugate(word);
      
      for (let i = 0; i < questionsPerWord; i++) {
        const { form, value } = getRandomConjugationForm(word, conjugations);
        
        if (value && value !== 'N/A') {
          const allForms = ExtendedConjugationEngine.getAllPossibleForms(conjugations);
          
          // Filter out the correct answer and empty forms
          const validDistractors = allForms.filter((f: string) => 
            f && f !== value && f !== '' && f !== 'N/A'
          );
          
          // Smart distractor selection: avoid too similar forms
          const distractors: string[] = [];
          const usedPatterns = new Set<string>();
          
          // Shuffle candidates
          const candidates = [...validDistractors].sort(() => Math.random() - 0.5);
          
          for (const candidate of candidates) {
            if (distractors.length >= 3) break;
            
            // Create a simple pattern to detect similar forms
            // Remove common endings to group similar forms
            const pattern = candidate
              .replace(/です$/, '')
              .replace(/でした$/, '')
              .replace(/ません$/, '')
              .replace(/ませんでした$/, '')
              .replace(/だろう$/, '')
              .replace(/でしょう$/, '');
            
            // Skip if we already have a similar form
            if (!usedPatterns.has(pattern) && candidate !== value) {
              distractors.push(candidate);
              usedPatterns.add(pattern);
            }
          }
          
          // If we don't have enough diverse distractors, fill with random ones
          while (distractors.length < 3 && validDistractors.length > distractors.length) {
            const randomDistractor = validDistractors[Math.floor(Math.random() * validDistractors.length)];
            if (!distractors.includes(randomDistractor)) {
              distractors.push(randomDistractor);
            }
          }

          const options = [value, ...distractors.slice(0, 3)].sort(() => Math.random() - 0.5);

          drillQuestions.push({
            word,
            questionType: form,
            correctAnswer: value,
            options,
            stem: generateQuestionStem(form, word)
          });
        }
      }
    });

    setQuestions(drillQuestions.sort(() => Math.random() - 0.5));
  };

  const loadQuestionsForLists = async () => {
    if (selectedLists.length === 0) return;

    try {
      setLoading(true);
      let allWords: JapaneseWord[] = [];

      for (const listId of selectedLists) {
        const { words } = await StudyListManager.getItemsInList(listId);
        allWords = [...allWords, ...words];
      }

      // Filter conjugable words
      const conjugableWords = allWords.filter(word => 
        word.type === 'Ichidan' || 
        word.type === 'Godan' || 
        word.type === 'Irregular' ||
        word.type === 'i-adjective' ||
        word.type === 'na-adjective'
      );

      if (conjugableWords.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      generateQuestionsForWords(conjugableWords);
      setLoading(false);
    } catch (error) {
      console.error('Error loading questions from lists:', error);
      setLoading(false);
    }
  };

  const startGame = async () => {
    const canProceed = await checkAndTrack();
    if (!canProceed) return;

    track('drill_started', {
      mode: drillMode,
      wordTypeFilter,
      selectedLists: selectedLists.length,
      autoAdvance
    });

    setGameStarted(true);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);

    if (drillMode === 'lists') {
      await loadQuestionsForLists();
    } else {
      await loadRandomQuestions();
    }
  };

  const loadRandomQuestions = async () => {
    try {
      setLoading(true);
      const words = await PracticeCache.getFilteredWords(wordTypeFilter);
      
      if (words.length === 0) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Select random words for drill
      const selectedWords = words
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);

      generateQuestionsForWords(selectedWords);
      setLoading(false);
    } catch (error) {
      console.error('Error generating questions:', error);
      setLoading(false);
    }
  };

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setShowResult(true);
    
    const currentQuestion = questions[currentQuestionIndex];
    if (answer === currentQuestion.correctAnswer) {
      setScore(score + 1);
    }

    // Auto-advance after a delay if enabled
    if (autoAdvance) {
      setTimeout(() => {
        handleNextQuestion();
      }, answer === currentQuestion.correctAnswer ? 1000 : 2000);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Track completion
      trackDrillCompleted(user?.uid || 'anonymous', score, questions.length);
      track('drill_completed', {
        score,
        totalQuestions: questions.length,
        accuracy: (score / questions.length) * 100,
        mode: drillMode,
        wordTypeFilter
      });
    }
  };

  const restartGame = () => {
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuestions(questions.sort(() => Math.random() - 0.5));
  };

  const handleBackToSetup = () => {
    setGameStarted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
  };

  const handleSaveWord = (word: JapaneseWord) => {
    setWordToSave(word);
    setShowSaveModal(true);
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="Conjugation Drill" backHref="/drill" />
        
        {/* Main Content */}
        <MobileAwareContainer className="container mx-auto px-4 py-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(conjugationDrillStructuredData),
            }}
          />

          <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">

            {/* Target Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <span className="text-2xl">⚡</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-8 text-center max-w-2xl mx-auto">
              {strings.drill?.description || "Test your knowledge of Japanese verb and adjective conjugations. Choose your practice mode and word types to begin."}
            </p>

            {/* Quick Drill Preview */}
            <QuickDrillPreview />

            {/* Drill Mode Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Practice Mode</h3>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <button
                  onClick={() => setDrillMode('random')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    drillMode === 'random'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-medium">Random Words</div>
                  <div className="text-sm text-muted-foreground">
                    Practice with common words
                  </div>
                </button>
                
                <button
                  onClick={() => setDrillMode('lists')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    drillMode === 'lists'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium">From Lists</div>
                  <div className="text-sm text-muted-foreground">
                    Use your study lists
                  </div>
                </button>
              </div>
            </div>

            {/* List Selection for Lists Mode */}
            {drillMode === 'lists' && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Select Lists</h3>
                {conjugableLists.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {conjugableLists.map(list => (
                      <label key={list.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLists([...selectedLists, list.id]);
                            } else {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            }
                          }}
                          className="rounded border-border"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                          <span>{list.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({list.wordIds.length} words)
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No conjugable word lists found. Create lists with verbs or adjectives first.
                  </p>
                )}
              </div>
            )}

            {/* Word Type Filter for Random Mode */}
            {drillMode === 'random' && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Word Types</h3>
                <div className="flex gap-2 flex-wrap">
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
            )}

            {/* Auto-advance Option */}
            <div className="mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">
                  Auto-advance to next question
                </span>
              </label>
            </div>

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={startGame}
                disabled={drillMode === 'lists' && selectedLists.length === 0}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Drill
              </button>
            </div>
          </main>
        </MobileAwareContainer>
      </div>
    );
  }

  // Game screen
  const currentQuestion = questions[currentQuestionIndex];
  const isGameComplete = currentQuestionIndex >= questions.length - 1 && showResult;

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Conjugation Drill" backHref="/drill" />
      
      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm font-medium">
                Score: {score}/{questions.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No conjugable words found.</p>
              <button
                onClick={handleBackToSetup}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Setup
              </button>
            </div>
          ) : isGameComplete ? (
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">Drill Complete!</h2>
              <div className="text-6xl mb-6">
                {score >= questions.length * 0.8 ? '🎉' : score >= questions.length * 0.6 ? '👍' : '💪'}
              </div>
              <p className="text-2xl mb-2">
                Your Score: {score}/{questions.length}
              </p>
              <p className="text-lg text-muted-foreground mb-8">
                {Math.round((score / questions.length) * 100)}% Accuracy
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={restartGame}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBackToSetup}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  New Drill
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            <>
              {/* Question */}
              <div className="bg-card border border-border rounded-lg p-8 mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-4">
                      {currentQuestion.stem}
                    </h2>
                    <div className="flex items-baseline gap-4 mb-2">
                      <span className="text-3xl japanese-text font-medium">
                        {currentQuestion.word.kanji}
                      </span>
                      <span className="text-xl japanese-text text-muted-foreground">
                        {currentQuestion.word.kana}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {currentQuestion.word.meaning}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSaveWord(currentQuestion.word)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Save to list"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>

                {/* Show conjugation rules toggle */}
                <button
                  onClick={() => setShowRules(!showRules)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {showRules ? 'Hide' : 'Show'} conjugation rules
                </button>

                {showRules && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      Conjugation rules for {currentQuestion.questionType} would appear here...
                    </p>
                  </div>
                )}
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-1 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const isCorrect = option === currentQuestion.correctAnswer;
                  const isSelected = option === selectedAnswer;
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option)}
                      disabled={showResult}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        showResult
                          ? isCorrect
                            ? 'border-success bg-success/10'
                            : isSelected
                            ? 'border-destructive bg-destructive/10'
                            : 'border-border opacity-50'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <span className="text-lg japanese-text font-medium">
                        {option}
                      </span>
                      {showResult && isCorrect && (
                        <span className="ml-2 text-success">✓</span>
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <span className="ml-2 text-destructive">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              {showResult && !autoAdvance && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
                  </button>
                </div>
              )}
            </>
          ) : null}
        </main>
      </MobileAwareContainer>

      {/* Save Word Modal */}
      {showSaveModal && wordToSave && (
        <SaveWordModal
          word={wordToSave}
          onClose={() => {
            setShowSaveModal(false);
            setWordToSave(null);
          }}
        />
      )}
    </div>
  );
}