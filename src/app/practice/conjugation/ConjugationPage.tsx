"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { JapaneseWord, ConjugationForms, WordList } from "@/types";
import { ExtendedConjugationForms } from "@/types/conjugation-extended";
import { searchWords } from "@/utils/api";
import { ConjugationEngine } from "@/utils/conjugation";
import { ExtendedConjugationEngine } from "@/utils/conjugation-extended";
import { useStrings } from "@/contexts/LanguageContext";
import { SmartPageHeader } from "@/components/navigation/SmartPageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@/hooks/useAccess";
import { useSubscription2 } from "@/hooks/useSubscription2";
import StudyListManager from "@/utils/studyListManager";
import StatsManager from "@/utils/stats";
import TTSManager from "@/utils/tts";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  getCachedCommonWordsForPractice,
  getCachedFilteredWords,
  PracticeCache,
} from "@/utils/practiceCache";
import { useNotification } from "@/contexts/NotificationContext";
import { MobileAwareContainer } from "@/components/layout/MobileAwareContainer";
import { useSettings } from "@/contexts/SettingsContext";
import { ConjugationLoadingAnimation } from "@/components/ui/ConjugationLoadingAnimation";
import { WordCardSkeletonGrid } from "@/components/ui/WordCardSkeleton";
import { VocabularyTTSButton } from "@/components/ui/TTSButton";

// Structured Data for Conjugation Practice Page
const conjugationStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Japanese Conjugation Practice - Verbs & Adjectives",
  description:
    "Interactive Japanese verb and adjective conjugation practice with detailed explanations. Study Japanese grammar patterns and conjugation forms.",
  url: "https://doshisensei.com/practice/conjugation",
  educationalLevel: ["Beginner", "Intermediate", "Advanced"],
  learningResourceType: "Interactive Practice",
  about: {
    "@type": "Thing",
    name: "Japanese Grammar",
    description:
      "Japanese verb conjugations, grammar patterns, and adjective forms",
  },
  teaches: [
    "Japanese verb conjugation",
    "Ichidan verb forms",
    "Godan verb forms",
    "Irregular verb forms",
    "I-adjective conjugation",
    "Na-adjective conjugation",
    "JLPT grammar patterns",
    "Japanese grammar",
  ],
  educationalRole: "Student",
  typicalAgeRange: "13-65",
  interactivityType: "Active",
  isAccessibleForFree: true,
  inLanguage: "en",
  keywords: [
    "Japanese conjugation",
    "verb conjugation",
    "Japanese grammar",
    "JLPT preparation",
    "Japanese learning",
    "ichidan verbs",
    "godan verbs",
    "Japanese adjectives",
  ],
};

export default function ConjugationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { checkAndTrack } = useAccess();
  const { isPremium, userType } = useSubscription2();
  const strings = useStrings();
  const { track } = useAnalytics();
  const [words, setWords] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [showFurigana, setShowFurigana] = useState(false);
  const [wordTypeFilter, setWordTypeFilter] = useState<
    "all" | "verbs" | "adjectives"
  >("all");
  const { showNotification } = useNotification();

  useEffect(() => {
    loadInitialWords();
    // Preload cache in background for faster future loads
    PracticeCache.preloadCache();
  }, []);

  const loadInitialWords = async () => {
    try {
      setLoading(true);
      setError(null);
      const words = await getCachedCommonWordsForPractice();
      setWords(words);
    } catch (err) {
      setError(strings.errors.loadError);
      console.error("Error loading words:", err);
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
      
      // Progressive loading strategy:
      // 1. Load cached/local results first (instant)
      // 2. Show them immediately for instant feedback
      // 3. Fetch API results in background
      // 4. Merge when ready
      
      // Start with cached results for instant feedback
      const cachedWords = await getCachedFilteredWords(searchTerm);
      if (cachedWords.length > 0) {
        setWords(cachedWords);
        setLoading(false); // Remove loading state once we have some results
        setFetchingMore(true); // But show we're fetching more
      }
      
      // Then fetch fresh results from API
      try {
        const searchResults = await searchWords(searchTerm, 50);
        
        // Merge results intelligently (API results first, then cached)
        const mergedResults = [...searchResults];
        cachedWords.forEach(cached => {
          if (!mergedResults.find(r => r.id === cached.id)) {
            mergedResults.push(cached);
          }
        });
        
        setWords(mergedResults);
        
        // Track word search
        track("word_search", {
          searchTerm,
          resultsCount: mergedResults.length,
          source: "conjugation_practice",
        });
      } catch (apiError) {
        // If API fails but we have cached results, that's fine
        console.log("API search failed, using cached results:", apiError);
      }
      
      setFetchingMore(false);
    } catch (err) {
      // If we already have cached results, don't show error
      if (words.length === 0) {
        setError(strings.errors.networkError);
      }
      console.error("Error searching words:", err);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  const handleWordSelect = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleBackToList = () => {
    setSelectedWord(null);
  };

  // Filter words based on type
  const filteredWords = words.filter((word) => {
    if (wordTypeFilter === "verbs") {
      return (
        word.type === "Ichidan" ||
        word.type === "Godan" ||
        word.type === "Irregular"
      );
    } else if (wordTypeFilter === "adjectives") {
      return word.type === "i-adjective" || word.type === "na-adjective";
    }
    return true; // 'all' shows everything
  });

  if (selectedWord) {
    return <WordPractice word={selectedWord} onBack={handleBackToList} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <MobileAwareContainer className="container mx-auto px-4 py-8 min-h-screen">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(conjugationStructuredData),
          }}
        />

        <SmartPageHeader title="Conjugation Practice" />

        <main className="max-w-7xl mx-auto mb-32 md:mb-8 pb-safe">
          {/* Target Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <img
                src="/flat-icons/root-icons/target.svg"
                alt="Target Icon"
                className="w-8 h-8"
              />
            </div>
          </div>

          <>
            <p className="text-muted-foreground mb-4 text-center max-w-2xl mx-auto">
              {strings.practice?.conjugationIntro ||
                "Master Japanese verb and adjective conjugations through interactive practice. Explore all forms including tense, politeness, and special constructions like passive and causative."}
            </p>
            <p className="text-muted-foreground mb-8 text-center">
              {strings.practice?.selectWord ||
                "Select a verb or adjective to practice"}
            </p>

            <WordSelector
              words={filteredWords}
              loading={loading}
              fetchingMore={fetchingMore}
              error={error}
              searchTerm={searchTerm}
              wordTypeFilter={wordTypeFilter}
              onSearchTermChange={setSearchTerm}
              onWordTypeFilterChange={setWordTypeFilter}
              onSearch={handleSearch}
              onSelectWord={handleWordSelect}
              onRetry={loadInitialWords}
              strings={strings}
            />
          </>
        </main>
      </MobileAwareContainer>
    </div>
  );
}

// Word Selector Component
interface WordSelectorProps {
  words: JapaneseWord[];
  loading: boolean;
  fetchingMore?: boolean;
  error: string | null;
  searchTerm: string;
  wordTypeFilter: "all" | "verbs" | "adjectives";
  onSearchTermChange: (term: string) => void;
  onWordTypeFilterChange: (filter: "all" | "verbs" | "adjectives") => void;
  onSearch: () => void;
  onSelectWord: (word: JapaneseWord) => void;
  onRetry: () => void;
  strings: any; // Add strings prop
}

function WordSelector({
  words,
  loading,
  fetchingMore = false,
  error,
  searchTerm,
  wordTypeFilter,
  onSearchTermChange,
  onWordTypeFilterChange,
  onSearch,
  onSelectWord,
  onRetry,
  strings,
}: WordSelectorProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  const getFilterLabel = (filter: "all" | "verbs" | "adjectives") => {
    switch(filter) {
      case "all": return "All Types";
      case "verbs": return "Verbs Only";
      case "adjectives": return "Adjectives Only";
    }
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
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
            <svg
              className="w-5 h-5 md:hidden"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <span className="hidden md:inline">Search</span>
          </button>
        </div>
      </form>

      {/* Filter Dropdown - Mobile Only */}
      <div className="md:hidden mb-6">
        <details className="group" id="filter-dropdown">
          <summary className="w-full px-4 py-3 bg-background border border-input rounded-lg hover:bg-muted transition-colors flex items-center justify-between cursor-pointer list-none">
            <span className="text-foreground">
              Filter: {getFilterLabel(wordTypeFilter)}
            </span>
            <svg
              className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="space-y-2">
              {(["all", "verbs", "adjectives"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    onWordTypeFilterChange(filter);
                    // Close the details dropdown
                    const dropdown = document.getElementById('filter-dropdown') as HTMLDetailsElement;
                    if (dropdown) {
                      dropdown.open = false;
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg border transition-colors text-left ${
                    wordTypeFilter === filter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-input hover:bg-muted"
                  }`}
                >
                  {getFilterLabel(filter)}
                </button>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Word Type Filter - Desktop Only */}
      <div className="hidden md:block mb-6">
        <div className="text-sm text-muted-foreground mb-3">
          Filter by Word Type:
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "verbs", "adjectives"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => onWordTypeFilterChange(filter)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                wordTypeFilter === filter
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-input hover:bg-muted"
              }`}
            >
              {getFilterLabel(filter)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <ConjugationLoadingAnimation isSearching={true} />
      )}

      {/* Error */}
      {error && !loading && (
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

      {/* Results */}
      {!loading && !error && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              Found {words.length}{" "}
              {wordTypeFilter === "all" ? "words" : wordTypeFilter}
            </div>
            {fetchingMore && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                <span>Finding more results...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => (
              <WordCard key={word.id} word={word} onSelect={onSelectWord} />
            ))}
          </div>

          {/* Show skeleton loaders while fetching more */}
          {fetchingMore && words.length > 0 && (
            <div className="mt-4">
              <WordCardSkeletonGrid count={3} />
            </div>
          )}

          {words.length === 0 && !fetchingMore && (
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
  return (
    word.type === "Ichidan" ||
    word.type === "Godan" ||
    word.type === "Irregular" ||
    word.type === "i-adjective" ||
    word.type === "na-adjective"
  );
}

// Helper function to get conjugation rules
function getConjugationRules(wordType: string): string {
  switch (wordType) {
    case "Godan":
      return "Godan verbs (also called u-verbs or Group I verbs) change their endings based on the final kana. The stem changes for different conjugations: -u→-a (negative), -u→-i (masu), -u→-e (potential/imperative), -u→-o (volitional).";
    case "Ichidan":
      return "Ichidan verbs (also called ru-verbs or Group II verbs) drop the final る and add conjugation endings directly to the stem. They are simpler and more regular than Godan verbs.";
    case "Irregular":
      return "Irregular verbs (する 'to do' and 来る 'to come') have unique conjugation patterns that must be memorized. する compounds follow the same pattern as する.";
    case "i-adjective":
      return "I-adjectives drop the final い and add conjugation endings. They conjugate similarly to verbs with forms for past, negative, and adverbial.";
    case "na-adjective":
      return "Na-adjectives use だ/です for conjugation. They behave like nouns in many ways, requiring な when modifying nouns directly.";
    default:
      return "This word follows standard Japanese conjugation patterns.";
  }
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
  const [newListName, setNewListName] = useState("");
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isConjugable = isConjugableWord(word);

  useEffect(() => {
    loadWordLists();
  }, []);

  const loadWordLists = async () => {
    try {
      // Load study lists and convert to legacy format for compatibility
      const studyLists = await StudyListManager.getAllStudyLists();
      const legacyWordLists: WordList[] = studyLists
        .filter(
          (list) => list.type === "flashcard" || list.type === "drillable"
        ) // Only word lists
        .map((studyList) => ({
          id: studyList.id,
          name: studyList.name,
          description: studyList.description,
          wordIds: studyList.itemIds,
          createdAt: studyList.createdAt,
          updatedAt: studyList.updatedAt,
          color: studyList.color,
          isConjugable: studyList.type === "drillable",
        }));
      setWordLists(legacyWordLists);
    } catch (err) {
      console.error("Error loading word lists:", err);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Ichidan":
        return "bg-primary/10 text-primary border-primary/20";
      case "Godan":
        return "bg-success/10 text-success border-success/20";
      case "Irregular":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "i-adjective":
        return "bg-accent/10 text-accent-foreground border-accent/20";
      case "na-adjective":
        return "bg-secondary/10 text-secondary-foreground border-secondary/20";
      default:
        return "bg-muted/50 text-muted-foreground border-muted";
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setShowSaveModal(true);
  };

  const handleListToggle = (listId: string) => {
    setSelectedLists((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const handleCreateNewList = async () => {
    if (!newListName.trim()) return;

    // Check if user can create more lists using new system
    const canCreate = await checkAndTrack("word_lists");
    if (!canCreate) {
      // The access system will show the appropriate modal
      return;
    }

    try {
      // Create flashcard list by default (can store any words)
      await StudyListManager.createStudyList(
        newListName.trim(),
        "flashcard",
        undefined,
        user,
        isPremium ? "active" : undefined
      );
      // Usage tracking is handled automatically by checkAndTrack
      setNewListName("");
      await loadWordLists(); // Reload lists
    } catch (err) {
      console.error("Error creating list:", err);
    }
  };

  const handleSaveToLists = async () => {
    if (selectedLists.length === 0) return;

    try {
      setIsSaving(true);

      // Add word to selected lists
      await StudyListManager.addItemToLists(
        word,
        "word",
        selectedLists,
        user,
        isPremium ? "active" : undefined
      );

      setShowSaveModal(false);
      setSelectedLists([]);

      // Show success message briefly
    } catch (err) {
      console.error("Error saving word to lists:", err);
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
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
          </svg>
        </button>

        <div
          onClick={() => (isConjugable ? onSelect(word) : null)}
          className={!isConjugable ? "cursor-not-allowed" : "cursor-pointer"}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="text-2xl japanese-text font-medium text-card-foreground mb-1">
                {word.kanji}
              </div>
              <div className="text-lg japanese-text text-muted-foreground">
                {word.kana}
              </div>
              <div className="text-sm text-muted-foreground">{word.romaji}</div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-4">
              <div
                className={`px-2 py-1 text-xs rounded border ${getTypeColor(
                  word.type
                )}`}
              >
                {word.type}
              </div>
              <div className="text-xs text-muted-foreground">{word.jlpt}</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-2">
            {word.meaning}
          </div>

          {/* Conjugation Status */}
          {!isConjugable && (
            <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded text-xs text-warning">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>
                Cannot be conjugated - {word.type}s don't have verb forms
              </span>
            </div>
          )}

          {isConjugable && (
            <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded text-xs text-success">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
              <h3 className="text-lg font-semibold text-card-foreground">
                Save to List
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-lg japanese-text font-medium text-foreground">
                {word.kanji}
              </div>
              <div className="text-sm text-muted-foreground">
                {word.meaning}
              </div>
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
                  onKeyPress={(e) => e.key === "Enter" && handleCreateNewList()}
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
              <div className="text-sm text-muted-foreground mb-2">
                Select lists:
              </div>
              {wordLists.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {wordLists.map((list) => (
                    <label
                      key={list.id}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-muted/50"
                    >
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
                        <span className="text-sm text-foreground">
                          {list.name}
                        </span>
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
                {isSaving
                  ? "Saving..."
                  : `Save to ${selectedLists.length} list${
                      selectedLists.length !== 1 ? "s" : ""
                    }`}
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
    if (word.type === "Ichidan") {
      return word.kanji.slice(0, -1); // Remove る
    } else if (word.type === "Godan") {
      return word.kanji.slice(0, -1); // Remove last character
    } else {
      // Irregular verbs
      if (word.kana === "する" || word.kana.endsWith("する")) {
        return word.kanji.slice(0, -2) + "し";
      } else if (word.kana === "くる" || word.kanji === "来る") {
        return word.kanji.includes("来") ? "来" : "き";
      }
      return word.kanji;
    }
  };
}

// Types for conjugation sections
interface ConjugationSection {
  id: string;
  title: string;
  emoji: string;
  forms: Array<{
    key: keyof ExtendedConjugationForms;
    label: string;
    essential?: boolean;
  }>;
}

// Define conjugation sections with essential marking
const conjugationSections: ConjugationSection[] = [
  {
    id: "basic",
    title: "Basic Forms",
    emoji: "📘",
    forms: [
      { key: "present", label: "Present", essential: true },
      { key: "negative", label: "Negative", essential: true },
      { key: "past", label: "Past", essential: true },
      { key: "pastNegative", label: "Past Negative", essential: true },
      { key: "masuStem", label: "Masu Stem", essential: true },
      { key: "negativeStem", label: "Negative Stem" },
    ],
  },
  {
    id: "polite",
    title: "Polite Forms",
    emoji: "📗",
    forms: [
      { key: "polite", label: "Polite", essential: true },
      { key: "politeNegative", label: "Polite Negative", essential: true },
      { key: "politePast", label: "Polite Past", essential: true },
      { key: "politePastNegative", label: "Polite Past Negative", essential: true },
      { key: "politeVolitional", label: "Polite Volitional" },
    ],
  },
  {
    id: "te-forms",
    title: "Te-Forms",
    emoji: "📙",
    forms: [
      { key: "teForm", label: "Te-form", essential: true },
      { key: "negativeTeForm", label: "Negative Te-form" },
      { key: "naideForm", label: "Naide-form" },
      { key: "adverbialNegative", label: "Adverbial Negative" },
    ],
  },
  {
    id: "conditional",
    title: "Conditional Forms",
    emoji: "📕",
    forms: [
      { key: "provisional", label: "Provisional (ba)", essential: true },
      { key: "provisionalNegative", label: "Provisional Negative" },
      { key: "provisionalNegativeColloquial", label: "Colloquial (nakya)" },
      { key: "conditional", label: "Conditional (tara)", essential: true },
      { key: "conditionalNegative", label: "Conditional Negative" },
    ],
  },
  {
    id: "potential",
    title: "Potential Forms",
    emoji: "📓",
    forms: [
      { key: "potential", label: "Potential", essential: true },
      { key: "potentialNegative", label: "Potential Negative" },
      { key: "potentialPast", label: "Potential Past" },
      { key: "potentialPastNegative", label: "Potential Past Negative" },
      { key: "potentialMasuStem", label: "Potential Masu Stem" },
      { key: "potentialTeForm", label: "Potential Te-form" },
      { key: "potentialPolite", label: "Potential Polite" },
    ],
  },
  {
    id: "passive",
    title: "Passive Forms",
    emoji: "📔",
    forms: [
      { key: "passive", label: "Passive", essential: true },
      { key: "passiveNegative", label: "Passive Negative" },
      { key: "passivePast", label: "Passive Past" },
      { key: "passivePastNegative", label: "Passive Past Negative" },
      { key: "passiveMasuStem", label: "Passive Masu Stem" },
      { key: "passiveTeForm", label: "Passive Te-form" },
      { key: "passivePolite", label: "Passive Polite" },
    ],
  },
  {
    id: "causative",
    title: "Causative Forms",
    emoji: "📒",
    forms: [
      { key: "causative", label: "Causative", essential: true },
      { key: "causativeNegative", label: "Causative Negative" },
      { key: "causativePast", label: "Causative Past" },
      { key: "causativePastNegative", label: "Causative Past Negative" },
      { key: "causativeMasuStem", label: "Causative Masu Stem" },
      { key: "causativeTeForm", label: "Causative Te-form" },
      { key: "causativePolite", label: "Causative Polite" },
    ],
  },
  {
    id: "causative-passive",
    title: "Causative-Passive",
    emoji: "📝",
    forms: [
      { key: "causativePassive", label: "Causative-Passive" },
      { key: "causativePassiveNegative", label: "Causative-Passive Negative" },
      { key: "causativePassivePast", label: "Causative-Passive Past" },
      { key: "causativePassiveTeForm", label: "Causative-Passive Te-form" },
    ],
  },
  {
    id: "tai-forms",
    title: "Tai Forms (Want to)",
    emoji: "💛",
    forms: [
      { key: "taiForm", label: "Tai-form", essential: true },
      { key: "taiNegative", label: "Tai Negative" },
      { key: "taiPast", label: "Tai Past" },
      { key: "taiPastNegative", label: "Tai Past Negative" },
      { key: "taiAdjectiveStem", label: "Tai Adjective Stem" },
      { key: "taiTeForm", label: "Tai Te-form" },
      { key: "taiAdverbial", label: "Tai Adverbial" },
      { key: "taiProvisional", label: "Tai Provisional" },
      { key: "taiProvisionalNegative", label: "Tai Provisional Negative" },
      { key: "taiConditional", label: "Tai Conditional" },
      { key: "taiConditionalNegative", label: "Tai Conditional Negative" },
      { key: "taiObjective", label: "Tai Objective" },
    ],
  },
  {
    id: "volitional-imperative",
    title: "Volitional & Imperative",
    emoji: "💭",
    forms: [
      { key: "volitional", label: "Volitional", essential: true },
      { key: "volitionalNegative", label: "Volitional Negative" },
      { key: "imperativePlain", label: "Imperative Plain" },
      { key: "imperativePolite", label: "Imperative Polite" },
      { key: "imperativeNegative", label: "Imperative Negative" },
    ],
  },
  {
    id: "progressive",
    title: "Progressive Forms",
    emoji: "🔄",
    forms: [
      { key: "progressive", label: "Progressive" },
      { key: "progressiveNegative", label: "Progressive Negative" },
      { key: "progressivePast", label: "Progressive Past" },
      { key: "progressivePastNegative", label: "Progressive Past Negative" },
      { key: "progressivePolite", label: "Progressive Polite" },
    ],
  },
  {
    id: "classical",
    title: "Classical/Formal",
    emoji: "📚",
    forms: [
      { key: "colloquialNegative", label: "Colloquial Negative" },
      { key: "formalNegative", label: "Formal Negative (zu)" },
      { key: "classicalNegative", label: "Classical Negative (nu)" },
      { key: "classicalModifier", label: "Classical Modifier (zaru)" },
    ],
  },
  {
    id: "alternative",
    title: "Alternative & Request",
    emoji: "🎯",
    forms: [
      { key: "alternativeForm", label: "Alternative Form (tari)" },
      { key: "alternativeNegative", label: "Alternative Negative" },
      { key: "request", label: "Request" },
      { key: "requestNegative", label: "Request Negative" },
    ],
  },
  {
    id: "presumptive",
    title: "Presumptive Forms",
    emoji: "💫",
    forms: [
      { key: "presumptive", label: "Presumptive" },
      { key: "presumptiveNegative", label: "Presumptive Negative" },
      { key: "presumptivePolite", label: "Presumptive Polite" },
      { key: "presumptivePoliteNegative", label: "Presumptive Polite Negative" },
    ],
  },
];

// Word Practice Component
interface WordPracticeProps {
  word: JapaneseWord;
  onBack: () => void;
}

function WordPractice({ word, onBack }: WordPracticeProps) {
  const strings = useStrings();
  const [showRules, setShowRules] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic", "polite", "te-forms"])
  );
  const { settings } = useSettings();

  // Generate conjugations using Extended Engine
  const conjugations = ExtendedConjugationEngine.conjugate(word);
  
  // Filter sections based on view mode
  const visibleSections = useMemo(() => {
    if (showComplete) return conjugationSections;
    
    // For essential view, only show sections with essential forms
    return conjugationSections.filter(section =>
      section.forms.some(form => form.essential)
    );
  }, [showComplete]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const playAudio = async (text: string) => {
    await TTSManager.playTextWithSSML(text, 'ja-JP');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
      {/* Header with proper spacing for virtual companion */}
      <header className="px-4 pt-24 pb-4 md:pt-24">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Go back to word list"
          >
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Page Title */}
          <h1 className="text-xl font-bold text-foreground flex-1">
            {word.kanji} - Conjugations
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pb-32 md:pb-8">
        {/* Word Header - Enhanced with colors and TTS */}
        <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/20 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl japanese-text font-bold text-primary">
                  {word.kanji}
                </h2>
                <VocabularyTTSButton 
                  word={word.kanji}
                  kana={word.kana}
                  size="lg"
                  variant="pill"
                />
              </div>
              <div className="text-xl japanese-text text-primary/80 mb-1">
                {word.kana}
              </div>
              <div className="text-muted-foreground font-medium">{word.romaji}</div>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground mb-2">
                {word.type}
              </span>
              <div className="text-sm font-medium text-secondary">{word.jlpt}</div>
            </div>
          </div>
          <div className="text-lg font-medium text-foreground bg-background/50 rounded-lg px-4 py-2">
            {word.meaning}
          </div>
        </div>

        {/* View Toggle and Rules Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-card rounded-full px-4 py-2 shadow-sm">
              <input
                type="checkbox"
                checked={showComplete}
                onChange={(e) => setShowComplete(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium">
                Complete View ({Object.keys(conjugations).length} forms)
              </span>
            </label>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
              {showComplete ? "All Forms" : "Essential Only"}
            </span>
          </div>
          
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 transition-all duration-200 border border-primary/30"
          >
            <span>📚</span>
            <span className="font-medium text-primary">
              {showRules ? "Hide" : "Show"} conjugation rules
            </span>
          </button>
        </div>
        
        {/* Conjugation Rules */}
        {showRules && (
          <div className="bg-info/10 border border-info/20 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Conjugation Rules for {word.type}</h3>
            <p className="text-sm text-muted-foreground">
              {getConjugationRules(word.type)}
            </p>
          </div>
        )}

        {/* Conjugation Sections */}
        <div className="space-y-4">
          {visibleSections.map((section) => {
            const isExpanded = expandedSections.has(section.id);
            const visibleForms = showComplete
              ? section.forms
              : section.forms.filter(form => form.essential);

            if (visibleForms.length === 0) return null;

            return (
              <div
                key={section.id}
                className="bg-card rounded-lg shadow-sm overflow-hidden border border-border/50"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.emoji}</span>
                    <h3 className="text-lg font-semibold">{section.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({visibleForms.length} forms)
                    </span>
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Section Content */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visibleForms.map((form) => {
                        const value = conjugations[form.key];
                        if (!value) return null;

                        return (
                          <div
                            key={form.key}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                {form.label}
                                {form.essential && !showComplete && (
                                  <span className="ml-1 text-primary">★</span>
                                )}
                              </p>
                              <p className="text-lg font-medium japanese-text">{value}</p>
                            </div>
                            <VocabularyTTSButton
                              text={value}
                              language="ja-JP"
                              size="sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={() => {
              setExpandedSections(new Set(conjugationSections.map(s => s.id)));
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={() => {
              setExpandedSections(new Set());
            }}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>
    </div>
  );
}

// Using theme CSS variables directly instead of generating colors

// Enhanced Conjugation Section Component with theme-aware colors
interface ConjugationSectionProps {
  title: string;
  category: "tense" | "forms" | "additional";
  colorScheme: string;
  word: JapaneseWord;
  forms: Array<{ label: string; value: string | undefined }>;
  showRules: boolean;
}

function ConjugationSection({
  title,
  category,
  colorScheme,
  word,
  forms,
  showRules,
}: ConjugationSectionProps) {
  // Use theme-aware classes based on category
  const getCategoryClasses = () => {
    switch (category) {
      case 'tense':
        return 'bg-primary/5 border-primary/20 hover:bg-primary/10';
      case 'forms':
        return 'bg-accent/5 border-accent/20 hover:bg-accent/10';
      case 'additional':
        return 'bg-secondary/5 border-secondary/20 hover:bg-secondary/10';
      default:
        return 'bg-muted/5 border-muted/20 hover:bg-muted/10';
    }
  };

  const getRulesForSection = (sectionTitle: string, wordType: string) => {
    const rules: { [key: string]: { [key: string]: string[] } } = {
      "Tense & Polarity": {
        Ichidan: [
          "• Present: Dictionary form (no change)",
          "• Past: Remove る, add た (食べる → 食べた)",
          "• Negative: Remove る, add ない (食べる → 食べない)",
          "• Past Negative: Remove る, add なかった",
          "• Polite forms: Remove る, add ます/ました/ません/ませんでした",
        ],
        Godan: [
          "• Present: Dictionary form (no change)",
          "• Past: Change final sound + た/だ (書く → 書いた, 読む → 読んだ)",
          "• Negative: Change to あ-column + ない (書く → 書かない)",
          "• Past Negative: あ-column + なかった",
          "• Polite: Change to い-column + ます (書く → 書きます)",
        ],
        Irregular: [
          "• する verbs: する → した/しない/します",
          "• 来る (kuru): 来る → 来た/来ない/来ます",
          "• These must be memorized as they don't follow regular patterns",
        ],
        "i-adjective": [
          "• Present: Dictionary form (美しい)",
          "• Past: Remove い, add かった (美しい → 美しかった)",
          "• Negative: Remove い, add くない (美しい → 美しくない)",
          "• Past Negative: Remove い, add くなかった",
        ],
        "na-adjective": [
          "• Present: Add だ (静か → 静かだ)",
          "• Past: Add だった (静か → 静かだった)",
          "• Negative: Add じゃない (静か → 静かじゃない)",
          "• Polite: Add です/でした instead of だ/だった",
        ],
      },
      Forms: {
        Ichidan: [
          "• Te-form: Remove る, add て (食べる → 食べて)",
          "• Potential: Remove る, add られる (食べる → 食べられる)",
          "• Passive: Remove る, add られる (same as potential)",
          "• Causative: Remove る, add させる (食べる → 食べさせる)",
          "• Imperative: Remove る, add ろ (食べる → 食べろ)",
        ],
        Godan: [
          "• Te-form: Complex rules based on ending sound",
          "  - く/ぐ → いて/いで (書く → 書いて, 泳ぐ → 泳いで)",
          "  - す → して (話す → 話して)",
          "  - つ/う/る → って (待つ → 待って, 買う → 買って)",
          "  - む/ぶ/ぬ → んで (読む → 読んで, 呼ぶ → 呼んで)",
          "• Potential: Change to え-column + る (書く → 書ける)",
          "• Passive: Change to あ-column + れる (書く → 書かれる)",
          "• Causative: Change to あ-column + せる (書く → 書かせる)",
        ],
        Irregular: [
          "• する: して (te-form), できる (potential), される (passive)",
          "• 来る: 来て (te-form), 来られる (potential/passive)",
          "• These forms must be memorized individually",
        ],
      },
      "Additional Forms": {
        Ichidan: [
          "• Tai-form (want to): Remove る, add たい (食べる → 食べたい)",
          "• Conditional: Remove る, add れば (食べる → 食べれば)",
          "• Negative Te-form: Remove る, add なくて",
        ],
        Godan: [
          "• Tai-form: Change to い-column + たい (書く → 書きたい)",
          "• Conditional: Change to え-column + ば (書く → 書けば)",
          "• Volitional: Change to お-column + う (書く → 書こう)",
        ],
        Irregular: [
          "• Tai-form: したい (suru), 来たい (kuru)",
          "• Conditional: すれば (suru), 来れば (kuru)",
          "• Volitional: しよう (suru), 来よう (kuru)",
        ],
      },
    };

    return rules[sectionTitle]?.[wordType] || [];
  };

  return (
    <div
      className={`rounded-xl p-6 border-2 transition-all duration-200 hover:shadow-xl hover:scale-[1.01] ${getCategoryClasses()}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`w-2 h-8 rounded-full ${
            category === 'tense' ? 'bg-gradient-to-b from-primary to-primary/60' : 
            category === 'forms' ? 'bg-gradient-to-b from-accent to-accent/60' : 
            category === 'additional' ? 'bg-gradient-to-b from-secondary to-secondary/60' : 'bg-muted'
          }`}
        />
        <h3 className={`text-lg font-bold ${
          category === 'tense' ? 'text-primary' : 
          category === 'forms' ? 'text-accent' : 
          category === 'additional' ? 'text-secondary' : 'text-foreground'
        }`}>
          ✨ {title}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {forms.map(
          (form) =>
            form.value && (
              <div
                key={form.label}
                className="group flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/60 to-white/40 dark:from-black/30 dark:to-black/20 hover:from-white/80 hover:to-white/60 dark:hover:from-black/40 dark:hover:to-black/30 transition-all duration-200 border border-transparent hover:border-primary/20"
              >
                <span
                  className="text-sm font-medium text-muted-foreground min-w-[120px]"
                >
                  {form.label}:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg japanese-text font-medium text-foreground">
                    {form.value}
                  </span>
                  <VocabularyTTSButton 
                    word={form.value}
                    size="sm"
                    variant="minimal"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
            )
        )}
      </div>

      {showRules && (
        <div
          className="mt-4 pt-4 border-t border-border"
        >
          <div className="text-sm">
            <div className="font-medium mb-2 text-foreground">
              {word.type} Conjugation Rules for {title}:
            </div>
            <div className="space-y-1">
              {getRulesForSection(title, word.type).map((rule, index) => (
                <div
                  key={index}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
