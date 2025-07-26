'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, StudyList, StudyListType, Kanji, Sentence } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import StudyListManager from '@/utils/studyListManager';

interface SaveWordModalProps {
  word: JapaneseWord;
  onClose: () => void;
  onSaveComplete?: () => void;
  itemType?: 'word' | 'kanji' | 'sentence';
}

export function SaveWordModal({ word, onClose, onSaveComplete, itemType = 'word' }: SaveWordModalProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<StudyListType>(itemType === 'sentence' ? 'sentence' : 'flashcard');
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
    return StudyListManager.canAddToList(itemType, word, listType);
  };

  const getValidationMessage = (listType: StudyListType, canAdd: boolean): string => {
    if (!canAdd) {
      if (listType === 'drillable') {
        if (itemType === 'kanji') return `Cannot be added: Kanji cannot be conjugated`;
        if (itemType === 'sentence') return `Cannot be added: Sentences cannot be conjugated`;
        return `Cannot be added: Word cannot be conjugated`;
      }
      if (listType === 'sentence' && itemType !== 'sentence') {
        return `Cannot be added: Only sentences allowed in sentence lists`;
      }
      return `Cannot be added: Incompatible list type`;
    }

    if (listType === 'flashcard') {
      return `Compatible: For flashcard review`;
    }

    if (listType === 'drillable') {
      return `Compatible: For conjugation practice`;
    }

    if (listType === 'sentence') {
      return `Compatible: For sentence study`;
    }

    return `Compatible`;
  };

  const handleSave = async () => {
    if (selectedLists.length === 0 && !newListName.trim()) return;

    try {
      setSaving(true);
      setErrors([]);

      // Create new list if needed
      const listsToSaveTo = [...selectedLists];
      if (newListName.trim() && showCreateNew) {
        try {
          const newList = await StudyListManager.createStudyList({
            name: newListName.trim(),
            type: newListType,
            description: '',
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
          });
          listsToSaveTo.push(newList.id);
        } catch (error) {
          console.error('Error creating new list:', error);
          setErrors(prev => [...prev, 'Failed to create new list']);
        }
      }

      // Save item to selected lists
      let itemToSave: JapaneseWord | Kanji | Sentence;
      
      if (itemType === 'kanji') {
        // Convert JapaneseWord to Kanji format
        itemToSave = {
          id: word.kanji || word.id,
          kanji: word.kanji || word.id,
          meaning: word.meaning || word.english,
          onyomi: word.reading ? [word.reading] : [],
          kunyomi: [],
          jlpt: `N${word.jlptLevel || 5}` as any,
          strokeCount: 1,
          radicals: [],
          components: [],
          frequency: 0
        } as Kanji;
      } else if (itemType === 'sentence') {
        // Convert JapaneseWord to Sentence format
        itemToSave = {
          id: word.id,
          text: word.kanji || word.word || '',
          furigana: '',
          translation: word.english || word.meaning || '',
          jlptLevel: word.jlptLevel || 5,
          tags: word.tags || []
        } as Sentence;
      } else {
        itemToSave = word;
      }
      
      const result = await StudyListManager.addItemToLists(itemToSave, itemType, listsToSaveTo);
      
      if (result.success) {
        onSaveComplete?.();
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
          {itemType === 'sentence' 
            ? `Save Sentence to Lists`
            : itemType === 'kanji' 
            ? `Save "${word.kanji || word.kana}" to Lists`
            : `Save "${word.kanji || word.kana}" to Lists`
          }
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
                <label
                  key={list.id}
                  className={`block cursor-pointer p-3 rounded-lg border transition-colors ${
                    selectedLists.includes(list.id)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-background border-border hover:bg-muted/50'
                  } ${!canAdd ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLists.includes(list.id)}
                      onChange={() => canAdd && handleToggleList(list.id)}
                      disabled={!canAdd}
                      className="mt-1 rounded border-border"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: list.color }}
                        />
                        <span className="font-medium">{list.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({list.type})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getValidationMessage(list.type, canAdd)}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* Create new list section */}
        {!showCreateNew ? (
          <button
            onClick={() => setShowCreateNew(true)}
            className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors mb-4"
          >
            + Create new list
          </button>
        ) : (
          <div className="border border-border rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium mb-3">Create new list:</h4>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="space-y-2">
              <label className="block">
                <input
                  type="radio"
                  name="listType"
                  value="flashcard"
                  checked={newListType === 'flashcard'}
                  onChange={() => setNewListType('flashcard')}
                  className="mr-2"
                />
                <span className="text-sm">
                  Flashcard List
                  <span className="text-xs text-muted-foreground ml-1">
                    (for spaced repetition review)
                  </span>
                </span>
              </label>
              {itemType === 'sentence' && (
                <label className="block">
                  <input
                    type="radio"
                    name="listType"
                    value="sentence"
                    checked={newListType === 'sentence'}
                    onChange={() => setNewListType('sentence')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Sentence List
                    <span className="text-xs text-muted-foreground ml-1">
                      (for sentence study)
                    </span>
                  </span>
                </label>
              )}
              {itemType !== 'sentence' && canAddToList('drillable') && (
                <label className="block">
                  <input
                    type="radio"
                    name="listType"
                    value="drillable"
                    checked={newListType === 'drillable'}
                    onChange={() => setNewListType('drillable')}
                    className="mr-2"
                  />
                  <span className="text-sm">
                    Conjugation List
                    <span className={`text-xs ml-1 ${
                      canAddToList('drillable') ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {canAddToList('drillable') ? '✓ Can be conjugated' : '⚠️ Cannot be conjugated'}
                    </span>
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || (selectedLists.length === 0 && !newListName.trim())}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}