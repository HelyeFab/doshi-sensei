# TTS Cache Implementation Guide

## Overview

The TTS implementation uses a dual-layer caching strategy:
1. **Client-side caching** (IndexedDB) - Stores audio blobs locally for 60 days
2. **Server-side caching** (Firebase Storage) - Stores generated audio for 30 days

This approach significantly reduces API calls and costs while improving performance and enabling offline playback.

## Key Improvements

1. **Single API Call per Article**: Instead of making one API call per sentence, we now generate audio for the entire article in one request.

2. **Firebase Storage Caching**: Generated audio is stored in Firebase Storage and reused for subsequent plays.

3. **Content-Based Cache Keys**: Cache keys include a content hash, so if an article is edited, new audio will be generated.

4. **Automatic Cache Management**: Old cache files are automatically cleaned up after 30 days.

## Architecture

### Components

1. **`AudioCache`** (`/src/lib/cache/audioCache.ts`)
   - Client-side IndexedDB caching for audio blobs
   - 60-day cache duration
   - Respects user storage limits (guest: 100, free: 500, premium: unlimited)
   - Handles batch caching and offline playback

2. **`FirebaseTTSCache`** (`/src/utils/ttsFirebaseCache.ts`)
   - Server-side Firebase Storage operations
   - Generates cache keys based on article ID, content hash, voice, and provider
   - 30-day automatic cleanup
   - Handles upload, download, and deletion of cached audio

3. **`ArticleTTSManager`** (`/src/utils/articleTTS.ts`)
   - High-level API for article audio generation
   - **NEW**: Integrated client-side caching via AudioCache
   - Checks client cache first, then Firebase Storage, then generates new audio
   - Handles both ElevenLabs and Google TTS providers
   - Manages audio playback with HTMLAudioElement

4. **`/api/tts/article`** Route (`/src/app/api/tts/article/route.ts`)
   - Server-side endpoint for generating full article audio
   - Handles provider fallback (ElevenLabs → Google)
   - Manages Google TTS chunk splitting (5000 char limit)
   - Returns either Firebase Storage URLs or base64 audio data

5. **`ImprovedArticleAudioPlayer`** (`/src/components/audio/ImprovedArticleAudioPlayer.tsx`)
   - Enhanced UI component with progress tracking
   - Voice and provider selection
   - Playback speed and volume controls
   - Automatically benefits from client-side caching

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

### Client-Side Cache Operations

```typescript
import { AudioCache } from '@/lib/cache/audioCache';

// Get client cache statistics
const stats = await AudioCache.getCacheStats();
console.log(`Cached audio files: ${stats.count}`);
console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
console.log(`By type:`, stats.byType);

// Clear all client-side audio cache
await AudioCache.clearCache();

// Pre-cache common sounds (e.g., kana)
await AudioCache.preCacheCommonSounds('free'); // user type
```

### Server-Side Cache Operations

```typescript
// Get Firebase Storage cache statistics
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

1. **Instant Playback**: Client-cached audio loads immediately from IndexedDB
2. **Offline Support**: Audio works completely offline after initial cache
3. **Reduced Latency**: No network calls for cached content
4. **Better UX**: Progress indicators and preloading
5. **Storage Efficiency**: Respects user tier limits automatically

## Troubleshooting

### Common Issues

1. **"Failed to generate audio"**
   - Check API keys are set correctly
   - Verify Firebase Storage rules are deployed
   - Check browser console for specific errors

2. **Client-side cache not working**
   - Check IndexedDB support in browser
   - Verify storage limits not exceeded
   - Check browser console for quota errors
   - Clear cache and retry: `await AudioCache.clearCache()`

3. **Firebase Storage cache errors**
   - Ensure user is authenticated
   - Check Firebase Storage permissions
   - Verify storage bucket is configured
   - Check for "bucket does not exist" errors in console

4. **Audio quality issues**
   - Try switching between providers
   - Adjust voice settings in the player
   - Check content formatting (remove special characters)

## Implementation Status

### ✅ Completed (January 2025)
- Client-side audio caching with IndexedDB (60-day expiration)
- Integration with ArticleTTSManager
- Automatic caching for articles and stories
- Storage limit enforcement by user tier
- Offline playback support

### 🚧 Existing Features
- Firebase Storage caching (server-side)
- Full article audio generation
- Provider fallback (ElevenLabs → Google)
- Audio player UI components

## Future Enhancements

1. **Background Preloading**: Automatically preload next article
2. **Batch Download**: Download multiple articles for offline listening
3. **Custom Voices**: Allow users to select from more voice options
4. **SSML Support**: Enhanced pronunciation and emphasis
5. **Analytics**: Track most-listened articles
6. **Progressive Caching**: Cache as user listens (streaming)