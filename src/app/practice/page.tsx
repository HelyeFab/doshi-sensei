'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, ConjugationForms, WordList } from '@/types';
import { searchWords, getCommonWordsForPractice } from '@/utils/api';
import { ConjugationEngine } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import WordListManager from '@/utils/wordLists';
import StatsManager from '@/utils/stats';

export default function PracticePage() {
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [wordTypeFilter, setWordTypeFilter] = useState<'all' | 'verbs' | 'adjectives'>('all');

  useEffect(() => {
    loadInitialWords();
  }, []);

  const loadInitialWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const words = await getCommonWordsForPractice();
      setWords(words);
    } catch (err) {
      setError(strings.errors.loadError);
      console.error('Error loading words:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadInitialWords();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const searchResults = await searchWords(searchTerm, 50);
      setWords(searchResults);
    } catch (err) {
      setError(strings.errors.networkError);
      console.error('Error searching words:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWordSelect = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleBackToList = () => {
    setSelectedWord(null);
  };

  // Filter words based on type
  const filteredWords = words.filter(word => {
    if (wordTypeFilter === 'verbs') {
      return word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular';
    } else if (wordTypeFilter === 'adjectives') {
      return word.type === 'i-adjective' || word.type === 'na-adjective';
    }
    return true; // 'all' shows everything
  });

  if (selectedWord) {
    return <WordPractice word={selectedWord} onBack={handleBackToList} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <PageHeader title={strings.practice.title} />

      <main className="max-w-4xl mx-auto mb-32 md:mb-8 pb-safe">
        <p className="text-muted-foreground mb-8 text-center">
          {strings.practice.selectWord}
        </p>

        <WordSelector
          words={filteredWords}
          loading={loading}
          error={error}
          searchTerm={searchTerm}
          wordTypeFilter={wordTypeFilter}
          onSearchTermChange={setSearchTerm}
          onWordTypeFilterChange={setWordTypeFilter}
          onSearch={handleSearch}
          onSelectWord={handleWordSelect}
          onRetry={loadInitialWords}
        />
      </main>
    </div>
  );
}

// Word Selector Component
interface WordSelectorProps {
  words: JapaneseWord[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  wordTypeFilter: 'all' | 'verbs' | 'adjectives';
  onSearchTermChange: (term: string) => void;
  onWordTypeFilterChange: (filter: 'all' | 'verbs' | 'adjectives') => void;
  onSearch: () => void;
  onSelectWord: (word: JapaneseWord) => void;
  onRetry: () => void;
}

function WordSelector({
  words,
  loading,
  error,
  searchTerm,
  wordTypeFilter,
  onSearchTermChange,
  onWordTypeFilterChange,
  onSearch,
  onSelectWord,
  onRetry
}: WordSelectorProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            placeholder={strings.vocab.searchPlaceholder}
            className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center justify-center"
          >
            <svg className="w-5 h-5 md:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span className="hidden md:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Word Type Filter */}
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-3">Filter by Word Type:</div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'verbs', 'adjectives'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onWordTypeFilterChange(filter)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                wordTypeFilter === filter
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-input hover:bg-muted'
              }`}
            >
              {filter === 'all' ? 'All Types' :
               filter === 'verbs' ? 'Verbs Only' : 'Adjectives Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">{strings.common.loading}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {strings.common.retry}
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <div>
          <div className="text-sm text-muted-foreground mb-4">
            Found {words.length} {wordTypeFilter === 'all' ? 'words' : wordTypeFilter}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => (
              <WordCard key={word.id} word={word} onSelect={onSelectWord} />
            ))}
          </div>

          {words.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{strings.vocab.noResults}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Word Card Component
interface WordCardProps {
  word: JapaneseWord;
  onSelect: (word: JapaneseWord) => void;
}

function WordCard({ word, onSelect }: WordCardProps) {
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadWordLists();
  }, []);

  const loadWordLists = async () => {
    try {
      const lists = await WordListManager.getAllWordLists();
      setWordLists(lists);
    } catch (err) {
      console.error('Error loading word lists:', err);
    }
  };

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

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowSaveModal(true);
  };

  const handleListToggle = (listId: string) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;

    try {
      await WordListManager.createWordList(newListName.trim());
      setNewListName('');
      await loadWordLists(); // Reload lists
    } catch (err) {
      console.error('Error creating list:', err);
    }
  };

  const handleSaveToLists = async () => {
    if (selectedLists.length === 0) return;

    try {
      setIsSaving(true);

      // Add word to selected lists
      await WordListManager.saveWordToLists(word, selectedLists);

      setShowSaveModal(false);
      setSelectedLists([]);

      // Show success message briefly
      console.log(`Word "${word.kanji}" saved to ${selectedLists.length} list(s)`);
    } catch (err) {
      console.error('Error saving word to lists:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 hover:bg-muted transition-colors cursor-pointer group relative">
        {/* Save Button */}
        <button
          onClick={handleSaveClick}
          className="absolute top-3 right-3 p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Save to List"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        </button>

        <div onClick={() => onSelect(word)}>
          <div className="flex items-start justify-between mb-3 pr-12">
            <div>
              <div className="text-2xl japanese-text font-medium text-card-foreground mb-1">
                {word.kanji}
              </div>
              <div className="text-lg japanese-text text-muted-foreground">
                {word.kana}
              </div>
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
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {word.meaning}
          </div>
        </div>
      </div>

      {/* Save to List Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-card-foreground">Save to List</h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-lg japanese-text font-medium text-foreground">{word.kanji}</div>
              <div className="text-sm text-muted-foreground">{word.meaning}</div>
            </div>

            {/* Create New List */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Create new list..."
                  className="flex-1 px-3 py-2 text-sm rounded border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateNewList()}
                />
                <button
                  onClick={handleCreateNewList}
                  disabled={!newListName.trim()}
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </div>

            {/* Existing Lists */}
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2">Select lists:</div>
              {wordLists.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {wordLists.map((list) => (
                    <label key={list.id} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={selectedLists.includes(list.id)}
                        onChange={() => handleListToggle(list.id)}
                        className="rounded border-border"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: list.color }}
                        ></div>
                        <span className="text-sm text-foreground">{list.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({list.wordIds.length} words)
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 border border-border rounded-lg text-center">
                  No lists found. Create your first list above.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToLists}
                disabled={selectedLists.length === 0 || isSaving}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : `Save to ${selectedLists.length} list${selectedLists.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Word Practice Component
interface WordPracticeProps {
  word: JapaneseWord;
  onBack: () => void;
}

function WordPractice({ word, onBack }: WordPracticeProps) {
  const [showRules, setShowRules] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);

  const conjugations = ConjugationEngine.conjugate(word);

  // Track word study when component mounts
  useEffect(() => {
    const recordWordStudy = async () => {
      try {
        await StatsManager.recordWordStudied(word.id);
        console.log(`Word study recorded: ${word.kanji}`);
      } catch (err) {
        console.error('Error recording word study:', err);
      }
    };

    recordWordStudy();
  }, [word.id]);

  const getFormDisplayName = (form: keyof ConjugationForms): string => {
    return strings.conjugation.forms[form] || form;
  };

  const handleDrill = () => {
    // Store the word in sessionStorage to be picked up by the drill page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('drillWord', JSON.stringify(word));
      window.location.href = '/drill';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6"></polyline>
          </svg>
          {strings.common.back}
        </button>

        <button
          onClick={handleDrill}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5,3 19,12 5,21 5,3"></polygon>
          </svg>
          {strings.drill.title}
        </button>
      </div>

      {/* Word Info */}
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl japanese-text font-medium text-foreground mb-4">
            {word.kanji}
          </div>
          <div className="text-2xl japanese-text text-muted-foreground mb-2">
            {word.kana}
          </div>
          <div className="text-lg text-muted-foreground mb-4">
            {word.romaji}
          </div>
          <div className="text-xl text-foreground mb-6">
            {word.meaning}
          </div>
          <div className="flex items-center justify-center gap-4">
            <span className={`px-3 py-1 rounded-lg border text-sm ${
              word.type === 'Ichidan' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
              word.type === 'Godan' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
              word.type === 'Irregular' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
              word.type === 'i-adjective' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
              word.type === 'na-adjective' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {word.type}
            </span>
            <span className="px-3 py-1 rounded-lg border bg-secondary/10 text-secondary border-secondary/20 text-sm">
              {word.jlpt}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setShowRules(!showRules)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {showRules ? strings.drill.hideRules : strings.drill.showRules}
          </button>
          <button
            onClick={() => setShowFurigana(!showFurigana)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {showFurigana ? "Hide Furigana" : "Show Furigana"}
          </button>
        </div>

        {/* Rules */}
        {showRules && (
          <div className="bg-card border border-border rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">
              {strings.verbTypes[word.type.toLowerCase().replace('-', '') as keyof typeof strings.verbTypes]} Rules
            </h3>
            <div className="text-muted-foreground">
              {/* Add conjugation rules here based on word type */}
              <p>Conjugation rules for {word.type} will be displayed here.</p>
            </div>
          </div>
        )}

        {/* Conjugations */}
        <div className="bg-card border border-border rounded-lg p-6 mb-20">
          <h3 className="text-xl font-semibold mb-6 text-card-foreground">
            Conjugation Forms
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(conjugations).map(([form, conjugation], index) => {
              if (!conjugation) return null;

              return (
                <div
                  key={form}
                  className="p-4 bg-background/50 border border-border/50 rounded-lg hover:bg-background/80 transition-colors"
                >
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {getFormDisplayName(form as keyof ConjugationForms)}
                  </div>
                  <div className="text-2xl japanese-text font-medium text-primary mb-1">
                    {conjugation}
                  </div>
                  {showFurigana && (
                    <div className="text-sm japanese-text text-muted-foreground">
                      {/* Add furigana here if needed */}
                      {conjugation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
