'use client';

import { useState } from 'react';

interface AnkiCardModalProps {
  card: any;
  onClose: () => void;
}

export function AnkiCardModal({ card, onClose }: AnkiCardModalProps) {
  const [showBack, setShowBack] = useState(false);
  const [showAllFields, setShowAllFields] = useState(false);
  
  // Core 2000 field mapping (typical structure)
  const fieldNames = [
    'Index',
    'Expression',
    'Reading',
    'Meaning',
    'Sound',
    'Sentence',
    'Sentence Meaning',
    'Sentence Sound',
    'Notes'
  ];
  
  // Handle both direct ankiData and nested card.ankiData structures
  const ankiData = card.ankiData || card;
  const fields = ankiData.fields || [];
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Anki Card</h2>
            {ankiData.deckName && (
              <p className="text-sm text-muted-foreground mt-1">
                From deck: {ankiData.deckName}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Front of card */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Front</p>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-lg japanese-text" dangerouslySetInnerHTML={{ __html: ankiData.rawFront || ankiData.front || 'No front content' }} />
            </div>
          </div>

          {/* Show/Hide answer button */}
          <button
            onClick={() => setShowBack(!showBack)}
            className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {showBack ? 'Hide Answer' : 'Show Answer'}
          </button>

          {/* Back of card */}
          {showBack && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Back</p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-lg" dangerouslySetInnerHTML={{ __html: ankiData.rawBack || ankiData.back || 'No back content' }} />
              </div>
            </div>
          )}
          
          {/* Toggle to show all fields */}
          <button
            onClick={() => setShowAllFields(!showAllFields)}
            className="text-sm text-primary hover:underline"
          >
            {showAllFields ? 'Hide' : 'Show'} all fields ({fields.length})
          </button>
          
          {/* All fields display */}
          {showAllFields && fields.length > 0 && (
            <div className="space-y-3 mt-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-sm">All Fields:</h3>
              {fields.map((field: string, index: number) => (
                <div key={index} className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {fieldNames[index] || `Field ${index}`}:
                  </p>
                  <div className="p-3 bg-background rounded">
                    {field ? (
                      field.includes('[sound:') ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Audio file:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {field.replace(/\[sound:|]/g, '')}
                          </code>
                        </div>
                      ) : (
                        <div 
                          className={`text-sm ${index === 1 || index === 5 ? 'japanese-text text-lg' : ''}`}
                          dangerouslySetInnerHTML={{ __html: field }}
                        />
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Empty</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {ankiData.tags && ankiData.tags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-2">
                {ankiData.tags.map((tag: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-muted text-sm rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* SRS Data */}
          {ankiData.srsData && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">Spaced Repetition Data:</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Reviews:</span> {ankiData.srsData.reviews || 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Lapses:</span> {ankiData.srsData.lapses || 0}
                </div>
                <div>
                  <span className="text-muted-foreground">Interval:</span> {ankiData.srsData.interval || 0} days
                </div>
                <div>
                  <span className="text-muted-foreground">Ease:</span> {(ankiData.srsData.ease || 2.5).toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}