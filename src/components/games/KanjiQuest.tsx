'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameKanji, getKanjiByJLPT } from '@/utils/kanjiUtils';
import { getRandomPokemon, getPokemonSpriteUrl, getPokemonSilhouetteClassName } from '@/data/pokemonData';
import { useAuth } from '@/contexts/AuthContext';
import { KanjiTTSButton, VocabularyTTSButton } from '@/components/ui/TTSButton';
import { useState, useEffect, useRef } from 'react';
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { useNotification } from '@/contexts/NotificationContext';
import { useTTS } from '@/hooks/useTTS';
import { trackGamePlayed } from '@/lib/stats/trackingEvents';

// Types
interface StudySession {
  kanji: GameKanji[];
  pokemonId: number;
  status: 'studying' | 'quiz' | 'completed' | 'failed';
  startTime: string;
  quizScore: number | null;
}

interface QuizQuestion {
  type: 'reading' | 'meaning' | 'kanji' | 'vocab';
  question: string;
  options: string[];
  correctIndex: number;
  kanjiRef: GameKanji;
}

// Battle system types
type AttackType = 'reading' | 'meaning' | 'kanji' | 'vocabulary';

interface Attack {
  type: AttackType;
  baseDamage: number;
  accuracy: number;
  criticalChance: number;
  effectDescription: string;
}

interface BattleEvent {
  type: 'player_attack' | 'kanji_attack' | 'status_effect' | 'victory' | 'defeat';
  damage?: number;
  isEffective?: 'super' | 'normal' | 'not_very';
  message: string;
  timestamp: Date;
}

// Attack type definitions
const ATTACK_TYPES: Record<AttackType, Attack> = {
  reading: {
    type: 'reading',
    baseDamage: 30,
    accuracy: 0.85,
    criticalChance: 0.15,
    effectDescription: 'Sound Wave Attack - Tests pronunciation knowledge'
  },
  meaning: {
    type: 'meaning',
    baseDamage: 35,
    accuracy: 0.90,
    criticalChance: 0.10,
    effectDescription: 'Mind Strike - Tests conceptual understanding'
  },
  kanji: {
    type: 'kanji',
    baseDamage: 40,
    accuracy: 0.80,
    criticalChance: 0.20,
    effectDescription: 'Symbol Slash - Tests character recognition'
  },
  vocabulary: {
    type: 'vocabulary',
    baseDamage: 45,
    accuracy: 0.75,
    criticalChance: 0.25,
    effectDescription: 'Context Combo - Tests practical usage'
  }
};

// Kanji counter-attacks
const KANJI_ATTACKS = [
  {
    name: 'Confusion Ray',
    damage: 20,
    effect: 'confused',
    message: '{kanji} used Confusion Ray! You feel bewildered!'
  },
  {
    name: 'Memory Drain',
    damage: 25,
    effect: 'weakened',
    message: '{kanji} drained your knowledge! Your attacks are weakened!'
  },
  {
    name: 'Character Overwhelm',
    damage: 30,
    effect: null,
    message: '{kanji} overwhelmed you with complexity!'
  }
];

interface KanjiQuestProps {
  jlptLevel: number;
  onBack: () => void;
  onPokemonCaught?: (pokemonId: number, kanjiIds: string[]) => void;
  completedKanjiIds: Set<string>;
  onKanjiCompleted: (kanjiIds: string[]) => void;
  customKanji?: GameKanji[]; // Optional custom kanji selection
}

export default function KanjiQuest({
  jlptLevel,
  onBack,
  onPokemonCaught,
  completedKanjiIds,
  onKanjiCompleted,
  customKanji
}: KanjiQuestProps) {
  console.log('KanjiQuest rendered with props:', {
    jlptLevel,
    onBack,
    onPokemonCaught,
    completedKanjiIds,
    onKanjiCompleted,
    customKanji
  });

  const { user, loading: authLoading } = useAuth();
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining, isLoading: featureLoading } = useFeature('kanji_quest');
  const { isPremium, userType, isLoading: subscriptionLoading } = useSubscription2();
  const { showNotification } = useNotification();
  const { speak } = useTTS();
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Component state is now logged centrally in SubscriptionContext

  const [phase, setPhase] = useState<'kanji_selection' | 'encounter' | 'study' | 'battle' | 'quiz' | 'result'>('kanji_selection');
  const [session, setSession] = useState<StudySession | null>(null);
  const [studiedKanji, setStudiedKanji] = useState<Set<string>>(new Set());
  const [currentKanjiIndex, setCurrentKanjiIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showQuizFeedback, setShowQuizFeedback] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);
  const [gameLoading, setGameLoading] = useState(true);
  const [showLimitMessage, setShowLimitMessage] = useState(false);
  const [entitlementCheckComplete, setEntitlementCheckComplete] = useState(false);

  // Battle system state
  const [kanjiHP, setKanjiHP] = useState(100);
  const [trainerHP, setTrainerHP] = useState(100);
  const [maxKanjiHP, setMaxKanjiHP] = useState(100);
  const [maxTrainerHP, setMaxTrainerHP] = useState(100);
  const [battleGradient, setBattleGradient] = useState('');
  const [battleLog, setBattleLog] = useState<BattleEvent[]>([]);
  const [isAttacking, setIsAttacking] = useState(false);
  const [showDamageEffect, setShowDamageEffect] = useState(false);
  const [currentAttackType, setCurrentAttackType] = useState<AttackType>('meaning');
  const [showKanjiDefeat, setShowKanjiDefeat] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [showWrongAnswerModal, setShowWrongAnswerModal] = useState(false);
  const [lastWrongQuestion, setLastWrongQuestion] = useState<QuizQuestion | null>(null);

  // Kanji selection state
  const [availableKanji, setAvailableKanji] = useState<GameKanji[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<Set<string>>(new Set());
  const [showKanjiSelection, setShowKanjiSelection] = useState(false);
  
  // Question tracking state - tracks which question types have been asked for each kanji
  const [askedQuestions, setAskedQuestions] = useState<Map<string, Set<'onyomi' | 'kunyomi' | 'meaning'>>>(new Map());
  
  // Random icons for answer buttons
  const [answerIcons, setAnswerIcons] = useState<string[]>([]);
  
  // Pokeball animation state
  const [showPokeballAnimation, setShowPokeballAnimation] = useState(false);
  
  // New battle announcement states
  const [showKanjiAppearance, setShowKanjiAppearance] = useState(false);
  const [showKanjiEscape, setShowKanjiEscape] = useState(false);
  const [currentKanjiId, setCurrentKanjiId] = useState<string | null>(null);
  const [previousKanjiId, setPreviousKanjiId] = useState<string | null>(null);
  const [escapedKanji, setEscapedKanji] = useState<GameKanji | null>(null);
  const [appearanceMessage, setAppearanceMessage] = useState<{ kanji: string; attackType: string } | null>(null);
  const [showTrainerDefeat, setShowTrainerDefeat] = useState(false);
  
  // Exit confirmation modal
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Initialize battle music
  useEffect(() => {
    if (typeof window !== 'undefined') {
      battleMusicRef.current = new Audio('/sounds/pokemon-battle.mp3');
      battleMusicRef.current.loop = true;
      battleMusicRef.current.volume = 0.3; // Set a moderate volume
    }

    // Cleanup on unmount
    return () => {
      if (battleMusicRef.current) {
        battleMusicRef.current.pause();
        battleMusicRef.current = null;
      }
    };
  }, []);

  // Handle battle music based on phase
  useEffect(() => {
    if (!battleMusicRef.current || isMuted) return;

    if (phase === 'battle') {
      // Start battle music
      battleMusicRef.current.play().catch(error => {
        console.error('Error playing battle music:', error);
      });
    } else {
      // Stop battle music
      battleMusicRef.current.pause();
      battleMusicRef.current.currentTime = 0;
    }
  }, [phase, isMuted]);

  // Initialize session - properly coordinate with auth and subscription loading
  useEffect(() => {
    // Wait for BOTH auth and subscription to finish loading before proceeding
    if (authLoading || subscriptionLoading) {
      // Still loading, do not check access yet
      return;
    }

    // Once both auth and subscription are loaded, proceed
    startNewSession();
  }, [jlptLevel, authLoading, subscriptionLoading]); // Depend on both loading states

  const startNewSession = async () => {
    try {
      setGameLoading(true);
      setEntitlementCheckComplete(false);

      // Double-check that subscription is fully loaded
      if (subscriptionLoading) {
        console.error('🚨 startNewSession called while subscription still loading!');
        setGameLoading(false);
        return;
      }

      // Check if user can play KanjiQuest
      const canPlay = await checkAndTrack('kanji_quest');

      setEntitlementCheckComplete(true);

      if (!canPlay) {
        console.log('🎮 KanjiQuest Access Check Failed');
        setGameLoading(false);
        setShowLimitMessage(true);
        return;
      }

      console.log('✅ KanjiQuest Access Granted');

      // User has access, proceeding with game setup

      // Load available kanji for selection
      if (!customKanji) {
        const allKanji = await getKanjiByJLPT(jlptLevel);
        const availableKanjiForLevel = allKanji.filter(k => !completedKanjiIds.has(k.id));
        setAvailableKanji(availableKanjiForLevel);
        setShowKanjiSelection(true);
        setGameLoading(false);
        return;
      }

      // Get available kanji for the level
      let selectedKanji: GameKanji[];

      if (customKanji && customKanji.length > 0) {
        // Use custom kanji selection from Kanji Browser
        // Import vocabulary loading function
        const { getVocabularyForKanji } = await import('@/utils/jmdictVocabulary');

        // Allow all selected kanji, not just 5
        selectedKanji = customKanji.map(k => ({
          ...k,
          vocabulary: getVocabularyForKanji(k.character, 3)
        }));
      } else {
        // Use random selection from JLPT level
        const allKanji = await getKanjiByJLPT(jlptLevel);

        // Filter out completed kanji
        const availableKanji = allKanji.filter(k => !completedKanjiIds.has(k.id));

        if (availableKanji.length < 5) {
          showNotification({
            title: 'Not Enough Kanji',
            message: 'You need at least 5 new kanji available for this level!',
            type: 'warning'
          });
          onBack();
          return;
        }

        // Select 5-8 random kanji
        selectedKanji = [];
        const tempAvailable = [...availableKanji];
        const numToSelect = Math.min(3 + Math.floor(Math.random() * 3), tempAvailable.length); // 3-5 kanji

        for (let i = 0; i < numToSelect && tempAvailable.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * tempAvailable.length);
          selectedKanji.push(tempAvailable.splice(randomIndex, 1)[0]);
        }
      }

      // Create new session
      const newSession: StudySession = {
        kanji: selectedKanji,
        pokemonId: getRandomPokemon(),
        status: 'studying',
        startTime: new Date().toISOString(),
        quizScore: null
      };

      setSession(newSession);
      setPhase('encounter');
      setStudiedKanji(new Set());
      setCurrentKanjiIndex(0);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setUserAnswers([]);

      // Initialize battle state based on JLPT level
      const baseHP = getKanjiHP(jlptLevel);
      setKanjiHP(baseHP);
      setMaxKanjiHP(baseHP);
      setTrainerHP(100);
      setMaxTrainerHP(100);
      setBattleLog([]);

      // Generate random gradient for this encounter
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
      ];
      setBattleGradient(gradients[Math.floor(Math.random() * gradients.length)]);

      // NOTE: Usage count is now incremented after quiz completion, not at start
    } catch (error) {
      showNotification({
        title: 'Loading Error',
        message: 'Failed to load kanji data. Please try again.',
        type: 'error'
      });
      onBack();
    } finally {
      setGameLoading(false);
    }
  };

  // Get random icons for answer buttons
  const getRandomIcons = (): string[] => {
    const iconPools = [
      // Pokemon icons
      [
        '/flat-icons/1752632-pokemon/png/017-gaming.png',
        '/flat-icons/1752632-pokemon/png/019-gaming.png',
        '/flat-icons/1752632-pokemon/png/025-gaming.png',
        '/flat-icons/1752632-pokemon/png/028-gaming.png',
        '/flat-icons/1752632-pokemon/png/030-gaming.png',
        '/flat-icons/1752632-pokemon/png/035-gaming.png',
        '/flat-icons/1752632-pokemon/png/040-gaming.png',
        '/flat-icons/1752632-pokemon/png/055-gaming.png'
      ],
      // Pokemon Go icons
      [
        '/flat-icons/188915-pokemon-go/png/pokeball.png',
        '/flat-icons/188915-pokemon-go/png/pokedex.png',
        '/flat-icons/188915-pokemon-go/png/star.png',
        '/flat-icons/188915-pokemon-go/png/map.png'
      ],
      // Animals icons
      [
        '/flat-icons/4193242-animals/png/001-bear.png',
        '/flat-icons/4193242-animals/png/002-tiger.png',
        '/flat-icons/4193242-animals/png/003-fox.png',
        '/flat-icons/4193242-animals/png/004-rhino.png',
        '/flat-icons/4193242-animals/png/005-monkey.png',
        '/flat-icons/4193242-animals/png/006-elephant.png',
        '/flat-icons/4193242-animals/png/007-lion.png',
        '/flat-icons/4193242-animals/png/008-squirrel.png'
      ]
    ];
    
    // Flatten all icons into one array
    const allIcons = iconPools.flat();
    
    // Shuffle and pick 4 random icons
    const shuffled = [...allIcons].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  };

  // Battle mechanics functions
  const getKanjiHP = (jlptLevel: number): number => {
    // HP based on JLPT difficulty
    switch (jlptLevel) {
      case 5: return 60 + Math.floor(Math.random() * 20); // 60-80 HP
      case 4: return 80 + Math.floor(Math.random() * 20); // 80-100 HP
      case 3: return 100 + Math.floor(Math.random() * 20); // 100-120 HP
      case 2: return 120 + Math.floor(Math.random() * 20); // 120-140 HP
      case 1: return 140 + Math.floor(Math.random() * 20); // 140-160 HP
      default: return 100;
    }
  };

  const getAttackTypeFromQuestion = (questionType: QuizQuestion['type']): AttackType => {
    switch (questionType) {
      case 'reading': return 'reading';
      case 'meaning': return 'meaning';
      case 'kanji': return 'kanji';
      case 'vocab': return 'vocabulary';
      default: return 'meaning';
    }
  };

  const getAttackTypeName = (questionType: 'onyomi' | 'kunyomi' | 'meaning'): string => {
    switch (questionType) {
      case 'onyomi': return "On'yomi Attack";
      case 'kunyomi': return "Kun'yomi Attack";
      case 'meaning': return "Meaning Attack";
      default: return "Attack";
    }
  };

  const calculateDamage = (
    attack: Attack,
    isCorrect: boolean,
    effectiveness: 'super' | 'normal' | 'not_very',
    isCritical: boolean
  ): number => {
    if (!isCorrect) return 0;

    let damage = attack.baseDamage;

    // Type effectiveness multiplier
    switch (effectiveness) {
      case 'super': damage *= 1.5; break;
      case 'not_very': damage *= 0.75; break;
      case 'normal': damage *= 1.0; break;
    }

    // Critical hit multiplier
    if (isCritical) {
      damage *= 1.5;
    }

    // Add random variance (±10%)
    damage *= (0.9 + Math.random() * 0.2);

    return Math.round(damage);
  };

  const getTypeEffectiveness = (attackType: AttackType, kanji: GameKanji): 'super' | 'normal' | 'not_very' => {
    // Calculate weaknesses based on kanji characteristics
    const totalReadings = (kanji.on_readings?.length || 0) + (kanji.kun_readings?.length || 0);
    const hasComplexMeanings = kanji.meanings.length > 2;
    const hasVocabulary = kanji.vocabulary && kanji.vocabulary.length >= 3;

    // Type effectiveness logic
    if (attackType === 'reading' && totalReadings >= 4) return 'super';
    if (attackType === 'meaning' && hasComplexMeanings) return 'super';
    if (attackType === 'vocabulary' && hasVocabulary) return 'super';
    if (attackType === 'kanji' && kanji.meanings[0].length > 10) return 'super'; // Long meanings = complex kanji

    // Some resistances
    if (attackType === 'reading' && totalReadings <= 1) return 'not_very';
    if (attackType === 'vocabulary' && !hasVocabulary) return 'not_very';

    return 'normal';
  };

  const executeKanjiCounterAttack = () => {
    const randomAttack = KANJI_ATTACKS[Math.floor(Math.random() * KANJI_ATTACKS.length)];
    const damage = randomAttack.damage + Math.floor(Math.random() * 10) - 5; // ±5 variance

    setTrainerHP(prev => Math.max(0, prev - damage));
    setShowDamageEffect(true);

    const message = randomAttack.message.replace('{kanji}', session?.kanji[currentKanjiIndex]?.character || 'Kanji');

    setBattleLog(prev => [...prev, {
      type: 'kanji_attack',
      damage,
      message,
      timestamp: new Date()
    }]);

    setTimeout(() => setShowDamageEffect(false), 500);

    // Check for trainer defeat
    if (trainerHP - damage <= 0) {
      setTimeout(() => {
        setShowTrainerDefeat(true);
      }, 1000);
    }
  };

  // This function is no longer used in the new encounter system
  // Keeping it for potential future use or removal

  // Get available question types for a kanji that haven't been asked yet
  const getAvailableQuestionTypes = (kanji: GameKanji): ('onyomi' | 'kunyomi' | 'meaning')[] => {
    const asked = askedQuestions.get(kanji.id) || new Set();
    const available: ('onyomi' | 'kunyomi' | 'meaning')[] = [];
    
    // Check what's available and not yet asked
    if (kanji.on_readings && kanji.on_readings.length > 0 && !asked.has('onyomi')) {
      available.push('onyomi');
    }
    if (kanji.kun_readings && kanji.kun_readings.length > 0 && !asked.has('kunyomi')) {
      available.push('kunyomi');
    }
    if (!asked.has('meaning')) {
      available.push('meaning');
    }
    
    return available;
  };

  // Get next random encounter
  const getNextEncounter = (kanji: GameKanji[]): { kanji: GameKanji; questionType: 'onyomi' | 'kunyomi' | 'meaning' } | null => {
    // Get all kanji that still have unanswered questions
    const kanjiWithQuestions = kanji.filter(k => {
      const available = getAvailableQuestionTypes(k);
      return available.length > 0;
    });
    
    if (kanjiWithQuestions.length === 0) {
      return null; // All questions have been answered
    }
    
    // Pick a random kanji from those with remaining questions
    const randomKanji = kanjiWithQuestions[Math.floor(Math.random() * kanjiWithQuestions.length)];
    const availableTypes = getAvailableQuestionTypes(randomKanji);
    
    // Pick a random question type from what's available
    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    return { kanji: randomKanji, questionType: randomType };
  };

  // Generate a single question for the current encounter
  const generateEncounterQuestion = (encounter: { kanji: GameKanji; questionType: 'onyomi' | 'kunyomi' | 'meaning' }, allKanji: GameKanji[]): QuizQuestion => {
    switch (encounter.questionType) {
      case 'onyomi':
        return createOnyomiQuestion(encounter.kanji, allKanji);
      case 'kunyomi':
        return createKunyomiQuestion(encounter.kanji, allKanji);
      case 'meaning':
        return createMeaningQuestion(encounter.kanji, allKanji);
    }
  };

  // Helper function to format multiple readings (max 3-4)
  const formatMultipleReadings = (readings: string[], maxCount: number = 4): string => {
    if (readings.length <= maxCount) {
      return readings.join(', ');
    }
    return readings.slice(0, maxCount).join(', ') + '...';
  };

  const createOnyomiQuestion = (kanji: GameKanji, allKanji: GameKanji[]): QuizQuestion => {
    // For correct answer, show all onyomi readings (up to 4)
    const correctAnswer = formatMultipleReadings(kanji.on_readings);
    
    // Get distractors from other kanji's onyomi readings
    const possibleDistractors: string[] = [];
    allKanji
      .filter(k => k.id !== kanji.id && k.on_readings.length > 0)
      .forEach(k => {
        // Format each kanji's readings as a group
        const formattedReading = formatMultipleReadings(k.on_readings);
        if (formattedReading !== correctAnswer) {
          possibleDistractors.push(formattedReading);
        }
      });

    // Remove duplicates and take 3 random distractors
    const uniqueDistractors = [...new Set(possibleDistractors)];
    const distractors = uniqueDistractors
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // If not enough distractors, add some kun readings as wrong options
    if (distractors.length < 3) {
      allKanji
        .filter(k => k.kun_readings.length > 0)
        .forEach(k => {
          const formattedReading = formatMultipleReadings(k.kun_readings);
          if (distractors.length < 3 && !distractors.includes(formattedReading) && formattedReading !== correctAnswer) {
            distractors.push(formattedReading);
          }
        });
    }

    const options = [correctAnswer, ...distractors.slice(0, 3)];
    const shuffled = [...options].sort(() => Math.random() - 0.5);

    return {
      type: 'reading',
      question: `What is the on'yomi (音読み) reading of "${kanji.character}"?`,
      options: shuffled,
      correctIndex: shuffled.indexOf(correctAnswer),
      kanjiRef: kanji
    };
  };

  const createKunyomiQuestion = (kanji: GameKanji, allKanji: GameKanji[]): QuizQuestion => {
    // For correct answer, show all kunyomi readings (up to 4)
    const correctAnswer = formatMultipleReadings(kanji.kun_readings);
    
    // Get distractors from other kanji's kunyomi readings
    const possibleDistractors: string[] = [];
    allKanji
      .filter(k => k.id !== kanji.id && k.kun_readings.length > 0)
      .forEach(k => {
        // Format each kanji's readings as a group
        const formattedReading = formatMultipleReadings(k.kun_readings);
        if (formattedReading !== correctAnswer) {
          possibleDistractors.push(formattedReading);
        }
      });

    // Remove duplicates and take 3 random distractors
    const uniqueDistractors = [...new Set(possibleDistractors)];
    const distractors = uniqueDistractors
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // If not enough distractors, add some on readings as wrong options
    if (distractors.length < 3) {
      allKanji
        .filter(k => k.on_readings.length > 0)
        .forEach(k => {
          const formattedReading = formatMultipleReadings(k.on_readings);
          if (distractors.length < 3 && !distractors.includes(formattedReading) && formattedReading !== correctAnswer) {
            distractors.push(formattedReading);
          }
        });
    }

    const options = [correctAnswer, ...distractors.slice(0, 3)];
    const shuffled = [...options].sort(() => Math.random() - 0.5);

    return {
      type: 'reading',
      question: `What is the kun'yomi (訓読み) reading of "${kanji.character}"?`,
      options: shuffled,
      correctIndex: shuffled.indexOf(correctAnswer),
      kanjiRef: kanji
    };
  };

  const createMeaningQuestion = (kanji: GameKanji, allKanji: GameKanji[]): QuizQuestion => {
    // For meanings, we can show all of them (they're usually short)
    const correctAnswer = kanji.meanings.join(', ');
    
    // Get distractors from other kanji meanings
    const possibleDistractors: string[] = [];
    allKanji
      .filter(k => k.id !== kanji.id)
      .forEach(k => {
        const meaning = k.meanings.join(', ');
        if (meaning !== correctAnswer) {
          possibleDistractors.push(meaning);
        }
      });

    // Remove duplicates and take 3 random distractors
    const uniqueDistractors = [...new Set(possibleDistractors)];
    const distractors = uniqueDistractors
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [correctAnswer, ...distractors];
    const shuffled = [...options].sort(() => Math.random() - 0.5);

    return {
      type: 'meaning',
      question: `What does "${kanji.character}" mean?`,
      options: shuffled,
      correctIndex: shuffled.indexOf(correctAnswer),
      kanjiRef: kanji
    };
  };

  const createQuestion = (kanji: GameKanji, type: number, allKanji: GameKanji[]): QuizQuestion => {
    const types: QuizQuestion['type'][] = ['reading', 'meaning', 'kanji', 'vocab'];
    const questionType = types[type];

    switch (questionType) {
      case 'reading': {
        // Randomly decide whether to ask for on'yomi or kun'yomi
        const hasOnReadings = kanji.on_readings.length > 0;
        const hasKunReadings = kanji.kun_readings.length > 0;
        
        let askForOn = false;
        let correctAnswer = '';
        
        // Decide which reading type to ask for
        if (hasOnReadings && hasKunReadings) {
          // If both exist, randomly choose
          askForOn = Math.random() < 0.5;
          correctAnswer = askForOn ? kanji.on_readings[0] : kanji.kun_readings[0];
        } else if (hasOnReadings) {
          // Only on'yomi exists
          askForOn = true;
          correctAnswer = kanji.on_readings[0];
        } else if (hasKunReadings) {
          // Only kun'yomi exists
          askForOn = false;
          correctAnswer = kanji.kun_readings[0];
        }

        // Get all possible readings from other kanji (matching the type we're asking for)
        const possibleDistractors: string[] = [];
        allKanji
          .filter(k => k.id !== kanji.id)
          .forEach(k => {
            if (askForOn) {
              k.on_readings.forEach(r => {
                if (r && r !== correctAnswer) possibleDistractors.push(r);
              });
            } else {
              k.kun_readings.forEach(r => {
                if (r && r !== correctAnswer) possibleDistractors.push(r);
              });
            }
          });

        // Remove duplicates and take 3 random distractors
        const uniqueDistractors = [...new Set(possibleDistractors)];
        const distractors = uniqueDistractors
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        const readingType = askForOn ? "on'yomi (音読み)" : "kun'yomi (訓読み)";

        return {
          type: 'reading',
          question: `What is the ${readingType} reading of "${kanji.character}"?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'meaning': {
        // Show kanji, ask for meaning
        const correctAnswer = kanji.meanings[0];
        const distractors = allKanji
          .filter(k => k.id !== kanji.id)
          .map(k => k.meanings[0])
          .filter(m => m && m !== correctAnswer)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        return {
          type: 'meaning',
          question: `What does "${kanji.character}" mean?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'kanji': {
        // Show meaning, ask for kanji
        const correctAnswer = kanji.character;
        const distractors = allKanji
          .filter(k => k.id !== kanji.id)
          .map(k => k.character)
          .slice(0, 3);

        const options = [correctAnswer, ...distractors];
        const shuffled = [...options].sort(() => Math.random() - 0.5);

        return {
          type: 'kanji',
          question: `Which kanji means "${kanji.meanings[0]}"?`,
          options: shuffled,
          correctIndex: shuffled.indexOf(correctAnswer),
          kanjiRef: kanji
        };
      }

      case 'vocab': {
        // Use vocabulary if available
        if (kanji.vocabulary && kanji.vocabulary.length > 0) {
          const vocab = kanji.vocabulary[0];
          const correctAnswer = kanji.character;
          const distractors = allKanji
            .filter(k => k.id !== kanji.id)
            .map(k => k.character)
            .slice(0, 3);

          const options = [correctAnswer, ...distractors];
          const shuffled = [...options].sort(() => Math.random() - 0.5);

          // Replace the kanji in the word with a placeholder to avoid showing the answer
          const displayWord = vocab.word.replace(kanji.character, '—');
          
          // Build question text with meaning for clarity
          const meaningText = vocab.meaning ? ` meaning "${vocab.meaning}"` : '';
          
          // Only show reading in parentheses if it exists and doesn't contain the kanji
          const questionText = vocab.reading && !vocab.reading.includes(kanji.character)
            ? `Which kanji completes this word: "${displayWord}" (${vocab.reading})${meaningText}?`
            : `Which kanji completes this word: "${displayWord}"${meaningText}?`;

          return {
            type: 'vocab',
            question: questionText,
            options: shuffled,
            correctIndex: shuffled.indexOf(correctAnswer),
            kanjiRef: kanji
          };
        }

        // Fallback to meaning question if no vocab
        return createQuestion(kanji, 1, allKanji);
      }
    }
  };

  const handleQuizAnswer = async (answerIndex: number) => {
    // Prevent multiple clicks
    if (showQuizFeedback || isAttacking || isProcessingAnswer || isTransitioning) {
      return;
    }

    const currentQuestion = quizQuestions[currentQuestionIndex];
    if (!currentQuestion || !session) {
      return;
    }

    // Check if this question was already answered
    if (userAnswers[currentQuestionIndex] !== undefined) {
      return;
    }

    // Lock the answer processing immediately
    setIsProcessingAnswer(true);
    
    // Play TTS for the selected answer if it contains Japanese text
    const selectedOption = currentQuestion.options[answerIndex];
    if (selectedOption && /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(selectedOption)) {
      // Check if it's a reading question with comma-separated readings (e.g., "hi, ka")
      const isReadingQuestion = currentQuestion.type === 'reading';
      const hasCommas = selectedOption.includes(',');
      
      if (isReadingQuestion && hasCommas && !selectedOption.includes('、')) {
        // Only split if it's a reading question with Latin commas (not Japanese commas)
        const readings = selectedOption.split(',').map(r => r.trim());
        for (const reading of readings) {
          if (reading) {
            await speak(reading, { voice: 'male', speed: 1.0 });
            // Small pause between readings
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      } else {
        // For everything else (kanji, meanings, or readings without commas), speak normally
        await speak(selectedOption, { voice: 'male', speed: 1.0 });
      }
    }

    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const attackType = getAttackTypeFromQuestion(currentQuestion.type);
    const attack = ATTACK_TYPES[attackType];
    const currentKanji = session.kanji[currentKanjiIndex];

    setIsAttacking(true);

    // Handle answer result
    if (isCorrect) {
      // Trigger Pokeball animation
      setShowPokeballAnimation(true);
      setTimeout(() => setShowPokeballAnimation(false), 1500);
      
      // Calculate damage
      const isCritical = Math.random() < attack.criticalChance;
      const effectiveness = getTypeEffectiveness(attackType, currentKanji);
      const damage = calculateDamage(attack, true, effectiveness, isCritical);
      
      // Apply damage to kanji
      setKanjiHP(prev => Math.max(0, prev - damage));
      
      // Add success to battle log
      let message = `You used ${attack.effectDescription.split(' - ')[0]}! `;
      if (isCritical) message += 'Critical hit! ';
      if (effectiveness === 'super') message += "It's super effective! ";
      else if (effectiveness === 'not_very') message += "It's not very effective... ";
      message += `Dealt ${damage} damage!`;
      
      setBattleLog(prev => [...prev, {
        type: 'player_attack',
        damage,
        isEffective: effectiveness,
        message,
        timestamp: new Date()
      }]);
    } else {
      // Wrong answer - show feedback modal and kanji counter-attacks
      setLastWrongQuestion(currentQuestion);
      setShowWrongAnswerModal(true);
      
      setBattleLog(prev => [...prev, {
        type: 'player_attack',
        damage: 0,
        message: 'Your attack missed!',
        timestamp: new Date()
      }]);

      // Execute counter-attack after a delay
      setTimeout(() => {
        executeKanjiCounterAttack();
      }, 1000);
    }

    const newAnswers = [...userAnswers, answerIndex];
    setUserAnswers(newAnswers);
    setShowQuizFeedback(true);

    // Track that this question type has been asked for this kanji
    if (isCorrect) {
      const questionType = currentQuestion.type === 'reading' 
        ? (currentQuestion.question.includes('on\'yomi') ? 'onyomi' : 'kunyomi')
        : 'meaning';
      
      setAskedQuestions(prev => {
        const newMap = new Map(prev);
        const kanjiAsked = newMap.get(currentQuestion.kanjiRef.id) || new Set();
        kanjiAsked.add(questionType as 'onyomi' | 'kunyomi' | 'meaning');
        newMap.set(currentQuestion.kanjiRef.id, kanjiAsked);
        return newMap;
      });
    }

    // Check for battle end conditions
    setTimeout(() => {
      setIsAttacking(false);
      
      // Don't progress if wrong answer modal is showing (for incorrect answers)
      if (!isCorrect) {
        return; // Let the modal close handler deal with progression
      }

      // Check if kanji was defeated (HP reached 0 OR all questions answered)
      const currentKanji = currentQuestion.kanjiRef;
      const questionsAnswered = askedQuestions.get(currentKanji.id) || new Set();
      const totalPossibleQuestions = 
        (currentKanji.on_readings?.length > 0 ? 1 : 0) +
        (currentKanji.kun_readings?.length > 0 ? 1 : 0) +
        1; // meaning always exists
      
      // Add current question type to answered set
      const currentQuestionType = currentQuestion.type === 'reading' 
        ? (currentQuestion.question.includes('on\'yomi') ? 'onyomi' : 'kunyomi')
        : 'meaning';
      const allQuestionsAnswered = questionsAnswered.size + 1 >= totalPossibleQuestions;
      
      if (isCorrect && (kanjiHP - battleLog[battleLog.length - 1]?.damage <= 0 || allQuestionsAnswered)) {
        // Trigger defeat animation
        setShowKanjiDefeat(true);
        
        // Wait for defeat animation to complete
        setTimeout(() => {
          setShowKanjiDefeat(false);
          
          // Add a brief pause after defeat before transitioning
          setTimeout(() => {
            // Get next encounter
            const nextEncounter = getNextEncounter(session.kanji);
            
            if (nextEncounter) {
              // Always show new kanji appearance after defeating one
              setPreviousKanjiId(currentKanjiId);
              setCurrentKanjiId(nextEncounter.kanji.id);
              setAppearanceMessage({
                kanji: nextEncounter.kanji.character,
                attackType: getAttackTypeName(nextEncounter.questionType)
              });
              setShowKanjiAppearance(true);
              
              setTimeout(() => {
                setShowKanjiAppearance(false);
                
                // Generate next question
                const nextQuestion = generateEncounterQuestion(nextEncounter, session.kanji);
                setQuizQuestions([nextQuestion]);
                setCurrentQuestionIndex(0);
                setUserAnswers([]);
                setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === nextEncounter.kanji.id));
                
                // Reset HP for new kanji encounter
                const baseHP = getKanjiHP(jlptLevel);
                setKanjiHP(baseHP);
                setMaxKanjiHP(baseHP);
                
                // Generate new random icons for answer buttons
                setAnswerIcons(getRandomIcons());
                
                setShowQuizFeedback(false);
                setIsProcessingAnswer(false);
                setShowWrongAnswerModal(false);
              }, 3500); // Wait for appearance animation
            } else {
              // All questions completed!
              completeQuiz(newAnswers);
            }
          }, 1000); // Brief pause after defeat
        }, 3000); // Wait for defeat animation (increased from 2000)
        return;
      }

      // Get next encounter
      const nextEncounter = getNextEncounter(session.kanji);
      
      if (nextEncounter) {
        // Check if this is a different kanji than the current one
        const isNewKanji = nextEncounter.kanji.id !== currentQuestion.kanjiRef.id;
        
        if (isNewKanji) {
          // Show kanji escape animation first (for non-defeated kanji)
          setEscapedKanji(currentQuestion.kanjiRef);
          setShowKanjiEscape(true);
          
          setTimeout(() => {
            setShowKanjiEscape(false);
            
            // Then show new kanji appearance
            setPreviousKanjiId(currentKanjiId);
            setCurrentKanjiId(nextEncounter.kanji.id);
            setAppearanceMessage({
              kanji: nextEncounter.kanji.character,
              attackType: getAttackTypeName(nextEncounter.questionType)
            });
            setShowKanjiAppearance(true);
            
            setTimeout(() => {
              setShowKanjiAppearance(false);
              
              // Generate next question
              const nextQuestion = generateEncounterQuestion(nextEncounter, session.kanji);
              setQuizQuestions([nextQuestion]);
              setCurrentQuestionIndex(0);
              setUserAnswers([]);
              setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === nextEncounter.kanji.id));
              
              // Reset HP for new kanji encounter
              const baseHP = getKanjiHP(jlptLevel);
              setKanjiHP(baseHP);
              setMaxKanjiHP(baseHP);
              
              // Generate new random icons for answer buttons
              setAnswerIcons(getRandomIcons());
              
              setShowQuizFeedback(false);
              setIsProcessingAnswer(false);
              setShowWrongAnswerModal(false);
            }, 3500); // Wait for appearance animation
          }, 2700); // Wait for escape animation (2.5s + buffer)
        } else {
          // Same kanji, just transition to next question
          const nextQuestion = generateEncounterQuestion(nextEncounter, session.kanji);
          setQuizQuestions([nextQuestion]);
          setCurrentQuestionIndex(0);
          setUserAnswers([]);
          
          setShowQuizFeedback(false);
          setIsProcessingAnswer(false);
          setShowWrongAnswerModal(false);
        }
      } else {
        // All questions completed!
        completeQuiz(newAnswers);
      }
    }, 2000);
  };

  // Handle wrong answer modal close
  const handleWrongAnswerModalClose = () => {
    setShowWrongAnswerModal(false);
    setIsProcessingAnswer(false);
    
    // Progress to next question after closing the modal
    if (session) {
      // Get next encounter
      const nextEncounter = getNextEncounter(session.kanji);
      
      if (nextEncounter) {
        // Check if this is a different kanji than the current one
        const currentQuestion = quizQuestions[currentQuestionIndex];
        const isNewKanji = currentQuestion && nextEncounter.kanji.id !== currentQuestion.kanjiRef.id;
        
        if (isNewKanji) {
          // Show kanji escape animation first
          setEscapedKanji(currentQuestion.kanjiRef);
          setShowKanjiEscape(true);
          
          setTimeout(() => {
            setShowKanjiEscape(false);
            
            // Then show new kanji appearance
            setPreviousKanjiId(currentKanjiId);
            setCurrentKanjiId(nextEncounter.kanji.id);
            setAppearanceMessage({
              kanji: nextEncounter.kanji.character,
              attackType: getAttackTypeName(nextEncounter.questionType)
            });
            setShowKanjiAppearance(true);
            
            setTimeout(() => {
              setShowKanjiAppearance(false);
              
              // Generate next question
              const nextQuestion = generateEncounterQuestion(nextEncounter, session.kanji);
              setQuizQuestions([nextQuestion]);
              setCurrentQuestionIndex(0);
              setUserAnswers([]);
              setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === nextEncounter.kanji.id));
              
              // Reset HP for new kanji encounter
              const baseHP = getKanjiHP(jlptLevel);
              setKanjiHP(baseHP);
              setMaxKanjiHP(baseHP);
              
              // Generate new random icons for answer buttons
              setAnswerIcons(getRandomIcons());
              
              setShowQuizFeedback(false);
            }, 3500); // Wait for appearance animation
          }, 2700); // Wait for escape animation (2.5s + buffer)
        } else {
          // Same kanji, just transition to next question
          const nextQuestion = generateEncounterQuestion(nextEncounter, session.kanji);
          setQuizQuestions([nextQuestion]);
          setCurrentQuestionIndex(0);
          setUserAnswers([]);
          
          setShowQuizFeedback(false);
        }
      } else {
        // All questions completed!
        completeQuiz(userAnswers);
      }
    }
  };

  // Handle study complete
  const handleStudyComplete = () => {
    if (session) {
      // Generate first question for battle
      const firstEncounter = getNextEncounter(session.kanji);
      if (firstEncounter) {
        // Show initial kanji appearance
        setCurrentKanjiId(firstEncounter.kanji.id);
        setAppearanceMessage({
          kanji: firstEncounter.kanji.character,
          attackType: getAttackTypeName(firstEncounter.questionType)
        });
        setShowKanjiAppearance(true);
        setPhase('battle');
        
        setTimeout(() => {
          setShowKanjiAppearance(false);
          
          const question = generateEncounterQuestion(firstEncounter, session.kanji);
          setQuizQuestions([question]);
          setCurrentQuestionIndex(0);
          setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === firstEncounter.kanji.id));
          
          // Set HP for this kanji
          const baseHP = getKanjiHP(jlptLevel);
          setKanjiHP(baseHP);
          setMaxKanjiHP(baseHP);
          
          // Generate initial random icons
          setAnswerIcons(getRandomIcons());
        }, 3500); // Wait for appearance animation
      }
    }
  };

  // Kanji selection functions
  const handleKanjiToggle = (kanjiId: string) => {
    const currentSize = selectedKanji.size;
    const isSelected = selectedKanji.has(kanjiId);

    if (isSelected) {
      // Deselect
      setSelectedKanji(prev => {
        const newSet = new Set(prev);
        newSet.delete(kanjiId);
        return newSet;
      });
    } else if (currentSize < 8) {
      // Select
      setSelectedKanji(prev => {
        const newSet = new Set(prev);
        newSet.add(kanjiId);
        return newSet;
      });
    } else {
      // Show notification when trying to select more than 8
      showNotification({
        title: 'Maximum Selection Reached',
        message: 'You can only select up to 8 kanji. Please deselect one to add another.',
        type: 'warning'
      });
    }
  };

  const startNewSessionWithKanji = async (kanjiIds: string[]) => {
    const selectedKanjiData = availableKanji.filter(k => kanjiIds.includes(k.id));

    // Import vocabulary loading function
    const { getVocabularyForKanji } = await import('@/utils/jmdictVocabulary');

    const kanjiWithVocab = selectedKanjiData.map(k => ({
      ...k,
      vocabulary: getVocabularyForKanji(k.character, 3)
    }));

    // Create new session
    const newSession: StudySession = {
      kanji: kanjiWithVocab,
      pokemonId: getRandomPokemon(),
      status: 'studying',
      startTime: new Date().toISOString(),
      quizScore: null
    };

    setSession(newSession);
    setPhase('encounter');
    setStudiedKanji(new Set());
    setCurrentKanjiIndex(0);
    setQuizQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowKanjiSelection(false);

    // Initialize battle state
    const baseHP = getKanjiHP(jlptLevel);
    setKanjiHP(baseHP);
    setMaxKanjiHP(baseHP);
    setTrainerHP(100);
    setMaxTrainerHP(100);
    setBattleLog([]);

    // Generate random gradient for this encounter
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ];
    setBattleGradient(gradients[Math.floor(Math.random() * gradients.length)]);
  };

  const completeQuiz = (answers: number[]) => {
    if (!session) return;

    // Completing quiz with collected answers

    const correctCount = answers.filter((answer, index) =>
      answer === quizQuestions[index].correctIndex
    ).length;

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = score >= 75;

    // Quiz complete with score calculation

    setSession({
      ...session,
      status: passed ? 'completed' : 'failed',
      quizScore: score
    });

    // Track game completion for both pass and fail
    const timeTaken = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const questionsAnswered = session.kanji.length;
    const correctAnswers = Math.round((score / 100) * questionsAnswered);
    
    // Only track if game lasted more than 10 seconds (to avoid tracking immediate quits)
    if (timeTaken > 10) {
      trackGamePlayed('kanji-quest', score, questionsAnswered, correctAnswers).catch(error => {
        console.error('Failed to track game completion:', error);
      });
    }

    if (passed) {
      // Mark kanji as completed
      onKanjiCompleted(session.kanji.map(k => k.id));

      // Trigger Pokémon capture with kanji IDs
      if (onPokemonCaught) {
        onPokemonCaught(session.pokemonId, session.kanji.map(k => k.id));
      }
    }

    // Usage tracking is now handled automatically by checkAndTrack

    setPhase('result');
  };

  // Show loading state while auth, subscription, feature or game is initializing
  if (authLoading || subscriptionLoading || featureLoading || gameLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {authLoading ? 'Checking authentication...' : (subscriptionLoading || featureLoading) ? 'Checking your subscription...' : 'Loading kanji data...'}
          </p>
        </div>
      </div>
    );
  }

  // Show limit reached message
  if (!authLoading && !subscriptionLoading && showLimitMessage && !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.8 }}
          >
            <img
              src="/pokeball.png"
              alt="Pokéball"
              className="w-32 h-32 mx-auto mb-6 opacity-50 grayscale"
            />
            <h1 className="text-2xl font-bold mb-4">Daily Limit Reached!</h1>
            <p className="text-muted-foreground mb-6">
              You've run out of Pokéballs for today! Come back tomorrow for more encounters.
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-secondary text-secondary-foreground rounded-lg"
            >
              Back to Games
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // Defensive: If customKanji is present but empty, show a message
  if (customKanji && Array.isArray(customKanji) && customKanji.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">No Kanji Provided</h2>
          <p className="text-muted-foreground mb-6">
            No kanji were provided for this battle. Please select kanji from the Kanji Browser.
          </p>
        </div>
      </div>
    );
  }

  // Show kanji selection interface
  if (showKanjiSelection) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">Select Kanji to Battle</h1>
              <button
                onClick={() => {
                  if (selectedKanji.size < 3 || selectedKanji.size > 5) {
                    showNotification({
                      title: 'Invalid Selection',
                      message: `Please select between 3 and 5 kanji to battle. You currently have ${selectedKanji.size} selected.`,
                      type: 'warning'
                    });
                  } else {
                    startNewSessionWithKanji(Array.from(selectedKanji));
                  }
                }}
                className="px-4 py-2 md:px-6 md:py-3 bg-primary text-primary-foreground rounded-lg text-sm md:text-lg font-bold hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Start Battle
              </button>
            </div>
            <p className="text-muted-foreground text-sm md:text-base">Choose 3-5 kanji to practice with</p>
            <div className="mt-2">
              <span className="text-sm font-medium">
                Selected: {selectedKanji.size}/5 (minimum: 3)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {availableKanji.map((kanji) => (
              <button
                key={kanji.id}
                onClick={() => handleKanjiToggle(kanji.id)}
                className={`relative p-4 rounded-lg border-2 transition-all ${selectedKanji.has(kanji.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                  }`}
              >
                {/* Purple checkmark in top-left corner */}
                {selectedKanji.has(kanji.id) && (
                  <div className="absolute top-1 left-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="text-4xl japanese-text mb-2">{kanji.character}</div>
                <div className="text-sm text-muted-foreground">
                  {kanji.meanings[0]}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global Animation Overlays - Outside of phase transitions */}
      {/* Kanji Appearance Animation */}
      <AnimatePresence>
        {showKanjiAppearance && appearanceMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: -50 }}
              transition={{ type: "spring", damping: 12 }}
              className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-purple-900 dark:to-pink-900 rounded-lg p-8 max-w-md mx-4 shadow-2xl border-2 border-yellow-500 dark:border-purple-500"
            >
              <motion.div
                animate={{ 
                  rotate: [0, -5, 5, -5, 0],
                  scale: [1, 1.05, 1, 1.05, 1]
                }}
                transition={{ duration: 0.5, repeat: 2 }}
                className="text-center"
              >
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  A wild <span className="text-4xl japanese-text mx-2">{appearanceMessage.kanji}</span> appeared!
                </h2>
                <img 
                  src="/flat-icons/1752632-pokemon/png/017-gaming.png" 
                  alt="Pokeball"
                  className="w-16 h-16 mx-auto mb-4 animate-bounce"
                />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  Get ready for a <span className="text-primary">{appearanceMessage.attackType}</span>!
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanji Escape Animation */}
      <AnimatePresence>
        {showKanjiEscape && escapedKanji && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 1, x: 0, opacity: 1 }}
              animate={{ 
                scale: [1, 1, 0.9, 0.7],
                x: [0, 0, -30, 400],
                opacity: [1, 1, 0.9, 0],
                rotate: [0, 0, 90, 180]
              }}
              transition={{ 
                duration: 2.5, 
                ease: "easeInOut",
                times: [0, 0.4, 0.7, 1] // Hold at full size for 40% of animation
              }}
              className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 max-w-md mx-4 shadow-2xl border-2 border-gray-500"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                  Oh no! The wild <span className="text-3xl japanese-text mx-2">{escapedKanji.character}</span> escaped!
                </h2>
                <img 
                  src="/flat-icons/1752632-pokemon/png/055-gaming.png" 
                  alt="Escape"
                  className="w-16 h-16 mx-auto opacity-60"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trainer Defeat Animation */}
      <AnimatePresence>
        {showTrainerDefeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[200]"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 rounded-lg p-8 max-w-md mx-4 shadow-2xl border-2 border-red-500"
            >
              <div className="text-center">
                <img 
                  src="/flat-icons/1752632-pokemon/png/030-gaming.png" 
                  alt="Defeat"
                  className="w-20 h-20 mx-auto mb-4 opacity-80 grayscale"
                />
                <h2 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                  You were defeated!
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  The wild {session?.kanji[currentKanjiIndex]?.character || 'kanji'} was too strong!
                </p>
                <button
                  onClick={() => {
                    setShowTrainerDefeat(false);
                    completeQuiz(userAnswers);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300]"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 15 }}
              className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg p-8 max-w-md mx-4 shadow-2xl border-2 border-gray-500"
            >
              <div className="text-center">
                <img 
                  src="/flat-icons/1752632-pokemon/png/040-gaming.png" 
                  alt="Warning"
                  className="w-16 h-16 mx-auto mb-4"
                />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                  Exit Battle?
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to exit? Your progress in this battle will be lost!
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setShowExitConfirmation(false)}
                    className="px-6 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowExitConfirmation(false);
                      // Track early exit if game has been going for more than 10 seconds
                      if (session && phase === 'battle') {
                        const timeTaken = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
                        if (timeTaken > 10) {
                          const questionsAnswered = userAnswers.length;
                          const correctAnswers = userAnswers.filter((answer, index) => 
                            answer === quizQuestions[index]?.correctIndex
                          ).length;
                          const score = questionsAnswered > 0 ? Math.round((correctAnswers / questionsAnswered) * 100) : 0;
                          trackGamePlayed('kanji-quest', score, questionsAnswered, correctAnswers).catch(error => {
                            console.error('Failed to track early exit:', error);
                          });
                        }
                      }
                      onBack();
                    }}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Exit Battle
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Wild Encounter Phase */}
        {phase === 'encounter' && (
          <motion.div
            key="encounter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-3xl font-bold mb-8">A wild Pokémon appeared!</h1>

              <motion.div
                animate={{
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="mb-8"
              >
                <img
                  src={getPokemonSpriteUrl(session.pokemonId)}
                  alt="Wild Pokémon"
                  className={`w-64 h-64 mx-auto ${getPokemonSilhouetteClassName()}`}
                />
              </motion.div>

              <button
                onClick={() => {
                  // Initialize question tracking
                  setAskedQuestions(new Map());
                  
                  // Get first encounter
                  const firstEncounter = getNextEncounter(session.kanji);
                  if (firstEncounter) {
                    const question = generateEncounterQuestion(firstEncounter, session.kanji);
                    setQuizQuestions([question]);
                    setCurrentQuestionIndex(0);
                    setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === firstEncounter.kanji.id));
                    
                    // Set HP for this kanji
                    const baseHP = getKanjiHP(jlptLevel);
                    setKanjiHP(baseHP);
                    setMaxKanjiHP(baseHP);
                    
                    // Generate initial random icons
                    setAnswerIcons(getRandomIcons());
                    
                    setCurrentKanjiIndex(0); // Start from first kanji
                    setPhase('study');
                  }
                }}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-lg text-xl font-bold hover:bg-primary/90 transition-colors"
              >
                📚 Study & Battle!
              </button>
              
              {/* Skip study button */}
              <button
                onClick={() => {
                  if (session) {
                    // Initialize question tracking
                    setAskedQuestions(new Map());
                    
                    // Same setup but skip to battle
                    const firstEncounter = getNextEncounter(session.kanji);
                    if (firstEncounter) {
                      // Show initial kanji appearance
                      setCurrentKanjiId(firstEncounter.kanji.id);
                      setAppearanceMessage({
                        kanji: firstEncounter.kanji.character,
                        attackType: getAttackTypeName(firstEncounter.questionType)
                      });
                      setShowKanjiAppearance(true);
                      setPhase('battle');
                      
                      setTimeout(() => {
                        setShowKanjiAppearance(false);
                        
                        const question = generateEncounterQuestion(firstEncounter, session.kanji);
                        setQuizQuestions([question]);
                        setCurrentQuestionIndex(0);
                        setCurrentKanjiIndex(session.kanji.findIndex(k => k.id === firstEncounter.kanji.id));
                        
                        const baseHP = getKanjiHP(jlptLevel);
                        setKanjiHP(baseHP);
                        setMaxKanjiHP(baseHP);
                        
                        // Generate initial random icons
                        setAnswerIcons(getRandomIcons());
                      }, 3500); // Wait for appearance animation
                    }
                  }
                }}
                className="mt-3 px-6 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                Skip study → Battle now!
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Battle Phase - Integrated Quiz with Battle Interface */}
        {phase === 'battle' && quizQuestions.length > 0 && !showKanjiAppearance && !showKanjiEscape && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto">
            {/* Grey transparent overlay behind the modal */}
            <div className="fixed inset-0 bg-black/80 z-0" onClick={() => setShowExitConfirmation(true)} />
            {/* Modal (battle UI card) centered */}
            <motion.div
              key="battle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col rounded-2xl w-full mx-auto my-4 z-10 overflow-hidden shadow-2xl"
              style={{
                background: battleGradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                height: 'auto',
                minHeight: 'min(85vh, 100%)',
                maxWidth: '20rem',
                boxShadow: '25px 30px 70px rgba(0, 0, 0, 0.7), 15px 20px 40px rgba(0, 0, 0, 0.5), 8px 10px 20px rgba(0, 0, 0, 0.3)'
              }}
            >

              <div className="container mx-auto px-4 py-1 flex flex-col flex-1">
                {/* Secondary Terminal Display */}
                <div className="w-2/3 mx-auto mb-2">
                  <h2 className="text-white text-lg font-bold text-center mb-2">Battle Arena</h2>
                  <div className="rounded-lg border border-gray-600 bg-black/40 backdrop-blur-sm shadow-inner p-2 h-16 overflow-hidden relative">
                    {/* Terminal-style scrolling text */}
                    <div className="absolute inset-0 flex items-center">
                      <motion.div
                        animate={{ x: ["100%", "-100%"] }}
                        transition={{ 
                          duration: 60, 
                          repeat: Infinity, 
                          ease: "linear",
                          repeatDelay: 0
                        }}
                        className="flex items-center gap-4 text-green-400 font-mono text-sm whitespace-nowrap"
                      >
                        <span className="text-green-500">{'>'}</span>
                        <span>
                          {(() => {
                            // Calculate total questions remaining
                            let totalRemaining = 0;
                            session.kanji.forEach(k => {
                              const available = getAvailableQuestionTypes(k);
                              totalRemaining += available.length;
                            });
                            return `[SYSTEM] ${totalRemaining} encounters remaining`;
                          })()}
                        </span>
                        <img src="/flat-icons/1752632-pokemon/png/025-gaming.png" alt="" className="w-4 h-4 inline" />
                        {battleLog.length > 0 && (
                          <>
                            <span className="text-green-500">•</span>
                            <span>[BATTLE LOG] {battleLog[battleLog.length - 1]?.message || ''}</span>
                          </>
                        )}
                        <img src="/flat-icons/1752632-pokemon/png/017-gaming.png" alt="" className="w-4 h-4 inline" />
                        <span className="text-green-500">•</span>
                        <span>[TRAINER] Level 50 • HP: {trainerHP}/{maxTrainerHP}</span>
                        <img src="/flat-icons/1752632-pokemon/png/035-gaming.png" alt="" className="w-4 h-4 inline" />
                        <span className="text-green-500">•</span>
                        <span>[WILD POKEMON] {quizQuestions[0]?.kanjiRef?.character || '?'} • HP: {kanjiHP}/{maxKanjiHP}</span>
                        <img src="/flat-icons/1752632-pokemon/png/040-gaming.png" alt="" className="w-4 h-4 inline" />
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* GameBoy-style frosted screen wrapper */}
                <div className="rounded-xl border border-white/30 bg-white/30 backdrop-blur-md shadow-md mb-2 p-3 relative overflow-hidden">
                  {/* Corner Glows */}
                  <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-300/50 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-400/50 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/50 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-green-400/50 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  
                  {/* Current Kanji HP Bar - Top Left Corner */}
                  <div className="absolute top-1 left-1">
                    <div className="bg-yellow-200 border border-gray-800 rounded-md px-2 py-0.5 min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-800">Wild {quizQuestions[0]?.kanjiRef?.character || '?'}</span>
                        <span className="text-[10px] font-bold text-gray-800">Lv.{jlptLevel === 5 ? '10' : jlptLevel === 4 ? '20' : jlptLevel === 3 ? '30' : jlptLevel === 2 ? '40' : '50'}</span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-1.5 p-0.5">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full rounded-full relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-300 h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(kanjiHP / maxKanjiHP) * 100}%`,
                              backgroundColor: kanjiHP < maxKanjiHP * 0.2 ? '#ef4444' : kanjiHP < maxKanjiHP * 0.5 ? '#eab308' : '#22c55e'
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-gray-700 text-right">{kanjiHP}/{maxKanjiHP}</div>
                    </div>
                  </div>

                  {/* Player HP Bar - Bottom Right Corner */}
                  <div className="absolute bottom-1 right-1">
                    <div className="bg-yellow-200 border border-gray-800 rounded-md px-2 py-0.5 min-w-[120px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-800">{user?.displayName?.split(' ')[0] || 'Sensei'}</span>
                        <span className="text-[10px] font-bold text-gray-800">Lv.50</span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-1.5 p-0.5">
                        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 h-full rounded-full relative overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-300 h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(trainerHP / maxTrainerHP) * 100}%`,
                              backgroundColor: trainerHP < maxTrainerHP * 0.2 ? '#ef4444' : trainerHP < maxTrainerHP * 0.5 ? '#eab308' : '#22c55e'
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-gray-700 text-right">{trainerHP}/{maxTrainerHP}</div>
                    </div>
                  </div>

                  {/* Battle Arena */}
                  <div className="h-48 md:h-56 flex items-center justify-center relative">
                    {/* Pokemon Sprite - Top Right */}
                    <div className="absolute -top-2 right-2">
                      <motion.div
                        animate={{
                          y: [0, -2, 0],
                          x: [0, 1, 0]
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <img
                          src={getPokemonSpriteUrl(session.pokemonId)}
                          alt="Wild Pokémon"
                          className="w-16 h-16 md:w-20 md:h-20"
                        />
                      </motion.div>
                    </div>

                    {/* Kanji - Center */}
                    <motion.div
                      key={`kanji-${currentKanjiIndex}`}
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        ...(showKanjiDefeat ? {
                          scale: [1, 1.2, 0],
                          opacity: [1, 1, 0],
                          rotate: [0, 180, 360],
                          filter: ['brightness(1)', 'brightness(2)', 'brightness(0)']
                        } : {
                          opacity: 1,
                          scale: 1,
                          y: [0, -5, 0],
                          rotate: [0, 2, -2, 0],
                          ...(showDamageEffect && isAttacking && !userAnswers[currentQuestionIndex] ? {
                            x: [0, -5, 5, -5, 5, 0],
                            filter: ['brightness(1)', 'brightness(2)', 'brightness(0.5)', 'brightness(1)'],
                            transition: { duration: 0.5 }
                          } : {})
                        })
                      }}
                      transition={{
                        duration: showKanjiDefeat ? 1.5 : 3,
                        repeat: showKanjiDefeat ? 0 : Infinity,
                        ease: showKanjiDefeat ? "easeOut" : "easeInOut"
                      }}
                      className="relative"
                    >
                      <div className="text-6xl md:text-7xl relative">
                        {session.kanji[currentKanjiIndex]?.character}
                        {/* Question count indicator - smaller and more subtle */}
                        <div className="absolute -top-10 right-0 text-xs font-medium text-yellow-400/80 bg-black/30 px-2 py-0.5 rounded">
                          {(() => {
                            const currentKanji = session.kanji[currentKanjiIndex];
                            const askedForThisKanji = askedQuestions.get(currentKanji?.id || '') || new Set();
                            const totalPossible = 
                              (currentKanji?.on_readings?.length > 0 ? 1 : 0) +
                              (currentKanji?.kun_readings?.length > 0 ? 1 : 0) +
                              1; // meaning always exists
                            // Don't exceed total possible
                            const currentCount = Math.min(askedForThisKanji.size + 1, totalPossible);
                            return `${currentCount}/${totalPossible}`;
                          })()}
                        </div>
                        {/* Damage number animation */}
                        <AnimatePresence>
                          {isAttacking && userAnswers[currentQuestionIndex] === quizQuestions[currentQuestionIndex]?.correctIndex && (
                            <motion.div
                              initial={{ y: 0, opacity: 1 }}
                              animate={{ y: -50, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1 }}
                              className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-bold text-3xl"
                            >
                              -{battleLog[battleLog.length - 1]?.damage || 0}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>

                    {/* Trainer - Bottom Left */}
                    <div className="absolute -bottom-2 left-2">
                      <motion.div
                        animate={{
                          x: [0, 1, 0],
                          y: [0, -0.5, 0],
                          ...(showDamageEffect && !isAttacking ? {
                            x: [0, -3, 3, -3, 3, 0],
                            filter: ['brightness(1)', 'brightness(2)', 'brightness(0.5)', 'brightness(1)'],
                            transition: { duration: 0.5 }
                          } : {})
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="relative"
                      >
                        <img
                          src="/trainer.png"
                          alt="Trainer"
                          className="w-12 h-16 md:w-16 md:h-20"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'block';
                            }
                          }}
                        />
                        <div className="text-3xl md:text-4xl hidden">🥋</div>
                        {/* Damage number animation for trainer */}
                        <AnimatePresence>
                          {showDamageEffect && !isAttacking && (
                            <motion.div
                              initial={{ y: 0, opacity: 1 }}
                              animate={{ y: -50, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 1 }}
                              className="absolute top-0 left-1/2 -translate-x-1/2 text-red-500 font-bold text-xl"
                            >
                              -{battleLog.find(log => log.type === 'kanji_attack' && log.timestamp === battleLog[battleLog.length - 1]?.timestamp)?.damage || 0}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Pokeball throwing animation */}
                  <AnimatePresence>
                    {showPokeballAnimation && (
                      <>
                        {[0, 1, 2].map((index) => (
                          <motion.div
                            key={`pokeball-${index}`}
                            initial={{ 
                              x: -30, 
                              y: 30, 
                              scale: 0.8, 
                              opacity: 0.4,
                              rotate: 0
                            }}
                            animate={{ 
                              x: [0, 150, 280], 
                              y: [30, -50, -120],
                              scale: [0.8, 0.5, 0.2],
                              opacity: [0.4, 0.3, 0],
                              rotate: [0, 360, 720]
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                              duration: 1.2,
                              delay: index * 0.15,
                              ease: "easeOut"
                            }}
                            className="absolute bottom-10 left-10 pointer-events-none"
                            style={{ zIndex: 100 }}
                          >
                            <img 
                              src="/pokeball.png" 
                              alt="Pokeball" 
                              className="w-8 h-8"
                              onError={(e) => {
                                // Fallback to emoji if image fails
                                e.currentTarget.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.textContent = '⚪';
                                fallback.className = 'text-2xl';
                                e.currentTarget.parentNode?.appendChild(fallback);
                              }}
                            />
                          </motion.div>
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Transition Overlay */}
                <AnimatePresence>
                  {isTransitioning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center z-20"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="bg-white/90 rounded-lg p-6 text-center"
                      >
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Kanji Defeated!</h3>
                        <p className="text-gray-600">
                          {currentKanjiIndex < session.kanji.length - 1 
                            ? `Next opponent: ${session.kanji[currentKanjiIndex + 1]?.character}`
                            : 'Final battle complete!'}
                        </p>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Wrong Answer Feedback Modal */}
                <AnimatePresence>
                  {showWrongAnswerModal && lastWrongQuestion && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-30"
                      onClick={handleWrongAnswerModalClose}
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 10 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="relative bg-red-50 dark:bg-red-950/90 rounded-lg p-6 max-w-sm mx-4 border-2 border-red-500 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* X close button in top right */}
                        <button
                          onClick={handleWrongAnswerModalClose}
                          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          aria-label="Close"
                        >
                          <svg className="w-5 h-5 text-red-700 dark:text-red-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        
                        <div className="text-center">
                          <img 
                            src="/flat-icons/1752632-pokemon/png/040-gaming.png" 
                            alt="Wrong answer"
                            className="w-16 h-16 mx-auto mb-3 opacity-80"
                          />
                          <h3 className="text-xl font-bold text-red-700 dark:text-red-300 mb-4">Incorrect!</h3>
                          
                          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">The correct answer was:</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200 japanese-text">
                              {lastWrongQuestion.options[lastWrongQuestion.correctIndex]}
                            </p>
                            
                            {/* Show additional context based on question type */}
                            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                              {/* Always show the meaning */}
                              <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                                <p className="font-semibold text-gray-700 dark:text-gray-300">
                                  {lastWrongQuestion.kanjiRef.character} = {lastWrongQuestion.kanjiRef.meanings.join(', ')}
                                </p>
                              </div>
                              
                              {/* Additional info based on question type */}
                              {lastWrongQuestion.type === 'reading' && (
                                <div className="mt-2">
                                  <p className="font-medium">Readings:</p>
                                  {lastWrongQuestion.kanjiRef.on_readings.length > 0 && (
                                    <p className="text-xs">On'yomi: {lastWrongQuestion.kanjiRef.on_readings.join(', ')}</p>
                                  )}
                                  {lastWrongQuestion.kanjiRef.kun_readings.length > 0 && (
                                    <p className="text-xs">Kun'yomi: {lastWrongQuestion.kanjiRef.kun_readings.join(', ')}</p>
                                  )}
                                </div>
                              )}
                              
                              {lastWrongQuestion.type === 'vocab' && (
                                <p className="text-xs mt-1">This kanji is used in vocabulary words</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Controls area: D-pad, A/B, Start/Select (improved Game Boy layout) */}
                <div className="relative flex flex-col items-center gap-4 mb-10 mt-2">
                  <div className="flex w-full justify-between items-end px-8 relative" style={{ minHeight: '80px' }}>
                    {/* D-pad left, lower */}
                    <div className="absolute left-0 bottom-0">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* Vertical bar */}
                        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-7 h-20 bg-gray-600 rounded-sm shadow-inner border border-gray-900 shadow-lg" />
                        {/* Horizontal bar */}
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-7 w-20 bg-gray-600 rounded-sm shadow-inner border border-gray-900 shadow-lg" />
                        {/* Center circle */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gray-700 rounded-full shadow-md flex items-center justify-center border border-gray-900 shadow-xl">
                          <div className="w-4 h-4 bg-gray-800 rounded-full shadow-inner" />
                        </div>
                      </div>
                    </div>
                    {/* A/B buttons right, Game Boy layout */}
                    <div className="absolute right-0 bottom-6">
                      <div className="relative w-20 h-14">
                        {/* A button - left and lower */}
                        <button className="absolute left-0 bottom-0 w-10 h-10 rounded-full bg-gray-700 text-white font-bold text-base shadow-md border-2 border-gray-900 flex items-center justify-center">A</button>
                        {/* B button - right and higher */}
                        <button className="absolute right-0 top-0 w-10 h-10 rounded-full bg-gray-700 text-white font-bold text-base shadow-md border-2 border-gray-900 flex items-center justify-center">B</button>
                      </div>
                    </div>
                    {/* Start/Select centered below controls */}
                    <div className="absolute left-1/2 bottom-[-32px] -translate-x-1/2 flex gap-6">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className="w-12 h-2 bg-gray-600 rounded-full shadow-inner flex items-center justify-center hover:bg-gray-500 transition-colors"
                          aria-label={isMuted ? "Unmute music" : "Mute music"}
                        >
                          <img 
                            src="/flat-icons/root-icons/volume.svg" 
                            alt={isMuted ? "Unmute" : "Mute"} 
                            className={`w-3 h-3 ${isMuted ? 'opacity-50' : 'opacity-100'} transition-opacity`}
                            style={{ filter: 'invert(1)' }}
                          />
                        </button>
                        <span className="text-[9px] text-gray-300 font-medium">START</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-12 h-2 bg-gray-600 rounded-full shadow-inner"></div>
                        <span className="text-[9px] text-gray-300 font-medium">SELECT</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto px-2 pb-2">
                {/* Battle Interface - Integrated Quiz */}
                <div className="bg-black/30 rounded-lg p-2 backdrop-blur-sm mb-2">
                  <div className="text-white text-center mb-2 min-h-[3.5rem] flex items-center justify-center">
                    <h3 className="text-lg font-bold leading-7">
                      {quizQuestions[currentQuestionIndex]?.question ? (
                        quizQuestions[currentQuestionIndex].question.split(' ').map((word, idx) => {
                          // Check if the word contains Japanese characters
                          if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word)) {
                            return <span key={idx} className="text-sm"> {word} </span>;
                          }
                          return <span key={idx}> {word} </span>;
                        })
                      ) : 'Loading...'}
                    </h3>
                  </div>

                  {/* 2x2 grid for answers */}
                  <div className="grid grid-cols-2 gap-2">
                    {quizQuestions[currentQuestionIndex]?.options?.map((option, idx) => {
                      const isCorrect = idx === quizQuestions[currentQuestionIndex].correctIndex;
                      const isSelected = userAnswers[currentQuestionIndex] === idx;
                      const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;

                      // Get attack type for current question
                      const questionAttackType = getAttackTypeFromQuestion(quizQuestions[currentQuestionIndex].type);
                      const currentAttack = ATTACK_TYPES[questionAttackType];

                      // Visual indicators for attack types
                      const attackIcons = {
                        'meaning': '🧠',
                        'reading': '🔊',
                        'kanji': '⚔️',
                        'vocabulary': '📚'
                      };

                      const attackNames = {
                        'meaning': 'Mind Strike',
                        'reading': 'Sound Wave',
                        'kanji': 'Symbol Slash',
                        'vocabulary': 'Context Combo'
                      };

                      // Pastel color backgrounds for each button position
                      const pastelBackgrounds = [
                        'bg-pink-300/20',    // Top left - soft pink
                        'bg-sky-300/20',     // Top right - soft blue
                        'bg-amber-300/20',   // Bottom left - soft yellow
                        'bg-emerald-300/20'  // Bottom right - soft green
                      ];

                      return (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(idx)}
                          disabled={showQuizFeedback || isTransitioning || isProcessingAnswer}
                          className={`w-full p-1.5 rounded-lg border-2 text-left transition-all backdrop-blur-sm ${showQuizFeedback && hasAnswered
                            ? isCorrect
                              ? 'border-green-400 bg-green-500/30 text-green-100'
                              : isSelected
                                ? 'border-red-400 bg-red-500/30 text-red-100'
                                : `border-white/30 ${pastelBackgrounds[idx]} text-white/90`
                            : `border-white/40 ${pastelBackgrounds[idx]} hover:bg-white/30 text-white cursor-pointer`
                            }`}
                        >
                          <div className="flex flex-col gap-0">
                            <div className="flex items-center gap-1">
                              <img 
                                src={answerIcons[idx] || "/pokeball.png"} 
                                alt="Answer icon" 
                                className="w-3 h-3 flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = "/pokeball.png";
                                }}
                              />
                              <div className="text-xs md:text-sm japanese-text font-medium truncate">{option}</div>
                            </div>
                            <div className="text-[8px] text-white/60 text-right">
                              <div className="text-[7px] md:text-[9px]">{attackNames[questionAttackType]}</div>
                              <div className="text-[7px] md:text-[9px]">Power: {currentAttack.baseDamage}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Study Phase */}
        {phase === 'study' && (
          <motion.div
            key="study"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto px-4 py-8 max-w-4xl pb-32 md:pb-8"
          >
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Study Phase</h2>
                <div className="text-muted-foreground">
                  {currentKanjiIndex + 1} / {session.kanji.length}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentKanjiIndex + 1) / session.kanji.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Kanji Card */}
            <motion.div
              key={session.kanji[currentKanjiIndex].id}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="bg-card rounded-lg p-8 border border-border mb-6"
            >
              <div className="text-center mb-6">
                <div className="text-8xl japanese-text mb-4">
                  {session.kanji[currentKanjiIndex].character}
                </div>

                <KanjiTTSButton
                  kanji={session.kanji[currentKanjiIndex].character}
                  size="lg"
                  variant="default"
                />
              </div>

              <div className="space-y-4">
                {/* Readings */}
                <div>
                  <h3 className="font-semibold mb-2">Readings</h3>
                  <div className="flex flex-wrap gap-2">
                    {session.kanji[currentKanjiIndex].on_readings.map((reading, idx) => (
                      <div
                        key={`on-${idx}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg"
                      >
                        <KanjiTTSButton
                          kanji={session.kanji[currentKanjiIndex].character}
                          reading={reading}
                          readingType="on"
                          size="sm"
                          variant="minimal"
                        />
                        <span>{reading} (On)</span>
                      </div>
                    ))}
                    {session.kanji[currentKanjiIndex].kun_readings.map((reading, idx) => (
                      <div
                        key={`kun-${idx}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg"
                      >
                        <KanjiTTSButton
                          kanji={session.kanji[currentKanjiIndex].character}
                          reading={reading}
                          readingType="kun"
                          size="sm"
                          variant="minimal"
                        />
                        <span>{reading} (Kun)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Meanings */}
                <div>
                  <h3 className="font-semibold mb-2">Meanings</h3>
                  <p className="text-lg">{session.kanji[currentKanjiIndex].meanings.join(', ')}</p>
                </div>

                {/* Sample Vocabulary */}
                {session.kanji[currentKanjiIndex].vocabulary && session.kanji[currentKanjiIndex].vocabulary.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">Sample Words</h3>
                      <button
                        onClick={() => setShowFurigana(!showFurigana)}
                        className="text-sm px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                      >
                        {showFurigana ? 'Hide' : 'Show'} Furigana
                      </button>
                    </div>
                    <div className="space-y-2">
                      {session.kanji[currentKanjiIndex].vocabulary.slice(0, 3).map((vocab, idx) => (
                        <div
                          key={idx}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <VocabularyTTSButton
                            word={vocab.word}
                            kana={vocab.reading}
                            size="sm"
                            variant="default"
                          />
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg japanese-text font-medium">{vocab.word}</span>
                            {showFurigana && vocab.reading && (
                              <span className="text-sm text-muted-foreground japanese-text">{vocab.reading}</span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">- {vocab.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center mb-32 md:mb-8">
              <button
                onClick={() => setCurrentKanjiIndex(Math.max(0, currentKanjiIndex - 1))}
                disabled={currentKanjiIndex === 0}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50"
              >
                Previous
              </button>

              {currentKanjiIndex === session.kanji.length - 1 ? (
                <button
                  onClick={handleStudyComplete}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Ready for Battle! 🎮
                </button>
              ) : (
                <button
                  onClick={() => setCurrentKanjiIndex(currentKanjiIndex + 1)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                  Next
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Quiz Phase */}
        {phase === 'quiz' && quizQuestions.length > 0 && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="container mx-auto px-4 py-8 max-w-2xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4">Training Ground Quiz</h2>
              <div className="flex justify-between items-center mb-2">
                <span>Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                <span className="text-muted-foreground">
                  Score: {userAnswers.filter((a, i) => a === quizQuestions[i]?.correctIndex).length}/{userAnswers.length}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <motion.div
              key={currentQuestionIndex}
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-card rounded-lg p-6 border border-border"
            >
              <h3 className="text-xl mb-6">{quizQuestions[currentQuestionIndex].question}</h3>

              <div className="space-y-3">
                {quizQuestions[currentQuestionIndex].options.map((option, idx) => {
                  const isCorrect = idx === quizQuestions[currentQuestionIndex].correctIndex;
                  const isSelected = userAnswers[currentQuestionIndex] === idx;
                  const hasAnswered = userAnswers[currentQuestionIndex] !== undefined;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleQuizAnswer(idx)}
                      disabled={showQuizFeedback}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all text-2xl japanese-text ${showQuizFeedback && hasAnswered
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : isSelected
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-border'
                        : 'border-border hover:border-primary hover:bg-muted cursor-pointer'
                        }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {/* Manual continue button as fallback */}
              {showQuizFeedback && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      // If no answer was recorded for this question, record it as unanswered (-1)
                      if (userAnswers.length <= currentQuestionIndex) {
                        const newAnswers = [...userAnswers];
                        // Fill any gaps with -1 (unanswered)
                        while (newAnswers.length <= currentQuestionIndex) {
                          newAnswers.push(-1);
                        }
                        setUserAnswers(newAnswers);
                      }

                      if (currentQuestionIndex < quizQuestions.length - 1) {
                        setCurrentQuestionIndex(prev => prev + 1);
                        setShowQuizFeedback(false);
                      } else {
                        // Make sure we have all answers including the current one
                        const finalAnswers = [...userAnswers];
                        // Fill any remaining gaps
                        while (finalAnswers.length < quizQuestions.length) {
                          finalAnswers.push(-1);
                        }
                        completeQuiz(finalAnswers);
                      }
                    }}
                    className="text-sm text-primary hover:text-primary/80 underline"
                  >
                    Continue →
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Result Phase */}
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen p-4"
            style={{
              background: session.status === 'completed'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #434343 0%, #000000 100%)'
            }}
          >
            <div className="text-center max-w-2xl">
              {session.status === 'completed' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                  >
                    <h1 className="text-4xl font-bold mb-8 text-white">Gotcha! 🎉</h1>

                    {/* Pokeball capture animation */}
                    <div className="relative mb-8">
                      <motion.div
                        initial={{ y: -200, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                      >
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 10, -10, 0],
                            scale: [1, 1.1, 0.9, 1.1, 0.9, 1]
                          }}
                          transition={{
                            duration: 1,
                            delay: 1,
                            times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                          }}
                          className="inline-block"
                        >
                          <img
                            src="/pokeball.png"
                            alt="Pokeball"
                            className="w-32 h-32 mx-auto mb-4"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.textContent = '🔴';
                              fallback.className = 'text-6xl';
                              e.currentTarget.parentNode?.appendChild(fallback);
                            }}
                          />
                        </motion.div>
                      </motion.div>

                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, delay: 2 }}
                      >
                        <img
                          src={getPokemonSpriteUrl(session.pokemonId)}
                          alt="Caught Pokémon"
                          className="w-48 h-48 mx-auto"
                        />
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2.5 }}
                    >
                      <p className="text-xl mb-2 text-white">Score: {Math.round(session.quizScore || 0)}%</p>
                      <p className="text-white/80 mb-4">
                        The wild Pokémon was caught!
                      </p>
                      <p className="text-white/80 mb-8">
                        You mastered {session.kanji.length} kanji!
                      </p>
                    </motion.div>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.8 }}
                  >
                    <h1 className="text-4xl font-bold mb-8 text-white">
                      {trainerHP <= 0 ? 'You blacked out!' : 'The wild Pokémon fled...'} 😔
                    </h1>

                    <motion.div
                      animate={{
                        opacity: [1, 0.3, 1],
                        filter: ['grayscale(0)', 'grayscale(1)', 'grayscale(1)']
                      }}
                      transition={{ duration: 2 }}
                      className="mb-8"
                    >
                      <img
                        src={getPokemonSpriteUrl(session.pokemonId)}
                        alt="Escaped Pokémon"
                        className={`w-48 h-48 mx-auto opacity-50 ${getPokemonSilhouetteClassName()}`}
                      />
                    </motion.div>

                    <p className="text-xl mb-2 text-white">Score: {Math.round(session.quizScore || 0)}%</p>
                    <p className="text-white/80 mb-8">
                      {trainerHP <= 0
                        ? 'Your HP reached 0. Train harder and try again!'
                        : 'You need at least 75% to catch the Pokémon. Keep practicing!'}
                    </p>
                  </motion.div>
                </>
              )}

              <motion.div
                className="flex gap-4 justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
              >
                <button
                  onClick={onBack}
                  className="px-6 py-3 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
                >
                  Back to Games
                </button>
                <button
                  onClick={startNewSession}
                  className="px-6 py-3 bg-white text-purple-700 rounded-lg hover:bg-white/90 transition-colors font-bold"
                >
                  New Encounter
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
