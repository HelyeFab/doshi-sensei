# Anki Integration Documentation

## Overview

Doshi Sensei now supports importing Anki decks (.apkg files) and uses Anki's proven spaced repetition algorithm for ALL flashcards in the app. This is a premium-only feature that preserves the exact learning experience from Anki while integrating seamlessly with our study list system.

## Key Features

### 🎯 Anki Import
- Import .apkg files up to 200MB
- Drag-and-drop UI in the Favourites page
- Progress tracking during import
- Media files (images/audio) uploaded to Firebase Storage
- Each deck becomes a study list of type 'flashcard'

### 🧠 Unified SRS Algorithm
- **ALL flashcards now use Anki's SM-2 algorithm**
- Replaces our previous FSRS implementation
- Preserves exact intervals, ease factors, and due dates
- Supports new/learning/review/relearning states
- Proven effectiveness from millions of Anki users

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
   - Uploads media to Firebase Storage
   - Creates study lists with imported cards

2. **AnkiSRS** (`/src/utils/ankiSRS.ts`)
   - Implements Anki's SM-2 algorithm
   - Handles all card states and transitions
   - Calculates next review dates
   - Manages ease factors and intervals

3. **Enhanced Types**
   - Added `anki_card` to `StudyItemType`
   - Extended `SavedStudyItem` with `ankiData` field
   - Updated `StudyList` to support metadata

4. **UI Components**
   - `AnkiImportModal` - Drag-and-drop import interface
   - Enhanced `FlashcardCard` - Renders HTML/media content
   - Updated flashcard page - Displays Anki cards

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
    media: string[], // Firebase URLs
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
- Premium-only access control
- File size validation (200MB max)
- Firebase Storage for media (secure URLs)
- HTML content sanitization considerations

### Performance
- Progress tracking for large imports
- Chunked processing for many cards
- Lazy loading of media files
- Efficient batch operations

## Future Enhancements

1. **Persistent SRS Storage**
   - Store SRS data updates after reviews
   - Track review history per card

2. **Advanced Card Types**
   - Cloze deletion support
   - Reverse card handling
   - Custom field mapping

3. **Export Functionality**
   - Export back to .apkg format
   - Maintain compatibility with Anki desktop

4. **Statistics**
   - Anki-style statistics dashboard
   - Retention rates and review heatmaps
   - Progress tracking per deck

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
2. **Media not showing**: Verify Firebase Storage permissions
3. **Cards not appearing**: Check list type is 'flashcard'
4. **SRS not working**: Ensure ankiData.srsData is preserved

### Debug Tools
- Browser console for import errors
- Network tab for media uploads
- IndexedDB inspector for stored data

## Conclusion

The Anki integration brings the power of the world's most popular spaced repetition system to Doshi Sensei while maintaining our clean architecture and user experience. By using Anki's algorithm for ALL flashcards, we ensure consistent, proven learning outcomes for our users.

For implementation details, see:
- [ANKI_IMPORT_PLAN.md](./ANKI_IMPORT_PLAN.md) - Original design document
- [FLASHCARD_INTEGRATION.md](./FLASHCARD_INTEGRATION.md) - Integration details

Last updated: January 2025