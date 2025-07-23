'use client';

import { JapaneseWord } from '@/types';
import { X } from 'lucide-react';

interface WordLookupModalProps {
  word: string;
  definitions: JapaneseWord[];
  loading: boolean;
  onClose: () => void;
}

export default function WordLookupModal({ word, definitions, loading, onClose }: WordLookupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {word}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!loading && definitions.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              No definitions found for "{word}"
            </p>
          )}

          {!loading && definitions.length > 0 && (
            <div className="space-y-4">
              {definitions.map((def, index) => (
                <div key={index} className="border-b border-border pb-4 last:border-0">
                  {/* Japanese word and reading */}
                  <div className="mb-2">
                    <span className="text-xl font-medium text-foreground japanese-text">
                      {def.japanese}
                    </span>
                    {def.reading && (
                      <span className="ml-2 text-muted-foreground">
                        ({def.reading})
                      </span>
                    )}
                  </div>

                  {/* English meanings */}
                  <div className="space-y-1">
                    {def.meanings.map((meaning, idx) => (
                      <p key={idx} className="text-sm text-foreground">
                        {idx + 1}. {meaning}
                      </p>
                    ))}
                  </div>

                  {/* JLPT level */}
                  {def.jlpt && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        JLPT {def.jlpt}
                      </span>
                    </div>
                  )}

                  {/* Common tag */}
                  {def.common && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        Common
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}