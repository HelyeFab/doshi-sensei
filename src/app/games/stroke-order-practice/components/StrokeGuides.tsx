'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Difficulty } from './StrokeOrderGame';

interface Props {
  kanji: string;
  difficulty: Difficulty;
  correctStrokes: number[];
  showHint: boolean;
  onStrokeClick: (strokeIndex: number, totalStrokes: number) => void;
  lastClickedStroke: number | null;
  isCorrect: boolean | null;
}

export default function StrokeGuides({
  kanji,
  difficulty,
  correctStrokes,
  showHint,
  onStrokeClick,
  lastClickedStroke,
  isCorrect,
}: Props) {
  const [, setSvgContent] = useState<string | null>(null);
  const [strokePaths, setStrokePaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKanjiData();
  }, [kanji]);

  const loadKanjiData = async () => {
    if (!kanji) {
      setLoading(false);
      setError('No kanji selected');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the Unicode code point
      const codePoint = kanji.charCodeAt(0).toString(16).padStart(5, '0');
      const response = await fetch(`/data/kanjivg/${codePoint}.svg`);
      
      if (!response.ok) {
        throw new Error('Kanji data not found');
      }
      
      const svgText = await response.text();
      setSvgContent(svgText);
      
      // Parse the SVG to extract stroke paths
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
      // Select only the stroke paths (those with IDs starting with 'kvg:' and ending with '-s' followed by a number)
      const paths = svgDoc.querySelectorAll('path[id^="kvg:"][id*="-s"]');
      const pathData = Array.from(paths).map(path => path.getAttribute('d') || '');

      setStrokePaths(pathData);
    } catch (err) {
      setError('Failed to load kanji data');
      console.error('Error loading kanji:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-80 h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || strokePaths.length === 0) {
    return (
      <div className="w-80 h-80 flex items-center justify-center text-muted-foreground">
        <p>Unable to load stroke data</p>
      </div>
    );
  }

  const getStrokeColor = (index: number) => {
    if (correctStrokes.includes(index)) {
      return 'rgb(34, 197, 94)'; // Green for completed
    }
    if (lastClickedStroke === index) {
      return isCorrect ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'; // Green or red for feedback
    }
    if (showHint && index === correctStrokes.length) {
      return 'rgb(99, 102, 241)'; // Blue for hint
    }
    return 'rgb(156, 163, 175)'; // Gray for incomplete
  };

  const getStrokeOpacity = (index: number) => {
    if (correctStrokes.includes(index)) return 1;
    if (lastClickedStroke === index) return 1;
    if (showHint && index === correctStrokes.length) return 1;
    
    switch (difficulty) {
      case 'easy':
        return 0.3;
      case 'medium':
        return 0.2;
      case 'hard':
        return 0.1;
      case 'expert':
        return 0.05; // Still slightly visible
      default:
        return 0.3;
    }
  };

  const showNumbers = difficulty === 'easy' || showHint;

  return (
    <div className="relative">
      <svg
        width="320"
        height="320"
        viewBox="0 0 109 109"
        className="border-2 border-border rounded-lg bg-background"
      >
        {/* Grid lines */}
        <g stroke="rgb(209, 213, 219)" strokeWidth="0.5">
          <line x1="54.5" y1="0" x2="54.5" y2="109" />
          <line x1="0" y1="54.5" x2="109" y2="54.5" />
          <rect x="0" y="0" width="109" height="109" fill="none" stroke="rgb(209, 213, 219)" strokeWidth="1" />
        </g>

        {/* Kanji strokes */}
        {strokePaths.map((path, index) => (
          <g key={index}>
            <motion.path
              d={path}
              fill="none"
              stroke={getStrokeColor(index)}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={getStrokeOpacity(index)}
              initial={{ pathLength: 0 }}
              animate={{
                pathLength: correctStrokes.includes(index) ? 1 : 0,
                opacity: getStrokeOpacity(index),
              }}
              transition={{ duration: 0.5 }}
              className={correctStrokes.includes(index) ? '' : 'cursor-pointer hover:opacity-50'}
              onClick={() => !correctStrokes.includes(index) && onStrokeClick(index, strokePaths.length)}
            />
            
            {/* Invisible clickable area for better UX */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth="20"
              className="cursor-pointer"
              onClick={() => !correctStrokes.includes(index) && onStrokeClick(index, strokePaths.length)}
            />

            {/* Stroke numbers */}
            {showNumbers && (
              <text
                x="0"
                y="0"
                fontSize="12"
                fill={correctStrokes.includes(index) ? 'rgb(34, 197, 94)' : 'rgb(156, 163, 175)'}
                className="pointer-events-none select-none"
              >
                <textPath href={`#stroke-${index}`} startOffset="10%">
                  {index + 1}
                </textPath>
              </text>
            )}
            
            {/* Hidden path for textPath reference */}
            <path
              id={`stroke-${index}`}
              d={path}
              fill="none"
              stroke="none"
            />
          </g>
        ))}

        {/* Feedback animation */}
        {lastClickedStroke !== null && (
          <motion.circle
            cx="54.5"
            cy="54.5"
            r="40"
            fill="none"
            stroke={isCorrect ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
            strokeWidth="2"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </svg>

      {/* Stroke counter */}
      <div className="absolute top-2 right-2 bg-background/80 text-foreground border border-border px-2 py-1 rounded text-sm">
        {correctStrokes.length} / {strokePaths.length}
      </div>
    </div>
  );
}