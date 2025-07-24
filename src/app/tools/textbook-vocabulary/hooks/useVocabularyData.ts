import { useState, useEffect } from 'react';
import type { VocabularyItem, TextbookMetadata } from '../types';

export function useVocabularyData(textbook: string, lesson?: number) {
  const [data, setData] = useState<VocabularyItem[]>([]);
  const [metadata, setMetadata] = useState<TextbookMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
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
          // Load specific lesson
          try {
            const lessonModule = await import(
              `@/data/textbook-vocabulary/${textbook}/lesson-${lesson}.json`
            );
            setData(lessonModule.default);
          } catch (err) {
            // If specific lesson doesn't exist, try loading all
            console.warn(`Lesson ${lesson} not found, loading all vocabulary`);
            await loadAllVocabulary(textbook);
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
  }, [textbook, lesson]);
  
  const loadAllVocabulary = async (textbook: string) => {
    // For now, just load lesson 1 as sample
    // In production, this would load all lessons or a combined file
    try {
      const lesson1Module = await import(
        `@/data/textbook-vocabulary/${textbook}/lesson-1.json`
      );
      setData(lesson1Module.default);
    } catch (err) {
      console.error('Error loading vocabulary:', err);
      setData([]);
    }
  };
  
  return { data, metadata, loading, error };
}