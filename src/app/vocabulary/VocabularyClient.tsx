'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, StudyList, StudyListType } from '@/types';
import type { ExampleSentence } from '@/types/sentences';
import { searchWords } from '@/utils/api';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
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
import { SaveWordModal } from '@/components/drill/SaveWordModal';

// Add JMdict search utility import (to be implemented)
import { searchJMdictWords, loadJMdictData, getDidYouMeanSuggestion, SearchResult } from '@/utils/jmdictLocalSearch';

// Helper to map UserType to the expected type for SearchHistoryManager2
const mapUserType = (type: string): 'guest' | 'free' | 'monthly' | 'yearly' => {
  return type as 'guest' | 'free' | 'monthly' | 'yearly';
};

export default function VocabularyClient() {
  const { user } = useAuth();
  const { subscription, userType } = useSubscription2();
  const strings = useStrings();
  const { track } = useAnalytics();
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

  // Load JMdict data on mount if needed
  useEffect(() => {
    if (searchSource === 'jmdict') {
      loadJMdictData();
    }
  }, [searchSource]);

  // Persist search source
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_search_source', searchSource);
    }
  }, [searchSource]);

  useEffect(() => {
    loadSearchHistory();
    // Migrate old history on first load
    SearchHistoryManager2.migrateFromOldHistory(user, mapUserType(userType));
  }, [user, userType]);

  // Reload search history when user changes
  useEffect(() => {
    loadSearchHistory();
  }, [user?.uid]);

  const loadSearchHistory = async () => {
    try {
      const history = await SearchHistoryManager2.getSearchHistory(user, mapUserType(userType));
      // Ensure history is always an array
      setSearchHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Error loading search history:', err);
      setSearchHistory([]); // Set empty array on error
    }
  };

  // Update handleSearch to use selected source
  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setShowSearchResults(false);
      setCurrentSearchResults([]);
      setCurrentSearchTerm('');
      return;
    }

    try {
      setError(null);
      setDidYouMean(null);

      let searchResults: SearchResult[] = [];
      if (searchSource === 'wanikani') {
        // Only show loading for WaniKani API searches
        setSearching(true);
        const results = await searchWords(term, 30);
        searchResults = results as SearchResult[];
      } else {
        // JMdict is local, no loading needed
        searchResults = await searchJMdictWords(term, 30);
        // Check for "did you mean" suggestion if using JMdict
        const suggestion = getDidYouMeanSuggestion(term);
        if (suggestion && searchResults.length > 0) {
          // Only show suggestion if we didn't find the exact common word
          const hasExactCommon = searchResults.some(r => r.isCommon && r.isExactMatch);
          if (!hasExactCommon) {
            setDidYouMean(suggestion);
          }
        }
      }

      setCurrentSearchResults(searchResults);
      setCurrentSearchTerm(term);
      setShowSearchResults(true);

      // Save to search history
      await SearchHistoryManager2.addSearchEntry(term, searchResults, user, mapUserType(userType), searchSource);
      await loadSearchHistory(); // Reload history to show the new entry

      // Track vocabulary search analytics
      Analytics.trackVocabularySearch(user?.uid, {
        searchTerm: term,
        resultsCount: searchResults.length,
        searchedAt: new Date().toISOString(),
      });
      
      // Track in new analytics system
      track('word_search', { 
        searchTerm: term, 
        resultsCount: searchResults.length,
        source: searchSource 
      });

    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Error searching words:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleWordClick = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  const handleSaveWord = (word: JapaneseWord) => {
    setWordToSave(word);
    setExampleToSave(null);
    setShowSaveModal(true);
    setSelectedWord(null); // Close the word detail modal
  };

  const handleSaveExample = (example: ExampleSentence) => {
    // Convert example to a word-like object for the save modal
    const exampleAsWord: JapaneseWord = {
      id: example.id,
      kanji: example.japanese,
      kana: '',
      romaji: '',
      meaning: example.english || '',
      type: 'other',
      jlpt: 'N5',
      tags: ['sentence', 'example']
    };

    setWordToSave(exampleAsWord);
    setExampleToSave(example);
    setShowSaveModal(true);
  };

  const handleSaveWordToLists = async (word: JapaneseWord, listIds: string[], newListName?: string) => {
    try {
      const listsToSaveTo = [...listIds];

      // Check if we're saving an example sentence
      if (exampleToSave) {
        // Create sentence item
        const sentenceItem = {
          id: exampleToSave.id,
          text: exampleToSave.japanese,
          furigana: '',
          translation: exampleToSave.english || '',
          source: {
            type: 'tatoeba' as const,
            id: exampleToSave.id,
            title: 'Tatoeba Example',
            url: `https://tatoeba.org/en/sentences/show/${exampleToSave.id}`
          }
        };

        // Create new list if specified
        if (newListName?.trim()) {
          const newList = await StudyListManager.createStudyList(
            newListName,
            'sentence',
            `Created for saving example sentences`,
            user,
            subscription?.status
          );
          listsToSaveTo.push(newList.id);
        }

        // Save sentence to selected lists
        await StudyListManager.addItemToLists(
          sentenceItem,
          'sentence',
          listsToSaveTo,
          user,
          subscription?.status
        );
      } else {
        // Create new list if specified
        if (newListName?.trim()) {
          const newList = await StudyListManager.createStudyList(
            newListName,
            'flashcard', // Default to flashcard for words
            `Created for saving ${word.kanji}`,
            user,
            subscription?.status
          );
          listsToSaveTo.push(newList.id);
        }

        // Save word to selected lists
        await StudyListManager.addItemToLists(
          word,
          'word',
          listsToSaveTo,
          user,
          subscription?.status
        );
      }

      setShowSaveModal(false);
      setWordToSave(null);
      setExampleToSave(null);

      // Show success message (optional)

    } catch (error) {
      console.error('Error saving to lists:', error);
    }
  };

  const handleSearchHistoryClick = async (entry: SearchHistoryEntry) => {
    setSearchTerm(entry.searchTerm);
    setCurrentSearchTerm(entry.searchTerm);
    setCurrentSearchResults(entry.results);
    setShowSearchResults(true);
  };

  const handleDeleteSearchEntry = async (entryId: string) => {
    try {
      await SearchHistoryManager2.deleteSearchEntry(entryId, user, mapUserType(userType));
      await loadSearchHistory();
    } catch (error) {
      console.error('Error deleting search entry:', error);
    }
  };

  const handleClearSearchHistory = async () => {
    if (confirm('Are you sure you want to clear all search history?')) {
      try {
        await SearchHistoryManager2.clearSearchHistory(user, mapUserType(userType));
        setSearchHistory([]);
      } catch (error) {
        console.error('Error clearing search history:', error);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Vocabulary" />
      
      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground text-center mt-2">
          {strings.vocab.searchPlaceholder}
        </p>

        <main className="max-w-4xl mx-auto">
          <p className="text-muted-foreground mb-6 text-center">
            Search Japanese words and browse your search history
          </p>

                    {/* Search Source Toggle - moved here */}
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex rounded-lg overflow-hidden border border-border bg-muted mb-3">
              <button
                className={`px-4 py-2 font-medium transition-colors ${searchSource === 'wanikani' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-muted-foreground hover:bg-accent/30'}`}
                onClick={() => setSearchSource('wanikani')}
                aria-pressed={searchSource === 'wanikani'}
              >
                WaniKani
              </button>
              <button
                className={`px-4 py-2 font-medium transition-colors ${searchSource === 'jmdict' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'text-muted-foreground hover:bg-accent/30'}`}
                onClick={() => setSearchSource('jmdict')}
                aria-pressed={searchSource === 'jmdict'}
              >
                JMdict
              </button>
            </div>

            {/* Dictionary differences dropdown */}
            <details className="group">
              <summary className="text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1 justify-center transition-colors">
                <span>What's the difference?</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="text-center max-w-md mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-purple-600">WaniKani:</span> Curated vocabulary from JLPT levels, optimized for learners
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-purple-600">JMdict:</span> Comprehensive dictionary with 170,000+ entries, includes rare words
                </p>
              </div>
            </details>
          </div>

          {/* Search */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={strings.vocab.searchPlaceholder}
                className="flex-1 w-full px-4 py-3 pr-12 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={searching}
                className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                style={{ lineHeight: 0 }}
                aria-label="Search"
              >
                {searching ? (
                  <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                ) : (
                  <img src="/flat-icons/root-icons/magnifying-glass.svg" alt="Search" className="w-6 h-6" />
                )}
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Show Current Search Results */}
          {showSearchResults ? (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Search Results for "{currentSearchTerm}"
                </h3>
                <button
                  onClick={() => {
                    setShowSearchResults(false);
                    setCurrentSearchResults([]);
                    setCurrentSearchTerm('');
                    setSearchTerm('');
                  }}
                  className="text-primary hover:text-primary/80 transition-colors text-sm"
                >
                  ← Back to History
                </button>
              </div>

              {/* Did you mean suggestion */}
              {didYouMean && searchSource === 'jmdict' && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Did you mean: </span>
                    <button
                      onClick={() => {
                        const [kanji] = didYouMean.split(' ');
                        setSearchTerm(kanji);
                        handleSearch(kanji);
                      }}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      {didYouMean}
                    </button>
                    ?
                  </p>
                </div>
              )}

              {currentSearchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSearchResults.map((word) => (
                    <WordCard
                      key={word.id}
                      word={word}
                      onWordClick={() => handleWordClick(word)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No results found for "{currentSearchTerm}"</p>
                </div>
              )}
            </div>
          ) : (
            // Search History
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Search History</h2>
                {searchHistory.length > 0 && (
                  <button
                    onClick={handleClearSearchHistory}
                    className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {searchHistory.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">
                    {strings.vocab.noResults}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {strings.vocab.searchPlaceholder}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
                      onClick={() => handleSearchHistoryClick(entry)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-3 mb-1">
                            <h3 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                              {entry.searchTerm}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              {entry.results.length} results
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{formatDate(entry.timestamp)}</span>
                            {entry.results.length > 0 && (
                              <span className="text-xs">
                                {entry.results.slice(0, 3).map(w => w.word).join(', ')}
                                {entry.results.length > 3 && '...'}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSearchEntry(entry.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
                          title="Delete entry"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Word Detail Modal */}
        {selectedWord && (
          <WordModal
            word={selectedWord}
            onClose={handleCloseModal}
            onSave={handleSaveWord}
            onSaveExample={handleSaveExample}
          />
        )}

        {/* Save Word Modal */}
        {showSaveModal && wordToSave && (
          <SaveWordModal
            word={wordToSave}
            isSentence={!!exampleToSave}
            onClose={() => {
              setShowSaveModal(false);
              setWordToSave(null);
              setExampleToSave(null);
            }}
            onSaveToLists={handleSaveWordToLists}
          />
        )}

        {/* Search Loading Overlay */}
        {searching && (
          <SearchLoadingOverlay searchTerm={searchTerm || currentSearchTerm} />
        )}
      </MobileAwareContainer>
    </div>
  );
}

interface SearchLoadingOverlayProps {
  searchTerm: string;
}

function SearchLoadingOverlay({ searchTerm }: SearchLoadingOverlayProps) {
  const strings = useStrings();
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % strings.vocab.funnyLoadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-8 flex flex-col items-center gap-4 shadow-lg max-w-md mx-4">
        <div className="relative">
          <div className="animate-spin w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/10 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium text-foreground mb-1">{strings.vocab.searching}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Looking up "{searchTerm}"
          </p>
          <div className="text-xs text-primary/80 italic min-h-[2.5rem] flex items-center justify-center">
            {strings.vocab.funnyLoadingMessages[currentMessage]}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WordCardProps {
  word: SearchResult;
  onWordClick: () => void;
}

function WordCard({ word, onWordClick }: WordCardProps) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Ichidan':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Godan':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Irregular':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'i-adjective':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'na-adjective':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div
      onClick={onWordClick}
      className={`bg-card border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group ${
        word.isCommon ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
      }`}
    >
      <div className="flex items-baseline gap-3 mb-2">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors japanese-text font-ja" data-quickcontext="true">{word.kanji}</h3>
        <span className="text-sm text-muted-foreground japanese-text font-ja" data-quickcontext="true">{word.kana}</span>
        {word.isCommon && (
          <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
            Common
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{word.meaning}</p>
      <div className="flex items-center justify-between gap-2">
        {word.type && (
          <span className={`inline-block px-2 py-1 text-xs rounded-full border ${getTypeColor(word.type)}`}>
            {word.type}
          </span>
        )}
        <VocabularyTTSButton word={word} size="sm" />
      </div>
    </div>
  );
}

interface WordModalProps {
  word: JapaneseWord;
  onClose: () => void;
  onSave: (word: JapaneseWord) => void;
  onSaveExample?: (example: ExampleSentence) => void;
}

function WordModal({ word, onClose, onSave, onSaveExample }: WordModalProps) {
  const { checkAndTrack } = useAccess();
  const [showStrokeOrder, setShowStrokeOrder] = useState(false);
  const [strokeOrderKanji, setStrokeOrderKanji] = useState<string>('');

  const handleStrokeOrderClick = async () => {
    const canAccess = await checkAndTrack('kanji_stroke_order');
    if (canAccess) {
      // Extract all kanji characters from the word
      const kanjiChars = (word.kanji || word.kana).match(/[\u4e00-\u9faf]/g) || [];
      setStrokeOrderKanji(kanjiChars.join(''));
      setShowStrokeOrder(true);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
      <div
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground japanese-text font-ja" data-quickcontext="true">{word.kanji}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Reading</p>
            <p className="text-lg flex items-center gap-2 japanese-text font-ja" data-quickcontext="true">
              {word.kana}
              <VocabularyTTSButton word={word} />
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Meaning</p>
            <p className="text-lg">{word.meaning}</p>
          </div>

          {word.type && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Type</p>
              <p className="text-lg">{word.type}</p>
            </div>
          )}

          {/* Example Sentences */}
          {word.exampleSentences && word.exampleSentences.length > 0 && (
            <ExampleSentencesBlock
              word={word.kanji || word.kana}
              examples={word.exampleSentences}
              onSaveExample={onSaveExample}
            />
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border space-y-2">
            <button
              onClick={() => onSave(word)}
              className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
            >
              Save to Lists
            </button>

            {/* Stroke Order Button - only show for kanji */}
            {word.kanji && /[\u4e00-\u9faf]/.test(word.kanji) && (
              <button
                onClick={handleStrokeOrderClick}
                className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  View Stroke Order
                </span>
              </button>
            )}
          </div>

          {/* Conjugation Link */}
          {(word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular' ||
            word.type === 'i-adjective' || word.type === 'na-adjective') && (
            <div className="pt-2">
              <a
                href={`/practice?word=${encodeURIComponent(word.kanji)}`}
                className="block w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-center font-medium"
              >
                Practice Conjugations
              </a>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Stroke Order Modal */}
    {showStrokeOrder && strokeOrderKanji && (
      <StrokeOrderModal
        isOpen={showStrokeOrder}
        onClose={() => setShowStrokeOrder(false)}
        kanji={strokeOrderKanji}
        word={word.kanji}
        meaning={word.meaning}
      />
    )}
    </>
  );
}