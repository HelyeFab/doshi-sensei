'use client';

import { MoodBoardCardProps } from '@/types/moodBoard';
import ProgressIndicator from './ProgressIndicator';

export default function MoodBoardCard({ board, progress, onClick }: MoodBoardCardProps) {
  const handleClick = () => {
    onClick(board.id);
  };

  const learnedCount = progress?.learnedKanji.length || 0;
  const totalCount = board.kanji.length;
  const isCompleted = progress?.progressPercentage === 100;

  return (
    <div
      className="mood-board-card group cursor-pointer"
      onClick={handleClick}
    >
      {/* Card Background with Gradient */}
      <div
        className="relative h-48 rounded-xl overflow-hidden mb-4 transition-transform duration-200 group-hover:scale-105"
        style={{ background: board.background }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Completion Badge */}
        {isCompleted && (
          <div className="absolute top-3 right-3 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <span>✓</span>
            Complete
          </div>
        )}

        {/* Content */}
        <div className="relative h-full flex flex-col justify-between p-6 text-white">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl mb-2">{board.emoji}</div>
              <h3 className="text-xl font-bold">{board.title}</h3>
              <p className="text-sm opacity-90">{board.jlpt} Level</p>
            </div>
          </div>

          {/* Kanji Preview */}
          <div className="flex justify-center">
            <div className="flex gap-2">
              {board.kanji.slice(0, 5).map((kanji, index) => (
                <div
                  key={`${kanji.char}-${index}`}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                    progress?.learnedKanji.includes(kanji.char)
                      ? 'bg-green-500/80 text-white'
                      : 'bg-white/20 text-white/90'
                  }`}
                >
                  {kanji.char}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {board.title}
          </h4>
          <p className="text-sm text-muted-foreground">
            {board.description}
          </p>
        </div>

        {/* Progress */}
        <ProgressIndicator
          current={learnedCount}
          total={totalCount}
          size="sm"
          showText={false}
        />

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {learnedCount}/{totalCount} kanji
          </span>
          <span className={`font-semibold ${isCompleted ? 'text-green-600' : 'text-primary'}`}>
            {progress?.progressPercentage || 0}%
          </span>
        </div>
      </div>

      <style jsx>{`
        .mood-board-card {
          padding: 1rem;
          border-radius: 1rem;
          border: 2px solid transparent;
          background: var(--card);
          transition: all 0.2s ease-in-out;
        }

        .mood-board-card:hover {
          border-color: var(--primary);
          box-shadow: 0 8px 25px -8px rgba(var(--primary-rgb), 0.3);
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .mood-board-card {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
