import { useState, useEffect } from 'react';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { TEXTBOOK_CONFIG } from '@/config/textbooks';
import type { VocabularyItem, TextbookMetadata } from '../types';

export function useVocabularyData(textbook: string, lesson?: number) {
  const [data, setData] = useState<VocabularyItem[]>([]);
  const [metadata, setMetadata] = useState<TextbookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { isPremium } = useSubscription2();
  
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load metadata
        const metadataModule = await import(
          `@/data/textbook-vocabulary/${textbook}/metadata.json`
        );
        setMetadata(metadataModule.default);
        
        // Load vocabulary data
        if (lesson) {
          // Check if this is a premium lesson and should use API
          const requiresAPI = lesson > TEXTBOOK_CONFIG.premiumLimits.freeUserMaxLesson && !isPremium;
          
          if (requiresAPI) {
            // Use API route for premium validation
            try {
              const response = await fetch(`/api/textbook-vocabulary/${textbook}/${lesson}`);
              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to load lesson');
              }
              const lessonData = await response.json();
              setData(lessonData);
            } catch (err) {
              console.error('Failed to load premium lesson:', err);
              setError(err as Error);
            }
          } else {
            // For Genki 2, adjust lesson number (UI shows 1-11, but data has 13-23)
            let actualLesson = lesson;
            if (textbook === 'genki-2' && lesson <= 11) {
              actualLesson = lesson + 12;
            }
            
            // Load specific lesson directly
            try {
              const lessonModule = await import(
                `@/data/textbook-vocabulary/${textbook}/lesson-${actualLesson}.json`
              );
              setData(lessonModule.default);
            } catch (err) {
              // If specific lesson doesn't exist, try loading all
              console.warn(`Lesson ${actualLesson} not found, loading all vocabulary`);
              await loadAllVocabulary(textbook);
            }
          }
        } else {
          // Load all vocabulary for the textbook
          await loadAllVocabulary(textbook);
        }
      } catch (err) {
        console.error('Error loading vocabulary data:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [textbook, lesson, isPremium]);
  
  const loadAllVocabulary = async (textbook: string) => {
    try {
      // First try to load an 'all.json' file if it exists
      const allModule = await import(
        `@/data/textbook-vocabulary/${textbook}/all.json`
      );
      setData(allModule.default);
    } catch (err) {
      // If no 'all.json', check metadata for available lessons
      try {
        const metadataModule = await import(
          `@/data/textbook-vocabulary/${textbook}/metadata.json`
        );
        const meta = metadataModule.default;
        
        // If no lessons available, set empty data
        if (!meta.lessons || meta.lessons.length === 0) {
          console.log(`No vocabulary data available for ${textbook}`);
          setData([]);
          return;
        }
        
        // Otherwise try to load first lesson
        const firstLesson = meta.lessons[0];
        const lessonModule = await import(
          `@/data/textbook-vocabulary/${textbook}/lesson-${firstLesson}.json`
        );
        setData(lessonModule.default);
      } catch (innerErr) {
        console.error('Error loading vocabulary:', innerErr);
        setData([]);
      }
    }
  };
  
  return { data, metadata, loading, error };
}