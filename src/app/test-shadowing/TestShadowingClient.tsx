'use client';

import { useState } from 'react';
import ShadowingAudioPlayer from '@/components/audio/ShadowingAudioPlayer';
import { NewsArticle } from '@/types/news';

export default function TestShadowingClient() {
  const [showPlayer, setShowPlayer] = useState(false);

  // Sample article for testing
  const sampleArticle: NewsArticle = {
    id: 'test-article-1',
    title: 'Sample Article for Shadowing Practice',
    content: '今日は天気がいいです。公園に行きましょう。桜がとてもきれいです。友達と一緒に写真を撮りました。楽しい一日でした。',
    summary: 'A sample article for testing shadowing practice',
    url: '#',
    imageUrl: '',
    audioUrl: null,
    publishDate: new Date(),
    scrapedAt: new Date(),
    source: {
      id: 'test',
      name: 'Test',
      displayName: 'Test Source'
    },
    category: 'test',
    tags: ['test'],
    difficulty: 'N5',
    estimatedReadingTime: 1,
    vocabulary: [],
    grammarPoints: [],
    kanji: [],
    isBookmarked: false,
    readingProgress: 0
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Shadowing Practice Test</h1>
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-card border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Sample Article</h2>
          <p className="text-lg japanese-text mb-4">{sampleArticle.content}</p>
          
          <button
            onClick={() => setShowPlayer(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open Shadowing Practice
          </button>
        </div>

        <div className="bg-muted/50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">About Shadowing Practice</h3>
          <ul className="space-y-2 text-sm">
            <li>• Listen to each sentence one at a time</li>
            <li>• Repeat the sentence during the pause</li>
            <li>• Adjust speed and repeat count to match your level</li>
            <li>• Navigate between sentences with previous/next buttons</li>
            <li>• Click on any sentence in the list to jump to it</li>
          </ul>
        </div>
      </div>

      {showPlayer && (
        <ShadowingAudioPlayer 
          article={sampleArticle} 
          onClose={() => setShowPlayer(false)}
        />
      )}
    </div>
  );
}