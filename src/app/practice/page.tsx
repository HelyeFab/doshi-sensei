'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, ConjugationForms } from '@/types';
import { getCommonVerbs, searchWords } from '@/utils/api';
import { ConjugationEngine } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';

export default function PracticePage() {
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [conjugations, setConjugations] = useState<ConjugationForms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);

  useEffect(() => {
    // Check if there's a selected word in sessionStorage (from vocabulary page)
    if (typeof window !== 'undefined') {
      const storedWord = sessionStorage.getItem('selectedWord');
      if (storedWord) {
        try {
          const word = JSON.parse(storedWord);
          setSelectedWord(word);
          // Clear the stored word to prevent it from being loaded again on refresh
          sessionStorage.removeItem('selectedWord');
        } catch (err) {
          console.error('Error parsing stored word:', err);
        }
      }
    }

    loadInitialWords();
  }, []);

  useEffect(() => {
    if (selectedWord) {
      const wordConjugations = ConjugationEngine.conjugate(selectedWord);
      setConjugations(wordConjugations);
    } else {
      setConjugations(null);
    }
  }, [selectedWord]);

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

  const handleWordSelect = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleBackToList = () => {
    setSelectedWord(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {/* Header */}
      <PageHeader title={strings.practice.title} />

      {/* Main Content */}
      <main>
        {selectedWord ? (
          <ConjugationView
            word={selectedWord}
            conjugations={conjugations}
            showRules={showRules}
            onToggleRules={() => setShowRules(!showRules)}
            onBack={handleBackToList}
          />
        ) : (
          <WordSelector
            words={words}
            loading={loading}
            error={error}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={handleSearch}
            onSelectWord={handleWordSelect}
            onRetry={loadInitialWords}
          />
        )}
      </main>
    </div>
  );
}

interface WordSelectorProps {
  words: JapaneseWord[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearch: (term: string) => void;
  onSelectWord: (word: JapaneseWord) => void;
  onRetry: () => void;
}

function WordSelector({
  words,
  loading,
  error,
  searchTerm,
  onSearchTermChange,
  onSearch,
  onSelectWord,
  onRetry
}: WordSelectorProps) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-lg text-muted-foreground mb-4">
          {strings.practice.selectWord}
        </p>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder={strings.vocab.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch(searchTerm)}
              className="w-full px-4 py-3 rounded-lg bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => onSearch(searchTerm)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            Search
          </button>
        </div>
      </div>

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
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {strings.common.retry}
          </button>
        </div>
      )}

      {!loading && !error && words.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{strings.vocab.noResults}</p>
        </div>
      )}

      {!loading && !error && words.length > 0 && (
        <div className="grid gap-4">
          {words.map((word) => (
            <div
              key={word.id}
              onClick={() => onSelectWord(word)}
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
          ))}
        </div>
      )}
    </div>
  );
}

interface ConjugationViewProps {
  word: JapaneseWord;
  conjugations: ConjugationForms | null;
  showRules: boolean;
  onToggleRules: () => void;
  onBack: () => void;
}

function ConjugationView({
  word,
  conjugations,
  showRules,
  onToggleRules,
  onBack
}: ConjugationViewProps) {
  const [showFurigana, setShowFurigana] = useState(false);
  if (!conjugations) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">{strings.common.loading}</p>
      </div>
    );
  }

  // Group conjugations by category for comprehensive display
  const basicPlainForms = {
    present: conjugations.present,
    past: conjugations.past,
    negative: conjugations.negative,
    pastNegative: conjugations.pastNegative,
    volitional: conjugations.volitional
  };

  const politeForms = {
    polite: conjugations.polite,
    politePast: conjugations.politePast,
    politeNegative: conjugations.politeNegative,
    politePastNegative: conjugations.politePastNegative,
    politeVolitional: conjugations.politeVolitional
  };

  const stemsAndTeForms = {
    masuStem: conjugations.masuStem,
    negativeStem: conjugations.negativeStem,
    teForm: conjugations.teForm,
    negativeTeForm: conjugations.negativeTeForm,
    adverbialNegative: conjugations.adverbialNegative
  };

  const imperativeForms = {
    imperativePlain: conjugations.imperativePlain,
    imperativePolite: conjugations.imperativePolite
  };

  const conditionalForms = {
    provisional: conjugations.provisional,
    provisionalNegative: conjugations.provisionalNegative,
    conditional: conjugations.conditional,
    conditionalNegative: conjugations.conditionalNegative,
    alternativeForm: conjugations.alternativeForm
  };

  const potentialForms = {
    potential: conjugations.potential,
    potentialNegative: conjugations.potentialNegative,
    potentialPast: conjugations.potentialPast,
    potentialPastNegative: conjugations.potentialPastNegative
  };

  const potentialPoliteForms = {
    potentialPolite: conjugations.potentialPolite,
    potentialPoliteNegative: conjugations.potentialPoliteNegative,
    potentialPolitePast: conjugations.potentialPolitePast,
    potentialPolitePastNegative: conjugations.potentialPolitePastNegative
  };

  const passiveForms = {
    passive: conjugations.passive,
    passiveNegative: conjugations.passiveNegative,
    passivePast: conjugations.passivePast,
    passivePastNegative: conjugations.passivePastNegative
  };

  const passivePoliteForms = {
    passivePolite: conjugations.passivePolite,
    passivePoliteNegative: conjugations.passivePoliteNegative,
    passivePolitePast: conjugations.passivePolitePast,
    passivePolitePastNegative: conjugations.passivePolitePastNegative
  };

  const causativeForms = {
    causative: conjugations.causative,
    causativeNegative: conjugations.causativeNegative,
    causativePast: conjugations.causativePast,
    causativePastNegative: conjugations.causativePastNegative
  };

  const causativePoliteForms = {
    causativePolite: conjugations.causativePolite,
    causativePoliteNegative: conjugations.causativePoliteNegative,
    causativePolitePast: conjugations.causativePolitePast,
    causativePolitePastNegative: conjugations.causativePolitePastNegative
  };

  const causativePassiveForms = {
    causativePassive: conjugations.causativePassive,
    causativePassiveNegative: conjugations.causativePassiveNegative,
    causativePassivePast: conjugations.causativePassivePast,
    causativePassivePastNegative: conjugations.causativePassivePastNegative
  };

  const causativePassivePoliteForms = {
    causativePassivePolite: conjugations.causativePassivePolite,
    causativePassivePoliteNegative: conjugations.causativePassivePoliteNegative,
    causativePassivePolitePast: conjugations.causativePassivePolitePast,
    causativePassivePolitePastNegative: conjugations.causativePassivePolitePastNegative
  };

  const taiForms = {
    taiForm: conjugations.taiForm,
    taiFormNegative: conjugations.taiFormNegative,
    taiFormPast: conjugations.taiFormPast,
    taiFormPastNegative: conjugations.taiFormPastNegative
  };

  const progressiveForms = {
    progressive: conjugations.progressive,
    progressivePolite: conjugations.progressivePolite,
    progressiveNegative: conjugations.progressiveNegative,
    progressivePoliteNegative: conjugations.progressivePoliteNegative
  };

  const requestForms = {
    request: conjugations.request,
    requestNegative: conjugations.requestNegative
  };

  const colloquialAndClassicalForms = {
    colloquialNegative: conjugations.colloquialNegative,
    formalNegative: conjugations.formalNegative,
    classicalNegative: conjugations.classicalNegative
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {strings.practice.backToList}
      </button>

      {/* Word Header */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="text-center mb-6">
          <div className="text-4xl japanese-text font-medium text-card-foreground mb-2">
            {word.kanji}
          </div>
          <div className="text-2xl japanese-text text-muted-foreground mb-2">
            {word.kana}
          </div>
          <div className="text-lg text-muted-foreground mb-4">
            {word.romaji}
          </div>
          <div className="text-xl text-foreground mb-4">
            {word.meaning}
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">
              {strings.verbTypes[word.type.toLowerCase().replace('-', '') as keyof typeof strings.verbTypes] || word.type}
            </span>
            <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full">
              {word.jlpt}
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={onToggleRules}
          className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
        >
          {showRules ? strings.drill.hideRules : strings.drill.showRules}
        </button>
        <button
          onClick={() => setShowFurigana(!showFurigana)}
          className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
        >
          {showFurigana ? 'Show Kanji' : 'Show Furigana'}
        </button>
      </div>

      {/* Conjugation Tables */}
      <div className="space-y-6">
        <ConjugationTable
          title="Basic Plain Forms"
          forms={basicPlainForms}
          word={word}
          showRules={showRules}
          showFurigana={showFurigana}
        />

        <ConjugationTable
          title="Polite Forms"
          forms={politeForms}
          word={word}
          showRules={showRules}
          showFurigana={showFurigana}
        />

        {word.type !== 'i-adjective' && word.type !== 'na-adjective' && (
          <>
            <ConjugationTable
              title="Stems and Te-Forms"
              forms={stemsAndTeForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Imperative Forms"
              forms={imperativeForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Progressive Forms"
              forms={progressiveForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Request Forms"
              forms={requestForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Conditional Forms"
              forms={conditionalForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Potential Plain Forms"
              forms={potentialForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Potential Polite Forms"
              forms={potentialPoliteForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Passive Plain Forms"
              forms={passiveForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Passive Polite Forms"
              forms={passivePoliteForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Causative Plain Forms"
              forms={causativeForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Causative Polite Forms"
              forms={causativePoliteForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Causative Passive Plain Forms"
              forms={causativePassiveForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Causative Passive Polite Forms"
              forms={causativePassivePoliteForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Tai Forms (Want to do)"
              forms={taiForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />

            <ConjugationTable
              title="Colloquial and Classical Forms"
              forms={colloquialAndClassicalForms}
              word={word}
              showRules={showRules}
              showFurigana={showFurigana}
            />
          </>
        )}
      </div>
    </div>
  );
}

interface ConjugationTableProps {
  title: string;
  forms: Record<string, string | undefined>;
  word: JapaneseWord;
  showRules: boolean;
  showFurigana: boolean;
}

function ConjugationTable({ title, forms, word, showRules, showFurigana }: ConjugationTableProps) {
  const hasValidForms = Object.values(forms).some(form => form);

  if (!hasValidForms) {
    return null;
  }

  // Function to convert kanji conjugation to kana equivalent
  const convertToKana = (kanjiForm: string): string => {
    if (!kanjiForm) return kanjiForm;

    // If the word is already in kana only, return as is
    if (word.kanji === word.kana) return kanjiForm;

    // For verbs, replace the kanji stem with the kana stem
    if (word.type === 'Ichidan' || word.type === 'Godan' || word.type === 'Irregular') {
      const kanjiStem = word.kanji.slice(0, -1);
      const kanaStem = word.kana.slice(0, -1);

      // Replace the kanji stem with kana stem
      if (kanjiForm.startsWith(kanjiStem)) {
        return kanjiForm.replace(kanjiStem, kanaStem);
      }

      // Handle special cases for irregular verbs
      if (word.type === 'Irregular') {
        if (word.kanji.includes('来') && kanjiForm.includes('来')) {
          return kanjiForm.replace(/来/g, 'く');
        }
        if (word.kanji.endsWith('する') && kanjiForm.includes(word.kanji.slice(0, -2))) {
          const kanjiPrefix = word.kanji.slice(0, -2);
          const kanaPrefix = word.kana.slice(0, -2);
          return kanjiForm.replace(kanjiPrefix, kanaPrefix);
        }
      }
    }

    // For adjectives and other types, simple replacement
    if (kanjiForm.includes(word.kanji)) {
      return kanjiForm.replace(word.kanji, word.kana);
    }

    // Fallback: return original if no conversion possible
    return kanjiForm;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 border-b border-border">
        <h3 className="font-medium text-foreground">{title}</h3>
      </div>
      <div className="divide-y divide-border">
        {Object.entries(forms).map(([key, value]) => {
          if (!value) return null;

          const formKey = key as keyof ConjugationForms;
          const rule = showRules ? ConjugationEngine.getConjugationRule(word.type, formKey) : null;

          return (
            <div key={key} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="mb-2 md:mb-0">
                  <div className="text-sm text-muted-foreground mb-1">
                    {strings.conjugation.forms[formKey as keyof typeof strings.conjugation.forms] || key}
                  </div>
                  <div className="text-xl japanese-text font-medium text-foreground">
                    {showFurigana ? convertToKana(value) : value}
                  </div>
                </div>
                {showRules && rule && (
                  <div className="bg-muted p-2 rounded text-sm text-muted-foreground max-w-md">
                    {rule}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
