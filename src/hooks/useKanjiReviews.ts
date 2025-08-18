/**
 * Hook for managing kanji in the Daily Reviews system
 * Provides functions to add/remove kanji from SRS reviews
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { reviewQueueService } from '@/services/kanji-mastery/reviewQueueService';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Kanji } from '@/types';

interface UseKanjiReviewsReturn {
  isInReviews: (kanjiChar: string) => boolean;
  addToReviews: (kanji: Kanji) => Promise<void>;
  removeFromReviews: (kanjiChar: string) => Promise<void>;
  loading: boolean;
  kanjiInReviews: Set<string>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

export function useKanjiReviews(): UseKanjiReviewsReturn {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [kanjiInReviews, setKanjiInReviews] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Load existing kanji in reviews
  useEffect(() => {
    const loadExistingKanji = async () => {
      if (!user?.uid) return;
      
      try {
        // Get all kanji currently in the review system from Firestore
        const progressRef = collection(db, 'users', user.uid, 'kanjiProgress');
        const snapshot = await getDocs(progressRef);
        
        const kanjiSet = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.kanjiChar) {
            kanjiSet.add(data.kanjiChar);
          }
        });
        
        setKanjiInReviews(kanjiSet);
      } catch (error) {
        console.error('Failed to load existing kanji:', error);
      }
    };

    loadExistingKanji();
  }, [user]);

  /**
   * Check if a kanji is already in reviews
   */
  const isInReviews = useCallback((kanjiChar: string): boolean => {
    return kanjiInReviews.has(kanjiChar);
  }, [kanjiInReviews]);

  /**
   * Add a kanji to the Daily Reviews system
   */
  const addToReviews = useCallback(async (kanji: Kanji) => {
    if (!user?.uid) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      // Prepare kanji data for the review system
      const kanjiData = {
        char: kanji.kanji,
        data: {
          jlptLevel: parseInt(kanji.jlpt.replace('N', '')),
          strokeCount: kanji.strokes || 0,
          frequency: 5, // Default frequency
          meanings: [kanji.meaning],
          onyomi: kanji.onyomi,
          kunyomi: kanji.kunyomi,
          components: [], // Can be enhanced later
          radicals: []    // Can be enhanced later
        }
      };

      // Add to review queue
      await reviewQueueService.batchAddKanji(user.uid, [kanjiData]);

      // Update local state
      setKanjiInReviews(prev => new Set([...prev, kanji.kanji]));

      showToast({
        title: 'Added to Daily Reviews',
        description: `${kanji.kanji} has been added to your daily reviews`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to add kanji to reviews:', error);
      showToast({
        title: 'Failed to Add',
        description: 'Could not add kanji to reviews. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  /**
   * Remove a kanji from the Daily Reviews system
   */
  const removeFromReviews = useCallback(async (kanjiChar: string) => {
    if (!user?.uid) {
      setShowLoginModal(true);
      return;
    }

    setLoading(true);
    try {
      // Remove from the review system - delete the progress document
      const progressId = `${user.uid}_${kanjiChar}`;
      const progressRef = doc(db, 'users', user.uid, 'kanjiProgress', progressId);
      await deleteDoc(progressRef);

      // Update local state
      setKanjiInReviews(prev => {
        const newSet = new Set(prev);
        newSet.delete(kanjiChar);
        return newSet;
      });

      showToast({
        title: 'Removed from Daily Reviews',
        description: `${kanjiChar} has been removed from your daily reviews`,
        type: 'info'
      });
    } catch (error) {
      console.error('Failed to remove kanji from reviews:', error);
      showToast({
        title: 'Failed to Remove',
        description: 'Could not remove kanji from reviews. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  return {
    isInReviews,
    addToReviews,
    removeFromReviews,
    loading,
    kanjiInReviews,
    showLoginModal,
    setShowLoginModal
  };
}