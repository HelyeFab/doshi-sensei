'use client';

import { useState, useEffect } from 'react';
import { Kanji, JLPTLevel, KanjiByLevel, KanjiList, StudyList, StudyListType } from '@/types';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import KanjiManager from '@/utils/kanjiManager';
import StudyListManager from '@/utils/studyListManager';
import KanjiListManager from '@/utils/kanjiListManager';
import KanjiModal from '@/components/kanji/KanjiModal';
import CompanionTrigger from '@/components/CompanionTrigger';

// Structured Data for Kanji Browser
const kanjiStructuredData = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "name": "Japanese Kanji Browser by JLPT Level",
  "description": "Browse and study Japanese kanji characters organized by JLPT levels N5 to N1. Learn meanings, readings (onyomi/kunyomi), and save favorites for practice.",
  "url": "https://doshisensei.com/kanji-browser",
  "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
  "learningResourceType": "Reference",
  "about": {
    "@type": "Thing",
    "name": "Japanese Kanji",
    "description": "Japanese logographic characters with meanings and readings organized by proficiency level"
  },
  "teaches": [
    "Japanese kanji recognition",
    "Kanji meanings and translations",
    "Onyomi and kunyomi readings",
    "JLPT level progression",
    "Kanji study organization"
  ],
  "educationalRole": "Student",
  "typicalAgeRange": "13-65",
  "interactivityType": "Active",
  "isAccessibleForFree": true,
  "inLanguage": "en",
  "keywords": [
    "Japanese kanji",
    "JLPT kanji lists",
    "kanji meanings",
    "kanji readings",
    "Japanese characters",
    "kanji study",
    "onyomi kunyomi",
    "kanji browser"
  ]
};

export default function KanjiBrowserPage() {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();

  const [kanjiData, setKanjiData] = useState<KanjiByLevel>({});
  const [loading, setLoading] = useState(true);
  const [selectedKanji, setSelectedKanji] = useState<Kanji | null>(null);
  const [savedKanjiSet, setSavedKanjiSet] = useState<Set<string>>(new Set());
  const [expandedLevels, setExpandedLevels] = useState<Set<JLPTLevel>>(new Set(['N5']));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Kanji[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [kanjiLists, setKanjiLists] = useState<KanjiList[]>([]);
  const [showSaveKanjiModal, setShowSaveKanjiModal] = useState(false);
  const [kanjiToSave, setKanjiToSave] = useState<Kanji | null>(null);

  // JLPT level info
  const levelInfo = {
    'N5': { name: 'N5 (Beginner)', color: 'bg-green-500', description: 'Basic kanji for daily use' },
    'N4': { name: 'N4 (Elementary)', color: 'bg-blue-500', description: 'Elementary level kanji' },
    'N3': { name: 'N3 (Intermediate)', color: 'bg-yellow-500', description: 'Intermediate level kanji' },
    'N2': { name: 'N2 (Upper-Intermediate)', color: 'bg-orange-500', description: 'Upper-intermediate kanji' },
    'N1': { name: 'N1 (Advanced)', color: 'bg-red-500', description: 'Advanced level kanji' }
  };

  // Load kanji data on component mount
  useEffect(() => {
    loadKanjiData();
    loadSavedKanji();
    loadKanjiLists();
  }, []);

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
      const data = await KanjiManager.loadAllKanji();
      setKanjiData(data);
    } catch (error) {
      console.error('Error loading kanji data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedKanji = async () => {
    try {
      const savedKanji = await KanjiListManager.getSavedKanji();
      const savedSet = new Set(savedKanji.map(saved => saved.kanji.kanji));
      setSavedKanjiSet(savedSet);
    } catch (error) {
      console.error('Error loading saved kanji:', error);
    }
  };

  const loadKanjiLists = async () => {
    try {
      const lists = await KanjiListManager.getAllKanjiLists();
      setKanjiLists(lists);
    } catch (error) {
      console.error('Error loading kanji lists:', error);
    }
  };

  const performSearch = async () => {
    try {
      setIsSearching(true);
      const results = await KanjiManager.searchKanji(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching kanji:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKanjiClick = (kanji: Kanji) => {
    setSelectedKanji(kanji);
  };

  const handleKanjiSave = (kanji: Kanji) => {
    setKanjiToSave(kanji);
    setShowSaveKanjiModal(true);
    setSelectedKanji(null); // Close the kanji detail modal
  };

  const handleKanjiRemove = async (kanjiCharacter: string) => {
    try {
      await KanjiManager.removeSavedKanji(kanjiCharacter, user, userSubscription?.subscription.plan);
      setSavedKanjiSet(prev => {
        const newSet = new Set(prev);
        newSet.delete(kanjiCharacter);
        return newSet;
      });
    } catch (error) {
      console.error('Error removing kanji:', error);
    }
  };

  const handleSaveKanjiToLists = async (kanji: Kanji, listIds: string[], newListName?: string) => {
    try {
      let listsToSaveTo = [...listIds];

      // Create new list if specified
      if (newListName?.trim()) {
        const newList = await KanjiListManager.createKanjiList(
          newListName,
          undefined,
          user,
          userSubscription?.subscription?.status
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
      console.error('Error saving kanji to lists:', error);
    }
  };

  const toggleLevel = (level: JLPTLevel) => {
    setExpandedLevels(prev => {
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
        <button
          key={`${kanjiItem.kanji}-${index}`}
          onClick={() => handleKanjiClick(kanjiItem)}
          className={`
            relative aspect-square flex items-center justify-center text-2xl font-medium rounded-lg border-2 transition-all hover:scale-105
            ${savedKanjiSet.has(kanjiItem.kanji)
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-card border-border text-card-foreground hover:bg-muted'
            }
          `}
        >
          {kanjiItem.kanji}
          {savedKanjiSet.has(kanjiItem.kanji) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"></div>
          )}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading kanji data...</p>
        </div>
      </div>
    );
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
        <CompanionTrigger />
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 min-h-screen">
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(kanjiStructuredData),
          }}
        />

        {/* Header */}
        <div className="mb-8">
          <PageHeader title="漢字 Kanji Browser" />
          <p className="text-muted-foreground text-center mt-2">
            Browse Japanese kanji organized by JLPT levels. Click any kanji to see details and save favorites.
          </p>
        </div>

      {/* Search Bar */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search kanji by character, meaning, or reading..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-card-foreground mb-4">
              Search Results
              {isSearching ? (
                <span className="ml-2 text-sm text-muted-foreground">(searching...)</span>
              ) : (
                <span className="ml-2 text-sm text-muted-foreground">({searchResults.length} found)</span>
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
                No kanji found matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {Object.entries(kanjiData).map(([level, kanji]) => (
          <div key={level} className="bg-card border border-border rounded-lg p-4 text-center">
            <div className={`w-8 h-8 ${levelInfo[level as JLPTLevel].color} rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold`}>
              {level.replace('N', '')}
            </div>
            <div className="text-lg font-semibold text-card-foreground">{kanji.length}</div>
            <div className="text-xs text-muted-foreground">kanji</div>
          </div>
        ))}
      </div>

      {/* Kanji by Level */}
      <div className="space-y-6 mb-32 md:mb-8 pb-safe">
        {(['N5', 'N4', 'N3', 'N2', 'N1'] as JLPTLevel[]).map((level) => {
          const kanji = kanjiData[level] || [];
          const isExpanded = expandedLevels.has(level);
          const info = levelInfo[level];

          return (
            <div key={level} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleLevel(level)}
                className="w-full px-6 py-4 text-left hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${info.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                      {level.replace('N', '')}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-card-foreground">{info.name}</h3>
                      <p className="text-sm text-muted-foreground">{info.description} • {kanji.length} kanji</p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-muted-foreground transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6">
                  {kanji.length > 0 ? (
                    renderKanjiGrid(kanji)
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No kanji available for {level}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanji Detail Modal */}
      {selectedKanji && (
        <KanjiModal
          kanji={selectedKanji}
          isOpen={!!selectedKanji}
          onClose={() => setSelectedKanji(null)}
          onSave={() => handleKanjiSave(selectedKanji)}
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
    </>
  );
}

interface SaveKanjiModalProps {
  kanji: Kanji;
  kanjiLists: KanjiList[];
  onClose: () => void;
  onSaved: () => void;
  onSaveToLists: (kanji: Kanji, listIds: string[], newListName?: string) => Promise<void>;
}

function SaveKanjiModal({ kanji, kanjiLists, onClose, onSaved, onSaveToLists }: SaveKanjiModalProps) {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<StudyListType>('flashcard');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Load unified study lists
  useEffect(() => {
    const loadStudyLists = async () => {
      try {
        const lists = await StudyListManager.getAllStudyLists();
        setStudyLists(lists);
      } catch (error) {
        console.error('Error loading study lists:', error);
      }
    };
    loadStudyLists();
  }, []);

  const handleToggleList = (listId: string) => {
    setSelectedLists(prev =>
      prev.includes(listId)
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const canAddToList = (listType: StudyListType): boolean => {
    return StudyListManager.canAddToList('kanji', kanji, listType);
  };

  const getValidationMessage = (listType: StudyListType): string => {
    if (listType === 'drillable') {
      return 'Not compatible: Kanji cannot be conjugated (use flashcard lists instead)';
    }
    return 'Compatible: Can be used for flashcard review';
  };

  const handleSave = async () => {
    if (selectedLists.length === 0 && !newListName.trim()) return;

    try {
      setSaving(true);
      setErrors([]);

      let listsToSaveTo = [...selectedLists];

      // Create new list if specified
      if (newListName.trim()) {
        const newList = await StudyListManager.createStudyList(
          newListName,
          newListType,
          `Created for saving ${kanji.kanji}`,
          user,
          userSubscription?.subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save kanji to selected lists using new unified system
      const result = await StudyListManager.addItemToLists(
        kanji,
        'kanji',
        listsToSaveTo,
        user,
        userSubscription?.subscription?.status
      );

      if (result.success) {
        onSaved();
        onClose();
      } else {
        setErrors(result.errors);
      }
    } catch (err) {
      console.error('Error saving kanji:', err);
      setErrors(['Failed to save kanji to lists']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Save "{kanji.kanji}" to Lists
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
            <h4 className="text-sm font-medium text-muted-foreground">Select existing lists:</h4>
            {studyLists.map((list) => {
              const canAdd = canAddToList(list.type);
              return (
                <label key={list.id} className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors ${
                  canAdd ? 'hover:bg-muted/50' : 'opacity-60'
                }`}>
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
                      <span className="text-sm text-foreground">{list.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({list.itemIds.length} items)
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        list.type === 'drillable' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {list.type}
                      </span>
                    </div>
                    <div className={`text-xs ${canAdd ? 'text-green-400' : 'text-red-400'}`}>
                      {getValidationMessage(list.type)}
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
              Create new list
            </label>
          </div>

          {showCreateNew && (
            <div className="space-y-3">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name..."
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                maxLength={50}
              />

              <div>
                <label className="block text-xs text-muted-foreground mb-2">List Type:</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input">
                    <input
                      type="radio"
                      name="listType"
                      value="flashcard"
                      checked={newListType === 'flashcard'}
                      onChange={(e) => setNewListType(e.target.value as StudyListType)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Flashcard List</div>
                      <div className="text-xs text-muted-foreground">For memorization and review (accepts any content)</div>
                      <div className="text-xs text-green-400 mt-1">✓ Perfect for kanji study</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-2 rounded-lg border border-input opacity-60">
                    <input
                      type="radio"
                      name="listType"
                      value="drillable"
                      checked={newListType === 'drillable'}
                      onChange={(e) => setNewListType(e.target.value as StudyListType)}
                      disabled={true}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Drillable List</div>
                      <div className="text-xs text-muted-foreground">For conjugation practice (verbs & adjectives only)</div>
                      <div className="text-xs text-red-400 mt-1">⚠️ Kanji cannot be conjugated</div>
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
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={(selectedLists.length === 0 && !newListName.trim()) || saving}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Kanji'}
          </button>
        </div>
      </div>
    </div>
  );
}
