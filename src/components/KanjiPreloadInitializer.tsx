'use client';

import { useEffect } from 'react';
import kanjiPreloader from '@/services/kanjiPreloader';

export function KanjiPreloadInitializer() {
  useEffect(() => {
    // Start preloading kanji data after 3 seconds
    // This gives time for the initial page to load properly
    kanjiPreloader.startPreloading(3000);
  }, []);

  return null;
}