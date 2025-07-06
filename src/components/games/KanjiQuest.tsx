'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameKanji, getKanjiByJLPT } from '@/utils/kanjiUtils';
import { getRandomPokemon, getPokemonSpriteUrl, getPokemonSilhouetteStyle } from '@/data/pokemonData';
import { useAuth } from '@/contexts/AuthContext';
import { KanjiTTSButton, VocabularyTTSButton } from '@/components/ui/TTSButton';
import { useState, useEffect } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useNotification } from '@/contexts/NotificationContext';

// Types
interface StudySession {
  kanji: GameKanji[];
  pokemonId: number;
  status: 'studying' | 'quiz' | 'completed' | 'failed';
  startTime: string;
  quizScore: number | null;
}

interface QuizQuestion {
  type: 'reading' | 'meaning' | 'kanji' | 'vocab';
  question: string;
  options: string[];
  correctIndex: number;
  kanjiRef: GameKanji;
}

interface KanjiQuestProps {
  jlptLevel: number;
  onBack: () => void;
  onPokemonCaught?: (pokemonId: number, kanjiIds: string[]) => void;
  completedKanjiIds: Set<string>;
  onKanjiCompleted: (kanjiIds: string[]) => void;
  customKanji?: GameKanji[]; // Optional custom kanji selection
}

export default function KanjiQuest({
  jlptLevel,
  onBack,
  onPokemonCaught,
  completedKanjiIds,
  onKanjiCompleted,
  customKanji
}: KanjiQuestProps) {
  console.log('KanjiQuest rendered with props:', {
    jlptLevel,
    onBack,
    onPokemonCaught,
    completedKanjiIds,
    onKanjiCompleted,
    customKanji
  });

  const { user, loading: authLoading } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('kanji_quest');
  const { isPremium, userType, isLoading: subscriptionLoading } = useSubscription2();
  const { showNotification } = useNotification();

  // Component state is now logged centrally in SubscriptionContext

  const [phase, setPhase] = useState<'encounter' | 'study' | 'quiz' | 'result'>('encounter');
  const [session, setSession] = useState<StudySession | null>(null);
  const [studiedKanji, setStudiedKanji] = useState<Set<string>>(new Set());
  const [currentKanjiIndex, setCurrentKanjiIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [gameLoading, setGameLoading] = useState(true);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const [entitlementCheckComplete, setEntitlementCheckComplete] = useState(false);


  // Initialize session - properly coordinate with auth and subscription loading
  useEffect(() => {
    // Wait for BOTH auth and subscription to finish loading before proceeding
    if (authLoading || subscriptionLoading) {
      // Still loading, do not check access yet
      return;
    }

    // Once both auth and subscription are loaded, proceed
    startNewSession();
  }, [jlptLevel, authLoading, subscriptionLoading]); // Depend on both loading states

  const startNewSession = async () => {
    try {
      setGameLoading(true);
      setEntitlementCheckComplete(false);

      // Double-check that subscription is fully loaded
      if (subscriptionLoading) {
        console.error('🚨 startNewSession called while subscription still loading!');
        setGameLoading(false);
        return;
      }

      // Check if user can play KanjiQuest
      const canPlay = await checkAndTrack('kanji_quest');
      
      setEntitlementCheckComplete(true);

      if (!canPlay) {
        console.log('🎮 KanjiQuest Access Check Failed');
        setGameLoading(false);
        setShowLimitMessage(true);
        return;
      }

      console.log('✅ KanjiQuest Access Granted');

      // User has access, proceeding with game setup

      // Get available kanji for the level
      let selectedKanji: GameKanji[];

      if (customKanji && customKanji.length > 0) {
        // Use custom kanji selection from Kanji Browser
        // Import vocabulary loading function
        const { getVocabularyForKanji } = await import('@/utils/jmdictVocabulary');

        // Allow all selected kanji, not just 5
        selectedKanji = customKanji.map(k => ({
          ...k,
          vocabulary: getVocabularyForKanji(k.character, 3)
        }));
      } else {
        // Use random selection from JLPT level
        const allKanji = await getKanjiByJLPT(jlptLevel);

        // Filter out completed kanji
        const availableKanji = allKanji.filter(k => !completedKanjiIds.has(k.id));

        if (availableKanji.length < 5) {
          showNotification({
            title: 'Not Enough Kanji',
            message: 'Not enough new kanji available for this level!',
            type: 'warning'
          });
          onBack();
          return;
        }

        // Select 5 random kanji
        selectedKanji = [];
        const tempAvailable = [...availableKanji];

        for (let i = 0; i < 5 && tempAvailable.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * tempAvailable.length);
          selectedKanji.push(tempAvailable.splice(randomIndex, 1)[0]);
        }
      }

      // Create new session
      const newSession: StudySession = {
        kanji: selectedKanji,
        pokemonId: getRandomPokemon(),
        status: 'studying',
        startTime: new Date().toISOString(),
        quizScore: null
      };

      setSession(newSession);
      setPhase('encounter');
      setStudiedKanji(new Set());
      setCurrentKanjiIndex(0);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);

      // NOTE: Usage count is now incremented after quiz completion, not at start
    } catch (error) {
      showNotification({
        title: 'Loading Error',
        message: 'Failed to load kanji data. Please try again.',
        type: 'error'
      });
      onBack();
    } finally {
      setGameLoading(false);
    }
  };

  const handleStudyComplete = () => {
    if (!session) return;

    // Generate quiz questions
    const questions = generateQuizQuestions(session.kanji);

    // Questions generated successfully

    setQuizQuestions(questions);
    setPhase('quiz');
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowQuizFeedback(false); // Ensure feedback is reset
  };

  const generateQuizQuestions = (kanji: GameKanji[]): QuizQuestion[] => {
    const questions: QuizQuestion[] = [];
    // Use the session kanji as the pool for distractors
    const allKanji = kanji;

    // Ensure at least one question per kanji
    kanji.forEach(k => {
      const questionType = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
      questions.push(createQuestion(k, questionType, allKanji));
    });

    // Add 0-2 more random questions to reach 5-7 total
    const extraQuestions = Math.floor(Math.random() * 3);
    for (let i = 0; i < extraQuestions; i++) {
      const randomKanji = kanji[Math.floor(Math.random() * kanji.length)];
      const questionType = Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3;
      questions.push(createQuestion(randomKanji, questionType, allKanji));
    }

    // Shuffle questions
    return questions.sort(() => Math.random() - 0.5);
  };

  const createQuestion = (kanji: GameKanji, type: number, allKanji: GameKanji[]): QuizQuestion => {
    const types: QuizQuestion['type'][] = ['reading', 'meaning', 'kanji', 'vocab'];
    const questionType = types[type];

    switch (questionType) {
      case 'reading': {
        // Show kanji, ask for reading
        const correctAnswer = kanji.on_readings[0] || kanji.kun_readings[0];
        const distractors = allKanji
          .filter(k => k.id !== kanji.id)
          .map(k => k.on_readings[0] || k.kun_readings[0])
          .filter(r => r && r !== correctAnswer)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        return {
          type: 'reading',
          question: `What is the reading of ${kanji.character}?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'meaning': {
        // Show kanji, ask for meaning
        const correctAnswer = kanji.meanings[0];
        const distractors = allKanji
          .filter(k => k.id !== kanji.id)
          .map(k => k.meanings[0])
          .filter(m => m && m !== correctAnswer)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        return {
          type: 'meaning',
          question: `What does ${kanji.character} mean?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'kanji': {
        // Show meaning, ask for kanji
        const correctAnswer = kanji.character;
        const distractors = allKanji
          .filter(k => k.id !== kanji.id)
          .map(k => k.character)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        return {
          type: 'kanji',
          question: `Which kanji means "${kanji.meanings[0]}"?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'vocab': {
        // Use vocabulary if available
        if (kanji.vocabulary && kanji.vocabulary.length > 0) {
          const vocab = kanji.vocabulary[0];
          const correctAnswer = kanji.character;
          const distractors = allKanji
            .filter(k => k.id !== kanji.id)
            .map(k => k.character)
            .slice(0, 3);

          const options = [correctAnswer, ...distractors];
          const shuffled = [...options].sort(() => Math.random() - 0.5);

          // Only show reading in parentheses if it exists
          const questionText = vocab.reading
            ? `Which kanji is used in "${vocab.word}" (${vocab.reading})?`
            : `Which kanji is used in "${vocab.word}"?`;

          return {
            type: 'vocab',
            question: questionText,
            options: shuffled,
            correctIndex: shuffled.indexOf(correctAnswer),
            kanjiRef: kanji
          };
        }

        // Fallback to meaning question if no vocab
        return createQuestion(kanji, 1, allKanji);
      }
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    if (showQuizFeedback) {
      return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion) {
      return;
    }

    // These variables are used in development for debugging
    // const selectedAnswer = currentQuestion.options[answerIndex];
    // const correctAnswer = currentQuestion.options[currentQuestion.correctIndex];
    // const isCorrect = answerIndex === currentQuestion.correctIndex;

    // Quiz answer processed

    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);
    setShowQuizFeedback(true);

    // Use a timeout for the transition
    setTimeout(() => {
      if (currentQuestionIndex < quizQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setShowQuizFeedback(false);
      } else {
        // Quiz complete
        completeQuiz(newAnswers);
      }
    }, 1500);
  };

  const completeQuiz = (answers: number[]) => {
    if (!session) return;

    // Completing quiz with collected answers

    const correctCount = answers.filter((answer, index) =>
      answer === quizQuestions[index].correctIndex
    ).length;

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = score >= 75;

    // Quiz complete with score calculation

    setSession({
      ...session,
      status: passed ? 'completed' : 'failed',
      quizScore: score
    });

    if (passed) {
      // Mark kanji as completed
      onKanjiCompleted(session.kanji.map(k => k.id));

      // Trigger Pokémon capture with kanji IDs
      if (onPokemonCaught) {
        onPokemonCaught(session.pokemonId, session.kanji.map(k => k.id));
      }
    }

    // Usage tracking is now handled automatically by checkAndTrack

    setPhase('result');
  };

  // Show loading state while auth, subscription, feature or game is initializing
  if (authLoading || subscriptionLoading || featureLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Checking authentication...' : (subscriptionLoading || featureLoading) ? 'Checking your subscription...' : 'Loading kanji data...'}
          </p>
        </div>
      </div>
    );
  }

  // Show limit reached message
  if (!authLoading && !subscriptionLoading && showLimitMessage && !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <img
              src="/pokeball.png"
              alt="Pokéball"
              className="w-32 h-32 mx-auto mb-6 opacity-50 grayscale"
            />
            <h1 className="text-2xl font-bold mb-4">Daily Limit Reached!</h1>
            <p className="text-muted-foreground mb-6">
              You've run out of Pokéballs for today! Come back tomorrow for more encounters.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg"
            >
              Back to Games
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Defensive: If customKanji is present but empty, show a message
  if (customKanji && Array.isArray(customKanji) && customKanji.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">No Kanji Provided</h2>
          <p className="text-muted-foreground mb-6">
            No kanji were provided for this battle. Please select kanji from the Kanji Browser.
          </p>
        </div>
      </div>
    );
  }
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {/* Wild Encounter Phase */}
        {phase === 'encounter' && (
          <motion.div
            key="encounter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-3xl font-bold mb-8">A wild Pokémon appeared!</h1>

              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-8"
              >
                <img
                  src={getPokemonSpriteUrl(session.pokemonId)}
                  alt="Wild Pokémon"
                  className="w-64 h-64 mx-auto"
                  style={getPokemonSilhouetteStyle()}
                />
              </motion.div>

              <button
                onClick={() => setPhase('study')}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-xl font-bold hover:bg-primary/90 transition-colors"
              >
                Study Kanji to Battle!
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Study Phase */}
        {phase === 'study' && (
          <motion.div
            key="study"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto px-4 py-8 max-w-4xl pb-32 md:pb-8"
          >
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Study Phase</h2>
                <div className="text-muted-foreground">
                  {currentKanjiIndex + 1} / {session.kanji.length}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentKanjiIndex + 1) / session.kanji.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Kanji Card */}
            <motion.div
              key={session.kanji[currentKanjiIndex].id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="bg-card rounded-lg p-8 border border-border mb-6"
            >
              <div className="text-center mb-6">
                <div className="text-8xl japanese-text mb-4">
                  {session.kanji[currentKanjiIndex].character}
                </div>

                <KanjiTTSButton
                  kanji={session.kanji[currentKanjiIndex].character}
                  size="lg"
                  variant="default"
                />
              </div>

              <div className="space-y-4">
                {/* Readings */}
                <div>
                  <h3 className="font-semibold mb-2">Readings</h3>
                  <div className="flex flex-wrap gap-2">
                    {session.kanji[currentKanjiIndex].on_readings.map((reading, idx) => (
                      <div
                        key={`on-${idx}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg"
                      >
                        <KanjiTTSButton
                          kanji={session.kanji[currentKanjiIndex].character}
                          reading={reading}
                          readingType="on"
                          size="sm"
                          variant="minimal"
                        />
                        <span>{reading} (On)</span>
                      </div>
                    ))}
                    {session.kanji[currentKanjiIndex].kun_readings.map((reading, idx) => (
                      <div
                        key={`kun-${idx}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg"
                      >
                        <KanjiTTSButton
                          kanji={session.kanji[currentKanjiIndex].character}
                          reading={reading}
                          readingType="kun"
                          size="sm"
                          variant="minimal"
                        />
                        <span>{reading} (Kun)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meanings */}
                <div>
                  <h3 className="font-semibold mb-2">Meanings</h3>
                  <p className="text-lg">{session.kanji[currentKanjiIndex].meanings.join(', ')}</p>
                </div>

                {/* Sample Vocabulary */}
                {session.kanji[currentKanjiIndex].vocabulary && session.kanji[currentKanjiIndex].vocabulary.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Sample Words</h3>
                      <button
                        onClick={() => setShowFurigana(!showFurigana)}
                        className="text-sm px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      >
                        {showFurigana ? 'Hide' : 'Show'} Furigana
                      </button>
                    </div>
                    <div className="space-y-2">
                      {session.kanji[currentKanjiIndex].vocabulary.slice(0, 3).map((vocab, idx) => (
                        <div
                          key={idx}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <VocabularyTTSButton
                            word={vocab.word}
                            kana={vocab.reading}
                            size="sm"
                            variant="default"
                          />
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg japanese-text font-medium">{vocab.word}</span>
                            {showFurigana && vocab.reading && (
                              <span className="text-sm text-muted-foreground japanese-text">{vocab.reading}</span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">- {vocab.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-32 md:mb-8">
              <button
                onClick={() => setCurrentKanjiIndex(Math.max(0, currentKanjiIndex - 1))}
                disabled={currentKanjiIndex === 0}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50"
              >
                Previous
              </button>

              {currentKanjiIndex === session.kanji.length - 1 ? (
                <button
                  onClick={handleStudyComplete}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Ready for Battle! 🎮
                </button>
              ) : (
                <button
                  onClick={() => setCurrentKanjiIndex(currentKanjiIndex + 1)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                  Next
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Quiz Phase */}
        {phase === 'quiz' && quizQuestions.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto px-4 py-8 max-w-2xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Training Ground Quiz</h2>
              <div className="flex justify-between items-center mb-2">
                <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                <span className="text-muted-foreground">
                  Score: {userAnswers.filter((a, i) => a === quizQuestions[i]?.correctIndex).length}/{userAnswers.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <motion.div
              key={currentQuestionIndex}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-card rounded-lg p-6 border border-border"
            >
              <h3 className="text-xl mb-6">{quizQuestions[currentQuestionIndex].question}</h3>

              <div className="space-y-3">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                  const isCorrect = idx === quizQuestions[currentQuestionIndex].correctIndex;
                  const isSelected = userAnswers[currentQuestionIndex] === idx;
                  const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={showQuizFeedback}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all text-2xl japanese-text ${showQuizFeedback && hasAnswered
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : isSelected
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-border'
                        : 'border-border hover:border-primary hover:bg-muted cursor-pointer'
                        }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Manual continue button as fallback */}
              {showQuizFeedback && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      // If no answer was recorded for this question, record it as unanswered (-1)
                      if (userAnswers.length <= currentQuestionIndex) {
                        const newAnswers = [...userAnswers];
                        // Fill any gaps with -1 (unanswered)
                        while (newAnswers.length <= currentQuestionIndex) {
                          newAnswers.push(-1);
                        }
                        setUserAnswers(newAnswers);
                      }

                      if (currentQuestionIndex < quizQuestions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                        setShowQuizFeedback(false);
                      } else {
                        // Make sure we have all answers including the current one
                        const finalAnswers = [...userAnswers];
                        // Fill any remaining gaps
                        while (finalAnswers.length < quizQuestions.length) {
                          finalAnswers.push(-1);
                        }
                        completeQuiz(finalAnswers);
                      }
                    }}
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Result Phase */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <div className="text-center max-w-2xl">
              {session.status === 'completed' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                  >
                    <h1 className="text-4xl font-bold mb-8">Pokémon Caught! 🎉</h1>

                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="mb-8"
                    >
                      <img
                        src={getPokemonSpriteUrl(session.pokemonId)}
                        alt="Caught Pokémon"
                        className="w-64 h-64 mx-auto"
                      />
                    </motion.div>

                    <p className="text-xl mb-2">Score: {Math.round(session.quizScore || 0)}%</p>
                    <p className="text-muted-foreground mb-8">
                      The Pokémon has been added to your Pokédex!
                    </p>
                  </motion.div>
                </>
              ) : (
                <>
                  <h1 className="text-4xl font-bold mb-8">The wild Pokémon fled... 😔</h1>
                  <p className="text-xl mb-2">Score: {Math.round(session.quizScore || 0)}%</p>
                  <p className="text-muted-foreground mb-8">
                    You need at least 75% to catch the Pokémon. Try again!
                  </p>
                </>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg"
                >
                  Back to Games
                </button>
                <button
                  onClick={startNewSession}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg"
                >
                  New Encounter
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
