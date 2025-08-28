'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MoodBoard as MoodBoardType } from '@/types/moodBoard';
import { getBoardProgress, toggleKanjiLearned, isKanjiLearned } from '@/utils/moodBoardProgress';
import { canUserStudy } from '@/utils/kanjiStudyProgress';
import { useAuth } from '@/contexts/AuthContext';
import KanjiCard from './KanjiCard';
import ProgressIndicator from './ProgressIndicator';
import KanjiStudyModal from './KanjiStudyModal';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';
import { useStrings } from '@/contexts/LanguageContext';
import { SaveMultipleKanjiModal } from './SaveMultipleKanjiModal';
import { JapaneseWord } from '@/types';

interface MoodBoardProps {
  board: MoodBoardType;
  onBack: () => void;
}

export default function MoodBoard({ board, onBack }: MoodBoardProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const router = useRouter();
  const [progress, setProgress] = useState(getBoardProgress(board.id));
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [studyAccess, setStudyAccess] = useState<{ canStudy: boolean; remainingSessions: number; isPremium: boolean }>({
    canStudy: false,
    remainingSessions: 0,
    isPremium: false
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [itemsToSave, setItemsToSave] = useState<JapaneseWord[]>([]);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

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

  const handleSaveAllToList = () => {
    const kanjiWords: JapaneseWord[] = board.kanji.map(kanji => ({
      id: kanji.char,
      kanji: kanji.char,
      kana: kanji.readings.kun[0] || kanji.readings.on[0] || '',
      romaji: '',
      meaning: kanji.meaning,
      english: kanji.meaning,
      type: 'noun',
      jlpt: 5 as const,
      tags: [],
      word: kanji.char,
      reading: kanji.readings.kun[0] || kanji.readings.on[0] || '',
      meanings: [kanji.meaning],
      jlptLevel: kanji.difficulty,
      frequency: 0,
      kanaReading: kanji.readings.kun[0] || kanji.readings.on[0] || ''
    }));
    setItemsToSave(kanjiWords);
    setShowSaveModal(true);
  };

  const handleLearnClick = async () => {
    setIsCheckingAccess(true);
    
    // Convert mood board kanji to WordItem format for word learning session
    const wordItems = board.kanji.map(kanji => ({
      id: `${board.id}_${kanji.char}`,
      kanji: kanji.char,
      kana: kanji.readings.kun[0] || kanji.readings.on[0] || '',
      meaning: kanji.meaning,
      partOfSpeech: 'noun',
      // Include example if available - it will be translated in the word learning session
      example: kanji.examples && kanji.examples.length > 0 && kanji.examples[0].length > 0 ? {
        japanese: kanji.examples[0],
        reading: '', // We don't have reading data from mood boards
        english: '' // Will be translated automatically in word learning session
      } : undefined
    }));

    // Store the words in session storage
    const sessionData = {
      lessonId: `moodboard_${board.id}`,
      textbook: board.title,
      words: wordItems
    };
    
    window.sessionStorage.setItem('wordLearningSessionWords', JSON.stringify(sessionData));
    
    // Navigate to word learning session with custom session
    router.push('/tools/word-learning-session?session=custom');
    setIsCheckingAccess(false);
  };

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
            <div className="flex flex-col items-center gap-6">
              {/* Back button - top left without pill effect, with padding for navigation */}
              <div className="absolute top-24 left-6">
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Center section - Title and description */}
              <div className="text-center max-w-2xl mx-auto">
                <div className="text-5xl mb-3">{board.emoji}</div>
                <h1 className="text-3xl font-bold mb-2">{board.title}</h1>
                <p className="text-base opacity-90">{board.description}</p>
                <div className="mt-3 text-sm opacity-80">
                  <span className="font-semibold">{learnedCount}/{totalCount}</span> learned •
                  <span className="ml-1">{progress?.progressPercentage || 0}% complete</span>
                </div>
              </div>

              {/* Button group - now in separate row below */}
              <div className="flex items-center gap-3">
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

                {/* Learn button */}
                <button
                  onClick={handleLearnClick}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-full px-5 py-2.5 text-white hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 shadow-lg"
                  title="Start a word learning session with all kanji from this board"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-medium">Learn</span>
                </button>

                {/* Reading Routes button */}
                <button
                  onClick={() => router.push(`/games/reading-routes/${board.id}`)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-full px-5 py-2.5 text-white hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 shadow-lg"
                  title="Practice kanji readings with Reading Routes game"
                >
                  <span className="text-lg">🛤️</span>
                  <span className="text-sm font-medium">Reading Routes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="relative text-white h-full lg:hidden flex flex-col justify-center">
            {/* Back button - top left without pill effect, with padding for mobile nav */}
            <div className="absolute top-20 left-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            {/* Content centered */}
            <div className="flex flex-col items-center gap-4 px-4">
              <div className="text-center">
                <div className="text-4xl mb-2">{board.emoji}</div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1">{board.title}</h1>
                <p className="text-sm opacity-90">{board.description}</p>
                <div className="mt-2 text-xs sm:text-sm opacity-80">
                  <span className="font-semibold">{learnedCount}/{totalCount}</span> learned •
                  <span>{progress?.progressPercentage || 0}% complete</span>
                </div>
              </div>

              {/* Action buttons - now below the title/description */}
              <div className="flex items-center gap-2">
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

                <button
                  onClick={handleLearnClick}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-full px-4 py-2 text-white hover:from-green-500/30 hover:to-emerald-500/30 transition-all duration-200 shadow-lg"
                  title="Start word learning session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="text-sm font-medium">Learn</span>
                </button>

                <button
                  onClick={() => router.push(`/games/reading-routes/${board.id}`)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md rounded-full px-4 py-2 text-white hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 shadow-lg"
                  title="Reading Routes"
                >
                  <span className="text-base">🛤️</span>
                  <span className="text-sm font-medium">Routes</span>
                </button>
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
            {board.kanji.map((kanji, index) => (
              <KanjiCard
                key={`${kanji.char}-${index}`}
                kanji={kanji}
                isLearned={isKanjiLearned(board.id, kanji.char)}
                onToggleLearned={handleToggleKanji}
              />
            ))}
          </div>

          {/* Save All to List Button */}
          <div className="mt-8 max-w-2xl mx-auto">
            <button
              onClick={handleSaveAllToList}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Save All Kanji to Lists
            </button>
          </div>

          {/* Study Tips */}
          <div className="mt-8 max-w-2xl mx-auto">
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
          height: 300px;
        }

        .mood-board-content {
          flex: 1;
        }

        @media (min-width: 1024px) {
          .mood-board-hero {
            height: 350px;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .mood-board-hero {
            height: 325px;
          }
        }

        @media (max-width: 640px) {
          .mood-board-hero {
            height: 350px;
          }
        }

        @media (max-width: 480px) {
          .mood-board-hero {
            height: 325px;
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
      <UpgradeSlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Unlimited Kanji Study"
        message={`You've used all ${3 - studyAccess.remainingSessions} of your daily study sessions. Upgrade to Premium for unlimited kanji study sessions!`}
      />

      {/* Save Modal */}
      {showSaveModal && itemsToSave.length > 0 && (
        <SaveMultipleKanjiModal
          items={itemsToSave}
          onClose={() => {
            setShowSaveModal(false);
            setItemsToSave([]);
          }}
          onSaveComplete={() => {
            // Optionally refresh saved states
          }}
        />
      )}
    </div>
  );
}
