'use client';

import { useState, useEffect } from 'react';
import { testSearchIssue, testSpecificWord } from '@/utils/searchTest';
import { JapaneseWord } from '@/types';

export default function TestSearchPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testWord, setTestWord] = useState('drive');

  const runSearchTest = async () => {
    setLoading(true);
    setResults([]);

    const logs: string[] = [];

    try {
      await testSearchIssue();
      setResults(logs);
    } catch (error) {
      logs.push(`Error: ${error}`);
      setResults(logs);
    } finally {
      setLoading(false);
    }
  };

  const runSpecificTest = async () => {
    setLoading(true);
    setResults([]);

    const logs: string[] = [];

    try {
      await testSpecificWord(testWord);
      setResults(logs);
    } catch (error) {
      logs.push(`Error: ${error}`);
      setResults(logs);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Search Algorithm Test</h1>

      <div className="space-y-4 mb-6">
        <button
          onClick={runSearchTest}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Running Tests...' : 'Run Full Search Test'}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={testWord}
            onChange={(e) => setTestWord(e.target.value)}
            placeholder="Enter word to test"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={runSpecificTest}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Test Word
          </button>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <h2 className="font-bold mb-2">Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">No results yet. Click a button to run tests.</p>
        ) : (
          <pre className="text-sm whitespace-pre-wrap">
            {results.join('\n')}
          </pre>
        )}
      </div>
    </div>
  );
}
