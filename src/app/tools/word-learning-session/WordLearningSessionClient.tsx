'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import ExposurePhase from './components/ExposurePhase';
import RecognitionGame from './components/RecognitionGame';
import ActiveRecallDrill from './components/ActiveRecallDrill';
import AudioMatching from './components/AudioMatching';
import SessionComplete from './components/SessionComplete';
import LessonSelector from './components/LessonSelector';
import { WordItem, SessionData, SessionPhase } from './types';
import { sessionStorage } from './services/sessionStorage';
import { learnedWordsStorage } from './services/learnedWordsStorage';
import { getVocabularySet } from './data/vocabularySets';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';

export default function WordLearningSessionClient() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { profile } = useUserProfile();
  
  const [phase, setPhase] = useState<SessionPhase>('selection');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [weakWords, setWeakWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [studyMode, setStudyMode] = useState<'new' | 'review' | 'all'>('new');

  // Handle URL parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !searchParams) return;
    
    try {
      const session = searchParams.get('session');
      
      if (session === 'custom') {
        // Load custom session from session storage
        const sessionDataStr = window.sessionStorage.getItem('wordLearningSessionWords');
        if (sessionDataStr) {
          try {
            const { lessonId, textbook, words } = JSON.parse(sessionDataStr);
            
            // Start session with custom words
            const newSession: SessionData = {
              id: `session_${Date.now()}`,
              setId: lessonId,
              words: words,
              startedAt: new Date(),
              completedAt: null,
              score: 0,
              weakWords: []
            };
            
            setSessionData(newSession);
            setPhase('exposure');
            
            // Clear session storage
            window.sessionStorage.removeItem('wordLearningSessionWords');
          } catch (error) {
            console.error('Failed to load custom session:', error);
          }
        }
      } else {
        // Original URL parameter handling
        const lesson = searchParams.get('lesson');
        const words = searchParams.get('words');
        const mode = searchParams.get('mode');

        if (lesson) {
          const wordCount = words ? parseInt(words, 10) : 10;
          const studyMode = (mode === 'new' || mode === 'review' || mode === 'all') ? mode : 'new';
          
          // Auto-start session with URL parameters
          handleLessonSelect(lesson, wordCount, studyMode);
        }
      }
    } catch (error) {
      console.error('Error in URL parameter handling:', error);
    }
  }, []); // Only run once on mount

  const handleLessonSelect = async (lessonId: string, wordCount: number, mode: 'new' | 'review' | 'all') => {
    // Check access and track usage
    const hasAccess = await checkAndTrack('word_learning_session');
    if (!hasAccess) {
      return; // Access control will show appropriate modal
    }

    setIsLoading(true);
    setStudyMode(mode);
    
    try {
      const vocabSet = await getVocabularySet(lessonId);
      if (vocabSet) {
        // Get learned words for filtering
        const learnedWords = await learnedWordsStorage.getLearnedWords(
          user?.uid || 'guest',
          lessonId
        );
        
        // Filter words based on mode
        let availableWords = vocabSet.words;
        if (mode === 'new') {
          availableWords = vocabSet.words.filter(w => !learnedWords.includes(w.id));
        } else if (mode === 'review') {
          availableWords = vocabSet.words.filter(w => learnedWords.includes(w.id));
        }
        
        // Randomly select the requested number of words
        const shuffled = [...availableWords].sort(() => Math.random() - 0.5);
        const selectedWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));
        
        const newSession: SessionData = {
          id: `session_${Date.now()}`,
          setId: lessonId,
          words: selectedWords,
          startedAt: new Date(),
          completedAt: null,
          score: 0,
          weakWords: []
        };
        setSessionData(newSession);
        setPhase('exposure');
      }
    } catch (error) {
      console.error('Failed to load vocabulary set:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhaseComplete = () => {
    switch (phase) {
      case 'exposure':
        if (currentWordIndex < (sessionData?.words.length || 0) - 1) {
          setCurrentWordIndex(prev => prev + 1);
        } else {
          setPhase('recognition');
          setCurrentWordIndex(0);
        }
        break;
      case 'recognition':
        setPhase('recall');
        setCurrentWordIndex(0);
        break;
      case 'recall':
        if (currentWordIndex < (sessionData?.words.length || 0) - 1) {
          setCurrentWordIndex(prev => prev + 1);
        } else {
          setPhase('audio-matching');
          setCurrentWordIndex(0);
        }
        break;
      case 'audio-matching':
        completeSession();
        break;
    }
  };

  const completeSession = async () => {
    if (!sessionData) return;
    
    const completedSession = {
      ...sessionData,
      completedAt: new Date(),
      score,
      weakWords: Array.from(weakWords)
    };
    
    // Save session data
    if (user) {
      await sessionStorage.saveSession(user.uid, completedSession);
    }
    
    setSessionData(completedSession);
    setPhase('complete');
  };

  const handleWordStruggle = (wordId: string) => {
    setWeakWords(prev => new Set(prev).add(wordId));
  };

  const handleCorrectAnswer = () => {
    setScore(prev => prev + 1);
  };

  const resetSession = () => {
    // If we came from textbook vocabulary, go back there
    if (searchParams?.get('lesson') || searchParams?.get('session') === 'custom') {
      window.history.back();
    } else {
      setPhase('selection');
      setSessionData(null);
      setCurrentWordIndex(0);
      setWeakWords(new Set());
      setScore(0);
    }
  };

  // Get available lessons data
  const availableLessons = [
    { id: 'genki1-lesson1', name: 'Genki I - Lesson 1', totalWords: 10 },
    { id: 'genki1-lesson2', name: 'Genki I - Lesson 2', totalWords: 5 },
    // Add more lessons as they're implemented
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `genki1-lesson${i + 3}`,
      name: `Genki I - Lesson ${i + 3}`,
      totalWords: 0 // Coming soon
    })),
    ...Array.from({ length: 11 }, (_, i) => ({
      id: `genki2-lesson${i + 13}`,
      name: `Genki II - Lesson ${i + 13}`,
      totalWords: 0 // Coming soon
    }))
  ].filter(lesson => lesson.totalWords > 0); // Only show lessons with vocabulary

  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-background">
        <div className="mobile-nav-padding">
          <SmartPageHeader 
            title="Word Learning Session"
            backHref="/"
          />

          <main className="px-4 pb-4">
            <p className="text-sm text-muted-foreground mb-6">Choose a lesson and number of words to study</p>

            <LessonSelector
              lessons={availableLessons}
              userId={user?.uid || 'guest'}
              onSelectLesson={handleLessonSelect}
              isLoading={isLoading}
            />
          </main>
        </div>
      </div>
    );
  }

  const currentWord = sessionData?.words[currentWordIndex];
  if (!currentWord && phase !== 'selection') return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-nav-padding">
        <SmartPageHeader 
          title={
            phase === 'exposure' ? 'Learn New Words' :
            phase === 'recognition' ? 'Recognition Session' :
            phase === 'recall' ? 'Active Recall' :
            phase === 'audio-matching' ? 'Audio Matching' :
            phase === 'complete' ? 'Session Complete' : ''
          }
          backHref="/"
          actions={
            <button 
              onClick={resetSession}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close session"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        />
        {phase !== 'complete' && phase !== 'selection' && (
          <div className="px-4 pb-2">
            <p className="text-sm text-muted-foreground">
              {currentWordIndex + 1} / {sessionData?.words.length || 0} words
            </p>
          </div>
        )}

        <main className="px-4 pb-4">
          {phase === 'exposure' && sessionData && (
            <ExposurePhase
              word={currentWord}
              lessonId={sessionData.setId}
              onComplete={handlePhaseComplete}
              onStruggle={() => handleWordStruggle(currentWord.id)}
              isLearned={false} // Will be tracked in ExposurePhase
              currentIndex={currentWordIndex}
              totalWords={sessionData.words.length}
            />
          )}
          
          {phase === 'recognition' && sessionData && (
            <RecognitionGame
              words={sessionData.words}
              currentIndex={currentWordIndex}
              onComplete={handlePhaseComplete}
              onCorrect={handleCorrectAnswer}
              onStruggle={handleWordStruggle}
            />
          )}
          
          {phase === 'recall' && sessionData && (
            <ActiveRecallDrill
              words={sessionData.words}
              currentIndex={currentWordIndex}
              onComplete={handlePhaseComplete}
              onCorrect={handleCorrectAnswer}
              onStruggle={handleWordStruggle}
            />
          )}
          
          {phase === 'audio-matching' && sessionData && (
            <AudioMatching
              words={sessionData.words}
              currentIndex={currentWordIndex}
              totalWords={sessionData.words.length}
              onComplete={handlePhaseComplete}
              onCorrect={handleCorrectAnswer}
              onStruggle={handleWordStruggle}
            />
          )}
          
          {phase === 'complete' && sessionData && (
            <SessionComplete
              sessionData={{ ...sessionData, score, weakWords: Array.from(weakWords) }}
              onRestart={resetSession}
              availableLessons={availableLessons}
            />
          )}
        </main>
      </div>
    </div>
  );
}