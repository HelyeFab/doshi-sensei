// Import JLPTLevel type
import { JLPTLevel } from './index';

// Re-export for convenience
export type { JLPTLevel };

// JLPT levels array for iteration
export const JLPT_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

// Kanji types
export interface Kanji {
  character: string;
  meaning: string;
  meanings?: string[];
  onyomi: string[];
  kunyomi: string[];
  jlpt: JLPTLevel;
  strokes?: number;
  grade?: number;
  frequency?: number;
}