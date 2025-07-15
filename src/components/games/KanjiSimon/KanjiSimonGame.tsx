'use client';

import { useReducer, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KanjiItem } from '@/types/moodBoard';
import { useGameTTS } from '@/hooks/useTTS';

interface Segment {
  id: 'onyomi' | 'kunyomi' | 'meaning' | 'distractor';
  label: string;
  value: string;
  color: string;
  hoverColor: string;
  position: number;
  ttsText?: string;
}

interface KanjiSimonGameProps {
  kanji: KanjiItem;
  onRoundComplete: (score: number) => void;
  onGameOver: (finalScore: number) => void;
}

// Game phases for clear state management
type GamePhase = 
  | 'setup'
  | 'ready'
  | 'countdown'
  | 'playingSequence'
  | 'playerTurn'
  | 'roundComplete'
  | 'gameOver';

// Centralized state
interface GameState {
  phase: GamePhase;
  segments: Segment[];
  sequence: string[];
  playerSequence: string[];
  currentHighlight: string | null;
  score: number;
  round: number;
  countdown: number;
  sequenceIndex: number;
}

// Action types
type GameAction =
  | { type: 'INITIALIZE_SEGMENTS'; segments: Segment[] }
  | { type: 'START_GAME' }
  | { type: 'SET_COUNTDOWN'; countdown: number }
  | { type: 'START_SEQUENCE' }
  | { type: 'HIGHLIGHT_SEGMENT'; segment: string | null }
  | { type: 'NEXT_IN_SEQUENCE' }
  | { type: 'END_SEQUENCE' }
  | { type: 'PLAYER_CLICK'; segment: string }
  | { type: 'WRONG_ANSWER' }
  | { type: 'ROUND_SUCCESS' }
  | { type: 'ADD_TO_SEQUENCE' }
  | { type: 'RESET_PLAYER_SEQUENCE' };

// Reducer function
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INITIALIZE_SEGMENTS':
      return { ...state, segments: action.segments };
      
    case 'START_GAME':
      return { ...state, phase: 'ready' };
      
    case 'SET_COUNTDOWN':
      return { 
        ...state, 
        phase: 'countdown',
        countdown: action.countdown 
      };
      
    case 'START_SEQUENCE':
      return { 
        ...state, 
        phase: 'playingSequence',
        sequenceIndex: 0,
        playerSequence: []
      };
      
    case 'HIGHLIGHT_SEGMENT':
      return { ...state, currentHighlight: action.segment };
      
    case 'NEXT_IN_SEQUENCE':
      return { ...state, sequenceIndex: state.sequenceIndex + 1 };
      
    case 'END_SEQUENCE':
      return { 
        ...state, 
        phase: 'playerTurn',
        currentHighlight: null 
      };
      
    case 'PLAYER_CLICK': {
      const newPlayerSequence = [...state.playerSequence, action.segment];
      const isCorrect = state.sequence[state.playerSequence.length] === action.segment;
      const isComplete = isCorrect && newPlayerSequence.length === state.sequence.length;
      
      if (!isCorrect || action.segment === 'distractor') {
        return { ...state, phase: 'gameOver', currentHighlight: 'wrong' };
      }
      
      if (isComplete) {
        const roundScore = state.sequence.length * 100;
        return {
          ...state,
          phase: 'roundComplete',
          score: state.score + roundScore,
          playerSequence: newPlayerSequence,
          currentHighlight: 'success'
        };
      }
      
      return { ...state, playerSequence: newPlayerSequence };
    }
      
    case 'WRONG_ANSWER':
      return { ...state, phase: 'gameOver', currentHighlight: 'wrong' };
      
    case 'ROUND_SUCCESS':
      return {
        ...state,
        phase: 'ready',
        round: state.round + 1,
        playerSequence: [],
        currentHighlight: null
      };
      
    case 'ADD_TO_SEQUENCE': {
      const validSegments = state.segments.filter(s => s.id !== 'distractor');
      if (validSegments.length === 0) {
        console.warn('No valid segments available for sequence generation');
        return state;
      }
      
      const newItem = validSegments[Math.floor(Math.random() * validSegments.length)].value;
      return { 
        ...state, 
        sequence: [...state.sequence, newItem]
      };
    }
      
    case 'RESET_PLAYER_SEQUENCE':
      return { ...state, playerSequence: [] };
      
    default:
      return state;
  }
}

// Initial state
const initialState: GameState = {
  phase: 'setup',
  segments: [],
  sequence: [],
  playerSequence: [],
  currentHighlight: null,
  score: 0,
  round: 1,
  countdown: 3,
  sequenceIndex: 0
};

export default function KanjiSimonGame({ kanji, onRoundComplete, onGameOver }: KanjiSimonGameProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { speakGameText, stop: stopTTS } = useGameTTS();
  
  // Refs for timers and async operations
  const isMountedRef = useRef(true);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  
  // Store callbacks in refs to avoid re-renders
  const onRoundCompleteRef = useRef(onRoundComplete);
  const onGameOverRef = useRef(onGameOver);
  
  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
    onGameOverRef.current = onGameOver;
  }, [onRoundComplete, onGameOver]);
  
  // Helper to clear all timers
  const clearAllTimers = () => {
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current = [];
  };
  
  // Helper to add timer
  const addTimer = (timer: NodeJS.Timeout) => {
    timersRef.current.push(timer);
  };

  // Generate random distractor
  const getRandomDistractor = () => {
    const distractors = [
      { label: 'ケン', value: 'ken' },
      { label: 'ソウ', value: 'sou' },
      { label: 'カン', value: 'kan' },
      { label: 'チョウ', value: 'chou' },
      { label: 'たつ', value: 'tatsu' },
      { label: 'みる', value: 'miru' },
      { label: 'いく', value: 'iku' },
      { label: 'する', value: 'suru' },
    ];
    
    const validDistractors = distractors.filter(d => 
      !kanji.readings.on?.includes(d.label) && 
      !kanji.readings.kun?.includes(d.label)
    );
    
    return validDistractors[Math.floor(Math.random() * validDistractors.length)];
  };

  // Initialize segments when kanji changes
  useEffect(() => {
    const distractor = getRandomDistractor();
    
    const baseSegments: Segment[] = [
      {
        id: 'onyomi',
        label: kanji.readings.on?.[0] || 'オン',
        value: 'onyomi',
        color: 'rgb(191, 219, 254)',
        hoverColor: 'rgb(59, 130, 246)',
        position: 0,
        ttsText: kanji.readings.on?.[0] || 'オン'
      },
      {
        id: 'kunyomi', 
        label: kanji.readings.kun?.[0] || 'くん',
        value: 'kunyomi',
        color: 'rgb(254, 202, 202)',
        hoverColor: 'rgb(239, 68, 68)',
        position: 1,
        ttsText: kanji.readings.kun?.[0] || 'くん'
      },
      {
        id: 'meaning',
        label: kanji.readings.kun?.[0] || kanji.readings.on?.[0] || 'いみ',
        value: 'meaning',
        color: 'rgb(167, 243, 208)',
        hoverColor: 'rgb(34, 197, 94)',
        position: 2,
        ttsText: kanji.readings.kun?.[0] || kanji.readings.on?.[0] || 'いみ'
      },
      {
        id: 'distractor',
        label: distractor.label,
        value: 'distractor',
        color: 'rgb(254, 240, 138)',
        hoverColor: 'rgb(250, 204, 21)',
        position: 3,
        ttsText: distractor.label
      }
    ];

    // Shuffle positions
    const positions = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const shuffledSegments = baseSegments.map((seg, idx) => ({
      ...seg,
      position: positions[idx]
    }));

    dispatch({ type: 'INITIALIZE_SEGMENTS', segments: shuffledSegments });
  }, [kanji]);

  // Play next item in sequence
  const playNextInSequence = async () => {
    if (!isMountedRef.current || state.phase !== 'playingSequence') return;
    
    if (state.sequenceIndex < state.sequence.length) {
      const currentItem = state.sequence[state.sequenceIndex];
      const segment = state.segments.find(s => s.value === currentItem);
      
      if (!segment) {
        console.error('Segment not found for:', currentItem);
        dispatch({ type: 'END_SEQUENCE' });
        return;
      }
      
      // Highlight segment
      dispatch({ type: 'HIGHLIGHT_SEGMENT', segment: currentItem });
      
      // Play TTS
      if (segment.ttsText) {
        try {
          await speakGameText(segment.ttsText, 'kanji-simon', { 
            voice: 'female', 
            speed: 1.0,
            provider: 'google'
          });
        } catch (error) {
          console.error('TTS error:', error);
        }
      }
      
      // Wait then unhighlight and move to next
      const timer1 = setTimeout(() => {
        if (isMountedRef.current && state.phase === 'playingSequence') {
          dispatch({ type: 'HIGHLIGHT_SEGMENT', segment: null });
          
          const timer2 = setTimeout(() => {
            if (isMountedRef.current && state.phase === 'playingSequence') {
              dispatch({ type: 'NEXT_IN_SEQUENCE' });
            }
          }, 300);
          addTimer(timer2);
        }
      }, 800);
      addTimer(timer1);
    } else {
      // Sequence complete, start player turn
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          dispatch({ type: 'END_SEQUENCE' });
        }
      }, 500);
      addTimer(timer);
    }
  };

  // Main game flow controller
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    clearAllTimers();
    
    switch (state.phase) {
      case 'ready':
        // Add new item to sequence then start
        if (state.segments.length === 0) {
          // Wait for segments to be initialized
          return;
        }
        if (state.sequence.length < state.round) {
          dispatch({ type: 'ADD_TO_SEQUENCE' });
        } else {
          const timer = setTimeout(() => {
            if (isMountedRef.current) {
              dispatch({ type: 'SET_COUNTDOWN', countdown: 3 });
            }
          }, 700);
          addTimer(timer);
        }
        break;
        
      case 'countdown':
        if (state.countdown > 1) {
          const timer = setTimeout(() => {
            if (isMountedRef.current) {
              dispatch({ type: 'SET_COUNTDOWN', countdown: state.countdown - 1 });
            }
          }, 1000);
          addTimer(timer);
        } else {
          const timer = setTimeout(() => {
            if (isMountedRef.current) {
              dispatch({ type: 'START_SEQUENCE' });
            }
          }, 1000);
          addTimer(timer);
        }
        break;
        
      case 'playingSequence':
        // Use setTimeout to avoid direct call in effect
        const playTimer = setTimeout(() => {
          playNextInSequence();
        }, 100);
        addTimer(playTimer);
        break;
        
      case 'roundComplete':
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            onRoundCompleteRef.current(state.sequence.length * 100);
            dispatch({ type: 'ROUND_SUCCESS' });
          }
        }, 1500);
        addTimer(timer);
        break;
        
      case 'gameOver':
        const gameOverTimer = setTimeout(() => {
          if (isMountedRef.current) {
            onGameOverRef.current(state.score);
          }
        }, 1000);
        addTimer(gameOverTimer);
        break;
    }
    
    return () => clearAllTimers();
  }, [state.phase, state.countdown, state.sequence.length, state.round, state.sequenceIndex, state.segments.length]);

  // Handle player input
  const handleSegmentClick = (segmentValue: string) => {
    if (state.phase !== 'playerTurn') return;
    
    // Highlight clicked segment
    dispatch({ type: 'HIGHLIGHT_SEGMENT', segment: segmentValue });
    
    // Play TTS
    const segment = state.segments.find(s => s.value === segmentValue);
    if (segment?.ttsText) {
      speakGameText(segment.ttsText, 'kanji-simon', { 
        voice: 'female', 
        speed: 1.0,
        provider: 'google'
      }).catch(console.error);
    }
    
    // Unhighlight after delay
    const timer = setTimeout(() => {
      dispatch({ type: 'HIGHLIGHT_SEGMENT', segment: null });
    }, 300);
    addTimer(timer);
    
    // Process the click
    dispatch({ type: 'PLAYER_CLICK', segment: segmentValue });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      stopTTS();
      clearAllTimers();
    };
  }, [stopTTS]);

  // Calculate segment path
  const getSegmentPath = (position: number) => {
    const angleStart = position * 90 - 45;
    const angleEnd = angleStart + 90;
    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (angleEnd * Math.PI) / 180;
    
    const innerRadius = 80;
    const outerRadius = 180;
    
    const x1 = Math.cos(startRad) * innerRadius;
    const y1 = Math.sin(startRad) * innerRadius;
    const x2 = Math.cos(startRad) * outerRadius;
    const y2 = Math.sin(startRad) * outerRadius;
    const x3 = Math.cos(endRad) * outerRadius;
    const y3 = Math.sin(endRad) * outerRadius;
    const x4 = Math.cos(endRad) * innerRadius;
    const y4 = Math.sin(endRad) * innerRadius;
    
    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Score and Round */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">Round {state.round}</p>
        <p className="text-2xl font-bold">Score: {state.score}</p>
      </div>
      
      {/* Start button */}
      {state.phase === 'setup' && (
        <div className="text-center mb-6">
          <button
            onClick={() => dispatch({ type: 'START_GAME' })}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Game Board */}
      <div className="relative w-full aspect-square">
        <svg viewBox="-200 -200 400 400" className="w-full h-full">
          {/* Background circle */}
          <circle cx="0" cy="0" r="60" className="fill-background" />
          
          {/* Segments */}
          {state.segments.map((segment) => (
            <motion.g key={segment.id}>
              <motion.path
                d={getSegmentPath(segment.position)}
                fill={segment.color}
                stroke="rgba(0, 0, 0, 0.2)"
                strokeWidth="3"
                className="cursor-pointer"
                animate={{
                  fill: state.currentHighlight === segment.value ? segment.hoverColor 
                      : state.currentHighlight === 'wrong' ? 'rgb(239, 68, 68)'
                      : state.currentHighlight === 'success' ? 'rgb(34, 197, 94)'
                      : segment.color,
                  scale: state.currentHighlight === segment.value ? 1.05 : 1,
                  filter: state.currentHighlight === segment.value ? 'brightness(1.1) drop-shadow(0 0 10px rgba(0,0,0,0.3))' 
                        : 'brightness(1)',
                  opacity: (state.phase === 'playerTurn' && segment.id === 'distractor') ? 0.5 : 1
                }}
                whileHover={state.phase === 'playerTurn' ? { 
                  fill: segment.hoverColor,
                  filter: 'brightness(1.05)'
                } : {}}
                whileTap={state.phase === 'playerTurn' ? { scale: 0.95 } : {}}
                onClick={() => handleSegmentClick(segment.value)}
                transition={{ duration: 0.2 }}
              />
              
              {/* Label */}
              <text
                x={Math.cos(((segment.position * 90) * Math.PI) / 180) * 130}
                y={Math.sin(((segment.position * 90) * Math.PI) / 180) * 130}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-black text-base font-extrabold pointer-events-none select-none"
              >
                {segment.label}
              </text>
              
              {/* Type label */}
              <text
                x={Math.cos(((segment.position * 90) * Math.PI) / 180) * 130}
                y={Math.sin(((segment.position * 90) * Math.PI) / 180) * 130 + 20}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-black text-sm font-bold pointer-events-none select-none"
              >
                {segment.id.toUpperCase()}
              </text>
            </motion.g>
          ))}
          
          {/* Center kanji */}
          <g>
            <text
              x="0"
              y="-15"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-6xl font-bold select-none"
            >
              {kanji.char}
            </text>
            <text
              x="0"
              y="25"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-sm font-medium select-none"
            >
              {kanji.meaning || 'N/A'}
            </text>
          </g>
        </svg>
      </div>

      {/* Status indicator */}
      <div className="text-center mt-6 h-20">
        <AnimatePresence mode="wait">
          {state.phase === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{state.countdown}</div>
              <p className="text-muted-foreground">Get ready to watch!</p>
            </motion.div>
          )}
          
          {state.phase === 'playingSequence' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Watch carefully!
              </p>
              <p className="text-sm text-muted-foreground">
                Item {state.sequenceIndex + 1} of {state.sequence.length}
              </p>
            </motion.div>
          )}
          
          {state.phase === 'playerTurn' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <p className="text-xl font-bold text-primary mb-1">
                🎯 YOUR TURN!
              </p>
              <p className="text-sm text-muted-foreground">
                Click {state.sequence.length - state.playerSequence.length} more
              </p>
              <div className="flex justify-center gap-1 mt-2">
                {state.sequence.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < state.playerSequence.length 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}