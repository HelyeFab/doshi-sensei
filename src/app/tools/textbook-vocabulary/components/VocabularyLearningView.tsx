'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FilterPanel } from './FilterPanel';
import { VocabularyGrid } from './VocabularyGrid';
import { InteractiveCard } from './InteractiveCard';
import { GoldenTimeScheduler } from './GoldenTimeScheduler';
import { ProgressTracker } from './ProgressTracker';
import { StudyProgress } from './StudyProgress';
import { VocabularyCardModal } from './VocabularyCardModal';
import { WordLearningLessonSelector } from './WordLearningLessonSelector';
import { useVocabularyData } from '../hooks/useVocabularyData';
import { useFilteredVocab } from '../hooks/useFilteredVocab';
import { useStudySession } from '../hooks/useStudySession';
import { vocabStorage } from '@/services/textbook-vocabulary/client';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import type { VocabularyItem } from '../types';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { UpgradeSlideUpModal } from '@/components/UpgradeSlideUpModal';
import { TEXTBOOK_CONFIG } from '@/config/textbooks';
import { useErrorNotification, ERROR_MESSAGES } from '@/hooks/useErrorNotification';

interface VocabularyLearningViewProps {
  textbook: string;
  onBack: () => void;
  checkAndTrack: (feature: string) => Promise<boolean>;
}

export function VocabularyLearningView({ textbook, onBack, checkAndTrack }: VocabularyLearningViewProps) {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'study' | 'golden-time' | 'learn'>('grid');
  const [progressRefreshKey, setProgressRefreshKey] = useState(0);
  const [selectedCard, setSelectedCard] = useState<VocabularyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Subscription
  const { isPremium } = useSubscription2();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Error notification
  const { showError, ErrorNotificationDialog } = useErrorNotification();
  
  // Study session management
  const {
    studyQueue,
    currentCardIndex,
    sessionStats,
    isStudying,
    startStudySession,
    completeCard,
    endSession
  } = useStudySession();
  
  const { data: vocabulary, loading, error } =
    useVocabularyData(textbook, selectedLesson || undefined);
  const { filteredVocab, filters, updateFilter } = useFilteredVocab(vocabulary);

  // Handle lesson selection with premium gating
  const handleLessonSelect = (lesson: number | null) => {
    if (lesson && !isPremium && lesson > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson) {
      setShowUpgradeModal(true);
      return;
    }
    setSelectedLesson(lesson);
  };

  // Initialize storage on mount
  useEffect(() => {
    vocabStorage.init().catch(error => {
      console.error('Failed to initialize storage:', error);
      showError(ERROR_MESSAGES.LOAD_FAILED.title, ERROR_MESSAGES.LOAD_FAILED.message);
    });
  }, [showError]);

  const currentTextbook = TEXTBOOK_CONFIG.textbooks[textbook as keyof typeof TEXTBOOK_CONFIG.textbooks];

  const handleStartStudy = async (cards: VocabularyItem[]) => {
    console.log('Starting study session with cards:', cards);
    
    // Debug checkAndTrack
    console.log('checkAndTrack prop:', checkAndTrack);
    console.log('checkAndTrack type:', typeof checkAndTrack);
    
    if (!checkAndTrack || typeof checkAndTrack !== 'function') {
      console.error('checkAndTrack is not a function or is undefined');
      showError('Configuration Error', 'Access control is not properly configured. Please refresh the page.');
      return;
    }
    
    // FIRST check access and track usage
    const canAccess = await checkAndTrack('textbook_vocabulary');
    if (!canAccess) {
      console.log('Access denied - limit reached');
      return; // Modal shown automatically by checkAndTrack
    }
    
    try {
      // Close modal if open first
      setIsModalOpen(false);
      setSelectedCard(null);
      
      // Start the study session
      await startStudySession(cards, textbook);
      console.log('Study session started, view mode will be set by useEffect');
    } catch (error) {
      console.error('Failed to start study session:', error);
      showError(ERROR_MESSAGES.SESSION_START_FAILED.title, ERROR_MESSAGES.SESSION_START_FAILED.message);
    }
  };

  const handleCardClick = (card: VocabularyItem) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCard(null);
  };

  const handlePracticeThis = (card: VocabularyItem) => {
    handleStartStudy([card]);
  };

  const handleCardComplete = async (quality: number) => {
    try {
      await completeCard(quality);
    } catch (error) {
      console.error('Failed to save progress:', error);
      showError(ERROR_MESSAGES.SAVE_FAILED.title, ERROR_MESSAGES.SAVE_FAILED.message);
    }
  };
  
  // Watch for study session ending
  useEffect(() => {
    if (!isStudying && viewMode === 'study') {
      setViewMode('grid');
      // Refresh progress tracker
      setProgressRefreshKey(prev => prev + 1);
    }
  }, [isStudying, viewMode]);

  // Watch for study queue changes and switch to study view
  useEffect(() => {
    if (studyQueue.length > 0 && viewMode !== 'study') {
      console.log('Study queue populated, switching to study view');
      setViewMode('study');
    }
  }, [studyQueue.length, viewMode]);

  // Debug log for view mode and study queue
  useEffect(() => {
    console.log('Current state:', { 
      viewMode, 
      studyQueueLength: studyQueue.length, 
      isStudying,
      currentCardIndex,
      shouldShowStudyView: viewMode === 'study' && studyQueue.length > 0 && currentCardIndex < studyQueue.length
    });
  }, [viewMode, studyQueue.length, isStudying, currentCardIndex]);

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
        <SmartPageHeader 
          title={currentTextbook.title}
          customBackUrl="/"
        />
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

          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pb-2 overflow-x-auto">
          <div className="flex gap-1 p-1 bg-muted rounded-lg inline-flex min-w-full">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'grid' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Browse
            </button>
            <button
              onClick={() => setViewMode('learn')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'learn' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Study
            </button>
            <button
              onClick={() => setViewMode('golden-time')}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'golden-time' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Review
            </button>
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
              onCardClick={handleCardClick}
            />
          </motion.div>
        )}

        {viewMode === 'study' && studyQueue.length > 0 && currentCardIndex < studyQueue.length && (
          <motion.div
            key="study"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-8"
            onAnimationStart={() => console.log('Study view rendering with queue:', studyQueue)}
          >
            {/* Study Progress */}
            <div className="max-w-md mx-auto mb-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={async () => {
                    await endSession();
                    setViewMode('grid');
                  }}
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
              key={studyQueue[currentCardIndex].id}
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

        {viewMode === 'learn' && (
          <motion.div
            key="learn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-4"
          >
            <WordLearningLessonSelector
              textbook={textbook}
              currentTextbook={currentTextbook}
              selectedLesson={selectedLesson}
              onLessonSelect={handleLessonSelect}
              isPremium={isPremium}
              checkAndTrack={checkAndTrack}
              vocabulary={vocabulary}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upgrade Modal */}
      <UpgradeSlideUpModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        message="Unlock lessons 3+ and more with Premium"
        feature="textbook_vocabulary"
      />

      {/* Bottom Stats Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-primary/90 backdrop-blur-sm px-4 py-3">
        <ProgressTracker 
          vocabulary={vocabulary} 
          textbook={textbook} 
          refreshKey={progressRefreshKey}
        />
      </div>
      
      {/* Vocabulary Card Modal */}
      <VocabularyCardModal
        word={selectedCard}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onStartStudy={handlePracticeThis}
      />
      
      {/* Error Notification Dialog */}
      <ErrorNotificationDialog />
    </div>
  );
}