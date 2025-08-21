'use client';

import { useState } from 'react';
import { useResourceCache } from '@/hooks/useResourceCache';
import { Kanji } from '@/lib/cache/kanjiCache';
import { Verb } from '@/lib/cache/verbCache';
import { Adjective } from '@/lib/cache/adjectiveCache';

export default function ResourceCacheDemo() {
  const {
    isAvailable,
    isInitialized,
    cacheKanji,
    getKanji,
    cacheVerb,
    getVerb,
    cacheAdjective,
    getAdjective,
    cacheKanaSound,
    getKanaSound,
    getCacheStats,
    clearCache
  } = useResourceCache({ preCacheCommonSounds: true });

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Sample data for testing
  const sampleKanji: Kanji = {
    character: '漢',
    readings: {
      onyomi: ['かん'],
      kunyomi: []
    },
    meanings: ['Chinese', 'Sino-'],
    strokeCount: 13,
    jlptLevel: 'N1',
    examples: [
      {
        word: '漢字',
        reading: 'かんじ',
        meaning: 'kanji'
      }
    ]
  };

  const sampleVerb: Verb = {
    word: '食べる',
    reading: 'たべる',
    meaning: 'to eat',
    type: 'ichidan',
    jlptLevel: 'N5',
    conjugations: {
      present: { form: '食べる', reading: 'たべる', meaning: 'to eat' },
      past: { form: '食べた', reading: 'たべた', meaning: 'ate' },
      negative: { form: '食べない', reading: 'たべない', meaning: 'not eat' }
    }
  };

  const sampleAdjective: Adjective = {
    word: '大きい',
    reading: 'おおきい',
    meaning: 'big',
    type: 'i-adjective',
    jlptLevel: 'N5',
    conjugations: {
      present: { form: '大きい', reading: 'おおきい', meaning: 'big' },
      past: { form: '大きかった', reading: 'おおきかった', meaning: 'was big' },
      negative: { form: '大きくない', reading: 'おおきくない', meaning: 'not big' }
    }
  };

  const handleCacheKanji = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await cacheKanji(sampleKanji);
      setMessage(success ? '✅ Kanji cached successfully!' : '❌ Failed to cache kanji');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetKanji = async () => {
    setLoading(true);
    setMessage('');

    try {
      const kanji = await getKanji('漢', () => Promise.resolve(sampleKanji));
      setMessage(kanji ? `✅ Found kanji: ${kanji.character}` : '❌ Kanji not found in cache');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCacheVerb = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await cacheVerb(sampleVerb);
      setMessage(success ? '✅ Verb cached successfully!' : '❌ Failed to cache verb');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetVerb = async () => {
    setLoading(true);
    setMessage('');

    try {
      const verb = await getVerb('食べる', () => Promise.resolve(sampleVerb));
      setMessage(verb ? `✅ Found verb: ${verb.word}` : '❌ Verb not found in cache');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCacheAdjective = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await cacheAdjective(sampleAdjective);
      setMessage(success ? '✅ Adjective cached successfully!' : '❌ Failed to cache adjective');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAdjective = async () => {
    setLoading(true);
    setMessage('');

    try {
      const adjective = await getAdjective('大きい', () => Promise.resolve(sampleAdjective));
      setMessage(adjective ? `✅ Found adjective: ${adjective.word}` : '❌ Adjective not found in cache');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCacheKanaSound = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await cacheKanaSound('あ');
      setMessage(success ? '✅ Kana sound cached successfully!' : '❌ Failed to cache kana sound');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetKanaSound = async () => {
    setLoading(true);
    setMessage('');

    try {
      const audio = await getKanaSound('あ');
      setMessage(audio ? `✅ Found kana sound: ${audio.text}` : '❌ Kana sound not found in cache');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetStats = async () => {
    setLoading(true);
    setMessage('');

    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
      setMessage('✅ Cache stats retrieved!');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    setMessage('');

    try {
      await clearCache();
      setStats(null);
      setMessage('✅ Cache cleared!');
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Resource Caching Demo</h2>
        <p className="text-yellow-700">Resource caching is not available for your account type.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Resource Caching Demo</h2>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-blue-700">
          Status: {isInitialized ? '✅ Initialized' : '⏳ Initializing...'}
        </p>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-sm">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Kanji Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Kanji Caching</h3>
          <div className="space-y-2">
            <button
              onClick={handleCacheKanji}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Cache Kanji (漢)
            </button>
            <button
              onClick={handleGetKanji}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Get Kanji (漢)
            </button>
          </div>
        </div>

        {/* Verb Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Verb Caching</h3>
          <div className="space-y-2">
            <button
              onClick={handleCacheVerb}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Cache Verb (食べる)
            </button>
            <button
              onClick={handleGetVerb}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Get Verb (食べる)
            </button>
          </div>
        </div>

        {/* Adjective Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Adjective Caching</h3>
          <div className="space-y-2">
            <button
              onClick={handleCacheAdjective}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Cache Adjective (大きい)
            </button>
            <button
              onClick={handleGetAdjective}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Get Adjective (大きい)
            </button>
          </div>
        </div>

        {/* Audio Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold mb-3">Audio Caching</h3>
          <div className="space-y-2">
            <button
              onClick={handleCacheKanaSound}
              disabled={loading}
              className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Cache Kana Sound (あ)
            </button>
            <button
              onClick={handleGetKanaSound}
              disabled={loading}
              className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Get Kana Sound (あ)
            </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="mt-6 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Cache Statistics</h3>
        <div className="space-y-2">
          <button
            onClick={handleGetStats}
            disabled={loading}
            className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Get Cache Stats
          </button>
          <button
            onClick={handleClearCache}
            disabled={loading}
            className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear All Caches
          </button>
        </div>

        {stats && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
            <h4 className="font-medium mb-2">Current Cache Stats:</h4>
            <div className="text-sm space-y-1">
              <p>Kanji: {stats.kanji.count} items ({Math.round(stats.kanji.totalSize / 1024)}KB)</p>
              <p>Verbs: {stats.verb.count} items ({Math.round(stats.verb.totalSize / 1024)}KB)</p>
              <p>Adjectives: {stats.adjective.count} items ({Math.round(stats.adjective.totalSize / 1024)}KB)</p>
              <p>Audio: {stats.audio.count} items ({Math.round(stats.audio.totalSize / 1024)}KB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}