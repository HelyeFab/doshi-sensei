'use client';

import { useState, useEffect } from 'react';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';
import { getBoardProgress, toggleKanjiLearned, isKanjiLearned } from '@/utils/moodBoardProgress';
import { canUserStudy } from '@/utils/kanjiStudyProgress';
import { useAuth } from '@/contexts/AuthContext';
import KanjiCard from './KanjiCard';
import ProgressIndicator from './ProgressIndicator';
import KanjiStudyModal from './KanjiStudyModal';
import { UpgradePromptModal } from '@/components/UpgradePromptModal';
import { useStrings } from '@/hooks/useLanguage';

interface MoodBoardProps {
  board: MoodBoardType;
  onBack: () => void;
}

export default function MoodBoard({ board, onBack }: MoodBoardProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const [progress, setProgress] = useState(getBoardProgress(board.id));
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [studyAccess, setStudyAccess] = useState<{ canStudy: boolean; remainingSessions: number; isPremium: boolean }>({
    canStudy: false,
    remainingSessions: 0,
    isPremium: false
  });

  // Update progress when component mounts or board changes
  useEffect(() => {
    setProgress(getBoardProgress(board.id));
  }, [board.id]);

  // Check study access
  useEffect(() => {
    if (user?.uid) {
      canUserStudy(user.uid).then(setStudyAccess);
    }
  }, [user]);

  const handleToggleKanji = (kanjiChar: string) => {
    const newProgress = toggleKanjiLearned(board.id, kanjiChar);
    setProgress(newProgress);
  };

  const learnedCount = progress?.learnedKanji.length || 0;
  const totalCount = board.kanji.length;
  const isCompleted = progress?.progressPercentage === 100;

  return (
    <div className="mood-board-container">
      {/* Header */}
      <div className="mood-board-header">
        <div
          className="mood-board-hero relative overflow-hidden"
          style={{ background: board.background }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-transparent" />

          {/* Desktop Layout */}
          <div className="relative text-white h-full hidden lg:flex lg:flex-col lg:justify-center px-8">
            <div className="flex items-center justify-between">
              {/* Back button */}
              <button
                onClick={onBack}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-5 py-2.5 text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>

              {/* Center section - Title and description */}
              <div className="text-center flex-1 max-w-2xl mx-auto px-8">
                <div className="text-5xl mb-3">{board.emoji}</div>
                <h1 className="text-3xl font-bold mb-2">{board.title}</h1>
                <p className="text-base opacity-90">{board.description}</p>
                <div className="mt-3 text-sm opacity-80">
                  <span className="font-semibold">{learnedCount}/{totalCount}</span> learned •
                  <span className="ml-1">{progress?.progressPercentage || 0}% complete</span>
                </div>
              </div>

              {/* Study button */}
              <button
                onClick={() => {
                  if (studyAccess.canStudy) {
                    setIsStudyModalOpen(true);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`flex items-center gap-2 backdrop-blur-md rounded-full px-5 py-2.5 text-white transition-all duration-200 shadow-lg ${studyAccess.canStudy
                    ? 'bg-white/10 hover:bg-white/20'
                    : 'bg-white/5 opacity-75 cursor-not-allowed'
                  }`}
                title={studyAccess.canStudy ? strings.tooltips.studyAllKanji : `${studyAccess.remainingSessions} ${strings.tooltips.sessionsRemaining}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-sm font-medium">
                  Study {!studyAccess.isPremium && !studyAccess.canStudy && `(${studyAccess.remainingSessions} left)`}
                </span>
              </button>
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="relative text-white h-full lg:hidden flex flex-col">
            {/* Buttons row with proper padding */}
            <div className="flex items-center justify-between p-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 text-white hover:bg-white/20 transition-all duration-200 shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Back</span>
              </button>

              <button
                onClick={() => {
                  if (studyAccess.canStudy) {
                    setIsStudyModalOpen(true);
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`flex items-center gap-2 backdrop-blur-md rounded-full px-4 py-2 text-white transition-all duration-200 shadow-lg ${studyAccess.canStudy
                    ? 'bg-white/10 hover:bg-white/20'
                    : 'bg-white/5 opacity-75 cursor-not-allowed'
                  }`}
                title={studyAccess.canStudy ? strings.tooltips.studyAllKanji : `${studyAccess.remainingSessions} ${strings.tooltips.sessionsRemaining}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-sm font-medium">Study</span>
              </button>
            </div>

            {/* Content centered in remaining space */}
            <div className="flex-1 flex items-center justify-center px-4 pb-4">
              <div className="text-center">
                <div className="text-4xl mb-2">{board.emoji}</div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1">{board.title}</h1>
                <p className="text-sm opacity-90">{board.description}</p>
                <div className="mt-2 text-xs sm:text-sm opacity-80">
                  <span className="font-semibold">{learnedCount}/{totalCount}</span> learned •
                  <span>{progress?.progressPercentage || 0}% complete</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-card/95 backdrop-blur-sm border-b border-border/50">
          <ProgressIndicator
            current={learnedCount}
            total={totalCount}
            size="md"
            showText={true}
          />

          {isCompleted && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <span className="text-xl">🎉</span>
                <span className="font-semibold">Congratulations! You've completed this mood board!</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Kanji Grid */}
      <div className="mood-board-content">
        <div className="container mx-auto px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {board.kanji.map((kanji) => (
              <KanjiCard
                key={kanji.char}
                kanji={kanji}
                isLearned={isKanjiLearned(board.id, kanji.char)}
                onToggleLearned={handleToggleKanji}
              />
            ))}
          </div>

          {/* Study Tips */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span>💡</span>
                Study Tips
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Click the Study button to test your knowledge of all kanji</p>
                <p>• Tap any kanji card to see its readings and example words</p>
                <p>• Mark kanji as learned by clicking the circle button</p>
                <p>• Try to find connections between kanji in this theme</p>
                <p>• Practice writing the kanji to improve memorization</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mood-board-container {
          min-height: 100vh;
          background: var(--background);
        }

        .mood-board-hero {
          position: relative;
          height: 240px;
        }

        .mood-board-content {
          flex: 1;
        }

        @media (min-width: 1024px) {
          .mood-board-hero {
            height: 280px;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .mood-board-hero {
            height: 260px;
          }
        }

        @media (max-width: 640px) {
          .mood-board-hero {
            height: 240px;
          }
        }

        @media (max-width: 480px) {
          .mood-board-hero {
            height: 220px;
          }
        }
      `}</style>

      {/* Study Modal */}
      <KanjiStudyModal
        kanjiList={board.kanji}
        isOpen={isStudyModalOpen}
        onClose={() => {
          setIsStudyModalOpen(false);
          // Refresh study access after closing
          if (user?.uid) {
            canUserStudy(user.uid).then(setStudyAccess);
          }
        }}
        boardId={board.id}
        boardTitle={board.title}
      />

      {/* Upgrade Prompt Modal */}
      <UpgradePromptModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Unlimited Kanji Study"
        message={`You've used all ${3 - studyAccess.remainingSessions} of your daily study sessions. Upgrade to Premium for unlimited kanji study sessions!`}
      />
    </div>
  );
}
