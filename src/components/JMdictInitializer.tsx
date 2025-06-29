'use client';

import { useEffect } from 'react';
import { loadJMdict } from '@/utils/jmdictVocabulary';

export default function JMdictInitializer() {
  useEffect(() => {
    // Load JMdict data when the app starts
    loadJMdict().catch(console.error);
  }, []);

  return null;
}