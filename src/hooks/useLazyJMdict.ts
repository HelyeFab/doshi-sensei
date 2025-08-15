'use client';

import { useEffect, useState } from 'react';
import { loadJMdict } from '@/utils/jmdictVocabulary';
import { loadJMdictForPractice } from '@/utils/jmdictPractice';
import { PracticeCache } from '@/utils/practiceCache';

let jmdictPromise: Promise<void> | null = null;
let isLoaded = false;

/**
 * Hook to lazy-load JMdict data only when needed
 * This prevents loading the dictionary on pages that don't need it
 */
export function useLazyJMdict() {
  const [loading, setLoading] = useState(!isLoaded);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setLoading(false);
      return;
    }

    // Create a single shared promise for all components
    if (!jmdictPromise) {
      jmdictPromise = Promise.all([
        loadJMdict(),
        loadJMdictForPractice().then(() => {
          PracticeCache.preloadCache();
        })
      ]).then(() => {
        isLoaded = true;
      });
    }

    // Load the data
    jmdictPromise
      .then(() => setLoading(false))
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { loading, error, isLoaded };
}