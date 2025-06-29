'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Story, StoryQuizQuestion } from '@/types/story';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTTS } from '@/hooks/useTTS';
import { parseJapaneseText, processTextWithFurigana } from '@/utils/japaneseParser';
import { storyManager } from '@/utils/storyManager';
import { storyOfflineManager } from '@/utils/storyOfflineManager';
import { StudyListManager } from '@/utils/studyListManager';
import { JapaneseWord } from '@/types';
import { lookupWord } from '@/utils/dictionaryLookup';
import CompanionTrigger from '@/components/CompanionTrigger';

interface StoryReaderProps {
  story: Story;
  onComplete?: () => void;
  onExit?: () => void;
}

interface SelectedWord {
  word: string;
  reading?: string;
  meanings?: string[];
  position: { x: number; y: number };
}

export default function StoryReader({ story, onComplete, onExit }: StoryReaderProps) {
  const { user } = useAuth();
  const { userType } = useSubscription();
  const { speakSentence, isPlaying, isCacheLoading } = useTTS();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [wordLookupLoading, setWordLookupLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);

  const textContainerRef = useRef<HTMLDivElement>(null);
  const isPremium = userType === 'monthly' || userType === 'yearly';

  const currentPage = story.pages[currentPageIndex];

  // Track story view and cache on mount
  useEffect(() => {
    if (story.id) {
      storyManager.trackStoryView(story.id);
      
      // Cache story for offline reading
      storyOfflineManager.cacheStory(story).catch(error => {
        console.error('Failed to cache story:', error);
      });
    }
  }, [story.id]);

  // Save progress
  useEffect(() => {
    if (user && story.id) {
      // Save to Firebase
      storyManager.saveProgress(user.uid, {
        storyId: story.id,
        currentPage: currentPageIndex,
        completed: false,
        savedWords: Array.from(savedWords),
        quizAttempts: 0,
        lastReadAt: new Date()
      });
      
      // Also save locally for offline access
      storyOfflineManager.saveLocalProgress(
        user.uid,
        story.id,
        currentPageIndex,
        false,
        Array.from(savedWords)
      );
    }
  }, [currentPageIndex, user, story.id, savedWords]);

  const handleWordClick = async (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;
    const word = target.getAttribute('data-word');
    const reading = target.getAttribute('data-reading');
    
    if (!word) return;

    const rect = target.getBoundingClientRect();
    const containerRect = textContainerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;

    setWordLookupLoading(true);
    try {
      const lookupResult = await lookupWord(word);
      
      setSelectedWord({
        word,
        reading: reading || lookupResult?.reading,
        meanings: lookupResult?.meanings || ['No definition found'],
        position: {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top
        }
      });
    } catch (error) {
      console.error('Error looking up word:', error);
      setSelectedWord({
        word,
        reading: reading || undefined,
        meanings: ['Error loading definition'],
        position: {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top
        }
      });
    } finally {
      setWordLookupLoading(false);
    }
  };

  const handleSaveWord = async () => {
    if (!selectedWord || !user) return;

    try {
      // Create a JapaneseWord object for saving
      const wordToSave: JapaneseWord = {
        id: `story-word-${Date.now()}`,
        kanji: selectedWord.word,
        kana: selectedWord.reading || selectedWord.word,
        romaji: '',
        meaning: selectedWord.meanings?.join('; ') || '',
        type: 'other' as const,
        jlpt: story.jlptLevel,
        tags: ['from-story', story.theme.toLowerCase()]
      };

      // Create a "Story Words" list if it doesn't exist
      const lists = await StudyListManager.getAllStudyLists();
      let storyList = lists.find(l => l.name === 'Story Words');
      
      if (!storyList) {
        storyList = await StudyListManager.createStudyList(
          'Story Words',
          'flashcard',
          'Words saved from AI stories',
          user
        );
      }

      if (storyList) {
        await StudyListManager.addItemToLists(wordToSave, 'word', [storyList.id], user);
      }
      
      setSavedWords(prev => new Set(prev).add(selectedWord.word));
      setSelectedWord(null);
    } catch (error) {
      console.error('Error saving word:', error);
    }
  };

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPageIndex < story.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    } else if (direction === 'prev' && currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    } else if (direction === 'next' && currentPageIndex === story.pages.length - 1) {
      // Last page - show quiz
      setShowQuiz(true);
    }
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    const newAnswers = [...quizAnswers];
    newAnswers[questionIndex] = answerIndex;
    setQuizAnswers(newAnswers);
  };

  const handleQuizSubmit = async () => {
    let correct = 0;
    story.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.correctIndex) {
        correct++;
      }
    });

    const score = Math.round((correct / story.quiz.length) * 100);
    setQuizScore(score);

    // Mark story as completed
    if (user && story.id) {
      await storyManager.markStoryCompleted(user.uid, story.id, score);
    }

    if (onComplete) {
      onComplete();
    }
  };

  const renderJapaneseText = (html: string) => {
    // Process text with furigana if needed
    const processedHtml = showFurigana ? html : html.replace(/<rt>.*?<\/rt>/g, '');
    
    // Parse the HTML and add click handlers
    const parser = new DOMParser();
    const doc = parser.parseFromString(processedHtml, 'text/html');
    
    // Add data attributes to ruby elements for word lookup
    const rubyElements = doc.querySelectorAll('ruby');
    rubyElements.forEach(ruby => {
      const word = ruby.textContent?.replace(/[\s\n]+/g, '') || '';
      const reading = ruby.querySelector('rt')?.textContent || '';
      ruby.setAttribute('data-word', word);
      ruby.setAttribute('data-reading', reading);
    });

    return (
      <div 
        ref={textContainerRef}
        className="japanese-text text-lg leading-relaxed relative"
        dangerouslySetInnerHTML={{ __html: doc.body.innerHTML }}
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'RUBY' || target.closest('ruby')) {
            const ruby = target.tagName === 'RUBY' ? target : target.closest('ruby');
            if (ruby) {
              const word = ruby.getAttribute('data-word');
              const reading = ruby.getAttribute('data-reading');
              if (word) {
                // Create a synthetic React event
                const syntheticEvent = {
                  ...e,
                  currentTarget: ruby as HTMLSpanElement,
                  target: ruby as HTMLSpanElement
                } as React.MouseEvent<HTMLSpanElement>;
                handleWordClick(syntheticEvent);
              }
            }
          }
        }}
      />
    );
  };

  if (showQuiz) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-card rounded-lg p-6 border border-border">
          <h2 className="text-2xl font-bold mb-6">Story Quiz</h2>
          
          {quizScore === null ? (
            <div className="space-y-6">
              {story.quiz.map((question, qIndex) => (
                <div key={question.id} className="space-y-3">
                  <p className="font-medium">{qIndex + 1}. {question.question}</p>
                  <div className="space-y-2">
                    {question.options.map((option, oIndex) => (
                      <label key={oIndex} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          checked={quizAnswers[qIndex] === oIndex}
                          onChange={() => handleQuizAnswer(qIndex, oIndex)}
                          className="w-4 h-4"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setShowQuiz(false)}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg"
                >
                  Back to Story
                </button>
                <button
                  onClick={handleQuizSubmit}
                  disabled={quizAnswers.length !== story.quiz.length}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50"
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">
                {quizScore >= 80 ? '🎉' : quizScore >= 60 ? '👍' : '💪'}
              </div>
              <h3 className="text-2xl font-bold">
                {quizScore >= 80 ? 'Excellent!' : quizScore >= 60 ? 'Good job!' : 'Keep practicing!'}
              </h3>
              <p className="text-xl">Your score: {quizScore}%</p>
              
              <div className="space-y-3 mt-6">
                {story.quiz.map((question, index) => (
                  <div key={question.id} className="text-left p-4 rounded-lg bg-muted/50">
                    <p className="font-medium mb-2">{question.question}</p>
                    <p className={quizAnswers[index] === question.correctIndex ? 'text-green-600' : 'text-red-600'}>
                      Your answer: {question.options[quizAnswers[index]]}
                    </p>
                    {quizAnswers[index] !== question.correctIndex && (
                      <p className="text-green-600">
                        Correct: {question.options[question.correctIndex]}
                      </p>
                    )}
                    {question.explanation && (
                      <p className="text-sm text-muted-foreground mt-1">{question.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={onExit}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg mt-6"
              >
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPageIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{story.title}</h1>
              <p className="text-muted-foreground">
                Page {currentPageIndex + 1} of {story.pages.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFurigana(!showFurigana)}
                className="px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                {showFurigana ? 'Hide' : 'Show'} Furigana
              </button>
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
              >
                {showTranslation ? 'Hide' : 'Show'} Translation
              </button>
              <button
                onClick={() => speakSentence(currentPage.text.replace(/<[^>]*>/g, ''))}
                disabled={isPlaying || isCacheLoading}
                className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50"
              >
                🔊
              </button>
              <button
                onClick={onExit}
                className="p-2 rounded-lg bg-secondary text-secondary-foreground"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image */}
            <div className="relative">
              <img
                src={currentPage.imageUrl}
                alt={currentPage.imageAlt || `Page ${currentPage.pageNumber}`}
                className="w-full rounded-lg shadow-lg"
              />
            </div>

            {/* Text */}
            <div className="space-y-4 relative">
              {renderJapaneseText(currentPage.text)}
              
              {showTranslation && (
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Translation:</p>
                  <p>{currentPage.translation}</p>
                </div>
              )}

              {/* Word Popup */}
              {selectedWord && (
                <div
                  className="absolute z-50 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[200px]"
                  style={{
                    left: `${selectedWord.position.x}px`,
                    top: `${selectedWord.position.y + 30}px`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  {wordLookupLoading ? (
                    <div className="text-center py-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-lg japanese-text">{selectedWord.word}</p>
                          {selectedWord.reading && (
                            <p className="text-sm text-muted-foreground japanese-text">{selectedWord.reading}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedWord(null)}
                          className="text-muted-foreground hover:text-foreground ml-2"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="space-y-1">
                        {selectedWord.meanings?.map((meaning, index) => (
                          <p key={index} className="text-sm">{index + 1}. {meaning}</p>
                        ))}
                      </div>
                      {user && (
                        <button
                          onClick={handleSaveWord}
                          disabled={savedWords.has(selectedWord.word)}
                          className="mt-3 w-full px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:bg-muted disabled:text-muted-foreground"
                        >
                          {savedWords.has(selectedWord.word) ? 'Saved' : 'Save Word'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => handlePageChange('prev')}
              disabled={currentPageIndex === 0}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            
            <div className="flex gap-2">
              {story.pages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentPageIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => handlePageChange('next')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              {currentPageIndex === story.pages.length - 1 ? 'Take Quiz' : 'Next'}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      <CompanionTrigger />
    </div>
  );
}