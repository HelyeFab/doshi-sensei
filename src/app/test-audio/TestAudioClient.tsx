'use client';

import { useState } from 'react';
import { playKanaAudioWithRetry } from '@/utils/kanaAudioLoader';
import { playKanjiAudioWithRetry } from '@/utils/kanjiAudioLoader';
import { createGameAudio, playGameAudio } from '@/utils/gameAudioUtils';
import TTSManager from '@/utils/tts';

export default function TestAudioClient() {
  const [status, setStatus] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const addError = (message: string) => {
    setErrors(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testKanaAudio = async () => {
    addStatus('Testing Kana audio...');
    try {
      await playKanaAudioWithRetry('/audio/kana/hiragana/a.mp3', 2);
      addStatus('✅ Kana audio played successfully!');
    } catch (error) {
      addError(`❌ Kana audio failed: ${error}`);
    }
  };

  const testKanjiAudio = async () => {
    addStatus('Testing Kanji audio...');
    try {
      await playKanjiAudioWithRetry('/audio/kanji/n5/character/日.mp3', 2);
      addStatus('✅ Kanji audio played successfully!');
    } catch (error) {
      addError(`❌ Kanji audio failed: ${error}`);
    }
  };

  const testGameAudio = async () => {
    addStatus('Testing Game audio...');
    try {
      const audio = createGameAudio('/sounds/game-countdown-62-199828.mp3', {
        volume: 0.5
      });
      await playGameAudio(audio);
      addStatus('✅ Game audio played successfully!');
    } catch (error) {
      addError(`❌ Game audio failed: ${error}`);
    }
  };

  const testTTSWithLocalFallback = async () => {
    addStatus('Testing TTS with local audio fallback...');
    try {
      // Initialize TTS if not already done
      TTSManager.initialize();
      
      // Test with a kana that should have local audio
      await TTSManager.speak('あ', { voice: 'female', context: 'kana' });
      addStatus('✅ TTS with local audio fallback worked!');
    } catch (error) {
      addError(`❌ TTS failed: ${error}`);
    }
  };

  const clearLogs = () => {
    setStatus([]);
    setErrors([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Audio System Test Page</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Test Audio Playback</h2>
            <div className="space-y-3">
              <button
                onClick={testKanaAudio}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Kana Audio (あ)
              </button>
              <button
                onClick={testKanjiAudio}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Test Kanji Audio (日)
              </button>
              <button
                onClick={testGameAudio}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Test Game Sound Effect
              </button>
              <button
                onClick={testTTSWithLocalFallback}
                className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Test TTS with Local Fallback
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
              <li>Click each button to test different audio systems</li>
              <li>Watch the console for detailed logs</li>
              <li>All audio should play with automatic retry on failure</li>
              <li>Service worker issues are automatically handled</li>
              <li>Check the status and error logs below</li>
            </ul>
            <button
              onClick={clearLogs}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {status.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold mb-3">Status Log</h3>
            <div className="bg-gray-50 p-4 rounded text-sm font-mono max-h-60 overflow-y-auto">
              {status.map((msg, idx) => (
                <div key={idx} className="text-green-600">{msg}</div>
              ))}
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">Error Log</h3>
            <div className="bg-red-50 p-4 rounded text-sm font-mono max-h-60 overflow-y-auto">
              {errors.map((msg, idx) => (
                <div key={idx} className="text-red-600">{msg}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}