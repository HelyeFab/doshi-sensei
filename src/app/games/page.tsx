'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { StudyListManager } from '@/utils/studyListManager';
import { JapaneseWord, StudyList } from '@/types';
import TTSManager from '@/utils/tts';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import CompanionTrigger from '@/components/CompanionTrigger';
import KanjiQuest from '@/components/games/KanjiQuest';
import { getPokedexData } from '@/utils/kanjiUtils';
import { pokemonManager } from '@/utils/pokemonManager';

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

// Available game modes
const GAME_MODES: GameMode[] = [
  {
    id: 'kanji-quest',
    title: 'Kanji Quest',
    description: 'Study kanji and battle to catch Pokémon for your Pokédex',
    icon: '🎮', // Fallback emoji
    iconImage: '/pokeball.png',
    color: 'bg-red-500'
  },
  {
    id: 'listening',
    title: 'Tap What You Hear',
    description: 'Listen to Japanese words and select the correct written form',
    icon: '🎧',
    color: 'bg-blue-500'
  },
  {
    id: 'assembly',
    title: 'Word Assembly Challenge',
    description: 'Build the correct kana spelling of words you hear',
    icon: '🔤',
    color: 'bg-purple-500'
  },
  {
    id: 'reading',
    title: 'Reading Speed',
    description: 'Test your reading speed with timed challenges',
    icon: '⚡',
    color: 'bg-green-500',
    comingSoon: true
  },
  {
    id: 'matching',
    title: 'Word Matching',
    description: 'Match kanji with their meanings or readings',
    icon: '🎯',
    color: 'bg-red-500',
    comingSoon: true
  },
  {
    id: 'sentence',
    title: 'Sentence Builder',
    description: 'Build correct Japanese sentences from word fragments',
    icon: '🧩',
    color: 'bg-orange-500',
    comingSoon: true
  }
];

export default function GamesPage() {
  const { user } = useAuth();
  const { userSubscription, userType } = useSubscription();
  const [currentGameMode, setCurrentGameMode] = useState<string | null>(null);
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [savedWords, setSavedWords] = useState<JapaneseWord[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [assemblyFeedback, setAssemblyFeedback] = useState<{show: boolean; correct: boolean; message: string}>({
    show: false,
    correct: false,
    message: ''
  });
  
  // Kanji Quest specific state
  const [kanjiQuestJlptLevel, setKanjiQuestJlptLevel] = useState<number>(5);
  const [showKanjiQuestLevelSelect, setShowKanjiQuestLevelSelect] = useState(false);
  const [completedKanjiIds, setCompletedKanjiIds] = useState<Set<string>>(new Set());
  const [caughtPokemonIds, setCaughtPokemonIds] = useState<Set<number>>(new Set());

  const isPremium = userSubscription?.subscription?.status === 'active';
  const canPlayMore = isPremium || 
    (currentGameMode === 'assembly' ? assemblyStats.gamesToday < FREE_USER_DAILY_LIMIT : quizStats.questionsToday < FREE_USER_DAILY_LIMIT);

  // Load quiz stats and Pokémon data on mount
  useEffect(() => {
    loadQuizStats();
    loadCaughtPokemon();
    setLoading(false); // Set loading to false initially since we're showing game selection
  }, [user, userType]);

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
      console.error('Failed to load study lists:', error);
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
      console.error('Failed to load words from selected lists:', error);
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
      console.error('Failed to load quiz stats:', error);
    }
  };

  const saveQuizStats = (newStats: QuizStats) => {
    try {
      localStorage.setItem('listening_quiz_stats', JSON.stringify(newStats));
      setQuizStats(newStats);
    } catch (error) {
      console.error('Failed to save quiz stats:', error);
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
      console.error('Failed to load assembly stats:', error);
    }
  };

  const saveAssemblyStats = (newStats: AssemblyStats) => {
    try {
      localStorage.setItem('assembly_game_stats', JSON.stringify(newStats));
      setAssemblyStats(newStats);
    } catch (error) {
      console.error('Failed to save assembly stats:', error);
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

  const handleGameModeSelect = (gameMode: GameMode) => {
    if (gameMode.comingSoon) return;
    
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
      setShowKanjiQuestLevelSelect(true);
    }
  };

  const handleStartQuiz = () => {
    if (selectedListIds.length === 0 || savedWords.length === 0) return;
    
    setShowListSelection(false);
    setGameStarted(true);
    
    if (currentGameMode === 'listening') {
      if (savedWords.length < 4) return;
      startNewQuestion();
    } else if (currentGameMode === 'assembly') {
      startNewAssemblyQuestion();
    }
  };

  const startNewQuestion = () => {
    if (!canPlayMore) return;

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
      await pokemonManager.migrateFromLocalStorage(user?.uid);
      
      // Then load the caught Pokémon
      const isPremiumUser = userType === 'monthly' || userType === 'yearly';
      const caughtPokemon = await pokemonManager.getCaughtPokemon(user, isPremiumUser);
      setCaughtPokemonIds(new Set(caughtPokemon));
    } catch (error) {
      console.error('Failed to load caught Pokémon:', error);
    }
  };

  const handleKanjiQuestStart = (level: number) => {
    setKanjiQuestJlptLevel(level);
    setShowKanjiQuestLevelSelect(false);
    setGameStarted(true);
  };

  const handlePokemonCaught = async (pokemonId: number, kanjiIds: string[] = []) => {
    try {
      // Determine if user is premium
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
      
      console.log(`Pokémon ${pokemonId} caught and saved!`);
    } catch (error) {
      console.error('Failed to save caught Pokémon:', error);
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
      
      // Use the existing TTS system
      await TTSManager.speak(word, 'female');
    } catch (error) {
      console.error('TTS Error:', error);
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
    const canPlay = isPremium || assemblyStats.gamesToday < FREE_USER_DAILY_LIMIT;
    if (!canPlay) return;

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

  if ((currentGameMode === 'listening' || currentGameMode === 'assembly') && studyLists.length === 0) {
    return (
      <>
        {/* Virtual Companion Section */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
          <CompanionTrigger />
        </div>

        <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
          <PageHeader title={currentGameMode === 'assembly' ? "Word Assembly" : "Listening Games"} showBackButton={true} />
          
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="text-8xl mb-6">🎧</div>
            <h3 className="text-2xl font-semibold text-foreground mb-4">
              No Study Lists Found
            </h3>
            <p className="text-muted-foreground mb-6">
              You need to create study lists with saved words to play the listening quiz. 
              Save words from vocabulary search and add them to lists to get started!
            </p>
            <button
              onClick={() => window.location.href = '/vocabulary'}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go to Vocabulary
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Virtual Companion Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        <CompanionTrigger />
      </div>

      <div className="container mx-auto px-4 py-6 min-h-screen pb-24 md:pb-8">
        <PageHeader 
          title={showGameSelection ? "Games" : currentGameMode === 'listening' ? "Listening Games" : currentGameMode === 'assembly' ? "Word Assembly" : "Games"} 
          showBackButton={true} 
        />
        
        <div className="max-w-2xl mx-auto">
          {/* Game Selection */}
          {showGameSelection && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🎮</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Choose Your Game
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Select a game mode to test your Japanese skills.
                </p>
              </div>

              {/* Game Mode Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              Coming Soon
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
                <div className="text-sm text-muted-foreground">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">
                  {currentGameMode === 'assembly' ? assemblyStats.totalGames : quizStats.totalQuestions}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {currentGameMode === 'assembly' 
                    ? assemblyStats.totalGames > 0 ? Math.round((assemblyStats.correctAnswers / assemblyStats.totalGames) * 100) : 0
                    : quizStats.totalQuestions > 0 ? Math.round((quizStats.correctAnswers / quizStats.totalQuestions) * 100) : 0
                  }%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>
            
            {!isPremium && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">
                    Daily Limit: {currentGameMode === 'assembly' ? assemblyStats.gamesToday : quizStats.questionsToday}/{FREE_USER_DAILY_LIMIT}
                  </div>
                  {!canPlayMore && (
                    <div className="text-xs text-destructive mt-1">
                      Upgrade to Premium for unlimited quizzes!
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
                <button
                  onClick={handleBackToGameSelection}
                  className="mb-4 text-sm text-primary hover:text-primary/80 underline"
                >
                  ← Back to Games
                </button>
                <div className="text-6xl mb-6">{currentGameMode === 'assembly' ? '🔤' : '🎧'}</div>
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  {currentGameMode === 'assembly' ? 'Word Assembly Challenge' : 'Tap What You Hear'}
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  {currentGameMode === 'assembly' 
                    ? 'Select study lists to practice building kana spelling from audio.' 
                    : 'Select one or more study lists to include in your listening quiz.'
                  }
                </p>
              </div>

              {/* List Selection */}
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="text-xl font-semibold mb-4">Select Study Lists</h3>
                
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
                    No study lists found
                  </div>
                )}
              </div>

              {/* Selection Summary & Start Button */}
              <div className="bg-card rounded-lg p-6 border border-border text-center">
                <div className="mb-4">
                  <div className="text-lg font-semibold text-foreground">
                    {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {savedWords.length} total words available
                    {currentGameMode === 'listening' && savedWords.length < 4 && savedWords.length > 0 && (
                      <span className="text-destructive ml-1">(Need at least 4 words)</span>
                    )}
                    {currentGameMode === 'assembly' && savedWords.length === 0 && (
                      <span className="text-destructive ml-1">(Need at least 1 word)</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={handleStartQuiz}
                  disabled={!canPlayMore || selectedListIds.length === 0 || 
                    (currentGameMode === 'listening' && savedWords.length < 4) ||
                    (currentGameMode === 'assembly' && savedWords.length === 0)}
                  className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold transition-colors"
                >
                  {!canPlayMore ? 'Daily Limit Reached 😔' : 
                   selectedListIds.length === 0 ? 'Select Lists First' :
                   (currentGameMode === 'listening' && savedWords.length < 4) ? 'Need More Words (4+)' :
                   (currentGameMode === 'assembly' && savedWords.length === 0) ? 'Need at least 1 word' :
                   `Start ${currentGameMode === 'assembly' ? 'Assembly' : 'Quiz'} 🎮`}
                </button>
              </div>
            </div>
          )}

          {!showGameSelection && !gameStarted && currentGameMode === 'listening' && (
            <div className="text-center py-16">
              <div className="text-8xl mb-6">🎧</div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Ready to Start!
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Listen to a Japanese word and select the correct written form from the options below.
              </p>
              
              <button
                onClick={startNewQuestion}
                disabled={!canPlayMore}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-semibold transition-colors"
              >
                {canPlayMore ? 'Start Quiz 🎮' : 'Daily Limit Reached 😔'}
              </button>
              
              <div className="mt-6 space-y-2">
                <div className="text-sm text-muted-foreground">
                  📚 Using {savedWords.length} words from {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={handleBackToListSelection}
                  className="text-sm text-primary hover:text-primary/80 underline"
                >
                  Change Lists
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
                  {audioLoading ? '🔄 Playing...' : '🔊 Play Again'}
                </button>
                <div className="mt-4 text-sm text-muted-foreground">
                  Listen and select the correct word below
                </div>
              </div>

              {/* Answer Options */}
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`p-6 rounded-lg border-2 text-center transition-all text-xl font-medium ${
                      showFeedback
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
                  <div className={`text-xl font-semibold mb-2 ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCorrect ? 'Correct!' : 'Incorrect'}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    <div><strong>{currentQuestion.question.word}</strong> ({currentQuestion.question.reading})</div>
                    <div className="text-sm mt-1">{currentQuestion.question.meaning}</div>
                  </div>
                  
                  <button
                    onClick={handleNextQuestion}
                    disabled={!canPlayMore}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {canPlayMore ? 'Next Question →' : 'Daily Limit Reached'}
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
                  {audioLoading ? '🔄 Playing...' : '🔊 Play Word'}
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
                  <div className={`text-xl font-semibold mb-2 ${
                    assemblyFeedback.correct ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {assemblyFeedback.correct ? 'Correct!' : 'Incorrect'}
                  </div>
                  <div className="text-muted-foreground mb-4">
                    <div><strong>{currentAssemblyQuestion.word}</strong> → {currentAssemblyQuestion.kana}</div>
                    <div className="text-sm mt-1">{currentAssemblyQuestion.meaning}</div>
                  </div>
                  
                  <button
                    onClick={handleNextQuestion}
                    disabled={!canPlayMore}
                    className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {canPlayMore ? 'Next Word →' : 'Daily Limit Reached'}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Kanji Quest Level Selection */}
          {!showGameSelection && currentGameMode === 'kanji-quest' && showKanjiQuestLevelSelect && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <button
                  onClick={handleBackToGameSelection}
                  className="mb-4 text-sm text-primary hover:text-primary/80 underline"
                >
                  ← Back to Games
                </button>
                <img 
                  src="/pokeball.png" 
                  alt="Pokéball" 
                  className="w-24 h-24 mx-auto mb-6 animate-bounce"
                />
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Kanji Quest - Wild Battle Mode
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Choose your trainer level to start your Pokémon journey!
                </p>
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
                      className="relative group overflow-hidden rounded-2xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 hover:border-primary hover:shadow-xl transition-all transform hover:scale-105"
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
          {!showGameSelection && currentGameMode === 'kanji-quest' && gameStarted && (
            <KanjiQuest
              jlptLevel={kanjiQuestJlptLevel}
              onBack={handleBackToGameSelection}
              onPokemonCaught={handlePokemonCaught}
              completedKanjiIds={completedKanjiIds}
              onKanjiCompleted={handleKanjiCompleted}
            />
          )}
        </div>
      </div>
    </>
  );
}