'use client';

import { motion } from 'framer-motion';
import { useStrings } from '@/hooks/useLanguage';

interface InstructionScreenProps {
  wordCount: number;
  pairCount: number;
  maxWords?: number;
  onStart: () => void;
  onBack: () => void;
}

export default function InstructionScreen({ wordCount, pairCount, maxWords, onStart, onBack }: InstructionScreenProps) {
  const strings = useStrings();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto p-6"
    >
      {/* Game Icon and Title */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 bg-red-500 rounded-lg flex items-center justify-center">
          <img
            src="/flat-icons/root-icons/matching.svg"
            alt="Matching Game"
            className="w-16 h-16 object-contain"
          />
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-2">
          {strings.games.modes.matching.title}
        </h2>
        <p className="text-muted-foreground">
          Test your memory with your vocabulary!
        </p>
      </div>

      {/* How to Play */}
      <div className="bg-card rounded-lg border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">🎮</span>
          How to Play
        </h3>
        <ul className="space-y-3 text-muted-foreground">
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">1.</span>
            <span>Tap any tile to reveal what's hidden underneath</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">2.</span>
            <span>Find matching pairs - they could be:
              <ul className="mt-1 ml-4 text-sm">
                <li>• Same word twice</li>
                <li>• Word and its reading (kana)</li>
                <li>• Word and its meaning</li>
              </ul>
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">3.</span>
            <span>Clear all pairs to win the game!</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-primary font-bold">4.</span>
            <span>Try to complete with as few moves as possible</span>
          </li>
        </ul>
      </div>

      {/* Game Info */}
      <div className="flex justify-center mb-8">
        <div className="bg-muted rounded-lg p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-1">{pairCount}</div>
          <div className="text-sm text-muted-foreground">Pairs to Match</div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          <span className="font-semibold">💡 Tip:</span> Pay attention to the word pronunciation when you flip a tile - it helps with memorization!
        </p>
      </div>
      
      {/* Word limit notification */}
      {maxWords && wordCount > maxWords && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <span className="font-semibold">ℹ️ Note:</span> Your list has {wordCount} words. We'll randomly select {maxWords} words for this game to keep it manageable.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={onStart}
          className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg"
        >
          Start Game
        </button>
      </div>
    </motion.div>
  );
}