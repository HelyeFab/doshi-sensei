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
        // Assuming metadata is always at sourceId/metadata.json
        // This path needs to be robust and potentially configurable if data sources vary significantly.
        const metadataModule = await import(`@/data/${sourceId}/metadata.json`);
        setMetadata(metadataModule.default);

        // 2. Load learning items
        let items: LearningItem[] = [];

        // Determine how to load items based on sourceId and lesson parameter.
        // This logic will need to be generalized significantly.
        // For now, we'll try a common pattern:
        // - If lesson is provided and valid for the source, try to load a specific lesson file.
        // - Otherwise, try to load an 'all.json' file.
        // - Fallback to loading the first available lesson if 'all.json' is not found.

        const sourceMetadata = metadataModule.default as DataSourceMetadata;

        // Check if lesson is provided and if the metadata indicates lessons are applicable and the lesson number is valid.
        if (lesson !== undefined && sourceMetadata.lessons?.includes(lesson)) {
          // Try to load a specific lesson file. The path structure might vary.
          // Example: `@/data/${sourceId}/lessons/lesson-${lesson}.json`
          // Or it could be specific to item types, e.g., `@/data/${sourceId}/kanji/lesson-${lesson}.json`
          try {
            // This import path is a placeholder and might need adjustment based on actual data organization.
            // We need to ensure this path is dynamic and correct for different data sources.
            const lessonModule = await import(`@/data/${sourceId}/lessons/lesson-${lesson}.json`);
            items = lessonModule.default;
          } catch (err) {
            console.warn(`Lesson ${lesson} not found for source ${sourceId}, attempting to load all.`);
            // Fallback to loading all if specific lesson fails
            try {
              const allModule = await import(`@/data/${sourceId}/all.json`);
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
            const allModule = await import(`@/data/${sourceId}/all.json`);
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