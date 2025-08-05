import { useState, useMemo } from 'react';
// Import generalized types and the new DataSourceMetadata
import type { LearningItem, FilterOptions, DataSourceMetadata, VocabularyItem, KanjiItem, CharacterItem } from '@/types/learning';

/**
 * Hook to filter a list of learning items based on provided filter options.
 * @param data - The array of LearningItem objects to filter.
 * @param metadata - Metadata about the data source, used for available filter options.
 * @returns An object containing the filtered data, current filters, functions to update filters, reset filters, and available filter options.
 */
export function useFilteredLearningItems(data: LearningItem[], metadata: DataSourceMetadata | null) {
  // Initialize filters based on the new generalized FilterOptions type
  const [filters, setFilters] = useState<FilterOptions>({
    itemType: undefined, // Default to no filter for item type
    textbook: undefined, // Default to no filter for textbook
    lesson: undefined,   // Default to no filter for lesson
    jlptLevel: null,     // jlptLevel can be null as per type definition
    tags: [],            // Default to empty array for tags
    searchQuery: '',
    partOfSpeech: undefined // Changed from null to undefined as per type definition
  });

  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Filter by Item Type
    if (filters.itemType) {
      filtered = filtered.filter(item => item.itemType === filters.itemType);
    }

    // Filter by Textbook (if applicable and provided)
    // This filter is primarily for textbook data sources.
    if (filters.textbook && metadata?.id === filters.textbook) {
      // We assume items loaded from a specific textbook source will have a 'textbook' property.
      // Use type assertion for safety, assuming 'textbook' property exists on relevant items.
      filtered = filtered.filter(item => (item as any).textbook === filters.textbook);
    }

    // Filter by Lesson (if applicable and provided)
    // This filter is primarily for textbook data sources.
    if (filters.lesson !== undefined && metadata?.id === filters.textbook) {
      // Similar assumption as textbook filter
      filtered = filtered.filter(item => (item as any).lesson === filters.lesson);
    }

    // Filter by JLPT level
    if (filters.jlptLevel) {
      // This filter is specific to VocabularyItem and potentially KanjiItem (if they have JLPT levels)
      filtered = filtered.filter(item => {
        // Use type guard to safely access jlptLevel, only for VocabularyItem
        if (item.itemType === 'vocabulary' && 'jlptLevel' in item && item.jlptLevel) {
          return item.jlptLevel === filters.jlptLevel;
        }
        return false; // Item doesn't have JLPT level or it's not applicable
      });
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(item =>
        filters.tags!.every(tag => item.tags?.includes(tag))
      );
    }

    // Filter by part of speech
    if (filters.partOfSpeech) {
      // This filter is specific to VocabularyItem and potentially others
      filtered = filtered.filter(item => {
        // Use type guard to safely access partOfSpeech, only for VocabularyItem
        if (item.itemType === 'vocabulary' && 'partOfSpeech' in item && Array.isArray(item.partOfSpeech)) {
          // Ensure partOfSpeech is treated as an array for the includes check
          const targetPOS = Array.isArray(filters.partOfSpeech) ? filters.partOfSpeech : [filters.partOfSpeech];
          return item.partOfSpeech.some(pos => targetPOS.includes(pos));
        }
        return false; // Item doesn't have partOfSpeech or it's not applicable
      });
    }

    // Search filter (applies to text, reading, meaning, examples)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.text.toLowerCase().includes(query) ||
        item.reading.toLowerCase().includes(query) ||
        item.meaning.toLowerCase().includes(query) ||
        // Safely access examples property, which might not exist on all item types
        ('examples' in item && Array.isArray(item.examples) && item.examples.some(ex =>
          ex.japanese.toLowerCase().includes(query) ||
          ex.english.toLowerCase().includes(query)
        ))
      );
    }

    return filtered;
  }, [data, filters, metadata]); // Include metadata in dependencies as it affects filtering logic

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      itemType: undefined,
      textbook: undefined,
      lesson: undefined,
      jlptLevel: null,
      tags: [],
      searchQuery: '',
      partOfSpeech: undefined // Reset to undefined
    });
  };

  // Derive available filters from the data and metadata
  const availableFilters = useMemo(() => {
    const itemTypes = new Set<LearningItem['itemType']>();
    const tags = new Set<string>();
    const partsOfSpeech = new Set<string>();
    const jlptLevels = new Set<string>(); // Store as string for consistency

    // Add item types from metadata if available
    if (metadata?.itemTypes) {
      metadata.itemTypes.forEach(type => itemTypes.add(type));
    } else {
      // Fallback: infer item types from data if metadata is missing
      data.forEach(item => itemTypes.add(item.itemType));
    }

    data.forEach(item => {
      // Add tags
      item.tags?.forEach(tag => tags.add(tag));

      // Add part of speech (specific to VocabularyItem and potentially others)
      // Use type guard to safely access partOfSpeech
      if (item.itemType === 'vocabulary' && 'partOfSpeech' in item && Array.isArray(item.partOfSpeech)) {
        item.partOfSpeech.forEach(pos => partsOfSpeech.add(pos));
      }

      // Add JLPT levels (specific to VocabularyItem and potentially KanjiItem)
      // Use type guard to safely access jlptLevel
      if (item.itemType === 'vocabulary' && 'jlptLevel' in item && item.jlptLevel) {
        jlptLevels.add(item.jlptLevel);
      }
    });

    return {
      itemTypes: Array.from(itemTypes).sort(),
      tags: Array.from(tags).sort(),
      partsOfSpeech: Array.from(partsOfSpeech).sort(),
      jlptLevels: Array.from(jlptLevels).sort()
    };
  }, [data, metadata]); // Re-calculate when data or metadata changes

  return {
    filteredData,
    filters,
    updateFilter,
    resetFilters,
    availableFilters
  };
}