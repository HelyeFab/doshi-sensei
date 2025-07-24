# Anki Integration Documentation

## Overview

Doshi Sensei now supports importing Anki decks (.apkg files) and uses Anki's proven spaced repetition algorithm for ALL flashcards in the app. This is a premium-only feature that preserves the exact learning experience from Anki while integrating seamlessly with our study list system.

## Key Features

### 🎯 Anki Import
- Import .apkg files up to 200MB
- Drag-and-drop UI in the Favourites page
- Progress tracking during import
- Media files (images/audio) uploaded to Firebase Storage (temporarily disabled)
- Each deck becomes a study list of type 'flashcard'
- **Note**: Anki content is currently stored locally only and not synced to Firebase

### 🧠 Enhanced Anki-Accurate SRS Algorithm
- **ALL flashcards use an improved Anki-accurate SM-2 algorithm**
- More faithful to Anki's actual implementation than our previous version
- Key improvements:
  - Fuzz factor prevents cards bunching on same day
  - Overdue card handling with delay adjustment
  - Configurable learning steps and parameters
  - Minimum ease of 1.3 (130%) enforcement
  - Maximum interval of 36,500 days (100 years)
  - Leech detection after configurable lapses
  - Preview of next review times on buttons
- Supports all Anki card states (new/learning/review/relearning)
- Premium users get cross-device SRS sync

### 📱 Seamless Integration
- Imported cards appear in regular study lists
- Work with all review modes (SRS, Lists, Random)
- HTML content and media rendering support
- Compatible with existing access control system

## Technical Architecture

### Core Components

1. **AnkiImporter** (`/src/utils/ankiImporter.ts`)
   - Parses .apkg files using anki-reader library
   - Extracts cards, media, and SRS data
   - Uploads media to Firebase Storage (currently disabled)
   - Creates study lists with imported cards
   - Stores data locally in IndexedDB via `largeDataStorage`

2. **AnkiSRSImproved** (`/src/utils/ankiSRSImproved.ts`)
   - Implements Anki's SM-2 algorithm with enhanced accuracy
   - Handles all card states and transitions
   - Calculates next review dates with fuzz factor
   - Manages ease factors and intervals
   - Configurable parameters matching Anki desktop
   - Overdue card delay adjustment
   - Next review time preview calculation

3. **FlashcardSRSManager** (`/src/utils/flashcardSRSManager.ts`)
   - Manages SRS data storage and sync
   - Uses IndexedDB for local storage
   - Premium users get Firebase sync
   - Undo functionality with 10-item stack
   - Automatic cleanup of old cards (365+ days)
   - Statistics generation

4. **SRS Configuration** (`/src/components/flashcards/SRSSettingsModal.tsx`)
   - Full Anki-style configuration UI
   - Customizable learning steps
   - Adjustable ease bonus and interval modifier
   - Lapse handling configuration
   - Reset to defaults option

3. **Enhanced Types**
   - Added `anki_card` to `StudyItemType`
   - Extended `SavedStudyItem` with `ankiData` field
   - Updated `StudyList` to support metadata

5. **UI Components**
   - `AnkiImportModal` - Drag-and-drop import interface with list limit validation
   - Enhanced `FlashcardDisplay` - Renders HTML/media content with sanitization
   - Updated flashcard page - Displays Anki cards with SRS configuration
   - `SRSSettingsModal` - Configure algorithm parameters
   - `HTMLSanitizer` - Prevents XSS attacks in Anki content

## User Flow

1. **Import Process**
   ```
   Favourites Page → Import Anki Button → Select .apkg file
   → Progress bar → Success → New study list created
   ```

2. **Review Process**
   ```
   Flashcard Review → Select list with Anki cards
   → Cards display with HTML/media → Rate card
   → SRS algorithm calculates next review
   ```

## Data Structure

### Anki Card Storage
```typescript
{
  id: string,
  itemType: 'anki_card',
  ankiData: {
    originalId: string,
    deckName: string,
    cardType: 'basic' | 'cloze' | 'reverse',
    front: string,  // HTML content
    back: string,   // HTML content
    tags: string[],
    media: string[], // Firebase URLs (when enabled)
    srsData: {
      due: Date,
      interval: number,
      ease: number,
      reviews: number,
      lapses: number,
      lastReview?: Date,
      status: 'new' | 'learning' | 'review' | 'relearning'
    }
  }
}
```

### Storage Location
- **Primary**: IndexedDB database `DoshiSenseiLargeData`, store `savedStudyItems`
- **Fallback**: localStorage key `doshi_sensei_saved_study_items`
- **Cloud Sync**: Currently disabled for Anki content

## Configuration

### Feature Registry
```typescript
'anki_import': {
  id: 'anki_import',
  name: 'Import Anki Decks',
  description: 'Import your Anki decks into study lists (Premium)',
  category: 'storage',
  icon: '📥',
  limitType: 'none',
  requiresAuth: true,
  requiresSubscription: true, // Premium only
  status: 'active',
  metadata: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    allowedFormats: ['.apkg', '.anki2']
  }
}
```

### SQL.js Configuration
The anki-reader library requires sql.js to read SQLite databases in the browser:
- WASM files loaded from CDN
- Initialized before parsing .apkg files
- Configuration in `/src/lib/anki/config.ts`

## Security & Performance

### Security
- Premium-only access control for imports
- File size validation (200MB max)
- Firebase Storage for media (secure URLs) - temporarily disabled
- **HTML content sanitization implemented** - Prevents XSS attacks
  - Whitelist of allowed HTML tags and attributes
  - CSS property filtering
  - Script tag removal
  - Event handler stripping
- Local-only storage prevents unauthorized cloud access
- List count validation (3 lists max for free users)

### Performance
- Progress tracking for large imports
- Improved bulk save operation for large decks
- Fixed IndexedDB transaction handling for reliable saves
- Efficient batch operations with proper error handling
- Pagination support (50 items per page)
- **SRS Optimizations**:
  - Batch SRS data updates
  - Background cleanup for old cards (premium)
  - Efficient Firebase sync for premium users
  - Local caching with IndexedDB

## Future Enhancements

1. **✅ COMPLETED: Persistent SRS Storage**
   - SRS data stored in IndexedDB
   - Premium users get Firebase sync
   - Review history tracked per card
   - Undo functionality for last review

2. **Advanced Card Types**
   - Cloze deletion support
   - Reverse card handling
   - Custom field mapping

3. **Export Functionality**
   - Export back to .apkg format
   - Maintain compatibility with Anki desktop

4. **Advanced Statistics** (See [ADVANCED_FEATURES_ROADMAP.md](./ADVANCED_FEATURES_ROADMAP.md))
   - Comprehensive learning analytics dashboard
   - Retention curves and forgetting curves
   - Heat map calendar of study activity
   - Performance insights and recommendations
   - JLPT readiness predictions

5. **Collaborative Features** (Premium)
   - Deck sharing marketplace
   - Rate and review shared decks
   - Follow deck creators
   - Deck update notifications

## Development Guidelines

### Adding New Features
1. Always preserve Anki's data integrity
2. Use AnkiSRS for all SRS calculations
3. Test with various deck types
4. Consider mobile performance

### Testing
- Test deck available: `/public/anki/Japanese_Core_2000_2k_-_Sorted_w_Audio.apkg`
- Verify media upload and rendering
- Check SRS calculations match Anki
- Test with large decks (performance)

## Troubleshooting

### Common Issues
1. **Import fails**: Check file size and format
2. **Media not showing**: Media upload currently disabled
3. **Cards not appearing**: Check IndexedDB storage and pagination
4. **SRS not working**: Ensure ankiData.srsData is preserved
5. **Incomplete imports**: Fixed in latest update - check IndexedDB transaction handling

### Debug Tools
- Browser console for import errors
- IndexedDB inspector (Application tab > Storage > IndexedDB > DoshiSenseiLargeData)
- Test page available at `/test-indexeddb.html` for storage verification
- Check localStorage fallback if IndexedDB fails

## Recent Updates (January 2025)

### Major SRS Algorithm Upgrade
1. **Anki-Accurate Algorithm**: Complete rewrite to match Anki desktop behavior
2. **Configurable Parameters**: Full control over learning steps, ease bonus, intervals
3. **Cross-Device Sync**: Premium users get SRS data sync via Firebase
4. **Enhanced Security**: HTML sanitization prevents XSS attacks
5. **Better UX**: Review buttons show actual next review times

### Storage Architecture Changes
1. **Dual Storage**: Local IndexedDB + optional Firebase sync for premium
2. **SRS Data Management**: New `FlashcardSRSManager` handles all SRS operations
3. **Improved Reliability**: Fixed IndexedDB transaction handling for large imports
4. **Pagination Fix**: Resolved issue where only 41 items displayed from 2000+ card imports

### Technical Changes
- **NEW**: `ankiSRSImproved.ts` - Enhanced algorithm implementation
- **NEW**: `flashcardSRSManager.ts` - SRS data storage and sync
- **NEW**: `htmlSanitizer.ts` - Security for Anki HTML content
- **NEW**: `SRSSettingsModal.tsx` - Algorithm configuration UI
- `largeDataStorage.ts`: Fixed race condition in `saveAllItems` method
- `ankiImporter.ts`: Added list count validation for free users
- `studyListManager.ts`: Added filters to exclude Anki content from Firebase sync
- `FlashcardDisplay.tsx`: Shows next review times, sanitizes HTML

## SRS Algorithm Configuration

### Default Settings (Matching Anki Desktop)
- **New Cards**: 
  - Learning steps: 1 minute, 10 minutes
  - Graduating interval: 1 day
  - Easy interval: 4 days
  - Max new per day: 20

- **Reviews**:
  - Easy bonus: 1.3x
  - Interval modifier: 1.0 (100%)
  - Maximum interval: 36,500 days
  - Hard interval: 1.2x
  - Max reviews per day: 200

- **Lapses**:
  - Relearning steps: 10 minutes
  - New interval: 0% (full reset)
  - Minimum interval: 1 day
  - Leech threshold: 8 lapses

### Customization
Users can customize all parameters through the SRS Settings modal, accessible from the flashcard review page. Settings persist across sessions and sync for premium users.

## Three-Pillar Architecture Integration

The flashcard system fully integrates with Doshi Sensei's three-pillar architecture:

1. **Entitlements**: Controls who can import Anki decks (premium only)
2. **Features**: Flashcard review tracked as `flashcard_review` feature
3. **Access Control**: Automatic modal prompts for non-premium users

Daily limits:
- Guest/Free users: 3 flashcard sessions per day (shared with drills)
- Premium users: Unlimited sessions

## Conclusion

The Anki integration brings the power of the world's most popular spaced repetition system to Doshi Sensei with enhanced accuracy and modern features. The improved algorithm ensures optimal spacing while the cross-device sync (premium) provides seamless learning across all devices. With configurable parameters and robust security, users get the full Anki experience within our clean, mobile-first interface.

For implementation details, see:
- [ANKI_IMPORT_PLAN.md](./ANKI_IMPORT_PLAN.md) - Original design document
- [FLASHCARD_INTEGRATION.md](./FLASHCARD_INTEGRATION.md) - Integration details
- [ADVANCED_FEATURES_ROADMAP.md](./ADVANCED_FEATURES_ROADMAP.md) - Future enhancements

Last updated: January 2025