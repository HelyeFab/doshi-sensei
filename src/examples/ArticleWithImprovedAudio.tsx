'use client';

import { NewsArticle } from '@/types/news';
import dynamic from 'next/dynamic';

const EnhancedArticleAudioPlayer = dynamic(
  () => import('@/components/audio/EnhancedArticleAudioPlayer'),
  { 
    ssr: false,
    loading: () => <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />
  }
);

// Example of how to use the improved audio player
export default function ArticleWithImprovedAudio({ article }: { article: NewsArticle }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Article Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{article.title}</h1>
        <p className="text-muted-foreground">
          {new Date(article.publishedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Improved Audio Player with Caching */}
      <EnhancedArticleAudioPlayer article={article} />

      {/* Article Content */}
      <div className="prose dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap">{article.content}</p>
      </div>

      {/* Feature Highlights */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">New TTS Features:</h3>
        <ul className="space-y-1 text-sm">
          <li>✅ Single API call for entire article (not per sentence)</li>
          <li>✅ Firebase Storage caching for instant replay</li>
          <li>✅ Voice selection (Male/Female)</li>
          <li>✅ Provider selection (ElevenLabs/Google)</li>
          <li>✅ Playback speed control</li>
          <li>✅ Progress tracking with seek</li>
          <li>✅ Volume control</li>
          <li>✅ Automatic cache management</li>
        </ul>
      </div>
    </div>
  );
}

// Example usage in a page
export function ExampleUsage() {
  const sampleArticle: NewsArticle = {
    id: 'sample-123',
    title: '日本の新しい技術',
    content: '日本の科学者たちは、新しい技術を開発しました。この技術は、環境に優しく、効率的です。多くの企業がこの技術に興味を持っています。',
    source: 'Example News',
    url: 'https://example.com/article',
    publishedAt: new Date().toISOString(),
    imageUrl: 'https://example.com/image.jpg',
    category: 'Technology',
    extractedVocabulary: []
  };

  return <ArticleWithImprovedAudio article={sampleArticle} />;
}