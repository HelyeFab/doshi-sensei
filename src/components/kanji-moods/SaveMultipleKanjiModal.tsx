'use client';

import { useState, useEffect } from 'react';
import { JapaneseWord, StudyList, StudyListType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import StudyListManager from '@/utils/studyListManager';

interface SaveMultipleKanjiModalProps {
  items: JapaneseWord[];
  onClose: () => void;
  onSaveComplete?: () => void;
}

export function SaveMultipleKanjiModal({ items, onClose, onSaveComplete }: SaveMultipleKanjiModalProps) {
  const { user } = useAuth();
  const strings = useStrings();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListType, setNewListType] = useState<StudyListType>('flashcard');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

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

  const handleSave = async () => {
    if (selectedLists.length === 0 && !newListName.trim()) return;

    try {
      setSaving(true);
      setErrors([]);
      setSaveProgress({ current: 0, total: items.length });

      // Create new list if needed
      let listsToSaveTo = [...selectedLists];
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

      // Save all kanji to selected lists
      let successCount = 0;
      let failedItems: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setSaveProgress({ current: i + 1, total: items.length });
        
        // Convert JapaneseWord to Kanji type for saving
        const kanjiItem: Kanji = {
          id: item.kanji || item.id,
          kanji: item.kanji || item.id,
          meaning: item.meaning || item.english,
          onyomi: item.reading ? [item.reading] : [],
          kunyomi: [],
          jlpt: 'N5',
          strokeCount: 1,
          radicals: [],
          components: [],
          frequency: 0
        };
        
        const result = await StudyListManager.addItemToLists(kanjiItem, 'kanji', listsToSaveTo);
        
        if (result.success) {
          successCount++;
        } else {
          failedItems.push(item.kanji || item.kana);
          console.error(`Error adding ${item.kanji}:`, result.errors);
        }
      }

      if (failedItems.length > 0) {
        setErrors([`Failed to save ${failedItems.length} items: ${failedItems.join(', ')}`]);
      }

      if (successCount > 0) {
        onSaveComplete?.();
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrors(['Failed to save any items to lists']);
      }
    } catch (err) {
      console.error('Error saving items:', err);
      setErrors(['Failed to save items to lists']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Save {items.length} Kanji to Lists
        </h3>

        {/* Progress indicator */}
        {saving && saveProgress.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Saving kanji...</span>
              <span>{saveProgress.current}/{saveProgress.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

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

        {/* Kanji preview */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-2">Kanji to save:</div>
          <div className="flex flex-wrap gap-1">
            {items.slice(0, 20).map((item, index) => (
              <span key={index} className="text-lg">{item.kanji}</span>
            ))}
            {items.length > 20 && (
              <span className="text-sm text-muted-foreground self-center">
                +{items.length - 20} more
              </span>
            )}
          </div>
        </div>

        {studyLists.length > 0 && (
          <div className="space-y-3 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Select existing lists:</h4>
            {studyLists.map((list) => (
              <label
                key={list.id}
                className={`block cursor-pointer p-3 rounded-lg border transition-colors ${
                  selectedLists.includes(list.id)
                    ? 'bg-primary/10 border-primary'
                    : 'bg-background border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedLists.includes(list.id)}
                    onChange={() => handleToggleList(list.id)}
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
                      {list.type === 'flashcard' ? 'For flashcard review' : 'For various study methods'}
                    </p>
                  </div>
                </div>
              </label>
            ))}
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
            {saving ? 'Saving...' : 'Save All'}
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