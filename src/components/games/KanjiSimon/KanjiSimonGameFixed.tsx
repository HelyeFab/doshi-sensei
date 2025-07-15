'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
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

// Game phases
type GamePhase = 
  | 'waiting'    // Waiting for user to start
  | 'countdown'  // 3-2-1 countdown
  | 'showing'    // Showing the sequence
  | 'playing'    // Player's turn
  | 'success'    // Round complete
  | 'gameover';  // Game over

// Game state
interface GameState {
  phase: GamePhase;
  segments: Segment[];
  sequence: string[];
  playerIndex: number;
  score: number;
  round: number;
  countdown: number;
  showingIndex: number;
  highlightedSegment: string | null;
}

// Actions
type GameAction =
  | { type: 'INIT_SEGMENTS'; segments: Segment[] }
  | { type: 'START_GAME' }
  | { type: 'UPDATE_COUNTDOWN'; value: number }
  | { type: 'START_SHOWING' }
  | { type: 'HIGHLIGHT'; segment: string | null }
  | { type: 'NEXT_SHOW' }
  | { type: 'START_PLAYING' }
  | { type: 'PLAYER_CLICK'; segment: string }
  | { type: 'ROUND_SUCCESS' }
  | { type: 'NEXT_ROUND' }
  | { type: 'GAME_OVER' };

// Reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'INIT_SEGMENTS':
      return { ...state, segments: action.segments };
      
    case 'START_GAME': {
      // Generate first sequence item
      const validSegments = state.segments.filter(s => s.id !== 'distractor');
      if (validSegments.length === 0) return state;
      
      const firstItem = validSegments[Math.floor(Math.random() * validSegments.length)].value;
      return { 
        ...state, 
        phase: 'countdown',
        countdown: 3,
        sequence: [firstItem],
        playerIndex: 0,
        showingIndex: 0
      };
    }
      
    case 'UPDATE_COUNTDOWN':
      return { ...state, countdown: action.value };
      
    case 'START_SHOWING':
      return { ...state, phase: 'showing', showingIndex: 0, highlightedSegment: null };
      
    case 'HIGHLIGHT':
      return { ...state, highlightedSegment: action.segment };
      
    case 'NEXT_SHOW':
      return { ...state, showingIndex: state.showingIndex + 1 };
      
    case 'START_PLAYING':
      return { ...state, phase: 'playing', playerIndex: 0, highlightedSegment: null };
      
    case 'PLAYER_CLICK': {
      // Check if correct
      const expectedSegment = state.sequence[state.playerIndex];
      const isCorrect = action.segment === expectedSegment && action.segment !== 'distractor';
      
      if (!isCorrect) {
        return { ...state, phase: 'gameover', highlightedSegment: 'wrong' };
      }
      
      const nextIndex = state.playerIndex + 1;
      
      // Check if sequence complete
      if (nextIndex >= state.sequence.length) {
        return { 
          ...state, 
          phase: 'success',
          score: state.score + (state.sequence.length * 100),
          highlightedSegment: 'success'
        };
      }
      
      return { ...state, playerIndex: nextIndex };
    }
      
    case 'ROUND_SUCCESS':
      return { ...state, phase: 'success' };
      
    case 'NEXT_ROUND': {
      // Add new item to sequence
      const validSegments = state.segments.filter(s => s.id !== 'distractor');
      if (validSegments.length === 0) return state;
      
      const newItem = validSegments[Math.floor(Math.random() * validSegments.length)].value;
      return {
        ...state,
        phase: 'countdown',
        countdown: 3,
        round: state.round + 1,
        sequence: [...state.sequence, newItem],
        playerIndex: 0,
        showingIndex: 0,
        highlightedSegment: null
      };
    }
      
    case 'GAME_OVER':
      return { ...state, phase: 'gameover' };
      
    default:
      return state;
  }
}

// Initial state
const initialState: GameState = {
  phase: 'waiting',
  segments: [],
  sequence: [],
  playerIndex: 0,
  score: 0,
  round: 1,
  countdown: 3,
  showingIndex: 0,
  highlightedSegment: null
};

export default function KanjiSimonGame({ kanji, onRoundComplete, onGameOver }: KanjiSimonGameProps) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { speakGameText, stop: stopTTS } = useGameTTS();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  
  // Store callbacks in refs to avoid re-renders
  const onRoundCompleteRef = useRef(onRoundComplete);
  const onGameOverRef = useRef(onGameOver);
  
  useEffect(() => {
    onRoundCompleteRef.current = onRoundComplete;
    onGameOverRef.current = onGameOver;
  }, [onRoundComplete, onGameOver]);
  
  // Clear timeout helper
  const clearGameTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  
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
    
    return validDistractors[Math.floor(Math.random() * validDistractors.length)] || distractors[0];
  };

  // Initialize segments
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

    dispatch({ type: 'INIT_SEGMENTS', segments: shuffledSegments });
  }, [kanji]);

  // Track current phase and index to prevent duplicate processing
  const lastPhaseRef = useRef<GamePhase>('waiting');
  const lastProcessedIndexRef = useRef(-1);
  
  // Reset tracking when phase changes
  useEffect(() => {
    if (state.phase !== lastPhaseRef.current) {
      lastPhaseRef.current = state.phase;
      if (state.phase === 'showing') {
        lastProcessedIndexRef.current = -1;
      }
    }
  }, [state.phase]);
  
  // Game phase handler
  useEffect(() => {
    clearGameTimeout();
    
    switch (state.phase) {
      case 'countdown':
        if (state.countdown > 0) {
          timeoutRef.current = setTimeout(() => {
            if (state.countdown === 1) {
              dispatch({ type: 'START_SHOWING' });
            } else {
              dispatch({ type: 'UPDATE_COUNTDOWN', value: state.countdown - 1 });
            }
          }, 1000);
        }
        break;
        
      case 'showing':
        if (state.segments.length === 0) {
          // Wait for segments to be initialized
          return;
        }
        
        if (state.showingIndex < state.sequence.length) {
          // Check if we've already processed this index
          if (lastProcessedIndexRef.current >= state.showingIndex) {
            return;
          }
          
          // Mark this index as processed
          lastProcessedIndexRef.current = state.showingIndex;
          
          const segmentValue = state.sequence[state.showingIndex];
          const segment = state.segments.find(s => s.value === segmentValue);
          
          if (!segment) {
            console.error('Segment not found:', segmentValue);
            dispatch({ type: 'START_PLAYING' });
            return;
          }
          
          // Highlight segment
          dispatch({ type: 'HIGHLIGHT', segment: segmentValue });
          
          // Play TTS
          if (segment.ttsText) {
            speakGameText(segment.ttsText, 'kanji-simon', { 
              voice: 'female', 
              speed: 1.0,
              provider: 'google'
            }).catch(console.error);
          }
          
          // Schedule unhighlight and next
          timeoutRef.current = setTimeout(() => {
            dispatch({ type: 'HIGHLIGHT', segment: null });
            
            timeoutRef.current = setTimeout(() => {
              dispatch({ type: 'NEXT_SHOW' });
            }, 300);
          }, 800);
        } else {
          // Sequence complete, start player turn
          dispatch({ type: 'START_PLAYING' });
        }
        break;
        
      case 'success':
        onRoundCompleteRef.current(state.sequence.length * 100);
        timeoutRef.current = setTimeout(() => {
          lastProcessedIndexRef.current = -1; // Reset for next round
          dispatch({ type: 'NEXT_ROUND' });
        }, 1500);
        break;
        
      case 'gameover':
        timeoutRef.current = setTimeout(() => {
          onGameOverRef.current(state.score);
        }, 1000);
        break;
    }
    
    return () => {
      clearGameTimeout();
    };
  }, [state.phase, state.countdown, state.showingIndex, state.sequence.length, state.segments.length, clearGameTimeout, speakGameText]);

  // Handle segment click
  const handleSegmentClick = (segmentValue: string) => {
    if (state.phase !== 'playing') return;
    
    const segment = state.segments.find(s => s.value === segmentValue);
    
    // Highlight briefly
    dispatch({ type: 'HIGHLIGHT', segment: segmentValue });
    setTimeout(() => {
      dispatch({ type: 'HIGHLIGHT', segment: null });
    }, 300);
    
    // Play TTS
    if (segment?.ttsText) {
      speakGameText(segment.ttsText, 'kanji-simon', { 
        voice: 'female', 
        speed: 1.0,
        provider: 'google'
      }).catch(console.error);
    }
    
    // Process click
    dispatch({ type: 'PLAYER_CLICK', segment: segmentValue });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      clearGameTimeout();
      stopTTS();
    };
  }, [clearGameTimeout, stopTTS]);

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
      {state.phase === 'waiting' && (
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
          <circle cx="0" cy="0" r="60" className="fill-background" />
          
          {/* Segments */}
          {state.segments.map((segment) => {
            const isHighlighted = state.highlightedSegment === segment.value;
            const isWrong = state.highlightedSegment === 'wrong';
            const isSuccess = state.highlightedSegment === 'success';
            
            return (
              <motion.g key={segment.id}>
                <motion.path
                  d={getSegmentPath(segment.position)}
                  fill={segment.color}
                  stroke="rgba(0, 0, 0, 0.2)"
                  strokeWidth="3"
                  className="cursor-pointer"
                  animate={{
                    fill: isHighlighted ? segment.hoverColor 
                        : isWrong ? 'rgb(239, 68, 68)'
                        : isSuccess ? 'rgb(34, 197, 94)'
                        : segment.color,
                    scale: isHighlighted || isWrong || isSuccess ? 1.05 : 1,
                    filter: isHighlighted ? 'brightness(1.1) drop-shadow(0 0 10px rgba(0,0,0,0.3))' 
                          : 'brightness(1)',
                    opacity: state.phase === 'playing' && segment.id === 'distractor' ? 0.5 : 1
                  }}
                  whileHover={state.phase === 'playing' ? { 
                    fill: segment.hoverColor,
                    filter: 'brightness(1.05)'
                  } : {}}
                  whileTap={state.phase === 'playing' ? { scale: 0.95 } : {}}
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
            );
          })}
          
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
              <p className="text-muted-foreground">Get ready!</p>
            </motion.div>
          )}
          
          {state.phase === 'showing' && (
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
                Watch the sequence!
              </p>
              <p className="text-sm text-muted-foreground">
                Item {state.showingIndex + 1} of {state.sequence.length}
              </p>
            </motion.div>
          )}
          
          {state.phase === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center"
            >
              <p className="text-xl font-bold text-primary mb-1">
                YOUR TURN!
              </p>
              <p className="text-sm text-muted-foreground">
                Repeat the pattern
              </p>
              <div className="flex justify-center gap-1 mt-2">
                {state.sequence.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < state.playerIndex 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
          
          {state.phase === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-2xl font-bold text-green-500">
                Well done!
              </p>
              <p className="text-sm text-muted-foreground">
                Get ready for the next round...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}