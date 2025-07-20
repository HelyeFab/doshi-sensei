# Anki Import Integration Plan

## Overview

This document outlines the plan to integrate Anki deck importing into Doshi Sensei's flashcard system. The core principle is to treat Anki decks as data sources that flow seamlessly into our existing study list infrastructure, preserving Anki's powerful SRS features while leveraging our three-pillar architecture.

## Core Design Philosophy

**Anki decks → Study Lists → Flashcard Review**

Instead of creating a separate Anki system, we'll:
1. Import Anki decks as special flashcard lists
2. Preserve Anki's SRS data (intervals, ease, review history)
3. Use our existing flashcard review system with enhanced SRS
4. Maintain compatibility with our access control system

## Architecture Integration

### 1. Data Flow

```
Anki .apkg file
    ↓
AnkiImporter (parses deck)
    ↓
Creates Study List (type: 'flashcard')
    ↓
Maps Anki cards → SavedStudyItems
    ↓
Preserves SRS metadata
    ↓
Regular Flashcard Review Flow
```

### 2. Three-Pillar Integration

#### Features Registry
```typescript
'anki_import': {
  id: 'anki_import',
  name: 'Import Anki Decks',
  description: 'Import your Anki decks into study lists (Premium)',
  category: 'storage',
  icon: '📥',
  limitType: 'none', // No limits, but premium only
  requiresAuth: true,
  requiresSubscription: true, // Premium feature only
  status: 'active',
  metadata: {
    maxFileSize: 200 * 1024 * 1024, // 200MB
    allowedFormats: ['.apkg', '.anki2']
  }
}
```

#### Access Control
- Use `checkAndTrack('anki_import')` before allowing import
- Premium users get unlimited imports
- Free users get limited imports per month

#### Storage
- Anki cards stored as `SavedStudyItem` with enhanced metadata
- Media files uploaded to Firebase Storage
- SRS data preserved in item metadata

## Data Mapping Strategy

### Anki Card Structure → Our Structure

```typescript
interface AnkiCard {
  // Anki fields
  id: string;
  deckId: string;
  front: string;
  back: string;
  tags: string[];
  type: number; // 0: new, 1: learning, 2: review
  due: number; // Unix timestamp
  interval: number; // Days until next review
  ease: number; // Ease factor (default 2.5)
  reviews: number; // Total review count
  lapses: number; // Times forgotten
  
  // Media references
  media: string[];
}

// Maps to our enhanced SavedStudyItem
interface EnhancedSavedStudyItem extends SavedStudyItem {
  // Existing fields
  id: string;
  itemType: 'anki_card';
  savedAt: Date;
  listIds: string[];
  
  // Anki-specific data
  ankiData?: {
    originalId: string;
    deckName: string;
    cardType: 'basic' | 'cloze' | 'reverse';
    front: string;
    back: string;
    tags: string[];
    media: string[]; // Firebase Storage URLs
    
    // SRS data (preserved from Anki)
    srsData: {
      due: Date;
      interval: number;
      ease: number;
      reviews: number;
      lapses: number;
      lastReview?: Date;
    };
  };
}
```

### List Creation

Each Anki deck becomes a study list:
```typescript
{
  name: `${deckName} (Anki Import)`,
  description: `Imported from Anki on ${date}`,
  type: 'flashcard',
  metadata: {
    source: 'anki',
    originalDeckId: deckId,
    cardCount: cards.length,
    importDate: new Date(),
    ankiVersion: version
  }
}
```

## Implementation Status ✅

### Phase 1: Core Import Functionality ✅ COMPLETED
- ✅ Installed and configured `anki-reader` with sql.js
- ✅ Created `AnkiImporter` utility class
- ✅ Added `anki_import` feature to registry (premium-only)
- ✅ Built drag-and-drop file upload UI
- ✅ Parse and display import progress

### Phase 2: Data Integration ✅ COMPLETED
- ✅ Map Anki cards to `SavedStudyItem` with `anki_card` type
- ✅ Create study lists from decks with metadata
- ✅ Handle media file uploads to Firebase Storage
- ✅ Preserve SRS scheduling data exactly
- ✅ Import progress tracking with percentage updates

### Phase 3: Flashcard Integration ✅ COMPLETED
- ✅ Updated `getItemsInList` to return Anki cards
- ✅ Modified flashcard page to display Anki cards
- ✅ Enhanced `FlashcardCard` component for HTML/media rendering
- ✅ Support for all review modes (SRS, Lists, Random)

### Phase 4: SRS Enhancement ✅ COMPLETED
- ✅ Created `AnkiSRS` class implementing Anki's SM-2 algorithm
- ✅ Replaced FSRS with Anki's algorithm for ALL cards
- ✅ Honor existing review schedules from imported cards
- ✅ Support new/learning/review/relearning states

## Technical Components

### 1. AnkiImporter Utility (`/src/utils/ankiImporter.ts`)
```typescript
class AnkiImporter {
  // Parse .apkg file
  async parsePackage(file: File): Promise<AnkiDeck[]>
  
  // Convert to our format
  async convertToStudyList(deck: AnkiDeck): Promise<StudyList>
  
  // Handle media uploads
  async uploadMedia(media: Media[]): Promise<string[]>
  
  // Create study items
  async createStudyItems(cards: AnkiCard[]): Promise<SavedStudyItem[]>
  
  // Import with progress tracking
  async importDeck(file: File, options: ImportOptions): Promise<ImportResult>
}
```

### 2. Import UI Component (`/src/components/anki/AnkiImportModal.tsx`)
- Reuse existing modal patterns
- File upload with drag & drop
- Deck preview before import
- Progress bar during import
- Success/error states

### 3. Browser Configuration (`/src/lib/anki/config.ts`)
```typescript
// Configure sql.js for browser
export const initAnkiReader = async () => {
  // Load WASM files
  // Configure sql.js
  // Return configured reader
}
```

## UI/UX Flow

### Import Flow
1. User clicks "Import Anki Deck" button
2. Modal opens with file upload area
3. User selects .apkg file
4. System shows deck preview:
   - Deck name
   - Number of cards
   - Tags found
   - Media files count
5. User confirms import settings:
   - Target list name (editable)
   - Tag handling options
   - Duplicate handling
6. Import progress bar
7. Success screen with link to new list

### List Management
- Imported lists appear in regular study lists
- Special "Anki" badge/icon
- All normal list operations available
- Can add/remove cards like any list

### Review Experience
- Uses existing flashcard review UI
- SRS data seamlessly integrated
- No difference in user experience
- Stats track both native and imported cards

## Design Decisions

1. **SRS Data Handling**: 
   - ✅ **Preserve Anki's exact review schedule** - We'll maintain due dates, intervals, ease factors, and review history exactly as they are in Anki

2. **Media Files**: 
   - ✅ **Upload to Firebase Storage** - Premium feature, so cost is acceptable
   - ✅ **Premium users only** - This feature is exclusively for premium subscribers

3. **Deck Organization**: 
   - ✅ **One list per deck** - Each Anki deck becomes one flashcard list
   - ✅ **Maintain deck hierarchy** if present in the .apkg file

4. **Field Mapping**: 
   - ✅ **Smart auto-detection** for Japanese content
   - ✅ **Support all Anki card types** including cloze deletions
   - ✅ **Preserve the exact Anki experience** as much as possible

5. **Limits**: 
   - ✅ **File size limit: 200MB maximum**
   - ✅ **Premium users only** - No free tier access

## Success Metrics

- Seamless import process (<30 seconds for 1000 cards)
- No loss of SRS effectiveness
- Users can't tell difference between imported/native cards
- Zero data loss from Anki
- Maintains app performance

## Future Enhancements

1. **Export to Anki**: Round-trip support
2. **AnkiConnect**: Direct sync with desktop Anki
3. **Shared Decks**: Browse AnkiWeb shared decks
4. **Smart Merge**: AI-powered duplicate detection
5. **Bulk Operations**: Import multiple decks at once

## Technical Considerations

### Performance
- Use Web Workers for large deck processing
- Chunked imports for huge decks
- Progress indication every 100 cards

### Storage
- IndexedDB for temporary processing
- Firebase for permanent storage
- Efficient media compression

### Error Handling
- Corrupted file detection
- Partial import recovery
- Clear error messages
- Rollback on failure

## Conclusion

By treating Anki decks as specialized study lists, we can:
- Maintain our clean architecture
- Leverage existing infrastructure
- Provide familiar UX
- Preserve Anki's strengths
- Stay within our three-pillar system

The key is to view Anki not as a separate system, but as a rich data source that enhances our existing flashcard capabilities.