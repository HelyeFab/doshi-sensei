# Enhanced Storage System Documentation

This document describes the comprehensive data persistence solution implemented for the Doshi Sensei Japanese learning application. The system provides IndexedDB-based storage with localStorage fallback for robust data management.

## Overview

The storage system consists of three main components:

1. **IndexedDB Implementation** (`indexedDB.ts`) - Advanced client-side database
2. **Enhanced Storage Manager** (`storage.ts`) - Unified API with fallback support
3. **Storage Demo** (`storageDemo.ts`) - Usage examples and testing utilities

## Features

### Core Data Persistence

- ✅ **User Settings** - Theme, display preferences, daily goals
- ✅ **Progress Data** - Word mastery levels, review schedules, statistics
- ✅ **Recently Viewed Words** - Quick access to recent vocabulary
- ✅ **Vocabulary Caching** - Offline support for JLPT word lists
- ✅ **API Response Caching** - Reduced network requests
- ✅ **Study Session Tracking** - Learning analytics and patterns
- ✅ **Words Database** - Local vocabulary management

### Advanced Features

- 🔄 **Automatic Fallback** - Seamless degradation to localStorage
- 📊 **Storage Analytics** - Usage monitoring and optimization
- 🧹 **Cache Management** - Automatic cleanup of expired data
- 🔄 **Data Migration** - Smooth transition from localStorage to IndexedDB
- ⚡ **Performance Optimized** - Indexed queries and batch operations

## Quick Start

### Basic Usage

```typescript
import EnhancedStorageManager from '@/utils/storage';

// Initialize storage system
await EnhancedStorageManager.initialize();

// Save user settings
const settings = {
  theme: 'dark',
  showRomaji: true,
  dailyGoal: 50,
  practiceReminders: true
};
await EnhancedStorageManager.saveSettings(settings);

// Load settings
const loadedSettings = await EnhancedStorageManager.loadSettings();
```

### Progress Tracking

```typescript
import { UserProgress } from '@/types';

// Save word progress
const progress: UserProgress = {
  id: 'progress_word_123',
  wordId: 'word_arigatou',
  correctAnswers: 8,
  totalAttempts: 10,
  lastReviewed: new Date(),
  difficulty: 'easy',
  nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  masteryLevel: 80
};

await EnhancedStorageManager.saveProgress(progress);

// Get progress for specific word
const wordProgress = await EnhancedStorageManager.getProgress('word_arigatou');

// Get all progress data
const allProgress = await EnhancedStorageManager.getAllProgress();
```

### Recently Viewed Words

```typescript
// Add word to recently viewed
await EnhancedStorageManager.addRecentlyViewed('word_konnichiwa', 'vocabulary_page');

// Get recent words (returns word IDs)
const recentWordIds = await EnhancedStorageManager.getRecentlyViewedWordIds(10);
```

## Advanced Features (IndexedDB Only)

These features are only available when IndexedDB is supported. They gracefully degrade when using localStorage fallback.

### Vocabulary Caching

```typescript
import { JapaneseWord, JLPTLevel } from '@/types';

// Cache vocabulary for offline use
const n5Words: JapaneseWord[] = [
  {
    id: 'word_arigatou',
    kanji: 'ありがとう',
    kana: 'ありがとう',
    romaji: 'arigatou',
    meaning: 'thank you',
    type: 'other',
    jlpt: 'N5'
  }
  // ... more words
];

await EnhancedStorageManager.cacheVocabularyData('N5', n5Words);

// Retrieve cached vocabulary
const cachedWords = await EnhancedStorageManager.getCachedVocabularyData('N5');
```

### Study Session Analytics

```typescript
import { StudySessionManager } from '@/utils/indexedDB';

// Save study session
const session = {
  id: `session_${Date.now()}`,
  userId: 'user_123',
  startTime: new Date(Date.now() - 30 * 60 * 1000),
  endTime: new Date(),
  wordsStudied: ['word_arigatou', 'word_konnichiwa'],
  accuracy: 0.85,
  sessionType: 'practice' as const
};

await StudySessionManager.saveSession(session);

// Get analytics
const stats = await StudySessionManager.getSessionStats(7); // Last 7 days
console.log(stats);
// {
//   totalSessions: 15,
//   totalWordsStudied: 142,
//   averageAccuracy: 0.78,
//   sessionsByType: { practice: 10, drill: 3, review: 2 }
// }
```

### API Response Caching

```typescript
import { APICacheManager } from '@/utils/indexedDB';

// Cache API response (1 hour default)
const apiResponse = { words: [...], total: 100 };
await APICacheManager.cacheAPIResponse('/api/words', { level: 'N5' }, apiResponse);

// Retrieve cached response
const cached = await APICacheManager.getCachedAPIResponse('/api/words', { level: 'N5' });
if (cached) {
  // Use cached data instead of making API call
  return cached;
}
```

### Words Database Management

```typescript
import { WordsManager } from '@/utils/indexedDB';

// Save words to local database
await WordsManager.saveWords(japaneseWords);

// Search words
const results = await WordsManager.searchWords('arigatou');

// Get words by JLPT level
const n4Words = await WordsManager.getWordsByJLPT('N4');

// Get specific word
const word = await WordsManager.getWord('word_arigatou');
```

## Storage Management

### Storage Information

```typescript
// Get storage type and usage
const info = await EnhancedStorageManager.getStorageInfo();
console.log(info);
// {
//   type: 'IndexedDB', // or 'localStorage'
//   available: true,
//   usage: { settings: 1, progress: 45, words: 1250, ... }
// }
```

### Cache Maintenance

```typescript
import { VocabularyCacheManager, APICacheManager } from '@/utils/indexedDB';

// Clear expired caches
await VocabularyCacheManager.clearExpiredCache();
await APICacheManager.clearExpiredAPICache();

// Clear specific vocabulary cache
await EnhancedStorageManager.clearVocabularyCache('N5');

// Clear all data
await EnhancedStorageManager.clearAllData();
```

## Database Schema

The IndexedDB implementation uses the following stores:

| Store Name | Purpose | Key Path | Indexes |
|------------|---------|----------|---------|
| `settings` | User preferences | `id` | `updatedAt` |
| `progress` | Word learning progress | `id` | `wordId`, `lastReviewed`, `nextReviewDate`, `masteryLevel`, `difficulty` |
| `studySessions` | Learning session data | `id` | `userId`, `startTime`, `sessionType` |
| `recentlyViewed` | Recently accessed words | `id` | `wordId`, `viewedAt`, `context` |
| `vocabularyCache` | Cached word lists | `id` | `jlptLevel`, `cacheDate`, `expiryDate` |
| `apiCache` | Cached API responses | `id` | `endpoint`, `cacheDate`, `expiryDate` |
| `words` | Local word database | `id` | `jlpt`, `type`, `kanji`, `kana` |
| `drillSessions` | Drill session states | `id` | `completed`, `startTime` |

## Performance Considerations

### Indexing Strategy

The system uses strategic indexing for optimal query performance:

- **Progress queries** - Indexed by `wordId` for fast lookups
- **Review scheduling** - Indexed by `nextReviewDate` for due word queries
- **Analytics** - Indexed by `startTime` for time-based analysis
- **Search** - Indexed by `kanji`, `kana` for vocabulary searches

### Cache Durations

- **Vocabulary Cache**: 7 days (configurable)
- **API Cache**: 1 hour (configurable)
- **Recently Viewed**: 100 items max (auto-cleanup)

### Batch Operations

```typescript
// Efficient batch word saving
await WordsManager.saveWords(largeWordArray); // Uses transaction

// Avoid individual saves in loops
// ❌ Slow
for (const word of words) {
  await WordsManager.saveWord(word);
}

// ✅ Fast
await WordsManager.saveWords(words);
```

## Error Handling

The system implements comprehensive error handling:

```typescript
try {
  await EnhancedStorageManager.saveSettings(settings);
} catch (error) {
  console.error('Storage error:', error);
  // System automatically falls back to localStorage if IndexedDB fails
}
```

### Graceful Degradation

- **IndexedDB unavailable** → Falls back to localStorage
- **Storage quota exceeded** → Clears expired caches automatically
- **Corruption detected** → Rebuilds database from scratch
- **Network offline** → Uses cached data when available

## Migration Strategy

The system automatically migrates data from localStorage to IndexedDB:

1. **Initialization** - Checks for existing localStorage data
2. **Migration** - Transfers settings and basic data to IndexedDB
3. **Cleanup** - Removes migrated data from localStorage
4. **Verification** - Confirms successful migration

## Testing and Demo

### Running the Demo

```typescript
import { StorageDemo } from '@/utils/storageDemo';

// Run complete demonstration
await StorageDemo.runCompleteDemo();

// Run specific feature demos
await StorageDemo.demoSettings();
await StorageDemo.demoProgress();
await StorageDemo.demoVocabularyCache();

// Clean up demo data
await StorageDemo.clearDemoData();
```

### Browser Console Testing

Open browser DevTools and run:

```javascript
// Quick test
import('@/utils/storageDemo').then(({ StorageDemo }) => {
  StorageDemo.runCompleteDemo();
});
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Storage API | ✅ | ✅ | ✅ | ✅ |
| localStorage fallback | ✅ | ✅ | ✅ | ✅ |

### Minimum Requirements

- **IndexedDB**: All modern browsers (IE 10+)
- **localStorage**: Universal support
- **Async/await**: Modern browsers or transpiled code

## Security Considerations

1. **Local Storage Only** - All data stored client-side
2. **No Sensitive Data** - Avoid storing passwords or tokens
3. **Data Validation** - Input sanitization for all stored data
4. **HTTPS Recommended** - For production deployments

## Troubleshooting

### Common Issues

**IndexedDB not working**
```typescript
const info = await EnhancedStorageManager.getStorageInfo();
console.log('Storage type:', info.type);
// Should fall back to localStorage automatically
```

**Storage quota exceeded**
```typescript
// Clear caches to free space
await VocabularyCacheManager.clearExpiredCache();
await APICacheManager.clearExpiredAPICache();
```

**Performance issues**
```typescript
// Check storage usage
const usage = await getStorageUsage();
console.log('Storage usage:', usage);
```

### Debug Mode

Enable detailed logging by adding to browser console:

```javascript
localStorage.setItem('DEBUG_STORAGE', 'true');
```

## Future Enhancements

- 🔄 **Cloud Sync** - Optional backup to cloud storage
- 📱 **Mobile Optimization** - React Native compatibility
- 🔍 **Advanced Search** - Full-text search capabilities
- 📊 **Export/Import** - Data portability features
- 🔐 **Encryption** - Optional data encryption layer

## Contributing

When extending the storage system:

1. **Add new types** to `src/types/index.ts`
2. **Extend database schema** in `indexedDB.ts`
3. **Update managers** with new functionality
4. **Add demo examples** to `storageDemo.ts`
5. **Update documentation** in this README

## API Reference

For complete API documentation, see the TypeScript definitions in each file:

- [`indexedDB.ts`](./indexedDB.ts) - Core IndexedDB implementation
- [`storage.ts`](./storage.ts) - Enhanced storage manager
- [`storageDemo.ts`](./storageDemo.ts) - Usage examples
