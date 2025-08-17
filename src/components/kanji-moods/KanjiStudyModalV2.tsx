'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { Kanji } from '@/types';
import SlideUpModal from '@/components/SlideUpModal';
import Confetti from 'react-confetti';
import { 
  KanjiStudyResult, 
  KanjiStudySession,
  updateKanjiProgressFromResult,
  saveStudySession 
} from '@/utils/kanjiStudyProgress';
import { japaneseTextMatches } from '@/utils/japaneseConversion';
import KanjiManager from '@/utils/kanjiManager';
import { useAuth } from '@/contexts/AuthContext';

interface KanjiStudyModalV2Props {
  kanjiList: KanjiItem[];
  isOpen: boolean;
  onClose: (completed?: boolean) => void;
  boardId: string;
  boardTitle: string;
  kanjiData?: Record<string, Kanji[]>; // Full kanji data for distractors
}

type StudyMode = 'meaning' | 'onyomi' | 'kunyomi';
type StudyPhase = 'question' | 'result';

interface StudyQuestion {
  kanji: KanjiItem;
  mode: StudyMode;
  options: string[];
  correctIndex: number;
}

interface StudySession {
  questions: StudyQuestion[];
  currentQuestionIndex: number;
  phase: StudyPhase;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
  wrongAnswers: Set<number>; // Track indices of questions answered wrong
  attemptNumber: number; // Track which attempt we're on
  questionStartTime: number;
  results: KanjiStudyResult[];
  sessionStartTime: Date;
  showConfetti: boolean;
}

export default function KanjiStudyModalV2({
  kanjiList,
  isOpen,
  onClose,
  boardId,
  boardTitle,
  kanjiData = {},
}: KanjiStudyModalV2Props) {
  const { user } = useAuth();
  const [session, setSession] = useState<StudySession>({
    questions: [],
    currentQuestionIndex: 0,
    phase: 'question',
    selectedAnswer: null,
    isCorrect: null,
    wrongAnswers: new Set(),
    attemptNumber: 1,
    questionStartTime: Date.now(),
    results: [],
    sessionStartTime: new Date(),
    showConfetti: false,
  });

  // Find similar looking kanji for distractors
  const findSimilarKanji = useCallback((targetKanji: string, jlptLevel?: string): string[] => {
    const allKanji: Kanji[] = [];
    
    // First try to get kanji from the same JLPT level
    if (jlptLevel && kanjiData[`N${jlptLevel}`]) {
      allKanji.push(...kanjiData[`N${jlptLevel}`]);
    }
    
    // If not enough, add from all levels
    if (allKanji.length < 20) {
      Object.values(kanjiData).forEach(levelKanji => {
        allKanji.push(...levelKanji);
      });
    }

    // Filter out the target kanji and those already in study list
    const studyKanjiSet = new Set(kanjiList.map(k => k.char));
    const candidates = allKanji.filter(k => 
      k.kanji !== targetKanji && !studyKanjiSet.has(k.kanji)
    );

    // Simple similarity scoring based on visual components
    // This is a simplified approach - ideally we'd use radical analysis
    const scored = candidates.map(k => {
      let score = 0;
      
      // Prefer kanji with similar stroke counts (if available)
      // For now, just return random selection
      return { kanji: k, score: Math.random() };
    });

    // Sort by score and return top candidates
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map(s => s.kanji.kanji);
  }, [kanjiData, kanjiList]);

  // Generate distractor options
  const generateOptions = useCallback((correct: string, mode: StudyMode, kanji: KanjiItem): string[] => {
    const options: string[] = [correct];
    const usedOptions = new Set([correct.toLowerCase()]);

    if (mode === 'meaning') {
      // Get meanings from other kanji in the study list
      const otherMeanings = kanjiList
        .filter(k => k.char !== kanji.char)
        .map(k => k.meaning.split(/[,;\/]/).map(m => m.trim())[0])
        .filter(m => !usedOptions.has(m.toLowerCase()));

      // Add up to 3 distractors
      while (options.length < 4 && otherMeanings.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherMeanings.length);
        const meaning = otherMeanings.splice(randomIndex, 1)[0];
        if (!usedOptions.has(meaning.toLowerCase())) {
          options.push(meaning);
          usedOptions.add(meaning.toLowerCase());
        }
      }

      // If not enough, add generic distractors
      const genericMeanings = ['person', 'water', 'fire', 'mountain', 'tree', 'sun', 'moon', 'earth'];
      while (options.length < 4) {
        const meaning = genericMeanings[Math.floor(Math.random() * genericMeanings.length)];
        if (!usedOptions.has(meaning.toLowerCase())) {
          options.push(meaning);
          usedOptions.add(meaning.toLowerCase());
        }
      }
    } else {
      // For readings, get similar looking kanji and use their readings
      const similarKanji = findSimilarKanji(kanji.char);
      const readingType = mode === 'onyomi' ? 'on' : 'kun';
      
      // Get readings from similar kanji
      for (const similar of similarKanji) {
        if (options.length >= 4) break;
        
        // Find the kanji data
        const kanjiInfo = Object.values(kanjiData)
          .flat()
          .find(k => k.kanji === similar);
          
        if (kanjiInfo) {
          const readings = mode === 'onyomi' ? kanjiInfo.onyomi : kanjiInfo.kunyomi;
          if (readings && readings.length > 0) {
            const reading = readings[0];
            if (!usedOptions.has(reading.toLowerCase())) {
              options.push(reading);
              usedOptions.add(reading.toLowerCase());
            }
          }
        }
      }

      // If still not enough, add common readings
      const commonReadings = mode === 'onyomi' 
        ? ['コウ', 'ショウ', 'セイ', 'ダイ', 'チュウ', 'ジン', 'カン', 'ガク']
        : ['みる', 'いく', 'くる', 'する', 'ある', 'なる', 'もつ', 'だす'];
      
      while (options.length < 4) {
        const reading = commonReadings[Math.floor(Math.random() * commonReadings.length)];
        if (!usedOptions.has(reading.toLowerCase())) {
          options.push(reading);
          usedOptions.add(reading.toLowerCase());
        }
      }
    }

    // Shuffle options
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Find correct answer index
    const correctIndex = shuffled.indexOf(correct);

    return shuffled;
  }, [kanjiList, findSimilarKanji, kanjiData]);

  // Initialize study session
  useEffect(() => {
    if (isOpen && kanjiList.length > 0) {
      const questions: StudyQuestion[] = [];
      
      kanjiList.forEach((kanji) => {
        // Always test meaning
        const meaningOptions = generateOptions(
          kanji.meaning.split(/[,;\/]/).map(m => m.trim())[0],
          'meaning',
          kanji
        );
        questions.push({
          kanji,
          mode: 'meaning',
          options: meaningOptions,
          correctIndex: meaningOptions.indexOf(kanji.meaning.split(/[,;\/]/).map(m => m.trim())[0]),
        });
        
        // Test onyomi if available
        if (kanji.readings.on && kanji.readings.on.length > 0) {
          const onyomiOptions = generateOptions(kanji.readings.on[0], 'onyomi', kanji);
          questions.push({
            kanji,
            mode: 'onyomi',
            options: onyomiOptions,
            correctIndex: onyomiOptions.indexOf(kanji.readings.on[0]),
          });
        }
        
        // Test kunyomi if available
        if (kanji.readings.kun && kanji.readings.kun.length > 0) {
          const kunyomiOptions = generateOptions(kanji.readings.kun[0], 'kunyomi', kanji);
          questions.push({
            kanji,
            mode: 'kunyomi',
            options: kunyomiOptions,
            correctIndex: kunyomiOptions.indexOf(kanji.readings.kun[0]),
          });
        }
      });

      // Randomize questions
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }

      setSession({
        questions,
        currentQuestionIndex: 0,
        phase: 'question',
        selectedAnswer: null,
        isCorrect: null,
        wrongAnswers: new Set(),
        attemptNumber: 1,
        questionStartTime: Date.now(),
        results: [],
        sessionStartTime: new Date(),
        showConfetti: false,
      });
    }
  }, [isOpen, kanjiList, generateOptions]);

  const currentQuestion = session.questions[session.currentQuestionIndex];

  const getQuestionText = () => {
    if (!currentQuestion) return '';
    
    switch (currentQuestion.mode) {
      case 'meaning':
        return 'What is the meaning of this kanji?';
      case 'onyomi':
        return "What is the on'yomi reading?";
      case 'kunyomi':
        return "What is the kun'yomi reading?";
    }
  };

  const handleAnswerSelect = async (index: number) => {
    const isCorrect = index === currentQuestion.correctIndex;
    const responseTime = Date.now() - session.questionStartTime;

    // Create study result
    const result: KanjiStudyResult = {
      boardId,
      kanjiChar: currentQuestion.kanji.char,
      questionType: currentQuestion.mode === 'meaning' ? 'kanji' : currentQuestion.mode,
      userAnswer: currentQuestion.options[index],
      correctAnswer: currentQuestion.options[currentQuestion.correctIndex],
      isCorrect,
      responseTime,
      timestamp: new Date(),
    };

    // Update progress in the background (only for authenticated users)
    if (user) {
      updateKanjiProgressFromResult(result, responseTime).catch((error) => {
        console.error('Error updating kanji progress:', error);
      });
    }

    const newWrongAnswers = new Set(session.wrongAnswers);
    if (!isCorrect) {
      newWrongAnswers.add(session.currentQuestionIndex);
    }

    setSession(prev => ({
      ...prev,
      selectedAnswer: index,
      isCorrect,
      phase: 'result',
      results: [...prev.results, result],
      wrongAnswers: newWrongAnswers,
    }));

    // Auto-advance after a delay
    setTimeout(() => {
      nextQuestion(isCorrect);
    }, isCorrect ? 1000 : 2000);
  };

  const nextQuestion = (wasCorrect: boolean) => {
    const isLastQuestion = session.currentQuestionIndex === session.questions.length - 1;
    
    if (isLastQuestion) {
      // Check if all answers were correct
      if (session.wrongAnswers.size === 0 && wasCorrect) {
        // Perfect! Show confetti and complete
        setSession(prev => ({ ...prev, showConfetti: true }));
        
        // Save session
        const studySession: KanjiStudySession = {
          boardId,
          boardTitle,
          startedAt: session.sessionStartTime,
          completedAt: new Date(),
          totalQuestions: session.questions.length * session.attemptNumber,
          correctAnswers: session.results.filter(r => r.isCorrect).length,
          results: session.results,
          accuracy: (session.results.filter(r => r.isCorrect).length / (session.questions.length * session.attemptNumber)) * 100,
        };
        
        // Save session only for authenticated users
        if (user) {
          saveStudySession(studySession).catch(console.error);
        }
        
        // Close after showing confetti
        setTimeout(() => {
          onClose(true);
        }, 3000);
      } else {
        // Had wrong answers, restart from beginning
        setSession(prev => ({
          ...prev,
          currentQuestionIndex: 0,
          phase: 'question',
          selectedAnswer: null,
          isCorrect: null,
          wrongAnswers: new Set(),
          attemptNumber: prev.attemptNumber + 1,
          questionStartTime: Date.now(),
        }));
      }
    } else {
      // Move to next question
      setSession(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        phase: 'question',
        selectedAnswer: null,
        isCorrect: null,
        questionStartTime: Date.now(),
      }));
    }
  };

  if (!isOpen || !currentQuestion) return null;

  const progress = ((session.currentQuestionIndex + 1) / session.questions.length) * 100;
  const progressLabel = `${session.currentQuestionIndex + 1} / ${session.questions.length}`;
  const attemptLabel = session.attemptNumber > 1 ? `Attempt ${session.attemptNumber}` : '';

  return (
    <>
      {session.showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          gravity={0.2}
        />
      )}
      
      <SlideUpModal
        isOpen={isOpen}
        onClose={() => onClose(false)}
        title={boardTitle}
        subtitle={`${progressLabel} ${attemptLabel}`}
      >
        <div className="px-4 pb-6">
          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {session.wrongAnswers.size > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                {session.wrongAnswers.size} mistake{session.wrongAnswers.size > 1 ? 's' : ''} - get all correct to complete!
              </p>
            )}
          </div>

          {/* Kanji Display */}
          <div className="mb-6">
            <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl p-8 text-center">
              <div className="text-7xl font-bold text-foreground mb-2 japanese-text">
                {currentQuestion.kanji.char}
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-foreground">
              {getQuestionText()}
            </h3>
          </div>

          {/* Answer Grid */}
          <div className="grid grid-cols-2 gap-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = session.selectedAnswer === index;
              const isCorrect = index === currentQuestion.correctIndex;
              const showResult = session.phase === 'result';
              
              let buttonClass = 'relative p-4 rounded-lg border-2 transition-all font-medium text-center ';
              
              if (showResult) {
                if (isCorrect) {
                  buttonClass += 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300';
                } else if (isSelected && !isCorrect) {
                  buttonClass += 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300';
                } else {
                  buttonClass += 'bg-muted border-border text-muted-foreground opacity-50';
                }
              } else {
                buttonClass += 'bg-card border-border hover:bg-muted hover:border-primary cursor-pointer active:scale-95';
              }
              
              return (
                <button
                  key={index}
                  onClick={() => !showResult && handleAnswerSelect(index)}
                  disabled={showResult}
                  className={buttonClass}
                >
                  <span className={currentQuestion.mode !== 'meaning' ? 'japanese-text text-lg' : ''}>
                    {option}
                  </span>
                  {showResult && isCorrect && (
                    <svg className="absolute top-2 right-2 w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <svg className="absolute top-2 right-2 w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Helper text */}
          {currentQuestion.mode !== 'meaning' && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Select the correct {currentQuestion.mode === 'onyomi' ? "on'yomi" : "kun'yomi"} reading
            </p>
          )}
        </div>
      </SlideUpModal>
    </>
  );
}