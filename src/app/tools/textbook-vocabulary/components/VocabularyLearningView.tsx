'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterPanel } from './FilterPanel';
import { VocabularyGrid } from './VocabularyGrid';
import { InteractiveCard } from './InteractiveCard';
import { GoldenTimeScheduler } from './GoldenTimeScheduler';
import { ProgressTracker } from './ProgressTracker';
import { StudyProgress } from './StudyProgress';
import { useVocabularyData } from '../hooks/useVocabularyData';
import { useFilteredVocab } from '../hooks/useFilteredVocab';
import { spacedRepetition, vocabStorage } from '@/services/textbook-vocabulary';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import type { VocabularyItem } from '../types';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';

interface VocabularyLearningViewProps {
  textbook: string;
  onBack: () => void;
}

export function VocabularyLearningView({ textbook, onBack }: VocabularyLearningViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'study' | 'golden-time'>('grid');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [studyQueue, setStudyQueue] = useState<VocabularyItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ studied: 0, correct: 0 });

  // Subscription
  const { isPremium } = useSubscription2();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: vocabulary, loading, error } =
    useVocabularyData(textbook, selectedLesson || undefined);
  const { filteredVocab, filters, updateFilter } = useFilteredVocab(vocabulary);

  // Handle lesson selection with premium gating
  const handleLessonSelect = (lesson: number | null) => {
    if (lesson && !isPremium && lesson > 2) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedLesson(lesson);
  };

  // Initialize storage on mount
  useEffect(() => {
    vocabStorage.init().catch(console.error);
  }, []);

  const textbookMetadata = {
    'genki-1': {
      title: 'Genki 1',
      color: 'from-pink-400 to-purple-500',
      lessons: 12,
      lessonOffset: 0
    },
    'genki-2': {
      title: 'Genki 2',
      color: 'from-purple-400 to-indigo-500',
      lessons: 11,
      lessonOffset: 12  // Genki 2 starts at lesson 13
    },
    'minna-1': {
      title: 'Minna no Nihongo 1',
      color: 'from-green-400 to-teal-500',
      lessons: 25,
      lessonOffset: 0
    },
    'minna-2': {
      title: 'Minna no Nihongo 2',
      color: 'from-teal-400 to-blue-500',
      lessons: 25,
      lessonOffset: 0
    }
  };

  const currentTextbook = textbookMetadata[textbook as keyof typeof textbookMetadata];

  const handleStartStudy = async (cards: VocabularyItem[]) => {
    setStudyQueue(cards);
    setCurrentCardIndex(0);
    setViewMode('study');
    
    // Start a new study session
    try {
      const newSessionId = await vocabStorage.startStudySession(textbook);
      setSessionId(newSessionId);
      setSessionStats({ studied: 0, correct: 0 });
    } catch (error) {
      console.error('Failed to start study session:', error);
    }
  };

  const handleCardComplete = async (quality: number) => {
    const currentCard = studyQueue[currentCardIndex];
    
    // Process the review with spaced repetition
    try {
      await spacedRepetition.processReview(currentCard.id, quality, currentCard);
      
      // Update session stats
      const newStats = {
        studied: sessionStats.studied + 1,
        correct: sessionStats.correct + (quality >= 3 ? 1 : 0)
      };
      setSessionStats(newStats);
      
      // Update session in storage
      if (sessionId) {
        await vocabStorage.updateStudySession(sessionId, {
          cardsStudied: newStats.studied,
          cardsCorrect: newStats.correct,
          avgQuality: quality
        });
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
    
    if (currentCardIndex < studyQueue.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Study session complete
      if (sessionId) {
        await vocabStorage.updateStudySession(sessionId, {
          endTime: new Date()
        });
      }
      
      setViewMode('grid');
      setStudyQueue([]);
      setSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error loading vocabulary: {error.message}</p>
        <button onClick={onBack} className="mt-4 text-primary hover:underline">
          Go back
        </button>
      </div>
    );
  }

  // Handle empty textbooks gracefully
  if (!loading && vocabulary.length === 0 && !selectedLesson) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title={currentTextbook.title} />
        <div className="text-center p-8 mt-8">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-xl font-semibold mb-2">No Vocabulary Available</h2>
          <p className="text-gray-600 mb-6">
            {currentTextbook.title} doesn't have any vocabulary data yet.
          </p>
          <button 
            onClick={onBack} 
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            Choose Another Textbook
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Spacer for Virtual Companion */}
      <div className="h-20" />
      
      {/* Custom Header with Back and View Mode Toggle */}
      <header className="sticky top-0 z-10 bg-card shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Go back to textbook selection"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex-1">
              <h1 className="text-lg font-bold text-foreground">{currentTextbook.title}</h1>
              <p className="text-sm text-muted-foreground">
                {filteredVocab.length} words
                {selectedLesson && ` • Lesson ${selectedLesson}`}
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setViewMode('golden-time')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'golden-time' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Review
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200">
          <div 
            className={`h-full bg-gradient-to-r ${currentTextbook.color} transition-all duration-300`}
            style={{ width: '30%' }} // TODO: Calculate actual progress
          />
        </div>
      </header>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4"
          >
            <FilterPanel
              filters={filters}
              onFilterChange={updateFilter}
              textbook={textbook}
              totalLessons={currentTextbook.lessons}
              onLessonSelect={handleLessonSelect}
              selectedLesson={selectedLesson}
              isPremium={isPremium}
              onRequestUpgrade={() => setShowUpgradeModal(true)}
            />
            
            <VocabularyGrid
              vocabulary={filteredVocab}
              onStartStudy={handleStartStudy}
            />
          </motion.div>
        )}

        {viewMode === 'study' && studyQueue.length > 0 && (
          <motion.div
            key="study"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-8"
          >
            {/* Study Progress */}
            <div className="max-w-md mx-auto mb-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Exit Study
                </button>
              </div>
              <StudyProgress
                current={currentCardIndex + 1}
                total={studyQueue.length}
                correct={sessionStats.correct}
              />
            </div>

            <InteractiveCard
              word={studyQueue[currentCardIndex]}
              onComplete={handleCardComplete}
              mode="review"
            />
          </motion.div>
        )}

        {viewMode === 'golden-time' && (
          <motion.div
            key="golden-time"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4"
          >
            <GoldenTimeScheduler
              vocabulary={vocabulary}
              textbook={textbook}
              onStartReview={(cards) => handleStartStudy(cards)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeSlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message="Unlock lessons 3+ and more with Premium"
        feature="textbook_vocabulary_lessons"
      />

      {/* Bottom Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <ProgressTracker vocabulary={vocabulary} textbook={textbook} />
      </div>
    </div>
  );
}