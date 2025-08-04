'use client';

import { useState, useEffect } from 'react';
import { SessionData } from '../types';
import Link from 'next/link';
import { learnedWordsStorage } from '../services/learnedWordsStorage';
import { useAuth } from '@/contexts/AuthContext';

interface SessionCompleteProps {
  sessionData: SessionData;
  onRestart: () => void;
  availableLessons: Array<{ id: string; name: string; totalWords: number }>;
}

export default function SessionComplete({ sessionData, onRestart, availableLessons }: SessionCompleteProps) {
  const { user } = useAuth();
  const [lessonProgress, setLessonProgress] = useState<{ learned: number; total: number } | null>(null);
  const [isLessonComplete, setIsLessonComplete] = useState(false);
  const [nextLesson, setNextLesson] = useState<{ id: string; name: string } | null>(null);
  
  const percentage = Math.round((sessionData.score / sessionData.words.length) * 100);
  const totalWords = sessionData.words.length;
  const weakWordsCount = sessionData.weakWords.length;

  useEffect(() => {
    checkLessonProgress();
  }, []);

  const checkLessonProgress = async () => {
    const userId = user?.uid || 'guest';
    const currentLesson = availableLessons.find(l => l.id === sessionData.setId);
    
    if (currentLesson) {
      const progress = await learnedWordsStorage.getLessonProgress(
        userId,
        sessionData.setId,
        currentLesson.totalWords
      );
      
      setLessonProgress({
        learned: progress.learnedWords.length,
        total: currentLesson.totalWords
      });
      
      // Check if lesson is complete
      if (progress.learnedWords.length === currentLesson.totalWords) {
        setIsLessonComplete(true);
        
        // Find next lesson
        const currentIndex = availableLessons.findIndex(l => l.id === sessionData.setId);
        if (currentIndex < availableLessons.length - 1) {
          setNextLesson(availableLessons[currentIndex + 1]);
        }
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Completion Header */}
      <div className="text-center mb-8">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 ${
          isLessonComplete ? 'bg-yellow-100' : 'bg-green-100'
        }`}>
          {isLessonComplete ? (
            <span className="text-5xl">🎉</span>
          ) : (
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isLessonComplete ? 'Lesson Complete! 🎊' : 'Session Complete!'}
        </h2>
        <p className="text-gray-600">
          {isLessonComplete 
            ? `Congratulations! You've learned all ${lessonProgress?.total} words in this lesson!`
            : 'Great job completing your learning session'
          }
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Your Results</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{totalWords}</p>
            <p className="text-sm text-gray-600">Words Learned</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">{percentage}%</p>
            <p className="text-sm text-gray-600">Accuracy</p>
          </div>
        </div>

        {weakWordsCount > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <span className="font-medium">{weakWordsCount} words</span> marked for extra review
            </p>
          </div>
        )}
        
        {lessonProgress && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Lesson Progress: <span className="font-medium">{lessonProgress.learned} / {lessonProgress.total}</span> words learned
            </p>
          </div>
        )}
      </div>

      {/* Achievement Messages */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <p className="text-blue-900 font-medium mb-1">
          {percentage >= 90 && "🌟 Outstanding performance!"}
          {percentage >= 70 && percentage < 90 && "💪 Great job!"}
          {percentage >= 50 && percentage < 70 && "📚 Good effort, keep practicing!"}
          {percentage < 50 && "🎯 Keep going, you're learning!"}
        </p>
        <p className="text-sm text-blue-800">
          {weakWordsCount > 0 
            ? "The words you struggled with will appear more frequently in future reviews."
            : "You've mastered all the words in this session!"
          }
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {isLessonComplete && nextLesson ? (
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
          >
            Continue to {nextLesson.name} →
          </button>
        ) : (
          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Start New Session
          </button>
        )}
        
        <Link
          href="/"
          className="block w-full py-3 px-4 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors text-center"
        >
          Back to Home
        </Link>
      </div>

      {/* Celebration for completing all lessons */}
      {isLessonComplete && !nextLesson && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg text-center">
          <p className="text-lg font-semibold text-orange-900">🏆 Amazing Achievement!</p>
          <p className="text-sm text-orange-800 mt-1">
            You've completed all available lessons. More content coming soon!
          </p>
        </div>
      )}
    </div>
  );
}