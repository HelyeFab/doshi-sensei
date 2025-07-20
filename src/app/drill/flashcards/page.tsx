'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, WordList } from '@/types';
import { useStrings } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { Analytics } from '@/utils/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import StudyListManager from '@/utils/studyListManager';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import { AnkiSRS, ReviewRating } from '@/utils/ankiSRS';
import { trackFlashcardReviewed, trackFlashcardSessionCompleted } from '@/lib/stats/trackingEvents';

// Structured Data for Flashcard Review Page
const flashcardReviewStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Flashcard Review - Spaced Repetition System",
  "description": "Interactive Japanese flashcard review with spaced repetition algorithm. Study vocabulary, kanji, and phrases efficiently with SRS-based learning.",
  "url": "https://doshisensei.com/drill/flashcards",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Flashcards",
  "about": {
    "@type": "Thing",
    "name": "Japanese Vocabulary",
    "description": "Japanese words, kanji, and phrases"
  },
  "teaches": [
    "Japanese vocabulary",
    "Kanji recognition",
    "Word meanings",
    "Reading comprehension",
    "Memory retention",
    "Spaced repetition",
    "JLPT vocabulary"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese flashcards",
    "spaced repetition",
    "SRS learning",
    "vocabulary review",
    "kanji flashcards",
    "JLPT flashcards",
    "Japanese memorization"
  ]
};

export default function FlashcardReviewPage() {
  const router = useRouter();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('flashcard_review');
  const { track } = useAnalytics();
  const { isPremium, userType } = useSubscription2();
  const strings = useStrings();

  // Review state
  const [cards, setCards] = useState<JapaneseWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState<'srs' | 'random' | 'lists'>('srs');
  const [cardOrder, setCardOrder] = useState<'sequential' | 'random'>('sequential');
  const [flipDirection, setFlipDirection] = useState<'japanese-english' | 'english-japanese' | 'mixed'>('japanese-english');
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);

  // Load user's word lists on mount
  useEffect(() => {
    if (user) {
      loadUserLists();
    }
  }, [user]);

  const loadUserLists = async () => {
    try {
      const studyLists = await StudyListManager.getAllStudyLists();
      
      // Convert to legacy WordList format for compatibility
      const legacyWordLists: WordList[] = studyLists.map(list => ({
        id: list.id,
        name: list.name,
        description: list.description,
        wordIds: list.itemIds,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
        color: list.color,
        isConjugable: false
      }));
      
      setWordLists(legacyWordLists);
    } catch (error) {
      console.error('Error loading word lists:', error);
    }
  };

  const loadCardsForReview = async () => {
    try {
      setLoading(true);
      let reviewCards: JapaneseWord[] = [];

      if (reviewMode === 'srs') {
        // Load cards due for SRS review
        // TODO: Implement SRS loading using AnkiSRS
        // For now, load all cards from lists
        const allLists = await StudyListManager.getAllStudyLists();
        for (const list of allLists) {
          const { words, ankiCards } = await StudyListManager.getItemsInList(list.id);
          const ankiAsWords = ankiCards.map(card => ({
            id: card.id,
            itemType: 'anki_card' as const,
            ankiData: card.ankiData,
            kanji: card.ankiData?.front || '',
            kana: '',
            meaning: card.ankiData?.back || '',
            type: 'anki' as any
          }));
          reviewCards = [...reviewCards, ...words, ...ankiAsWords];
        }
      } else if (reviewMode === 'lists' && selectedLists.length > 0) {
        // Load cards from selected lists
        for (const listId of selectedLists) {
          const { words, ankiCards } = await StudyListManager.getItemsInList(listId);
          // Convert words to flashcard format
          const wordCards = words;
          // Convert anki cards to flashcard format
          const ankiFlashcards = ankiCards.map(card => ({
            id: card.id,
            itemType: 'anki_card' as const,
            ankiData: card.ankiData,
            // Add basic fields for compatibility
            kanji: card.ankiData?.front || '',
            kana: '',
            meaning: card.ankiData?.back || '',
            type: 'anki' as any
          }));
          reviewCards = [...reviewCards, ...wordCards, ...ankiFlashcards];
        }
      } else if (reviewMode === 'random') {
        // Load random cards from user's saved words
        const allLists = await StudyListManager.getAllStudyLists();
        let allWords: JapaneseWord[] = [];
        
        for (const list of allLists) {
          const { words, ankiCards } = await StudyListManager.getItemsInList(list.id);
          // Include anki cards converted to word format
          const ankiAsWords = ankiCards.map(card => ({
            id: card.id,
            itemType: 'anki_card' as const,
            ankiData: card.ankiData,
            kanji: card.ankiData?.front || '',
            kana: '',
            meaning: card.ankiData?.back || '',
            type: 'anki' as any
          }));
          allWords = [...allWords, ...words, ...ankiAsWords];
        }
        
        // Shuffle and take first 20
        reviewCards = allWords
          .sort(() => Math.random() - 0.5)
          .slice(0, 20);
      }

      // Apply card order
      if (cardOrder === 'random') {
        reviewCards = reviewCards.sort(() => Math.random() - 0.5);
      }

      setCards(reviewCards);
      setLoading(false);
    } catch (error) {
      console.error('Error loading cards:', error);
      setLoading(false);
    }
  };

  const startSession = async () => {
    const canProceed = await checkAndTrack('flashcard_review');
    if (!canProceed) return;

    Analytics.track('flashcard_session_started', {
      mode: reviewMode,
      selectedLists: selectedLists.length,
      flipDirection,
      cardOrder
    });
    
    // Track in new analytics system
    track('flashcard_session_started', {
      mode: reviewMode,
      selectedLists: selectedLists.length,
      flipDirection,
      cardOrder
    });
    console.log('📊 [Analytics] Flashcard session started:', { mode: reviewMode, lists: selectedLists.length });

    setSessionStarted(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionStats({
      reviewed: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0
    });

    await loadCardsForReview();
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleRating = async (rating: ReviewRating) => {
    const currentCard = cards[currentCardIndex];
    
    // Update SRS data if in SRS mode
    if (reviewMode === 'srs' && currentCard) {
      // TODO: Update SRS data using AnkiSRS
      // For now, we'll need to store SRS data with the card
      // await updateCardSRSData(currentCard, rating);
    }

    // Update session stats
    const newStats = { ...sessionStats };
    newStats.reviewed++;
    
    if (rating === 'easy' || rating === 'good') {
      newStats.correct++;
    } else {
      newStats.incorrect++;
    }
    
    setSessionStats(newStats);

    // Track review
    trackFlashcardReviewed(
      user?.uid || 'anonymous',
      currentCard.id,
      rating === 'easy' || rating === 'good'
    );

    // Move to next card
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Session complete
      trackFlashcardSessionCompleted(
        user?.uid || 'anonymous',
        newStats.reviewed,
        newStats.correct
      );
      
      Analytics.track('flashcard_session_completed', {
        ...newStats,
        accuracy: (newStats.correct / newStats.reviewed) * 100,
        mode: reviewMode
      });
      
      // Track in new analytics system
      track('flashcard_session_completed', {
        reviewed: newStats.reviewed,
        correct: newStats.correct,
        accuracy: (newStats.correct / newStats.reviewed) * 100,
        mode: reviewMode
      });
      console.log('📊 [Analytics] Flashcard session completed:', { 
        reviewed: newStats.reviewed, 
        correct: newStats.correct, 
        accuracy: Math.round((newStats.correct / newStats.reviewed) * 100) 
      });
    }
  };

  const handleSkip = () => {
    setSessionStats({
      ...sessionStats,
      skipped: sessionStats.skipped + 1
    });

    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const handleBackToSetup = () => {
    setSessionStarted(false);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionStats({
      reviewed: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0
    });
  };

  const handleSaveWord = (word: JapaneseWord) => {
    setWordToSave(word);
    setShowSaveModal(true);
  };

  // Determine card display based on flip direction
  const getCardDisplay = (card: any, side: 'front' | 'back') => {
    // Handle Anki cards
    if (card.itemType === 'anki_card' && card.ankiData) {
      return side === 'front' ? card.ankiData.front : card.ankiData.back;
    }
    
    // Handle regular cards
    let showJapanese = flipDirection === 'japanese-english';
    
    if (flipDirection === 'mixed') {
      // 50/50 chance to flip
      showJapanese = Math.random() > 0.5;
    }

    if (side === 'front') {
      return showJapanese
        ? { primary: card.kanji || card.kana, secondary: card.kana, type: 'japanese' }
        : { primary: card.meaning, secondary: '', type: 'english' };
    } else {
      return showJapanese
        ? { primary: card.meaning, secondary: '', type: 'english' }
        : { primary: card.kanji || card.kana, secondary: card.kana, type: 'japanese' };
    }
  };

  if (!sessionStarted) {
    return (
      <>
        {/* Virtual Companion Section */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(flashcardReviewStructuredData),
            }}
          />

          <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
            <PageHeader 
              title="Flashcard Review" 
              helpKey="flashcards" 
              showBackButton={true} 
              onBackClick={() => router.push('/practice')} 
            />

            {/* Target Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <span className="text-2xl">🎴</span>
              </div>
            </div>

            <p className="text-muted-foreground mb-8 text-center max-w-2xl mx-auto">
              {strings.flashcards?.description || "Review your saved vocabulary with spaced repetition. Choose your review mode and settings to begin."}
            </p>

            {/* Review Mode Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Review Mode</h3>
              <div className="grid grid-cols-3 gap-4 max-w-2xl">
                <button
                  onClick={() => setReviewMode('srs')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reviewMode === 'srs'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">🧠</div>
                  <div className="font-medium">SRS Review</div>
                  <div className="text-sm text-muted-foreground">
                    Due cards only
                  </div>
                </button>
                
                <button
                  onClick={() => setReviewMode('random')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reviewMode === 'random'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">🎲</div>
                  <div className="font-medium">Random</div>
                  <div className="text-sm text-muted-foreground">
                    All saved words
                  </div>
                </button>
                
                <button
                  onClick={() => setReviewMode('lists')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reviewMode === 'lists'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">📋</div>
                  <div className="font-medium">From Lists</div>
                  <div className="text-sm text-muted-foreground">
                    Choose lists
                  </div>
                </button>
              </div>
            </div>

            {/* List Selection for Lists Mode */}
            {reviewMode === 'lists' && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Select Lists</h3>
                {wordLists.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {wordLists.map(list => (
                      <label key={list.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedLists.includes(list.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLists([...selectedLists, list.id]);
                            } else {
                              setSelectedLists(selectedLists.filter(id => id !== list.id));
                            }
                          }}
                          className="rounded border-border"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                          <span>{list.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({list.wordIds.length} words)
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No word lists found. Save some words first!
                  </p>
                )}
              </div>
            )}

            {/* Settings */}
            <div className="space-y-6 mb-8">
              {/* Card Order */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Card Order</h3>
                <div className="flex gap-2">
                  {(['sequential', 'random'] as const).map((order) => (
                    <button
                      key={order}
                      onClick={() => setCardOrder(order)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        cardOrder === order
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      {order === 'sequential' ? 'Sequential' : 'Random'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flip Direction */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Card Direction</h3>
                <div className="flex gap-2 flex-wrap">
                  {(['japanese-english', 'english-japanese', 'mixed'] as const).map((direction) => (
                    <button
                      key={direction}
                      onClick={() => setFlipDirection(direction)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        flipDirection === direction
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                    >
                      {direction === 'japanese-english' ? '日→En' :
                       direction === 'english-japanese' ? 'En→日' : 'Mixed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={startSession}
                disabled={reviewMode === 'lists' && selectedLists.length === 0}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Review
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

  // Review screen
  const currentCard = cards[currentCardIndex];
  const isSessionComplete = currentCardIndex >= cards.length - 1 && showAnswer;
  const progress = ((currentCardIndex + (showAnswer ? 1 : 0)) / cards.length) * 100;

  return (
    <>
      {/* Virtual Companion Section */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <main className="max-w-3xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                Card {currentCardIndex + 1} of {cards.length}
              </span>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">✓ {sessionStats.correct}</span>
                <span className="text-red-600">✗ {sessionStats.incorrect}</span>
                <span className="text-muted-foreground">→ {sessionStats.skipped}</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cards...</p>
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No cards to review.</p>
              <button
                onClick={handleBackToSetup}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Setup
              </button>
            </div>
          ) : isSessionComplete ? (
            <div className="text-center py-12">
              <h2 className="text-3xl font-bold mb-4">Session Complete!</h2>
              <div className="text-6xl mb-6">
                {sessionStats.correct >= sessionStats.reviewed * 0.8 ? '🎉' : 
                 sessionStats.correct >= sessionStats.reviewed * 0.6 ? '👍' : '💪'}
              </div>
              <div className="space-y-2 mb-8">
                <p className="text-lg">
                  Reviewed: {sessionStats.reviewed} cards
                </p>
                <p className="text-lg text-green-600">
                  Correct: {sessionStats.correct}
                </p>
                <p className="text-lg text-red-600">
                  Incorrect: {sessionStats.incorrect}
                </p>
                {sessionStats.skipped > 0 && (
                  <p className="text-lg text-muted-foreground">
                    Skipped: {sessionStats.skipped}
                  </p>
                )}
                <p className="text-xl font-semibold mt-4">
                  Accuracy: {Math.round((sessionStats.correct / sessionStats.reviewed) * 100)}%
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setCurrentCardIndex(0);
                    setShowAnswer(false);
                    setSessionStats({
                      reviewed: 0,
                      correct: 0,
                      incorrect: 0,
                      skipped: 0
                    });
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Review Again
                </button>
                <button
                  onClick={handleBackToSetup}
                  className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                >
                  New Session
                </button>
              </div>
            </div>
          ) : currentCard ? (
            <>
              {/* Flashcard */}
              <div className="bg-card border border-border rounded-lg p-8 mb-6 min-h-[400px] flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    {/* Card Front */}
                    {!showAnswer && (
                      <div className="text-center py-12">
                        {(() => {
                          const display = getCardDisplay(currentCard, 'front');
                          return display.type === 'japanese' ? (
                            <>
                              <h2 className="text-5xl japanese-text font-medium mb-4">
                                {display.primary}
                              </h2>
                              {display.secondary && (
                                <p className="text-2xl japanese-text text-muted-foreground">
                                  {display.secondary}
                                </p>
                              )}
                            </>
                          ) : (
                            <h2 className="text-3xl font-medium">
                              {display.primary}
                            </h2>
                          );
                        })()}
                      </div>
                    )}

                    {/* Card Back */}
                    {showAnswer && (
                      <div className="text-center py-8">
                        {(() => {
                          const frontDisplay = getCardDisplay(currentCard, 'front');
                          const backDisplay = getCardDisplay(currentCard, 'back');
                          return (
                            <>
                              {/* Show front content smaller */}
                              <div className="mb-8 opacity-70">
                                {frontDisplay.type === 'japanese' ? (
                                  <>
                                    <h3 className="text-3xl japanese-text font-medium mb-2">
                                      {frontDisplay.primary}
                                    </h3>
                                    {frontDisplay.secondary && (
                                      <p className="text-xl japanese-text text-muted-foreground">
                                        {frontDisplay.secondary}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <h3 className="text-2xl font-medium">
                                    {frontDisplay.primary}
                                  </h3>
                                )}
                              </div>

                              {/* Divider */}
                              <div className="w-24 h-px bg-border mx-auto mb-8"></div>

                              {/* Show back content */}
                              {backDisplay.type === 'japanese' ? (
                                <>
                                  <h2 className="text-4xl japanese-text font-medium mb-3">
                                    {backDisplay.primary}
                                  </h2>
                                  {backDisplay.secondary && (
                                    <p className="text-2xl japanese-text text-muted-foreground mb-3">
                                      {backDisplay.secondary}
                                    </p>
                                  )}
                                </>
                              ) : (
                                <h2 className="text-3xl font-medium mb-3">
                                  {backDisplay.primary}
                                </h2>
                              )}

                              {/* Additional info */}
                              {currentCard.type && (
                                <p className="text-sm text-muted-foreground">
                                  Type: {currentCard.type}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  
                  {/* Save button */}
                  <button
                    onClick={() => handleSaveWord(currentCard)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Save to list"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto">
                  {!showAnswer ? (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleShowAnswer}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Show Answer
                      </button>
                      <button
                        onClick={handleSkip}
                        className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
                      >
                        Skip
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-center text-sm text-muted-foreground mb-4">
                        How well did you know this?
                      </p>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleRating('again')}
                          className="px-4 py-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          Again
                        </button>
                        <button
                          onClick={() => handleRating('hard')}
                          className="px-4 py-2 bg-orange-500/10 text-orange-600 rounded-lg hover:bg-orange-500/20 transition-colors"
                        >
                          Hard
                        </button>
                        <button
                          onClick={() => handleRating('good')}
                          className="px-4 py-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          Good
                        </button>
                        <button
                          onClick={() => handleRating('easy')}
                          className="px-4 py-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors"
                        >
                          Easy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </main>
      </div>

      {/* Save Word Modal */}
      {showSaveModal && wordToSave && (
        <SaveWordModal
          word={wordToSave}
          onClose={() => {
            setShowSaveModal(false);
            setWordToSave(null);
          }}
        />
      )}
    </>
  );
}