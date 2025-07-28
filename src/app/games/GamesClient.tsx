'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { StudyListManager } from '@/utils/studyListManager';
import { JapaneseWord, StudyList } from '@/types';
import TTSManager from '@/utils/tts';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import KanjiQuest from '@/components/games/KanjiQuest';
import KanaDropModal from '@/components/games/KanaDropGame/KanaDropModal';
import SentenceScrambleModal from '@/components/games/SentenceScrambleGame/SentenceScrambleModal';
import KanjiQuestTutorialModal from '@/components/games/KanjiQuestTutorialModal';
import MatchingGameModal from '@/components/games/MatchingGame/MatchingGameModal';
import { getPokedexData } from '@/utils/kanjiUtils';
import { pokemonManager } from '@/utils/pokemonManager';
import { useKanjiSelection } from '@/contexts/KanjiSelectionContext';
import { useStrings } from '@/contexts/LanguageContext';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';
import SlideUpModal from '@/components/SlideUpModal';
import ListeningQuizEmptyState from '@/components/games/ListeningQuizEmptyState';

interface QuizQuestion {
  question: {
    id: string;
    word: string;
    reading: string;
    meaning: string;
  };
  options: Array<{
    id: string;
    word: string;
    reading?: string;
  }>;
  correctIndex: number;
}

interface QuizStats {
  totalQuestions: number;
  correctAnswers: number;
  questionsToday: number;
  lastPlayedDate: string;
  wordStats: Record<string, { correct: number; incorrect: number; lastSeen: string }>;
}

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconImage?: string; // Optional image path
  color: string;
  comingSoon?: boolean;
}

interface AssemblyQuestion {
  word: string;
  kana: string;
  meaning: string;
  correctKanaSegments: string[];
  distractors: string[];
  allOptions: string[];
}

interface AssemblyStats {
  totalGames: number;
  correctAnswers: number;
  gamesToday: number;
  lastPlayedDate: string;
  wordStats: Record<string, { attempts: number; correct: number; lastSeen: string }>;
}

// Daily limit for free users
const FREE_USER_DAILY_LIMIT = 3;

export default function GamesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature: kanjiFeature, access: kanjiAccess, remaining: kanjiRemaining } = useFeature('kanji_quest');
  const { isPremium, userType, subscription } = useSubscription2();
  const { selectedKanji, clearSelectedKanji } = useKanjiSelection();
  const [currentGameMode, setCurrentGameMode] = useState<string | null>(null);
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [savedWords, setSavedWords] = useState<JapaneseWord[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quizStats, setQuizStats] = useState<QuizStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    questionsToday: 0,
    lastPlayedDate: new Date().toISOString().split('T')[0],
    wordStats: {}
  });
  const [showGameSelection, setShowGameSelection] = useState(true);
  const [showListSelection, setShowListSelection] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [assemblyStats, setAssemblyStats] = useState<AssemblyStats>({
    totalGames: 0,
    correctAnswers: 0,
    gamesToday: 0,
    lastPlayedDate: new Date().toISOString().split('T')[0],
    wordStats: {}
  });
  const [currentAssemblyQuestion, setCurrentAssemblyQuestion] = useState<AssemblyQuestion | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [showAssemblyFeedback, setShowAssemblyFeedback] = useState(false);
  const [assemblyIsCorrect, setAssemblyIsCorrect] = useState(false);
  const strings = useStrings();

  // Kanji Quest specific state
  const [kanjiQuestJlptLevel, setKanjiQuestJlptLevel] = useState<number>(5);
  const [showKanjiQuestLevelSelect, setShowKanjiQuestLevelSelect] = useState(false);
  const [completedKanjiIds, setCompletedKanjiIds] = useState<Set<string>>(new Set());
  const [caughtPokemonIds, setCaughtPokemonIds] = useState<Set<number>>(new Set());
  const [customKanjiSelection, setCustomKanjiSelection] = useState<any[]>([]);
  const [waitingForKanji, setWaitingForKanji] = useState(false);
  const [showKanaDropModal, setShowKanaDropModal] = useState(false);
  const [showSentenceScrambleModal, setShowSentenceScrambleModal] = useState(false);
  const [showKanjiQuestTutorial, setShowKanjiQuestTutorial] = useState(false);
  const [showMatchingGameModal, setShowMatchingGameModal] = useState(false);
  const [showMatchingInstructions, setShowMatchingInstructions] = useState(false);
  const [showListeningInstructions, setShowListeningInstructions] = useState(false);

  const GAME_MODES: GameMode[] = [
    {
      id: 'kanji-quest',
      title: strings.games?.modes?.kanjiQuest?.title || 'Kanji Quest',
      description: strings.games?.modes?.kanjiQuest?.description || 'Catch kanji like Pokémon!',
      icon: '🎮',
      iconImage: '/pokeball.png',
      color: 'bg-red-500'
    },
    {
      id: 'kana-drop',
      title: strings.games?.modes?.kanaDrop?.title || 'Kana Drop',
      description: strings.games?.modes?.kanaDrop?.description || 'Tetris-style kana practice',
      icon: '🌧️',
      iconImage: '/flat-icons/root-icons/kana-drop.svg',
      color: 'bg-cyan-500'
    },
    {
      id: 'listening',
      title: strings.games?.modes?.listening?.title || 'Listening Quiz',
      description: strings.games?.modes?.listening?.description || 'Test your listening skills',
      icon: '🎧',
      iconImage: '/flat-icons/root-icons/listening.svg',
      color: 'bg-blue-500'
    },
    {
      id: 'assembly',
      title: strings.games?.modes?.assembly?.title || 'Word Assembly',
      description: strings.games?.modes?.assembly?.description || 'Build words from kana pieces',
      icon: '🔤',
      iconImage: '/flat-icons/root-icons/word.svg',
      color: 'bg-purple-500'
    },
    {
      id: 'matching',
      title: strings.games?.modes?.matching?.title || 'Matching Game',
      description: strings.games?.modes?.matching?.description || 'Match words with meanings',
      icon: '🎯',
      iconImage: '/flat-icons/root-icons/matching.svg',
      color: 'bg-red-500'
    },
    {
      id: 'sentence-scramble',
      title: strings.games?.modes?.sentenceScramble?.title || 'Sentence Scramble',
      description: strings.games?.modes?.sentenceScramble?.description || 'Unscramble Japanese sentences',
      icon: '🔀',
      iconImage: '/flat-icons/root-icons/sentence-scramble.svg',
      color: 'bg-orange-500'
    },
    {
      id: 'kanji-simon',
      title: 'Kanji Simon',
      description: 'Memory game with kanji',
      icon: '🧠',
      color: 'bg-green-500'
    },
    {
      id: 'reading-routes',
      title: 'Reading Routes',
      description: 'Navigate Japanese text mazes',
      icon: '🗺️',
      color: 'bg-indigo-500'
    },
    {
      id: 'stroke-order-practice',
      title: 'Stroke Order Practice',
      description: 'Practice writing kanji',
      icon: '✍️',
      color: 'bg-yellow-500'
    }
  ];

  // Load study lists on mount
  useEffect(() => {
    const loadLists = async () => {
      try {
        const lists = await StudyListManager.getAllStudyLists();
        setStudyLists(lists);
      } catch (error) {
        console.error('Error loading study lists:', error);
      }
    };
    loadLists();
  }, []);

  // Handle kanji selection from browser
  useEffect(() => {
    if (selectedKanji && selectedKanji.length > 0 && waitingForKanji) {
      const processSelectedKanji = async () => {
        // Check access for kanji quest
        const hasAccess = await checkAndTrack('kanji_quest');
        if (!hasAccess) {
          // Redirect to subscription page or show upgrade modal
          console.log('No access to Kanji Quest');
          clearSelectedKanji();
          setWaitingForKanji(false);
          return;
        }

        setCustomKanjiSelection(selectedKanji);
        setGameStarted(true);
        setWaitingForKanji(false);
      };

      processSelectedKanji();
    }
  }, [selectedKanji, waitingForKanji, checkAndTrack, clearSelectedKanji]);

  // Load saved words from selected lists
  useEffect(() => {
    const loadWords = async () => {
      if (selectedListIds.length === 0) {
        setSavedWords([]);
        return;
      }

      try {
        setLoading(true);
        const allWords: JapaneseWord[] = [];
        
        for (const listId of selectedListIds) {
          const items = await StudyListManager.getItemsInList(listId);
          allWords.push(...items.words);
        }

        // Remove duplicates
        const uniqueWords = Array.from(
          new Map(allWords.map(word => [word.id, word])).values()
        );

        setSavedWords(uniqueWords);
      } catch (error) {
        console.error('Error loading words:', error);
      } finally {
        setLoading(false);
      }
    };

    loadWords();
  }, [selectedListIds]);

  // Load stats from localStorage
  useEffect(() => {
    const loadStats = () => {
      const saved = localStorage.getItem('listeningQuizStats');
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = new Date().toISOString().split('T')[0];
        
        // Reset daily count if it's a new day
        if (parsed.lastPlayedDate !== today) {
          parsed.questionsToday = 0;
          parsed.lastPlayedDate = today;
        }
        
        setQuizStats(parsed);
      }

      // Load assembly stats
      const savedAssembly = localStorage.getItem('wordAssemblyStats');
      if (savedAssembly) {
        const parsed = JSON.parse(savedAssembly);
        const today = new Date().toISOString().split('T')[0];
        
        if (parsed.lastPlayedDate !== today) {
          parsed.gamesToday = 0;
          parsed.lastPlayedDate = today;
        }
        
        setAssemblyStats(parsed);
      }
    };

    loadStats();
  }, []);

  const handleGameModeSelect = async (gameMode: GameMode) => {
    setCurrentGameMode(gameMode.id);

    // Handle navigation for simple games
    if (gameMode.id === 'kanji-simon') {
      router.push('/games/kanji-simon');
    } else if (gameMode.id === 'reading-routes') {
      router.push('/games/reading-routes');
    } else if (gameMode.id === 'stroke-order-practice') {
      router.push('/games/stroke-order-practice');
    } else if (gameMode.id === 'kanji-quest') {
      // Show tutorial first
      setShowKanjiQuestTutorial(true);
    } else if (gameMode.id === 'kana-drop') {
      // Open KanaDrop modal (will handle kana selection internally)
      setShowKanaDropModal(true);
    } else if (gameMode.id === 'sentence-scramble') {
      // Open SentenceScramble modal (will handle list selection internally)
      setShowSentenceScrambleModal(true);
    } else if (gameMode.id === 'matching') {
      // Show list selection for matching game
      setShowMatchingInstructions(true);
    } else if (gameMode.id === 'listening' || gameMode.id === 'assembly') {
      // Show list selection for listening quiz or assembly
      setShowGameSelection(false);
      setShowListSelection(true);
    }
  };

  const handleBackToGameSelection = () => {
    setCurrentGameMode(null);
    setShowGameSelection(true);
    setShowListSelection(false);
    setGameStarted(false);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentAssemblyQuestion(null);
    setSelectedSegments([]);
    setShowAssemblyFeedback(false);
    setSelectedListIds([]);
    setSavedWords([]);
    setShowKanjiQuestLevelSelect(false);
  };

  const generateQuizQuestion = (): QuizQuestion | null => {
    if (savedWords.length < 4) return null;

    // Pick a random word as the question
    const questionWord = savedWords[Math.floor(Math.random() * savedWords.length)];
    
    // Generate 3 incorrect options
    const incorrectOptions = savedWords
      .filter(w => w.id !== questionWord.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => ({ id: w.id, word: w.kanji || w.kana, reading: w.kana }));
    
    // Create all options and shuffle
    const allOptions = [
      { id: questionWord.id, word: questionWord.kanji || questionWord.kana, reading: questionWord.kana },
      ...incorrectOptions
    ].sort(() => Math.random() - 0.5);
    
    // Find correct index
    const correctIndex = allOptions.findIndex(opt => opt.id === questionWord.id);
    
    return {
      question: {
        id: questionWord.id,
        word: questionWord.kanji || questionWord.kana,
        reading: questionWord.kana,
        meaning: questionWord.meaning
      },
      options: allOptions,
      correctIndex
    };
  };

  const handleStartQuiz = () => {
    // Check if user has reached daily limit (for free users)
    if (!isPremium && quizStats.questionsToday >= FREE_USER_DAILY_LIMIT && !authLoading) {
      alert(`Daily limit reached! Free users can practice ${FREE_USER_DAILY_LIMIT} questions per day. Upgrade to Premium for unlimited practice.`);
      return;
    }

    const question = generateQuizQuestion();
    if (question) {
      setCurrentQuestion(question);
      setGameStarted(true);
      setShowListSelection(false);
      
      // Play the audio immediately
      setTimeout(() => {
        const text = question.question.reading || question.question.word;
        TTSManager.speak(text, 'ja', 0.8);
      }, 100);
    }
  };

  const handleAnswer = (index: number) => {
    if (showFeedback || !currentQuestion) return;
    
    setSelectedAnswer(index);
    const correct = index === currentQuestion.correctIndex;
    setIsCorrect(correct);
    setShowFeedback(true);
    
    // Update stats
    const newStats = { ...quizStats };
    newStats.totalQuestions++;
    newStats.questionsToday++;
    if (correct) {
      newStats.correctAnswers++;
    }
    
    // Update word-specific stats
    const wordId = currentQuestion.question.id;
    if (!newStats.wordStats[wordId]) {
      newStats.wordStats[wordId] = { correct: 0, incorrect: 0, lastSeen: new Date().toISOString() };
    }
    if (correct) {
      newStats.wordStats[wordId].correct++;
    } else {
      newStats.wordStats[wordId].incorrect++;
    }
    newStats.wordStats[wordId].lastSeen = new Date().toISOString();
    
    setQuizStats(newStats);
    localStorage.setItem('listeningQuizStats', JSON.stringify(newStats));
  };

  const handleNextQuestion = () => {
    // Check daily limit again
    if (!isPremium && quizStats.questionsToday >= FREE_USER_DAILY_LIMIT && !authLoading) {
      alert(`Daily limit reached! Free users can practice ${FREE_USER_DAILY_LIMIT} questions per day. Upgrade to Premium for unlimited practice.`);
      handleBackToGameSelection();
      return;
    }

    const question = generateQuizQuestion();
    if (question) {
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);
      
      // Play the audio
      setTimeout(() => {
        const text = question.question.reading || question.question.word;
        TTSManager.speak(text, 'ja', 0.8);
      }, 100);
    }
  };

  const handleReplayAudio = () => {
    if (currentQuestion) {
      const text = currentQuestion.question.reading || currentQuestion.question.word;
      TTSManager.speak(text, 'ja', 0.8);
    }
  };

  const generateAssemblyQuestion = (): AssemblyQuestion | null => {
    if (savedWords.length === 0) return null;

    // Pick a random word
    const word = savedWords[Math.floor(Math.random() * savedWords.length)];
    
    // Skip if no kana reading
    if (!word.kana) return null;

    // Split kana into segments (simplified - could be improved)
    const kanaSegments = word.kana.match(/[\u3040-\u309f\u30a0-\u30ff]+/g) || [];
    
    // Generate distractors from other words
    const distractorKana = savedWords
      .filter(w => w.id !== word.id && w.kana)
      .map(w => w.kana)
      .join('')
      .match(/[\u3040-\u309f\u30a0-\u30ff]+/g) || [];
    
    // Get unique distractors
    const uniqueDistractors = Array.from(new Set(distractorKana))
      .filter(k => !kanaSegments.includes(k))
      .slice(0, 4);
    
    // Combine and shuffle
    const allOptions = [...kanaSegments, ...uniqueDistractors].sort(() => Math.random() - 0.5);
    
    return {
      word: word.kanji || word.kana,
      kana: word.kana,
      meaning: word.meaning,
      correctKanaSegments: kanaSegments,
      distractors: uniqueDistractors,
      allOptions
    };
  };

  const handleStartAssembly = () => {
    // Check if user has reached daily limit (for free users)
    if (!isPremium && assemblyStats.gamesToday >= FREE_USER_DAILY_LIMIT && !authLoading) {
      alert(`Daily limit reached! Free users can practice ${FREE_USER_DAILY_LIMIT} games per day. Upgrade to Premium for unlimited practice.`);
      return;
    }

    const question = generateAssemblyQuestion();
    if (question) {
      setCurrentAssemblyQuestion(question);
      setGameStarted(true);
      setShowListSelection(false);
    }
  };

  const handleSegmentClick = (segment: string) => {
    if (showAssemblyFeedback) return;
    
    if (selectedSegments.includes(segment)) {
      // Remove segment
      setSelectedSegments(selectedSegments.filter(s => s !== segment));
    } else {
      // Add segment
      setSelectedSegments([...selectedSegments, segment]);
    }
  };

  const handleCheckAssembly = () => {
    if (!currentAssemblyQuestion || showAssemblyFeedback) return;
    
    const assembledKana = selectedSegments.join('');
    const correct = assembledKana === currentAssemblyQuestion.kana;
    setAssemblyIsCorrect(correct);
    setShowAssemblyFeedback(true);
    
    // Update stats
    const newStats = { ...assemblyStats };
    newStats.totalGames++;
    newStats.gamesToday++;
    if (correct) {
      newStats.correctAnswers++;
    }
    
    // Update word-specific stats
    const wordKey = currentAssemblyQuestion.word;
    if (!newStats.wordStats[wordKey]) {
      newStats.wordStats[wordKey] = { attempts: 0, correct: 0, lastSeen: new Date().toISOString() };
    }
    newStats.wordStats[wordKey].attempts++;
    if (correct) {
      newStats.wordStats[wordKey].correct++;
    }
    newStats.wordStats[wordKey].lastSeen = new Date().toISOString();
    
    setAssemblyStats(newStats);
    localStorage.setItem('wordAssemblyStats', JSON.stringify(newStats));
  };

  const handleNextAssembly = () => {
    // Check daily limit again
    if (!isPremium && assemblyStats.gamesToday >= FREE_USER_DAILY_LIMIT && !authLoading) {
      alert(`Daily limit reached! Free users can practice ${FREE_USER_DAILY_LIMIT} games per day. Upgrade to Premium for unlimited practice.`);
      handleBackToGameSelection();
      return;
    }

    const question = generateAssemblyQuestion();
    if (question) {
      setCurrentAssemblyQuestion(question);
      setSelectedSegments([]);
      setShowAssemblyFeedback(false);
      setAssemblyIsCorrect(false);
    }
  };

  const handleKanjiQuestStart = (level: number) => {
    setKanjiQuestJlptLevel(level);
    setShowKanjiQuestLevelSelect(false);
    setGameStarted(true);

    // Clear kanji selection so KanjiQuest component uses JLPT level kanji
    setCustomKanjiSelection([]);
  };

  const handleStartKanjiFromBrowser = async () => {
    // Check access first
    const hasAccess = await checkAndTrack('kanji_quest');
    if (!hasAccess) {
      console.log('No access to Kanji Quest');
      return;
    }

    setCurrentGameMode('kanji-quest');
    setShowGameSelection(false);
    setShowKanjiQuestLevelSelect(false);
    setWaitingForKanji(true);
    setGameStarted(false);
    router.push('/kanji-browser');
  };

  // Show empty state for listening quiz when no study lists are available
  if (currentGameMode === 'listening' && studyLists.length === 0) {
    return <ListeningQuizEmptyState onBack={handleBackToGameSelection} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Games" />
      
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Game Mode Selection */}
          {showGameSelection && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {strings.games?.chooseYourGame || 'Choose Your Game'}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {strings.games?.selectGameMode || 'Practice Japanese through fun and interactive games'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_MODES.map((gameMode) => (
                  <button
                    key={gameMode.id}
                    onClick={() => handleGameModeSelect(gameMode)}
                    disabled={gameMode.comingSoon}
                    className={`p-6 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${
                      gameMode.comingSoon
                        ? 'border-border bg-muted/50 opacity-60 cursor-not-allowed'
                        : 'border-border bg-card hover:border-primary hover:shadow-lg'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg ${gameMode.color} flex items-center justify-center text-2xl p-2`}>
                        {gameMode.iconImage ? (
                          <img
                            src={gameMode.iconImage}
                            alt={gameMode.title}
                            width={32}
                            height={32}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          gameMode.icon
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {gameMode.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {gameMode.description}
                        </p>
                      </div>
                      <div className="text-muted-foreground">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {gameMode.comingSoon && (
                      <div className="mt-3 text-xs text-muted-foreground font-medium">
                        Coming Soon
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* List Selection for Listening Quiz and Assembly */}
          {!showGameSelection && showListSelection && (currentGameMode === 'listening' || currentGameMode === 'assembly') && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-5xl mb-4">
                  {currentGameMode === 'listening' ? '🎧' : '🔤'}
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {currentGameMode === 'listening' ? 'Listening Quiz' : 'Word Assembly'}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {currentGameMode === 'listening' 
                    ? 'Select study lists to practice listening comprehension'
                    : 'Select study lists to practice building words from kana'}
                </p>
              </div>

              {studyLists.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border-2 border-dashed border-border">
                  <p className="text-muted-foreground mb-4">
                    You don't have any study lists yet.
                  </p>
                  <SmartNavigationLink
                    href="/vocabulary"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Create Study Lists
                  </SmartNavigationLink>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {studyLists.map((list) => (
                      <label
                        key={list.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedListIds.includes(list.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedListIds.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedListIds([...selectedListIds, list.id]);
                            } else {
                              setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                            }
                          }}
                          className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{list.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {list.itemIds.length} items • {list.type}
                          </p>
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleBackToGameSelection}
                      className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={currentGameMode === 'listening' ? handleStartQuiz : handleStartAssembly}
                      disabled={selectedListIds.length === 0 || loading}
                      className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {loading ? 'Loading...' : 'Start Game'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Kanji Quest Level Selection */}
          {!showGameSelection && currentGameMode === 'kanji-quest' && showKanjiQuestLevelSelect && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-5xl mb-4">🎮</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Kanji Quest - Wild Battle Mode
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Choose your JLPT level to encounter wild kanji!
                </p>
                
                <div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-muted-foreground mb-2">
                    Want to practice specific kanji?
                  </p>
                  <button
                    onClick={handleStartKanjiFromBrowser}
                    className="text-primary hover:text-primary/80 font-medium underline"
                  >
                    Select from Kanji Browser →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {[5, 4, 3, 2, 1].map((level) => (
                  <button
                    key={level}
                    onClick={() => handleKanjiQuestStart(level)}
                    className="relative group overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-muted/50 to-muted dark:from-muted to-muted/50 hover:border-primary hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    <div className="p-6 text-center">
                      <div className="text-4xl font-bold text-primary mb-2">N{level}</div>
                      <div className="text-sm text-muted-foreground">
                        {level === 5 && '~100 kanji'}
                        {level === 4 && '~200 kanji'}
                        {level === 3 && '~350 kanji'}
                        {level === 2 && '~380 kanji'}
                        {level === 1 && '~1200 kanji'}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                
                <button
                  onClick={() => {
                    setShowKanjiQuestLevelSelect(false);
                    setGameStarted(true);
                  }}
                  className="relative group overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-purple-500/20 to-pink-500/20 hover:border-primary hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <div className="p-6 text-center">
                    <div className="text-4xl font-bold text-primary mb-2">ALL</div>
                    <div className="text-sm text-muted-foreground">~2000 kanji</div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleBackToGameSelection}
                  className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                >
                  Back to Games
                </button>
              </div>
            </div>
          )}

          {/* Listening Quiz Game */}
          {!showGameSelection && currentGameMode === 'listening' && gameStarted && currentQuestion && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Listening Quiz</h2>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>Score: {quizStats.correctAnswers}/{quizStats.totalQuestions}</span>
                  <span>•</span>
                  <span>Today: {quizStats.questionsToday}/{isPremium ? '∞' : FREE_USER_DAILY_LIMIT}</span>
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-card rounded-xl border border-border p-8">
                  <div className="text-center mb-8">
                    <button
                      onClick={handleReplayAudio}
                      className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <span className="text-5xl">🔊</span>
                    </button>
                    <p className="mt-4 text-muted-foreground">
                      Listen to the word and select the correct answer
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((option, index) => (
                      <button
                        key={option.id}
                        onClick={() => handleAnswer(index)}
                        disabled={showFeedback}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          showFeedback
                            ? index === currentQuestion.correctIndex
                              ? 'border-green-500 bg-green-500/10'
                              : index === selectedAnswer
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-border opacity-50'
                            : 'border-border hover:border-primary hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-medium">{option.word}</span>
                            {option.reading && option.reading !== option.word && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({option.reading})
                              </span>
                            )}
                          </div>
                          {showFeedback && index === currentQuestion.correctIndex && (
                            <span className="text-green-500">✓</span>
                          )}
                          {showFeedback && index === selectedAnswer && index !== currentQuestion.correctIndex && (
                            <span className="text-red-500">✗</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {showFeedback && (
                    <div className="mt-6 p-4 rounded-lg bg-muted">
                      <p className="font-medium mb-1">
                        {currentQuestion.question.word} ({currentQuestion.question.reading})
                      </p>
                      <p className="text-muted-foreground">
                        {currentQuestion.question.meaning}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={handleBackToGameSelection}
                      className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                    >
                      Exit
                    </button>
                    {showFeedback && (
                      <button
                        onClick={handleNextQuestion}
                        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Next Question
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Word Assembly Game */}
          {!showGameSelection && currentGameMode === 'assembly' && gameStarted && currentAssemblyQuestion && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Word Assembly</h2>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span>Score: {assemblyStats.correctAnswers}/{assemblyStats.totalGames}</span>
                  <span>•</span>
                  <span>Today: {assemblyStats.gamesToday}/{isPremium ? '∞' : FREE_USER_DAILY_LIMIT}</span>
                </div>
              </div>

              <div className="max-w-2xl mx-auto">
                <div className="bg-card rounded-xl border border-border p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-3xl font-bold mb-2">{currentAssemblyQuestion.word}</h3>
                    <p className="text-lg text-muted-foreground mb-1">
                      {currentAssemblyQuestion.meaning}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Build the correct reading by selecting kana in order
                    </p>
                  </div>

                  {/* Assembly Area */}
                  <div className="mb-8 p-4 bg-muted rounded-lg min-h-[60px] flex items-center justify-center">
                    {selectedSegments.length === 0 ? (
                      <span className="text-muted-foreground">Click kana below to build the word</span>
                    ) : (
                      <span className="text-2xl font-medium tracking-wide">
                        {selectedSegments.join('')}
                      </span>
                    )}
                  </div>

                  {/* Kana Options */}
                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {currentAssemblyQuestion.allOptions.map((segment, index) => (
                      <button
                        key={`${segment}-${index}`}
                        onClick={() => handleSegmentClick(segment)}
                        disabled={showAssemblyFeedback}
                        className={`p-3 rounded-lg border-2 text-lg font-medium transition-all ${
                          selectedSegments.includes(segment)
                            ? 'border-primary bg-primary/10 opacity-50'
                            : 'border-border hover:border-primary hover:bg-muted'
                        } ${
                          showAssemblyFeedback && currentAssemblyQuestion.correctKanaSegments.includes(segment)
                            ? 'border-green-500 bg-green-500/10'
                            : ''
                        }`}
                      >
                        {segment}
                      </button>
                    ))}
                  </div>

                  {/* Feedback */}
                  {showAssemblyFeedback && (
                    <div className={`p-4 rounded-lg mb-6 ${
                      assemblyIsCorrect ? 'bg-green-500/10 border border-green-500' : 'bg-red-500/10 border border-red-500'
                    }`}>
                      <p className="font-medium mb-1">
                        {assemblyIsCorrect ? '✓ Correct!' : '✗ Incorrect'}
                      </p>
                      <p className="text-sm">
                        The correct reading is: <span className="font-medium">{currentAssemblyQuestion.kana}</span>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedSegments([])}
                      disabled={showAssemblyFeedback}
                      className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBackToGameSelection}
                      className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
                    >
                      Exit
                    </button>
                    {!showAssemblyFeedback ? (
                      <button
                        onClick={handleCheckAssembly}
                        disabled={selectedSegments.length === 0}
                        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <button
                        onClick={handleNextAssembly}
                        className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Next Word
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kanji Quest Game */}
          {(() => {
            const shouldRenderKanjiQuest = !showGameSelection && currentGameMode === 'kanji-quest' && gameStarted;
            return shouldRenderKanjiQuest ? (
              <KanjiQuest
                jlptLevel={kanjiQuestJlptLevel}
                onBack={handleBackToGameSelection}
                onComplete={(completedIds, caughtIds) => {
                  setCompletedKanjiIds(new Set([...completedKanjiIds, ...completedIds]));
                  setCaughtPokemonIds(new Set([...caughtPokemonIds, ...caughtIds]));
                  console.log('Kanji Quest completed!', {
                    totalCompleted: completedKanjiIds.size + completedIds.size,
                    totalCaught: caughtPokemonIds.size + caughtIds.size
                  });
                }}
                customKanjiList={customKanjiSelection}
              />
            ) : null;
          })()}
        </div>
      </MobileAwareContainer>

      {/* Modals */}
      <div>
        {/* Matching Game Instructions Modal */}
        <SlideUpModal
          isOpen={showMatchingInstructions}
          onClose={() => {
            setShowMatchingInstructions(false);
            setShowGameSelection(true);
          }}
          onBackdropClick={() => {
            setShowMatchingInstructions(false);
            setShowListSelection(true);
          }}
          title="Matching Game Instructions"
          height="auto"
          showHandle={false}
        >
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 dark:bg-violet-900/20 rounded-full mb-4">
                <img
                  src="/flat-icons/root-icons/matching.svg"
                  alt="Matching Game"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">How to Play</h3>
              <p className="text-muted-foreground">
                Match Japanese words with their meanings in this memory game!
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Select Your Study Lists</h4>
                  <p className="text-sm text-muted-foreground">
                    Choose which vocabulary lists you want to practice with
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Flip Cards to Find Matches</h4>
                  <p className="text-sm text-muted-foreground">
                    Click cards to reveal Japanese words or their English meanings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Match Pairs</h4>
                  <p className="text-sm text-muted-foreground">
                    Find the matching Japanese word and its meaning to score points
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> The game tracks your best time and moves. 
                Try to beat your personal record!
              </p>
            </div>

            <button
              onClick={() => {
                setShowMatchingInstructions(false);
                setShowMatchingGameModal(true);
              }}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
            >
              Let's Play!
            </button>
          </div>
        </SlideUpModal>

        {/* KanaDrop Modal */}
        {showKanaDropModal && (
          <KanaDropModal
            isOpen={showKanaDropModal}
            onClose={() => {
              setShowKanaDropModal(false);
              setShowGameSelection(true);
            }}
          />
        )}

        {/* SentenceScramble Modal */}
        {showSentenceScrambleModal && (
          <SentenceScrambleModal
            isOpen={showSentenceScrambleModal}
            onClose={() => {
              setShowSentenceScrambleModal(false);
              setShowGameSelection(true);
            }}
          />
        )}

        {/* Matching Game Modal */}
        {showMatchingGameModal && (
          <MatchingGameModal
            isOpen={showMatchingGameModal}
            onClose={() => {
              setShowMatchingGameModal(false);
              setShowGameSelection(true);
              setSelectedListIds([]);
            }}
            onPlayAgain={() => {
              setShowMatchingGameModal(false);
              setShowMatchingInstructions(false);
              setShowListSelection(true);
            }}
            studyLists={studyLists.filter(list => selectedListIds.includes(list.id))}
          />
        )}

        {/* Kanji Quest Tutorial Modal */}
        <KanjiQuestTutorialModal
          isOpen={showKanjiQuestTutorial}
          onClose={() => {
            setShowKanjiQuestTutorial(false);
            setShowGameSelection(true);
          }}
          onStart={() => {
            setShowKanjiQuestTutorial(false);
            setShowKanjiQuestLevelSelect(true);
          }}
        />

        {/* Listening Quiz Instructions Modal */}
        <SlideUpModal
          isOpen={showListeningInstructions}
          onClose={() => {
            setShowListeningInstructions(false);
            setGameStarted(false);
          }}
          title="Listening Quiz Instructions"
          height="auto"
          showHandle={false}
        >
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mb-4">
                <span className="text-3xl">🎧</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">How to Play</h3>
              <p className="text-muted-foreground">
                Test your Japanese listening skills with this audio quiz!
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium mb-1">Listen Carefully</h4>
                  <p className="text-sm text-muted-foreground">
                    Click the speaker button to hear a Japanese word
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium mb-1">Choose the Correct Answer</h4>
                  <p className="text-sm text-muted-foreground">
                    Select the written form that matches what you heard
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium mb-1">Track Your Progress</h4>
                  <p className="text-sm text-muted-foreground">
                    See your score and daily practice count
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Free users:</span> {FREE_USER_DAILY_LIMIT} questions per day
                <br />
                <span className="font-medium">Premium users:</span> Unlimited practice
              </p>
            </div>

            <button
              onClick={() => {
                setShowListeningInstructions(false);
                handleStartQuiz();
              }}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
            >
              Start Quiz
            </button>
          </div>
        </SlideUpModal>
      </div>
    </div>
  );
}