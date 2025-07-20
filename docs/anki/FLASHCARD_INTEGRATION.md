# Flashcard System Integration for Anki Cards

## Current Status ✅ COMPLETED

The Anki import feature is fully integrated with:
- ✅ AnkiImporter utility that parses .apkg files
- ✅ UI for importing decks (AnkiImportModal) with drag-and-drop
- ✅ Integration with StudyListManager (saveItem, updateListMetadata)
- ✅ Premium-only access control via feature registry
- ✅ Media file upload to Firebase Storage with URL conversion
- ✅ Preservation of Anki's exact SRS data
- ✅ Flashcard system updated to display Anki cards
- ✅ Unified Anki SRS algorithm for ALL cards

## Completed Integrations

### 1. Flashcard Review Page Updates ✅

The flashcard review page now handles `anki_card` items:

```typescript
// Loading items from lists includes ankiCards
const { words, ankiCards } = await StudyListManager.getItemsInList(listId);

// Anki cards are converted to a compatible format
const ankiFlashcards = ankiCards.map(card => ({
  id: card.id,
  itemType: 'anki_card',
  ankiData: card.ankiData,
  kanji: card.ankiData?.front || '',
  meaning: card.ankiData?.back || '',
  type: 'anki'
}));
```

### 2. FlashcardCard Component Updates ✅

The FlashcardCard component now renders Anki cards with HTML/media support:

```typescript
// Helper to render HTML content (for Anki cards)
const renderContent = (content: string) => {
  if (content.includes('<') && content.includes('>')) {
    return (
      <div 
        className="anki-content"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return content;
};

// CSS added for media support
.anki-content img { max-width: 100%; }
.anki-content audio { display: block; }
```

### 3. SRS Integration ✅

We've completely replaced the old FSRS with Anki's algorithm:
- ✅ Created `AnkiSRS` class implementing SM-2 algorithm
- ✅ Supports new/learning/review/relearning states
- ✅ Preserves exact intervals, ease factors, and due dates
- ✅ All cards now use Anki's proven algorithm

### 4. Media Rendering ✅

Media files are handled automatically:
- ✅ `[sound:file.mp3]` → `<audio src="firebase-url" />` 
- ✅ `<img src="file.jpg">` → `<img src="firebase-url" />`
- ✅ URLs converted during import by AnkiImporter

## Implementation Details

### StudyListManager.getItemsInList Update ✅

Now returns ankiCards along with other items:

```typescript
static async getItemsInList(listId: string): Promise<{ 
  words: JapaneseWord[]; 
  kanji: Kanji[]; 
  sentences: Sentence[];
  ankiCards: SavedStudyItem[];
  allItems: SavedStudyItem[];
}> {
  // ... filters and returns ankiCards separately
}
```

### Key Files Modified

1. **`/src/utils/ankiImporter.ts`** - Core import logic
2. **`/src/utils/ankiSRS.ts`** - Anki's SM-2 algorithm
3. **`/src/utils/studyListManager.ts`** - Added saveItem() and ankiCards support
4. **`/src/app/drill/flashcards/page.tsx`** - Display Anki cards
5. **`/src/components/flashcards/FlashcardCard.tsx`** - HTML/media rendering
6. **`/src/types/index.ts`** - Added anki_card type and ankiData interface

## Testing Checklist

- ✅ Import an Anki deck successfully
- ✅ View imported cards in the list  
- ✅ Start a flashcard review session
- ✅ Review Anki cards with proper front/back display
- ✅ Media files (audio/images) render correctly
- ⏳ SRS data updates after review (TODO: persistent storage)
- ✅ Due dates are preserved from Anki
- ✅ Review history is maintained

## Future Enhancements

1. **Cloze Deletion Support**: Parse and render cloze deletions
2. **Reverse Cards**: Handle Anki's reverse card types
3. **Custom Fields**: Support decks with custom fields
4. **Sync Back**: Export reviewed cards back to Anki format
5. **Statistics**: Show Anki-specific stats (retention rate, etc.)