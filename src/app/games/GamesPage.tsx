'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { SmartNavigationLink } from '@/components/navigation/SmartNavigationLink';
import { StudyListManager } from '@/utils/studyListManager';
import { JapaneseWord, StudyList } from '@/types';
import TTSManager from '@/utils/tts';
import { useAuth } from '@/contexts/AuthContext';
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
import { DesktopContainer } from '@/components/layout/DesktopContainer';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

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

function GamesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { checkAndTrack: checkKanjiQuestAccess } = useFeature('kanji_quest', {
    showModal: true,
    showToast: true,
    trackUsage: true
  });
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
    lastPlayedDate: '',
    wordStats: {}
  });
  const [audioLoading, setAudioLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showListSelection, setShowListSelection] = useState(false);
  const [showGameSelection, setShowGameSelection] = useState(true);

  // Word Assembly specific state
  const [currentAssemblyQuestion, setCurrentAssemblyQuestion] = useState<AssemblyQuestion | null>(null);
  const [assemblyStats, setAssemblyStats] = useState<AssemblyStats>({
    totalGames: 0,
    correctAnswers: 0,
    gamesToday: 0,
    lastPlayedDate: '',
    wordStats: {}
  });
  const [selectedKanaSegments, setSelectedKanaSegments] = useState<string[]>([]);
  const [availableKanaOptions, setAvailableKanaOptions] = useState<string[]>([]);
  const [assemblyFeedback, setAssemblyFeedback] = useState<{ show: boolean; correct: boolean; message: string }>({
    show: false,
    correct: false,
    message: ''
  });

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

  const strings = useStrings();

  const GAME_MODES: GameMode[] = [
    {
      id: 'kanji-quest',
      title: strings.games.modes.kanjiQuest.title,
      description: strings.games.modes.kanjiQuest.description,
      icon: '🎮',
      iconImage: '/pokeball.png',
      color: 'bg-red-500'
    },
    {
      id: 'kana-drop',
      title: strings.games.modes.kanaDrop.title,
      description: strings.games.modes.kanaDrop.description,
      icon: '🌧️',
      iconImage: '/flat-icons/root-icons/kana-drop.svg',
      color: 'bg-cyan-500'
    },
    {
      id: 'listening',
      title: strings.games.modes.listening.title,
      description: strings.games.modes.listening.description,
      icon: '🎧',
      iconImage: '/flat-icons/root-icons/listening.svg',
      color: 'bg-blue-500'
    },
    {
      id: 'assembly',
      title: strings.games.modes.assembly.title,
      description: strings.games.modes.assembly.description,
      icon: '🔤',
      iconImage: '/flat-icons/root-icons/word.svg',
      color: 'bg-purple-500'
    },
    {
      id: 'matching',
      title: strings.games.modes.matching.title,
      description: strings.games.modes.matching.description,
      icon: '🎯',
      iconImage: '/flat-icons/root-icons/matching.svg',
      color: 'bg-red-500'
    },
    {
      id: 'sentence-scramble',
      title: strings.games.modes.sentenceScramble.title,
      description: strings.games.modes.sentenceScramble.description,
      icon: '🧩',
      iconImage: '/flat-icons/root-icons/construction.svg',
      color: 'bg-orange-500'
    },
    {
      id: 'reading-routes',
      title: strings.games.modes.readingRoutes?.title || 'Reading Routes',
      description: strings.games.modes.readingRoutes?.description || 'Master kanji readings through path selection',
      icon: '🛤️',
      color: 'bg-gradient-to-r from-blue-500 to-purple-500'
    },
    {
      id: 'kanji-simon',
      title: strings.games.modes.kanjiSimon?.title || 'Kanji Simon',
      description: strings.games.modes.kanjiSimon?.description || 'Memory game: repeat kanji reading sequences',
      icon: '🎯',
      color: 'bg-gradient-to-r from-yellow-500 to-red-500'
    },
    {
      id: 'stroke-order-practice',
      title: strings.games.modes.strokeOrderPractice?.title || 'Stroke Order Practice',
      description: strings.games.modes.strokeOrderPractice?.description || 'Learn to write kanji with proper stroke order',
      icon: '✍️',
      color: 'bg-gradient-to-r from-green-500 to-teal-500'
    }
  ];

  // Remove manual limit checking - let Three-Pillar handle it
  // The checkAndTrack() function will handle all limit enforcement

  // Load quiz stats and Pokémon data on mount
  useEffect(() => {
    loadQuizStats();
    loadCaughtPokemon();

    // Check URL parameters for direct game mode
    const mode = searchParams.get('mode');
    const selection = searchParams.get('selection');

    if (mode === 'kanji-quest' && selection === 'custom') {
      // Set up the game mode and wait for kanji
      setCurrentGameMode('kanji-quest');
      setShowGameSelection(false);
      setShowKanjiQuestLevelSelect(false);
      setWaitingForKanji(true);
      setGameStarted(false);

    }
  }, [searchParams]);

  // Handle kanji arrival from context
  useEffect(() => {
    if (waitingForKanji && selectedKanji && selectedKanji.length > 0) {
      setCustomKanjiSelection(selectedKanji);
      setWaitingForKanji(false);
      clearSelectedKanji();
    }
  }, [selectedKanji, waitingForKanji, clearSelectedKanji]);

  // Handle delayed game start when auth/subscription data loads
  useEffect(() => {
    if (currentGameMode === 'kanji-quest' &&
      customKanjiSelection.length > 0 &&
      !authLoading &&
      !waitingForKanji &&
      !gameStarted) {


      // Start the game
      setGameStarted(true);
      // Clear the session storage
      sessionStorage.removeItem('kanjiQuestSelection');
    }
  }, [subscription, currentGameMode, customKanjiSelection, user, authLoading, waitingForKanji, gameStarted]);


  // Load words when selected lists change
  useEffect(() => {
    if (selectedListIds.length > 0) {
      loadWordsFromSelectedLists();
    } else {
      setSavedWords([]);
    }
  }, [selectedListIds]);

  const loadStudyLists = async () => {
    try {
      setLoading(true);
      const lists = await StudyListManager.getAllStudyLists();
      // Filter lists that have words
      const listsWithWords: StudyList[] = [];

      for (const list of lists) {
        const { words } = await StudyListManager.getItemsInList(list.id);
        if (words.length > 0) {
          listsWithWords.push({
            ...list,
            itemCount: words.length
          } as StudyList & { itemCount: number });
        }
      }

      setStudyLists(listsWithWords);
    } catch (error) {
      // Failed to load study lists
    } finally {
      setLoading(false);
    }
  };

  const loadWordsFromSelectedLists = async () => {
    try {
      let allWords: JapaneseWord[] = [];

      for (const listId of selectedListIds) {
        const { words } = await StudyListManager.getItemsInList(listId);
        allWords = allWords.concat(words);
      }

      // Remove duplicates and filter for words with both kanji and kana
      const uniqueWords = allWords
        .filter((word, index, arr) =>
          arr.findIndex(w => w.id === word.id) === index && // Remove duplicates
          word.kanji && word.kana // Only words with both kanji and kana
        );

      setSavedWords(uniqueWords);
    } catch (error) {
      // Failed to load words from selected lists
      setSavedWords([]);
    }
  };

  const loadQuizStats = () => {
    try {
      const saved = localStorage.getItem('listening_quiz_stats');
      if (saved) {
        const stats = JSON.parse(saved);
        const today = new Date().toDateString();

        // Reset daily count if it's a new day
        if (stats.lastPlayedDate !== today) {
          stats.questionsToday = 0;
          stats.lastPlayedDate = today;
        }

        setQuizStats(stats);
      }
    } catch (error) {
      // Failed to load quiz stats
    }
  };

  const saveQuizStats = (newStats: QuizStats) => {
    try {
      localStorage.setItem('listening_quiz_stats', JSON.stringify(newStats));
      setQuizStats(newStats);
    } catch (error) {
      // Failed to save quiz stats
    }
  };

  // Assembly Game Functions
  const loadAssemblyStats = () => {
    try {
      const saved = localStorage.getItem('assembly_game_stats');
      if (saved) {
        const stats = JSON.parse(saved);
        const today = new Date().toDateString();

        // Reset daily count if it's a new day
        if (stats.lastPlayedDate !== today) {
          stats.gamesToday = 0;
          stats.lastPlayedDate = today;
        }

        setAssemblyStats(stats);
      }
    } catch (error) {
      // Failed to load assembly stats
    }
  };

  const saveAssemblyStats = (newStats: AssemblyStats) => {
    try {
      localStorage.setItem('assembly_game_stats', JSON.stringify(newStats));
      setAssemblyStats(newStats);
    } catch (error) {
      // Failed to save assembly stats
    }
  };

  const generateAssemblyQuestion = (): AssemblyQuestion | null => {
    if (savedWords.length === 0) return null;

    const word = savedWords[Math.floor(Math.random() * savedWords.length)];
    if (!word.kana || !word.kanji) return null;

    // Break down kana into segments (simplified version)
    const kana = word.kana;
    const segments = breakDownKana(kana);
    const distractors = generateKanaDistractors(segments, savedWords);

    const allOptions = [...segments, ...distractors];
    shuffleArray(allOptions);

    return {
      word: word.kanji,
      kana: word.kana,
      meaning: word.meaning || '',
      correctKanaSegments: segments,
      distractors,
      allOptions
    };
  };

  const breakDownKana = (kana: string): string[] => {
    // Simple segmentation - can be improved with proper tokenization
    const segments: string[] = [];
    let i = 0;

    while (i < kana.length) {
      // Handle long vowels and special characters
      if (i < kana.length - 1) {
        const twoChar = kana.substring(i, i + 2);
        // Common two-character combinations
        if (['きゃ', 'きゅ', 'きょ', 'しゃ', 'しゅ', 'しょ', 'ちゃ', 'ちゅ', 'ちょ',
          'にゃ', 'にゅ', 'にょ', 'ひゃ', 'ひゅ', 'ひょ', 'みゃ', 'みゅ', 'みょ',
          'りゃ', 'りゅ', 'りょ', 'ぎゃ', 'ぎゅ', 'ぎょ', 'じゃ', 'じゅ', 'じょ',
          'びゃ', 'びゅ', 'びょ', 'ぴゃ', 'ぴゅ', 'ぴょ'].includes(twoChar)) {
          segments.push(twoChar);
          i += 2;
          continue;
        }
      }

      // Single character
      segments.push(kana[i]);
      i++;
    }

    return segments;
  };

  const generateKanaDistractors = (correctSegments: string[], wordPool: JapaneseWord[]): string[] => {
    const distractors: string[] = [];
    const commonKana = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ',
      'が', 'ぎ', 'ぐ', 'げ', 'ご', 'さ', 'し', 'す', 'せ', 'そ',
      'た', 'ち', 'つ', 'て', 'と', 'な', 'に', 'ぬ', 'ね', 'の',
      'は', 'ひ', 'ふ', 'へ', 'ほ', 'ま', 'み', 'む', 'め', 'も',
      'や', 'ゆ', 'よ', 'ら', 'り', 'る', 'れ', 'ろ', 'わ', 'ん'];

    // Add some random kana that aren't in the correct answer
    while (distractors.length < 3 && distractors.length < commonKana.length) {
      const randomKana = commonKana[Math.floor(Math.random() * commonKana.length)];
      if (!correctSegments.includes(randomKana) && !distractors.includes(randomKana)) {
        distractors.push(randomKana);
      }
    }

    return distractors;
  };

  const shuffleArray = (array: string[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  };

  const generateQuestion = (): QuizQuestion | null => {
    if (savedWords.length < 4) {
      return null; // Need at least 4 words to create a quiz
    }

    // Pick a random word as the correct answer
    const correctWord = savedWords[Math.floor(Math.random() * savedWords.length)];

    // Generate 3 distractors
    const distractors: JapaneseWord[] = [];
    const availableWords = savedWords.filter(w => w.id !== correctWord.id);

    while (distractors.length < 3 && availableWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableWords.length);
      const distractor = availableWords.splice(randomIndex, 1)[0];
      distractors.push(distractor);
    }

    // Create options array and shuffle
    const options = [
      {
        id: correctWord.id,
        word: correctWord.kanji,
        reading: correctWord.kana
      },
      ...distractors.map(d => ({
        id: d.id,
        word: d.kanji,
        reading: d.kana
      }))
    ];

    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    const correctIndex = options.findIndex(opt => opt.id === correctWord.id);

    return {
      question: {
        id: correctWord.id,
        word: correctWord.kanji,
        reading: correctWord.kana || '',
        meaning: correctWord.meaning || ''
      },
      options,
      correctIndex
    };
  };

  const handleListSelection = (listId: string, checked: boolean) => {
    if (checked) {
      setSelectedListIds(prev => [...prev, listId]);
    } else {
      setSelectedListIds(prev => prev.filter(id => id !== listId));
    }
  };

  const handleGameModeSelect = async (gameMode: GameMode) => {
    if (gameMode.comingSoon) return;

    // Map game mode to feature ID for Three-Pillar Architecture
    const featureMap: Record<string, string> = {
      'listening': 'listening_quiz',
      'assembly': 'word_assembly',
      'kanji-quest': 'kanji_quest',
      'kana-drop': 'kana_drop',
      'sentence-scramble': 'sentence_scramble',
      'matching': 'matching_game',
      'stroke-order': 'stroke_order_practice'
    };

    const featureId = featureMap[gameMode.id];
    if (!featureId) {
      // For games that navigate directly (kanji-simon, reading-routes)
      if (gameMode.id === 'reading-routes') {
        router.push('/games/reading-routes');
      } else if (gameMode.id === 'kanji-simon') {
        router.push('/games/kanji-simon');
      } else if (gameMode.id === 'stroke-order-practice') {
        router.push('/games/stroke-order-practice');
      }
      return;
    }

    // Check access using Three-Pillar Architecture
    const { checkAndTrack } = useFeature(featureId, {
      showModal: true,
      showToast: true,
      trackUsage: true
    });

    const hasAccess = await checkAndTrack();
    if (!hasAccess) {
      // Access denied - modal will be shown automatically
      return;
    }

    setCurrentGameMode(gameMode.id);
    setShowGameSelection(false);

    if (gameMode.id === 'listening') {
      setShowListSelection(true);
      loadStudyLists();
    } else if (gameMode.id === 'assembly') {
      setShowListSelection(true);
      loadStudyLists();
      loadAssemblyStats();
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
      setShowListSelection(true);
      loadStudyLists();
    }
  };

  const handleStartQuiz = async () => {
    if (selectedListIds.length === 0 || savedWords.length === 0) return;

    // Check access using three-pillar system
    let featureId: string;
    if (currentGameMode === 'assembly') {
      featureId = 'word_assembly';
    } else if (currentGameMode === 'matching') {
      featureId = 'matching_game';
    } else {
      featureId = 'listening_quiz';
    }

    const { checkAndTrack } = useFeature(featureId, {
      showModal: true,
      showToast: true,
      trackUsage: true
    });

    const canPlay = await checkAndTrack();

    if (!canPlay) {
      // Access denied - modals are shown automatically by checkAndTrack
      return;
    }

    // For matching game, show instructions first
    if (currentGameMode === 'matching') {
      setShowMatchingInstructions(true);
      setShowListSelection(false);
      setGameStarted(true); // Set gameStarted to avoid showing intermediate screen
      return;
    }

    // For listening game, show instructions first
    if (currentGameMode === 'listening') {
      if (savedWords.length < 4) return;
      setShowListeningInstructions(true);
      setShowListSelection(false);
      setGameStarted(true);
      return;
    }

    setShowListSelection(false);
    setGameStarted(true);

    if (currentGameMode === 'assembly') {
      startNewAssemblyQuestion();
    }
  };

  const startNewQuestion = async () => {
    // Access is already checked in handleStartQuiz, so proceed with question generation
    const question = generateQuestion();
    if (question) {
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsCorrect(false);

      // Auto-play the word after a short delay
      setTimeout(() => {
        playWordAudio(question.question.word);
      }, 500);
    }
  };

  const handleBackToListSelection = () => {
    setShowListSelection(true);
    setGameStarted(false);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleBackToGameSelection = () => {
    setShowGameSelection(true);
    setShowListSelection(false);
    setGameStarted(false);
    setCurrentGameMode(null);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setSelectedListIds([]);
    setSavedWords([]);
    setShowKanjiQuestLevelSelect(false);
  };

  const loadCaughtPokemon = async () => {
    try {
      // First, migrate any existing localStorage data
      // await pokemonManager.migrateFromLocalStorage(user?.uid); // Method doesn't exist

      // Then load the caught Pokémon
      const isPremiumUser = userType === 'monthly' || userType === 'yearly';
      const caughtPokemon = await pokemonManager.getCaughtPokemon(user, isPremiumUser);
      setCaughtPokemonIds(new Set(caughtPokemon));
    } catch (error) {
      // Failed to load caught Pokémon
    }
  };

  const handleKanjiQuestStart = (level: number) => {
    setKanjiQuestJlptLevel(level);
    setShowKanjiQuestLevelSelect(false);
    setGameStarted(true);

    // Clear kanji selection so KanjiQuest component uses JLPT level kanji
    setCustomKanjiSelection([]);
  };

  const handlePokemonCaught = async (pokemonId: number, kanjiIds: string[] = []) => {
    try {
      // Determine if user is premium using validator
      const isPremiumUser = userType === 'monthly' || userType === 'yearly';


      // Save using the new Pokemon manager
      await pokemonManager.saveCaughtPokemon(
        pokemonId,
        kanjiQuestJlptLevel,
        kanjiIds,
        user,
        isPremiumUser
      );

      // Update local state to trigger UI updates
      setCaughtPokemonIds(prev => new Set([...prev, pokemonId]));

      // Pokémon caught and saved successfully
    } catch (error) {
      // Failed to save caught Pokémon
      // Fallback to localStorage if needed
      const storageKey = user ? `pokedex_${user.uid}` : 'pokedex_guest';
      const existingData = localStorage.getItem(storageKey);
      const pokedexData = existingData ? JSON.parse(existingData) : { caught: [] };

      if (!pokedexData.caught.includes(pokemonId)) {
        pokedexData.caught.push(pokemonId);
        pokedexData.lastCaught = {
          id: pokemonId,
          date: new Date().toISOString()
        };
        localStorage.setItem(storageKey, JSON.stringify(pokedexData));
      }
    }
  };

  const handleKanjiCompleted = (kanjiIds: string[]) => {
    setCompletedKanjiIds(prev => {
      const newSet = new Set(prev);
      kanjiIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const playWordAudio = async (word: string) => {
    try {
      setAudioLoading(true);

      // Use the existing TTS system with game context for Google TTS
      await TTSManager.speak(word, { voice: 'female', context: 'game-kanji-quest' });
    } catch (error) {
      // TTS Error
      // Fallback to browser TTS
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        speechSynthesis.speak(utterance);
      }
    } finally {
      setAudioLoading(false);
    }
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (showFeedback) return;

    setSelectedAnswer(optionIndex);
    const correct = optionIndex === currentQuestion?.correctIndex;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Update stats
    const today = new Date().toDateString();
    const newStats: QuizStats = {
      ...quizStats,
      totalQuestions: quizStats.totalQuestions + 1,
      correctAnswers: quizStats.correctAnswers + (correct ? 1 : 0),
      questionsToday: quizStats.questionsToday + 1,
      lastPlayedDate: today,
      wordStats: {
        ...quizStats.wordStats,
        [currentQuestion!.question.word]: {
          ...quizStats.wordStats[currentQuestion!.question.word],
          correct: (quizStats.wordStats[currentQuestion!.question.word]?.correct || 0) + (correct ? 1 : 0),
          incorrect: (quizStats.wordStats[currentQuestion!.question.word]?.incorrect || 0) + (correct ? 0 : 1),
          lastSeen: today
        }
      }
    };

    saveQuizStats(newStats);
  };

  const handleNextQuestion = () => {
    if (currentGameMode === 'listening') {
      startNewQuestion();
    } else if (currentGameMode === 'assembly') {
      startNewAssemblyQuestion();
    }
  };

  // Assembly Game Handlers
  const startNewAssemblyQuestion = () => {
    // Access is already checked in handleStartQuiz, so proceed with question generation
    const question = generateAssemblyQuestion();
    if (question) {
      setCurrentAssemblyQuestion(question);
      setSelectedKanaSegments([]);
      setAvailableKanaOptions([...question.allOptions]);
      setAssemblyFeedback({ show: false, correct: false, message: '' });
      setGameStarted(true);

      // Auto-play the word after a short delay
      setTimeout(() => {
        playWordAudio(question.word);
      }, 500);
    }
  };

  const handleKanaSelection = (kana: string) => {
    if (assemblyFeedback.show) return;

    // Move from available to selected
    setAvailableKanaOptions(prev => prev.filter(k => k !== kana));
    setSelectedKanaSegments(prev => [...prev, kana]);
  };

  const handleKanaRemoval = (index: number) => {
    if (assemblyFeedback.show) return;

    const kana = selectedKanaSegments[index];
    setSelectedKanaSegments(prev => prev.filter((_, i) => i !== index));
    setAvailableKanaOptions(prev => [...prev, kana]);
  };

  const handleAssemblySubmit = () => {
    if (!currentAssemblyQuestion || assemblyFeedback.show) return;

    const userAnswer = selectedKanaSegments.join('');
    const correctAnswer = currentAssemblyQuestion.correctKanaSegments.join('');
    const isCorrect = userAnswer === correctAnswer;

    setAssemblyFeedback({
      show: true,
      correct: isCorrect,
      message: isCorrect ? '🎉 Correct!' : `❌ Incorrect. The answer was: ${correctAnswer}`
    });

    // Update stats
    updateAssemblyStats(isCorrect);
  };

  const updateAssemblyStats = (correct: boolean) => {
    if (!currentAssemblyQuestion) return;

    const today = new Date().toDateString();
    const newStats: AssemblyStats = {
      ...assemblyStats,
      totalGames: assemblyStats.totalGames + 1,
      correctAnswers: assemblyStats.correctAnswers + (correct ? 1 : 0),
      gamesToday: assemblyStats.gamesToday + 1,
      lastPlayedDate: today,
      wordStats: {
        ...assemblyStats.wordStats,
        [currentAssemblyQuestion.word]: {
          attempts: (assemblyStats.wordStats[currentAssemblyQuestion.word]?.attempts || 0) + 1,
          correct: (assemblyStats.wordStats[currentAssemblyQuestion.word]?.correct || 0) + (correct ? 1 : 0),
          lastSeen: today
        }
      }
    };

    saveAssemblyStats(newStats);
  };

  const handleShuffleKana = () => {
    if (assemblyFeedback.show) return;

    setAvailableKanaOptions(prev => {
      const shuffled = [...prev];
      shuffleArray(shuffled);
      return shuffled;
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎮</div>
          <p className="text-muted-foreground">Loading games...</p>
        </div>
      </div>
    );
  }

  // Show empty state for listening quiz when no study lists are available
  if (currentGameMode === 'listening' && studyLists.length === 0) {
    return <ListeningQuizEmptyState onBack={handleBackToGameSelection} />;
  }

  // Show simple empty state for assembly game (keep existing behavior)
  if (currentGameMode === 'assembly' && studyLists.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader
          title={strings.games.modes.assembly.title}
          backHref="/games"
        />
        <MobileAwareContainer className="container mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="text-8xl mb-6">🔤</div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              {strings.games.noStudyLists}
            </h3>
            <p className="text-muted-foreground mb-6">
              {strings.games.noStudyListsDescription}
            </p>
            <SmartNavigationLink
              href="/vocabulary"
              title="Vocabulary"
              type="page"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {strings.games.goToVocabulary}
            </SmartNavigationLink>
          </div>
        </MobileAwareContainer>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Games" />
      
      {/* Main Content */}
      <DesktopContainer>
        <MobileAwareContainer className="container mx-auto px-4 py-8">

        <div className="max-w-2xl mx-auto">
          {/* Game Selection */}
          {showGameSelection && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {strings.games.chooseYourGame}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {strings.games.selectGameMode}
                </p>
              </div>

              {/* Game Mode Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GAME_MODES.map((gameMode) => (
                  <button
                    key={gameMode.id}
                    onClick={() => handleGameModeSelect(gameMode)}
                    disabled={gameMode.comingSoon}
                    className={`p-6 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${gameMode.comingSoon
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
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {gameMode.title}
                          {gameMode.comingSoon && (
                            <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                              {strings.games.comingSoon}
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {gameMode.description}
                        </p>
                      </div>
                      {!gameMode.comingSoon && (
                        <div className="text-primary">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats Header - Show for listening and assembly games */}
          {!showGameSelection && (currentGameMode === 'listening' || currentGameMode === 'assembly') && (
            <div className="bg-card rounded-lg p-6 border border-border mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {currentGameMode === 'assembly' ? assemblyStats.correctAnswers : quizStats.correctAnswers}
                  </div>
                  <div className="text-sm text-muted-foreground">{strings.games.correct}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary">
                    {currentGameMode === 'assembly' ? assemblyStats.totalGames : quizStats.totalQuestions}
                  </div>
                  <div className="text-sm text-muted-foreground">{strings.games.total}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-accent">
                    {currentGameMode === 'assembly'
                      ? assemblyStats.totalGames > 0 ? Math.round((assemblyStats.correctAnswers / assemblyStats.totalGames) * 100) : 0
                      : quizStats.totalQuestions > 0 ? Math.round((quizStats.correctAnswers / quizStats.totalQuestions) * 100) : 0
                    }%
                  </div>
                  <div className="text-sm text-muted-foreground">{strings.games.accuracy}</div>
                </div>
              </div>

              {!isPremium && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">
                      {strings.games.dailyLimit}: {currentGameMode === 'assembly' ? assemblyStats.gamesToday : quizStats.questionsToday}/{FREE_USER_DAILY_LIMIT}
                    </div>
                    {false && (
                      <div className="text-xs text-destructive mt-1">
                        {strings.games.upgradeForUnlimited}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Game Content - Only show when not in game selection */}
          {!showGameSelection && showListSelection && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-6">
                  {currentGameMode === 'assembly' ? '🔤' : currentGameMode === 'matching' ? '🎯' : '🎧'}
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {currentGameMode === 'assembly'
                    ? 'Word Assembly Challenge'
                    : currentGameMode === 'matching'
                    ? strings.games.modes.matching.title
                    : 'Tap What You Hear'}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {currentGameMode === 'assembly'
                    ? 'Select study lists to practice building kana spelling from audio.'
                    : currentGameMode === 'matching'
                    ? 'Select study lists containing vocabulary words for the memory game.'
                    : 'Select one or more study lists to include in your listening quiz.'
                  }
                </p>
              </div>

              {/* List Selection */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-xl font-semibold mb-4">{strings.games.selectStudyLists}</h3>

                {studyLists.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {studyLists.map((list) => (
                      <label
                        key={list.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer border border-transparent hover:border-border transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedListIds.includes(list.id)}
                          onChange={(e) => handleListSelection(list.id, e.target.checked)}
                          className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                        />
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: list.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {list.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {(list as any).itemCount || 0} words • {list.type}
                            {list.description && ` • ${list.description}`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {strings.games.noStudyLists}
                  </div>
                )}
              </div>

              {/* Selection Summary & Start Button */}
              <div className="bg-card rounded-lg p-6 border border-border text-center">
                <div className="mb-4">
                  <div className="text-lg font-semibold text-foreground">
                    {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} {strings.games.selected}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {savedWords.length} {strings.games.totalWordsAvailable}
                    {currentGameMode === 'listening' && savedWords.length < 4 && savedWords.length > 0 && (
                      <span className="text-destructive ml-1">({strings.games.needAtLeast4Words})</span>
                    )}
                    {currentGameMode === 'assembly' && savedWords.length === 0 && (
                      <span className="text-destructive ml-1">({strings.games.needAtLeast1Word})</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleStartQuiz}
                  disabled={selectedListIds.length === 0 ||
                    (currentGameMode === 'listening' && savedWords.length < 4) ||
                    (currentGameMode === 'assembly' && savedWords.length === 0) ||
                    (currentGameMode === 'matching' && savedWords.length < 5)}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold transition-colors"
                >
                  {
                    selectedListIds.length === 0 ? strings.games.selectListsFirst :
                      (currentGameMode === 'listening' && savedWords.length < 4) ? strings.games.needMoreWords4 :
                        (currentGameMode === 'assembly' && savedWords.length === 0) ? strings.games.needAtLeast1Word :
                        (currentGameMode === 'matching' && savedWords.length < 5) ? 'Need at least 5 words' :
                          currentGameMode === 'matching' ? 'Continue' :
                          `${strings.games.start} ${currentGameMode === 'assembly' ? strings.games.modes.assembly.title : strings.games.quiz} 🎮`}
                </button>
              </div>
            </div>
          )}

          {!showGameSelection && !gameStarted && currentGameMode === 'listening' && !showMatchingInstructions && (
            <div className="text-center py-16">
              <div className="text-8xl mb-6">🎧</div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                {strings.games.readyToStart}
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                {strings.games.listenAndSelect}
              </p>

              <button
                onClick={startNewQuestion}
                disabled={false}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold transition-colors"
              >
                {strings.games.startQuiz}
              </button>

              <div className="mt-6 space-y-2">
                <div className="text-sm text-muted-foreground">
                  📚 {strings.games.usingWordsFromLists?.replace('{words}', savedWords.length.toString())?.replace('{lists}', selectedListIds.length.toString()) || `Using ${savedWords.length} words from ${selectedListIds.length} lists`}
                </div>
                <button
                  onClick={handleBackToListSelection}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  {strings.games.changeLists}
                </button>
              </div>
            </div>
          )}

          {!showGameSelection && currentGameMode === 'listening' && currentQuestion && (
            <div className="space-y-6">
              {/* Audio Control */}
              <div className="bg-card rounded-lg p-8 border border-border text-center">
                <div className="text-6xl mb-4">🎧</div>
                <button
                  onClick={() => playWordAudio(currentQuestion.question.word)}
                  disabled={audioLoading}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-lg font-semibold transition-colors"
                >
                  {audioLoading ? strings.loading.general : strings.games.states.playAgain}
                </button>
                <div className="mt-4 text-sm text-muted-foreground">
                  {strings.games.modes.listening.description}
                </div>
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`p-6 rounded-lg border-2 text-center transition-all text-xl font-medium ${showFeedback
                      ? index === currentQuestion.correctIndex
                        ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : selectedAnswer === index
                          ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          : 'border-border bg-muted'
                      : selectedAnswer === index
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/50 hover:bg-primary/5'
                      }`}
                  >
                    <div className="text-2xl mb-2">{option.word}</div>
                    {option.reading && (
                      <div className="text-sm text-muted-foreground">{option.reading}</div>
                    )}
                  </button>
                ))}
              </div>

              {/* Feedback */}
              {showFeedback && (
                <div className="bg-card rounded-lg p-6 border border-border text-center">
                  <div className={`text-4xl mb-4 ${isCorrect ? '' : ''}`}>
                    {isCorrect ? '🎉' : '😔'}
                  </div>
                  <div className={`text-xl font-semibold mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {isCorrect ? strings.games.states.correct : strings.games.states.incorrect}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    <div><strong>{currentQuestion.question.word}</strong> ({currentQuestion.question.reading})</div>
                    <div className="text-sm mt-1">{currentQuestion.question.meaning}</div>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    disabled={false}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-lg font-semibold transition-colors"
                  >
                    {strings.games.states.nextQuestion}
                  </button>
                </div>
              )}
            </div>
          )}

          {!showGameSelection && currentGameMode === 'assembly' && currentAssemblyQuestion && (
            <div className="space-y-6">
              {/* Audio Control */}
              <div className="bg-card rounded-lg p-8 border border-border text-center">
                <div className="text-6xl mb-4">🔤</div>
                <div className="text-xl font-semibold mb-2">{currentAssemblyQuestion.word}</div>
                <div className="text-sm text-muted-foreground mb-4">{currentAssemblyQuestion.meaning}</div>
                <button
                  onClick={() => playWordAudio(currentAssemblyQuestion.word)}
                  disabled={audioLoading}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-lg font-semibold transition-colors"
                >
                  {audioLoading ? strings.loading.general : strings.games.states.playAgain}
                </button>
                <div className="mt-4 text-sm text-muted-foreground">
                  Build the kana pronunciation by selecting segments below
                </div>
              </div>

              {/* Assembly Area */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-lg font-semibold mb-4 text-center">Build the Kana:</h3>

                {/* Selected Kana Display */}
                <div className="min-h-[60px] bg-muted rounded-lg p-4 mb-4 flex items-center justify-center flex-wrap gap-2">
                  {selectedKanaSegments.length === 0 ? (
                    <div className="text-muted-foreground text-sm">Click kana segments below to build the word</div>
                  ) : (
                    selectedKanaSegments.map((kana, index) => (
                      <button
                        key={index}
                        onClick={() => handleKanaRemoval(index)}
                        disabled={assemblyFeedback.show}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {kana}
                      </button>
                    ))
                  )}
                </div>

                {/* Available Kana Options */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Available Kana:</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {availableKanaOptions.map((kana, index) => (
                      <button
                        key={index}
                        onClick={() => handleKanaSelection(kana)}
                        disabled={assemblyFeedback.show}
                        className="px-4 py-3 bg-card border border-border rounded-lg text-xl font-medium hover:bg-muted hover:border-primary/50 disabled:opacity-50 transition-all hover:scale-105"
                      >
                        {kana}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleAssemblySubmit}
                    disabled={selectedKanaSegments.length === 0 || assemblyFeedback.show}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    Submit Answer
                  </button>
                  <button
                    onClick={handleShuffleKana}
                    disabled={assemblyFeedback.show}
                    className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                  >
                    🔀 Shuffle
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {assemblyFeedback.show && (
                <div className="bg-card rounded-lg p-6 border border-border text-center">
                  <div className={`text-4xl mb-4`}>
                    {assemblyFeedback.correct ? '🎉' : '😔'}
                  </div>
                  <div className={`text-xl font-semibold mb-2 ${assemblyFeedback.correct ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {assemblyFeedback.correct ? 'Correct!' : 'Incorrect'}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    <div><strong>{currentAssemblyQuestion.word}</strong> → {currentAssemblyQuestion.kana}</div>
                    <div className="text-sm mt-1">{currentAssemblyQuestion.meaning}</div>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    disabled={false}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-lg font-semibold transition-colors"
                  >
                    {strings.games.states.nextQuestion}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Kanji Quest Level Selection */}
          {!showGameSelection && currentGameMode === 'kanji-quest' && showKanjiQuestLevelSelect && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <img
                  src="/pokeball.png"
                  alt="Pokéball"
                  className="w-24 h-24 mx-auto mb-6 animate-bounce"
                />
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Kanji Quest - Wild Battle Mode
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Choose your JLPT level to browse and select kanji for battle!
                </p>
                {customKanjiSelection.length > 0 && (
                  <button
                    onClick={() => {
                      setShowKanjiQuestLevelSelect(false);
                      setGameStarted(true);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg font-medium"
                  >
                    <span>✨</span>
                    <span>Battle with {customKanjiSelection.length} selected kanji</span>
                    <img src="/pokeball.png" alt="Pokéball" className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
                {[5, 4, 3, 2, 1].map(level => {
                  const pokedex = getPokedexData(user?.uid);
                  const levelColors = {
                    5: 'from-green-400 to-green-600',
                    4: 'from-blue-400 to-blue-600',
                    3: 'from-yellow-400 to-yellow-600',
                    2: 'from-orange-400 to-orange-600',
                    1: 'from-red-400 to-red-600'
                  };
                  const levelBadges = {
                    5: '🌱',
                    4: '💧',
                    3: '⚡',
                    2: '🔥',
                    1: '🏆'
                  };
                  return (
                    <button
                      key={level}
                      onClick={() => handleKanjiQuestStart(level)}
                      className="relative group overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-muted/50 to-muted dark:from-muted to-muted/50 hover:border-primary hover:shadow-xl transition-all transform hover:scale-105"
                    >
                      {/* Pokémon-style gradient background */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${levelColors[level as keyof typeof levelColors]} opacity-20 group-hover:opacity-30 transition-opacity`} />

                      {/* Content */}
                      <div className="relative p-6 text-center">
                        {/* Badge */}
                        <div className="text-4xl mb-3">{levelBadges[level as keyof typeof levelBadges]}</div>

                        {/* Level */}
                        <h3 className="text-3xl font-bold mb-2 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                          JLPT N{level}
                        </h3>

                        {/* Difficulty */}
                        <p className="text-sm font-semibold text-muted-foreground mb-3">
                          {level === 5 ? 'Rookie Trainer' :
                            level === 4 ? 'Pokémon Trainer' :
                              level === 3 ? 'Gym Leader' :
                                level === 2 ? 'Elite Four' :
                                  'Champion'}
                        </p>

                        {/* Pokédex count for this level */}
                        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                          <img src="/pokeball.png" alt="Pokéball" className="w-4 h-4" />
                          <span>{pokedex.caught.length} caught</span>
                        </div>

                        {/* Hover effect pokéball */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <img src="/pokeball.png" alt="Pokéball" className="w-8 h-8 animate-spin-slow" />
                        </div>
                      </div>
                    </button>
                  );
                })}
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
                onPokemonCaught={handlePokemonCaught}
                completedKanjiIds={completedKanjiIds}
                onKanjiCompleted={handleKanjiCompleted}
                customKanji={customKanjiSelection.length > 0 ? customKanjiSelection : undefined}
              />
            ) : null;
          })()}
        </div>

        {/* Matching Game Instructions Modal */}
        <SlideUpModal
          isOpen={showMatchingInstructions}
          onClose={() => {
            setShowMatchingInstructions(false);
            setShowListSelection(true);
          }}
          title="Matching Game Instructions"
          height="auto"
          showHandle={false}
        >
          <div className="space-y-6">
            {/* Game Icon and Title */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-red-500 rounded-lg flex items-center justify-center">
                <img
                  src="/flat-icons/root-icons/matching.svg"
                  alt="Matching Game"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <p className="text-lg text-muted-foreground">
                Test your memory with your vocabulary!
              </p>
            </div>

            {/* How to Play */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                How to Play
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">1.</span>
                  <span>Tap any tile to reveal what's hidden underneath</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">2.</span>
                  <span>Find matching pairs - they could be:
                    <ul className="mt-1 ml-4 text-sm">
                      <li>• Same word twice</li>
                      <li>• Word and its reading (kana)</li>
                      <li>• Word and its meaning</li>
                    </ul>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">3.</span>
                  <span>Clear all pairs to win the game!</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">4.</span>
                  <span>Try to complete with as few moves as possible</span>
                </li>
              </ul>
            </div>

            {/* Game Info */}
            <div className="flex justify-center">
              <div className="bg-muted rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {savedWords.length >= 10 ? 15 : savedWords.length >= 7 ? 12 : 10}
                </div>
                <div className="text-sm text-muted-foreground">Pairs to Match</div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                <span className="font-semibold">💡 Tip:</span> Pay attention to the word pronunciation when you flip a tile - it helps with memorization!
              </p>
            </div>
            
            {/* Word limit notification */}
            {savedWords.length > 15 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  <span className="font-semibold">ℹ️ Note:</span> Your list has {savedWords.length} words. We'll randomly select 15 words for this game to keep it manageable.
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4">
              <button
                onClick={() => {
                  setShowMatchingInstructions(false);
                  setShowMatchingGameModal(true);
                }}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
              >
                Start Game
              </button>
            </div>
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
            selectedKana={[]} // Empty array - modal will handle kana selection internally
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
              setSavedWords([]);
            }}
            onPlayAgain={() => {
              setShowMatchingGameModal(false);
              setShowMatchingInstructions(false);
              setShowListSelection(true);
            }}
            words={savedWords}
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

        {/* Listening Game Instructions Modal */}
        <SlideUpModal
          isOpen={showListeningInstructions}
          onClose={() => {
            setShowListeningInstructions(false);
            setShowListSelection(true);
            setGameStarted(false);
          }}
          title="Listening Quiz Instructions"
          height="auto"
          showHandle={false}
        >
          <div className="space-y-6">
            {/* Game Icon and Title */}
            <div className="text-center">
              <div className="text-7xl mb-4">🎧</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {strings.games.readyToStart}
              </h2>
              <p className="text-lg text-muted-foreground">
                {strings.games.listenAndSelect}
              </p>
            </div>

            {/* How to Play */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                How to Play
              </h3>
              <ul className="space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">1.</span>
                  <span>Listen to the Japanese word pronunciation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">2.</span>
                  <span>Choose the correct word from the four options</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">3.</span>
                  <span>You can replay the audio as many times as needed</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">4.</span>
                  <span>Get instant feedback on your answer</span>
                </li>
              </ul>
            </div>

            {/* Game Info */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-sm text-muted-foreground">
                📚 Using <span className="font-semibold">{savedWords.length} words</span> from <span className="font-semibold">{selectedListIds.length} lists</span>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-primary-foreground">
                <span className="font-semibold">💡 Pro Tip:</span> Focus on the pitch accent and intonation patterns. This will help you distinguish between similar-sounding words!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  setShowListeningInstructions(false);
                  startNewQuestion();
                }}
                disabled={false}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold transition-colors"
              >
                {strings.games.startQuiz}
              </button>
              
              <button
                onClick={() => {
                  setShowListeningInstructions(false);
                  handleBackToListSelection();
                }}
                className="w-full text-sm text-primary hover:text-primary/80 underline"
              >
                {strings.games.changeLists}
              </button>
            </div>
          </div>
        </SlideUpModal>
      </MobileAwareContainer>
      </DesktopContainer>
    </div>
  );
}

export default function GamesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <GamesContent />
    </Suspense>
  );
}