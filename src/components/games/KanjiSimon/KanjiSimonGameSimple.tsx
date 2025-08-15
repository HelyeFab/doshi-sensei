'use client';

import { useState, useEffect, useRef } from 'react';
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

export default function KanjiSimonGame({ kanji, onRoundComplete, onGameOver }: KanjiSimonGameProps) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [phase, setPhase] = useState<'countdown' | 'showing' | 'playing' | 'success' | 'gameover'>('countdown');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSequence, setPlayerSequence] = useState<string[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [countdown, setCountdown] = useState(3);
  
  const { speakGameText, stop: stopTTS } = useGameTTS();
  const sequenceIndexRef = useRef(0);
  const sequenceRef = useRef<string[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  
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
    
    // Randomly select from available readings
    const onReadings = kanji.readings.on || [];
    const kunReadings = kanji.readings.kun || [];
    
    const randomOnReading = onReadings.length > 0 
      ? onReadings[Math.floor(Math.random() * onReadings.length)]
      : 'オン';
      
    const randomKunReading = kunReadings.length > 0
      ? kunReadings[Math.floor(Math.random() * kunReadings.length)]
      : 'くん';
    
    // For meaning segment, randomly pick from either on or kun readings
    const allReadings = [...onReadings, ...kunReadings];
    const randomMeaningReading = allReadings.length > 0
      ? allReadings[Math.floor(Math.random() * allReadings.length)]
      : 'いみ';

    const baseSegments: Segment[] = [
      {
        id: 'onyomi',
        label: randomOnReading,
        value: 'onyomi',
        color: 'rgb(191, 219, 254)',
        hoverColor: 'rgb(59, 130, 246)',
        position: 0,
        ttsText: randomOnReading
      },
      {
        id: 'kunyomi', 
        label: randomKunReading,
        value: 'kunyomi',
        color: 'rgb(254, 202, 202)',
        hoverColor: 'rgb(239, 68, 68)',
        position: 1,
        ttsText: randomKunReading
      },
      {
        id: 'meaning',
        label: randomMeaningReading,
        value: 'meaning',
        color: 'rgb(167, 243, 208)',
        hoverColor: 'rgb(34, 197, 94)',
        position: 2,
        ttsText: randomMeaningReading
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

    setSegments(shuffledSegments);
    segmentsRef.current = shuffledSegments;
  }, [kanji]);

  // Start game
  const startGame = () => {
    if (segments.length === 0) return;
    
    const validSegments = segments.filter(s => s.id !== 'distractor');
    const firstItem = validSegments[Math.floor(Math.random() * validSegments.length)].value;
    const newSequence = [firstItem];

    setSequence(newSequence);
    sequenceRef.current = newSequence;
    setPlayerSequence([]);
    setScore(0);
    setRound(1);
    setCountdown(3);
    setPhase('countdown');
    setGameStarted(true);
  };

  // Countdown effect
  useEffect(() => {
    if (!gameStarted || phase !== 'countdown') return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown finished, start showing sequence
      setPhase('showing');
      sequenceIndexRef.current = 0;
    }
  }, [countdown, phase, gameStarted]);

  // Show sequence
  useEffect(() => {
    if (!gameStarted || phase !== 'showing' || segments.length === 0) return;
    
    let timeoutId: NodeJS.Timeout | null = null;
    let innerTimeoutId: NodeJS.Timeout | null = null;
    
    const showSegmentAtIndex = (index: number) => {
      if (index >= sequenceRef.current.length) {
        // Done showing, player's turn

        timeoutId = setTimeout(() => {
          setPhase('playing');
          setPlayerSequence([]);
        }, 500);
        return;
      }
      
      const segmentValue = sequenceRef.current[index];
      const segment = segmentsRef.current.find(s => s.value === segmentValue);
      
      if (!segment) {
        console.error('Segment not found');
        setPhase('playing');
        return;
      }
      
      // Highlight and play sound
      setCurrentHighlight(segmentValue);
      
      if (segment.ttsText) {
        speakGameText(segment.ttsText, 'kanji-simon', { 
          voice: 'female', 
          speed: 1.0,
          provider: 'google'
        }).catch(console.error);
      }
      
      // Wait, then unhighlight and move to next
      timeoutId = setTimeout(() => {
        setCurrentHighlight(null);
        
        innerTimeoutId = setTimeout(() => {
          showSegmentAtIndex(index + 1);
        }, 300);
      }, 800);
    };
    
    // Start showing from index 0
    showSegmentAtIndex(0);
    
    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (innerTimeoutId) clearTimeout(innerTimeoutId);
    };
  }, [phase, gameStarted]); // Remove sequence and segments from dependencies

  // Handle player click
  const handleSegmentClick = async (segmentValue: string) => {
    if (phase !== 'playing') return;

    const segment = segments.find(s => s.value === segmentValue);
    
    // Play sound
    if (segment?.ttsText) {
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
    
    // Check if correct
    const expectedValue = sequence[playerSequence.length];
    const isCorrect = segmentValue === expectedValue && segmentValue !== 'distractor';

    console.log(`📝 Player sequence so far: [${[...playerSequence, segmentValue].join(', ')}]`);
    
    if (!isCorrect) {
      // Wrong! Game over

      setCurrentHighlight('wrong');
      setPhase('gameover');
      setTimeout(() => {
        onGameOver(score);
      }, 1000);
      return;
    }
    
    // Correct!
    const newPlayerSequence = [...playerSequence, segmentValue];
    setPlayerSequence(newPlayerSequence);
    
    // Flash the segment
    setCurrentHighlight(segmentValue);
    setTimeout(() => setCurrentHighlight(null), 300);
    
    // Check if sequence complete
    if (newPlayerSequence.length === sequence.length) {
      // Success!
      const roundScore = sequence.length * 100;

      console.log(`🎯 Sequence was: [${sequence.join(', ')}]`);
      console.log(`👤 Player entered: [${newPlayerSequence.join(', ')}]`);
      console.log(`💰 Round score: ${roundScore} (${sequence.length} items × 100)`);

      setScore(score + roundScore);
      setCurrentHighlight('success');
      setPhase('success');
      
      setTimeout(() => {
        onRoundComplete(roundScore);
        
        // Next round
        const validSegments = segments.filter(s => s.id !== 'distractor');
        const newItem = validSegments[Math.floor(Math.random() * validSegments.length)].value;
        const newSequence = [...sequence, newItem];
        console.log(`🆕 Round ${round + 1} sequence will be: [${newSequence.join(', ')}]`);
        
        setSequence(newSequence);
        sequenceRef.current = newSequence;
        setPlayerSequence([]);
        setRound(round + 1);
        setCountdown(3);
        setPhase('countdown');
        setCurrentHighlight(null);
      }, 1500);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      stopTTS();
    };
  }, [stopTTS]);

  // Calculate segment path
  const getSegmentPath = (position: number, innerRadius = 80, outerRadius = 180) => {
    const angleStart = position * 90 - 45;
    const angleEnd = angleStart + 90;
    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (angleEnd * Math.PI) / 180;
    
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
      {/* Instructions overlay */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-lg"
            >
              <h2 className="text-2xl font-bold mb-4">How to Play Kanji Simon</h2>
              
              <div className="space-y-3 text-sm">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Watch the highlighted segments carefully - each one represents a kanji reading (on'yomi, kun'yomi) or meaning.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>When it's your turn, repeat the pattern by clicking the segments in the same order.</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Each round adds one more segment to the sequence. How long can you remember?</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-yellow-500">⚠️</span>
                  <span>Avoid the distractor segment (dimmed during your turn) - clicking it ends the game!</span>
                </p>
                
                <p className="flex items-start gap-2">
                  <span className="text-green-500">💡</span>
                  <span>Score = Sequence length × 100 points per round</span>
                </p>
              </div>
              
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                Got it! Let's play
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Score and Round */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground">Round {round}</p>
        <p className="text-2xl font-bold">Score: {score}</p>
      </div>
      
      {/* Start button */}
      {!gameStarted && !showInstructions && (
        <div className="text-center mb-6">
          <button
            onClick={startGame}
            className="relative px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors
                       before:absolute before:inset-0 before:-m-[3px] before:rounded-lg before:border-2 before:border-primary"
          >
            Start Game
          </button>
        </div>
      )}

      {/* Game Board */}
      <div className="relative w-full aspect-square">
        <svg viewBox="-200 -200 400 400" className="w-full h-full">
          {/* Center circle with border */}
          <circle cx="0" cy="0" r="63" className="fill-black" />
          <circle cx="0" cy="0" r="60" className="fill-background" />
          
          {/* Segments */}
          {segments.map((segment) => {
            const isHighlighted = currentHighlight === segment.value;
            const isWrong = currentHighlight === 'wrong';
            const isSuccess = currentHighlight === 'success';
            
            return (
              <motion.g key={segment.id}>
                {/* Border path */}
                <path
                  d={getSegmentPath(segment.position, 77, 183)}
                  fill="black"
                  className="pointer-events-none"
                />
                {/* Side borders */}
                <line
                  x1={Math.cos(((segment.position * 90 - 45) * Math.PI) / 180) * 77}
                  y1={Math.sin(((segment.position * 90 - 45) * Math.PI) / 180) * 77}
                  x2={Math.cos(((segment.position * 90 - 45) * Math.PI) / 180) * 183}
                  y2={Math.sin(((segment.position * 90 - 45) * Math.PI) / 180) * 183}
                  stroke="black"
                  strokeWidth="3"
                  className="pointer-events-none"
                />
                <line
                  x1={Math.cos(((segment.position * 90 + 45) * Math.PI) / 180) * 77}
                  y1={Math.sin(((segment.position * 90 + 45) * Math.PI) / 180) * 77}
                  x2={Math.cos(((segment.position * 90 + 45) * Math.PI) / 180) * 183}
                  y2={Math.sin(((segment.position * 90 + 45) * Math.PI) / 180) * 183}
                  stroke="black"
                  strokeWidth="3"
                  className="pointer-events-none"
                />
                {/* Main segment path */}
                <motion.path
                  d={getSegmentPath(segment.position)}
                  fill={segment.color}
                  className="cursor-pointer"
                  animate={{
                    fill: isHighlighted ? segment.hoverColor 
                        : isWrong ? 'rgb(239, 68, 68)'
                        : isSuccess ? 'rgb(34, 197, 94)'
                        : segment.color,
                    scale: isHighlighted || isWrong || isSuccess ? 1.05 : 1,
                    filter: isHighlighted ? 'brightness(1.1) drop-shadow(0 0 10px rgba(0,0,0,0.3))' 
                          : 'brightness(1)',
                    opacity: phase === 'playing' && segment.id === 'distractor' ? 0.5 : 1
                  }}
                  whileHover={phase === 'playing' ? { 
                    fill: segment.hoverColor,
                    filter: 'brightness(1.05)'
                  } : {}}
                  whileTap={phase === 'playing' ? { scale: 0.95 } : {}}
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
                
                {/* Type label - hide for distractor */}
                {segment.id !== 'distractor' && (
                  <text
                    x={Math.cos(((segment.position * 90) * Math.PI) / 180) * 130}
                    y={Math.sin(((segment.position * 90) * Math.PI) / 180) * 130 + 20}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-black text-sm font-bold pointer-events-none select-none"
                  >
                    {segment.id.toUpperCase()}
                  </text>
                )}
              </motion.g>
            );
          })}
          
          {/* Center kanji */}
          <g>
            <text
              x="0"
              y="-10"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-4xl font-bold select-none"
            >
              {kanji.char}
            </text>
            <text
              x="0"
              y="20"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-xs font-medium select-none"
            >
              {kanji.meaning || 'N/A'}
            </text>
          </g>
        </svg>
      </div>

      {/* Status indicator */}
      <div className="text-center mt-6 h-20">
        <AnimatePresence mode="wait">
          {gameStarted && phase === 'countdown' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">{countdown}</div>
              <p className="text-muted-foreground">Get ready!</p>
            </motion.div>
          )}
          
          {gameStarted && phase === 'showing' && (
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
            </motion.div>
          )}
          
          {gameStarted && phase === 'playing' && (
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
                {sequence.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < playerSequence.length 
                        ? 'bg-green-500' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          )}
          
          {gameStarted && phase === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <p className="text-2xl font-bold text-green-500">
                Well done!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}