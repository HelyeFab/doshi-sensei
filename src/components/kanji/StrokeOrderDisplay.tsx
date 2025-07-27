'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StrokeOrderDisplayProps {
  kanji: string;
  size?: number;
  autoPlay?: boolean;
  showControls?: boolean;
  strokeSpeed?: number; // milliseconds per stroke
  onComplete?: () => void;
}

interface StrokeData {
  d: string; // SVG path data
  id: string;
}

export default function StrokeOrderDisplay({
  kanji,
  size = 200,
  autoPlay = false,
  showControls = true,
  strokeSpeed = 1000,
  onComplete
}: StrokeOrderDisplayProps) {
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [currentStroke, setCurrentStroke] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [strokesCompleted, setStrokesCompleted] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load SVG data for the kanji
  useEffect(() => {
    loadKanjiData();
  }, [kanji]);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && strokes.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentStroke((prev) => {
          const next = prev + 1;
          if (next >= strokes.length) {
            setIsPlaying(false);
            onComplete?.();
            return prev;
          }
          return next;
        });
      }, strokeSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, strokes.length, strokeSpeed, onComplete]);

  // Update completed strokes
  useEffect(() => {
    setStrokesCompleted(strokes.slice(0, currentStroke).map(s => s.id));
  }, [currentStroke, strokes]);

  const loadKanjiData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get Unicode code point
      const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
      
      // Try to fetch from KanjiVG data
      const response = await fetch(`/data/kanjivg/${codePoint}.svg`);
      
      if (!response.ok) {
        throw new Error(`Stroke data not available for ${kanji}`);
      }
      
      const svgText = await response.text();
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      
      // Extract stroke paths
      const strokePaths = svgDoc.querySelectorAll('path[id*="kvg:"]');
      const strokeData: StrokeData[] = Array.from(strokePaths).map((path, index) => ({
        d: path.getAttribute('d') || '',
        id: path.getAttribute('id') || `stroke-${index}`
      }));
      
      setStrokes(strokeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stroke data');
      console.error('Error loading kanji stroke data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlay = () => {
    if (currentStroke >= strokes.length) {
      setCurrentStroke(0);
      setStrokesCompleted([]);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStroke(0);
    setStrokesCompleted([]);
  };

  const handleStepForward = () => {
    if (currentStroke < strokes.length) {
      setCurrentStroke(currentStroke + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStroke > 0) {
      setCurrentStroke(currentStroke - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || strokes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg" style={{ width: size, height: size }}>
        <svg className="w-12 h-12 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-muted-foreground text-center">
          {error || 'No stroke data available'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Display */}
      <div className="relative bg-white rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 109 109"
          width={size}
          height={size}
          className="absolute inset-0"
        >
          {/* Grid lines */}
          {showGrid && (
            <g className="opacity-30">
              <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="#666" strokeWidth="1" />
              <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="#666" strokeWidth="1" />
              <line x1="0" y1="0" x2="109" y2="109" stroke="#666" strokeWidth="0.5" strokeDasharray="3,3" />
              <line x1="109" y1="0" x2="0" y2="109" stroke="#666" strokeWidth="0.5" strokeDasharray="3,3" />
            </g>
          )}
          
          {/* Completed strokes */}
          <g>
            {strokes.slice(0, currentStroke).map((stroke, index) => (
              <path
                key={stroke.id}
                d={stroke.d}
                fill="none"
                stroke="#333"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            ))}
          </g>
          
          {/* Current stroke being animated */}
          <AnimatePresence>
            {currentStroke < strokes.length && isPlaying && (
              <motion.path
                key={strokes[currentStroke].id}
                d={strokes[currentStroke].d}
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: strokeSpeed / 1000, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
          
          {/* Current stroke (static) when paused */}
          {currentStroke < strokes.length && !isPlaying && (
            <path
              d={strokes[currentStroke].d}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          )}
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Stroke number indicator */}
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
          {Math.min(currentStroke + 1, strokes.length)} / {strokes.length}
        </div>
      </div>
      
      {/* Controls */}
      {showControls && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleStepBackward}
              disabled={currentStroke === 0}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous stroke"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {isPlaying ? (
              <button
                onClick={handlePause}
                className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title="Pause"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handlePlay}
                className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                title="Play"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
            
            <button
              onClick={handleStepForward}
              disabled={currentStroke >= strokes.length}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next stroke"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              title="Reset"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              Show grid
            </label>
            
            <label className="flex items-center gap-2">
              Speed:
              <input
                type="range"
                min="500"
                max="2000"
                step="100"
                value={strokeSpeed}
                onChange={(e) => e.target.value}
                className="w-20"
                disabled={isPlaying}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}