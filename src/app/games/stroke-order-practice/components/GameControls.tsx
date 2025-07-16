'use client';

import React from 'react';
import { Lightbulb, MousePointer, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Difficulty } from './StrokeOrderGame';

export type InputMode = 'click' | 'draw';

interface Props {
  difficulty: Difficulty;
  onDifficultyChange: (difficulty: Difficulty) => void;
  inputMode: InputMode;
  onInputModeChange: (mode: InputMode) => void;
  onHint: () => void;
  hintsRemaining: number;
}

const difficulties: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

export default function GameControls({
  difficulty,
  onDifficultyChange,
  inputMode,
  onInputModeChange,
  onHint,
  hintsRemaining,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* First row: Difficulty and Hint */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Difficulty:</span>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {difficulties.map((diff) => (
            <Button
              key={diff.value}
              variant={difficulty === diff.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onDifficultyChange(diff.value)}
              className={`h-8 px-3 ${
                difficulty === diff.value 
                  ? '' 
                  : 'hover:bg-background/60'
              }`}
            >
              {diff.label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onHint}
        disabled={hintsRemaining === 0}
        className="gap-2"
      >
        <Lightbulb className="h-4 w-4" />
        Hint ({hintsRemaining} left)
      </Button>
      </div>

      {/* Second row: Input Mode Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Input Mode:</span>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          <Button
            variant={inputMode === 'click' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onInputModeChange('click')}
            className={`h-8 px-3 gap-2 ${
              inputMode === 'click' ? '' : 'hover:bg-background/60'
            }`}
          >
            <MousePointer className="h-4 w-4" />
            Click
          </Button>
          <Button
            variant={inputMode === 'draw' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onInputModeChange('draw')}
            className={`h-8 px-3 gap-2 ${
              inputMode === 'draw' ? '' : 'hover:bg-background/60'
            }`}
          >
            <Pencil className="h-4 w-4" />
            Draw
          </Button>
        </div>
      </div>
    </div>
  );
}