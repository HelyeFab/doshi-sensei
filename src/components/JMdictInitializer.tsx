'use client';

import { useEffect } from 'react';
import { loadJMdict } from '@/utils/jmdictVocabulary';
import { loadJMdictForPractice } from '@/utils/jmdictPractice';
import { PracticeCache } from '@/utils/practiceCache';

export default function JMdictInitializer() {
  useEffect(() => {
    // Defer loading JMdict data to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      Promise.all([
        loadJMdict(),
        loadJMdictForPractice().then(() => {
          // Preload practice cache after JMdict is loaded
          PracticeCache.preloadCache();
        })
      ]).catch(console.error);
    }, 100); // Small delay to let initial render complete
    
    return () => clearTimeout(timeoutId);
  }, []);

  return null;
}