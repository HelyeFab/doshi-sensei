'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { VocabularyTTSButton } from '@/components/ui/TTSButton';
import { Analytics } from '@/utils/analytics';
import CompanionTrigger from '@/components/CompanionTrigger';
import { SearchHistoryManager, SearchHistoryEntry } from '@/utils/searchHistory';

export default function VocabularyPage() {
  const { user } = useAuth();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<JapaneseWord[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await SearchHistoryManager.getSearchHistory();
      setSearchHistory(history);
    } catch (err) {
      console.error('Error loading search history:', err);
    }
  };

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      setShowSearchResults(false);
      setCurrentSearchResults([]);
      setCurrentSearchTerm('');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      const searchResults = await searchWords(term, 30);

      setCurrentSearchResults(searchResults);
      setCurrentSearchTerm(term);
      setShowSearchResults(true);
      
      // Save to search history
      await SearchHistoryManager.addSearchEntry(term, searchResults);
      await loadSearchHistory(); // Reload history to show the new entry
      
      // Track vocabulary search analytics
      Analytics.trackVocabularySearch(user?.uid, {
        searchTerm: term,
        resultsCount: searchResults.length,
        searchedAt: new Date().toISOString(),
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

  const handleSearchHistoryClick = async (entry: SearchHistoryEntry) => {
    setSearchTerm(entry.searchTerm);
    setCurrentSearchTerm(entry.searchTerm);
    setCurrentSearchResults(entry.results);
    setShowSearchResults(true);
  };

  const handleDeleteSearchEntry = async (entryId: string) => {
    try {
      await SearchHistoryManager.deleteSearchEntry(entryId);
      await loadSearchHistory();
    } catch (error) {
      console.error('Error deleting search entry:', error);
    }
  };

  const handleClearSearchHistory = async () => {
    if (confirm('Are you sure you want to clear all search history?')) {
      try {
        await SearchHistoryManager.clearSearchHistory();
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
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen pb-24 md:pb-8">
        <PageHeader title={strings.vocab.title} />

        <main className="max-w-4xl mx-auto">
          <p className="text-muted-foreground mb-6 text-center">
            Search Japanese words and browse your search history
          </p>

          {/* Search */}
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={strings.vocab.searchPlaceholder}
                className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={searching}
                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center disabled:opacity-50"
              >
                {searching ? (
                  <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <span className="hidden md:inline">Search</span>
                  </>
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
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Search History</h3>
                  <p className="text-muted-foreground">
                    Your search history will appear here as you search for Japanese words.
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
          />
        )}

        {/* Search Loading Overlay */}
        {searching && (
          <SearchLoadingOverlay searchTerm={searchTerm || currentSearchTerm} />
        )}
      </div>
    </>
  );
}

interface SearchLoadingOverlayProps {
  searchTerm: string;
}

function SearchLoadingOverlay({ searchTerm }: SearchLoadingOverlayProps) {
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % strings.vocab.funnyLoadingMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
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
  word: JapaneseWord;
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
      className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer group"
    >
      <div className="flex items-baseline gap-3 mb-2">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{word.kanji}</h3>
        <span className="text-sm text-muted-foreground">{word.kana}</span>
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
}

function WordModal({ word, onClose }: WordModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold text-foreground">{word.kanji}</h2>
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
            <p className="text-lg flex items-center gap-2">
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

          {/* Conjugation Link */}
          {(word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular' || 
            word.type === 'i-adjective' || word.type === 'na-adjective') && (
            <div className="pt-4 border-t border-border">
              <a
                href={`/practice?word=${encodeURIComponent(word.kanji)}`}
                className="block w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-center font-medium"
              >
                Practice Conjugations
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}