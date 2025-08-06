'use client';

import { useState, useEffect } from 'react';
import { VocabularySet } from '../types';
import { learnedWordsStorage } from '../services/learnedWordsStorage';
import { exposedWordsStorage } from '../services/exposedWordsStorage';
import ExposureStats from './ExposureStats';

interface LessonSelectorProps {
  lessons: {
    id: string;
    name: string;
    totalWords: number;
  }[];
  userId: string;
  onSelectLesson: (lessonId: string, wordCount: number, mode: 'new' | 'review' | 'all') => void;
  isLoading?: boolean;
}

interface LessonWithProgress {
  id: string;
  name: string;
  totalWords: number;
  learnedWords: number;
  isComplete: boolean;
}

export default function LessonSelector({ lessons, userId, onSelectLesson, isLoading }: LessonSelectorProps) {
  const [lessonsWithProgress, setLessonsWithProgress] = useState<LessonWithProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<string>('');
  const [wordCount, setWordCount] = useState(10);
  const [maxWords, setMaxWords] = useState(10);
  const [mode, setMode] = useState<'new' | 'review' | 'all'>('new');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadLessonProgress();
  }, [lessons, userId]);

  const loadLessonProgress = async () => {
    const progressData = await Promise.all(
      lessons.map(async (lesson) => {
        const progress = await learnedWordsStorage.getLessonProgress(
          userId,
          lesson.id,
          lesson.totalWords
        );
        return {
          ...lesson,
          learnedWords: progress.learnedWords.length,
          isComplete: progress.learnedWords.length === lesson.totalWords
        };
      })
    );
    setLessonsWithProgress(progressData);
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLesson(lessonId);
    const lesson = lessonsWithProgress.find(l => l.id === lessonId);
    if (lesson) {
      const unlearned = lesson.totalWords - lesson.learnedWords;
      setMaxWords(mode === 'new' ? unlearned : (mode === 'review' ? lesson.learnedWords : lesson.totalWords));
      setWordCount(Math.min(10, mode === 'new' ? unlearned : (mode === 'review' ? lesson.learnedWords : lesson.totalWords)));
    }
  };

  const handleStart = () => {
    onSelectLesson(selectedLesson, wordCount, mode);
  };

  const handleResetProgress = async (lessonId: string) => {
    await learnedWordsStorage.resetLessonProgress(userId, lessonId);
    await loadLessonProgress();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-4">
        <h3 className="font-medium text-foreground mb-3">Study Mode</h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setMode('new')}
            className={`p-3 rounded-lg text-sm transition-colors ${
              mode === 'new'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            New Words
          </button>
          <button
            onClick={() => setMode('review')}
            className={`p-3 rounded-lg text-sm transition-colors ${
              mode === 'review'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => setMode('all')}
            className={`p-3 rounded-lg text-sm transition-colors ${
              mode === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            All Words
          </button>
        </div>
      </div>

      {/* Lesson Cards */}
      <div className="space-y-3">
        {lessonsWithProgress.map((lesson) => {
          const percentage = Math.round((lesson.learnedWords / lesson.totalWords) * 100);
          const isSelected = selectedLesson === lesson.id;
          const canStudy = mode === 'new' ? lesson.learnedWords < lesson.totalWords : 
                          mode === 'review' ? lesson.learnedWords > 0 : true;

          return (
            <div
              key={lesson.id}
              onClick={() => canStudy && handleLessonSelect(lesson.id)}
              className={`bg-card rounded-lg shadow-sm border p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-primary shadow-md'
                  : canStudy
                  ? 'border-border hover:border-border/80'
                  : 'border-border opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-foreground">{lesson.name}</h3>
                {lesson.isComplete && (
                  <span className="text-xs bg-green-500/10 text-green-700 px-2 py-1 rounded-full">
                    Complete! ✅
                  </span>
                )}
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>{lesson.learnedWords} / {lesson.totalWords} learned</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowResetConfirm(true);
                    }}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Reset Progress
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exposure Stats */}
      {selectedLesson && (
        <ExposureStats
          lessonId={selectedLesson}
          totalWords={lessonsWithProgress.find(l => l.id === selectedLesson)?.totalWords || 0}
          userId={userId}
          onReset={() => {
            // Refresh the lesson progress after reset
            loadLessonProgress();
          }}
        />
      )}

      {/* Word Count Selector */}
      {selectedLesson && maxWords > 0 && (
        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
          <h3 className="font-medium text-foreground mb-3">
            Number of Words: {wordCount}
          </h3>
          <input
            type="range"
            min="1"
            max={maxWords}
            value={wordCount}
            onChange={(e) => setWordCount(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>{maxWords} (max)</span>
          </div>
        </div>
      )}

      {/* Start Button */}
      {selectedLesson && (
        <button
          onClick={handleStart}
          disabled={isLoading || wordCount === 0}
          className="w-full py-3 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : `Start with ${wordCount} words`}
        </button>
      )}

      {/* Reset Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Reset Progress?</h3>
            <p className="text-muted-foreground mb-4">
              This will mark all words in this lesson as unlearned. You can't undo this action.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg bg-muted text-foreground hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetProgress(selectedLesson)}
                className="flex-1 py-2 px-4 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}