'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord } from '@/types';
import { searchWords } from '@/utils/api';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { SearchHistoryManager, SearchHistoryEntry } from '@/utils/searchHistory';

export default function VocabularyPage() {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<JapaneseWord[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [preferredSource, setPreferredSource] = useState<'wanikani' | 'jisho'>('wanikani');

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const history = await SearchHistoryManager.getSearchHistory();
      setSearchHistory(history);
    } catch (err) {
      setError('Failed to load search history');
      console.error('Error loading search history:', err);
    } finally {
      setLoading(false);
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
      const searchResults = await searchWords(term, 30, preferredSource);

      // Show search results
      setCurrentSearchResults(searchResults);
      setCurrentSearchTerm(term);
      setShowSearchResults(true);

      // Add to search history
      await SearchHistoryManager.addSearchEntry(term, searchResults);

      // Refresh search history
      await loadSearchHistory();
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Error searching words:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    try {
      await SearchHistoryManager.deleteSearchEntry(entryId);
      await loadSearchHistory();
    } catch (err) {
      console.error('Error deleting search entry:', err);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await SearchHistoryManager.clearSearchHistory();
      await loadSearchHistory();
      setShowSearchResults(false);
      setCurrentSearchResults([]);
      setCurrentSearchTerm('');
    } catch (err) {
      console.error('Error clearing search history:', err);
    }
  };

  const handleWordClick = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  const handleBackToHistory = () => {
    setShowSearchResults(false);
    setCurrentSearchResults([]);
    setCurrentSearchTerm('');
    setSearchTerm('');
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <PageHeader title={strings.vocab.title} />

      <main className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-6 text-center">
          Search and build your Japanese vocabulary history
        </p>

        {/* Dictionary Source Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4">
            <span className="text-sm font-medium text-muted-foreground">Dictionary Source:</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dictionary-source"
                  value="wanikani"
                  checked={preferredSource === 'wanikani'}
                  onChange={(e) => setPreferredSource(e.target.value as 'wanikani')}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-2"
                />
                <span className="text-sm text-foreground">WaniKani</span>
                <span className="text-xs text-muted-foreground bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                  Curated
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="dictionary-source"
                  value="jisho"
                  checked={preferredSource === 'jisho'}
                  onChange={(e) => setPreferredSource(e.target.value as 'jisho')}
                  className="w-4 h-4 text-primary bg-background border-border focus:ring-primary focus:ring-2"
                />
                <span className="text-sm text-foreground">Jisho</span>
                <span className="text-xs text-muted-foreground bg-green-500/10 px-2 py-1 rounded border border-green-500/20">
                  Comprehensive
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="mb-6">
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
          {/* Source indicator */}
          <div className="mt-2 text-center">
            <span className="text-xs text-muted-foreground">
              Searching with <span className="font-medium text-foreground">{preferredSource === 'wanikani' ? 'WaniKani' : 'Jisho'}</span>
              {preferredSource === 'wanikani' && ' (fallback to Jisho if needed)'}
              {preferredSource === 'jisho' && ' (fallback to WaniKani if needed)'}
            </span>
          </div>
        </form>

        {/* Show Current Search Results */}
        {showSearchResults && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Search Results for "{currentSearchTerm}"
              </h3>
              <button
                onClick={handleBackToHistory}
                className="text-primary hover:text-primary/80 transition-colors text-sm"
              >
                ← Back to History
              </button>
            </div>
            {currentSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {currentSearchResults.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    onClick={() => handleWordClick(word)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No results found for "{currentSearchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {/* Search History */}
        {!showSearchResults && (
          <>
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading search history...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadSearchHistory}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {strings.common.retry}
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="mb-32">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Search History</h2>
                  {searchHistory.length > 0 && (
                    <button
                      onClick={handleClearAllHistory}
                      className="text-red-400 hover:text-red-300 transition-colors text-sm"
                    >
                      Clear All History
                    </button>
                  )}
                </div>

                {searchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No Search History Yet</h3>
                    <p className="text-muted-foreground">Start searching for Japanese words to build your vocabulary history!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {searchHistory.map((entry) => (
                      <SearchHistoryItem
                        key={entry.id}
                        entry={entry}
                        onDelete={handleDeleteHistoryEntry}
                        onWordClick={handleWordClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordModal
          word={selectedWord}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

interface SearchHistoryItemProps {
  entry: SearchHistoryEntry;
  onDelete: (entryId: string) => void;
  onWordClick: (word: JapaneseWord) => void;
}

function SearchHistoryItem({ entry, onDelete, onWordClick }: SearchHistoryItemProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-foreground">"{entry.searchTerm}"</h3>
            <span className="text-xs text-muted-foreground">
              {formatDate(entry.timestamp)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {entry.results.length} result{entry.results.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={() => onDelete(entry.id)}
          className="p-1 text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete this search"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Show first few results */}
      {entry.results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entry.results.slice(0, 6).map((word) => (
            <div
              key={word.id}
              onClick={() => onWordClick(word)}
              className="bg-background/50 border border-border/50 rounded-lg p-3 hover:bg-background/80 transition-colors cursor-pointer"
            >
              <div className="text-lg japanese-text font-medium text-foreground mb-1">
                {word.kanji}
              </div>
              <div className="text-sm japanese-text text-muted-foreground mb-1">
                {word.kana}
              </div>
              <div className="text-xs text-muted-foreground">
                {word.meaning.split(',')[0]}...
              </div>
            </div>
          ))}
          {entry.results.length > 6 && (
            <div className="bg-background/30 border border-border/30 rounded-lg p-3 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                +{entry.results.length - 6} more
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface WordCardProps {
  word: JapaneseWord;
  onClick: () => void;
}

function WordCard({ word, onClick }: WordCardProps) {
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

  const getFrequencyColor = (frequency: number = 0) => {
    if (frequency >= 80) return 'text-green-400';
    if (frequency >= 50) return 'text-yellow-400';
    if (frequency >= 20) return 'text-orange-400';
    return 'text-gray-400';
  };

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 hover:bg-muted transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="text-2xl japanese-text font-medium text-card-foreground mb-1">
            {word.kanji}
          </div>
          <div className="text-lg japanese-text text-muted-foreground mb-1">
            {word.kana}
          </div>
          {/* Show all readings if available */}
          {word.allReadings && word.allReadings.length > 1 && (
            <div className="text-sm japanese-text text-muted-foreground/70 mb-1">
              {word.allReadings.filter(r => r !== word.kana).slice(0, 2).join(', ')}
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {word.romaji}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-block px-2 py-1 text-xs rounded border ${getTypeColor(word.type)}`}>
            {word.type}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {word.jlpt}
          </div>
          {word.frequency && (
            <div className={`text-xs mt-1 ${getFrequencyColor(word.frequency)}`}>
              ★ {word.frequency >= 80 ? 'High' : word.frequency >= 50 ? 'Med' : 'Low'}
            </div>
          )}
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        {word.meaning}
      </div>

      {/* Priority indicator */}
      {word.priority && word.priority !== 'Standard frequency' && (
        <div className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 inline-block">
          {word.priority.split(',')[0]}
        </div>
      )}
    </div>
  );
}

interface WordModalProps {
  word: JapaneseWord;
  onClose: () => void;
}

function WordModal({ word, onClose }: WordModalProps) {
  const router = useRouter();
  const [showExamples, setShowExamples] = useState(false);

  const handlePracticeClick = () => {
    // Store the selected word in sessionStorage to pass it to the practice page
    sessionStorage.setItem('selectedWord', JSON.stringify(word));
    router.push('/practice');
    onClose();
  };

  const handleDrillClick = () => {
    // Store the selected word in sessionStorage to pass it to the drill page
    sessionStorage.setItem('drillWord', JSON.stringify(word));
    router.push('/drill');
    onClose();
  };

  // Check if the word can be conjugated (verbs and adjectives only)
  const canBeConjugated = word.type === 'Ichidan' ||
                         word.type === 'Godan' ||
                         word.type === 'Irregular' ||
                         word.type === 'i-adjective' ||
                         word.type === 'na-adjective';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            Japanese Dictionary
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Main Word Information */}
          <div className="bg-background/50 border border-border rounded-lg p-4">
            <div className="space-y-3">
              {/* Kanji */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Kanji:</span>
                <div className="text-3xl japanese-text font-medium text-card-foreground mt-1">
                  {word.kanji}
                  {word.allKanji && word.allKanji.length > 1 && (
                    <span className="text-lg text-muted-foreground ml-3">
                      ({word.allKanji.filter(k => k !== word.kanji).join(', ')})
                    </span>
                  )}
                </div>
              </div>

              {/* Reading */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Reading:</span>
                <div className="text-xl japanese-text text-card-foreground mt-1">
                  {word.kana} ({word.romaji})
                  {word.katakanaReadings && word.katakanaReadings.length > 0 && (
                    <span className="block text-lg text-muted-foreground mt-1">
                      /{word.katakanaReadings.join(', ')}
                    </span>
                  )}
                  {word.allReadings && word.allReadings.length > 1 && (
                    <span className="block text-sm text-muted-foreground mt-1">
                      Alt: {word.allReadings.filter(r => r !== word.kana).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {/* English */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">English:</span>
                <div className="text-base text-card-foreground mt-1">
                  {word.meaning}
                </div>
              </div>

              {/* Priority */}
              {word.priority && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Priority:</span>
                  <div className="text-sm text-card-foreground mt-1">
                    {word.priority}
                    {word.frequency && (
                      <span className="ml-2 text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
                        Score: {word.frequency}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Part of Speech */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Part of Speech:</span>
                <div className="text-sm text-card-foreground mt-1">
                  {word.type}
                  {word.tags && word.tags.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({word.tags.slice(0, 3).join(', ')})
                    </span>
                  )}
                </div>
              </div>

              {/* JLPT Level */}
              <div>
                <span className="text-sm font-medium text-muted-foreground">JLPT Level:</span>
                <div className="text-sm text-card-foreground mt-1">
                  {word.jlpt}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Meanings */}
          {word.detailedMeaning && word.detailedMeaning.length > 0 && (
            <div className="bg-background/50 border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Detailed Meanings:</h3>
              <div className="space-y-3">
                {word.detailedMeaning.slice(0, 3).map((meaning, index) => (
                  <div key={index} className="text-sm">
                    <div className="text-xs text-muted-foreground mb-1">
                      {meaning.partOfSpeech.join(', ')}
                    </div>
                    <div className="text-card-foreground">
                      {meaning.glosses.join('; ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Examples Section - Collapsible */}
          {word.examples && word.examples.length > 0 && (
            <div className="bg-background/50 border border-border rounded-lg">
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="w-full p-4 text-left flex items-center justify-between hover:bg-background/70 transition-colors rounded-lg"
              >
                <span className="text-sm font-medium text-muted-foreground">
                  Examples ({word.examples.length} sentences)
                </span>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${showExamples ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showExamples && (
                <div className="px-4 pb-4 border-t border-border/50 pt-4">
                  <div className="space-y-3">
                    {word.examples.slice(0, 5).map((example, index) => (
                      <div key={index} className="bg-background/30 rounded p-3">
                        <div className="text-sm japanese-text text-card-foreground mb-1">
                          {example}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Example {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  {word.examples.length > 5 && (
                    <div className="text-xs text-muted-foreground mt-3 text-center">
                      ... and {word.examples.length - 5} more examples
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {canBeConjugated ? (
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePracticeClick}
                className="flex-1 bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                {strings.practice.showConjugations}
              </button>
              <button
                onClick={handleDrillClick}
                className="flex-1 bg-secondary text-secondary-foreground py-3 px-4 rounded-lg hover:bg-secondary/80 transition-colors font-medium"
              >
                {strings.drill.title}
              </button>
            </div>
          ) : (
            <div className="pt-2 text-center">
              <p className="text-sm text-muted-foreground">
                This word type does not have conjugations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
