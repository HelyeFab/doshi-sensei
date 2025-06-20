# 🛠️ Patch Plan & Code Diff Proposal for Doshi Sensei List System

This document outlines recommended changes to improve the list architecture for handling drillable and mixed content lists, aligning with the subscription model and UX enhancements.

---

## ✅ PATCH PLAN

### 1. Rename `flashcard` List Type to `custom` (optional but recommended)

**Why**: Clarifies that the list supports any content type, not just flashcards.

- **Code**
  - Update all references:
    ```ts
    type StudyListType = 'drillable' | 'custom';
    ```

- **Storage Migration**
  - On app start:
    ```ts
    migrateFlashcardToCustom() {
      for (let list of allLists) {
        if (list.type === 'flashcard') list.type = 'custom';
      }
    }
    ```

---

### 2. Add `studyMode` to `StudyList`

```ts
type StudyMode = 'drill' | 'flashcard' | 'kanji_quiz' | 'reading';

interface StudyList {
  ...
  studyMode?: StudyMode;
}
```

- **Usage**: UI can adapt based on `studyMode` (e.g., drill layout vs card flip)

---

### 3. Add `subType` to `JapaneseWord` for better filtering

```ts
type WordSubType = 'verb' | 'adjective' | 'noun' | 'expression';

interface JapaneseWord {
  ...
  subType?: WordSubType;
}
```

- **Populate** during initial parsing or enrichment
- **UI Filters**: Add "Filter by: Verbs / Adjectives / Kanji / All"

---

### 4. Integrate Subscription Limits in StudyListManager

```ts
class StudyListManager {
  static async canCreateList(user: User, subscription: string): Promise<boolean> {
    const lists = await getAllStudyLists();
    return subscription === 'premium' || lists.length < 3;
  }

  static async canAddDrillToday(user: User, subscription: string): Promise<boolean> {
    const todayDrillCount = await getTodayDrillCount();
    return subscription === 'premium' || todayDrillCount < 3;
  }
}
```

- Return error messages to UI:
  ```ts
  return { success: false, errors: ['List limit reached for free users.'] }
  ```

---

### 5. Track Study Metadata Per List

```ts
interface StudyList {
  ...
  lastStudied?: Date;
  drillCount?: number;
  flashcardReviewCount?: number;
}
```

- Use this data to:
  - Sort lists by recent usage
  - Show stats in UI
  - Enable future features like spaced repetition or reminders

---

## ✅ CODE DIFF PROPOSAL

### ⬆️ StudyList Type Update

```diff
- type StudyListType = 'drillable' | 'flashcard';
+ type StudyListType = 'drillable' | 'custom';
```

---

### ➕ StudyMode Field

```diff
+ type StudyMode = 'drill' | 'flashcard' | 'kanji_quiz' | 'reading';

interface StudyList {
  ...
+ studyMode?: StudyMode;
}
```

---

### ➕ Word SubType for Filtering

```diff
+ type WordSubType = 'verb' | 'adjective' | 'noun' | 'expression';

interface JapaneseWord {
  ...
+ subType?: WordSubType;
}
```

---

### ➕ Subscription-Aware Limits

```ts
+ static async canCreateList(user: User, sub: string): Promise<boolean> { ... }
+ static async canAddDrillToday(user: User, sub: string): Promise<boolean> { ... }
```

---

### ➕ Metadata Fields for Study Tracking

```diff
interface StudyList {
  ...
+ lastStudied?: Date;
+ drillCount?: number;
+ flashcardReviewCount?: number;
}
```

---

This patch is backward-compatible and adds clear extensibility hooks for your planned premium features and future enhancements.
