'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle } from '@/types/news';
import TTSManager from '@/utils/tts';
import { generateFuriganaWithCache } from '@/utils/furigana';

interface ArticleAudioPlayerProps {
  article: NewsArticle;
}

interface AudioControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentSentence: number;
  playbackSpeed: number;
  volume: number;
  autoAdvance: boolean;
}

export default function ArticleAudioPlayer({ article }: ArticleAudioPlayerProps) {
  const [sentences, setSentences] = useState<string[]>([]);
  const [controls, setControls] = useState<AudioControls>({
    isPlaying: false,
    isPaused: false,
    currentSentence: 0,
    playbackSpeed: 1.0,
    volume: 1.0,
    autoAdvance: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});
  
  const autoAdvanceRef = useRef<boolean>(true);
  const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES_PER_SENTENCE = 2;
  
  // Keep ref synchronized with controls state
  useEffect(() => {
    autoAdvanceRef.current = controls.autoAdvance;
  }, [controls.autoAdvance]);

  // Parse article into sentences on mount
  useEffect(() => {
    const rawSentences = article.content
      .split(/[。！？]/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim() + '。');
    
    setSentences(rawSentences);
  }, [article.content]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      TTSManager.stop();
      if (audioTimeoutRef.current) {
        clearTimeout(audioTimeoutRef.current);
      }
    };
  }, []);

  // Play a specific sentence
  const playCurrentSentence = async (index?: number) => {
    const sentenceIndex = index !== undefined ? index : controls.currentSentence;
    
    if (sentenceIndex >= sentences.length || sentenceIndex < 0) {
      setControls(prev => ({ ...prev, isPlaying: false, isPaused: false }));
      return;
    }

    const sentence = sentences[sentenceIndex];
    setIsLoading(true);

    try {
      await TTSManager.stop();
      await TTSManager.speak(sentence, controls.playbackSpeed);
      
      setControls(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentSentence: sentenceIndex
      }));

      // Reset retry count on successful play
      setRetryCount(prev => {
        const newCount = { ...prev };
        delete newCount[sentenceIndex];
        return newCount;
      });

      // Auto-advance if enabled
      if (autoAdvanceRef.current && sentenceIndex < sentences.length - 1) {
        audioTimeoutRef.current = setTimeout(() => {
          setControls(prev => ({
            ...prev,
            currentSentence: prev.currentSentence + 1
          }));
          playCurrentSentence(sentenceIndex + 1);
        }, 1000);
      } else if (sentenceIndex === sentences.length - 1) {
        // Reached the end
        audioTimeoutRef.current = setTimeout(() => {
          setControls(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false
          }));
        }, 1000);
      }
    } catch (error) {
      console.error('TTS Error:', error);
      
      // Retry logic
      const currentRetries = retryCount[sentenceIndex] || 0;
      if (currentRetries < MAX_RETRIES_PER_SENTENCE) {
        setRetryCount(prev => ({
          ...prev,
          [sentenceIndex]: currentRetries + 1
        }));
        setTimeout(() => {
          playCurrentSentence(sentenceIndex);
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Play all from beginning
  const playAll = () => {
    setControls(prev => ({
      ...prev,
      currentSentence: 0,
      isPlaying: true,
      isPaused: false
    }));
    playCurrentSentence(0);
  };

  // Pause/Resume
  const togglePause = () => {
    if (controls.isPlaying) {
      TTSManager.stop();
      setControls(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: true
      }));
    } else if (controls.isPaused) {
      playCurrentSentence();
    }
  };

  // Stop playback
  const stopPlayback = () => {
    TTSManager.stop();
    if (audioTimeoutRef.current) {
      clearTimeout(audioTimeoutRef.current);
    }
    setControls(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentSentence: 0
    }));
  };

  const progress = sentences.length > 0 
    ? ((controls.currentSentence + 1) / sentences.length) * 100 
    : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" 
              />
            </svg>
            <h3 className="font-medium text-foreground">Listen to Article</h3>
          </div>
          <span className="text-sm text-muted-foreground">
            {controls.currentSentence + 1} / {sentences.length} sentences
          </span>
        </div>

        {/* Main Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={stopPlayback}
            disabled={!controls.isPlaying && !controls.isPaused}
            className="p-3 rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" 
              />
            </svg>
          </button>

          {controls.isPlaying || controls.isPaused ? (
            <button
              onClick={togglePause}
              className="p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xl min-w-[60px] flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : controls.isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={playAll}
              className="p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xl min-w-[60px] flex items-center justify-center"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </button>
          )}

          <div className="flex-1">
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-foreground">Speed:</label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={controls.playbackSpeed}
            onChange={(e) => setControls(prev => ({ ...prev, playbackSpeed: parseFloat(e.target.value) }))}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground min-w-[3rem] text-right">
            {controls.playbackSpeed}x
          </span>
        </div>

        {/* Auto-advance Toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={controls.autoAdvance}
            onChange={(e) => setControls(prev => ({ ...prev, autoAdvance: e.target.checked }))}
            className="rounded"
          />
          <span className="text-sm text-foreground">Auto-advance to next sentence</span>
        </label>
      </div>
    </div>
  );
}