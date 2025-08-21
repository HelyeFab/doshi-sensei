'use client';

import React, { useState, useEffect } from 'react';
import { StudyList, StudyListType } from '@/types';
import { StudyListManager } from '@/utils/studyListManager';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription2 } from '@/hooks/useSubscription2';

interface ListSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateList: (name: string, type: StudyListType, description?: string) => Promise<void>;
  title?: string;
  createButtonText?: string;
  allowedTypes?: StudyListType[]; // Restrict which list types can be created
  showOnlyTypes?: StudyListType[]; // Only show lists of these types
  className?: string;
}

export default function ListSelectionModal({
  isOpen,
  onClose,
  onCreateList,
  title = "Create New List",
  createButtonText = "Create List",
  allowedTypes = ['flashcard', 'drillable', 'sentence'],
  showOnlyTypes,
  className = ""
}: ListSelectionModalProps) {
  const { user } = useAuth();
  const { subscription } = useSubscription2();
  const [studyLists, setStudyLists] = useState<StudyList[]>([]);
  const [selectedType, setSelectedType] = useState<StudyListType>('flashcard');
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load study lists
  useEffect(() => {
    if (isOpen) {
      loadStudyLists();
    }
  }, [isOpen]);

  const loadStudyLists = async () => {
    try {
      const lists = await StudyListManager.getAllStudyLists();
      const filteredLists = showOnlyTypes 
        ? lists.filter(list => showOnlyTypes.includes(list.type))
        : lists;
      setStudyLists(filteredLists);
    } catch (error) {
      console.error('Error loading study lists:', error);
    }
  };

  const handleCreate = async () => {
    if (!listName.trim()) return;

    try {
      setCreating(true);
      setError(null);
      
      // Check for duplicate names
      const trimmedName = listName.trim().toLowerCase();
      const isDuplicate = studyLists.some(list => 
        list.name.toLowerCase() === trimmedName
      );
      
      if (isDuplicate) {
        setError('A list with this name already exists. Please choose a different name.');
        return;
      }

      await onCreateList(listName.trim(), selectedType, description.trim() || undefined);
      
      // Reset form
      setListName('');
      setDescription('');
      setError(null);
      onClose();
    } catch (err) {
      console.error('Error creating list:', err);
      setError('Failed to create list. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const getTypeInfo = (type: StudyListType) => {
    switch (type) {
      case 'flashcard':
        return {
          label: 'Flashcard List',
          description: 'For general review (any content)',
          color: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        };
      case 'drillable':
        return {
          label: 'Drillable List', 
          description: 'For conjugation practice (verbs/adjectives only)',
          color: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        };
      case 'sentence':
        return {
          label: 'Sentence List',
          description: 'For shadowing practice (sentences only)', 
          color: 'bg-green-500/10 text-green-400 border-green-500/20'
        };
      default:
        return {
          label: 'Study List',
          description: '',
          color: 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-card border border-border rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto ${className}`}>
        <h3 className="text-lg font-semibold text-card-foreground mb-4">{title}</h3>

        {/* List Type Selection */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              List Type *
            </label>
            <div className="space-y-2">
              {allowedTypes.map((type) => {
                const typeInfo = getTypeInfo(type);
                return (
                  <label key={type} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg transition-colors hover:bg-muted/50">
                    <input
                      type="radio"
                      name="listType"
                      value={type}
                      checked={selectedType === type}
                      onChange={(e) => setSelectedType(e.target.value as StudyListType)}
                      className="rounded border-border mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{typeInfo.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${typeInfo.color}`}>
                          {type}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeInfo.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => {
                setListName(e.target.value);
                if (error) setError(null);
              }}
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

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
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
            {creating ? 'Creating...' : createButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}