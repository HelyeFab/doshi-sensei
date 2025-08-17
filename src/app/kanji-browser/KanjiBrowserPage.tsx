"use client";

import { useState, useEffect } from "react";
import {
  Kanji,
  JLPTLevel,
  KanjiByLevel,
  KanjiList,
  StudyList,
  StudyListType,
} from "@/types";
import { SmartPageHeader } from "@/components/navigation/SmartPageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription2 } from "@/hooks/useSubscription2";
import { useAccess } from "@/hooks/useAccess";
import KanjiManager from "@/utils/kanjiManager";
import StudyListManager from "@/utils/studyListManager";
import KanjiListManager from "@/utils/kanjiListManager";
import KanjiModal from "@/components/kanji/KanjiModal";
import KanjiStudyModal from "@/components/kanji-moods/KanjiStudyModalV2";
import KanjiQuestTutorialModal from "@/components/games/KanjiQuestTutorialModal";
import KanjiLearningSessionModal from "./KanjiLearningSessionModal";
import { useNotification } from "@/contexts/NotificationContext";
import { useKanjiSelection } from "@/contexts/KanjiSelectionContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useStrings } from "@/contexts/LanguageContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BookOpen } from "lucide-react";
import { useKanjiReviews } from "@/hooks/useKanjiReviews";

// Structured Data for Kanji Browser
const kanjiStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Japanese Kanji Browser by JLPT Level",
  description:
    "Browse and study Japanese kanji characters organized by JLPT levels N5 to N1. Learn meanings, readings (onyomi/kunyomi), and save favorites for practice.",
  url: "https://doshisensei.com/kanji-browser",
  educationalLevel: ["Beginner", "Intermediate", "Advanced"],
  learningResourceType: "Reference",
  about: {
    "@type": "Thing",
    name: "Japanese Kanji",
    description:
      "Japanese logographic characters with meanings and readings organized by proficiency level",
  },
  teaches: [
    "Japanese kanji recognition",
    "Kanji meanings and translations",
    "Onyomi and kunyomi readings",
    "JLPT level progression",
    "Kanji study organization",
  ],
  educationalRole: "Student",
  typicalAgeRange: "13-65",
  interactivityType: "Active",
  isAccessibleForFree: true,
  inLanguage: "en",
  keywords: [
    "Japanese kanji",
    "JLPT kanji lists",
    "kanji meanings",
    "kanji readings",
    "Japanese characters",
    "kanji study",
    "onyomi kunyomi",
    "kanji browser",
  ],
};

export default function KanjiBrowserPage() {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { checkAndTrack } = useAccess();
  const { setSelectedKanji } = useKanjiSelection();
  const router = useRouter();
  const searchParams = useSearchParams();
  const strings = useStrings();
  const { track } = useAnalytics();
  const [showInstructions, setShowInstructions] = useState(false);
  const { kanjiInReviews } = useKanjiReviews();

  const [kanjiData, setKanjiData] = useState<KanjiByLevel>({});
  const [loading, setLoading] = useState(true);
  const [loadingLevels, setLoadingLevels] = useState<Set<JLPTLevel>>(new Set());
  const [modalKanji, setModalKanji] = useState<Kanji | null>(null);
  const [savedKanjiSet, setSavedKanjiSet] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<JLPTLevel>>(
    new Set(["N5"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Kanji[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [kanjiLists, setKanjiLists] = useState<KanjiList[]>([]);
  const [showSaveKanjiModal, setShowSaveKanjiModal] = useState(false);
  const [kanjiToSave, setKanjiToSave] = useState<Kanji | null>(null);

  // Study selection state
  const [studySelection, setStudySelection] = useState<Set<string>>(new Set());
  const [showStudyModal, setShowStudyModal] = useState(false);
  const [showKanjiQuestTutorial, setShowKanjiQuestTutorial] = useState(false);
  const [showLearningSessionModal, setShowLearningSessionModal] =
    useState(false);
  const [selectedLevelForLearning, setSelectedLevelForLearning] =
    useState<JLPTLevel | null>(null);
  const { showNotification } = useNotification();

  // JLPT level info
  const levelInfo = {
    N5: {
      name: "N5 (Beginner)",
      color: "bg-green-500",
      description: "Basic kanji for daily use",
    },
    N4: {
      name: "N4 (Elementary)",
      color: "bg-blue-500",
      description: "Elementary level kanji",
    },
    N3: {
      name: "N3 (Intermediate)",
      color: "bg-yellow-500",
      description: "Intermediate level kanji",
    },
    N2: {
      name: "N2 (Upper-Intermediate)",
      color: "bg-orange-500",
      description: "Upper-intermediate kanji",
    },
    N1: {
      name: "N1 (Advanced)",
      color: "bg-red-500",
      description: "Advanced level kanji",
    },
  };

  // Load kanji data on component mount
  useEffect(() => {
    loadKanjiData();
    loadSavedKanji();
    loadKanjiLists();
    loadStudySelection();
  }, []);

  // Handle URL parameters for level focusing
  useEffect(() => {
    const level = searchParams.get("level");
    const mode = searchParams.get("mode");

    if (level && ["1", "2", "3", "4", "5"].includes(level)) {
      const jlptLevel = `N${level}` as JLPTLevel;
      setExpandedLevels((prev) => new Set([...prev, jlptLevel]));

      // Show notification for Kanji Quest mode
      if (mode === "kanji-quest") {
        showNotification({
          title: strings.kanjiBrowser.kanjiQuestMode,
          message: `${strings.kanjiBrowser.selectKanjiFrom} ${levelInfo[jlptLevel].name} ${strings.kanjiBrowser.toBattlePokémon} ${strings.kanjiBrowser.clickCheckboxesToSelect} ${strings.kanjiBrowser.kanji} ${strings.kanjiBrowser.thenClick} ${strings.kanjiBrowser.battleWhenReady}`,
          type: "info",
        });
      }

      // Scroll to the level section after a short delay
      setTimeout(() => {
        const levelElement = document.querySelector(
          `[data-level="${jlptLevel}"]`
        );
        if (levelElement) {
          levelElement.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 500);
    }
  }, [searchParams, showNotification, levelInfo]);

  // Save study selection when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "kanji-study-selection",
        JSON.stringify([...studySelection])
      );
    }
  }, [studySelection]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const loadKanjiData = async () => {
    try {
      setLoading(true);

      // Load only N5 initially for fast initial render
      const n5Data = await KanjiManager.loadKanjiByLevel("N5");
      setKanjiData({ N5: n5Data });
      setLoading(false);

      // Load other levels progressively
      const otherLevels: JLPTLevel[] = ["N4", "N3", "N2", "N1"];
      for (const level of otherLevels) {
        setLoadingLevels((prev) => new Set([...prev, level]));
        const levelData = await KanjiManager.loadKanjiByLevel(level);
        setKanjiData((prev) => ({ ...prev, [level]: levelData }));
        setLoadingLevels((prev) => {
          const newSet = new Set(prev);
          newSet.delete(level);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error loading kanji data:", error);
      setLoading(false);
    }
  };

  const loadSavedKanji = async () => {
    try {
      const savedKanji = await KanjiListManager.getSavedKanji();
      const savedSet = new Set(savedKanji.map((saved) => saved.kanji.kanji));
      setSavedKanjiSet(savedSet);
    } catch (error) {
      console.error("Error loading saved kanji:", error);
    }
  };

  const loadKanjiLists = async () => {
    try {
      const lists = await KanjiListManager.getAllKanjiLists();
      setKanjiLists(lists);
    } catch (error) {
      console.error("Error loading kanji lists:", error);
    }
  };

  const loadStudySelection = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kanji-study-selection");
      if (saved) {
        setStudySelection(new Set(JSON.parse(saved)));
      }
    }
  };

  const toggleStudySelection = (kanji: string) => {
    const newSelection = new Set(studySelection);

    if (newSelection.has(kanji)) {
      newSelection.delete(kanji);
    } else {
      // Check if we've reached the limit of 10
      if (newSelection.size >= 10) {
        const messages = [
          strings.kanjiBrowser.woahThere,
          strings.kanjiBrowser.qualityOverQuantity,
          strings.kanjiBrowser.yourBrainWillThankYou,
          strings.kanjiBrowser.fullStudySession,
          strings.kanjiBrowser.letsAceTheseTenFirst,
        ];
        const randomMessage =
          messages[Math.floor(Math.random() * messages.length)];

        showNotification({
          title: strings.kanjiBrowser.studyLimitReached,
          message: randomMessage,
          type: "info",
        });
        return;
      }
      newSelection.add(kanji);
    }

    setStudySelection(newSelection);
  };

  const performSearch = async () => {
    try {
      setIsSearching(true);
      const results = await KanjiManager.searchKanji(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching kanji:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKanjiClick = (kanji: Kanji) => {
    setModalKanji(kanji);

    // Track kanji view
    track("kanji_viewed", {
      kanji: kanji.character,
      jlptLevel: kanji.jlpt,
      source: "kanji_browser",
    });

  };

  const handleKanjiSave = (kanji: Kanji) => {
    setKanjiToSave(kanji);
    setShowSaveKanjiModal(true);
    setModalKanji(null); // Close the kanji detail modal
  };

  const handleKanjiRemove = async (kanjiCharacter: string) => {
    try {
      await KanjiManager.removeSavedKanji(
        kanjiCharacter,
        user,
        subscription?.plan
      );
      setSavedKanjiSet((prev) => {
        const newSet = new Set(prev);
        newSet.delete(kanjiCharacter);
        return newSet;
      });
    } catch (error) {
      console.error("Error removing kanji:", error);
    }
  };

  const handleSaveKanjiToLists = async (
    kanji: Kanji,
    listIds: string[],
    newListName?: string
  ) => {
    try {
      const listsToSaveTo = [...listIds];

      // Create new list if specified
      if (newListName?.trim()) {
        const newList = await KanjiListManager.createKanjiList(
          newListName,
          undefined,
          user,
          subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save kanji to selected lists
      await KanjiListManager.saveKanjiToLists(kanji, listsToSaveTo);

      // Refresh saved kanji set
      await loadSavedKanji();

      // Refresh kanji lists
      await loadKanjiLists();
    } catch (error) {
      console.error("Error saving kanji to lists:", error);
    }
  };

  const toggleLevel = (level: JLPTLevel) => {
    setExpandedLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  const renderKanjiGrid = (kanji: Kanji[]) => (
    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mt-4">
      {kanji.map((kanjiItem, index) => (
        <div key={`${kanjiItem.kanji}-${index}`} className="relative">
          <button
            onClick={() => handleKanjiClick(kanjiItem)}
            className={`
              relative w-full aspect-square flex items-center justify-center text-2xl font-medium rounded-lg border-2 transition-all hover:scale-105 overflow-hidden
              ${
                savedKanjiSet.has(kanjiItem.kanji)
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border text-card-foreground hover:bg-muted"
              }
            `}
            style={{ fontFamily: '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic Pro", "Meiryo", sans-serif' }}
          >
            {kanjiItem.kanji}

            {/* Saved indicator */}
            {savedKanjiSet.has(kanjiItem.kanji) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
            )}

            {/* Daily Reviews indicator */}
            {kanjiInReviews.has(kanjiItem.kanji) && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center" title="In Daily Reviews">
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>

          {/* Theme-aware corner selection indicator for study - Outside the button */}
          <div
            className={`absolute top-0 left-0 w-3.5 h-3.5 rounded-tl-md rounded-br-lg transition-all cursor-pointer z-10 ${
              studySelection.has(kanjiItem.kanji)
                ? "bg-primary hover:bg-primary/90"
                : "bg-primary/20 hover:bg-primary/30"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              // Toggle study selection
              const newSelection = new Set(studySelection);
              if (newSelection.has(kanjiItem.kanji)) {
                newSelection.delete(kanjiItem.kanji);
              } else if (newSelection.size < 10) {
                newSelection.add(kanjiItem.kanji);
              } else {
                showNotification({
                  title: strings.kanjiBrowser.studyLimitReached,
                  message: strings.kanjiBrowser.studyLimitMessage,
                  type: "info",
                });
              }
              setStudySelection(newSelection);
            }}
          >
            {studySelection.has(kanjiItem.kanji) && (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SmartPageHeader title="Loading..." backHref="/" />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">
              {strings.kanjiBrowser.loadingKanjiData}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SmartPageHeader title="Kanji Browser" backHref="/" />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(kanjiStructuredData),
          }}
        />

        {/* Header with Introduction */}
        <div className="mb-8">
          {/* Kanji Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
              <span className="text-2xl font-bold japanese-text text-primary">
                漢
              </span>
            </div>
          </div>

          {/* Introduction Text */}
          <div className="max-w-3xl mx-auto text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Master Japanese Kanji Step by Step
            </h2>
            <p className="text-muted-foreground mb-4">
              Kanji are the building blocks of written Japanese. With over 2,000
              characters in common use, learning kanji is a journey that
              requires patience and systematic study. Our browser organizes
              kanji by JLPT levels, from beginner (N5) to advanced (N1).
            </p>

            {/* How to Use Dropdown */}
            <div className="mt-4">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>How to use this tool</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showInstructions ? "rotate-180" : ""
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

              {showInstructions && (
                <div className="mt-4 p-5 bg-card border border-border rounded-lg text-left max-w-3xl mx-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">📚 How to Use the Kanji Browser</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">🔍 Browse & Explore</h4>
                      <p className="text-muted-foreground text-sm">
                        Click any kanji to view its meanings, readings (on'yomi and kun'yomi), and stroke order. 
                        Start with N5 level for beginners and progress through N4, N3, N2, to N1 for advanced learners.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-2">📅 Daily Reviews (NEW!)</h4>
                      <p className="text-muted-foreground text-sm">
                        Add kanji to your Daily Reviews for long-term retention using spaced repetition (SRS). 
                        Click any kanji, open Options, and select "Add to Daily Reviews". The system will automatically 
                        schedule reviews at optimal intervals. Look for the blue checkmark (✓) on kanji already in your reviews.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">📖 Study Mode</h4>
                        <p className="text-muted-foreground text-sm">
                          Select up to 10 kanji using the corner checkbox, then click "Study" for an interactive 
                          practice session with multiple-choice questions and instant feedback.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-2">🎓 Learn Mode</h4>
                        <p className="text-muted-foreground text-sm">
                          Click "Learn" on any JLPT level for a structured lesson introducing new kanji with 
                          mnemonics, examples, and guided practice.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        💡 Pro Tip: Combine all three methods! Use Learn for new kanji, Study for practice, 
                        and Daily Reviews for long-term mastery. Aim for 5-10 new kanji per day.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Custom Selection Action Bar - Only show when kanji are selected */}
          {studySelection.size > 0 && (
            <div className="mb-6">
              <div className="bg-card dark:bg-card rounded-2xl shadow-lg border border-border dark:border-border p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Study button - always visible when selection exists */}
                  <button
                    type="button"
                    onClick={() => setShowStudyModal(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>
                      {strings.kanjiBrowser.studyButton || "Study"} ({studySelection.size})
                    </span>
                  </button>

                  {/* Battle button - show when 3+ kanji selected */}
                  {studySelection.size >= 3 && (
                    <button
                      type="button"
                      onClick={() => setShowKanjiQuestTutorial(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm font-medium"
                    >
                      <img src="/pokeball.png" alt="Pokéball" className="w-4 h-4" />
                      <span>
                        {strings.kanjiBrowser.battleButton || "Battle"} ({studySelection.size})
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performSearch();
            }}
            className="relative"
          >
            <input
              type="text"
              placeholder={strings.kanjiBrowser.searchKanjiPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -translate-y-1/2 p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Search"
              style={{ lineHeight: 0 }}
            >
              <img
                src="/flat-icons/root-icons/magnifying-glass.svg"
                alt="Search"
                className="w-6 h-6"
              />
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchQuery.trim() && (
          <div className="mb-8">
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-4">
                {strings.kanjiBrowser.searchResultsTitle}
                {isSearching ? (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({strings.kanjiBrowser.searching})
                  </span>
                ) : (
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({searchResults.length} {strings.kanjiBrowser.found})
                  </span>
                )}
              </h3>
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : searchResults.length > 0 ? (
                renderKanjiGrid(searchResults)
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  {strings.kanjiBrowser.noKanjiFoundMatching} "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {Object.entries(kanjiData).map(([level, kanji]) => (
            <div
              key={level}
              className="bg-card border border-border rounded-lg p-4 text-center"
            >
              <div
                className={`w-8 h-8 ${
                  levelInfo[level as JLPTLevel].color
                } rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold`}
              >
                {level.replace("N", "")}
              </div>
              <div className="text-lg font-semibold text-card-foreground">
                {kanji.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {strings.kanjiBrowser.kanji}
              </div>
            </div>
          ))}
        </div>

        {/* Kanji by Level */}
        <div className="space-y-6 mb-32 md:mb-8 pb-safe">
          {(["N5", "N4", "N3", "N2", "N1"] as JLPTLevel[]).map((level) => {
            const kanji = kanjiData[level] || [];
            const isExpanded = expandedLevels.has(level);
            const info = levelInfo[level];

            return (
              <div
                key={level}
                data-level={level}
                className="bg-card border border-border rounded-lg overflow-hidden"
              >
                <div
                  onClick={() => toggleLevel(level)}
                  className="w-full px-6 py-4 text-left hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex flex-col gap-3">
                    {/* Main header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 ${info.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                        >
                          {level.replace("N", "")}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {info.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {info.description} •{" "}
                            {loadingLevels.has(level)
                              ? "Loading..."
                              : `${kanji.length} ${strings.kanjiBrowser.kanji}`}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        {!loadingLevels.has(level) && kanji.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLevelForLearning(level);
                              setShowLearningSessionModal(true);
                            }}
                            className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>Learn</span>
                          </button>
                        )}
                        <svg
                          className={`w-5 h-5 text-muted-foreground transform transition-transform ${
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
                      </div>
                      {/* Mobile expand arrow only */}
                      <div className="sm:hidden">
                        <svg
                          className={`w-5 h-5 text-muted-foreground transform transition-transform ${
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
                      </div>
                    </div>

                    {/* Mobile Learn button row */}
                    {!loadingLevels.has(level) && kanji.length > 0 && (
                      <div className="sm:hidden flex justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLevelForLearning(level);
                            setShowLearningSessionModal(true);
                          }}
                          className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 w-full max-w-xs justify-center"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Learn</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6">
                    {loadingLevels.has(level) ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="ml-3 text-muted-foreground">
                          Loading {level} kanji...
                        </span>
                      </div>
                    ) : kanji.length > 0 ? (
                      renderKanjiGrid(kanji)
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        {strings.kanjiBrowser.noKanjiAvailableFor} {level}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Kanji Detail Modal */}
        {modalKanji && (
          <KanjiModal
            kanji={modalKanji}
            isOpen={!!modalKanji}
            onClose={() => setModalKanji(null)}
            onSave={() => handleKanjiSave(modalKanji)}
            isSelectedForStudy={studySelection.has(modalKanji.kanji)}
            onToggleStudy={() => toggleStudySelection(modalKanji.kanji)}
          />
        )}

        {/* Save Kanji Modal */}
        {showSaveKanjiModal && kanjiToSave && (
          <SaveKanjiModal
            kanji={kanjiToSave}
            kanjiLists={kanjiLists}
            onClose={() => {
              setShowSaveKanjiModal(false);
              setKanjiToSave(null);
            }}
            onSaved={() => {
              setShowSaveKanjiModal(false);
              setKanjiToSave(null);
            }}
            onSaveToLists={handleSaveKanjiToLists}
          />
        )}

        {/* Kanji Study Modal */}
        {showStudyModal && (
          <KanjiStudyModal
            isOpen={showStudyModal}
            onClose={(completed) => {
              setShowStudyModal(false);
              // Only clear selection if study was completed
              if (completed) {
                setStudySelection(new Set());
                localStorage.removeItem("kanji-study-selection");
              }
            }}
            boardId="kanji-browser-study"
            boardTitle={strings.kanjiBrowser.kanjiStudySession || "Kanji Study Session"}
            kanjiData={kanjiData} // Pass full kanji data for distractors
            kanjiList={Array.from(studySelection).map((kanjiChar) => {
              // Find the full kanji object from our data
              let found: Kanji | undefined;
              for (const level in kanjiData) {
                found = kanjiData[level as JLPTLevel].find(
                  (k) => k.kanji === kanjiChar
                );
                if (found) break;
              }
              // Also check search results if not found
              if (!found) {
                found = searchResults.find((k) => k.kanji === kanjiChar);
              }

              // Transform to KanjiItem format
              if (found) {
                return {
                  char: found.kanji,
                  meaning: found.meaning,
                  readings: {
                    on: found.onyomi || [],
                    kun: found.kunyomi || [],
                  },
                  examples: [], // No examples in our Kanji type
                  difficulty:
                    found.jlpt === "N5"
                      ? 1
                      : found.jlpt === "N4"
                      ? 2
                      : found.jlpt === "N3"
                      ? 3
                      : found.jlpt === "N2"
                      ? 4
                      : 5,
                };
              }

              // Fallback (shouldn't happen)
              return {
                char: kanjiChar,
                meaning: "",
                readings: { on: [], kun: [] },
                examples: [],
                difficulty: 1,
              };
            })}
          />
        )}

        {/* Kanji Learning Session Modal */}
        {showLearningSessionModal && selectedLevelForLearning && (
          <KanjiLearningSessionModal
            isOpen={showLearningSessionModal}
            onClose={() => {
              setShowLearningSessionModal(false);
              setSelectedLevelForLearning(null);
            }}
            level={selectedLevelForLearning}
            kanjiData={kanjiData[selectedLevelForLearning] || []}
            userId={user?.uid || "guest"}
          />
        )}

        {/* Kanji Quest Tutorial Modal */}
        <KanjiQuestTutorialModal
          isOpen={showKanjiQuestTutorial}
          onClose={() => {
            setShowKanjiQuestTutorial(false);
          }}
          onStart={async () => {
            setShowKanjiQuestTutorial(false);

            // Store selected kanji in KanjiSelectionContext
            const selectedKanjiData = Array.from(studySelection)
              .map((k, index) => {
                for (const [level, kanjiList] of Object.entries(kanjiData)) {
                  const found = kanjiList.find((kanji) => kanji.kanji === k);
                  if (found) {
                    return {
                      id: `custom-${index}`,
                      character: found.kanji,
                      meanings: found.meaning.split(",").map((m) => m.trim()),
                      on_readings: found.onyomi || [],
                      kun_readings: found.kunyomi || [],
                      jlpt: parseInt(level.replace("N", "")),
                      vocabulary: [],
                    };
                  }
                }
                return null;
              })
              .filter(Boolean);

            setSelectedKanji(selectedKanjiData);

            // Add a small delay to ensure context is updated before navigation
            await new Promise((resolve) => setTimeout(resolve, 100));

            router.push("/games?mode=kanji-quest&selection=custom");
          }}
        />
      </div>
    </div>
  );
}

interface SaveKanjiModalProps {
  kanji: Kanji;
  kanjiLists: KanjiList[];
  onClose: () => void;
  onSaved: () => void;
  onSaveToLists: (
    kanji: Kanji,
    listIds: string[],
    newListName?: string
  ) => Promise<void>;
}

function SaveKanjiModal({
  kanji,
  kanjiLists,
  onClose,
  onSaved,
  onSaveToLists,
}: SaveKanjiModalProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { checkAndTrack } = useAccess();
  const strings = useStrings();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState<StudyListType>("flashcard");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Load unified study lists
  useEffect(() => {
    const loadStudyLists = async () => {
      try {
        const lists = await StudyListManager.getAllStudyLists();
        setStudyLists(lists);
      } catch (error) {
        console.error("Error loading study lists:", error);
      }
    };
    loadStudyLists();
  }, []);

  const handleToggleList = (listId: string) => {
    setSelectedLists((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const canAddToList = (listType: StudyListType): boolean => {
    return StudyListManager.canAddToList("kanji", kanji, listType);
  };

  const getValidationMessage = (
    listType: StudyListType,
    canAdd: boolean
  ): string => {
    if (!canAdd) {
      if (listType === "drillable") {
        return `${strings.listCompatibility.incompatible}: ${strings.listCompatibility.kanjiCannotConjugate}`;
      }
      return `${strings.listCompatibility.incompatible}: ${strings.listCompatibility.sentencesOnly}`;
    }

    if (listType === "flashcard") {
      return `${strings.listCompatibility.compatible}: ${strings.listCompatibility.flashcardReview}`;
    }

    return `${strings.listCompatibility.compatible}: ${strings.listCompatibility.conjugationPractice}`;
  };

  const handleSave = async () => {
    if (selectedLists.length === 0 && !newListName.trim()) return;

    try {
      setSaving(true);
      setErrors([]);

      const listsToSaveTo = [...selectedLists];

      // Create new list if specified
      if (newListName.trim()) {
        const newList = await StudyListManager.createStudyList(
          newListName,
          newListType,
          `Created for saving ${kanji.kanji}`,
          user,
          subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save kanji to selected lists using new unified system
      const result = await StudyListManager.addItemToLists(
        kanji,
        "kanji",
        listsToSaveTo,
        user,
        subscription?.status
      );

      if (result.success) {
        onSaved();
        onClose();
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error("Error saving kanji:", err);
      setErrors(["Failed to save kanji to lists"]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          {strings.kanjiBrowser.saveKanjiTitle} "{kanji.kanji}"
        </h3>

        {/* Error messages */}
        {errors.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="text-sm text-red-400">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}

        {studyLists.length > 0 && (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              {strings.kanjiBrowser.selectExistingLists}
            </h4>
            {studyLists.map((list) => {
              const canAdd = canAddToList(list.type);
              return (
                <label
                  key={list.id}
                  className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                    canAdd ? "hover:bg-muted/50" : "opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={() => canAdd && handleToggleList(list.id)}
                    disabled={!canAdd}
                    className="rounded border-border mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: list.color }}
                      ></div>
                      <span className="text-sm text-foreground">
                        {list.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({list.itemIds.length} {strings.kanjiBrowser.items})
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          list.type === "drillable"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {list.type}
                      </span>
                    </div>
                    <div
                      className={`text-xs ${
                        canAdd ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {getValidationMessage(list.type, canAdd)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={showCreateNew}
              onChange={(e) => setShowCreateNew(e.target.checked)}
              className="rounded border-border"
            />
            <label className="text-sm font-medium text-muted-foreground cursor-pointer">
              {strings.kanjiBrowser.createNewList}
            </label>
          </div>

          {showCreateNew && (
            <div className="space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={strings.kanjiBrowser.newListNamePlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={50}
              />

              <div>
                <label className="block text-xs text-muted-foreground mb-2">
                  {strings.kanjiBrowser.listType}
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input">
                    <input
                      type="radio"
                      name="listType"
                      value="flashcard"
                      checked={newListType === "flashcard"}
                      onChange={(e) =>
                        setNewListType(e.target.value as StudyListType)
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {strings.kanjiBrowser.flashcardList}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {strings.kanjiBrowser.flashcardReviewDescription}
                      </div>
                      <div className="text-xs text-green-400 mt-1">
                        {strings.kanjiBrowser.flashcardPerfectForKanjiStudy}
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input opacity-60">
                    <input
                      type="radio"
                      name="listType"
                      value="drillable"
                      checked={newListType === "drillable"}
                      onChange={(e) =>
                        setNewListType(e.target.value as StudyListType)
                      }
                      disabled={true}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {strings.kanjiBrowser.drillableList}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {strings.kanjiBrowser.conjugationPracticeDescription}
                      </div>
                      <div className="text-xs text-red-400 mt-1">
                        {strings.kanjiBrowser.kanjiCannotBeConjugated}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            {strings.kanjiBrowser.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={
              (selectedLists.length === 0 && !newListName.trim()) || saving
            }
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : strings.kanjiBrowser.saveKanji}
          </button>
        </div>
      </div>
    </div>
  );
}
