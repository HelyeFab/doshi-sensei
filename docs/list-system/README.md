# List System Documentation

This folder contains comprehensive documentation for the Doshi Sensei list management system - a sophisticated unified architecture for organizing and studying Japanese vocabulary words and kanji characters.

## 🏗️ Architecture Overview

The list system has evolved from separate word/kanji managers to a unified study list architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Legacy        │    │   Unified       │    │   Cloud Sync    │
│   Systems       │    │   System        │    │   (Premium)     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • WordListMgr   │    │ • StudyListMgr  │    │ • Firebase      │
│ • KanjiListMgr  │    │ • StudyList     │    │ • Real-time     │
│ • Separate      │    │ • SavedItem     │    │ • Cross-device  │
│ • Inconsistent  │    │ • Type-based    │    │ • Offline       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ↓                       ↓                       ↓
         └───────────────────────┴───────────────────────┘
                                    ↓
                    ┌────────────────────────────┐
                    │   UNIFIED LIST SYSTEM      │
                    │   /src/utils/studyListMgr  │
                    ├────────────────────────────┤
                    │ • Single API              │
                    │ • Type Safety             │
                    │ • Smart Validation        │
                    │ • Cloud Integration       │
                    └────────────────────────────┘
```

## 📚 Documentation Index

### Core Architecture
- **[01_LIST_ARCHITECTURE.md](./01_LIST_ARCHITECTURE.md)** - Complete list system architecture and implementation
- **[04_SENTENCE_BOOKMARKS.md](./04_SENTENCE_BOOKMARKS.md)** - Sentence bookmarking feature implementation

## 🎯 Key Features

### 1. **Unified System Architecture**
- **Single Manager**: `StudyListManager` handles all list types
- **Type Safety**: Full TypeScript support with comprehensive types
- **Smart Validation**: Prevents incompatible items in specialized lists
- **Legacy Compatibility**: Maintains backward compatibility

### 2. **Advanced List Types**
- **Drillable Lists**: For conjugation practice (verbs/adjectives only)
- **Flashcard Lists**: For general review (any content type)
- **Sentence Lists**: For shadowing practice (sentences only)
- **Mixed Content**: Support for words and kanji in same list
- **Type Validation**: Ensures content appropriateness

### 3. **Storage & Sync**
- **Multi-Layer Storage**: LocalStorage → IndexedDB → Firebase
- **Cloud Sync**: Premium users get cross-device synchronization
- **Offline Support**: Full functionality without internet
- **Conflict Resolution**: Timestamp-based merging

### 4. **Developer Experience**
- **Unified API**: Single interface for all list operations
- **Type Safety**: Comprehensive TypeScript definitions
- **Error Handling**: Graceful error management
- **Performance**: Optimized for large datasets

### 5. **User Interface Components**
- **ListSelectionModal**: Unified modal for creating lists across all contexts
- **Type-Aware UI**: Visual indicators for different list types
- **Consistent Experience**: Same modal interface for favorites, word saving, etc.
- **Smart Validation**: Real-time duplicate name checking and error display

## 🚀 Quick Start

### Basic List Operations
```typescript
import StudyListManager from '@/utils/studyListManager';

// Create a new list
const list = await StudyListManager.createStudyList(
  'My Vocabulary',
  'flashcard',
  'Personal study list'
);

// Add items to list
const result = await StudyListManager.addItemToLists(
  word,
  'word',
  [list.id]
);

// Get items in list (returns separated by type)
const { words, kanji, sentences } = await StudyListManager.getItemsInList(list.id);
```

### List Type Validation
```typescript
// Check if item can be added to list type
const canAdd = StudyListManager.canAddToList(
  'word',
  word,
  'drillable'
);

// Sentence lists only accept sentences
const canAddSentence = StudyListManager.canAddToList(
  'sentence',
  sentence,
  'sentence'
);

// Drillable lists only accept conjugable content
const conjugableTypes = ['Ichidan', 'Godan', 'i-adjective', 'na-adjective'];
```

### Sentence Lists Operations
```typescript
// Get sentence lists only
const sentenceLists = await StudyListManager.getSentenceLists();

// Create a sentence list
const sentenceList = await StudyListManager.createStudyList(
  'Shadowing Practice',
  'sentence',
  'Sentences from articles'
);

// Add sentence to list
const sentence: Sentence = {
  id: 'sentence-123',
  text: '今日は良い天気ですね。',
  source: {
    type: 'article',
    id: 'article-456',
    title: 'Weather News',
    url: 'https://example.com/weather'
  }
};

await StudyListManager.addItemToLists(
  sentence,
  'sentence',
  [sentenceList.id]
);
```

### Cloud Sync (Premium)
```typescript
// Auto-sync happens automatically
await StudyListManager.autoSyncLists(user, subscriptionStatus);

// Manual sync operations
await StudyListManager.syncToCloud(user, subscriptionStatus);
```

### List Creation Modal
```tsx
import ListSelectionModal from '@/components/ListSelectionModal';

// Component usage for list creation
const [showCreateModal, setShowCreateModal] = useState(false);

const handleCreateList = async (name: string, type: StudyListType, description?: string) => {
  await StudyListManager.createStudyList(name, type, description, user, subscription?.status);
  await loadStudyLists(); // Refresh list display
};

return (
  <>
    <button onClick={() => setShowCreateModal(true)}>
      Create New List
    </button>
    
    <ListSelectionModal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      onCreateList={handleCreateList}
      title="Create New Study List"
      allowedTypes={['flashcard', 'drillable', 'sentence']}
    />
  </>
);
```

## 📁 Key Files in Codebase

### Core System
- `/src/utils/studyListManager.ts` - Main list manager
- `/src/utils/wordLists.ts` - Legacy word list manager (maintained)
- `/src/utils/kanjiListManager.ts` - Legacy kanji list manager (maintained)

### Type Definitions
- `/src/types/index.ts` - StudyList, SavedStudyItem, Sentence types
- `/src/types/japanese.ts` - JapaneseWord, Kanji types

### UI Components
- `/src/components/ListSelectionModal.tsx` - Unified list creation modal
- `/src/app/favourites/page.tsx` - List display and management UI

### Storage Integration
- `/src/utils/storage.ts` - Storage system integration
- `/src/lib/firebase.ts` - Cloud sync functionality

## 🔄 Migration Strategy

### Phase 1: Dual System (Current)
- **New Features**: Use unified system
- **Legacy Support**: Maintain backward compatibility
- **Gradual Migration**: Existing data preserved

### Phase 2: Migration Tools
```typescript
// Future migration utilities
class MigrationManager {
  static async migrateLegacyWordLists(): Promise<void>
  static async migrateLegacyKanjiLists(): Promise<void>
  static async validateMigration(): Promise<boolean>
}
```

### Phase 3: Legacy Deprecation
- **Remove Legacy**: Old managers deprecated
- **Update UI**: All components use unified system
- **Cleanup**: Remove unused code

## 📊 Data Models

### Unified System Types

#### Sentence
```typescript
interface Sentence {
  id: string;                   // Unique identifier
  text: string;                 // Japanese sentence text
  furigana?: string;           // Optional furigana reading
  translation?: string;        // Optional English translation
  source: {                    // Source attribution
    type: 'article' | 'story';
    id: string;
    title: string;
    url?: string;
  };
  metadata?: {                 // Optional metadata
    difficulty?: string;
    grammar?: string[];
    vocabulary?: string[];
  };
}
```

#### StudyList
```typescript
interface StudyList {
  id: string;                    // Unique identifier
  name: string;                  // User-defined name
  description?: string;          // Optional description
  type: StudyListType;          // 'drillable' | 'flashcard' | 'sentence'
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
  itemType: StudyItemType;      // 'word' | 'kanji' | 'sentence'
  word?: JapaneseWord;          // Present if itemType is 'word'
  kanji?: Kanji;                // Present if itemType is 'kanji'
  sentence?: Sentence;          // Present if itemType is 'sentence'
  savedAt: Date;                // Save timestamp
  listIds: string[];            // Associated list IDs
}
```

## 🎯 List Types & Validation

### Drillable Lists (`type: 'drillable'`)
**Purpose**: Conjugation practice and grammar drills
**Content**: Only accepts conjugable content (verbs and adjectives)
**Validation Logic**:
```typescript
const conjugableTypes: WordType[] = [
  'Ichidan', 'Godan', 'Irregular',
  'i-adjective', 'na-adjective'
];
```

### Flashcard Lists (`type: 'flashcard'`)
**Purpose**: General review and memorization
**Content**: Accepts any content (words, kanji, mixed)
**Use Cases**:
- Vocabulary memorization
- Kanji recognition
- Mixed content review
- Spaced repetition systems

### Sentence Lists (`type: 'sentence'`)
**Purpose**: Shadowing practice and sentence collection
**Content**: Only accepts sentences
**Use Cases**:
- Saving sentences from articles and stories
- Building custom shadowing practice sets
- Grammar pattern recognition
- Listening comprehension practice

## 🔍 Storage Architecture

### Storage Layers

#### 1. LocalStorage (Primary)
- **Purpose**: Fast, synchronous access for UI operations
- **Keys**:
  - `doshi_sensei_study_lists`: Unified study lists
  - `doshi_sensei_saved_study_items`: Unified saved items

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

## 🛠️ Best Practices

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
  result.errors.forEach(error => console.error(error));
}
```

#### 3. Use Type Guards
```typescript
function isJapaneseWord(item: JapaneseWord | Kanji): item is JapaneseWord {
  return 'kana' in item;
}
```

### For UI Components

#### 1. List Type Awareness
```typescript
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

## 🐛 Troubleshooting

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

## 🔮 Future Enhancements

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

---

**Last Updated**: January 2025
**Status**: ✅ Fully Implemented and Production Ready
**Architecture**: Unified system with legacy compatibility
**Performance**: Optimized for large datasets and complex queries
