"use client";

import { useState, useEffect, Suspense } from "react";
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
import { useFeature } from "@/hooks/useFeature";
import KanjiManager from "@/utils/kanjiManager";
import StudyListManager from "@/utils/studyListManager";
import KanjiListManager from "@/utils/kanjiListManager";
import KanjiDetailsModal from "@/components/kanji/KanjiDetailsModal";
import { useNotification } from "@/contexts/NotificationContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useStrings } from "@/contexts/LanguageContext";
import { useAnalytics } from "@/hooks/useAnalytics";
import { DesktopContainer } from "@/components/layout/DesktopContainer";

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

function KanjiBrowserContent() {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const { checkAndTrack } = useFeature('kanji_browser');
  const router = useRouter();
  const searchParams = useSearchParams();
  const strings = useStrings();
  const { track } = useAnalytics();

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
  }, []);

  // Handle URL parameters for level focusing
  useEffect(() => {
    const level = searchParams.get("level");

    if (level && ["1", "2", "3", "4", "5"].includes(level)) {
      const jlptLevel = `N${level}` as JLPTLevel;
      setExpandedLevels((prev) => new Set([...prev, jlptLevel]));

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
  }, [searchParams]);


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

    // Track page view for analytics
    track("page_view", {
      page: "kanji_detail",
      kanji: kanji.kanji,
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
          </button>
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
      <DesktopContainer>
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
          </div>

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
          <KanjiDetailsModal
            kanji={modalKanji}
            isOpen={!!modalKanji}
            onClose={() => setModalKanji(null)}
            onSave={() => handleKanjiSave(modalKanji)}
            showSaveButton={true}
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

      </div>
      </DesktopContainer>
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
  const { checkAndTrack } = useFeature('kanji_browser');
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
          {strings.kanjiBrowser?.saveKanjiTitle || "Save Kanji"} "{kanji.kanji}"
        </h3>

        {/* Error messages */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <div className="text-sm text-destructive">
              {errors.map((error, index) => (
                <div key={index}>• {error}</div>
              ))}
            </div>
          </div>
        )}

        {studyLists.length > 0 && (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              {strings.kanjiBrowser?.selectExistingLists || "Select existing lists"}
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
                    className="rounded border-border mt-0.5 text-primary focus:ring-primary"
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
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary/20 text-secondary-foreground"
                        }`}
                      >
                        {list.type}
                      </span>
                    </div>
                    <div
                      className={`text-xs ${
                        canAdd ? "text-green-600 dark:text-green-400" : "text-destructive"
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
              className="rounded border-border text-primary focus:ring-primary"
            />
            <label className="text-sm font-medium text-muted-foreground cursor-pointer">
              {strings.kanjiBrowser?.createNewList || "Create new list"}
            </label>
          </div>

          {showCreateNew && (
            <div className="space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder={strings.kanjiBrowser?.newListNamePlaceholder || "Enter list name"}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={50}
              />

              <div>
                <label className="block text-xs text-muted-foreground mb-2">
                  {strings.kanjiBrowser?.listType || "List type"}
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input hover:bg-muted/50 transition-colors">
                    <input
                      type="radio"
                      name="listType"
                      value="flashcard"
                      checked={newListType === "flashcard"}
                      onChange={(e) =>
                        setNewListType(e.target.value as StudyListType)
                      }
                      className="mt-0.5 w-4 h-4 text-primary focus:ring-primary focus:ring-2 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {strings.kanjiBrowser?.flashcardList || "Flashcard List"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {strings.kanjiBrowser?.flashcardReviewDescription || "For review and memorization"}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {strings.kanjiBrowser?.flashcardPerfectForKanjiStudy || "Perfect for kanji study"}
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
                      className="mt-0.5 w-4 h-4 text-primary focus:ring-primary focus:ring-2 cursor-not-allowed"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {strings.kanjiBrowser?.drillableList || "Drillable List"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {strings.kanjiBrowser?.conjugationPracticeDescription || "For conjugation practice"}
                      </div>
                      <div className="text-xs text-destructive mt-1">
                        {strings.kanjiBrowser?.kanjiCannotBeConjugated || "Kanji cannot be conjugated"}
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
            className="flex-1 px-4 py-2 bg-muted text-foreground border border-border rounded-lg hover:bg-muted/80 transition-colors font-medium"
          >
            {strings.kanjiBrowser?.cancel || "Cancel"}
          </button>
          <button
            onClick={handleSave}
            disabled={
              (selectedLists.length === 0 && !newListName.trim()) || saving
            }
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {saving ? "Saving..." : (strings.kanjiBrowser?.saveKanji || "Save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function KanjiBrowserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <KanjiBrowserContent />
    </Suspense>
  );
}
