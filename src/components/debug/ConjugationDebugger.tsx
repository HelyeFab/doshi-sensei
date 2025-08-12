'use client';

import { useState } from 'react';
import { ConjugationEngine } from '@/utils/conjugation';

export function ConjugationDebugger() {
  const [word, setWord] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const testWord = async () => {
    if (!word.trim()) return;
    
    setLoading(true);
    try {
      // Test via API
      const response = await fetch('/api/debug-conjugation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, testConjugation: true })
      });
      
      const data = await response.json();
      
      // Also test client-side conjugation for comparison
      const clientSideTest = data.results?.map((result: any) => ({
        ...result,
        clientSideConjugation: (() => {
          try {
            const forms = ConjugationEngine.conjugate({
              id: 'test',
              kanji: result.word,
              kana: result.kana,
              romaji: '',
              meaning: result.meaning,
              type: result.type,
              jlpt: 'N5'
            });
            return {
              success: true,
              sampleForms: {
                present: forms.present,
                past: forms.past,
                negative: forms.negative,
                polite: forms.polite,
                teForm: forms.teForm
              }
            };
          } catch (error) {
            return { success: false, error: String(error) };
          }
        })()
      }));
      
      setResults({
        ...data,
        results: clientSideTest,
        clientSideEnvironment: {
          url: window.location.href,
          userAgent: navigator.userAgent
        }
      });
      
    } catch (error) {
      setResults({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };
  
  // Only show in development or with debug query param
  const isDebugMode = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && window.location.search.includes('debug=true'));
  
  if (!isDebugMode) {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-lg mb-2">🔧 Conjugation Debugger</h3>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="Enter Japanese word (e.g., 食べる)"
          className="flex-1 px-2 py-1 border rounded"
          onKeyPress={(e) => e.key === 'Enter' && testWord()}
        />
        <button
          onClick={testWord}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test'}
        </button>
      </div>
      
      {results && (
        <div className="mt-3 max-h-96 overflow-y-auto">
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-500">
        Environment: {process.env.NODE_ENV}
        <br />
        Add ?debug=true to URL to show in production
      </div>
    </div>
  );
}