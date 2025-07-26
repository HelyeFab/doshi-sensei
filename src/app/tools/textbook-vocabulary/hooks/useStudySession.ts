'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { spacedRepetition, vocabStorage } from '@/services/textbook-vocabulary';
import type { VocabularyItem } from '../types';

interface StudySessionStats {
  studied: number;
  correct: number;
}

interface UseStudySessionReturn {
  // State
  studyQueue: VocabularyItem[];
  currentCardIndex: number;
  sessionId: string | null;
  sessionStats: StudySessionStats;
  isStudying: boolean;
  
  // Actions
  startStudySession: (cards: VocabularyItem[], textbook: string) => Promise<void>;
  completeCard: (quality: number) => Promise<void>;
  endSession: () => Promise<void>;
}

export function useStudySession(): UseStudySessionReturn {
  const [studyQueue, setStudyQueue] = useState<VocabularyItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<StudySessionStats>({ studied: 0, correct: 0 });
  const [isStudying, setIsStudying] = useState(false);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const startStudySession = useCallback(async (cards: VocabularyItem[], textbook: string) => {
    try {
      // Reset state
      if (isMountedRef.current) {
        setStudyQueue(cards);
        setCurrentCardIndex(0);
        setIsStudying(true);
      }
      
      // Start a new study session
      const newSessionId = await vocabStorage.startStudySession(textbook);
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        setSessionId(newSessionId);
        setSessionStats({ studied: 0, correct: 0 });
      }
    } catch (error) {
      console.error('Failed to start study session:', error);
      throw error; // Re-throw for error handling in component
    }
  }, []);
  
  const completeCard = useCallback(async (quality: number) => {
    if (currentCardIndex >= studyQueue.length) return;
    
    const currentCard = studyQueue[currentCardIndex];
    
    try {
      // Process the review with spaced repetition
      await spacedRepetition.processReview(currentCard.id, quality, currentCard);
      
      // Only update state if still mounted
      if (isMountedRef.current) {
        // Update session stats
        const newStats = {
          studied: sessionStats.studied + 1,
          correct: sessionStats.correct + (quality >= 3 ? 1 : 0)
        };
        setSessionStats(newStats);
        
        // Update session in storage
        if (sessionId) {
          await vocabStorage.updateStudySession(sessionId, {
            cardsStudied: newStats.studied,
            cardsCorrect: newStats.correct,
            avgQuality: quality
          });
        }
        
        // Move to next card or end session
        if (currentCardIndex < studyQueue.length - 1) {
          setCurrentCardIndex(currentCardIndex + 1);
        } else {
          await endSession();
        }
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw error; // Re-throw for error handling in component
    }
  }, [currentCardIndex, studyQueue, sessionStats, sessionId, endSession]);
  
  const endSession = useCallback(async () => {
    try {
      // Save session end time
      if (sessionId) {
        await vocabStorage.updateStudySession(sessionId, {
          endTime: new Date()
        });
      }
      
      // Reset state only if still mounted
      if (isMountedRef.current) {
        setStudyQueue([]);
        setCurrentCardIndex(0);
        setSessionId(null);
        setIsStudying(false);
        // Keep sessionStats for display until next session starts
      }
    } catch (error) {
      console.error('Failed to end session:', error);
      // Still reset UI state even if save fails, but only if mounted
      if (isMountedRef.current) {
        setStudyQueue([]);
        setCurrentCardIndex(0);
        setSessionId(null);
        setIsStudying(false);
      }
    }
  }, [sessionId]);
  
  return {
    // State
    studyQueue,
    currentCardIndex,
    sessionId,
    sessionStats,
    isStudying,
    
    // Actions
    startStudySession,
    completeCard,
    endSession
  };
}