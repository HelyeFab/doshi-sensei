'use client';

import { useState } from 'react';
import { playKanaAudio, playKanaAudioWithRetry, playKanaAudioViaFetch } from '@/utils/kanaAudioLoader';

export default function TestKanaAudio() {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testAudioMethods = async () => {
    setStatus('Testing audio playback methods...');
    setError('');

    const audioPath = '/audio/kana/katakana/a.mp3';

    // Test 1: Direct playback
    try {
      setStatus('Test 1: Direct playback...');
      await playKanaAudio(audioPath);
      setStatus(prev => prev + '\n✅ Direct playback successful');
    } catch (err) {
      setError(prev => prev + `\n❌ Direct playback failed: ${err}`);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Fetch method
    try {
      setStatus(prev => prev + '\n\nTest 2: Fetch method...');
      await playKanaAudioViaFetch(audioPath);
      setStatus(prev => prev + '\n✅ Fetch method successful');
    } catch (err) {
      setError(prev => prev + `\n❌ Fetch method failed: ${err}`);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 3: Retry method
    try {
      setStatus(prev => prev + '\n\nTest 3: Retry method...');
      await playKanaAudioWithRetry(audioPath, 2);
      setStatus(prev => prev + '\n✅ Retry method successful');
    } catch (err) {
      setError(prev => prev + `\n❌ Retry method failed: ${err}`);
    }

    setStatus(prev => prev + '\n\n✅ All tests completed!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Kana Audio Test Page</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <button
            onClick={testAudioMethods}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Audio Playback
          </button>

          {status && (
            <div className="mt-4">
              <h2 className="font-semibold mb-2">Status:</h2>
              <pre className="bg-gray-100 p-3 rounded text-sm whitespace-pre-wrap">{status}</pre>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <h2 className="font-semibold mb-2 text-red-600">Errors:</h2>
              <pre className="bg-red-50 p-3 rounded text-sm text-red-600 whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-600">
            <p>This page tests different methods of playing local kana audio files:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Direct playback using Audio element</li>
              <li>Fetch method to bypass service worker</li>
              <li>Retry mechanism with fallback</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}