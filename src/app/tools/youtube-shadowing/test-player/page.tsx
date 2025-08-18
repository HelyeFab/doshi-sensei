'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import HighFidelityShadowingPlayer from '../components/HighFidelityShadowingPlayer';
import { TranscriptLine } from '../YouTubeShadowing';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function TestPlayerPage() {
  const searchParams = useSearchParams();
  const [videoId, setVideoId] = useState('');
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // Parse video ID from URL
  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };
  
  // Load transcript from API
  const loadTranscript = async () => {
    const vidId = extractVideoId(videoUrl);
    if (!vidId) {
      setError('Invalid YouTube URL');
      return;
    }
    
    setVideoId(vidId);
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/youtube/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl })
      });
      
      const data = await response.json();
      
      if (data.success && data.transcript) {
        setTranscript(data.transcript);
      } else {
        setError(data.error || 'Failed to extract transcript');
      }
    } catch (err) {
      setError('Failed to load transcript');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Load from URL params if present
  useEffect(() => {
    const url = searchParams.get('url');
    if (url) {
      setVideoUrl(decodeURIComponent(url));
    }
  }, [searchParams]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/tools/youtube-shadowing"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to YouTube Shadowing
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900">
            High-Fidelity Shadowing Player (Test)
          </h1>
          <p className="text-gray-600 mt-1">
            Testing the new precision player with frame-accurate synchronization
          </p>
        </div>
        
        {/* Input Section */}
        {!videoId && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <button
                onClick={loadTranscript}
                disabled={!videoUrl || loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Loading Transcript...' : 'Load Video'}
              </button>
              
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Player Section */}
        {videoId && transcript.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Now Playing</h2>
              <button
                onClick={() => {
                  setVideoId('');
                  setTranscript([]);
                  setVideoUrl('');
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Load Different Video
              </button>
            </div>
            
            <HighFidelityShadowingPlayer
              videoId={videoId}
              transcript={transcript}
              onProgress={(time) => {
                // You can track progress here for analytics
                console.log('Progress:', time);
              }}
              showFurigana={true}
            />
            
            {/* Feature Highlights */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                High-Fidelity Features
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Frame-accurate synchronization (±50ms precision)</li>
                <li>• A/B repeat with adjustable pause between loops</li>
                <li>• Click any transcript line to instantly seek</li>
                <li>• Smooth auto-scroll with manual override</li>
                <li>• Preloading for seamless playback</li>
                <li>• Optimized for language shadowing practice</li>
              </ul>
            </div>
          </div>
        )}
        
        {/* Test Videos */}
        <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="font-semibold mb-4">Quick Test Videos</h3>
          <div className="grid gap-3">
            <button
              onClick={() => setVideoUrl('https://www.youtube.com/watch?v=WJzSBLCaKc8')}
              className="text-left p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="font-medium">Japanese News Sample</div>
              <div className="text-sm text-gray-600">NHK News - Clear pronunciation</div>
            </button>
            
            <button
              onClick={() => setVideoUrl('https://www.youtube.com/watch?v=9WN5JGhTamw')}
              className="text-left p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="font-medium">Anime Dialogue</div>
              <div className="text-sm text-gray-600">Natural conversation speed</div>
            </button>
            
            <button
              onClick={() => setVideoUrl('https://www.youtube.com/watch?v=jtBV3GgQLg8')}
              className="text-left p-3 border rounded-lg hover:bg-gray-50"
            >
              <div className="font-medium">Japanese Podcast</div>
              <div className="text-sm text-gray-600">Long-form content</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}