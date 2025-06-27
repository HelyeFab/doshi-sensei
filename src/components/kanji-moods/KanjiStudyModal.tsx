'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { 
  KanjiStudyResult, 
  KanjiStudySession,
  updateKanjiProgressFromResult,
  saveStudySession 
} from '@/utils/kanjiStudyProgress';

interface KanjiStudyModalProps {
  kanjiList: KanjiItem[];
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
  boardTitle: string;
}

type StudyMode = 'kanji' | 'meaning' | 'onyomi' | 'kunyomi';
type StudyPhase = 'question' | 'answer' | 'result';

interface StudySession {
  currentIndex: number;
  currentMode: StudyMode;
  phase: StudyPhase;
  userAnswer: string;
  isCorrect: boolean | null;
  score: number;
  totalQuestions: number;
  studyOrder: number[];
  modeOrder: StudyMode[];
  questionStartTime: number;
  results: KanjiStudyResult[];
  sessionStartTime: Date;
}

const STUDY_MODES: StudyMode[] = ['kanji', 'meaning', 'onyomi', 'kunyomi'];

export default function KanjiStudyModal({
  kanjiList,
  isOpen,
  onClose,
  boardId,
  boardTitle,
}: KanjiStudyModalProps) {
  const [session, setSession] = useState<StudySession>(() => ({
    currentIndex: 0,
    currentMode: 'kanji',
    phase: 'question',
    userAnswer: '',
    isCorrect: null,
    score: 0,
    totalQuestions: 0,
    studyOrder: [],
    modeOrder: [],
    questionStartTime: Date.now(),
    results: [],
    sessionStartTime: new Date(),
  }));

  // Initialize study session
  useEffect(() => {
    if (isOpen && kanjiList.length > 0) {
      // Create random order for kanji
      const studyOrder = [...Array(kanjiList.length)].map((_, i) => i);
      for (let i = studyOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [studyOrder[i], studyOrder[j]] = [studyOrder[j], studyOrder[i]];
      }

      // Create random order for modes per kanji
      const modeOrder = [...STUDY_MODES];
      for (let i = modeOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [modeOrder[i], modeOrder[j]] = [modeOrder[j], modeOrder[i]];
      }

      setSession({
        currentIndex: 0,
        currentMode: modeOrder[0],
        phase: 'question',
        userAnswer: '',
        isCorrect: null,
        score: 0,
        totalQuestions: kanjiList.length * STUDY_MODES.length,
        studyOrder,
        modeOrder,
        questionStartTime: Date.now(),
        results: [],
        sessionStartTime: new Date(),
      });
    }
  }, [isOpen, kanjiList]);

  // Handle escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen || kanjiList.length === 0) return null;

  const currentKanji = kanjiList[session.studyOrder[Math.floor(session.currentIndex / STUDY_MODES.length)]];
  const currentModeIndex = session.currentIndex % STUDY_MODES.length;
  const currentMode = session.modeOrder[currentModeIndex];

  const getQuestionText = () => {
    switch (currentMode) {
      case 'kanji':
        return 'What is the meaning of this kanji?';
      case 'meaning':
        return `Write the kanji for "${currentKanji.meaning}"`;
      case 'onyomi':
        return `What is the on'yomi reading?`;
      case 'kunyomi':
        return `What is the kun'yomi reading?`;
    }
  };

  const getDisplayContent = () => {
    if (session.phase === 'answer' || session.phase === 'result') {
      // Always show the kanji in answer/result phase
      return currentKanji.char;
    }

    switch (currentMode) {
      case 'kanji':
      case 'onyomi':
      case 'kunyomi':
        return currentKanji.char;
      case 'meaning':
        return '?';
      default:
        return currentKanji.char;
    }
  };

  const checkAnswer = async () => {
    let isCorrect = false;
    const userAnswerLower = session.userAnswer.trim().toLowerCase();
    const responseTime = Date.now() - session.questionStartTime;

    switch (currentMode) {
      case 'kanji':
        // Check meaning
        isCorrect = userAnswerLower === currentKanji.meaning.toLowerCase();
        break;
      case 'meaning':
        // Check if user typed the kanji
        isCorrect = session.userAnswer.trim() === currentKanji.char;
        break;
      case 'onyomi':
        // Check onyomi readings
        isCorrect = currentKanji.readings.on.some(
          reading => reading.toLowerCase() === userAnswerLower
        );
        break;
      case 'kunyomi':
        // Check kunyomi readings
        isCorrect = currentKanji.readings.kun.some(
          reading => reading.toLowerCase() === userAnswerLower
        );
        break;
    }

    // Create study result
    const result: KanjiStudyResult = {
      boardId,
      kanjiChar: currentKanji.char,
      questionType: currentMode,
      userAnswer: session.userAnswer,
      correctAnswer: getCorrectAnswer(),
      isCorrect,
      responseTime,
      timestamp: new Date(),
    };

    // Update progress in the background
    updateKanjiProgressFromResult(result, responseTime).catch(console.error);

    setSession(prev => ({
      ...prev,
      isCorrect,
      phase: 'answer',
      score: isCorrect ? prev.score + 1 : prev.score,
      results: [...prev.results, result],
    }));
  };

  const getCorrectAnswer = () => {
    switch (currentMode) {
      case 'kanji':
        return currentKanji.meaning;
      case 'meaning':
        return currentKanji.char;
      case 'onyomi':
        return currentKanji.readings.on.join(', ') || 'No on\'yomi';
      case 'kunyomi':
        return currentKanji.readings.kun.join(', ') || 'No kun\'yomi';
    }
  };

  const nextQuestion = async () => {
    if (session.currentIndex + 1 >= session.totalQuestions) {
      // Study session complete - save the session
      const studySession: KanjiStudySession = {
        boardId,
        boardTitle,
        startedAt: session.sessionStartTime,
        completedAt: new Date(),
        totalQuestions: session.totalQuestions,
        correctAnswers: session.score,
        results: session.results,
        accuracy: (session.score / session.totalQuestions) * 100,
      };
      
      // Save session in the background
      saveStudySession(studySession).catch(console.error);
      
      setSession(prev => ({ ...prev, phase: 'result' }));
      return;
    }

    // Move to next question
    const nextIndex = session.currentIndex + 1;
    const nextModeIndex = nextIndex % STUDY_MODES.length;
    
    // If starting a new kanji, shuffle the modes
    let newModeOrder = session.modeOrder;
    if (nextModeIndex === 0) {
      newModeOrder = [...STUDY_MODES];
      for (let i = newModeOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newModeOrder[i], newModeOrder[j]] = [newModeOrder[j], newModeOrder[i]];
      }
    }

    setSession(prev => ({
      ...prev,
      currentIndex: nextIndex,
      currentMode: newModeOrder[nextModeIndex],
      modeOrder: newModeOrder,
      phase: 'question',
      userAnswer: '',
      isCorrect: null,
      questionStartTime: Date.now(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (session.phase === 'question' && session.userAnswer.trim()) {
      checkAnswer();
    } else if (session.phase === 'answer') {
      nextQuestion();
    }
  };

  const progress = ((session.currentIndex + 1) / session.totalQuestions) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-600/30 via-gray-700/40 to-gray-800/50 dark:from-black/50 dark:via-black/60 dark:to-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Study: {boardTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Question {session.currentIndex + 1} of {session.totalQuestions}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {session.phase !== 'result' ? (
            <>
              {/* Flashcard */}
              <div className="mb-8">
                <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl p-12 text-center">
                  <div className="text-8xl font-bold text-foreground mb-4">
                    {getDisplayContent()}
                  </div>
                  {session.phase === 'answer' && currentMode === 'meaning' && (
                    <div className="text-2xl text-muted-foreground">
                      {currentKanji.meaning}
                    </div>
                  )}
                </div>
              </div>

              {/* Question */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-foreground">
                  {getQuestionText()}
                </h3>
              </div>

              {/* Answer form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {session.phase === 'question' ? (
                  <>
                    <input
                      type="text"
                      value={session.userAnswer}
                      onChange={(e) => setSession(prev => ({ ...prev, userAnswer: e.target.value }))}
                      placeholder="Type your answer..."
                      className="w-full px-4 py-3 text-lg rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!session.userAnswer.trim()}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Check Answer
                    </button>
                  </>
                ) : (
                  <>
                    {/* Result display */}
                    <div className={`p-4 rounded-lg ${session.isCorrect ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        {session.isCorrect ? (
                          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        <span className={`font-semibold ${session.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                          {session.isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Your answer: <span className="font-medium">{session.userAnswer}</span>
                        </p>
                        {!session.isCorrect && (
                          <p className="text-sm text-muted-foreground">
                            Correct answer: <span className="font-medium text-foreground">{getCorrectAnswer()}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 px-6 rounded-lg font-semibold text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                    >
                      Next Question
                    </button>
                  </>
                )}
              </form>
            </>
          ) : (
            /* Study complete screen */
            <div className="text-center py-8">
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Study Session Complete!</h3>
                <p className="text-lg text-muted-foreground">
                  You scored {session.score} out of {session.totalQuestions}
                </p>
              </div>
              <div className="mb-8">
                <div className="text-4xl font-bold text-primary">
                  {Math.round((session.score / session.totalQuestions) * 100)}%
                </div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
              <button
                onClick={onClose}
                className="py-3 px-8 rounded-lg font-semibold text-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}