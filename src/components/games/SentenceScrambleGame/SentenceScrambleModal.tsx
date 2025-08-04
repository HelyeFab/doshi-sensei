'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StudyList, Sentence } from '@/types';
import { StudyListManager } from '@/utils/studyListManager';
import { generateFuriganaWithCache } from '@/utils/furigana';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAccess } from '@/hooks/useAccess';
import { useNotification } from '@/contexts/NotificationContext';
import { useStrings } from '@/contexts/LanguageContext';
import { X, Play, Clock, Star, RotateCcw } from 'lucide-react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { trackGamePlayed } from '@/lib/stats/trackingEvents';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  GameState,
  ScrambledSentence,
  WordBlock,
  GameStats,
  GAME_CONSTANTS,
  WORD_BLOCK_COLORS,
  DISTRACTOR_IMAGES
} from './types';

interface SentenceScrambleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SentenceScrambleModal({ isOpen, onClose }: SentenceScrambleModalProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { checkAndTrack } = useAccess();
  const { showNotification } = useNotification();
  const strings = useStrings();
  const { trackGameComplete } = useAnalytics();

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    phase: 'list-selection',
    selectedLists: [],
    sentences: [],
    currentSentenceIndex: 0,
    currentSentence: null,
    totalScore: 0,
    totalAttempts: 0,
    gameStartTime: 0,
    timeRemaining: GAME_CONSTANTS.SCRAMBLE_TIME_LIMIT / 1000,
    showDistractors: true, // Always show distractors for better visual experience
  });

  // UI state
  const [sentenceLists, setSentenceLists] = useState<StudyList[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [flashTimer, setFlashTimer] = useState(0);
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null);
  const [flashTimerRef, setFlashTimerRef] = useState<NodeJS.Timeout | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Furigana state
  const [showFurigana, setShowFurigana] = useState(false);
  const [furiganaText, setFuriganaText] = useState<string | null>(null);
  const [loadingFurigana, setLoadingFurigana] = useState(false);

  // Load sentence lists on mount
  useEffect(() => {
    if (isOpen) {
      loadSentenceLists();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimer) {
        clearInterval(gameTimer);
      }
      if (flashTimerRef) {
        clearInterval(flashTimerRef);
      }
    };
  }, [gameTimer, flashTimerRef]);

  const loadSentenceLists = async () => {
    try {
      setLoading(true);
      const lists = await StudyListManager.getSentenceLists();
      setSentenceLists(lists.filter(list => list.itemIds.length > 0)); // Only show lists with content
      setError(null);
    } catch (err) {
      console.error('Error loading sentence lists:', err);
      setError('Failed to load sentence lists');
    } finally {
      setLoading(false);
    }
  };

  const handleListSelection = (list: StudyList) => {
    setGameState(prev => {
      const isSelected = prev.selectedLists.some(l => l.id === list.id);
      const newSelectedLists = isSelected
        ? prev.selectedLists.filter(l => l.id !== list.id)
        : prev.selectedLists.length < GAME_CONSTANTS.MAX_SELECTED_LISTS
        ? [...prev.selectedLists, list]
        : prev.selectedLists;

      return { ...prev, selectedLists: newSelectedLists };
    });
  };

  const startGame = async () => {
    // Check access control
    const hasAccess = await checkAndTrack('sentence_scramble');
    if (!hasAccess) {
      return; // checkAndTrack shows appropriate modal
    }

    try {
      setLoading(true);

      // Collect sentences from selected lists
      const allSentences: Sentence[] = [];
      for (const list of gameState.selectedLists) {
        const items = await StudyListManager.getItemsInList(list.id);
        allSentences.push(...(items.sentences || []));
      }

      if (allSentences.length === 0) {
        setError('No sentences found in selected lists');
        return;
      }

      // Shuffle and limit sentences
      const shuffledSentences = shuffleArray(allSentences).slice(0, GAME_CONSTANTS.MAX_SENTENCES_PER_GAME);

      setGameState(prev => ({
        ...prev,
        phase: 'instructions',
        sentences: shuffledSentences,
        gameStartTime: Date.now(),
      }));

    } catch (err) {
      console.error('Error starting game:', err);
      setError('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const proceedToFlash = () => {
    setGameState(prev => ({ ...prev, phase: 'sentence-flash' }));

    // Reset furigana state for new sentence
    setShowFurigana(false);
    setFuriganaText(null);
    setLoadingFurigana(false);

    // Start flash timer
    setFlashTimer(GAME_CONSTANTS.SENTENCE_FLASH_DURATION);
    const timer = setInterval(() => {
      setFlashTimer(prev => {
        if (prev <= 100) {
          clearInterval(timer);
          setFlashTimerRef(null);
          startCountdown();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    // Store timer reference for cleanup/skip
    setFlashTimerRef(timer);
  };

  // Generate furigana when toggle is enabled during flash phase
  useEffect(() => {
    const generateFurigana = async () => {
      if (!showFurigana || furiganaText || gameState.phase !== 'sentence-flash') return;

      const currentSentence = gameState.sentences[gameState.currentSentenceIndex];
      if (!currentSentence) return;

      setLoadingFurigana(true);
      try {
        const generated = await generateFuriganaWithCache(currentSentence.text);
        setFuriganaText(generated);
      } catch (error) {
        console.error('Failed to generate furigana:', error);
      } finally {
        setLoadingFurigana(false);
      }
    };

    if (showFurigana && gameState.phase === 'sentence-flash') {
      generateFurigana();
    }
  }, [showFurigana, gameState.phase, gameState.currentSentenceIndex, gameState.sentences, furiganaText]);

  const skipFlashAndStartCountdown = () => {
    // Clear flash timer if running
    if (flashTimerRef) {
      clearInterval(flashTimerRef);
      setFlashTimerRef(null);
    }
    setFlashTimer(0);
    startCountdown();
  };

  const startCountdown = () => {
    setGameState(prev => ({ ...prev, phase: 'countdown' }));
    setCountdown(GAME_CONSTANTS.COUNTDOWN_DURATION);

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startScramblePhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startScramblePhase = () => {
    const currentSentence = gameState.sentences[gameState.currentSentenceIndex];
    if (!currentSentence) return;

    // Create scrambled sentence
    const scrambledSentence = createScrambledSentence(currentSentence);

    setGameState(prev => ({
      ...prev,
      phase: 'scramble',
      currentSentence: scrambledSentence,
      timeRemaining: GAME_CONSTANTS.SCRAMBLE_TIME_LIMIT / 1000,
    }));

    // Start game timer
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return prev;
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 };
      });
    }, 1000);

    setGameTimer(timer);
  };

  const createScrambledSentence = (sentence: Sentence): ScrambledSentence => {
    // Split sentence into words/particles
    const words = tokenizeSentence(sentence.text);

    // Create word blocks with unique IDs
    const timestamp = Date.now();
    const wordBlocks: WordBlock[] = words.map((word, index) => ({
      id: `block-${timestamp}-${index}`,
      text: word,
      originalIndex: index,
      currentIndex: index,
      isCorrectPosition: false,
      color: WORD_BLOCK_COLORS[index % WORD_BLOCK_COLORS.length],
    }));

    // Add distractor blocks mixed in with word blocks
    if (gameState.showDistractors) {
      const numDistractors = Math.min(3, Math.max(1, Math.floor(words.length * 0.4))); // 40% ratio or max 3
      for (let i = 0; i < numDistractors; i++) {
        const randomImage = DISTRACTOR_IMAGES[Math.floor(Math.random() * DISTRACTOR_IMAGES.length)];
        wordBlocks.push({
          id: `distractor-${timestamp}-${i}`,
          text: '', // Empty text for image blocks
          originalIndex: -1, // Mark as distractor
          currentIndex: -1,
          isCorrectPosition: false,
          color: '#e5e7eb', // Gray color for distractors
          isDistractor: true,
          distractorImage: randomImage
        } as WordBlock & { isDistractor: boolean; distractorImage: string });
      }
    }

    // Shuffle all blocks (words + distractors) together
    const shuffledBlocks = shuffleArray([...wordBlocks]);

    return {
      id: `scrambled-${timestamp}`,
      originalSentence: sentence,
      wordBlocks: shuffledBlocks,
      userOrder: [],
      attempts: 0,
      isCompleted: false,
      isCorrect: false,
    };
  };

  const tokenizeSentence = (text: string): string[] => {
    // Simple tokenization - split by common particles and punctuation
    // This could be enhanced with a proper Japanese tokenizer
    const particles = ['は', 'が', 'を', 'に', 'で', 'と', 'の', 'も', 'から', 'まで', 'より'];
    const result: string[] = [];
    let currentWord = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      currentWord += char;

      // Check if this character is a particle or punctuation
      if (particles.includes(char) || '。！？'.includes(char)) {
        if (currentWord.length > 1) {
          result.push(currentWord.slice(0, -1)); // Add word without particle
          result.push(char); // Add particle separately
        } else {
          result.push(currentWord);
        }
        currentWord = '';
      }
    }

    if (currentWord) {
      result.push(currentWord);
    }

    return result.filter(word => word.trim().length > 0);
  };

  const handleBlockClick = (block: WordBlock) => {
    if (!gameState.currentSentence || block.isDistractor) return; // Don't allow clicking distractors

    setGameState(prev => {
      if (!prev.currentSentence) return prev;

      const updatedSentence = { ...prev.currentSentence };
      updatedSentence.userOrder = [...updatedSentence.userOrder, block];

      // Remove block from available blocks
      updatedSentence.wordBlocks = updatedSentence.wordBlocks.filter(b => b.id !== block.id);

      return { ...prev, currentSentence: updatedSentence };
    });
  };

  const handleSubmitAttempt = () => {
    if (!gameState.currentSentence) return;

    const isCorrect = checkSentenceOrder(gameState.currentSentence);
    const newAttempts = gameState.currentSentence.attempts + 1;

    setGameState(prev => {
      if (!prev.currentSentence) return prev;

      const updatedSentence = { ...prev.currentSentence };
      updatedSentence.attempts = newAttempts;
      updatedSentence.isCorrect = isCorrect;
      updatedSentence.isCompleted = isCorrect || newAttempts >= GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE;

      return {
        ...prev,
        currentSentence: updatedSentence,
        totalAttempts: prev.totalAttempts + 1,
        totalScore: isCorrect ? prev.totalScore + 1 : prev.totalScore,
      };
    });

    // Show feedback immediately
    setShowFeedback(true);

    // Hide feedback and proceed based on result
    setTimeout(() => {
      setShowFeedback(false);

      if (isCorrect || newAttempts >= GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE) {
        // Sentence is completed - clear timer and move on
        clearInterval(gameTimer!);
        setTimeout(() => {
          if (gameState.currentSentenceIndex < gameState.sentences.length - 1) {
            moveToNextSentence();
          } else {
            endGame();
          }
        }, 500); // Short delay after feedback disappears
      } else {
        // Incorrect but still have attempts - reset user order for next attempt
        setGameState(prev => {
          if (!prev.currentSentence) return prev;

          const updatedSentence = { ...prev.currentSentence };
          // Reset user order and restore word blocks with unique IDs
          const timestamp = Date.now();
          const originalBlocks = tokenizeSentence(updatedSentence.originalSentence.text).map((word, index) => ({
            id: `block-${timestamp}-${index}`,
            text: word,
            originalIndex: index,
            currentIndex: index,
            isCorrectPosition: false,
            color: WORD_BLOCK_COLORS[index % WORD_BLOCK_COLORS.length],
          }));

          // Re-add distractors
          if (gameState.showDistractors) {
            const numDistractors = Math.min(3, Math.max(1, Math.floor(originalBlocks.length * 0.4)));
            for (let i = 0; i < numDistractors; i++) {
              const randomImage = DISTRACTOR_IMAGES[Math.floor(Math.random() * DISTRACTOR_IMAGES.length)];
              originalBlocks.push({
                id: `distractor-${timestamp}-${i}`,
                text: '',
                originalIndex: -1,
                currentIndex: -1,
                isCorrectPosition: false,
                color: '#e5e7eb',
                isDistractor: true,
                distractorImage: randomImage
              } as WordBlock);
            }
          }

          updatedSentence.wordBlocks = shuffleArray([...originalBlocks]);
          updatedSentence.userOrder = [];

          return { ...prev, currentSentence: updatedSentence };
        });
      }
    }, 2000); // Show feedback for 2 seconds
  };

  const checkSentenceOrder = (sentence: ScrambledSentence): boolean => {
    const userText = sentence.userOrder.map(block => block.text).join('');
    const originalText = sentence.originalSentence.text;
    return userText === originalText;
  };

  const moveToNextSentence = () => {
    setShowFeedback(false);
    setGameState(prev => ({
      ...prev,
      currentSentenceIndex: prev.currentSentenceIndex + 1,
      currentSentence: null,
      phase: 'sentence-flash',
    }));
    proceedToFlash();
  };

  const handleTimeUp = () => {
    if (!gameState.currentSentence) return;

    const newAttempts = gameState.currentSentence.attempts + 1;

    setGameState(prev => {
      if (!prev.currentSentence) return prev;

      const updatedSentence = { ...prev.currentSentence };
      updatedSentence.attempts = newAttempts;
      updatedSentence.isCompleted = newAttempts >= GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE;

      if (updatedSentence.isCompleted) {
        setTimeout(() => {
          if (prev.currentSentenceIndex < prev.sentences.length - 1) {
            moveToNextSentence();
          } else {
            endGame();
          }
        }, 1000);
      }

      return {
        ...prev,
        currentSentence: updatedSentence,
        totalAttempts: prev.totalAttempts + 1,
      };
    });
  };

  const endGame = () => {
    setGameState(prev => ({ ...prev, phase: 'game-over' }));
    clearInterval(gameTimer!);

    // Track game completion
    const timePlayed = Date.now() - gameState.gameStartTime;
    if (timePlayed > 10000) { // Only track if played for more than 10 seconds
      const score = Math.round((gameState.totalScore / Math.max(gameState.sentences.length, 1)) * 100);
      trackGamePlayed('sentence-scramble', score, gameState.sentences.length, gameState.totalScore).catch(error => {
        console.error('Failed to track game completion:', error);
      });
      
      // Track with new analytics
      const accuracy = gameState.sentences.length > 0 ? (gameState.totalScore / gameState.sentences.length) * 100 : 0;
      trackGameComplete('sentence_scramble', score, accuracy);
      console.log('[SentenceScramble] Analytics tracked:', { game: 'sentence_scramble', score, accuracy });
    }

    showNotification({
      title: 'Game Complete!',
      message: `You completed ${gameState.totalScore} out of ${gameState.sentences.length} sentences!`,
      type: 'success'
    });
  };

  const resetGame = () => {
    setGameState({
      phase: 'list-selection',
      selectedLists: [],
      sentences: [],
      currentSentenceIndex: 0,
      currentSentence: null,
      totalScore: 0,
      totalAttempts: 0,
      gameStartTime: 0,
      timeRemaining: GAME_CONSTANTS.SCRAMBLE_TIME_LIMIT / 1000,
      showDistractors: true,
    });
    setCountdown(0);
    setFlashTimer(0);
    setShowFeedback(false);
    if (gameTimer) {
      clearInterval(gameTimer);
      setGameTimer(null);
    }
    if (flashTimerRef) {
      clearInterval(flashTimerRef);
      setFlashTimerRef(null);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleClose = () => {
    // Track early exit if game has been playing
    if (gameState.phase === 'scramble' && gameState.gameStartTime > 0) {
      const timePlayed = Date.now() - gameState.gameStartTime;
      if (timePlayed > 10000) { // Only track if played for more than 10 seconds
        const score = Math.round((gameState.totalScore / Math.max(gameState.currentSentenceIndex + 1, 1)) * 100);
        trackGamePlayed('sentence-scramble', score, gameState.currentSentenceIndex + 1, gameState.totalScore).catch(error => {
          console.error('Failed to track early exit:', error);
        });
        
        // Track with new analytics
        const accuracy = (gameState.currentSentenceIndex + 1) > 0 ? (gameState.totalScore / (gameState.currentSentenceIndex + 1)) * 100 : 0;
        trackGameComplete('sentence_scramble', score, accuracy);
        console.log('[SentenceScramble] Analytics tracked (early exit):', { game: 'sentence_scramble', score, accuracy });
      }
    }
    
    resetGame();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-card border rounded-lg shadow-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            🧩 {strings.games.sentenceScramble?.title || 'Sentence Scramble'}
          </h2>
          <button
            onClick={() => setShowExitConfirmation(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Content */}
        <div className="p-3 sm:p-6 overflow-y-auto">
          {renderGamePhase()}
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showExitConfirmation}
        title={strings.games.sentenceScramble?.exitConfirmationTitle || 'Exit Sentence Scramble?'}
        message={strings.games.sentenceScramble?.exitConfirmationMessage || 'Are you sure you want to exit the game? Your current progress will be lost.'}
        confirmText={strings.games.sentenceScramble?.exitConfirmationConfirmText || 'Exit Game'}
        cancelText={strings.games.sentenceScramble?.exitConfirmationCancelText || 'Continue Playing'}
        isDestructive={true}
        onConfirm={() => {
          setShowExitConfirmation(false);
          handleClose();
        }}
        onCancel={() => setShowExitConfirmation(false)}
        loading={false}
      />
    </div>
  );

  function renderGamePhase() {
    switch (gameState.phase) {
      case 'list-selection':
        return renderListSelection();
      case 'instructions':
        return renderInstructions();
      case 'sentence-flash':
        return renderSentenceFlash();
      case 'countdown':
        return renderCountdown();
      case 'scramble':
        return renderScramblePhase();
      case 'game-over':
        return renderGameOver();
      default:
        return <div>Loading...</div>;
    }
  }

  function renderListSelection() {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{strings.games.sentenceScramble?.selectListsTitle || 'Select Lists'}</h3>
          <p className="text-muted-foreground">
            {strings.games.sentenceScramble?.selectListsDescription || 'Select up to ' + GAME_CONSTANTS.MAX_SELECTED_LISTS + ' lists to include sentences in the game.'}
          </p>
        </div>

        {loading && (
          <div className="text-center">
            <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {sentenceLists.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{strings.games.sentenceScramble?.noListsFound || 'No sentence lists found.'}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {strings.games.sentenceScramble?.noListsDescription || 'Please ensure you have added some sentence lists in the settings.'}
            </p>
          </div>
        )}

        {sentenceLists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sentenceLists.map((list) => (
              <button
                key={list.id}
                onClick={() => handleListSelection(list)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  gameState.selectedLists.some(l => l.id === list.id)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: list.color }}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{list.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {list.itemIds.length} sentences
                    </p>
                  </div>
                  {gameState.selectedLists.some(l => l.id === list.id) && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground text-xs">✓</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {gameState.selectedLists.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={startGame}
              disabled={loading}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Play className="w-5 h-5" />
              {strings.games.sentenceScramble?.startGame || 'Start Game'} ({gameState.selectedLists.length} list{gameState.selectedLists.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderInstructions() {
    return (
      <div className="space-y-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">{strings.games.sentenceScramble?.howToPlay || 'How to Play Sentence Scramble'}</h3>

          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <span className="text-2xl">👀</span>
              <div>
                <h4 className="font-semibold">{strings.games.sentenceScramble?.watchSentence || 'Watch the Sentence'}</h4>
                <p className="text-muted-foreground">{strings.games.sentenceScramble?.watchSentenceDesc || 'You will see a scrambled sentence.'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🔤</span>
              <div>
                <h4 className="font-semibold">{strings.games.sentenceScramble?.rebuildSentence || 'Rebuild the Sentence'}</h4>
                <p className="text-muted-foreground">{strings.games.sentenceScramble?.rebuildSentenceDesc || 'Your task is to rebuild the sentence by clicking the correct order of words.'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <h4 className="font-semibold">{strings.games.sentenceScramble?.beatClock || 'Beat the Clock'}</h4>
                <p className="text-muted-foreground">{strings.games.sentenceScramble?.beatClockDesc || 'You have a limited time to complete each sentence.'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <h4 className="font-semibold">{strings.games.sentenceScramble?.scorePoints || 'Score Points'}</h4>
                <p className="text-muted-foreground">{strings.games.sentenceScramble?.scorePointsDesc || 'Correctly rebuilt sentences earn points.'}</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={proceedToFlash}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
        >
          <Play className="w-5 h-5" />
          {strings.games.sentenceScramble?.startPlaying || 'Start Playing'}
        </button>
      </div>
    );
  }

  function renderSentenceFlash() {
    const currentSentence = gameState.sentences[gameState.currentSentenceIndex];

    return (
      <div className="space-y-6 text-center">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Sentence {gameState.currentSentenceIndex + 1} of {gameState.sentences.length}
          </p>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-100"
              style={{
                width: `${((GAME_CONSTANTS.SENTENCE_FLASH_DURATION - flashTimer) / GAME_CONSTANTS.SENTENCE_FLASH_DURATION) * 100}%`
              }}
            />
          </div>
        </div>

        <div className="bg-muted/30 rounded-xl p-8 min-h-[200px] flex items-center justify-center relative">
          <div className="text-3xl font-medium japanese-text leading-relaxed">
            {showFurigana && furiganaText ? (
              <div
                dangerouslySetInnerHTML={{ __html: furiganaText }}
                className="ruby-text"
              />
            ) : (
              <p>{currentSentence?.text}</p>
            )}
          </div>

          {/* Furigana toggle */}
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            className={`absolute top-4 right-4 flex items-center gap-1 px-3 py-2 text-sm rounded transition-colors ${
              showFurigana
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            title={showFurigana ? 'Hide furigana' : 'Show furigana'}
          >
            {loadingFurigana ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              'あ'
            )}
            <span className="text-xs">
              {showFurigana ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-lg text-muted-foreground">
            {strings.games.sentenceScramble?.memorizeSentence || 'Memorize the sentence before attempting to rebuild it.'}
          </p>

          <button
            onClick={skipFlashAndStartCountdown}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5" />
            {strings.games.sentenceScramble?.skipReading || 'Skip Reading'}
          </button>
        </div>
      </div>
    );
  }

  function renderCountdown() {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-8xl font-bold text-primary mb-4 animate-pulse">
            {countdown}
          </div>
          <p className="text-xl text-muted-foreground">{strings.games.sentenceScramble?.getReady || 'Get Ready!'}</p>
        </div>
      </div>
    );
  }

  function renderScramblePhase() {
    if (!gameState.currentSentence) return null;

    return (
      <div className="space-y-6">
        {/* Header with timer and attempts */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className={`font-mono ${gameState.timeRemaining <= 5 ? 'text-destructive' : ''}`}>
                {gameState.timeRemaining}s
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              <span>{strings.games.sentenceScramble?.attempts || 'Attempts'}: {gameState.currentSentence.attempts}/{GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {strings.games.sentenceScramble?.sentenceOf || 'Sentence'} {gameState.currentSentenceIndex + 1} of {gameState.sentences.length}
          </p>
        </div>

        {/* User's current order */}
        <div className="space-y-2">
          <h4 className="font-medium">{strings.games.sentenceScramble?.yourSentence || 'Your Sentence'}</h4>
          <div className="min-h-[60px] sm:min-h-[80px] bg-muted/30 rounded-lg p-2 sm:p-4 flex flex-wrap gap-2 items-center justify-center sm:justify-start">
            {gameState.currentSentence.userOrder.map((block, index) => (
              <div
                key={`user-${block.id}`}
                className="min-w-[50px] max-w-[120px] h-10 sm:h-12 px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm shadow-sm border flex items-center justify-center text-center"
                style={{
                  backgroundColor: block.color,
                  borderColor: `${block.color}88`,
                }}
              >
                <span className="truncate">{block.text}</span>
              </div>
            ))}
            {gameState.currentSentence.userOrder.length === 0 && (
              <p className="text-muted-foreground italic">{strings.games.sentenceScramble?.clickBlocks || 'Click the blocks to rebuild the sentence.'}</p>
            )}
          </div>
        </div>

        {/* Available blocks */}
        <div className="space-y-2">
          <h4 className="font-medium">{strings.games.sentenceScramble?.availableBlocks || 'Available Blocks'}</h4>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center p-2 sm:p-4 bg-muted/20 rounded-lg min-h-[100px] sm:min-h-[120px]">
            {gameState.currentSentence.wordBlocks.map((block) => (
              <button
                key={block.id}
                onClick={() => handleBlockClick(block)}
                className={`min-w-[50px] max-w-[120px] h-10 sm:h-12 px-2 sm:px-4 py-2 sm:py-3 rounded-lg font-medium shadow-lg transition-all duration-200 border-2 border-opacity-50 flex items-center justify-center text-center ${
                  block.isDistractor
                    ? 'cursor-not-allowed opacity-75 hover:opacity-90'
                    : 'hover:scale-105 hover:border-opacity-100'
                }`}
                style={{
                  backgroundColor: block.color,
                  borderColor: `${block.color}cc`,
                  boxShadow: `0 4px 8px ${block.color}40`,
                }}
                disabled={block.isDistractor}
                title={block.isDistractor ? "Distractor (not clickable)" : undefined}
              >
                {block.isDistractor ? (
                  <img
                    src={block.distractorImage}
                    alt="distractor"
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    onError={(e) => {
                      if (process.env.NODE_ENV === 'development') {
                        console.warn('Failed to load distractor image:', block.distractorImage);
                      }
                      // Replace with emoji fallback instead of hiding
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const parent = img.parentElement;
                      if (parent) {
                        parent.innerHTML = '<span class="text-lg">🎯</span>';
                      }
                    }}
                    onLoad={() => {
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Successfully loaded distractor:', block.distractorImage);
                      }
                    }}
                  />
                ) : (
                  <span className="truncate text-xs sm:text-sm">{block.text}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Submit button */}
        {gameState.currentSentence.userOrder.length > 0 && !showFeedback && (
          <div className="flex justify-center">
            <button
              onClick={handleSubmitAttempt}
              disabled={showFeedback}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {strings.games.sentenceScramble?.submitAnswer || 'Submit Answer'}
            </button>
          </div>
        )}

        {/* Result feedback */}
        {showFeedback && gameState.currentSentence && (
          <div className={`text-center p-4 rounded-lg transition-all duration-300 ${
            gameState.currentSentence.isCorrect
              ? 'bg-green-500/10 text-green-600 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            <p className="text-lg font-semibold">
              {gameState.currentSentence.isCorrect ? '🎉 Correct!' : '❌ Incorrect'}
            </p>
            <p className="text-sm mt-1">
              Original: {gameState.currentSentence.originalSentence.text}
            </p>
            {!gameState.currentSentence.isCorrect && gameState.currentSentence.attempts < GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE && (
              <p className="text-xs mt-2 opacity-75">
                {strings.games.sentenceScramble?.attemptsRemaining || 'Attempts remaining'}: {GAME_CONSTANTS.MAX_ATTEMPTS_PER_SENTENCE - gameState.currentSentence.attempts}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderGameOver() {
    const accuracy = gameState.sentences.length > 0 ? (gameState.totalScore / gameState.sentences.length) * 100 : 0;
    const totalTime = Math.round((Date.now() - gameState.gameStartTime) / 1000);

    return (
      <div className="space-y-6 text-center">
        <div>
          <h3 className="text-2xl font-bold mb-2">{strings.games.sentenceScramble?.gameComplete || 'Game Complete!'}</h3>
          <p className="text-muted-foreground">{strings.games.sentenceScramble?.greatJob || 'Great job!'}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{gameState.totalScore}</p>
            <p className="text-sm text-muted-foreground">{strings.games.sentenceScramble?.correct || 'Correct'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{gameState.sentences.length}</p>
            <p className="text-sm text-muted-foreground">{strings.games.sentenceScramble?.totalSentences || 'Total Sentences'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{Math.round(accuracy)}%</p>
            <p className="text-sm text-muted-foreground">{strings.games.sentenceScramble?.accuracy || 'Accuracy'}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-2xl font-bold text-primary">{totalTime}s</p>
            <p className="text-sm text-muted-foreground">{strings.games.sentenceScramble?.time || 'Time'}</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={resetGame}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            {strings.games.sentenceScramble?.playAgain || 'Play Again'}
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {strings.common?.close || 'Close'}
          </button>
        </div>
      </div>
    );
  }
}
