'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import FallingObject from './FallingObject';
import GameStats from './GameStats';
import {
  FallingObject as FallingObjectType,
  GameState,
  KanaChar,
  GAME_CONSTANTS,
  DISTRACTOR_IMAGES
} from './types';
import { getGameAudioManager } from './audioManager';

interface GameCanvasProps {
  gameState: GameState;
  onGameStateUpdate: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void;
  activeRomaji: string | null;
}

export default function GameCanvas({ gameState, onGameStateUpdate, activeRomaji }: GameCanvasProps) {
  const [showFeedback, setShowFeedback] = useState<{
    type: 'correct' | 'wrong' | 'distractor';
    x: number;
    y: number;
  } | null>(null);

  const gameLoopRef = useRef<number>();
  const lastSpawnRef = useRef<number>(Date.now());
  const audioManager = getGameAudioManager();
  const kanaSpawnCountRef = useRef<{ [key: string]: number }>({});
  const gameStateRef = useRef(gameState);
  const spawnObjectRef = useRef<() => void>();

  // Keep ref updated with current game state
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Reset spawn counts when game starts
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused) {
      kanaSpawnCountRef.current = {};
      lastSpawnRef.current = Date.now(); // Reset spawn timer
    }
  }, [gameState.isPlaying, gameState.isPaused]);

  // Calculate current fall duration based on game speed
  const getFallDuration = useCallback(() => {
    const speedReduction = 1 - (gameState.gameSpeed - 1);
    return GAME_CONSTANTS.INITIAL_FALL_DURATION * speedReduction;
  }, [gameState.gameSpeed]);

  // Spawn new falling object
  const spawnObject = useCallback(() => {
    const currentGameState = gameStateRef.current;
    console.log('[KanaDrop] Spawning object, selectedKana:', currentGameState.selectedKana.length);

    // Improved spawning logic with weighted distribution
    let newObject: FallingObjectType;

    // 40% chance for kana (increased from 30%)
    const isKana = Math.random() < 0.4;

    if (isKana && currentGameState.selectedKana.length > 0) {
      // Initialize spawn counts if needed
      currentGameState.selectedKana.forEach(kana => {
        if (!kanaSpawnCountRef.current[kana.romaji]) {
          kanaSpawnCountRef.current[kana.romaji] = 0;
        }
      });

      // Find the least spawned kana
      let selectedKana;

      // If there's an active romaji, 50% chance to spawn that specific one
      if (activeRomaji && Math.random() < 0.5) {
        selectedKana = currentGameState.selectedKana.find(k => k.romaji === activeRomaji);
      }

      // Otherwise, choose the least spawned kana
      if (!selectedKana) {
        const sortedKana = [...currentGameState.selectedKana].sort((a, b) =>
          (kanaSpawnCountRef.current[a.romaji] || 0) - (kanaSpawnCountRef.current[b.romaji] || 0)
        );
        selectedKana = sortedKana[0];
      }

      if (selectedKana) {
        kanaSpawnCountRef.current[selectedKana.romaji]++;

        newObject = {
          id: `kana-${Date.now()}-${Math.random()}`,
          type: 'kana',
          content: selectedKana.kana,
          kanaData: selectedKana,
          x: Math.random() * 60 + 20, // 20-80% to keep objects well within bounds
          y: 0,
          speed: currentGameState.gameSpeed
        };
      } else {
        // Fallback to random kana
        const randomKana = currentGameState.selectedKana[Math.floor(Math.random() * currentGameState.selectedKana.length)];
        newObject = {
          id: `kana-${Date.now()}-${Math.random()}`,
          type: 'kana',
          content: randomKana.kana,
          kanaData: randomKana,
          x: Math.random() * 60 + 20,
          y: 0,
          speed: currentGameState.gameSpeed
        };
      }
    } else {
      // Spawn a distractor
      const randomImage = DISTRACTOR_IMAGES[Math.floor(Math.random() * DISTRACTOR_IMAGES.length)];
      newObject = {
        id: `distractor-${Date.now()}-${Math.random()}`,
        type: 'distractor',
        content: randomImage,
        x: Math.random() * 60 + 20, // 20-80% to keep objects well within bounds
        y: 0,
        speed: currentGameState.gameSpeed
      };
    }

    console.log('[KanaDrop] Spawning object:', newObject);
    onGameStateUpdate(prev => ({
      ...prev,
      fallingObjects: [...prev.fallingObjects, newObject]
    }));
  }, [activeRomaji, onGameStateUpdate]);

  // Store spawnObject in ref to avoid dependency issues
  useEffect(() => {
    spawnObjectRef.current = spawnObject;
  }, [spawnObject]);

  // Handle object click
  const handleObjectClick = useCallback(async (object: FallingObjectType) => {
    const clickPosition = {
      x: object.x,
      y: 50 // Approximate middle of screen for feedback
    };

    if (object.type === 'distractor') {
      // Clicked distractor
      console.log('[KanaDrop] Distractor clicked!');
      setShowFeedback({ type: 'distractor', ...clickPosition });
      audioManager.playSound('thud').catch(() => {
        console.warn('[KanaDrop] Failed to play thud sound');
      });

      onGameStateUpdate(prev => {
        const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_DISTRACTOR);
        console.log('[KanaDrop] Updating score for distractor click:', {
          currentScore: prev.score,
          pointsToAdd: GAME_CONSTANTS.POINTS_DISTRACTOR,
          newScore: newScore
        });
        return {
          ...prev,
          score: newScore,
          clicks: {
            ...prev.clicks,
            distractor: prev.clicks.distractor + 1
          },
          fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
        };
      });
    } else if (object.type === 'kana' && object.kanaData) {
      if (activeRomaji === object.kanaData.romaji) {
        // Correct kana clicked
        console.log(`[KanaDrop] Correct kana clicked! ${object.kanaData.kana} (${object.kanaData.romaji})`);
        setShowFeedback({ type: 'correct', ...clickPosition });

        onGameStateUpdate(prev => {
          const newScore = prev.score + GAME_CONSTANTS.POINTS_CORRECT;
          console.log('[KanaDrop] Updating score for correct click:', {
            currentScore: prev.score,
            pointsToAdd: GAME_CONSTANTS.POINTS_CORRECT,
            newScore: newScore
          });
          return {
            ...prev,
            score: newScore,
            clicks: {
              ...prev.clicks,
              correct: prev.clicks.correct + 1
            },
            fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
          };
        });
      } else {
        // Wrong kana clicked
        console.log(`[KanaDrop] Wrong kana clicked! Expected: ${activeRomaji}, Got: ${object.kanaData.romaji}`);
        setShowFeedback({ type: 'wrong', ...clickPosition });
        audioManager.playSound('error').catch(() => {
          console.warn('[KanaDrop] Failed to play error sound');
        });

        onGameStateUpdate(prev => {
          const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_WRONG_KANA);
          console.log('[KanaDrop] Updating score for wrong kana click:', {
            currentScore: prev.score,
            pointsToAdd: GAME_CONSTANTS.POINTS_WRONG_KANA,
            newScore: newScore
          });
          return {
            ...prev,
            score: newScore,
            clicks: {
              ...prev.clicks,
              wrong: prev.clicks.wrong + 1
            },
            fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
          };
        });
      }
    }

    // Clear feedback after animation
    setTimeout(() => setShowFeedback(null), 800);
  }, [activeRomaji, onGameStateUpdate]);

  // Handle object reaching bottom
  const handleObjectReachBottom = useCallback((object: FallingObjectType) => {
    // Check if it was a target kana that was missed
    if (object.type === 'kana' && object.kanaData && activeRomaji === object.kanaData.romaji) {
      // Missed target kana - penalty
      onGameStateUpdate(prev => {
        const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_MISSED);
        console.log('[KanaDrop] Missed target kana penalty:', {
          currentScore: prev.score,
          pointsToAdd: GAME_CONSTANTS.POINTS_MISSED,
          newScore: newScore
        });
        return {
          ...prev,
          score: newScore,
          fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
        };
      });
    } else {
      // Just remove the object
      onGameStateUpdate(prev => ({
        ...prev,
        fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
      }));
    }
  }, [activeRomaji, onGameStateUpdate]);

  // Update game speed based on score
  useEffect(() => {
    const speedLevel = Math.floor(gameState.score / GAME_CONSTANTS.SPEED_INCREMENT_INTERVAL);
    const newSpeed = Math.min(
      1 + (speedLevel * GAME_CONSTANTS.SPEED_INCREMENT_RATE),
      4 // Max 4x speed
    );

    if (newSpeed !== gameState.gameSpeed) {
      console.log('[KanaDrop] Updating game speed:', {
        currentSpeed: gameState.gameSpeed,
        newSpeed: newSpeed,
        score: gameState.score,
        speedLevel: speedLevel
      });
      onGameStateUpdate(prev => ({
        ...prev,
        gameSpeed: newSpeed
      }));
    }
  }, [gameState.score, gameState.gameSpeed, onGameStateUpdate]);

  // Game loop with interval-based spawning
  useEffect(() => {
    console.log('[KanaDrop] Game loop effect triggered', { isPlaying: gameState.isPlaying, isPaused: gameState.isPaused });
    if (!gameState.isPlaying || gameState.isPaused) return;

    // Spawn objects on interval instead of every frame
    const spawnInterval = setInterval(() => {
      if (spawnObjectRef.current) {
        spawnObjectRef.current();
      }
    }, 750); // Spawn every 750ms on average

    return () => {
      clearInterval(spawnInterval);
    };
  }, [gameState.isPlaying, gameState.isPaused]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-background via-background/95 to-background/90">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)`,
        }} />
      </div>

      {/* Game Stats */}
      <GameStats gameState={gameState} showFeedback={showFeedback} />

      {/* Falling Objects */}
      {console.log('[KanaDrop] Rendering falling objects:', gameState.fallingObjects.length)}
      <AnimatePresence>
        {gameState.fallingObjects.map((object) => (
          <FallingObject
            key={object.id}
            object={object}
            fallDuration={getFallDuration()}
            onReachBottom={handleObjectReachBottom}
            onClick={handleObjectClick}
            isClickable={
              object.type === 'distractor' ||
              (object.type === 'kana' && !!activeRomaji)
            }
            isPaused={gameState.isPaused}
          />
        ))}
      </AnimatePresence>

      {/* Active romaji indicator - moved to top center */}
      {activeRomaji && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary/20 px-4 py-2 rounded-lg z-20"
        >
          <div className="text-sm text-primary font-semibold">
            Catching: {activeRomaji}
          </div>
        </motion.div>
      )}
    </div>
  );
}
