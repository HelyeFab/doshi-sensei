'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, StudyList, StudyListType } from '@/types';
import type { ExampleSentence } from '@/types/sentences';
import { searchWords } from '@/utils/api';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import { VocabularyTTSButton } from '@/components/ui/TTSButton';
import { Analytics } from '@/utils/analytics';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SearchHistoryManager2, SearchHistoryEntry } from '@/utils/searchHistoryManager2';
import { StudyListManager } from '@/utils/studyListManager';
import { ExampleSentencesBlock } from '@/components/vocabulary/ExampleSentencesBlock';
import StrokeOrderModal from '@/components/kanji/StrokeOrderModal';
import { MobileAwareContainer } from '@/components/layout/MobileAwareContainer';

// Add JMdict search utility import (to be implemented)
import { searchJMdictWords, loadJMdictData, getDidYouMeanSuggestion, SearchResult } from '@/utils/jmdictLocalSearch';

export default function VocabularyClient() {
  const { user } = useAuth();
  const { subscription, userType } = useSubscription2();
  const strings = useStrings();
  const { track } = useAnalytics();
  const navigation = useNavigation();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);
  const [exampleToSave, setExampleToSave] = useState<ExampleSentence | null>(null);

  // Add state for search source
  const [searchSource, setSearchSource] = useState<'wanikani' | 'jmdict'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('vocab_search_source') as 'wanikani' | 'jmdict') || 'wanikani';
    }
    return 'wanikani';
  });

  // Add state for did you mean modal
  const [showDidYouMeanModal, setShowDidYouMeanModal] = useState(false);
  const [didYouMeanCallback, setDidYouMeanCallback] = useState<(() => void) | null>(null);

  // Add access check hook
  const { checkAccess, recordUsage } = useAccess();
  const [hasAccess, setHasAccess] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{used: number, limit: number | null} | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedStudyList, setSelectedStudyList] = useState<StudyList | null>(null);

  // State for stroke order modal
  const [strokeOrderKanji, setStrokeOrderKanji] = useState<string | null>(null);

  // Add state for tracking which mode we're in
  const [mode, setMode] = useState<'search' | 'history'>('search');

  // Add state for recently clicked history words
  const [recentlyClicked, setRecentlyClicked] = useState<Set<string>>(new Set());

  // Add focus management
  const [keepFocus, setKeepFocus] = useState(false);

  // Add JMdict data loading
  useEffect(() => {
    if (searchSource === 'jmdict') {
      loadJMdictData();
    }
  }, [searchSource]);

  // When search source changes, save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_search_source', searchSource);
    }
  }, [searchSource]);

  // Load search history when component mounts
  useEffect(() => {
    loadSearchHistory();
    // Load study lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);
  }, []);

  const loadSearchHistory = async () => {
    try {
      const manager = new SearchHistoryManager2(user?.uid || null);
      const history = await manager.getHistory();
      setSearchHistory(history);
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const toggleSaveWord = async (word: JapaneseWord, fromSearch: boolean = false) => {
    // Check if the word is already saved
    const lists = StudyListManager.getLists();
    const isAlreadySaved = lists.some(list => 
      list.items.some(item => 
        item.type === 'vocabulary' && 
        item.word === word.word &&
        item.reading === word.reading
      )
    );

    if (isAlreadySaved) {
      // Remove the word from all lists
      lists.forEach(list => {
        const updatedItems = list.items.filter(item => 
          !(item.type === 'vocabulary' && 
            item.word === word.word &&
            item.reading === word.reading)
        );
        
        if (updatedItems.length !== list.items.length) {
          const updatedList = { ...list, items: updatedItems };
          StudyListManager.updateList(updatedList);
        }
      });

      // Reload lists
      const updatedLists = StudyListManager.getLists();
      setStudyLists(updatedLists);

      // Track analytics
      track('vocab_unsave', {
        word: word.word,
        reading: word.reading,
        user_type: userType,
        from_search: fromSearch
      });
    } else {
      // Save word - show modal
      setWordToSave(word);
      setShowSaveModal(true);
      
      // Track analytics
      track('vocab_save_initiated', {
        word: word.word,
        reading: word.reading,
        user_type: userType,
        from_search: fromSearch
      });
    }
  };

  // Handle search term changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setError(null);
    // Clear "did you mean" when user types
    if (value !== didYouMean) {
      setDidYouMean(null);
    }
  };

  // Search for words
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setError(null);
      setSearching(true);
      // Hide results while searching
      setShowSearchResults(false);
      setCurrentSearchResults([]);
      setCurrentSearchTerm(searchTerm);

      // First check access
      const accessResult = await checkAccess('vocabulary_search');
      setHasAccess(accessResult.hasAccess);
      setUsageInfo(accessResult.usage ? {
        used: accessResult.usage.used,
        limit: accessResult.usage.limit
      } : null);

      if (!accessResult.hasAccess) {
        setShowLoginPrompt(true);
        return;
      }

      let searchResults: SearchResult[] = [];
      
      if (searchSource === 'jmdict') {
        // Search using local JMdict data
        const results = await searchJMdictWords(searchTerm);
        searchResults = results.map(result => ({
          word: result.word,
          jishoResult: result
        }));
        
        // Check if we should show "did you mean"
        if (searchResults.length === 0) {
          const suggestion = await getDidYouMeanSuggestion(searchTerm);
          if (suggestion) {
            setDidYouMean(suggestion);
          }
        }
      } else {
        // Use the existing Jisho API search
        const results = await searchWords(searchTerm);
        searchResults = results.map(result => ({
          word: result,
          jishoResult: result
        }));
      }
      
      setCurrentSearchResults(searchResults);
      // Show results
      setShowSearchResults(true);
      
      // Record usage after successful search
      await recordUsage('vocabulary_search');

      // Save to search history after successful search
      const manager = new SearchHistoryManager2(user?.uid || null);
      await manager.addSearchEntry({
        term: searchTerm,
        resultCount: searchResults.length,
        source: searchSource
      });
      
      // Reload history
      loadSearchHistory();
      
      // Track analytics
      track('vocab_search', {
        term: searchTerm,
        results_count: searchResults.length,
        source: searchSource,
        has_subscription: !!subscription,
        user_type: userType
      });

    } catch (err) {
      console.error('Search error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search words';
      setError(errorMessage);
      // Show error but don't clear results
      setShowSearchResults(true);
    } finally {
      setSearching(false);
    }
  };

  // Search on Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !searching && searchTerm.trim()) {
      e.preventDefault();
      handleSearch();
    }
  };

  // Separate word detail viewing
  const handleViewWordFromHistory = async (entry: SearchHistoryEntry) => {
    // Track recently clicked
    setRecentlyClicked(prev => new Set(prev).add(entry.term));

    // First check access for viewing history
    const accessResult = await checkAccess('vocabulary_history_view');
    if (!accessResult.hasAccess) {
      setShowLoginPrompt(true);
      return;
    }

    // First, set the mode to search
    setMode('search');
    
    // Set the search term and update the input
    setSearchTerm(entry.term);
    setCurrentSearchTerm(entry.term);
    
    // Clear any previous errors
    setError(null);
    
    // Set searching state
    setSearching(true);
    
    // Hide results first
    setShowSearchResults(false);
    setCurrentSearchResults([]);
    
    try {
      let searchResults: SearchResult[] = [];
      
      if (searchSource === 'jmdict') {
        // Search using local JMdict data
        const results = await searchJMdictWords(entry.term);
        searchResults = results.map(result => ({
          word: result.word,
          jishoResult: result
        }));
      } else {
        // Use the existing Jisho API search
        const results = await searchWords(entry.term);
        searchResults = results.map(result => ({
          word: result,
          jishoResult: result
        }));
      }
      
      setCurrentSearchResults(searchResults);
      setShowSearchResults(true);
      
      // Record usage after viewing from history
      await recordUsage('vocabulary_history_view');
      
      // Track analytics
      track('vocab_history_click', {
        term: entry.term,
        user_type: userType,
        source: searchSource
      });
      
    } catch (err) {
      console.error('Failed to load word from history:', err);
      setError('Failed to load word details');
      setShowSearchResults(true);
    } finally {
      setSearching(false);
    }
  };

  // Handle saving a word to a list
  const handleSaveWord = (list: StudyList, createNew: boolean = false) => {
    if (!wordToSave) return;

    if (createNew) {
      // This will be handled by the modal
      return;
    }

    // Check if word already exists in the list
    const exists = list.items.some(item => 
      item.type === 'vocabulary' && 
      item.word === wordToSave.word &&
      item.reading === wordToSave.reading
    );

    if (exists) {
      alert(strings.vocabulary?.alreadyInList || 'Word already in this list');
      return;
    }

    // Add word to the selected list
    const newItem: StudyListType = {
      type: 'vocabulary',
      word: wordToSave.word,
      reading: wordToSave.reading,
      meaning: wordToSave.meaning,
      // Store the entire word object for later use
      wordData: wordToSave
    };

    const updatedList = {
      ...list,
      items: [...list.items, newItem]
    };

    StudyListManager.updateList(updatedList);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Close modal
    setShowSaveModal(false);
    setWordToSave(null);

    // Track analytics
    track('vocab_saved', {
      word: wordToSave.word,
      reading: wordToSave.reading,
      list_id: list.id,
      list_name: list.name,
      user_type: userType
    });
  };

  // Handle creating a new list
  const handleCreateNewList = (listName: string) => {
    if (!wordToSave) return;

    const newList = StudyListManager.createList(listName);
    
    // Add the word to the new list
    const newItem: StudyListType = {
      type: 'vocabulary',
      word: wordToSave.word,
      reading: wordToSave.reading,
      meaning: wordToSave.meaning,
      wordData: wordToSave
    };

    const updatedList = {
      ...newList,
      items: [newItem]
    };

    StudyListManager.updateList(updatedList);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Close modal
    setShowSaveModal(false);
    setWordToSave(null);

    // Track analytics
    track('vocab_list_created', {
      list_name: listName,
      initial_word: wordToSave.word,
      user_type: userType
    });
  };

  const handleDeleteHistory = async (timestamp: number) => {
    try {
      const manager = new SearchHistoryManager2(user?.uid || null);
      await manager.deleteEntry(timestamp);
      await loadSearchHistory();
      
      // Track analytics
      track('vocab_history_delete', {
        user_type: userType
      });
    } catch (error) {
      console.error('Failed to delete history entry:', error);
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm(strings.vocabulary?.confirmClearHistory || 'Clear all search history?')) {
      return;
    }

    try {
      const manager = new SearchHistoryManager2(user?.uid || null);
      await manager.clearAllHistory();
      setSearchHistory([]);
      
      // Track analytics
      track('vocab_history_clear_all', {
        user_type: userType
      });
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleShowStrokeOrder = (kanji: string) => {
    setStrokeOrderKanji(kanji);
  };

  const handleDeleteStudyList = (listId: string) => {
    const list = studyLists.find(l => l.id === listId);
    if (!list) return;

    if (!confirm(`Delete "${list.name}" and all its items?`)) {
      return;
    }

    StudyListManager.deleteList(listId);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Clear selection if deleted list was selected
    if (selectedStudyList?.id === listId) {
      setSelectedStudyList(null);
    }

    // Track analytics
    track('vocab_list_deleted', {
      list_name: list.name,
      items_count: list.items.length,
      user_type: userType
    });
  };

  const handleRemoveFromList = (listId: string, itemIndex: number) => {
    const list = studyLists.find(l => l.id === listId);
    if (!list) return;

    const item = list.items[itemIndex];
    if (!item || item.type !== 'vocabulary') return;

    const updatedItems = list.items.filter((_, index) => index !== itemIndex);
    const updatedList = { ...list, items: updatedItems };
    
    StudyListManager.updateList(updatedList);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Track analytics
    track('vocab_removed_from_list', {
      word: item.word,
      list_name: list.name,
      user_type: userType
    });
  };

  const handleDidYouMeanClick = () => {
    if (didYouMean) {
      // Track analytics
      track('vocab_did_you_mean_click', {
        original: searchTerm,
        suggestion: didYouMean,
        user_type: userType
      });

      // Perform search with the suggestion
      setSearchTerm(didYouMean);
      setDidYouMean(null);
      
      // Trigger search after state update
      setTimeout(() => {
        const searchButton = document.querySelector('[data-search-button]') as HTMLButtonElement;
        if (searchButton) {
          searchButton.click();
        }
      }, 0);
    }
  };

  const handleToggleExample = async (example: ExampleSentence) => {
    // Check if the example is already saved
    const lists = StudyListManager.getLists();
    const isAlreadySaved = lists.some(list => 
      list.items.some(item => 
        item.type === 'sentence' && 
        item.japanese === example.japanese &&
        item.english === example.english
      )
    );

    if (isAlreadySaved) {
      // Remove the example from all lists
      lists.forEach(list => {
        const updatedItems = list.items.filter(item => 
          !(item.type === 'sentence' && 
            item.japanese === example.japanese &&
            item.english === example.english)
        );
        
        if (updatedItems.length !== list.items.length) {
          const updatedList = { ...list, items: updatedItems };
          StudyListManager.updateList(updatedList);
        }
      });

      // Reload lists
      const updatedLists = StudyListManager.getLists();
      setStudyLists(updatedLists);

      // Track analytics
      track('vocab_example_unsave', {
        example: example.japanese,
        user_type: userType
      });
    } else {
      // Save example - show modal
      setExampleToSave(example);
      setWordToSave(null); // Clear word to save
      setShowSaveModal(true);
      
      // Track analytics
      track('vocab_example_save_initiated', {
        example: example.japanese,
        user_type: userType
      });
    }
  };

  const handleSaveExample = (list: StudyList, createNew: boolean = false) => {
    if (!exampleToSave) return;

    if (createNew) {
      // This will be handled by the modal
      return;
    }

    // Check if example already exists in the list
    const exists = list.items.some(item => 
      item.type === 'sentence' && 
      item.japanese === exampleToSave.japanese &&
      item.english === exampleToSave.english
    );

    if (exists) {
      alert(strings.vocabulary?.alreadyInList || 'Example already in this list');
      return;
    }

    // Add example to the selected list
    const newItem: StudyListType = {
      type: 'sentence',
      japanese: exampleToSave.japanese,
      english: exampleToSave.english,
      furigana: exampleToSave.furigana,
      audio_url: exampleToSave.audio_url
    };

    const updatedList = {
      ...list,
      items: [...list.items, newItem]
    };

    StudyListManager.updateList(updatedList);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Close modal
    setShowSaveModal(false);
    setExampleToSave(null);

    // Track analytics
    track('vocab_example_saved', {
      example: exampleToSave.japanese,
      list_id: list.id,
      list_name: list.name,
      user_type: userType
    });
  };

  const handleCreateNewListForExample = (listName: string) => {
    if (!exampleToSave) return;

    const newList = StudyListManager.createList(listName);
    
    // Add the example to the new list
    const newItem: StudyListType = {
      type: 'sentence',
      japanese: exampleToSave.japanese,
      english: exampleToSave.english,
      furigana: exampleToSave.furigana,
      audio_url: exampleToSave.audio_url
    };

    const updatedList = {
      ...newList,
      items: [newItem]
    };

    StudyListManager.updateList(updatedList);
    
    // Reload lists
    const lists = StudyListManager.getLists();
    setStudyLists(lists);

    // Close modal
    setShowSaveModal(false);
    setExampleToSave(null);

    // Track analytics
    track('vocab_list_created_for_example', {
      list_name: listName,
      initial_example: exampleToSave.japanese,
      user_type: userType
    });
  };

  // Check if any item in lists
  const isWordSaved = (word: JapaneseWord) => {
    return studyLists.some(list => 
      list.items.some(item => 
        item.type === 'vocabulary' && 
        item.word === word.word &&
        item.reading === word.reading
      )
    );
  };

  const isExampleSaved = (example: ExampleSentence) => {
    return studyLists.some(list => 
      list.items.some(item => 
        item.type === 'sentence' && 
        item.japanese === example.japanese &&
        item.english === example.english
      )
    );
  };

  // Handle navigating to list view
  const handleViewList = (list: StudyList) => {
    setSelectedStudyList(list);
    
    // Track analytics
    track('vocab_list_view', {
      list_name: list.name,
      items_count: list.items.length,
      user_type: userType
    });
  };

  return (
    <>
      <SmartPageHeader 
        title={strings.vocabulary?.title || 'Vocabulary'}
        icon="search"
        description={strings.vocabulary?.description || 'Search and save vocabulary'}
      />

      <MobileAwareContainer className="py-4 px-4 space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('search')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'search'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {strings.vocabulary?.searchTab || 'Search'}
          </button>
          <button
            onClick={() => setMode('history')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {strings.vocabulary?.historyTab || 'History'} 
            {searchHistory.length > 0 && (
              <span className="ml-1 text-sm">({searchHistory.length})</span>
            )}
          </button>
        </div>

        {/* Search Mode */}
        {mode === 'search' && (
          <>
            {/* Search Source Toggle */}
            <div className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>{strings.vocabulary?.searchSource || 'Search source'}:</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchSource('wanikani')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchSource === 'wanikani'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">🦀</span>
                    <span>WaniKani/Jisho</span>
                  </div>
                </button>
                <button
                  onClick={() => setSearchSource('jmdict')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    searchSource === 'jmdict'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">📖</span>
                    <span>{strings.vocabulary?.jmdictOffline || 'JMdict (Offline)'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder={strings.vocabulary?.searchPlaceholder || 'Search Japanese or English...'}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={searching}
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                  data-search-button
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {searching ? strings.vocabulary?.searching || 'Searching...' : strings.vocabulary?.search || 'Search'}
                </button>
              </div>

              {/* Did you mean suggestion */}
              {didYouMean && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {strings.vocabulary?.didYouMean || 'Did you mean'}: 
                  </span>
                  <button
                    onClick={handleDidYouMeanClick}
                    className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                  >
                    {didYouMean}
                  </button>
                  ?
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Access info */}
              {usageInfo && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {strings.vocabulary?.searchesUsed || 'Searches used'}: {usageInfo.used}
                  {usageInfo.limit && ` / ${usageInfo.limit}`}
                </div>
              )}
            </div>

            {/* Study Lists */}
            {studyLists.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {strings.vocabulary?.myLists || 'My Study Lists'}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {studyLists.length} {strings.vocabulary?.lists || 'lists'}
                  </span>
                </div>
                <div className="space-y-2">
                  {studyLists.map(list => {
                    const vocabCount = list.items.filter(item => item.type === 'vocabulary').length;
                    const sentenceCount = list.items.filter(item => item.type === 'sentence').length;
                    
                    return (
                      <div 
                        key={list.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <button
                          onClick={() => handleViewList(list)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {list.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {vocabCount > 0 && `${vocabCount} ${strings.vocabulary?.words || 'words'}`}
                            {vocabCount > 0 && sentenceCount > 0 && ', '}
                            {sentenceCount > 0 && `${sentenceCount} ${strings.vocabulary?.sentences || 'sentences'}`}
                            {list.items.length === 0 && strings.vocabulary?.emptyList || 'Empty'}
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteStudyList(list.id)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title={strings.vocabulary?.deleteList || 'Delete list'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Results */}
            {showSearchResults && currentSearchResults.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {strings.vocabulary?.results || 'Results'} ({currentSearchResults.length})
                </h3>
                
                {currentSearchResults.map((result, index) => {
                  const word = result.jishoResult;
                  const saved = isWordSaved(word);
                  
                  return (
                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                      <div className="space-y-2">
                        {/* Word header with save button */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {word.word && (
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                  {word.word}
                                </span>
                              )}
                              {word.reading && word.reading !== word.word && (
                                <span className="text-xl text-gray-600 dark:text-gray-400">
                                  {word.reading}
                                </span>
                              )}
                              {word.word && <VocabularyTTSButton text={word.word} />}
                            </div>
                          </div>
                          
                          {/* Save button */}
                          <button
                            onClick={() => toggleSaveWord(word, true)}
                            className={`ml-2 p-2 rounded transition-colors ${
                              saved 
                                ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' 
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                            }`}
                            title={saved ? strings.vocabulary?.unsave || 'Unsave' : strings.vocabulary?.save || 'Save'}
                          >
                            <svg className="w-6 h-6" fill={saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Meanings */}
                        <div className="text-gray-700 dark:text-gray-300">
                          {word.meaning}
                        </div>
                        
                        {/* Tags */}
                        {word.tags && word.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {word.tags.map((tag, tagIndex) => (
                              <span 
                                key={tagIndex}
                                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Kanji details button */}
                        {word.word && Array.from(word.word).some(char => char.match(/[\u4e00-\u9faf]/)) && (
                          <button
                            onClick={() => {
                              const kanji = Array.from(word.word || '').find(char => char.match(/[\u4e00-\u9faf]/));
                              if (kanji) handleShowStrokeOrder(kanji);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {strings.vocabulary?.viewStrokeOrder || 'View Stroke Order'}
                          </button>
                        )}

                        {/* Example sentences */}
                        {word.sentences && word.sentences.length > 0 && (
                          <ExampleSentencesBlock
                            sentences={word.sentences}
                            studyLists={studyLists}
                            onToggleSave={handleToggleExample}
                            isExampleSaved={isExampleSaved}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No results message */}
            {showSearchResults && currentSearchResults.length === 0 && !searching && currentSearchTerm && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {strings.vocabulary?.noResults || 'No results found for'} "{currentSearchTerm}"
                </p>
                {didYouMean && (
                  <p className="mt-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {strings.vocabulary?.didYouMean || 'Did you mean'}: 
                    </span>
                    <button
                      onClick={handleDidYouMeanClick}
                      className="ml-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* History Mode */}
        {mode === 'history' && (
          <div className="space-y-4">
            {searchHistory.length > 0 ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {strings.vocabulary?.recentSearches || 'Recent Searches'}
                  </h3>
                  <button
                    onClick={handleClearAllHistory}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    {strings.vocabulary?.clearAll || 'Clear All'}
                  </button>
                </div>
                
                {searchHistory.map((entry) => {
                  const isRecent = recentlyClicked.has(entry.term);
                  
                  return (
                    <div 
                      key={entry.timestamp}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md hover:shadow-lg transition-all ${
                        isRecent ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => handleViewWordFromHistory(entry)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {entry.term}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.resultCount} {strings.vocabulary?.results || 'results'} • 
                            {entry.source === 'jmdict' ? ' JMdict' : ' WaniKani/Jisho'} • 
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </div>
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(entry.timestamp)}
                          className="ml-2 p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title={strings.vocabulary?.deleteEntry || 'Delete entry'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-md text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {strings.vocabulary?.noHistory || 'No search history yet'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Study List View Modal */}
        {selectedStudyList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedStudyList.name}
                  </h2>
                  <button
                    onClick={() => setSelectedStudyList(null)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {selectedStudyList.items.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                    {strings.vocabulary?.emptyListMessage || 'This list is empty'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedStudyList.items.map((item, index) => (
                      <div 
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 flex items-start justify-between"
                      >
                        {item.type === 'vocabulary' ? (
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{item.word}</span>
                              {item.reading && item.reading !== item.word && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  {item.reading}
                                </span>
                              )}
                              {item.word && <VocabularyTTSButton text={item.word} />}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                              {item.meaning}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="font-medium">{item.japanese}</div>
                            {item.furigana && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {item.furigana}
                              </div>
                            )}
                            <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {item.english}
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={() => handleRemoveFromList(selectedStudyList.id, index)}
                          className="ml-2 p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                          title={strings.vocabulary?.removeFromList || 'Remove from list'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    navigation.navigate(`/drill/flashcards?list=${selectedStudyList.id}`);
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={selectedStudyList.items.length === 0}
                >
                  {strings.vocabulary?.practiceWithFlashcards || 'Practice with Flashcards'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Modal */}
        {showSaveModal && (wordToSave || exampleToSave) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {wordToSave 
                  ? strings.vocabulary?.saveToList || 'Save to Study List'
                  : strings.vocabulary?.saveExampleToList || 'Save Example to Study List'
                }
              </h3>
              
              {/* Show what's being saved */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                {wordToSave ? (
                  <>
                    <div className="font-bold">{wordToSave.word} {wordToSave.reading && wordToSave.reading !== wordToSave.word && `(${wordToSave.reading})`}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{wordToSave.meaning}</div>
                  </>
                ) : exampleToSave ? (
                  <>
                    <div className="font-medium">{exampleToSave.japanese}</div>
                    {exampleToSave.furigana && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{exampleToSave.furigana}</div>
                    )}
                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{exampleToSave.english}</div>
                  </>
                ) : null}
              </div>
              
              {studyLists.length > 0 ? (
                <>
                  <div className="space-y-2 mb-4">
                    {studyLists.map(list => (
                      <button
                        key={list.id}
                        onClick={() => wordToSave ? handleSaveWord(list) : handleSaveExample(list)}
                        className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        <div className="font-medium">{list.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {list.items.length} {strings.vocabulary?.items || 'items'}
                        </div>
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => wordToSave ? handleSaveWord(studyLists[0], true) : handleSaveExample(studyLists[0], true)}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mb-2"
                  >
                    {strings.vocabulary?.createNewList || 'Create New List'}
                  </button>
                </>
              ) : (
                <CreateNewListForm
                  onSubmit={wordToSave ? handleCreateNewList : handleCreateNewListForExample}
                  onCancel={() => {
                    setShowSaveModal(false);
                    setWordToSave(null);
                    setExampleToSave(null);
                  }}
                />
              )}
              
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setWordToSave(null);
                  setExampleToSave(null);
                }}
                className="w-full py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                {strings.vocabulary?.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Stroke Order Modal */}
        {strokeOrderKanji && (
          <StrokeOrderModal
            kanji={strokeOrderKanji}
            onClose={() => setStrokeOrderKanji(null)}
          />
        )}

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {strings.vocabulary?.loginRequired || 'Login Required'}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {strings.vocabulary?.loginMessage || 'Please login to use the vocabulary search feature.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigation.navigate('/login')}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {strings.vocabulary?.login || 'Login'}
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {strings.vocabulary?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </MobileAwareContainer>
    </>
  );
}

// Helper component for creating new lists
function CreateNewListForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [listName, setListName] = useState('');
  const strings = useStrings();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listName.trim()) {
      onSubmit(listName.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={listName}
        onChange={(e) => setListName(e.target.value)}
        placeholder={strings.vocabulary?.listNamePlaceholder || 'Enter list name...'}
        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!listName.trim()}
          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {strings.vocabulary?.create || 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
        >
          {strings.vocabulary?.cancel || 'Cancel'}
        </button>
      </div>
    </form>
  );
}