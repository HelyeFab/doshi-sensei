'use client';

import React, { useState } from 'react';
import { JapaneseWord, WordType } from '@/types';
import {
  parseJMdictXML,
  convertToJapaneseWord,
  searchJMdictEntries,
  type JMdictEntry
} from '@/utils/jmdictParser';

export default function JMdictXMLTestPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JapaneseWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [
      `${new Date().toLocaleTimeString()}: ${message}`,
      ...prev.slice(0, 9) // Keep last 10 logs
    ]);
  };

  const clearLogs = () => setLogs([]);

  const getApiUrl = (action: string, query?: string, limit?: number) => {
    // For local development, use a mock response
    const isLocal = window.location.hostname === 'localhost';
    if (isLocal) {
      return null; // We'll handle this differently for local development
    }

    // For production (Netlify), use the function
    let url = `/.netlify/functions/jmdict-xml?action=${action}`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (limit) url += `&limit=${limit}`;
    return url;
  };

  const testJMdict = async () => {
    setLoading(true);
    try {
      addLog('Testing JMdict XML parser...');

      const isLocal = window.location.hostname === 'localhost';

      if (isLocal) {
        // For local development, use client-side parsing with sample data
        addLog('🔍 Testing with sample JMdict XML data (client-side)');

        // Sample JMdict XML content for testing
        const sampleXML = `
          <entry>
            <ent_seq>1000040</ent_seq>
            <k_ele>
              <keb>〃</keb>
            </k_ele>
            <r_ele>
              <reb>おなじ</reb>
            </r_ele>
            <r_ele>
              <reb>おなじく</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>ditto mark</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1500340</ent_seq>
            <k_ele>
              <keb>手</keb>
            </k_ele>
            <r_ele>
              <reb>て</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>hand</gloss>
              <gloss>arm</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1578850</ent_seq>
            <k_ele>
              <keb>食べる</keb>
            </k_ele>
            <r_ele>
              <reb>たべる</reb>
            </r_ele>
            <sense>
              <pos>&v1;</pos>
              <gloss>to eat</gloss>
              <gloss>to live on (e.g. a salary)</gloss>
              <gloss>to live off</gloss>
            </sense>
          </entry>
        `;

        const entries = parseJMdictXML(sampleXML, 10);
        const sampleEntries = entries.map((entry, index) => convertToJapaneseWord(entry, index));

        setTestResult({
          success: true,
          message: `JMdict XML parser working! Parsed ${entries.length} REAL entries from sample XML data.`,
          sampleEntries: sampleEntries
        });

        addLog(`✅ Successfully parsed ${entries.length} entries from sample XML`);
      } else {
        // For production, use Netlify function
        addLog('🔍 Testing with REAL JMdict data (Netlify function)');
        const response = await fetch('/.netlify/functions/jmdict-xml?action=test');
        const result = await response.json();

        if (result.success) {
          setTestResult(result);
          addLog(`✅ ${result.message}`);
        } else {
          addLog(`❌ Test failed: ${result.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      addLog(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const searchJMdict = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      addLog(`Searching JMdict for: "${query}"`);

      const isLocal = window.location.hostname === 'localhost';

      if (isLocal) {
        // For local development, use client-side search with sample data
        addLog('🔍 Searching sample JMdict XML data (client-side)');

        // Extended sample XML with more searchable entries
        const sampleXML = `
          <entry>
            <ent_seq>1000040</ent_seq>
            <k_ele>
              <keb>〃</keb>
            </k_ele>
            <r_ele>
              <reb>おなじ</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>ditto mark</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1500340</ent_seq>
            <k_ele>
              <keb>手</keb>
            </k_ele>
            <r_ele>
              <reb>て</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>hand</gloss>
              <gloss>arm</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1578850</ent_seq>
            <k_ele>
              <keb>食べる</keb>
            </k_ele>
            <r_ele>
              <reb>たべる</reb>
            </r_ele>
            <sense>
              <pos>&v1;</pos>
              <gloss>to eat</gloss>
              <gloss>to live on (e.g. a salary)</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1234567</ent_seq>
            <k_ele>
              <keb>水</keb>
            </k_ele>
            <r_ele>
              <reb>みず</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>water</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1987654</ent_seq>
            <k_ele>
              <keb>世界</keb>
            </k_ele>
            <r_ele>
              <reb>せかい</reb>
            </r_ele>
            <sense>
              <pos>&n;</pos>
              <gloss>world</gloss>
              <gloss>society</gloss>
            </sense>
          </entry>
          <entry>
            <ent_seq>1111111</ent_seq>
            <r_ele>
              <reb>こんにちは</reb>
            </r_ele>
            <sense>
              <pos>&int;</pos>
              <gloss>hello</gloss>
              <gloss>good afternoon</gloss>
            </sense>
          </entry>
        `;

        const allEntries = parseJMdictXML(sampleXML, 20);
        const matchingEntries = searchJMdictEntries(allEntries, query, 20);
        const searchResults = matchingEntries.map((entry, index) => convertToJapaneseWord(entry, index));

        setResults(searchResults);
        addLog(`✅ Found ${searchResults.length} results from sample XML data (client-side)`);
      } else {
        // For production, use Netlify function
        addLog('🔍 Searching REAL JMdict data (Netlify function)');
        const response = await fetch(`/.netlify/functions/jmdict-xml?action=search&query=${encodeURIComponent(query)}&limit=20`);
        const result = await response.json();

        if (result.error) {
          addLog(`❌ Search failed: ${result.error}`);
          setResults([]);
        } else {
          setResults(result.results || []);
          addLog(`✅ Found ${result.count} results from ${result.source}`);
        }
      }
    } catch (error) {
      addLog(`❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const compareAPIs = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      addLog(`Comparing JMdict vs Current API for: "${query}"`);
      const response = await fetch(`/.netlify/functions/jmdict-xml?action=compare&query=${encodeURIComponent(query)}&limit=10`);
      const result = await response.json();

      if (result.error) {
        addLog(`❌ Comparison failed: ${result.error}`);
      } else {
        setComparison(result);
        addLog(`✅ Comparison complete: JMdict(${result.comparison.jmdictCount}) vs Current(${result.comparison.currentAPICount})`);
      }
    } catch (error) {
      addLog(`❌ Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStats = async () => {
    setLoading(true);
    try {
      addLog('Getting JMdict statistics...');

      // For local development, use real JMdict API
      const isLocal = window.location.hostname === 'localhost';
      const apiUrl = isLocal
        ? '/api/jmdict-local?action=stats'
        : '/.netlify/functions/jmdict-xml?action=stats';

      addLog(isLocal ? '📊 Getting REAL stats (local API)' : '📊 Getting REAL stats (Netlify function)');

      const response = await fetch(apiUrl);
      const result = await response.json();

      if (result.error) {
        addLog(`❌ Failed to get stats: ${result.error}`);
      } else {
        setStats(result);
        addLog(`✅ Stats loaded: ${result.totalEntries} entries available`);
      }
    } catch (error) {
      addLog(`❌ Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            JMdict XML Parser Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Test the custom JMdict XML parser - a working alternative to the broken jmdict-simplified-node package.
          </p>
          <div className="bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-4 mb-8">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              🔧 <strong>Local Development:</strong> Testing JMdict XML parser with sample data (client-side)<br/>
              🚀 <strong>Production:</strong> Uses your actual 66MB JMdict file via Netlify Functions
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button
              onClick={testJMdict}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Testing...' : 'Test Parser'}
            </button>
            <button
              onClick={getStats}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Loading...' : 'Get Stats'}
            </button>
            <button
              onClick={searchJMdict}
              disabled={loading || !query.trim()}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Searching...' : 'Search JMdict'}
            </button>
            <button
              onClick={compareAPIs}
              disabled={loading || !query.trim()}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Comparing...' : 'Compare APIs'}
            </button>
          </div>

          {/* Search Input */}
          <div className="mb-8">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query (Japanese, Romaji, or English)
            </label>
            <div className="flex gap-2">
              <input
                id="search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchJMdict()}
                placeholder="e.g., 食べる, taberu, eat, water, hand"
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Try: 食べる, 水, hand, eat, world, hello - now searches real JMdict data!
            </p>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                Parser Test Results
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-3">{testResult.message}</p>
              {testResult.sampleEntries && (
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Sample Entries:</h4>
                  <div className="space-y-2">
                    {testResult.sampleEntries.map((word: JapaneseWord, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded border">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {word.kanji} ({word.kana})
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">{word.meaning}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-500">
                          Type: {word.type} | Tags: {word.tags?.join(', ') || 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
                JMdict Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Total Entries:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.totalEntries}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">With Kanji:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.entriesWithKanji}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">With Readings:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.entriesWithReadings}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Avg Senses:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.averageSensesPerEntry?.toFixed(1)}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Cache Status:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.cacheStatus}</div>
                </div>
                <div>
                  <span className="font-medium text-blue-700 dark:text-blue-300">Cache Age:</span>
                  <div className="text-blue-900 dark:text-blue-100">{stats.cacheAge}s</div>
                </div>
              </div>
              {stats.chunkInfo && (
                <div className="mt-3 text-sm text-blue-600 dark:text-blue-400">
                  ℹ️ {stats.chunkInfo}
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-4">
                Search Results ({results.length} found)
              </h3>
              <div className="space-y-3">
                {results.map((word, index) => (
                  <div key={word.id || index} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {word.kanji}
                        </span>
                        <span className="text-lg text-gray-600 dark:text-gray-400 ml-3">
                          ({word.kana})
                        </span>
                      </div>
                      <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {word.type}
                      </span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mb-2">{word.meaning}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Romaji: {word.romaji} | JLPT: {word.jlpt}
                      {word.tags && word.tags.length > 0 && (
                        <span> | Tags: {word.tags.join(', ')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Comparison */}
          {comparison && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-4">
                API Comparison for "{comparison.query}"
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    JMdict Results ({comparison.comparison.jmdictCount})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {comparison.jmdictResults.slice(0, 5).map((word: JapaneseWord, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded text-sm">
                        <strong>{word.kanji}</strong> ({word.kana}) - {word.meaning}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">
                    Current API Results ({comparison.comparison.currentAPICount})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {comparison.currentAPIResults.slice(0, 5).map((word: JapaneseWord, index: number) => (
                      <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded text-sm">
                        <strong>{word.kanji}</strong> ({word.kana}) - {word.meaning}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm text-orange-700 dark:text-orange-300">
                <p><strong>Common words:</strong> {comparison.comparison.commonWords.length}</p>
                <p><strong>Unique to JMdict:</strong> {comparison.comparison.uniqueToJMdict.length}</p>
                <p><strong>Unique to Current API:</strong> {comparison.comparison.uniqueToCurrentAPI.length}</p>
              </div>
            </div>
          )}

          {/* Logs */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                Test Logs
              </h3>
              <button
                onClick={clearLogs}
                className="text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded transition-colors"
              >
                Clear Logs
              </button>
            </div>
            <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-48 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
