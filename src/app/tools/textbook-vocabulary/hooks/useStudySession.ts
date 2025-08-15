'use client';

import { useReducer, useCallback, useRef, useEffect } from 'react';
import { spacedRepetition, vocabStorage } from '@/services/textbook-vocabulary/client';
import type { VocabularyItem } from '../types';

interface StudySessionStats {
  studied: number;
  correct: number;
}

interface StudySessionState {
  studyQueue: VocabularyItem[];
  currentCardIndex: number;
  sessionId: string | null;
  sessionStats: StudySessionStats;
  isStudying: boolean;
}

type StudySessionAction = 
  | { type: 'START_SESSION'; payload: { cards: VocabularyItem[]; sessionId: string } }
  | { type: 'ADVANCE_CARD'; payload: { newStats: StudySessionStats } }
  | { type: 'END_SESSION' }
  | { type: 'RESET' };

const initialState: StudySessionState = {
  studyQueue: [],
  currentCardIndex: 0,
  sessionId: null,
  sessionStats: { studied: 0, correct: 0 },
  isStudying: false,
};

function studySessionReducer(state: StudySessionState, action: StudySessionAction): StudySessionState {
  switch (action.type) {
    case 'START_SESSION':

      return {
        ...state,
        studyQueue: action.payload.cards,
        currentCardIndex: 0,
        sessionId: action.payload.sessionId,
        sessionStats: { studied: 0, correct: 0 },
        isStudying: true,
      };
    
    case 'ADVANCE_CARD':

      return {
        ...state,
        currentCardIndex: state.currentCardIndex + 1,
        sessionStats: action.payload.newStats,
      };
    
    case 'END_SESSION':

      return {
        ...state,
        studyQueue: [],
        currentCardIndex: 0,
        sessionId: null,
        isStudying: false,
        // Keep sessionStats for display
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
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
  const [state, dispatch] = useReducer(studySessionReducer, initialState);
  
  // Keep a ref to the latest state to avoid stale closures
  const stateRef = useRef(state);
  stateRef.current = state;

  // Debug: Log when studyQueue changes
  useEffect(() => {

  }, [state.studyQueue.length]);
  
  const startStudySession = useCallback(async (cards: VocabularyItem[], textbook: string) => {

    try {
      // Start a new study session first
      const newSessionId = await vocabStorage.startStudySession(textbook);

      // Use reducer for reliable state updates

      dispatch({ 
        type: 'START_SESSION', 
        payload: { cards, sessionId: newSessionId } 
      });

    } catch (error) {
      console.error('Failed to start study session:', error);
      throw error; // Re-throw for error handling in component
    }
  }, []);
  
  // Define endSession before completeCard to avoid circular dependency
  const endSession = useCallback(async () => {
    try {
      // Save session end time
      if (state.sessionId) {
        await vocabStorage.updateStudySession(state.sessionId, {
          endTime: new Date()
        });
      }

      dispatch({ type: 'END_SESSION' });
    } catch (error) {
      console.error('Failed to end session:', error);
      // Still reset UI state even if save fails
      dispatch({ type: 'END_SESSION' });
    }
  }, [state.sessionId]);
  
  const completeCard = useCallback(async (quality: number) => {
    // Use the ref to get the latest state
    const currentState = stateRef.current;

    if (currentState.currentCardIndex >= currentState.studyQueue.length) {

      return;
    }
    
    const currentCard = currentState.studyQueue[currentState.currentCardIndex];

    try {
      // Process the review with spaced repetition
      await spacedRepetition.processReview(currentCard.id, quality, currentCard);

      // Update session stats
      const newStats = {
        studied: currentState.sessionStats.studied + 1,
        correct: currentState.sessionStats.correct + (quality >= 3 ? 1 : 0)
      };
      
      // Update session in storage
      if (currentState.sessionId) {
        await vocabStorage.updateStudySession(currentState.sessionId, {
          cardsStudied: newStats.studied,
          cardsCorrect: newStats.correct,
          avgQuality: quality
        });
      }
      
      // Check if this was the last card
      const isLastCard = currentState.currentCardIndex === currentState.studyQueue.length - 1;

      if (isLastCard) {

        // First update the stats in state
        dispatch({ type: 'ADVANCE_CARD', payload: { newStats } });
        // Small delay to ensure state update completes
        setTimeout(async () => {
          await endSession();
        }, 100);
      } else {

        dispatch({ type: 'ADVANCE_CARD', payload: { newStats } });
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      throw error; // Re-throw for error handling in component
    }
  }, [endSession]);
  
  return {
    // State
    studyQueue: state.studyQueue,
    currentCardIndex: state.currentCardIndex,
    sessionId: state.sessionId,
    sessionStats: state.sessionStats,
    isStudying: state.isStudying,
    
    // Actions
    startStudySession,
    completeCard,
    endSession
  };
}