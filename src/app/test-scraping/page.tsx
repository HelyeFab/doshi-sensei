'use client';

import { useState } from 'react';

export default function TestScrapingPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testUrls = [
    { name: 'Relative URL', url: '/.netlify/functions/test-scraping' },
    { name: 'Port 3002', url: 'http://localhost:3002/.netlify/functions/test-scraping' },
    { name: 'Port 8888', url: 'http://localhost:8888/.netlify/functions/test-scraping' },
    { name: 'Current Origin', url: `${window.location.origin}/.netlify/functions/test-scraping` },
  ];

  const testFunction = async (name: string, url: string) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      return {
        name,
        url,
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        data,
      };
    } catch (error) {
      return {
        name,
        url,
        status: 0,
        statusText: 'Network Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    const testResults = [];
    for (const test of testUrls) {
      const result = await testFunction(test.name, test.url);
      testResults.push(result);
      setResults([...testResults]);
    }

    setLoading(false);
  };

  const testWatanocScraping = async () => {
    try {
      const { triggerWatanocScraping } = await import('@/utils/newsSources');
      const result = await triggerWatanocScraping();
      setResults(prev => [...prev, {
        name: 'Watanoc Scraping Function',
        url: 'Via newsSources.ts',
        success: result.success,
        data: result,
      }]);
    } catch (error) {
      setResults(prev => [...prev, {
        name: 'Watanoc Scraping Function',
        url: 'Via newsSources.ts',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }]);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-white">Netlify Functions Test</h1>
      
      <div className="space-x-4 mb-6">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test All URLs'}
        </button>
        
        <button
          onClick={testWatanocScraping}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Watanoc Scraping
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className={`p-4 rounded border ${result.success ? 'border-green-500 bg-green-50 text-gray-900' : 'border-red-500 bg-red-50 text-gray-900'}`}>
            <h3 className="font-semibold">{result.name}</h3>
            <p className="text-sm text-gray-700">{result.url}</p>
            <p className="mt-2">
              Status: {result.status} {result.statusText}
            </p>
            {result.error && (
              <p className="text-red-600 mt-2">Error: {result.error}</p>
            )}
            {result.data && (
              <pre className="mt-2 text-xs bg-gray-800 text-gray-100 p-2 rounded overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}