'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameCanvas from './GameCanvas';
import RomajiControls from './RomajiControls';
import VictoryScreen from './VictoryScreen';
import { GameState, GameStats as GameStatsType, KanaChar, GAME_CONSTANTS } from './types';
import { getGameAudioManager } from './audioManager';

interface KanaDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedKana: KanaChar[];
}

export default function KanaDropModal({ isOpen, onClose, selectedKana }: KanaDropModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    selectedKana,
    activeRomaji: null,
    fallingObjects: [],
    gameSpeed: 1,
    isPlaying: false,
    isPaused: false,
    startTime: 0,
    clicks: {
      correct: 0,
      wrong: 0,
      distractor: 0
    }
  });
  const [showVictory, setShowVictory] = useState(false);
  const [gameStats, setGameStats] = useState<GameStatsType | null>(null);
  const audioManager = getGameAudioManager();

  // Start countdown when modal opens
  useEffect(() => {
    console.log('[KanaDrop] Modal state:', { isOpen, isPlaying: gameState.isPlaying, showVictory });
    if (isOpen && !gameState.isPlaying && !showVictory) {
      console.log('[KanaDrop] Starting countdown...');
      setCountdown(GAME_CONSTANTS.COUNTDOWN_DURATION);
    }
  }, [isOpen, gameState.isPlaying, showVictory]);
  
  // Update audio manager mute state
  useEffect(() => {
    audioManager.setEnabled(!isMuted);
  }, [isMuted, audioManager]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1) {
        // Start game
        setCountdown(null);
        setGameState(prev => ({
          ...prev,
          isPlaying: true,
          startTime: Date.now()
        }));
        // Play start sound
        getGameAudioManager().playSound('start').catch(() => {
          console.warn('[KanaDrop] Failed to play start sound');
        });
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  // Check for victory
  useEffect(() => {
    if (gameState.score >= GAME_CONSTANTS.WINNING_SCORE && gameState.isPlaying) {
      // Victory!
      const endTime = Date.now();
      const timeTaken = Math.round((endTime - gameState.startTime) / 1000);
      const totalClicks = gameState.clicks.correct + gameState.clicks.wrong + gameState.clicks.distractor;
      const accuracy = totalClicks > 0 
        ? Math.round((gameState.clicks.correct / totalClicks) * 100)
        : 0;

      setGameStats({
        finalScore: gameState.score,
        timeTaken,
        accuracy,
        totalClicks,
        correctClicks: gameState.clicks.correct
      });

      setGameState(prev => ({
        ...prev,
        isPlaying: false,
        fallingObjects: []
      }));

      setShowVictory(true);
      // Play victory sound
      getGameAudioManager().playSound('victory').catch(() => {
        console.warn('[KanaDrop] Failed to play victory sound');
      });
    }
  }, [gameState.score, gameState.isPlaying, gameState.startTime, gameState.clicks]);

  // Handle romaji button click
  const handleRomajiClick = useCallback((romaji: string) => {
    setGameState(prev => ({
      ...prev,
      activeRomaji: prev.activeRomaji === romaji ? null : romaji
    }));
  }, []);

  // Update game state
  const handleGameStateUpdate = useCallback((updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => {
    if (typeof updates === 'function') {
      setGameState(updates);
    } else {
      setGameState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Play again
  const handlePlayAgain = () => {
    setShowVictory(false);
    setGameStats(null);
    setGameState({
      score: 0,
      selectedKana,
      activeRomaji: null,
      fallingObjects: [],
      gameSpeed: 1,
      isPlaying: false,
      isPaused: false,
      startTime: 0,
      clicks: {
        correct: 0,
        wrong: 0,
        distractor: 0
      }
    });
    setCountdown(GAME_CONSTANTS.COUNTDOWN_DURATION);
  };

  // Select new kana
  const handleSelectNewKana = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !gameState.isPlaying) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full h-full md:w-[800px] md:h-[600px] bg-background rounded-lg shadow-2xl overflow-hidden"
        >
          {/* Game controls - Close/Pause and Mute buttons */}
          {!showVictory && (
            <div className="absolute top-4 right-4 z-30 flex gap-2">
              {/* Mute button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-background/80 hover:bg-background border border-border transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  // Muted icon
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  // Sound on icon
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              
              {/* Close/Pause button */}
              <button
                onClick={() => {
                  if (gameState.isPlaying) {
                    // Pause the game
                    handleGameStateUpdate({ isPaused: true, isPlaying: false });
                  } else {
                    // Close the modal
                    onClose();
                  }
                }}
                className="p-2 rounded-lg bg-background/80 hover:bg-background border border-border transition-colors"
                title={gameState.isPlaying ? "Pause Game" : "Close"}
              >
              {gameState.isPlaying ? (
                // Pause icon
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                // Close icon
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              </button>
            </div>
          )}

          {/* Countdown */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-background/90">
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                {countdown > 0 ? (
                  <>
                    <div className="text-8xl font-bold text-primary mb-4">
                      {countdown}
                    </div>
                    <div className="text-2xl text-muted-foreground">
                      Get Ready!
                    </div>
                  </>
                ) : (
                  <div className="text-6xl font-bold text-green-600">
                    GO!
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Victory Screen */}
          {showVictory && gameStats && (
            <VictoryScreen
              stats={gameStats}
              onPlayAgain={handlePlayAgain}
              onSelectNewKana={handleSelectNewKana}
            />
          )}

          {/* Game Canvas */}
          {!showVictory && (
            <>
              <GameCanvas
                gameState={gameState}
                onGameStateUpdate={handleGameStateUpdate}
                activeRomaji={gameState.activeRomaji}
              />
              
              {/* Romaji Controls */}
              <RomajiControls
                selectedKana={selectedKana}
                activeRomaji={gameState.activeRomaji}
                onRomajiClick={handleRomajiClick}
                disabled={!gameState.isPlaying || countdown !== null}
              />
            </>
          )}

          {/* Start/Pause Screen */}
          {!gameState.isPlaying && !countdown && !showVictory && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 z-30">
              <div className="text-center p-8">
                <h2 className="text-4xl font-bold text-foreground mb-4">
                  {gameState.isPaused ? 'Game Paused' : 'Kana Drop'}
                </h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {gameState.isPaused 
                    ? 'Click Resume to continue playing or Close to exit the game.'
                    : 'Click the romaji buttons below to catch falling kana characters. Avoid clicking distractors and wrong kana!'}
                </p>
                
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">Selected Kana:</h3>
                  <div className="flex justify-center gap-3 flex-wrap">
                    {selectedKana.map((kana) => (
                      <div key={kana.id} className="bg-card rounded-lg p-3 border border-border">
                        <div className="text-2xl japanese-text">{kana.kana}</div>
                        <div className="text-sm text-muted-foreground">{kana.romaji}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-600 font-semibold">+5</span>
                    <span>Correct kana</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-red-600 font-semibold">-10</span>
                    <span>Missed target / Wrong kana</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-orange-600 font-semibold">-5</span>
                    <span>Distractor click</span>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (gameState.isPaused) {
                        // Resume the game
                        setGameState(prev => ({
                          ...prev,
                          isPlaying: true,
                          isPaused: false
                        }));
                      } else {
                        // Start new game
                        setCountdown(GAME_CONSTANTS.COUNTDOWN_DURATION);
                      }
                    }}
                    className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-xl hover:bg-primary/90 transition-colors"
                  >
                    {gameState.isPaused ? 'Resume Game' : 'Start Game'}
                  </motion.button>
                  
                  {gameState.isPaused && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="px-8 py-4 bg-destructive text-destructive-foreground rounded-lg font-semibold text-xl hover:bg-destructive/90 transition-colors"
                    >
                      End Game
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}