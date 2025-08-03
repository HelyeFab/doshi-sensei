'use client';

import { useState, useEffect } from 'react';
import { useStrings } from '@/contexts/LanguageContext';
import { useAccess } from '@/hooks/useAccess';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ExposurePhase from './components/ExposurePhase';
import RecognitionGame from './components/RecognitionGame';
import ActiveRecallDrill from './components/ActiveRecallDrill';
import SessionComplete from './components/SessionComplete';
import { WordItem, SessionData, SessionPhase } from './types';
import { sessionStorage } from './services/sessionStorage';
import { getVocabularySet } from './data/vocabularySets';

export default function WordLearningSessionClient() {
  const strings = useStrings();
  const { checkAndTrack } = useAccess();
  const { user } = useAuth();
  
  const [phase, setPhase] = useState<SessionPhase>('selection');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [weakWords, setWeakWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load vocabulary set when selected
  useEffect(() => {
    if (selectedSet && phase === 'selection') {
      loadVocabularySet();
    }
  }, [selectedSet]);

  const loadVocabularySet = async () => {
    setIsLoading(true);
    try {
      const vocabSet = await getVocabularySet(selectedSet);
      if (vocabSet) {
        const newSession: SessionData = {
          id: `session_${Date.now()}`,
          setId: selectedSet,
          words: vocabSet.words,
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

  const startSession = async () => {
    // Check access and track usage
    const hasAccess = await checkAndTrack('word_learning_session');
    if (!hasAccess) {
      return; // Access control will show appropriate modal
    }
    
    // Session logic is handled by loadVocabularySet
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
    setPhase('selection');
    setSelectedSet('');
    setSessionData(null);
    setCurrentWordIndex(0);
    setWeakWords(new Set());
    setScore(0);
  };

  if (phase === 'selection') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mobile-nav-padding">
          <header className="px-4 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <Link 
                href="/" 
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                Word Learning Session
              </h1>
            </div>
          </header>

          <main className="px-4 pb-4">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Select a vocabulary set</h2>
              <p className="text-sm text-gray-600">Choose a textbook and lesson to start learning</p>
            </div>

            <div className="space-y-3">
              {/* Genki I Lessons */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="font-medium text-gray-900 mb-3">Genki I</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(12)].map((_, i) => (
                    <button
                      key={`genki1-${i + 1}`}
                      onClick={() => {
                        setSelectedSet(`genki1-lesson${i + 1}`);
                        startSession();
                      }}
                      className="p-3 text-sm rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      disabled={isLoading}
                    >
                      Lesson {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genki II Lessons */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <h3 className="font-medium text-gray-900 mb-3">Genki II</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[...Array(11)].map((_, i) => (
                    <button
                      key={`genki2-${i + 13}`}
                      onClick={() => {
                        setSelectedSet(`genki2-lesson${i + 13}`);
                        startSession();
                      }}
                      className="p-3 text-sm rounded-lg bg-gray-50 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      disabled={isLoading}
                    >
                      Lesson {i + 13}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minna no Nihongo (Future) */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 opacity-50">
                <h3 className="font-medium text-gray-900 mb-3">Minna no Nihongo</h3>
                <p className="text-sm text-gray-500">Coming soon...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentWord = sessionData?.words[currentWordIndex];
  if (!currentWord) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mobile-nav-padding">
        <header className="px-4 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={resetSession}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {phase === 'exposure' && 'Learn New Words'}
                {phase === 'recognition' && 'Recognition Game'}
                {phase === 'recall' && 'Active Recall'}
                {phase === 'complete' && 'Session Complete'}
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              {phase !== 'complete' && `${currentWordIndex + 1} / ${sessionData?.words.length || 0}`}
            </div>
          </div>
        </header>

        <main className="px-4 pb-4">
          {phase === 'exposure' && (
            <ExposurePhase
              word={currentWord}
              onComplete={handlePhaseComplete}
              onStruggle={() => handleWordStruggle(currentWord.id)}
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
          
          {phase === 'complete' && sessionData && (
            <SessionComplete
              sessionData={{ ...sessionData, score, weakWords: Array.from(weakWords) }}
              onRestart={resetSession}
            />
          )}
        </main>
      </div>
    </div>
  );
}