'use client';

import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { JapaneseWord, ConjugationForms, WordList } from '@/types';
import { searchWords } from '@/utils/api';
import { ConjugationEngine } from '@/utils/conjugation';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useAccess } from '@/hooks/useAccess';
import { useSubscription2 } from '@/hooks/useSubscription2';
import WordListManager from '@/utils/wordLists';
import StatsManager from '@/utils/stats';
import TTSManager from '@/utils/tts';
import { getCachedCommonWordsForPractice, getCachedFilteredWords, PracticeCache } from '@/utils/practiceCache';
import KanaChart from '@/components/kana/KanaChart';
import KanaStudyModal from '@/components/kana/KanaStudyModal';
import KanaDropModal from '@/components/games/KanaDropGame/KanaDropModal';
import { useNotification } from '@/contexts/NotificationContext';
import { kanaData, getBasicKana } from '@/data/kanaData';
import { KanaChar } from '@/components/games/KanaDropGame/types';

// Structured Data for Practice Page
const practiceStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Language Practice - Conjugation & Kana",
  "description": "Interactive Japanese verb and adjective conjugation practice with detailed explanations. Study hiragana and katakana charts with pronunciation.",
  "url": "https://doshisensei.com/practice",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Interactive Practice",
  "about": {
    "@type": "Thing",
    "name": "Japanese Language",
    "description": "Japanese verb conjugations, grammar, vocabulary, hiragana and katakana"
  },
  "teaches": [
    "Japanese verb conjugation",
    "Ichidan verb forms",
    "Godan verb forms",
    "Irregular verb forms",
    "I-adjective conjugation",
    "Na-adjective conjugation",
    "JLPT grammar patterns",
    "Hiragana characters",
    "Katakana characters",
    "Japanese syllabary"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese practice",
    "verb conjugation",
    "Japanese grammar",
    "JLPT preparation",
    "Japanese learning",
    "ichidan verbs",
    "godan verbs",
    "hiragana chart",
    "katakana chart",
    "kana practice"
  ]
};

export default function PracticePage() {
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const [activeTab, setActiveTab] = useState<'conjugation' | 'kana'>('kana');
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [wordTypeFilter, setWordTypeFilter] = useState<'all' | 'verbs' | 'adjectives'>('all');

  // Kana chart states
  const [kanaChartType, setKanaChartType] = useState<'hiragana' | 'katakana'>('hiragana');
  const [selectedHiragana, setSelectedHiragana] = useState<Set<string>>(new Set());
  const [selectedKatakana, setSelectedKatakana] = useState<Set<string>>(new Set());
  const [showKanaStudyModal, setShowKanaStudyModal] = useState(false);
  const [kanaStudyType, setKanaStudyType] = useState<'hiragana' | 'katakana' | 'both'>('both');
  const [showRomaji, setShowRomaji] = useState(true);
  const [showKanaDropModal, setShowKanaDropModal] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    if (activeTab === 'conjugation') {
      loadInitialWords();
      // Preload cache in background for faster future loads
      PracticeCache.preloadCache();
    }
  }, [activeTab]);

  // Load saved kana selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedHiragana = localStorage.getItem('kana-study-selection-hiragana');
      const savedKatakana = localStorage.getItem('kana-study-selection-katakana');
      if (savedHiragana) {
        setSelectedHiragana(new Set(JSON.parse(savedHiragana)));
      }
      if (savedKatakana) {
        setSelectedKatakana(new Set(JSON.parse(savedKatakana)));
      }
    }
  }, []);

  // Save kana selection
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-hiragana', JSON.stringify([...selectedHiragana]));
    }
  }, [selectedHiragana]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kana-study-selection-katakana', JSON.stringify([...selectedKatakana]));
    }
  }, [selectedKatakana]);

  const loadInitialWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const words = await getCachedCommonWordsForPractice();
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

  const handleToggleKana = (kanaId: string) => {
    if (kanaChartType === 'hiragana') {
      const newSelection = new Set(selectedHiragana);
      if (newSelection.has(kanaId)) {
        newSelection.delete(kanaId);
      } else {
        newSelection.add(kanaId);
      }
      setSelectedHiragana(newSelection);
    } else {
      const newSelection = new Set(selectedKatakana);
      if (newSelection.has(kanaId)) {
        newSelection.delete(kanaId);
      } else {
        newSelection.add(kanaId);
      }
      setSelectedKatakana(newSelection);
    }
  };

  const handleStartKanaStudy = () => {
    const totalSelected = selectedHiragana.size + selectedKatakana.size;
    if (totalSelected === 0) {
      showNotification({
        title: 'No Characters Selected',
        message: 'Please select some kana characters to study first!',
        type: 'info'
      });
      return;
    }
    setShowKanaStudyModal(true);
  };

  const handleClearKanaSelection = () => {
    setSelectedHiragana(new Set());
    setSelectedKatakana(new Set());
    localStorage.removeItem('kana-study-selection-hiragana');
    localStorage.removeItem('kana-study-selection-katakana');
  };

  const getSelectedKanaData = useMemo((): KanaChar[] => {
    const selectedData: KanaChar[] = [];

    // Get hiragana selections
    selectedHiragana.forEach(id => {
      const kana = kanaData.find(k => k.id === id);
      if (kana) {
        selectedData.push({
          id: `${id}-hiragana`,
          kana: kana.hiragana,
          romaji: kana.romaji,
          type: 'hiragana'
        });
      }
    });

    // Get katakana selections
    selectedKatakana.forEach(id => {
      const kana = kanaData.find(k => k.id === id);
      if (kana) {
        selectedData.push({
          id: `${id}-katakana`,
          kana: kana.katakana,
          romaji: kana.romaji,
          type: 'katakana'
        });
      }
    });

    return selectedData;
  }, [selectedHiragana, selectedKatakana]);

  const handleStartKanaDrop = async () => {
    if (getSelectedKanaData.length === 0) {
      showNotification({
        title: 'No Characters Selected',
        message: 'Please select some kana characters to play Kana Drop!',
        type: 'info'
      });
      return;
    }
    if (getSelectedKanaData.length > 10) {
      showNotification({
        title: 'Too Many Characters',
        message: 'Please select up to 10 characters for Kana Drop.',
        type: 'info'
      });
      return;
    }
    
    // Check if user can play KanaDrop using new system
    const canPlay = await checkAndTrack('kana_drop');
    
    if (!canPlay) {
      // The access system will show the appropriate modal
      return;
    }
    
    setShowKanaDropModal(true);
  };

  const allKanaSelected = selectedHiragana.size + selectedKatakana.size === getBasicKana().length;

  // Add this rightAction for the header
  const kanaDropHeaderButton = (selectedHiragana.size + selectedKatakana.size) <= 10 && (selectedHiragana.size + selectedKatakana.size) > 0 && (
    <button
      onClick={handleStartKanaDrop}
      className="ml-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
      <span>Kana Drop</span>
    </button>
  );

  if (selectedWord) {
    return <WordPractice word={selectedWord} onBack={handleBackToList} />;
  }

  return (
    <>
      {/* Virtual Companion Section - 1/6th of screen height */}
      <div className="relative w-full h-[16.67vh] min-h-[120px] overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/25 to-secondary/20" />

        {/* Gradient to White Fade */}
        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent" />

        {/* Virtual Companion Button positioned within this section */}
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(practiceStructuredData),
          }}
        />

        <PageHeader title={strings.practice.title} helpKey="practice" rightAction={kanaDropHeaderButton} />

        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setActiveTab('kana')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'kana'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Kana Charts
              </button>
              <button
                onClick={() => setActiveTab('conjugation')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'conjugation'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Conjugation Practice
              </button>
            </div>
          </div>

          {activeTab === 'kana' ? (
            // Kana Charts Tab
            <div className="space-y-6">
              {/* Header with controls */}
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  Tap any character to hear its pronunciation. Click the purple corner to select for practice.
                </p>

                {/* Chart Type Toggle */}
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setKanaChartType('hiragana')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${kanaChartType === 'hiragana'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                  >
                    ひらがな Hiragana
                  </button>
                  <button
                    onClick={() => setKanaChartType('katakana')}
                    className={`px-4 py-2 rounded-lg border transition-colors ${kanaChartType === 'katakana'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-input hover:bg-muted'
                      }`}
                  >
                    カタカナ Katakana
                  </button>
                </div>

                {/* Options and Study Button */}
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showRomaji}
                      onChange={(e) => setShowRomaji(e.target.checked)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">Show Romaji</span>
                  </label>

                  {(selectedHiragana.size > 0 || selectedKatakana.size > 0) && (
                    <>
                      <button
                        onClick={handleClearKanaSelection}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear Selection ({selectedHiragana.size + selectedKatakana.size})
                      </button>

                      <div className="flex items-center gap-2">
                        <select
                          value={kanaStudyType}
                          onChange={(e) => setKanaStudyType(e.target.value as 'hiragana' | 'katakana' | 'both')}
                          className="px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"
                        >
                          <option value="hiragana">Study Hiragana</option>
                          <option value="katakana">Study Katakana</option>
                          <option value="both">Study Both</option>
                        </select>

                        <button
                          onClick={handleStartKanaStudy}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          <span>Start Study ({selectedHiragana.size + selectedKatakana.size} selected)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Kana Chart */}
              <div className="w-full">
                <KanaChart
                  chartType={kanaChartType}
                  selectedKana={kanaChartType === 'hiragana' ? selectedHiragana : selectedKatakana}
                  onToggleKana={handleToggleKana}
                  showRomaji={showRomaji}
                />
              </div>

              {/* Kana Study Modal */}
              {showKanaStudyModal && (
                <KanaStudyModal
                  isOpen={showKanaStudyModal}
                  onClose={(completed) => {
                    setShowKanaStudyModal(false);
                    if (completed) {
                      showNotification({
                        title: 'Study Session Complete!',
                        message: 'Great job practicing your kana!',
                        type: 'success'
                      });
                    }
                  }}
                  selectedKanaIds={[...selectedHiragana, ...selectedKatakana]}
                  studyType={kanaStudyType}
                />
              )}

              {/* Kana Drop Modal */}
              {showKanaDropModal && (
                <KanaDropModal
                  isOpen={showKanaDropModal}
                  onClose={() => setShowKanaDropModal(false)}
                  selectedKana={getSelectedKanaData}
                />
              )}

              {(selectedHiragana.size + selectedKatakana.size) > 8 && (selectedHiragana.size + selectedKatakana.size) <= 10 && (
                <div className="my-4 p-4 bg-blue-100 border border-blue-400 text-blue-800 rounded-lg text-center">
                  <strong>Tip:</strong> You have selected {selectedHiragana.size + selectedKatakana.size} characters. The maximum for Kana Drop is 10.
                </div>
              )}

              {allKanaSelected && (
                <div className="my-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg text-center">
                  <strong>Warning:</strong> You have selected all kana. No "wrong kana" will spawn in the game—only distractors and your selected kana will appear.
                </div>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </main>
      </div>
    </>
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
              className={`px-4 py-2 rounded-lg border transition-colors ${wordTypeFilter === filter
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

// Helper function to determine if a word can be conjugated
function isConjugableWord(word: JapaneseWord): boolean {
  return word.type === 'Ichidan' ||
    word.type === 'Godan' ||
    word.type === 'Irregular' ||
    word.type === 'i-adjective' ||
    word.type === 'na-adjective';
}

// Word Card Component
interface WordCardProps {
  word: JapaneseWord;
  onSelect: (word: JapaneseWord) => void;
}

function WordCard({ word, onSelect }: WordCardProps) {
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isConjugable = isConjugableWord(word);

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

    // Check if user can create more lists using new system
    const canCreate = await checkAndTrack('word_lists');
    if (!canCreate) {
      // The access system will show the appropriate modal
      return;
    }

    try {
      await WordListManager.createWordList(newListName.trim());
      // Usage tracking is handled automatically by checkAndTrack
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
          className="absolute top-2 right-2 p-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Save to List"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>

        <div
          onClick={() => isConjugable ? onSelect(word) : null}
          className={!isConjugable ? 'cursor-not-allowed' : 'cursor-pointer'}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
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
            <div className="flex flex-col items-end gap-1 ml-4">
              <div className={`px-2 py-1 text-xs rounded border ${getTypeColor(word.type)}`}>
                {word.type}
              </div>
              <div className="text-xs text-muted-foreground">
                {word.jlpt}
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-2">
            {word.meaning}
          </div>

          {/* Conjugation Status */}
          {!isConjugable && (
            <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-400">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>Cannot be conjugated - {word.type}s don't have verb forms</span>
            </div>
          )}

          {isConjugable && (
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Click to view conjugations</span>
            </div>
          )}
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

// Verb Essentials Component
interface VerbEssentialsProps {
  word: JapaneseWord;
  conjugations: ConjugationForms;
}

function VerbEssentials({ word, conjugations }: VerbEssentialsProps) {
  const getStem = () => {
    if (word.type === 'Ichidan') {
      return word.kanji.slice(0, -1); // Remove る
    } else if (word.type === 'Godan') {
      return word.kanji.slice(0, -1); // Remove last character
    } else {
      // Irregular verbs
      if (word.kana === 'する' || word.kana.endsWith('する')) {
        return word.kanji.slice(0, -2) + 'し';
      } else if (word.kana === 'くる' || word.kanji === '来る') {
        return word.kanji.includes('来') ? '来' : 'き';
      }
      return word.kanji;
    }
  };
}
