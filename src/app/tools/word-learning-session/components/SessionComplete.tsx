'use client';

import { SessionData } from '../types';
import Link from 'next/link';

interface SessionCompleteProps {
  sessionData: SessionData;
  onRestart: () => void;
}

export default function SessionComplete({ sessionData, onRestart }: SessionCompleteProps) {
  const percentage = Math.round((sessionData.score / sessionData.words.length) * 100);
  const totalWords = sessionData.words.length;
  const weakWordsCount = sessionData.weakWords.length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Completion Header */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h2>
        <p className="text-gray-600">Great job completing your learning session</p>
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
        <button
          onClick={onRestart}
          className="w-full py-3 px-4 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          Start New Session
        </button>
        
        <Link
          href="/"
          className="block w-full py-3 px-4 rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors text-center"
        >
          Back to Home
        </Link>
      </div>

      {/* Future Features Note */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>✨ Coming soon: Review reminders & spaced repetition tracking</p>
      </div>
    </div>
  );
}