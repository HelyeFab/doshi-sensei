'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { learnedWordsStorage } from '@/app/tools/word-learning-session/services/learnedWordsStorage';
import { useAuth } from '@/contexts/AuthContext';
import { TEXTBOOK_CONFIG } from '@/config/textbooks';

interface WordLearningLessonSelectorProps {
  textbook: string;
  currentTextbook: any;
  selectedLesson: number | null;
  onLessonSelect: (lesson: number | null) => void;
  isPremium: boolean;
  checkAndTrack: (feature: string) => Promise<boolean>;
  vocabulary: any[]; // Pass vocabulary data from parent
}

export function WordLearningLessonSelector({
  textbook,
  currentTextbook,
  selectedLesson,
  onLessonSelect,
  isPremium,
  checkAndTrack,
  vocabulary
}: WordLearningLessonSelectorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [lessonProgress, setLessonProgress] = useState<Record<string, { learned: number; total: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWordCount, setSelectedWordCount] = useState<number>(10);
  const [studyMode, setStudyMode] = useState<'new' | 'review' | 'all'>('new');

  useEffect(() => {
    loadProgress();
  }, [textbook, user?.uid, vocabulary]);

  const loadProgress = async () => {
    const userId = user?.uid || 'guest';
    const progress: Record<string, { learned: number; total: number }> = {};

    // Group vocabulary by lesson
    const lessonGroups = vocabulary.reduce((acc, word) => {
      const lesson = word.lesson || 1;
      if (!acc[lesson]) acc[lesson] = [];
      acc[lesson].push(word);
      return acc;
    }, {} as Record<number, any[]>);

    // Get progress for each lesson that has vocabulary
    for (const [lessonNum, words] of Object.entries(lessonGroups)) {
      // For Genki 2, map data lesson numbers (13-23) back to UI lesson numbers (1-11)
      const uiLessonNum = textbook === 'genki-2' && Number(lessonNum) >= 13 ? Number(lessonNum) - 12 : Number(lessonNum);
      const lessonId = `${textbook}-lesson${uiLessonNum}`;
      const totalWords = words.length;
      
      if (totalWords > 0) {
        const progressData = await learnedWordsStorage.getLessonProgress(
          userId,
          lessonId,
          totalWords
        );
        
        progress[lessonId] = {
          learned: progressData.learnedWords.length,
          total: totalWords
        };
      }
    }

    setLessonProgress(progress);
  };

  const getVocabularySetInfo = async (lessonId: string) => {
    // Map textbook format to match word learning session data structure
    const mappedId = lessonId
      .replace('genki-1-', 'genki1-')
      .replace('genki-2-', 'genki2-')
      .replace('minna-1-', 'minna1-')
      .replace('minna-2-', 'minna2-');
    
    // For now, return static data based on known lessons
    const lessonData: Record<string, number> = {
      'genki1-lesson1': 10,
      'genki1-lesson2': 5,
      // Add more as they're implemented
    };
    
    return lessonData[mappedId] ? { totalWords: lessonData[mappedId] } : null;
  };

  const handleStartSession = async (lessonNumber: number) => {
    console.log('handleStartSession called for lesson:', lessonNumber);
    
    // Check access
    const hasAccess = await checkAndTrack('word_learning_session');
    if (!hasAccess) {
      console.log('Access denied');
      return;
    }

    // For Genki 2, adjust lesson number (UI shows 1-11, but data has 13-23)
    const dataLessonNumber = textbook === 'genki-2' ? lessonNumber + 12 : lessonNumber;
    console.log('Data lesson number:', dataLessonNumber);

    // Get vocabulary for this lesson
    const lessonWords = vocabulary.filter(word => word.lesson === dataLessonNumber);
    console.log('Found words:', lessonWords.length);
    
    if (lessonWords.length === 0) {
      console.log('No words available for lesson');
      return; // No words available
    }

    // Filter based on study mode and learned status
    const userId = user?.uid || 'guest';
    const lessonId = `${textbook}-lesson${lessonNumber}`;
    const learnedWords = await learnedWordsStorage.getLearnedWords(userId, lessonId);
    
    let availableWords = lessonWords;
    if (studyMode === 'new') {
      availableWords = lessonWords.filter(w => !learnedWords.includes(w.id));
    } else if (studyMode === 'review') {
      availableWords = lessonWords.filter(w => learnedWords.includes(w.id));
    }

    // Randomly select the requested number of words
    const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(selectedWordCount, shuffled.length));

    // Transform vocabulary to word learning session format
    const transformedWords = selectedWords.map(word => ({
      id: word.id,
      kanji: word.kanji || word.japanese || word.word,
      kana: word.reading,
      meaning: word.meaning,
      partOfSpeech: Array.isArray(word.partOfSpeech) ? word.partOfSpeech[0] : (word.partOfSpeech || word.pos),
      example: word.examples && word.examples[0] ? {
        japanese: word.examples[0].japanese,
        reading: word.examples[0].reading,
        english: word.examples[0].english
      } : word.example ? {
        japanese: word.example,
        reading: word.exampleReading,
        english: word.exampleMeaning
      } : undefined
    }));

    // Store the words in session storage for the word learning session to pick up
    const sessionData = {
      lessonId,
      textbook,
      words: transformedWords
    };
    console.log('Storing session data:', sessionData);
    
    try {
      sessionStorage.setItem('wordLearningSessionWords', JSON.stringify(sessionData));
      console.log('Session data stored successfully');
    } catch (error) {
      console.error('Failed to store session data:', error);
      return;
    }
    
    console.log('Navigating to word learning session...');
    router.push(`/tools/word-learning-session?session=custom`);
  };

  const getLessonStatus = (lessonNumber: number) => {
    // For Genki 2, adjust lesson number (UI shows 1-11, but data has 13-23)
    const dataLessonNumber = textbook === 'genki-2' ? lessonNumber + 12 : lessonNumber;
    
    const lessonId = `${textbook}-lesson${lessonNumber}`;
    const progress = lessonProgress[lessonId];
    const lessonWords = vocabulary.filter(word => word.lesson === dataLessonNumber);
    
    if (!lessonWords.length) return 'empty';
    if (!progress) return 'new';
    if (progress.learned === 0) return 'new';
    if (progress.learned === progress.total) return 'complete';
    return 'partial';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Mode Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Study Mode</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setStudyMode('new')}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              studyMode === 'new'
                ? 'bg-blue-500 text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            New Words
          </button>
          <button
            onClick={() => setStudyMode('review')}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              studyMode === 'review'
                ? 'bg-green-500 text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => setStudyMode('all')}
            className={`p-3 rounded-lg text-sm font-medium transition-colors ${
              studyMode === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-card text-foreground hover:bg-muted'
            }`}
          >
            All Words
          </button>
        </div>
      </div>

      {/* Word Count Selector */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Words per Session</h3>
          <span className="text-2xl font-bold text-primary">{selectedWordCount}</span>
        </div>
        <input
          type="range"
          min="1"
          max="20"
          value={selectedWordCount}
          onChange={(e) => setSelectedWordCount(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1</span>
          <span>20</span>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: currentTextbook.lessons }, (_, i) => i + 1).map((lessonNumber) => {
          const lessonId = `${textbook}-lesson${lessonNumber}`;
          const progress = lessonProgress[lessonId];
          const status = getLessonStatus(lessonNumber);
          const isLocked = !isPremium && lessonNumber > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson;
          
          // For Genki 2, adjust lesson number (UI shows 1-11, but data has 13-23)
          const dataLessonNumber = textbook === 'genki-2' ? lessonNumber + 12 : lessonNumber;
          const lessonWords = vocabulary.filter(word => word.lesson === dataLessonNumber);
          const totalWords = lessonWords.length;
          
          return (
            <motion.button
              key={lessonNumber}
              whileHover={{ scale: isLocked ? 1 : 1.02 }}
              whileTap={{ scale: isLocked ? 1 : 0.98 }}
              onClick={() => !isLocked && handleStartSession(lessonNumber)}
              disabled={isLocked || status === 'empty'}
              className={`relative p-4 rounded-lg border transition-all ${
                isLocked
                  ? 'bg-muted/50 border-muted cursor-not-allowed'
                  : status === 'empty'
                  ? 'bg-muted/30 border-muted cursor-not-allowed opacity-50'
                  : status === 'complete'
                  ? 'bg-primary/20 border-primary/50 hover:border-primary/70'
                  : status === 'partial'
                  ? 'bg-primary/15 border-primary/40 hover:border-primary/60'
                  : 'bg-card border-border hover:border-primary'
              }`}
            >
              {/* Lock Icon */}
              {isLocked && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              {/* Completion Badge */}
              {status === 'complete' && (
                <div className="absolute top-2 right-2">
                  <span className="text-2xl">✅</span>
                </div>
              )}

              <h4 className="font-semibold text-foreground mb-1">
                Lesson {lessonNumber}
              </h4>
              
              {totalWords > 0 && (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    {progress?.learned || 0} / {totalWords} words
                  </p>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((progress?.learned || 0) / totalWords) * 100}%` }}
                    />
                  </div>
                </>
              )}
              
              {status === 'empty' && (
                <p className="text-sm text-gray-400">Coming Soon</p>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="mt-6 mb-20 p-4 bg-primary/10 rounded-lg">
        <h4 className="font-semibold text-foreground mb-1">Word Learning Sessions</h4>
        <p className="text-sm text-foreground/80">
          Learn vocabulary through three phases: Exposure, Recognition, and Active Recall. 
          Track your progress and review words at the perfect time!
        </p>
      </div>
    </div>
  );
}