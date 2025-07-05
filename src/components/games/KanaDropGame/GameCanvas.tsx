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
import { kanaData, getBasicKana } from '@/data/kanaData';

interface GameCanvasProps {
  gameState: GameState;
  onGameStateUpdate: (updates: Partial<GameState> | ((prev: GameState) => Partial<GameState>)) => void;
}

export default function GameCanvas({ gameState, onGameStateUpdate }: GameCanvasProps) {
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
    let newObject: FallingObjectType;

    // 40% target kana, 30% wrong kana, 30% distractor
    const rand = Math.random();
    if (rand < 0.4 && currentGameState.selectedKana.length > 0) {
      // Target kana
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
    } else if (rand < 0.7) {
      // Wrong kana (not in selectedKana)
      const selectedIds = currentGameState.selectedKana.map(k => k.id);
      const wrongKanaList = getBasicKana().filter(k => !selectedIds.includes(k.id));
      console.log('[KanaDrop] Wrong kana pool size:', wrongKanaList.length);
      if (wrongKanaList.length > 0) {
        const randomWrongKana = wrongKanaList[Math.floor(Math.random() * wrongKanaList.length)];
        newObject = {
          id: `wrong-kana-${Date.now()}-${Math.random()}`,
          type: 'wrong-kana',
          content: randomWrongKana.hiragana,
          kanaData: randomWrongKana,
          x: Math.random() * 60 + 20,
          y: 0,
          speed: currentGameState.gameSpeed
        };
      } else {
        // fallback to distractor
        const randomImage = DISTRACTOR_IMAGES[Math.floor(Math.random() * DISTRACTOR_IMAGES.length)];
        newObject = {
          id: `distractor-${Date.now()}-${Math.random()}`,
          type: 'distractor',
          content: randomImage,
          x: Math.random() * 60 + 20,
          y: 0,
          speed: currentGameState.gameSpeed
        };
      }
    } else {
      // Distractor
      const randomImage = DISTRACTOR_IMAGES[Math.floor(Math.random() * DISTRACTOR_IMAGES.length)];
      newObject = {
        id: `distractor-${Date.now()}-${Math.random()}`,
        type: 'distractor',
        content: randomImage,
        x: Math.random() * 60 + 20,
        y: 0,
        speed: currentGameState.gameSpeed
      };
    }
    onGameStateUpdate(prev => ({
      ...prev,
      fallingObjects: [...prev.fallingObjects, newObject]
    }));
  }, [onGameStateUpdate]);

  // Store spawnObject in ref to avoid dependency issues
  useEffect(() => {
    spawnObjectRef.current = spawnObject;
  }, [spawnObject]);

  // Handle object click
  const handleObjectClick = useCallback(async (object: FallingObjectType) => {
    const clickPosition = {
      x: object.x,
      y: 50
    };
    if (object.type === 'distractor') {
      setShowFeedback({ type: 'distractor', ...clickPosition });
      audioManager.playSound('thud').catch(() => { });
      onGameStateUpdate(prev => {
        const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_DISTRACTOR);
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
      const isTargetKana = gameState.selectedKana.some(k => k.romaji === object.kanaData.romaji);
      if (isTargetKana) {
        setShowFeedback({ type: 'correct', ...clickPosition });
        onGameStateUpdate(prev => {
          const newScore = prev.score + GAME_CONSTANTS.POINTS_CORRECT;
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
        // Should not happen, but treat as wrong kana
        setShowFeedback({ type: 'wrong', ...clickPosition });
        audioManager.playSound('error').catch(() => { });
        onGameStateUpdate(prev => {
          const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_WRONG_KANA);
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
    } else if (object.type === 'wrong-kana' && object.kanaData) {
      // Wrong kana clicked
      setShowFeedback({ type: 'wrong', ...clickPosition });
      audioManager.playSound('error').catch(() => { });
      onGameStateUpdate(prev => {
        const newScore = Math.max(0, prev.score + GAME_CONSTANTS.POINTS_WRONG_KANA);
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
    setTimeout(() => setShowFeedback(null), 800);
  }, [gameState.selectedKana, onGameStateUpdate, audioManager]);

  // Handle object reaching bottom
  const handleObjectReachBottom = useCallback((object: FallingObjectType) => {
    // Remove the object without any penalty
    onGameStateUpdate(prev => ({
      ...prev,
      fallingObjects: prev.fallingObjects.filter(o => o.id !== object.id)
    }));
  }, [onGameStateUpdate]);

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
            isClickable={true}
            isPaused={gameState.isPaused}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
