'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';
import StudyListManager from '@/utils/studyListManager';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useRouter } from 'next/navigation';

interface AnkiSetCreatorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AnkiCard {
  front: string;
  back: string;
}

export function AnkiSetCreator({ isOpen, onClose }: AnkiSetCreatorProps) {
  const { user } = useAuth();
  const { checkAndTrack } = useFeature('anki_set_creation', {
    showToast: true,
    trackUsage: true
  });
  const { track } = useAnalytics();
  const router = useRouter();
  
  const [setName, setSetName] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<AnkiCard[]>([{ front: '', back: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const handleAddCard = () => {
    setCards([...cards, { front: '', back: '' }]);
  };
  
  const handleRemoveCard = (index: number) => {
    if (cards.length > 1) {
      setCards(cards.filter((_, i) => i !== index));
    }
  };
  
  const handleCardChange = (index: number, field: 'front' | 'back', value: string) => {
    const newCards = [...cards];
    newCards[index][field] = value;
    setCards(newCards);
  };
  
  const handleSave = async () => {
    if (!user) return;
    
    // Validate input
    if (!setName.trim()) {
      setError('Please enter a set name');
      return;
    }
    
    const validCards = cards.filter(card => card.front.trim() && card.back.trim());
    if (validCards.length === 0) {
      setError('Please add at least one card with both front and back content');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      
      // Check access
      const canCreate = await checkAndTrack();
      if (!canCreate) return;
      
      // Track creation start
      track('anki_set_creation_started', {
        cardCount: validCards.length,
        setName
      });
      
      // Create the study list
      const list = await StudyListManager.createStudyList(
        setName,
        'flashcard',
        description || `Anki-style flashcard set with ${validCards.length} cards`,
        user
      );
      
      // Add cards to the list
      for (const card of validCards) {
        const ankiItem = {
          id: `anki_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemType: 'anki_card' as const,
          savedAt: new Date(),
          listIds: [list.id],
          ankiData: {
            originalId: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            deckName: setName,
            cardType: 'basic' as const,
            front: card.front,
            back: card.back,
            tags: [],
            media: [],
            srsData: {
              due: new Date(),
              ease: 2.5,
              interval: 0,
              reviews: 0,
              lapses: 0,
              lastReview: undefined,
              state: 'new' as const,
              step: 0,
              left: 0,
              odue: 0,
              odid: 0,
              flags: 0,
              data: ''
            }
          }
        };
        
        await StudyListManager.saveItem(ankiItem);
      }
      
      // Track success
      track('anki_set_creation_completed', {
        cardCount: validCards.length,
        setName,
        listId: list.id
      });
      
      // Close modal and navigate to the list
      onClose();
      router.push(`/drill/flashcards?list=${list.id}`);
      
    } catch (err) {
      console.error('Error creating Anki set:', err);
      setError('Failed to create Anki set. Please try again.');
      
      // Track error
      track('anki_set_creation_error', {
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = () => {
    setSetName('');
    setDescription('');
    setCards([{ front: '', back: '' }]);
    setError('');
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">Create Anki Set</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
          {/* Set Name */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Set Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder="e.g., JLPT N5 Vocabulary"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={100}
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this set contains..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              maxLength={200}
            />
          </div>
          
          {/* Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">
                Cards ({cards.filter(c => c.front.trim() && c.back.trim()).length} valid)
              </label>
              <button
                onClick={handleAddCard}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Card
              </button>
            </div>
            
            <div className="space-y-3">
              {cards.map((card, index) => (
                <div key={index} className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Card {index + 1}
                    </span>
                    {cards.length > 1 && (
                      <button
                        onClick={() => handleRemoveCard(index)}
                        className="text-red-500 hover:text-red-600 p-1"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Front
                      </label>
                      <textarea
                        value={card.front}
                        onChange={(e) => handleCardChange(index, 'front', e.target.value)}
                        placeholder="Question or prompt..."
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        Back
                      </label>
                      <textarea
                        value={card.back}
                        onChange={(e) => handleCardChange(index, 'back', e.target.value)}
                        placeholder="Answer or translation..."
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !setName.trim() || cards.every(c => !c.front.trim() || !c.back.trim())}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Set
                </>
              )}
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}