import { useState, useEffect } from 'react';
// Import generalized types
import type { LearningItem, DataSourceMetadata } from '@/types/learning';

/**
 * Hook to load learning data (vocabulary, kanji, characters, etc.) from a specified source.
 * @param sourceId - The identifier for the data source (e.g., 'genki-1', 'kanji-n5', 'hiragana-chart').
 * @param lesson - Optional: A specific lesson or subset identifier within the source.
 * @returns An object containing the loaded data, metadata, loading state, and any errors.
 */
export function useLearningData(sourceId: string, lesson?: number) {
  const [data, setData] = useState<LearningItem[]>([]);
  const [metadata, setMetadata] = useState<DataSourceMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Load metadata for the source
        // For textbook vocabulary, metadata is at textbook-vocabulary/sourceId/metadata.json
        const metadataModule = await import(`@/data/textbook-vocabulary/${sourceId}/metadata.json`);
        setMetadata(metadataModule.default);

        // 2. Load learning items
        let items: LearningItem[] = [];
        const sourceMetadata = metadataModule.default as DataSourceMetadata;

        // Determine how to load items based on sourceId and lesson parameter.
        // This logic needs to be generalized to handle different data source structures.

        // Special handling for kana charts which might not have lessons in the same way textbooks do.
        // They might have a single file for all characters.
        if (sourceId.includes('hiragana-chart') || sourceId.includes('katakana-chart')) {
          try {
            // For kana charts, we expect a single file like 'kana.json' or 'all.json'
            const kanaModule = await import(`@/data/textbook-vocabulary/${sourceId}/kana.json`); // Assuming kana.json exists
            items = kanaModule.default;
          } catch (err) {
            console.warn(`'kana.json' not found for source ${sourceId}, attempting to load 'all.json'.`);
            try {
              const allModule = await import(`@/data/textbook-vocabulary/${sourceId}/all.json`);
              items = allModule.default;
            } catch (allErr) {
              console.error(`Failed to load data for kana source ${sourceId}:`, allErr);
              setError(allErr as Error);
              items = [];
            }
          }
        } else if (lesson !== undefined && sourceMetadata.lessons?.includes(lesson)) {
          // Try to load a specific lesson file for sources that have lessons (like textbooks).
          // The path structure might vary. Example: `@/data/${sourceId}/lessons/lesson-${lesson}.json`
          try {
            const lessonModule = await import(`@/data/textbook-vocabulary/${sourceId}/lesson-${lesson}.json`);
            items = lessonModule.default;
          } catch (err) {
            console.warn(`Lesson ${lesson} not found for source ${sourceId}, attempting to load all.`);
            // Fallback to loading all if specific lesson fails
            try {
              const allModule = await import(`@/data/textbook-vocabulary/${sourceId}/all.json`);
              items = allModule.default;
            } catch (allErr) {
              console.error(`Failed to load all data for source ${sourceId} after lesson ${lesson} failed:`, allErr);
              setError(allErr as Error);
              items = [];
            }
          }
        } else {
          // Load all items if no lesson specified or lesson is invalid for the source.
          try {
            const allModule = await import(`@/data/textbook-vocabulary/${sourceId}/all.json`);
            items = allModule.default;
          } catch (err) {
            console.error(`Failed to load all data for source ${sourceId}:`, err);
            setError(err as Error);
            items = []; // Ensure items is an array even on error
          }
        }
        setData(items);

      } catch (err) {
        console.error(`Error loading learning data for source ${sourceId}:`, err);
        setError(err as Error);
        setData([]); // Ensure data is empty on error
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [sourceId, lesson]); // lesson dependency might need to be removed or handled differently depending on generalization

  // Ensure the returned data conforms to LearningItem[]
  return { data: data as LearningItem[], metadata: metadata as DataSourceMetadata | null, loading, error };
}