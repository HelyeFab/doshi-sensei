'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, JLPTLevel, FilterOptions } from '@/types';
import { searchWords, getCommonVerbs } from '@/utils/api';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';

export default function VocabularyPage() {
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | 'all'>('all');
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);

  useEffect(() => {
    loadInitialWords();
  }, []);

  const loadInitialWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const commonWords = await getCommonVerbs();
      setWords(commonWords);
    } catch (err) {
      setError(strings.errors.loadError);
      console.error('Error loading words:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term: string) => {
    if (!term.trim()) {
      loadInitialWords();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const searchResults = await searchWords(term, 30);
      setWords(searchResults);
    } catch (err) {
      setError(strings.errors.loadError);
      console.error('Error searching words:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredWords = words.filter(word => {
    if (selectedLevel !== 'all' && word.jlpt !== selectedLevel) {
      return false;
    }
    return true;
  });

  const handleWordClick = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <PageHeader title={strings.vocab.title} />

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder={strings.vocab.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => handleSearch(searchTerm)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Search
          </button>
        </div>

        {/* JLPT Level Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground mr-2 self-center">
            {strings.vocab.filterByLevel}:
          </span>
          {(['all', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedLevel === level
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {level === 'all' ? strings.vocab.allLevels : strings.jlptLevels[level.toLowerCase() as keyof typeof strings.jlptLevels]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main>
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">{strings.vocab.loading}</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={loadInitialWords}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {strings.common.retry}
            </button>
          </div>
        )}

        {!loading && !error && filteredWords.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{strings.vocab.noResults}</p>
          </div>
        )}

        {!loading && !error && filteredWords.length > 0 && (
          <div className="grid gap-4">
            {filteredWords.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onClick={() => handleWordClick(word)}
              />
            ))}
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
    </div>
  );
}

interface WordCardProps {
  word: JapaneseWord;
  onClick: () => void;
}

function WordCard({ word, onClick }: WordCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 hover:bg-card/80 transition-colors cursor-pointer group"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl japanese-text font-medium text-card-foreground">
              {word.kanji}
            </span>
            <span className="text-lg japanese-text text-muted-foreground">
              {word.kana}
            </span>
            <span className="text-sm text-muted-foreground">
              {word.romaji}
            </span>
          </div>
          <p className="text-foreground mb-2">{word.meaning}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded">
              {strings.verbTypes[word.type.toLowerCase().replace('-', '') as keyof typeof strings.verbTypes] || word.type}
            </span>
            <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded">
              {word.jlpt}
            </span>
          </div>
        </div>
        <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface WordModalProps {
  word: JapaneseWord;
  onClose: () => void;
}

function WordModal({ word, onClose }: WordModalProps) {
  const router = useRouter();

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
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-card-foreground">
            {strings.vocab.title}
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

        <div className="space-y-4">
          <div className="text-center">
            <div className="text-4xl japanese-text font-medium text-card-foreground mb-2">
              {word.kanji}
            </div>
            <div className="text-2xl japanese-text text-muted-foreground mb-2">
              {word.kana}
            </div>
            <div className="text-lg text-muted-foreground mb-4">
              {word.romaji}
            </div>
            <div className="text-lg text-foreground mb-4">
              {word.meaning}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{strings.vocab.type}:</span>
              <br />
              <span className="text-foreground">
                {strings.verbTypes[word.type.toLowerCase().replace('-', '') as keyof typeof strings.verbTypes] || word.type}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{strings.vocab.level}:</span>
              <br />
              <span className="text-foreground">{word.jlpt}</span>
            </div>
          </div>

          {canBeConjugated ? (
            <div className="flex gap-2 pt-4">
              <button
                onClick={handlePracticeClick}
                className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
              >
                {strings.practice.showConjugations}
              </button>
              <button
                onClick={handleDrillClick}
                className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/80 transition-colors"
              >
                {strings.drill.title}
              </button>
            </div>
          ) : (
            <div className="pt-4 text-center">
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
