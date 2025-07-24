import { useState, useMemo } from 'react';
import type { VocabularyItem, FilterOptions } from '../types';

export function useFilteredVocab(vocabulary: VocabularyItem[]) {
  const [filters, setFilters] = useState<FilterOptions>({
    jlptLevel: null,
    theme: null,
    searchQuery: '',
    partOfSpeech: null
  });
  
  const filteredVocab = useMemo(() => {
    let filtered = [...vocabulary];
    
    // Filter by JLPT level
    if (filters.jlptLevel) {
      filtered = filtered.filter(item => item.jlptLevel === filters.jlptLevel);
    }
    
    // Filter by theme
    if (filters.theme) {
      filtered = filtered.filter(item => 
        item.tags.some(tag => tag.toLowerCase().includes(filters.theme!.toLowerCase()))
      );
    }
    
    // Filter by part of speech
    if (filters.partOfSpeech) {
      filtered = filtered.filter(item => 
        item.partOfSpeech.includes(filters.partOfSpeech!)
      );
    }
    
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.japanese.toLowerCase().includes(query) ||
        item.reading.toLowerCase().includes(query) ||
        item.meaning.toLowerCase().includes(query) ||
        item.examples.some(ex => 
          ex.japanese.toLowerCase().includes(query) ||
          ex.english.toLowerCase().includes(query)
        )
      );
    }
    
    return filtered;
  }, [vocabulary, filters]);
  
  const updateFilter = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const resetFilters = () => {
    setFilters({
      jlptLevel: null,
      theme: null,
      searchQuery: '',
      partOfSpeech: null
    });
  };
  
  // Get available filter options from vocabulary
  const availableFilters = useMemo(() => {
    const jlptLevels = new Set<string>();
    const themes = new Set<string>();
    const partsOfSpeech = new Set<string>();
    
    vocabulary.forEach(item => {
      if (item.jlptLevel) jlptLevels.add(item.jlptLevel);
      item.tags.forEach(tag => themes.add(tag));
      item.partOfSpeech.forEach(pos => partsOfSpeech.add(pos));
    });
    
    return {
      jlptLevels: Array.from(jlptLevels).sort(),
      themes: Array.from(themes).sort(),
      partsOfSpeech: Array.from(partsOfSpeech).sort()
    };
  }, [vocabulary]);
  
  return {
    filteredVocab,
    filters,
    updateFilter,
    resetFilters,
    availableFilters
  };
}