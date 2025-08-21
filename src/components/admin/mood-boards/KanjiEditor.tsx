'use client';

import { useState } from 'react';
import { KanjiItem } from '@/types/moodBoard';
import { KanjiSearchInput } from './KanjiSearchInput';

interface KanjiEditorProps {
  kanji: KanjiItem[];
  onUpdate: (kanji: KanjiItem[]) => void;
}

export function KanjiEditor({ kanji, onUpdate }: KanjiEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newKanji, setNewKanji] = useState<Partial<KanjiItem>>({
    char: '',
    meaning: '',
    readings: { on: [], kun: [] },
    examples: [],
    difficulty: 1,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = () => {
    if (newKanji.char && newKanji.meaning) {
      const kanjiItem: KanjiItem = {
        char: newKanji.char,
        meaning: newKanji.meaning,
        readings: newKanji.readings || { on: [], kun: [] },
        examples: newKanji.examples || [],
        difficulty: newKanji.difficulty || 1,
      };
      onUpdate([...kanji, kanjiItem]);
      setNewKanji({
        char: '',
        meaning: '',
        readings: { on: [], kun: [] },
        examples: [],
        difficulty: 1,
      });
      setShowAddForm(false);
    }
  };

  const handleKanjiSelect = (selectedKanji: KanjiItem) => {
    // Check if kanji already exists
    if (kanji.some(k => k.char === selectedKanji.char)) {
      // Could show a notification here
      return;
    }
    
    onUpdate([...kanji, selectedKanji]);
  };

  const handleEdit = (index: number, updatedKanji: KanjiItem) => {
    const newKanjiList = [...kanji];
    newKanjiList[index] = updatedKanji;
    onUpdate(newKanjiList);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const newKanjiList = kanji.filter((_, i) => i !== index);
    onUpdate(newKanjiList);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === kanji.length - 1)) {
      return;
    }
    
    const newKanjiList = [...kanji];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newKanjiList[index], newKanjiList[targetIndex]] = [newKanjiList[targetIndex], newKanjiList[index]];
    onUpdate(newKanjiList);
  };

  const handleReadingsChange = (type: 'on' | 'kun', value: string) => {
    const readings = value.split(',').map(r => r.trim()).filter(r => r);
    setNewKanji(prev => ({
      ...prev,
      readings: {
        ...prev.readings!,
        [type]: readings,
      },
    }));
  };

  const handleExamplesChange = (value: string) => {
    const examples = value.split(',').map(e => e.trim()).filter(e => e);
    setNewKanji(prev => ({
      ...prev,
      examples,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Kanji Search */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-3">Quick Add from Search</h4>
        <KanjiSearchInput 
          onSelect={handleKanjiSelect}
          placeholder="Search and add kanji instantly..."
        />
        <p className="text-xs text-muted-foreground mt-2">
          💡 Search by character, meaning, or reading to quickly add kanji to your mood board
        </p>
      </div>

      {/* Kanji List */}
      <div className="space-y-2">
        {kanji.length === 0 && !showAddForm && (
          <p className="text-center py-8 text-muted-foreground">
            No kanji added yet. Click "Add Kanji" to get started.
          </p>
        )}

        {kanji.map((item, index) => (
          <div
            key={index}
            className="bg-background border border-border rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            {editingIndex === index ? (
              <KanjiEditForm
                kanji={item}
                onSave={(updated) => handleEdit(index, updated)}
                onCancel={() => setEditingIndex(null)}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold text-primary">{item.char}</div>
                  <div>
                    <p className="font-medium text-foreground">{item.meaning}</p>
                    <p className="text-sm text-muted-foreground">
                      On: {item.readings.on.join(', ') || 'None'} | 
                      Kun: {item.readings.kun.join(', ') || 'None'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Difficulty: {'⭐'.repeat(item.difficulty)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === kanji.length - 1}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingIndex(index)}
                    className="px-3 py-1.5 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="px-3 py-1.5 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add New Kanji Form */}
      {showAddForm && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h4 className="font-medium text-foreground mb-4">Add New Kanji</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Character *
              </label>
              <input
                type="text"
                value={newKanji.char || ''}
                onChange={(e) => setNewKanji(prev => ({ ...prev, char: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="木"
                maxLength={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Meaning *
              </label>
              <input
                type="text"
                value={newKanji.meaning || ''}
                onChange={(e) => setNewKanji(prev => ({ ...prev, meaning: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="tree"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                On Readings (comma-separated)
              </label>
              <input
                type="text"
                value={newKanji.readings?.on.join(', ') || ''}
                onChange={(e) => handleReadingsChange('on', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="もく, ぼく"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Kun Readings (comma-separated)
              </label>
              <input
                type="text"
                value={newKanji.readings?.kun.join(', ') || ''}
                onChange={(e) => handleReadingsChange('kun', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="き, こ"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                Examples (comma-separated)
              </label>
              <input
                type="text"
                value={newKanji.examples?.join(', ') || ''}
                onChange={(e) => handleExamplesChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="木曜日 (Thursday), 木材 (lumber)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Difficulty
              </label>
              <select
                value={newKanji.difficulty || 1}
                onChange={(e) => setNewKanji(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {[1, 2, 3, 4, 5].map(level => (
                  <option key={level} value={level}>
                    {'⭐'.repeat(level)} ({level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewKanji({
                  char: '',
                  meaning: '',
                  readings: { on: [], kun: [] },
                  examples: [],
                  difficulty: 1,
                });
              }}
              className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newKanji.char || !newKanji.meaning}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Kanji
            </button>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 border-2 border-dashed border-border text-muted-foreground rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          + Add Kanji
        </button>
      )}
    </div>
  );
}

// Edit form component
function KanjiEditForm({
  kanji,
  onSave,
  onCancel,
}: {
  kanji: KanjiItem;
  onSave: (kanji: KanjiItem) => void;
  onCancel: () => void;
}) {
  const [editedKanji, setEditedKanji] = useState(kanji);

  const handleReadingsChange = (type: 'on' | 'kun', value: string) => {
    const readings = value.split(',').map(r => r.trim()).filter(r => r);
    setEditedKanji(prev => ({
      ...prev,
      readings: {
        ...prev.readings,
        [type]: readings,
      },
    }));
  };

  const handleExamplesChange = (value: string) => {
    const examples = value.split(',').map(e => e.trim()).filter(e => e);
    setEditedKanji(prev => ({
      ...prev,
      examples,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Character
          </label>
          <input
            type="text"
            value={editedKanji.char}
            onChange={(e) => setEditedKanji(prev => ({ ...prev, char: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            maxLength={1}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Meaning
          </label>
          <input
            type="text"
            value={editedKanji.meaning}
            onChange={(e) => setEditedKanji(prev => ({ ...prev, meaning: e.target.value }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            On Readings
          </label>
          <input
            type="text"
            value={editedKanji.readings.on.join(', ')}
            onChange={(e) => handleReadingsChange('on', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Kun Readings
          </label>
          <input
            type="text"
            value={editedKanji.readings.kun.join(', ')}
            onChange={(e) => handleReadingsChange('kun', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1">
            Examples
          </label>
          <input
            type="text"
            value={editedKanji.examples.join(', ')}
            onChange={(e) => handleExamplesChange(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Difficulty
          </label>
          <select
            value={editedKanji.difficulty}
            onChange={(e) => setEditedKanji(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {[1, 2, 3, 4, 5].map(level => (
              <option key={level} value={level}>
                {'⭐'.repeat(level)} ({level})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(editedKanji)}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}