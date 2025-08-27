# 📚 Vocabulary Search History System Analysis

## Overview
Yes, **word searches ARE stored** for users to see their search history on the vocabulary page!

## Storage Architecture

### 1. **Dual Storage System**
The app uses a smart dual-storage approach based on user type:

| User Type | Storage Location | Sync to Firebase |
|-----------|-----------------|------------------|
| **Guest** | IndexedDB (local only) | ❌ No |
| **Free** | IndexedDB (local only) | ❌ No |
| **Monthly** | IndexedDB + Firebase | ✅ Yes |
| **Yearly** | IndexedDB + Firebase | ✅ Yes |

### 2. **Firebase Storage Structure**
For premium users (monthly/yearly), search history is stored at:
```
/users/{userId}/searchHistory/data
```

Each document contains:
- **history**: Array of search entries (up to 100 most recent)
- **lastUpdated**: Timestamp of last sync
- **count**: Total number of searches stored

### 3. **Data Stored Per Search**
Each search entry includes:
```typescript
{
  id: string,              // Unique identifier
  searchTerm: string,      // What the user searched for
  results: JapaneseWord[], // Top 10 results (truncated for Firebase)
  timestamp: number,       // When the search happened
  source: 'jmdict' | 'wanikani', // Which dictionary was used
  resultsCount: number     // Total number of results found
}
```

## Current Firebase Data (as of audit)
- **Total Users**: 3
- **Users with Search History**: 1 (you - yearly subscriber)
- **Your Recent Searches**:
  1. "車" (car in kanji) - Found 30 words
  2. "car" (English) - Found 30 words

## How It Works

### When User Searches:
1. User types search term and hits enter
2. `VocabularyPage.tsx` calls `handleSearch()`
3. Search is performed against JMdict or WaniKani
4. Results are displayed
5. `SearchHistoryManager2.addSearchEntry()` is called
6. Entry is saved to IndexedDB immediately
7. For premium users, synced to Firebase

### When User Views History:
1. Page loads and calls `loadSearchHistory()`
2. `SearchHistoryManager2.getSearchHistory()` checks user type
3. Premium users: Tries Firebase first, falls back to IndexedDB
4. Free/Guest users: Loads from IndexedDB only
5. History displayed in UI with clickable entries

## Key Features

### ✅ What's Working:
- Search history IS being saved
- Premium users get cloud sync across devices
- Free users get local history
- Maximum 100 searches stored (oldest auto-deleted)
- Duplicate searches are deduplicated (latest replaces older)
- Can clear entire history
- Can delete individual entries

### 🎯 Benefits:
- **Cross-device sync** for premium users
- **Privacy preserved** for free users (local only)
- **Offline access** (IndexedDB works offline)
- **Fast loading** (IndexedDB is immediate, Firebase is backup)

## Code Locations

### Core Files:
- `/src/utils/searchHistoryManager2.ts` - Main manager class
- `/src/app/vocabulary/VocabularyPage.tsx` - UI implementation
- `/src/utils/userScopedStorage.ts` - IndexedDB wrapper

### Key Functions:
```typescript
// Add a search to history
SearchHistoryManager2.addSearchEntry(
  searchTerm,
  results,
  user,
  userType,
  source
);

// Get all history
SearchHistoryManager2.getSearchHistory(user, userType);

// Clear history
SearchHistoryManager2.clearSearchHistory(user, userType);
```

## Storage Limits

### IndexedDB (Local):
- **Capacity**: Usually 50% of free disk space
- **Per-origin limit**: Varies by browser (typically GB range)
- **No expiration**: Data persists until cleared

### Firebase (Cloud):
- **Document size limit**: 1MB per document
- **Optimization**: Only top 10 results per search stored
- **Retention**: Indefinite for premium users

## Privacy & Security

### Data Handling:
- **Guest users**: All data stays local
- **Free users**: All data stays local
- **Premium users**: Synced to Firebase with user authentication
- **No sharing**: Search history is private per user

### Data Cleanup:
- Users can clear their entire history
- Users can delete individual searches
- Downgraded users keep Firebase data (but no new syncs)

## Conclusion

**YES**, the vocabulary search history is fully implemented and working! Every search is saved and users can see their complete search history on the vocabulary page. Premium users get the added benefit of cross-device sync through Firebase.

The system is well-designed with:
- Appropriate storage based on user tier
- Good performance (IndexedDB for speed, Firebase for sync)
- Privacy considerations (free users' data stays local)
- Proper data management (limits, deduplication, cleanup options)