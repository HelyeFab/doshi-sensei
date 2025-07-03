'use client';

import { useEffect } from 'react';
import { loadJMdict } from '@/utils/jmdictVocabulary';
import { loadJMdictForPractice } from '@/utils/jmdictPractice';
import { PracticeCache } from '@/utils/practiceCache';

export default function JMdictInitializer() {
  useEffect(() => {
    // Load JMdict data when the app starts
    Promise.all([
      loadJMdict(),
      loadJMdictForPractice().then(() => {
        // Preload practice cache after JMdict is loaded
        PracticeCache.preloadCache();
      })
    ]).catch(console.error);
  }, []);

  return null;
}