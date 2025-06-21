'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JapaneseWord, WordList, StudyList, StudyListType } from '@/types';
import { searchWords } from '@/utils/api';
import { strings } from '@/config/strings';
import { PageHeader } from '@/components/PageHeader';
import StudyListManager from '@/utils/studyListManager';
import WordListManager from '@/utils/wordLists';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { TTSManager } from '@/utils/tts';
import CompanionTrigger from '@/components/CompanionTrigger';

export default function VocabularyPage() {
  const [wordLists, setWordLists] = useState<WordList[]>([]);
  const [selectedList, setSelectedList] = useState<WordList | null>(null);
  const [listWords, setListWords] = useState<JapaneseWord[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<JapaneseWord[]>([]);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<JapaneseWord | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [showSaveWordModal, setShowSaveWordModal] = useState(false);
  const [wordToSave, setWordToSave] = useState<JapaneseWord | null>(null);

  useEffect(() => {
    loadWordLists();
  }, []);

  const loadWordLists = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load unified study lists and convert them to legacy format for compatibility
      const studyLists = await StudyListManager.getAllStudyLists();
      const legacyWordLists: WordList[] = studyLists.map(studyList => ({
        id: studyList.id,
        name: studyList.name,
        description: studyList.description,
        wordIds: studyList.itemIds,
        createdAt: studyList.createdAt,
        updatedAt: studyList.updatedAt,
        color: studyList.color,
        isConjugable: studyList.type === 'drillable'
      }));
      setWordLists(legacyWordLists);
    } catch (err) {
      setError('Failed to load word lists');
      console.error('Error loading word lists:', err);
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
      const searchResults = await searchWords(term, 30);

      setCurrentSearchResults(searchResults);
      setCurrentSearchTerm(term);
      setShowSearchResults(true);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error('Error searching words:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleListClick = async (list: WordList) => {
    try {
      setSelectedList(list);
      // Use the unified system to get words from the list
      const { words } = await StudyListManager.getItemsInList(list.id);
      setListWords(words);
      setShowSearchResults(false);
    } catch (err) {
      console.error('Error loading list words:', err);
    }
  };

  const handleBackToLists = () => {
    setSelectedList(null);
    setListWords([]);
    setShowSearchResults(false);
    setCurrentSearchResults([]);
    setCurrentSearchTerm('');
    setSearchTerm('');
  };

  const handleWordClick = (word: JapaneseWord) => {
    setSelectedWord(word);
  };

  const handleCloseModal = () => {
    setSelectedWord(null);
  };

  const handleSaveWordClick = (word: JapaneseWord) => {
    setWordToSave(word);
    setShowSaveWordModal(true);
  };

  const handleRemoveWordFromList = async (wordId: string) => {
    if (!selectedList) return;

    try {
      // Use the unified system to remove word from list
      await StudyListManager.removeItemFromList(wordId, selectedList.id);
      // Refresh list words using unified system
      const { words } = await StudyListManager.getItemsInList(selectedList.id);
      setListWords(words);
    } catch (err) {
      console.error('Error removing word from list:', err);
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this list? This action cannot be undone.')) {
      return;
    }

    try {
      // Use the unified system to delete list
      await StudyListManager.deleteStudyList(listId);
      await loadWordLists();

      // If we're currently viewing the deleted list, go back to lists view
      if (selectedList?.id === listId) {
        handleBackToLists();
      }
    } catch (err) {
      console.error('Error deleting list:', err);
    }
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
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <PageHeader title={strings.vocab.title} />

        <main className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-6 text-center">
          Search and save words to your custom lists
        </p>

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
        </form>

        {/* Show Current Search Results */}
        {showSearchResults && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Search Results for "{currentSearchTerm}"
              </h3>
              <button
                onClick={handleBackToLists}
                className="text-primary hover:text-primary/80 transition-colors text-sm"
              >
                ← Back to Lists
              </button>
            </div>
            {currentSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {currentSearchResults.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    onWordClick={() => handleWordClick(word)}
                    onSaveClick={() => handleSaveWordClick(word)}
                    showSaveButton={true}
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

        {/* Show Selected List Words */}
        {selectedList && !showSearchResults && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedList.color }}
                ></div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedList.name}
                </h3>
                <span className="text-sm text-muted-foreground">
                  ({listWords.length} words)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDeleteList(selectedList.id)}
                  className="text-red-400 hover:text-red-300 transition-colors text-sm"
                >
                  Delete List
                </button>
                <button
                  onClick={handleBackToLists}
                  className="text-primary hover:text-primary/80 transition-colors text-sm"
                >
                  ← Back to Lists
                </button>
              </div>
            </div>
            {listWords.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {listWords.map((word) => (
                  <WordCard
                    key={word.id}
                    word={word}
                    onWordClick={() => handleWordClick(word)}
                    onRemoveClick={() => handleRemoveWordFromList(word.id)}
                    showRemoveButton={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No words in this list yet</p>
              </div>
            )}
          </div>
        )}

        {/* Word Lists */}
        {!showSearchResults && !selectedList && (
          <>
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading word lists...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadWordLists}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {strings.common.retry}
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="mb-32 md:mb-8 pb-safe">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-foreground">My Word Lists</h2>
                  <button
                    onClick={() => setShowCreateListModal(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    + Create List
                  </button>
                </div>

                {wordLists.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-lg font-medium text-foreground mb-2">No Word Lists Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first list to start saving Japanese words!</p>
                    <button
                      onClick={() => setShowCreateListModal(true)}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                    >
                      Create Your First List
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {wordLists.map((list) => (
                      <ListPill
                        key={list.id}
                        list={list}
                        onClick={() => handleListClick(list)}
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
            onSave={() => handleSaveWordClick(selectedWord)}
          />
        )}

        {/* Create List Modal */}
        {showCreateListModal && (
          <CreateListModal
            onClose={() => setShowCreateListModal(false)}
            onCreated={loadWordLists}
          />
        )}

        {/* Save Word Modal */}
        {showSaveWordModal && wordToSave && (
          <SaveWordModal
            word={wordToSave}
            wordLists={wordLists}
            onClose={() => {
              setShowSaveWordModal(false);
              setWordToSave(null);
            }}
            onSaved={loadWordLists}
          />
        )}

        {/* Search Loading Overlay */}
        {searching && (
          <SearchLoadingOverlay searchTerm={currentSearchTerm || searchTerm} />
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

interface ListPillProps {
  list: WordList;
  onClick: () => void;
}

function ListPill({ list, onClick }: ListPillProps) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-primary/50 transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: `${list.color}20`, borderColor: `${list.color}60` }}
    >
      <div
        className="w-3 h-3 rounded-full"
        style={{ backgroundColor: list.color }}
      ></div>
      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
        {list.name}
      </span>
      <span className="text-xs text-muted-foreground">
        ({list.wordIds.length})
      </span>
    </button>
  );
}

interface WordCardProps {
  word: JapaneseWord;
  onWordClick: () => void;
  onSaveClick?: () => void;
  onRemoveClick?: () => void;
  showSaveButton?: boolean;
  showRemoveButton?: boolean;
}

function WordCard({ word, onWordClick, onSaveClick, onRemoveClick, showSaveButton, showRemoveButton }: WordCardProps) {
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
    <div className="bg-card border border-border rounded-lg p-4 hover:bg-muted transition-colors group relative">
      <div
        onClick={onWordClick}
        className="cursor-pointer"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="text-2xl japanese-text font-medium text-card-foreground mb-1">
              {word.kanji}
            </div>
            <div className="text-lg japanese-text text-muted-foreground mb-1">
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
            {word.frequency && (
              <div className={`text-xs mt-1 ${getFrequencyColor(word.frequency)}`}>
                ★ {word.frequency >= 80 ? 'High' : word.frequency >= 50 ? 'Med' : 'Low'}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-2">
          {word.meaning.length > 60 ? `${word.meaning.substring(0, 60)}...` : word.meaning}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
        {showSaveButton && onSaveClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveClick();
            }}
            className="flex-1 px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
          >
            Save to List
          </button>
        )}
        {showRemoveButton && onRemoveClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveClick();
            }}
            className="flex-1 px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

interface CreateListModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateListModal({ onClose, onCreated }: CreateListModalProps) {
  const { user } = useAuth();
  const { userSubscription } = useSubscription();
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!listName.trim()) return;

    try {
      setCreating(true);
      console.log('🔄 Creating word list with unified system...', {
        userUID: user?.uid,
        subscriptionStatus: userSubscription?.subscription?.status,
        canSync: userSubscription?.limits?.canSync
      });

      // Use the unified StudyListManager system instead of the old WordListManager
      await StudyListManager.createStudyList(
        listName,
        'flashcard', // Default to flashcard type for simple word lists
        description,
        user,
        userSubscription?.subscription?.status
      );
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating list:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Create New List</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., JLPT N5 Verbs, Cooking Terms"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={50}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this list..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!listName.trim() || creating}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create List'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface SaveWordModalProps {
  word: JapaneseWord;
  wordLists: WordList[];
  onClose: () => void;
  onSaved: () => void;
}

function SaveWordModal({ word, wordLists, onClose, onSaved }: SaveWordModalProps) {
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
    return StudyListManager.canAddToList('word', word, listType);
  };

  const getValidationMessage = (listType: StudyListType): string => {
    if (listType === 'drillable') {
      const canAdd = StudyListManager.canAddToList('word', word, listType);
      return canAdd ? 'Compatible: Can be used for conjugation drills' : 'Not compatible: Only verbs and adjectives can be conjugated';
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
          `Created for saving ${word.kanji}`,
          user,
          userSubscription?.subscription?.status
        );
        listsToSaveTo.push(newList.id);
      }

      // Save word to selected lists using new unified system
      const result = await StudyListManager.addItemToLists(
        word,
        'word',
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
      console.error('Error saving word:', err);
      setErrors(['Failed to save word to lists']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Save "{word.kanji}" to Lists
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
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 cursor-pointer p-2 rounded-lg border transition-colors ${
                    canAddToList('drillable') ? 'border-input' : 'border-input opacity-60'
                  }`}>
                    <input
                      type="radio"
                      name="listType"
                      value="drillable"
                      checked={newListType === 'drillable'}
                      onChange={(e) => setNewListType(e.target.value as StudyListType)}
                      disabled={!canAddToList('drillable')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-foreground">Drillable List</div>
                      <div className="text-xs text-muted-foreground">For conjugation practice (verbs & adjectives only)</div>
                      {!canAddToList('drillable') && (
                        <div className="text-xs text-red-400 mt-1">⚠️ This word cannot be conjugated</div>
                      )}
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
            {saving ? 'Saving...' : 'Save Word'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WordModalProps {
  word: JapaneseWord;
  onClose: () => void;
  onSave: () => void;
}

function WordModal({ word, onClose, onSave }: WordModalProps) {
  const router = useRouter();
  const [showExamples, setShowExamples] = useState(false);

  const handlePracticeClick = () => {
    sessionStorage.setItem('selectedWord', JSON.stringify(word));
    router.push('/practice');
    onClose();
  };

  const handleDrillClick = () => {
    sessionStorage.setItem('drillWord', JSON.stringify(word));
    router.push('/drill');
    onClose();
  };

  // TTS function
  const handlePlayTTS = async (text: string) => {
    try {
      await TTSManager.speak(text);
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

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
          <div className="flex gap-2">
            <button
              onClick={onSave}
              className="px-3 py-1.5 text-sm bg-primary/10 text-primary border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
            >
              Save to List
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Word Information */}
          <div className="bg-background/50 border border-border rounded-lg p-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Kanji:</span>
                <div className="text-3xl japanese-text font-medium text-card-foreground mt-1">
                  {word.kanji}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Reading:</span>
                <div className="flex items-center gap-3 mt-1">
                  <div className="text-xl japanese-text text-card-foreground">
                    {word.kana} ({word.romaji})
                  </div>
                  <button
                    onClick={() => handlePlayTTS(word.kana)}
                    className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-600"
                    title={`Play pronunciation: ${word.kana}`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">English:</span>
                <div className="text-base text-card-foreground mt-1">
                  {word.meaning}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">Part of Speech:</span>
                <div className="text-sm text-card-foreground mt-1">
                  {word.type}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-muted-foreground">JLPT Level:</span>
                <div className="text-sm text-card-foreground mt-1">
                  {word.jlpt}
                </div>
              </div>
            </div>
          </div>

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
