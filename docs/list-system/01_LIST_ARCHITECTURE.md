# Doshi Sensei List System Architecture

## Overview

The Doshi Sensei application features a sophisticated list management system that allows users to organize and study Japanese vocabulary words and kanji characters. The system has evolved from separate word/kanji list managers to a unified study list architecture.

## Table of Contents

1. [Architecture Evolution](#architecture-evolution)
2. [Current Unified System](#current-unified-system)
3. [Legacy Systems](#legacy-systems)
4. [Data Models](#data-models)
5. [Storage Architecture](#storage-architecture)
6. [Cloud Sync Integration](#cloud-sync-integration)
7. [List Types and Validation](#list-types-and-validation)
8. [API Reference](#api-reference)
9. [Migration Strategy](#migration-strategy)
10. [Best Practices](#best-practices)

## Architecture Evolution

### Phase 1: Separate Systems (Legacy)
Initially, the application used separate management systems:
- **WordListManager**: Managed vocabulary word lists
- **KanjiListManager**: Managed kanji character lists
- Each system had its own storage, sync, and validation logic

### Phase 2: Unified System (Current)
The new architecture introduces:
- **StudyListManager**: Unified manager for all study content
- **StudyList**: Single list type that can contain words, kanji, or mixed content
- **SavedStudyItem**: Unified storage for all saved items
- Type-based validation and list specialization

## Current Unified System

### Core Components

#### StudyListManager
**Location**: `src/utils/studyListManager.ts`

The central orchestrator for all list operations:

```typescript
class StudyListManager {
  // Core CRUD operations
  static async createStudyList(name: string, type: StudyListType, description?: string): Promise<StudyList>
  static async getAllStudyLists(): Promise<StudyList[]>
  static async deleteStudyList(listId: string): Promise<void>

  // Item management
  static async addItemToLists(item: JapaneseWord | Kanji, itemType: StudyItemType, listIds: string[]): Promise<{success: boolean; errors: string[]}>
  static async removeItemFromList(itemId: string, listId: string): Promise<void>
  static async getItemsInList(listId: string): Promise<{words: JapaneseWord[]; kanji: Kanji[]}>

  // Validation
  static canAddToList(itemType: StudyItemType, item: JapaneseWord | Kanji, listType: StudyListType): boolean

  // Cloud sync
  static async autoSyncLists(user: User | null, subscriptionStatus?: string): Promise<void>
  static async autoSyncItems(user: User | null, subscriptionStatus?: string): Promise<void>
}
```

#### Key Features

1. **Legacy System Cleanup**: Automatically clears old data structures
2. **Smart Validation**: Prevents incompatible items from being added to specialized lists
3. **Unified Storage**: Single storage model for all list types
4. **Cloud Integration**: Automatic sync for premium users
5. **Type Safety**: Full TypeScript support with comprehensive type definitions

### Study List Types

#### DrillableList (`type: 'drillable'`)
**Purpose**: Conjugation practice and grammar drills
**Content**: Only accepts conjugable content (verbs and adjectives)
**Validation Logic**:
```typescript
// Explicit conjugable types
const conjugableTypes: WordType[] = ['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];

// Enhanced detection for misclassified words
- Checks detailed part-of-speech information
- Pattern matching for verb endings (る, す, く, ぐ, む, ぬ, ぶ, つ, う)
- Excludes kanji (cannot be conjugated)
```

#### FlashcardList (`type: 'flashcard'`)
**Purpose**: General review and memorization
**Content**: Accepts any content (words, kanji, mixed)
**Use Cases**:
- Vocabulary memorization
- Kanji recognition
- Mixed content review
- Spaced repetition systems

## Legacy Systems

### WordListManager
**Location**: `src/utils/wordLists.ts`
**Status**: Maintained for backward compatibility

#### Key Features
- Word-specific list management
- Conjugability detection
- Export/import functionality
- Cloud sync capabilities
- Pastel color theming

#### Data Model
```typescript
interface WordList {
  id: string;
  name: string;
  description?: string;
  wordIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
  isConjugable?: boolean; // Computed property
}

interface SavedWord {
  id: string;
  word: JapaneseWord;
  savedAt: Date;
  listIds: string[];
}
```

### KanjiListManager
**Location**: `src/utils/kanjiListManager.ts`
**Status**: Maintained for backward compatibility

#### Key Features
- Kanji-specific list management
- Character-based storage
- Cloud sync capabilities
- Color-coded lists

#### Data Model
```typescript
interface KanjiList {
  id: string;
  name: string;
  description?: string;
  kanjiIds: string[];
  createdAt: Date;
  updatedAt: Date;
  color: string;
}

interface SavedKanji {
  id: string;
  kanji: Kanji;
  savedAt: Date;
  listIds: string[];
}
```

## Data Models

### Unified System Types

#### StudyList
```typescript
interface StudyList {
  id: string;                    // Unique identifier
  name: string;                  // User-defined name
  description?: string;          // Optional description
  type: StudyListType;          // 'drillable' | 'flashcard'
  itemIds: string[];            // Array of item IDs
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last modification timestamp
  color: string;                // UI color theme
}
```

#### SavedStudyItem
```typescript
interface SavedStudyItem {
  id: string;                    // Unique identifier
  itemType: StudyItemType;      // 'word' | 'kanji'
  word?: JapaneseWord;          // Present if itemType is 'word'
  kanji?: Kanji;                // Present if itemType is 'kanji'
  savedAt: Date;                // Save timestamp
  listIds: string[];            // Associated list IDs
}
```

#### Type Definitions
```typescript
type StudyListType = 'drillable' | 'flashcard';
type StudyItemType = 'word' | 'kanji';
```

### Japanese Content Models

#### JapaneseWord
```typescript
interface JapaneseWord {
  id: string;
  kanji: string;
  kana: string;
  romaji: string;
  meaning: string;
  type: WordType;               // Conjugation type
  jlpt: JLPTLevel;             // JLPT classification
  tags: string[];
  // Enhanced vocabulary fields
  allKanji?: string[];
  allReadings?: string[];
  detailedMeaning?: {
    partOfSpeech: string[];
    glosses: string[];
    examples: string[];
  }[];
  // ... additional fields
}
```

#### Kanji
```typescript
interface Kanji {
  kanji: string;                // The kanji character
  meaning: string;              // English meaning
  onyomi: string[];            // On-yomi readings
  kunyomi: string[];           // Kun-yomi readings
  jlpt: JLPTLevel;             // JLPT level
}
```

## Storage Architecture

### Storage Layers

#### 1. LocalStorage (Primary)
- **Purpose**: Fast, synchronous access for UI operations
- **Keys**:
  - `doshi_sensei_study_lists`: Unified study lists
  - `doshi_sensei_saved_study_items`: Unified saved items
  - Legacy keys (cleared on initialization)

#### 2. IndexedDB (Backup)
- **Purpose**: Offline persistence and complex queries
- **Stores**: `studyLists`, `savedStudyItems`
- **Features**: Automatic sync with localStorage

#### 3. Firebase Firestore (Cloud)
- **Purpose**: Cross-device sync for premium users
- **Collections**:
  - `users/{userId}/studyLists`
  - `users/{userId}/savedStudyItems`
- **Conflict Resolution**: Timestamp-based (newest wins)

### Storage Flow
```
User Action → StudyListManager → LocalStorage → IndexedDB → Cloud (Premium)
                                       ↓
                                   UI Update
```

## Cloud Sync Integration

### Premium User Features
- **Automatic Sync**: Changes sync immediately after local operations
- **Conflict Resolution**: Timestamp-based merging
- **Cross-Device**: Lists available on all devices
- **Offline Support**: Full functionality without internet

### Sync Architecture
```typescript
class StudyListManager {
  // Auto-sync after every operation
  static async autoSyncLists(user: User | null, subscriptionStatus?: string): Promise<void>
  static async autoSyncItems(user: User | null, subscriptionStatus?: string): Promise<void>

  // Manual sync operations
  static async syncToCloud(user: User, subscriptionStatus?: string): Promise<SyncResult>
  static async syncFromCloud(user: User, subscriptionStatus?: string): Promise<SyncResult>
}
```

### Sync Triggers
- List creation/deletion
- Item addition/removal
- List metadata updates
- App startup (premium users)

## List Types and Validation

### Drillable List Validation

#### Purpose
Conjugation practice requires words that can be grammatically transformed.

#### Validation Logic
```typescript
static canAddToList(itemType: StudyItemType, item: JapaneseWord | Kanji, listType: StudyListType): boolean {
  if (listType === 'drillable') {
    // Kanji cannot be conjugated
    if (itemType === 'kanji') return false;

    // Check explicit conjugable types
    const conjugableTypes: WordType[] = ['Ichidan', 'Godan', 'Irregular', 'i-adjective', 'na-adjective'];
    if (conjugableTypes.includes(word.type)) return true;

    // Check detailed part-of-speech information
    if (word.detailedMeaning) {
      const hasConjugablePOS = /* complex logic for POS detection */;
      if (hasConjugablePOS) return true;
    }

    // Pattern matching for verb endings
    const verbEndings = ['る', 'す', 'く', 'ぐ', 'む', 'ぬ', 'ぶ', 'つ', 'う'];
    const endsWithVerbPattern = verbEndings.some(ending => word.kana.endsWith(ending));

    return endsWithVerbPattern;
  }

  // Flashcard lists accept everything
  return listType === 'flashcard';
}
```

#### Error Handling
When validation fails, the system provides specific error messages:
- "kanji cannot be conjugated"
- "only verbs and adjectives allowed"
- "invalid item type"

### Flashcard List Benefits
- **Flexibility**: Accepts any content type
- **Mixed Content**: Words and kanji in same list
- **No Restrictions**: Perfect for general study

## API Reference

### StudyListManager Methods

#### List Management
```typescript
// Create a new study list
static async createStudyList(
  name: string,
  type: StudyListType,
  description?: string,
  user?: User | null,
  subscriptionStatus?: string
): Promise<StudyList>

// Get all study lists
static async getAllStudyLists(): Promise<StudyList[]>

// Get drillable lists only
static async getDrillableLists(): Promise<StudyList[]>

// Get flashcard lists only
static async getFlashcardLists(): Promise<StudyList[]>

// Delete a study list
static async deleteStudyList(
  listId: string,
  user?: User | null,
  subscriptionStatus?: string
): Promise<void>
```

#### Item Management
```typescript
// Add item to multiple lists
static async addItemToLists(
  item: JapaneseWord | Kanji,
  itemType: StudyItemType,
  listIds: string[],
  user?: User | null,
  subscriptionStatus?: string
): Promise<{success: boolean; errors: string[]}>

// Remove item from specific list
static async removeItemFromList(
  itemId: string,
  listId: string,
  user?: User | null,
  subscriptionStatus?: string
): Promise<void>

// Get all items in a list
static async getItemsInList(listId: string): Promise<{words: JapaneseWord[]; kanji: Kanji[]}>

// Get lists containing specific item
static async getListsContainingItem(itemId: string): Promise<StudyList[]>
```

#### Validation
```typescript
// Check if item can be added to list type
static canAddToList(
  itemType: StudyItemType,
  item: JapaneseWord | Kanji,
  listType: StudyListType
): boolean

// Check if item exists in list
static async isItemInList(itemId: string, listId: string): Promise<boolean>
```

#### Data Access
```typescript
// Get all saved study items
static async getSavedStudyItems(): Promise<SavedStudyItem[]>
```

#### System Management
```typescript
// Initialize system and clear legacy data
static async initializeNewSystem(): Promise<void>

// Clear all study data
static async clearAllStudyLists(): Promise<void>
```

## Migration Strategy

### Legacy to Unified Migration

#### Phase 1: Dual System (Current)
- New features use unified system
- Legacy systems maintained for compatibility
- Gradual migration of existing data

#### Phase 2: Migration Tools
```typescript
// Future migration utilities
class MigrationManager {
  static async migrateLegacyWordLists(): Promise<void>
  static async migrateLegacyKanjiLists(): Promise<void>
  static async validateMigration(): Promise<boolean>
}
```

#### Phase 3: Legacy Deprecation
- Remove legacy managers
- Update all UI components
- Clean up unused code

### Data Migration Process
1. **Backup**: Export existing data
2. **Transform**: Convert legacy formats to unified model
3. **Validate**: Ensure data integrity
4. **Import**: Load into unified system
5. **Verify**: Test all functionality
6. **Cleanup**: Remove legacy data

## Best Practices

### For Developers

#### 1. Always Use Unified System for New Features
```typescript
// ✅ Good
import StudyListManager from '@/utils/studyListManager';

// ❌ Avoid for new features
import WordListManager from '@/utils/wordLists';
```

#### 2. Handle Validation Errors Gracefully
```typescript
const result = await StudyListManager.addItemToLists(word, 'word', listIds);
if (!result.success) {
  // Display specific error messages to user
  result.errors.forEach(error => console.error(error));
}
```

#### 3. Use Type Guards
```typescript
function isJapaneseWord(item: JapaneseWord | Kanji): item is JapaneseWord {
  return 'kana' in item;
}
```

#### 4. Leverage Cloud Sync
```typescript
// Auto-sync happens automatically, but you can trigger manual sync
await StudyListManager.autoSyncLists(user, subscriptionStatus);
```

### For UI Components

#### 1. List Type Awareness
```typescript
// Show appropriate UI based on list type
if (list.type === 'drillable') {
  return <ConjugationDrillButton />;
} else {
  return <FlashcardReviewButton />;
}
```

#### 2. Error Display
```tsx
{errors.map((error, index) => (
  <div key={index} className="error-message">
    {error}
  </div>
))}
```

#### 3. Loading States
```tsx
{isLoading ? (
  <LoadingSpinner />
) : (
  <StudyListContent />
)}
```

#### 4. List Creation Modal
**Component**: `ListSelectionModal` (`src/components/ListSelectionModal.tsx`)

Unified modal component for creating study lists across all contexts:

```tsx
import ListSelectionModal from '@/components/ListSelectionModal';

// Usage in any component
<ListSelectionModal
  isOpen={showCreateModal}
  onClose={() => setShowCreateModal(false)}
  onCreateList={handleCreateList}
  title="Create New Study List"
  allowedTypes={['flashcard', 'drillable', 'sentence']}
  showOnlyTypes={['flashcard', 'drillable']} // Optional filter
/>
```

**Key Features**:
- **Type Selection**: Visual radio buttons for list type selection
- **Validation**: Duplicate name checking and error display
- **Flexibility**: Configurable allowed types and filters
- **Consistency**: Same modal experience across all list creation contexts

**Integration with StudyListManager**:
```tsx
const handleCreateList = async (name: string, type: StudyListType, description?: string) => {
  try {
    await StudyListManager.createStudyList(name, type, description, user, subscription?.status);
    // Reload lists or update UI
    await loadStudyLists();
  } catch (error) {
    console.error('List creation failed:', error);
    throw error; // Modal handles error display
  }
};
```

### Performance Considerations

#### 1. Batch Operations
```typescript
// Process multiple items at once
const results = await Promise.all(
  items.map(item => StudyListManager.addItemToLists(item, 'word', listIds))
);
```

#### 2. Cache List Data
```typescript
// Cache frequently accessed lists
const [lists, setLists] = useState<StudyList[]>([]);
useEffect(() => {
  StudyListManager.getAllStudyLists().then(setLists);
}, []);
```

#### 3. Debounce Auto-Sync
```typescript
// Avoid excessive sync calls
const debouncedSync = debounce(StudyListManager.autoSyncLists, 1000);
```

## Troubleshooting

### Common Issues

#### 1. Items Not Appearing in Drillable Lists
**Cause**: Item type not compatible with conjugation
**Solution**: Check `canAddToList` validation result

#### 2. Cloud Sync Not Working
**Cause**: User not premium or network issues
**Solution**: Verify subscription status and network connectivity

#### 3. Legacy Data Conflicts
**Cause**: Old data structure incompatibility
**Solution**: Run `initializeNewSystem()` to clear legacy data

#### 4. Performance Issues
**Cause**: Large lists or frequent operations
**Solution**: Implement pagination and batch operations

### Debug Tools

#### 1. Enable Detailed Logging
```typescript
console.log('🔍 canAddToList called:', { itemType, listType, word: word.kanji });
```

#### 2. Inspect Storage
```javascript
// Check localStorage
console.log(localStorage.getItem('doshi_sensei_study_lists'));

// Check IndexedDB
// Use browser dev tools → Application → IndexedDB
```

#### 3. Monitor Cloud Sync
```typescript
// Check sync status
CloudSync.getLastSyncTime(user);
```

## Future Enhancements

### Planned Features

#### 1. Advanced List Operations
- List merging and splitting
- Bulk item operations
- List templates

#### 2. Enhanced Validation
- Custom validation rules
- Content quality scoring
- Duplicate detection

#### 3. Analytics Integration
- Study pattern analysis
- Performance metrics
- Usage statistics

#### 4. Collaboration Features
- Shared lists
- Community content
- Social features

### Architecture Improvements

#### 1. Event-Driven Architecture
```typescript
// Future event system
ListEventBus.emit('list:created', { listId, type });
ListEventBus.on('item:added', handleItemAdded);
```

#### 2. Plugin System
```typescript
// Extensible validation
interface ValidationPlugin {
  canAddToList(item: any, list: StudyList): boolean;
}
```

#### 3. Advanced Caching
- Redis for server-side caching
- Service worker for offline caching
- Smart cache invalidation

## Conclusion

The Doshi Sensei list system provides a robust, scalable foundation for organizing Japanese study content. The unified architecture simplifies development while maintaining backward compatibility, and the type-based validation ensures content appropriateness for different study modes.

The system's key strengths include:
- **Flexibility**: Supports multiple content types and study modes
- **Validation**: Ensures content appropriateness
- **Scalability**: Handles large datasets efficiently
- **Sync**: Seamless cross-device experience for premium users
- **Type Safety**: Full TypeScript support prevents runtime errors

This architecture will continue to evolve to meet the growing needs of Japanese language learners while maintaining simplicity and performance.
