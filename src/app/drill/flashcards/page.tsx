'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, WordList } from '@/types';
import { Upload, Settings, ChevronDown, Volume2, Keyboard, BarChart3, BookOpen, Zap, Clock, Hash } from 'lucide-react';
import { useStrings } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/PageHeader';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useAnalytics } from '@/hooks/useAnalytics';
import StudyListManager from '@/utils/studyListManager';
import { SaveWordModal } from '@/components/drill/SaveWordModal';
import { AnkiSRSImproved, ReviewRating, AnkiSRSData, AnkiConfig, DEFAULT_ANKI_CONFIG } from '@/utils/ankiSRSImproved';
import { trackFlashcardReviewed, trackFlashcardSessionCompleted } from '@/lib/stats/trackingEvents';
import { flashcardSRSManager } from '@/utils/flashcardSRSManager';
import { AnkiImportModal } from '@/components/anki/AnkiImportModal';
import { FlashcardDisplay } from '@/components/flashcards/FlashcardDisplay';
import { SessionStats } from '@/components/flashcards/SessionStats';
import { CardSettingsModal } from '@/components/flashcards/CardSettingsModal';
import { speakJapanese } from '@/utils/speech';
import { getKanjiAudioPath } from '@/utils/kanjiAudio';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import TTSManager from '@/utils/tts';
import { useTTS } from '@/hooks/useTTS';

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

interface CardSettings {
  dailyNewCards: number;
  dailyReviewCards: number;
  cardOrder: 'sequential' | 'random' | 'srs';
  flipDirection: 'japanese-english' | 'english-japanese' | 'mixed';
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  autoPlayAudio: boolean;
  showFurigana: boolean;
  showCardType: boolean;
  focusMode: 'standard' | 'weakest' | 'oldest';
}

const DEFAULT_CARD_SETTINGS: CardSettings = {
  dailyNewCards: 20,
  dailyReviewCards: 100,
  cardOrder: 'srs',
  flipDirection: 'japanese-english',
  fontSize: 'medium',
  autoPlayAudio: false,
  showFurigana: false,
  showCardType: true,
  focusMode: 'standard'
};

export default function FlashcardReviewPage() {
  const router = useRouter();
  const { settings, isLoading: settingsLoading } = useSettings();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('flashcard_review');
  const { track } = useAnalytics();
  const { isPremium, userType, subscription } = useSubscription2();
  const strings = useStrings();
  const { speak: speakTTS, state: ttsState } = useTTS();

  // Review state
  const [cards, setCards] = useState<JapaneseWord[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [reviewMode, setReviewMode] = useState<'srs' | 'random' | 'lists'>('srs');
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    timeSpent: 0,
    startTime: Date.now()
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCardSettings, setShowCardSettings] = useState(false);
  const cardSettingsRef = useRef<HTMLDivElement>(null);
  const [srsConfig, setSrsConfig] = useState<AnkiConfig>(DEFAULT_ANKI_CONFIG);
  const srsAlgorithm = useRef(new AnkiSRSImproved(srsConfig));
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    loading: false,
    onConfirm: () => { },
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    isDestructive: false
  });
  
  // Card settings
  const [cardSettings, setCardSettings] = useState<CardSettings>(DEFAULT_CARD_SETTINGS);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Update SRS algorithm when config changes
  useEffect(() => {
    srsAlgorithm.current = new AnkiSRSImproved(srsConfig);
  }, [srsConfig]);
  
  // Debug confirmDialog state changes
  useEffect(() => {
    console.log('confirmDialog state changed:', confirmDialog);
  }, [confirmDialog]);
  
  // SRS data map
  const [srsDataMap, setSrsDataMap] = useState<Map<string, AnkiSRSData>>(new Map());
  const [lastRatedCard, setLastRatedCard] = useState<{cardId: string, previousData: AnkiSRSData} | null>(null);
  
  // Initialize SRS manager
  useEffect(() => {
    if (user) {
      flashcardSRSManager.setUser(user.uid, isPremium);
    }
  }, [user, isPremium]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!sessionStarted) return;
    
    const handleKeyPress = async (e: KeyboardEvent) => {
      switch(e.key) {
        case ' ':
          e.preventDefault();
          if (!showAnswer) {
            handleShowAnswer();
          } else {
            await handleRating('good');
          }
          break;
        case '1':
          if (showAnswer) await handleRating('again');
          break;
        case '2':
          if (showAnswer) await handleRating('hard');
          break;
        case '3':
          if (showAnswer) await handleRating('good');
          break;
        case '4':
          if (showAnswer) await handleRating('easy');
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          await handleUndo();
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          const currentCard = cards[currentCardIndex];
          if (currentCard) {
            await playCardAudio(currentCard, showAnswer ? 'back' : 'front');
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sessionStarted, showAnswer, currentCardIndex, cards]);

  // Load user's word lists on mount and initialize TTS
  useEffect(() => {
    if (user) {
      loadUserLists();
    }
    
    // Initialize TTS Manager
    TTSManager.initialize();
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardSettingsRef.current && !cardSettingsRef.current.contains(event.target as Node)) {
        setShowCardSettings(false);
      }
    };

    if (showCardSettings) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCardSettings]);
  
  // Load saved settings
  useEffect(() => {
    const savedCardSettings = localStorage.getItem('flashcardSettings');
    if (savedCardSettings) {
      setCardSettings(JSON.parse(savedCardSettings));
    }
    
    const savedSRSConfig = localStorage.getItem('srsConfig');
    if (savedSRSConfig) {
      setSrsConfig(JSON.parse(savedSRSConfig));
    }
  }, []);
  
  // Save card settings
  const updateCardSettings = (newSettings: Partial<CardSettings>) => {
    const updated = { ...cardSettings, ...newSettings };
    setCardSettings(updated);
    localStorage.setItem('flashcardSettings', JSON.stringify(updated));
  };

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
  
  const loadSRSData = async (cards: JapaneseWord[]) => {
    try {
      const cardIds = cards.map(card => card.id);
      const loadedData = await flashcardSRSManager.loadSRSData(cardIds);
      
      // Initialize SRS data for new cards
      const newMap = new Map(loadedData);
      cards.forEach(card => {
        if (!newMap.has(card.id)) {
          newMap.set(card.id, srsAlgorithm.current.createInitialData());
        }
      });
      
      setSrsDataMap(newMap);
    } catch (error) {
      console.error('Failed to load SRS data:', error);
      // Initialize with empty data on error
      const newMap = new Map<string, AnkiSRSData>();
      cards.forEach(card => {
        newMap.set(card.id, srsAlgorithm.current.createInitialData());
      });
      setSrsDataMap(newMap);
    }
  };

  const loadCardsForReview = async () => {
    try {
      setLoading(true);
      setError(null);
      let reviewCards: JapaneseWord[] = [];

      if (reviewMode === 'srs') {
        // Load all cards and filter by SRS due date
        const allLists = await StudyListManager.getAllStudyLists();
        let allCards: JapaneseWord[] = [];
        
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
          allCards = [...allCards, ...words, ...ankiAsWords];
        }
        
        // Load SRS data
        await loadSRSData(allCards);
        
        // Filter cards by due date and limits
        const now = new Date();
        const dueCards = allCards.filter(card => {
          const srsData = srsDataMap.get(card.id);
          return srsData && srsData.due <= now;
        });
        
        // Apply daily limits
        const newCards = dueCards.filter(card => {
          const srsData = srsDataMap.get(card.id);
          return srsData?.status === 'new';
        }).slice(0, cardSettings.dailyNewCards);
        
        const reviewCardsOnly = dueCards.filter(card => {
          const srsData = srsDataMap.get(card.id);
          return srsData?.status !== 'new';
        }).slice(0, cardSettings.dailyReviewCards);
        
        reviewCards = [...newCards, ...reviewCardsOnly];
        
        // Apply focus mode
        if (cardSettings.focusMode === 'weakest') {
          reviewCards.sort((a, b) => {
            const aData = srsDataMap.get(a.id);
            const bData = srsDataMap.get(b.id);
            return (bData?.lapses || 0) - (aData?.lapses || 0);
          });
        } else if (cardSettings.focusMode === 'oldest') {
          reviewCards.sort((a, b) => {
            const aData = srsDataMap.get(a.id);
            const bData = srsDataMap.get(b.id);
            return (aData?.lastReview?.getTime() || 0) - (bData?.lastReview?.getTime() || 0);
          });
        }
      } else if (reviewMode === 'lists' && selectedLists.length > 0) {
        // Load cards from selected lists
        for (const listId of selectedLists) {
          const { words, ankiCards } = await StudyListManager.getItemsInList(listId);
          const ankiFlashcards = ankiCards.map(card => ({
            id: card.id,
            itemType: 'anki_card' as const,
            ankiData: card.ankiData,
            kanji: card.ankiData?.front || '',
            kana: '',
            meaning: card.ankiData?.back || '',
            type: 'anki' as any
          }));
          reviewCards = [...reviewCards, ...words, ...ankiFlashcards];
        }
        await loadSRSData(reviewCards);
      } else if (reviewMode === 'random') {
        // Load random cards from user's saved words
        const allLists = await StudyListManager.getAllStudyLists();
        let allWords: JapaneseWord[] = [];
        
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
          allWords = [...allWords, ...words, ...ankiAsWords];
        }
        
        await loadSRSData(allWords);
        
        // Shuffle and take daily limit
        reviewCards = allWords
          .sort(() => Math.random() - 0.5)
          .slice(0, cardSettings.dailyNewCards + cardSettings.dailyReviewCards);
      }

      // Apply card order
      if (cardSettings.cardOrder === 'random') {
        reviewCards = reviewCards.sort(() => Math.random() - 0.5);
      } else if (cardSettings.cardOrder === 'srs') {
        // Sort by interval (shorter intervals first)
        reviewCards.sort((a, b) => {
          const aData = srsDataMap.get(a.id);
          const bData = srsDataMap.get(b.id);
          return (aData?.interval || 0) - (bData?.interval || 0);
        });
      }

      setCards(reviewCards);
      setLoading(false);
      
      // Run cleanup in background for premium users
      if (isPremium && Math.random() < 0.1) { // 10% chance to run cleanup
        flashcardSRSManager.cleanupOldData().then(deleted => {
          if (deleted > 0) {
            console.log(`Cleaned up ${deleted} old SRS records`);
          }
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      setError('Failed to load cards. Please try again.');
      setLoading(false);
    }
  };

  const handleListDelete = async (listId: string) => {
    console.log('handleListDelete called with listId:', listId);
    console.log('Full strings object:', strings);
    console.log('confirmDialog state before:', confirmDialog);
    
    setConfirmDialog({
      isOpen: true,
      loading: false,
      title: strings.tooltips?.deleteList || strings.common?.deleteList || 'Delete List',
      message: strings.favourites?.lists?.deleteConfirmation || strings.common?.deleteListConfirmation || 'Are you sure you want to delete this list? This action cannot be undone.',
      confirmText: strings.tooltips?.delete || strings.common?.delete || 'Delete',
      cancelText: strings.tooltips?.cancel || strings.common?.cancel || 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, loading: true }));
        try {
          await StudyListManager.deleteStudyList(listId, user, subscription?.status);
          setWordLists(prev => prev.filter(list => list.id !== listId));
          // Remove from selected lists if it was selected
          setSelectedLists(prev => prev.filter(id => id !== listId));
        } catch (error) {
          console.error('Error deleting list:', error);
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  const startSession = async () => {
    const canProceed = await checkAndTrack('flashcard_review');
    if (!canProceed) return;

    // Track in new analytics system
    track('flashcard_session_started', {
      mode: reviewMode,
      selectedLists: selectedLists.length,
      flipDirection: cardSettings.flipDirection,
      cardOrder: cardSettings.cardOrder,
      dailyNewCards: cardSettings.dailyNewCards,
      dailyReviewCards: cardSettings.dailyReviewCards
    });

    setSessionStarted(true);
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionStats({
      reviewed: 0,
      correct: 0,
      incorrect: 0,
      skipped: 0,
      timeSpent: 0,
      startTime: Date.now()
    });

    await loadCardsForReview();
  };

  const handleShowAnswer = async () => {
    setShowAnswer(true);
    
    // Auto-play audio if enabled
    if (cardSettings.autoPlayAudio) {
      const currentCard = cards[currentCardIndex];
      if (currentCard) {
        await playCardAudio(currentCard, 'back');
      }
    }
  };
  
  const playCardAudio = async (card: any, side: 'front' | 'back') => {
    try {
      let textToSpeak = '';
      let context = 'flashcard';
      let provider: 'google' | 'elevenlabs' | undefined;
      
      if (card.itemType === 'anki_card' && card.ankiData) {
        textToSpeak = side === 'front' ? card.ankiData.front : card.ankiData.back;
        // Strip HTML for TTS
        textToSpeak = textToSpeak.replace(/<[^>]*>/g, '').trim();
        
        // Use ElevenLabs for longer content (sentences)
        if (textToSpeak.length > 30 || textToSpeak.includes('。') || textToSpeak.includes('、')) {
          provider = 'elevenlabs';
          context = 'sentence';
        }
      } else {
        const display = getCardDisplay(card, side);
        if (display.type === 'japanese') {
          textToSpeak = display.primary;
          
          // Determine context based on content
          // Single kanji
          if (textToSpeak.length === 1 && /[\u4e00-\u9faf]/.test(textToSpeak)) {
            context = 'kanji';
          }
          // Kana only
          else if (/^[\u3040-\u309f\u30a0-\u30ff]+$/.test(textToSpeak)) {
            context = 'kana';
          }
          // Mixed or longer content
          else if (textToSpeak.length > 10) {
            provider = 'elevenlabs';
            context = 'sentence';
          } else {
            context = 'vocabulary';
          }
        } else {
          // For English text, skip TTS
          console.log('Skipping TTS for English text');
          return;
        }
      }
      
      if (!textToSpeak) return;
      
      // Use the TTS hook with proper context and provider
      // The TTS system will automatically check for local audio first
      await speakTTS(textToSpeak, {
        voice: 'female',
        speed: 1.0,
        context: context,
        provider: provider
      });
      
      console.log(`🎵 Playing audio for ${context}: "${textToSpeak.substring(0, 30)}${textToSpeak.length > 30 ? '...' : ''}"`);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleRating = async (rating: ReviewRating) => {
    const currentCard = cards[currentCardIndex];
    
    // Update SRS data
    if (currentCard) {
      const currentSRS = srsDataMap.get(currentCard.id) || srsAlgorithm.current.createInitialData();
      const updatedSRS = srsAlgorithm.current.calculateNextReview(currentSRS, rating);
      
      // Store for undo
      setLastRatedCard({ cardId: currentCard.id, previousData: currentSRS });
      
      // Update local state
      const newMap = new Map(srsDataMap);
      newMap.set(currentCard.id, updatedSRS);
      setSrsDataMap(newMap);
      
      // Save to storage
      try {
        await flashcardSRSManager.saveSRSData(currentCard.id, updatedSRS, currentSRS);
      } catch (error) {
        console.error('Failed to save SRS data:', error);
      }
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
      const totalTime = Date.now() - newStats.startTime;
      trackFlashcardSessionCompleted(
        user?.uid || 'anonymous',
        newStats.reviewed,
        newStats.correct
      );
      
      // Track in new analytics system
      track('flashcard_session_completed', {
        reviewed: newStats.reviewed,
        correct: newStats.correct,
        accuracy: (newStats.correct / newStats.reviewed) * 100,
        mode: reviewMode,
        timeSpent: Math.round(totalTime / 1000) // seconds
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
      skipped: 0,
      timeSpent: 0,
      startTime: Date.now()
    });
    setLastRatedCard(null);
  };
  
  const handleUndo = async () => {
    if (!flashcardSRSManager.canUndo() || !lastRatedCard) return;
    
    try {
      const result = await flashcardSRSManager.undoLastRating();
      if (result) {
        // Update local state
        const newMap = new Map(srsDataMap);
        newMap.set(result.cardId, result.srsData);
        setSrsDataMap(newMap);
        
        // Go back to previous card
        if (currentCardIndex > 0) {
          setCurrentCardIndex(currentCardIndex - 1);
          setShowAnswer(false);
          
          // Update stats
          setSessionStats(prev => ({
            ...prev,
            reviewed: Math.max(0, prev.reviewed - 1),
            correct: Math.max(0, prev.correct - (lastRatedCard ? 1 : 0)),
            incorrect: Math.max(0, prev.incorrect - (lastRatedCard ? 0 : 1))
          }));
        }
        
        setLastRatedCard(null);
        track('flashcard_undo_used');
      }
    } catch (error) {
      console.error('Failed to undo:', error);
    }
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
    let showJapanese = cardSettings.flipDirection === 'japanese-english';
    
    if (cardSettings.flipDirection === 'mixed') {
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
        {/* Gradient Header Section */}
        <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />
          {/* Gradient to White Fade */}
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />
        </div>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8 -mt-20">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(flashcardReviewStructuredData),
            }}
          />

          <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe relative z-10">
            <PageHeader 
              title="Flashcard Review" 
              helpKey="flashcards" 
              showBackButton={true} 
              onBackClick={() => router.push('/practice')} 
            />

            {/* Target Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                <img 
                  src="/flat-icons/ui/flash-card.svg" 
                  alt="Flashcards" 
                  className="w-8 h-8"
                />
              </div>
            </div>

            <p className="text-muted-foreground mb-8 text-center max-w-2xl mx-auto">
              {strings.flashcards?.description || "Review your saved vocabulary with spaced repetition. Choose your review mode and settings to begin."}
            </p>

            {/* Card Settings and Import */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-8">
              <button
                onClick={() => {
                  console.log('Import button clicked');
                  setShowImportModal(true);
                }}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Anki Deck
              </button>
              
              {/* Settings Button */}
              <button
                onClick={() => setShowCardSettings(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive max-w-2xl mx-auto">
                <p className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </p>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {loading ? '...' : srsDataMap.size > 0 ? Array.from(srsDataMap.values()).filter(d => d.due <= new Date()).length : 0}
                </div>
                <div className="text-xs text-muted-foreground">Due Today</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Hash className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {cardSettings.dailyNewCards}
                </div>
                <div className="text-xs text-muted-foreground">New Cards/Day</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {cardSettings.dailyReviewCards}
                </div>
                <div className="text-xs text-muted-foreground">Reviews/Day</div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {wordLists.reduce((sum, list) => sum + list.wordIds.length, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Cards</div>
              </div>
            </div>

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
                      <div key={list.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 group">
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
                        <label className="flex items-center gap-2 flex-1 cursor-pointer">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                          <span>{list.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({list.wordIds.length} words)
                          </span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Delete button clicked for list:', list.id, list.name);
                            handleListDelete(list.id);
                          }}
                          className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Delete list"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No word lists found. Save some words first!
                  </p>
                )}
              </div>
            )}

            {/* Keyboard Shortcuts */}
            <div className="mb-8 max-w-2xl mx-auto">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Keyboard className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Keyboard Shortcuts</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><kbd className="px-2 py-1 bg-purple-400 dark:bg-purple-600 text-white rounded font-medium">Space</kbd> Show/Next</div>
                  <div><kbd className="px-2 py-1 bg-red-400 dark:bg-red-600 text-white rounded font-medium">1</kbd> Again</div>
                  <div><kbd className="px-2 py-1 bg-orange-400 dark:bg-orange-600 text-white rounded font-medium">2</kbd> Hard</div>
                  <div><kbd className="px-2 py-1 bg-blue-400 dark:bg-blue-600 text-white rounded font-medium">3</kbd> Good</div>
                  <div><kbd className="px-2 py-1 bg-green-400 dark:bg-green-600 text-white rounded font-medium">4</kbd> Easy</div>
                  <div><kbd className="px-2 py-1 bg-pink-400 dark:bg-pink-600 text-white rounded font-medium">A</kbd> Audio</div>
                  <div><kbd className="px-2 py-1 bg-slate-400 dark:bg-slate-600 text-white rounded font-medium">Z</kbd> Undo</div>
                  <div><kbd className="px-2 py-1 bg-amber-400 dark:bg-amber-600 text-white rounded font-medium">S</kbd> Suspend</div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center">
              <button
                onClick={startSession}
                disabled={reviewMode === 'lists' && selectedLists.length === 0}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Review
              </button>
            </div>
          </main>
        </div>

        {/* Import Anki Modal */}
        {showImportModal && (
          <AnkiImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImportSuccess={() => {
              loadUserLists();
              console.log('Reloading lists after Anki import...');
            }}
          />
        )}
        
        {/* Card Settings Modal */}
        {showCardSettings && (
          <CardSettingsModal
            isOpen={showCardSettings}
            onClose={() => setShowCardSettings(false)}
            settings={cardSettings}
            onUpdateSettings={updateCardSettings}
            srsConfig={srsConfig}
            onUpdateSRSConfig={setSrsConfig}
          />
        )}
        
        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
          loading={confirmDialog.loading}
        />
      </>
    );
  }

  // Review screen
  const currentCard = cards[currentCardIndex];
  const isSessionComplete = currentCardIndex >= cards.length;
  const progress = ((currentCardIndex + (showAnswer ? 1 : 0)) / cards.length) * 100;
  const totalTimeSpent = Date.now() - sessionStats.startTime;

  return (
    <>
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <main className="max-w-4xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Session Stats Bar */}
          <SessionStats
            stats={sessionStats}
            currentCard={currentCardIndex + 1}
            totalCards={cards.length}
            progress={progress}
            timeSpent={totalTimeSpent}
          />

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
                <p className="text-sm text-muted-foreground">
                  Time: {Math.floor(totalTimeSpent / 60000)}m {Math.floor((totalTimeSpent % 60000) / 1000)}s
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
                      skipped: 0,
                      timeSpent: 0,
                      startTime: Date.now()
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
            <FlashcardDisplay
              card={currentCard}
              showAnswer={showAnswer}
              cardSettings={cardSettings}
              srsData={srsDataMap.get(currentCard.id)}
              onShowAnswer={handleShowAnswer}
              onRate={handleRating}
              onSkip={handleSkip}
              onSave={() => handleSaveWord(currentCard)}
              onPlayAudio={playCardAudio}
            />
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

      {/* Import Anki Modal */}
      {showImportModal && (
        <AnkiImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportSuccess={() => {
            loadUserLists();
            console.log('Reloading lists after Anki import...');
          }}
        />
      )}
      
      {/* Card Settings Modal */}
      {showCardSettings && (
        <CardSettingsModal
          isOpen={showCardSettings}
          onClose={() => setShowCardSettings(false)}
          settings={cardSettings}
          onUpdateSettings={updateCardSettings}
          srsConfig={srsConfig}
          onUpdateSRSConfig={setSrsConfig}
        />
      )}
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        isDestructive={confirmDialog.isDestructive}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        loading={confirmDialog.loading}
      />
    </>
  );
}