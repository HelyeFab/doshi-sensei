'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getCachedContextExplanation, ContextExplanationResponse } from '@/services/openai/contextExplanation';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AIExplanationModalProps {
  text: string;
  contextType: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;
  onClose: () => void;
}

export default function AIExplanationModal({
  text,
  contextType,
  surroundingContext,
  onClose
}: AIExplanationModalProps) {
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<ContextExplanationResponse | null>(null);
  const [mounted, setMounted] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    const fetchExplanation = async () => {
      try {
        track('ai_explanation_requested', {
          contextType,
          textLength: text.length
        });

        const response = await getCachedContextExplanation({
          text,
          contextType,
          surroundingContext,
          userLevel: 'intermediate'
        });

        if (!cancelled) {
          setExplanation(response);
          setLoading(false);

          if (!response.error) {
            track('ai_explanation_success', {
              contextType,
              hasGrammar: !!response.explanation.grammar,
              hasExamples: (response.explanation.examples?.length || 0) > 0
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch explanation:', error);
        if (!cancelled) {
          setExplanation({
            explanation: { meaning: '' },
            error: 'Failed to connect to AI service'
          });
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      cancelled = true;
    };
  }, [text, contextType, surroundingContext, track, mounted]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!mounted) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI Explanation</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Original {contextType}:</p>
            <p className="text-lg font-medium text-gray-900 font-ja">{text}</p>
            {surroundingContext && (
              <p className="text-sm text-gray-500 mt-2 italic">Context: {surroundingContext}</p>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-sm text-gray-600">Getting AI explanation...</p>
            </div>
          )}

          {!loading && explanation?.error && (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-red-600">{explanation.error}</p>
            </div>
          )}

          {!loading && explanation && !explanation.error && (
            <div className="space-y-4">
              {explanation.explanation.meaning && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Meaning</h3>
                  <p className="text-gray-700">{explanation.explanation.meaning}</p>
                </div>
              )}

              {explanation.explanation.grammar && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Grammar</h3>
                  <p className="text-gray-700">{explanation.explanation.grammar}</p>
                </div>
              )}

              {explanation.explanation.usage && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Usage</h3>
                  <p className="text-gray-700">{explanation.explanation.usage}</p>
                </div>
              )}

              {explanation.explanation.examples && explanation.explanation.examples.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Examples</h3>
                  <div className="space-y-2">
                    {explanation.explanation.examples.map((example, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-gray-900 font-ja">{example}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {explanation.explanation.culturalNotes && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Cultural Notes</h3>
                  <p className="text-gray-700">{explanation.explanation.culturalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Powered by AI • Explanations may vary
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}