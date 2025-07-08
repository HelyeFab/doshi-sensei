# Sentence Lists Implementation

This document describes the implementation of sentence saving functionality integrated into the unified StudyListManager system, allowing users to save individual sentences from articles and stories to organized lists.

## Overview

The sentence bookmarks feature enables users to:
- Save individual sentences from shadowing practice sessions
- Organize sentences into custom lists
- Create new lists or add to existing ones
- Access saved sentences with proper source attribution
- Sync data to cloud for premium users

## Architecture

### Data Structure

#### Core Types (`/src/types/index.ts`)
```typescript
interface Sentence {
  id: string;
  text: string;
  furigana?: string;
  translation?: string;
  source: {
    type: 'article' | 'story';
    id: string;
    title: string;
    url?: string;
  };
  metadata?: {
    difficulty?: string;
    grammar?: string[];
    vocabulary?: string[];
  };
}

// Sentences are integrated into the unified StudyList system:
// - StudyList with type: 'sentence' for sentence-only lists
// - SavedStudyItem with itemType: 'sentence' for saved sentences
// - Uses same data structures as words and kanji
```

### Data Management

#### StudyListManager (`/src/utils/studyListManager.ts`)
The unified manager handles sentences alongside words and kanji:

**Sentence-Specific Operations:**
- `getSentenceLists()` - Get sentence lists only
- `createStudyList(name, 'sentence', description)` - Create sentence list
- `canAddToList('sentence', sentence, 'sentence')` - Validate sentence content
- `addItemToLists(sentence, 'sentence', listIds)` - Add sentence to lists
- `getItemsInList(listId)` - Returns { words, kanji, sentences }

**Unified Operations (works for all types):**
- `getAllStudyLists()` - Get all lists across types
- `deleteStudyList(listId)` - Remove list and cleanup
- `removeItemFromList(itemId, listId)` - Remove from specific list
- `getListsContainingItem(itemId)` - Find lists containing item

**Cloud Sync (Premium Users):**
- `autoSyncLists(user, subscriptionStatus)` - Auto-upload lists
- `autoSyncItems(user, subscriptionStatus)` - Auto-upload items
- Uses CloudSync infrastructure for automatic syncing

### User Interface

#### Bookmark Icon
- Located in top-right corner of main sentence display area
- Appears next to currently playing sentence
- Click triggers bookmark modal

#### Save Modal
Reuses existing modal patterns from vocabulary system:
- **Sentence Preview**: Shows Japanese text and source article
- **Create New List**: Input field with "Create" button
- **Existing Lists**: Checkboxes with color indicators and sentence counts
- **Save/Cancel**: Action buttons with loading states

### Access Control & Entitlements

#### Access Control Integration
Sentence saving uses the existing `word_lists` entitlement rather than a separate feature:

#### Entitlement Logic
```typescript
// In ShadowingAudioPlayer.tsx
const hasAccess = await checkAndTrack('word_lists');
if (!hasAccess) {
  return; // checkAndTrack shows appropriate modal
}
```

#### User Limits
- **Guests**: Cannot save sentences (login required)
- **Free Users**: 3 lists total (words, kanji, sentences combined)
- **Premium Users**: Unlimited lists + cloud sync

**Key Point**: Lists are counted together regardless of type. A free user with 2 word lists can only create 1 more list of any type (word, kanji, or sentence).

### Cloud Persistence

#### Firestore Collections
- `/users/{userId}/studyLists/data` - All user's lists (including sentence lists)
- `/users/{userId}/savedStudyItems/data` - All saved items (including sentences)

#### Security Rules
Already covered by existing wildcard rules:
```javascript
// Allow access to user's subcollections (wordLists, savedWords, etc.)
match /{document=**} {
  allow read, write: if isAdmin() || (request.auth != null && request.auth.uid == userId);
}
```

## Implementation Details

### ShadowingAudioPlayer Integration

#### New Imports
```typescript
import { StudyList, Sentence } from '@/types';
import { StudyListManager } from '@/utils/studyListManager';
import { useAccess } from '@/hooks/useAccess';
```

#### State Management
```typescript
// Sentence saving state
const [showSaveModal, setShowSaveModal] = useState(false);
const [sentenceToSave, setSentenceToSave] = useState<SentenceData | null>(null);
const [sentenceLists, setSentenceLists] = useState<StudyList[]>([]);
const [selectedLists, setSelectedLists] = useState<string[]>([]);
const [showCreateNew, setShowCreateNew] = useState(false);
const [newListName, setNewListName] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [errors, setErrors] = useState<string[]>([]);
```

#### Key Functions

**Load Lists:**
```typescript
const loadSentenceLists = async () => {
  try {
    const lists = await StudyListManager.getSentenceLists();
    setSentenceLists(lists);
  } catch (error) {
    console.error('Failed to load sentence lists:', error);
  }
};
```

**Handle Bookmark Click:**
```typescript
const handleBookmarkSentence = async (sentence: SentenceData) => {
  // Use access control to check if user can create/use lists
  const hasAccess = await checkAndTrack('word_lists');
  if (!hasAccess) {
    return; // checkAndTrack already shows appropriate notification
  }

  setSentenceToSave(sentence);
  setSelectedLists([]);
  setShowCreateNew(false);
  setNewListName('');
  setErrors([]);
  setShowSaveModal(true);
};
```

**Save to Lists:**
```typescript
const handleSaveToLists = async () => {
  if (!sentenceToSave || (selectedLists.length === 0 && !newListName.trim())) return;

  try {
    setIsSaving(true);
    setErrors([]);
    
    // Create a proper sentence object
    const sentence: Sentence = {
      id: `sentence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: sentenceToSave.text,
      source: {
        type: 'article',
        id: article.id || '',
        title: article.title,
        url: article.url
      }
    };

    let listsToSaveTo = [...selectedLists];

    // Create new list if specified
    if (newListName.trim()) {
      const newList = await StudyListManager.createStudyList(
        newListName.trim(),
        'sentence',
        'Created for saving sentences',
        user,
        subscription?.status
      );
      listsToSaveTo.push(newList.id);
    }

    // Save sentence to selected lists using unified system
    const result = await StudyListManager.addItemToLists(
      sentence,
      'sentence',
      listsToSaveTo,
      user,
      subscription?.status
    );

    if (result.success) {
      showNotification({
        title: 'Sentence Saved',
        message: `Sentence saved to ${listsToSaveTo.length} list${listsToSaveTo.length !== 1 ? 's' : ''}`,
        type: 'success'
      });
      
      setShowSaveModal(false);
      setSentenceToSave(null);
      setSelectedLists([]);
      setNewListName('');
      setShowCreateNew(false);
    } else {
      setErrors(result.errors);
    }
  } catch (error) {
    console.error('Error saving sentence:', error);
    setErrors(['Failed to save sentence']);
  } finally {
    setIsSaving(false);
  }
};
```

### UI Components

#### Bookmark Button
```typescript
<button
  onClick={() => handleBookmarkSentence(currentSentence)}
  className="absolute top-4 right-4 p-2 rounded-lg hover:bg-background/80 transition-colors text-muted-foreground hover:text-foreground"
  title="Save sentence to list"
>
  <Bookmark className="w-5 h-5" />
</button>
```

#### Save Modal
- Reuses existing modal patterns from practice page
- Shows sentence preview with Japanese text and source
- List creation and selection interface
- Color-coded lists with sentence counts
- Save/Cancel actions with loading states

## Features

### Current Capabilities
✅ **Unified System Integration**: Sentences fully integrated with StudyListManager  
✅ **Sentence Bookmarking**: Save any sentence from shadowing practice  
✅ **List Management**: Create, delete, and organize sentence lists  
✅ **Source Attribution**: Track which article/story sentence came from  
✅ **Local Storage**: Immediate saving to browser storage  
✅ **Cloud Sync**: Premium users get automatic cloud backup  
✅ **Access Control**: Uses existing `word_lists` entitlement system  
✅ **Visual Design**: Consistent with existing UI patterns  
✅ **Type Safety**: Full TypeScript support with validation  
✅ **Error Handling**: Comprehensive error messages and feedback  

### Future Enhancements
🔮 **Translation Support**: Add translation field to sentences  
🔮 **Furigana Support**: Include furigana for difficult readings  
🔮 **Difficulty Tagging**: Tag sentences by difficulty level  
🔮 **Grammar Analysis**: Extract grammar patterns from sentences  
🔮 **Game Integration**: Use saved sentences in future games  
🔮 **Export/Import**: Share sentence lists between users  

## File Structure

```
src/
├── types/
│   └── index.ts                    # Sentence, StudyList, SavedStudyItem types
├── utils/
│   └── studyListManager.ts        # Unified data management logic
├── lib/
│   └── features/
│       └── registry.ts             # 'word_lists' feature covers sentences
├── hooks/
│   └── useAccess.ts               # Access control integration
├── components/
│   ├── ListSelectionModal.tsx     # Unified list creation modal (future enhancement)
│   └── audio/
│       └── ShadowingAudioPlayer.tsx # UI integration with sentence save modal
```

## Integration Points

### Existing Systems
- **Entitlements**: Uses `word_lists` entitlement (3 lists total for free, unlimited for premium)
- **Cloud Sync**: Leverages existing CloudSync infrastructure  
- **Notifications**: Uses existing notification system for feedback
- **Authentication**: Integrated with three-pillar access control system
- **UI Patterns**: Follows same modal and interaction patterns
- **Type System**: Fully integrated with unified StudyListManager types

### Modal System Integration
The sentence saving feature maintains UI consistency across the application:

**Current Implementation**: 
- Custom sentence save modal within `ShadowingAudioPlayer.tsx`
- Includes list selection and new list creation in one interface
- Matches the modal pattern used for word and kanji saving

**Future Enhancement**:
- Could be migrated to use the unified `ListSelectionModal` component
- Would provide consistent experience across all list creation contexts
- Modal already supports sentence list type selection and validation

**Benefits of Current Approach**:
- Contextual sentence preview with source attribution
- Specialized UI for sentence-specific features
- Integrated access control and validation

### Future Games
The sentence bookmark system creates a foundation for future game features:
- **Sentence Recognition Games**: Use saved sentences as content
- **Grammar Pattern Games**: Extract patterns from bookmarked sentences  
- **Translation Games**: Practice translating saved sentences
- **Listening Comprehension**: Audio-based games using TTS
- **Custom Study Sets**: Create targeted practice from saved content

## Technical Notes

### Performance
- Local storage for immediate response
- Lazy loading of sentence lists
- Efficient data structures for fast lookups
- Minimal re-renders through proper state management

### Error Handling
- Graceful degradation when storage fails
- Clear user feedback for all operations
- Proper cleanup on component unmount
- Robust cloud sync with retry logic

### Security
- User data isolation through existing Firestore rules
- No sensitive data exposure in sentence content
- Proper authentication checks before operations
- Cloud sync only for authorized premium users

This implementation successfully integrates sentence saving into the unified StudyListManager system, providing type safety, proper entitlement control, and consistent user experience while maintaining the same architectural patterns used throughout the application.