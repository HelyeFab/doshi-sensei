# TTS Cache Implementation Guide

## Overview

The new TTS implementation uses Firebase Storage to cache full article audio, significantly reducing API calls and costs while improving performance.

## Key Improvements

1. **Single API Call per Article**: Instead of making one API call per sentence, we now generate audio for the entire article in one request.

2. **Firebase Storage Caching**: Generated audio is stored in Firebase Storage and reused for subsequent plays.

3. **Content-Based Cache Keys**: Cache keys include a content hash, so if an article is edited, new audio will be generated.

4. **Automatic Cache Management**: Old cache files are automatically cleaned up after 30 days.

## Architecture

### Components

1. **`FirebaseTTSCache`** (`/src/utils/ttsFirebaseCache.ts`)
   - Manages Firebase Storage operations
   - Generates cache keys based on article ID, content hash, voice, and provider
   - Handles upload, download, and deletion of cached audio

2. **`ArticleTTSManager`** (`/src/utils/articleTTS.ts`)
   - High-level API for article audio generation
   - Handles both ElevenLabs and Google TTS providers
   - Manages audio playback with HTMLAudioElement

3. **`/api/tts/article`** Route (`/src/app/api/tts/article/route.ts`)
   - Server-side endpoint for generating full article audio
   - Handles provider fallback (ElevenLabs → Google)
   - Manages Google TTS chunk splitting (5000 char limit)

4. **`ImprovedArticleAudioPlayer`** (`/src/components/audio/ImprovedArticleAudioPlayer.tsx`)
   - Enhanced UI component with progress tracking
   - Voice and provider selection
   - Playback speed and volume controls

## Usage

### Basic Implementation

```tsx
import ArticleTTSManager from '@/utils/articleTTS';

// Generate and play article audio
const playArticle = async () => {
  try {
    const audio = await ArticleTTSManager.playArticle(
      article.id,
      article.content,
      {
        voice: 'male',
        provider: 'elevenlabs',
        onProgress: (status) => console.log(status)
      }
    );
    
    // Audio is now playing
  } catch (error) {
    console.error('Failed to play article:', error);
  }
};

// Preload audio for better UX
await ArticleTTSManager.preloadArticleAudio(
  article.id,
  article.content,
  { voice: 'female', provider: 'google' }
);
```

### Using the Component

```tsx
import ImprovedArticleAudioPlayer from '@/components/audio/ImprovedArticleAudioPlayer';

function ArticlePage({ article }) {
  return (
    <div>
      <h1>{article.title}</h1>
      <ImprovedArticleAudioPlayer article={article} />
      <div>{article.content}</div>
    </div>
  );
}
```

## Migration Guide

### 1. Update Article Audio Players

Replace the old `ArticleAudioPlayer` with `ImprovedArticleAudioPlayer`:

```tsx
// Old
import ArticleAudioPlayer from '@/components/audio/ArticleAudioPlayer';

// New
import ImprovedArticleAudioPlayer from '@/components/audio/ImprovedArticleAudioPlayer';
```

### 2. Update Firebase Storage Rules

Deploy the updated storage rules to allow authenticated users to write to the TTS cache:

```bash
firebase deploy --only storage
```

### 3. Environment Variables

Ensure these environment variables are set:
- `NEXT_PUBLIC_ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_TTS_API_KEY`

## Cache Management

### Manual Cache Operations

```typescript
// Get cache statistics
const stats = await ArticleTTSManager.getCacheStats();
console.log(`Cache size: ${stats.totalSizeFormatted}`);
console.log(`Total files: ${stats.totalFiles}`);

// Clear old cache (older than 30 days)
await ArticleTTSManager.clearOldCache(30);

// Clear specific article cache
await ArticleTTSManager.clearArticleCache(
  articleId,
  content,
  'male',
  'elevenlabs'
);
```

### Automatic Cleanup

Consider adding a scheduled function to clean up old cache:

```typescript
// In a Firebase Function or cron job
import FirebaseTTSCache from '@/utils/ttsFirebaseCache';

export const cleanupTTSCache = async () => {
  const cache = FirebaseTTSCache.getInstance();
  await cache.clearOldCache(30); // Remove files older than 30 days
};
```

## Cost Optimization

### ElevenLabs Pricing
- ~$0.18 per 1000 characters
- With caching, each article is only generated once

### Google TTS Pricing
- ~$0.016 per 1000 characters (Neural2 voices)
- Significantly cheaper but lower quality

### Example Savings
- Article with 2000 characters
- Read 100 times per month
- Without caching: 100 × $0.36 = $36
- With caching: 1 × $0.36 = $0.36
- **Savings: 99%**

## Performance Benefits

1. **Instant Playback**: Cached audio loads immediately
2. **Reduced Latency**: No API calls for cached content
3. **Better UX**: Progress indicators and preloading
4. **Offline Support**: Cached URLs work offline (with service worker)

## Troubleshooting

### Common Issues

1. **"Failed to generate audio"**
   - Check API keys are set correctly
   - Verify Firebase Storage rules are deployed
   - Check browser console for specific errors

2. **Cache not working**
   - Ensure user is authenticated
   - Check Firebase Storage permissions
   - Verify storage bucket is configured

3. **Audio quality issues**
   - Try switching between providers
   - Adjust voice settings in the player
   - Check content formatting (remove special characters)

## Future Enhancements

1. **Background Preloading**: Automatically preload next article
2. **Offline Mode**: Download articles for offline listening
3. **Custom Voices**: Allow users to select from more voice options
4. **SSML Support**: Enhanced pronunciation and emphasis
5. **Analytics**: Track most-listened articles