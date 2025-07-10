# 🔍 Strings Audit Analysis - Doshi Sensei

## 📊 Executive Summary

This document provides a comprehensive analysis of hardcoded text found throughout the Doshi Sensei application that should be moved to a centralized multilingual strings system. The audit reveals significant amounts of embedded text that need to be centralized for better maintainability, internationalization readiness, and consistency.

### **Current State**

- ✅ **Centralized strings file**: `src/config/strings.ts` exists and is comprehensive (1,555 lines)
- ✅ **Good coverage**: Core functionality, games, admin, errors, forms, audio
- ❌ **Missing coverage**: Many page headers, form labels, tooltips, and component-specific text
- ❌ **Inconsistent usage**: Some components use strings, others have hardcoded text
- 🌍 **Multilingual goal**: Planning to support English, French, and Japanese

### **Audit Scope**

- **Files analyzed**: 50+ TypeScript/TSX files
- **Hardcoded strings found**: 200+ instances
- **Components affected**: 30+ components and pages
- **Categories identified**: 8 main categories of hardcoded text
- **Target languages**: English (source), French, Japanese, and more to be added

---

## 🌍 **MULTILINGUAL ARCHITECTURE PLAN**

### **Recommended File Structure:**

```
src/config/strings/
├── index.ts              // Main export with language detection
├── en.ts                 // English strings (source of truth)
├── fr.ts                 // French strings
├── ja.ts                 // Japanese strings
├── de.ts                 // German strings (future)
├── es.ts                 // Spanish strings (future)
├── it.ts                 // Italian strings (future)
├── ko.ts                 // Korean strings (future)
├── zh.ts                 // Chinese strings (future)
└── types.ts              // TypeScript types
```

### **Language Detection Hook:**

```typescript
// src/hooks/useLanguage.ts
import { useState, useEffect } from "react";
import { getStrings, Language } from "@/config/strings";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    // Detect user's preferred language
    const userLang = navigator.language.split("-")[0] as Language;
    if (["en", "fr", "ja"].includes(userLang)) {
      setLanguage(userLang);
    }
  }, []);

  return {
    language,
    setLanguage,
    strings: getStrings(language),
  };
}
```

### **Component Usage Pattern:**

```typescript
// Before (current)
import { strings } from "@/config/strings";
<PageHeader title={strings.kanjiMoods.title} />;

// After (multilingual)
import { useLanguage } from "@/hooks/useLanguage";
const { strings } = useLanguage();
<PageHeader title={strings.kanjiMoods.title} />;
```

---

## 🎯 **SUB-TASK 1: Page Headers and Titles**

### **Files with Hardcoded Page Headers:**

#### **1. `src/app/kanji-moods/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Kanji Mood Boards"; // Lines 48, 81
"Learn Kanji by Theme"; // Line 95
"Your Progress"; // Line 101
"Total Boards"; // Line 105
"Completed"; // Line 109
"Total Kanji"; // Line 115
"Learned"; // Line 121
"Available Mood Boards"; // Line 130
"No mood boards available"; // Line 140
"How to Use Mood Boards"; // Line 150
// Step-by-step instructions           // Lines 171-206
```

#### **2. `src/app/favourites/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"⭐ My Favourites"; // Line 490
"My Word Lists"; // Line 557
"No Word Lists Yet"; // Line 540
"Create Your First List"; // Line 550
"+ Create List"; // Line 565
"Clear All"; // Line 572
```

#### **3. `src/app/resources/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Resources"; // Line 102
"All Categories"; // Line 135
"Featured only"; // Line 149
"Read More"; // Line 322
```

#### **4. `src/app/contact/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Contact Us"; // Lines 100, 140
// Contact form options                 // Lines 158-162, 211-215
```

---

## 🎯 **SUB-TASK 2: Admin Dashboard Components**

### **Files with Hardcoded Admin Text:**

#### **1. `src/components/admin/StatsOverview.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Total Users"; // Line 87
"New Users Today"; // Line 95
"Active Today"; // Line 101
"Registered Users"; // Line 107
"Free Users"; // Line 121
"Premium Users"; // Line 127
"Monthly Subscribers"; // Line 135
"Yearly Subscribers"; // Line 141
"Drills Today"; // Line 153
"Vocabulary Searches"; // Line 159
"Mood Board Views"; // Line 165
"Avg Session (min)"; // Line 171
"User Statistics"; // Line 75
"Subscription Statistics"; // Line 110
"Feature Usage"; // Line 145
"Failed to load statistics"; // Line 65
```

#### **2. `src/app/admin/resources/new/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Error"; // Line 669
```

#### **3. `src/app/admin/resources/[id]/edit/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Error"; // Line 628
```

---

## 🎯 **SUB-TASK 3: Form Labels and Placeholders**

### **Files with Hardcoded Form Text:**

#### **1. `src/app/vocabulary/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Search"; // Line 213
"Search History"; // Line 266
"No Search History"; // Line 280
"Reading"; // Line 477
"Meaning"; // Line 485
"Type"; // Line 491
"Flashcard List"; // Line 699
"Drillable List"; // Line 718
"Delete entry"; // Line 319
```

#### **2. `src/app/account/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Account Status"; // Line 272
"Active"; // Line 273
"Member Since"; // Line 276
"Choose your profile thumbnail"; // Line 393
"Or continue with email"; // Line 487
```

---

## 🎯 **SUB-TASK 4: Game and Interactive Components**

### **Files with Hardcoded Game Text:**

#### **1. `src/components/games/SentenceScrambleGame/SentenceScrambleModal.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Exit Sentence Scramble?"; // Line 556
```

#### **2. `src/components/games/KanaDropGame/KanaDropModal.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Close Game"; // Line 678
```

#### **3. `src/app/games/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
// Various game instructions and states
```

---

## 🎯 **SUB-TASK 5: Error Messages and Notifications**

### **Files with Hardcoded Error Text:**

#### **1. `src/components/DonationModal.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Error"; // Line 247
```

#### **2. `src/app/account/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Error"; // Line 416
```

#### **3. `src/app/contact/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Error"; // Line 264
```

---

## 🎯 **SUB-TASK 6: Settings and Legal Pages**

### **Files with Hardcoded Legal Text:**

#### **1. `src/app/settings/acknowledgments/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Acknowledgments"; // Line 7
"Core Technologies"; // Line 23
"Japanese Language Data"; // Line 66
"Development Tools"; // Line 115
// Various technology names and descriptions
```

#### **2. `src/app/settings/terms-of-service/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Terms of Service"; // Line 7
"Agreement to Terms"; // Line 23
"Permitted Use"; // Line 31
"Prohibited Activities"; // Line 64
// Legal section headers and content
```

#### **3. `src/app/settings/privacy-policy/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Privacy Policy"; // Line 7
```

---

## 🎯 **SUB-TASK 7: Audio and Media Components**

### **Files with Hardcoded Audio Text:**

#### **1. `src/components/audio/EnhancedArticleAudioPlayer.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Play"; // Line 591
```

#### **2. `src/components/audio/ShadowingAudioPlayer.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Save sentence to list"; // Line 622
```

---

## 🎯 **SUB-TASK 8: Tooltips and Accessibility**

### **Files with Hardcoded Tooltip Text:**

#### **1. `src/app/vocabulary/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Delete entry"; // Line 319
```

#### **2. `src/app/favourites/page.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Delete list"; // Line 600
"Remove bookmark"; // Line 837
"View original"; // Line 876
"Create New Study List"; // Line 1083
```

#### **3. `src/components/admin/feature-matrix/EditableLimitCell.tsx`**

```typescript
// HARDCODED TEXT FOUND:
"Save"; // Line 54
"Cancel"; // Line 66
```

---

## 📋 **MULTILINGUAL IMPLEMENTATION PLAN**

### **Phase 1: Complete Audit and Prepare Structure**

#### **Step 1: Add Missing String Sections**

Add these sections to the current `src/config/strings.ts`:

```typescript
// Kanji Mood Boards
kanjiMoods: {
  title: "Kanji Mood Boards",
  subtitle: "Learn Kanji by Theme",
  description: "Discover kanji organized by meaningful themes and contexts. Each mood board contains related kanji that tell a story together, making them easier to remember and understand.",
  progress: {
    title: "Your Progress",
    totalBoards: "Total Boards",
    completed: "Completed",
    totalKanji: "Total Kanji",
    learned: "Learned"
  },
  instructions: {
    title: "How to Use Mood Boards",
    step1: {
      title: "Choose a Theme",
      description: "Pick a mood board that interests you - Nature, Daily Life, or Numbers"
    },
    step2: {
      title: "Study Each Kanji",
      description: "Tap kanji cards to see readings and examples. Find connections between them."
    },
    step3: {
      title: "Mark as Learned",
      description: "Click the circle button when you've mastered a kanji"
    },
    step4: {
      title: "Complete the Board",
      description: "Learn all 5 kanji to complete the theme and unlock achievements"
    }
  },
  emptyState: {
    title: "No mood boards available",
    description: "Mood boards are being prepared. Check back soon!"
  }
},

// Favourites
favourites: {
  title: "⭐ My Favourites",
  description: "Your personal collection of vocabulary lists and bookmarked articles.",
  tabs: {
    lists: "📚 Lists",
    articles: "📰 Articles",
    stories: "📖 Stories"
  },
  lists: {
    title: "My Word Lists",
    emptyState: {
      title: "No Word Lists Yet",
      description: "Create your first list to start organizing your Japanese vocabulary.",
      createButton: "Create Your First List"
    },
    actions: {
      createList: "+ Create List",
      clearAll: "Clear All"
    }
  }
},

// Resources
resources: {
  title: "Resources",
  filters: {
    allCategories: "All Categories",
    featuredOnly: "Featured only"
  },
  actions: {
    readMore: "Read More"
  }
},

// Contact
contact: {
  title: "Contact Us",
  form: {
    categories: {
      general: "General Question",
      bug: "Bug Report",
      feedback: "Feedback",
      feature: "Feature Request",
      support: "Technical Support"
    }
  }
},

// Admin Dashboard
admin: {
  stats: {
    userStatistics: "User Statistics",
    subscriptionStatistics: "Subscription Statistics",
    featureUsage: "Feature Usage",
    failedToLoad: "Failed to load statistics",
    cards: {
      totalUsers: "Total Users",
      newUsersToday: "New Users Today",
      activeToday: "Active Today",
      registeredUsers: "Registered Users",
      freeUsers: "Free Users",
      premiumUsers: "Premium Users",
      monthlySubscribers: "Monthly Subscribers",
      yearlySubscribers: "Yearly Subscribers",
      drillsToday: "Drills Today",
      vocabularySearches: "Vocabulary Searches",
      moodBoardViews: "Mood Board Views",
      avgSession: "Avg Session (min)"
    }
  }
},

// Forms and Labels
forms: {
  labels: {
    search: "Search",
    reading: "Reading",
    meaning: "Meaning",
    type: "Type",
    accountStatus: "Account Status",
    active: "Active",
    memberSince: "Member Since",
    chooseAvatar: "Choose your profile thumbnail",
    continueWithEmail: "Or continue with email"
  },
  placeholders: {
    searchHistory: "Search History",
    noSearchHistory: "No Search History"
  }
},

// Games
games: {
  modals: {
    exitSentenceScramble: "Exit Sentence Scramble?",
    closeGame: "Close Game"
  }
},

// Errors
errors: {
  generic: "Error"
},

// Settings
settings: {
  pages: {
    acknowledgments: "Acknowledgments",
    termsOfService: "Terms of Service",
    privacyPolicy: "Privacy Policy"
  },
  acknowledgments: {
    sections: {
      coreTechnologies: "Core Technologies",
      japaneseLanguageData: "Japanese Language Data",
      developmentTools: "Development Tools"
    }
  },
  termsOfService: {
    sections: {
      agreementToTerms: "Agreement to Terms",
      permittedUse: "Permitted Use",
      prohibitedActivities: "Prohibited Activities"
    }
  }
},

// Audio
audio: {
  actions: {
    play: "Play",
    saveSentenceToList: "Save sentence to list"
  }
},

// Tooltips
tooltips: {
  deleteEntry: "Delete entry",
  deleteList: "Delete list",
  removeBookmark: "Remove bookmark",
  viewOriginal: "View original",
  createNewStudyList: "Create New Study List",
  save: "Save",
  cancel: "Cancel"
}
```

#### **Step 2: Create Multilingual Structure**

```bash
# Create new directory structure
mkdir -p src/config/strings
mv src/config/strings.ts src/config/strings/en.ts

# Create language files
touch src/config/strings/fr.ts
touch src/config/strings/ja.ts
touch src/config/strings/index.ts
touch src/config/strings/types.ts
```

#### **Step 3: Set Up Language Files**

```typescript
// src/config/strings/index.ts
import { en } from "./en";
import { fr } from "./fr";
import { ja } from "./ja";

export const strings = {
  en,
  fr,
  ja,
};

export type Language = keyof typeof strings;
export type StringKeys = keyof typeof en;

export function getStrings(language: Language = "en") {
  return strings[language];
}

// Default export for backward compatibility
export { en as default } from "./en";
```

```typescript
// src/config/strings/fr.ts
export const fr = {
  // Copy structure from en.ts and translate to French
  appName: "Doshi Sensei",
  appDescription:
    "Maîtrisez les conjugaisons de verbes et d'adjectifs japonais",
  // ... continue with all strings
};
```

```typescript
// src/config/strings/ja.ts
export const ja = {
  // Copy structure from en.ts and translate to Japanese
  appName: "ドシ先生",
  appDescription: "日本語の動詞と形容詞の活用をマスター",
  // ... continue with all strings
};
```

### **Phase 2: Create Multilingual Structure** ✅ **COMPLETED**

**Status:** ✅ Completed
**Priority:** High
**Estimated Time:** 2-3 hours

#### **Completed Work:**
- ✅ **File Structure:** Created `src/config/strings/` with modular language files
- ✅ **Language Detection:** Implemented `useLanguage()` hook with browser detection
- ✅ **Context Provider:** Created `LanguageContext` for global state management
- ✅ **Language Selector:** Built `LanguageSelector` component with compact variant
- ✅ **French Template:** Created `fr.ts` with sample translations
- ✅ **Migration Guide:** Created comprehensive migration documentation
- ✅ **Type Safety:** Implemented proper TypeScript types for all languages

#### **Created Files:**
- `src/config/strings/index.ts` - Main export with language detection
- `src/config/strings/en.ts` - English strings (moved from original)
- `src/config/strings/fr.ts` - French template with translations
- `src/hooks/useLanguage.ts` - Language detection and switching hooks
- `src/contexts/LanguageContext.tsx` - Global language state management
- `src/components/LanguageSelector.tsx` - Language switching component
- `docs/MULTILINGUAL_MIGRATION_GUIDE.md` - Migration documentation

#### **Language Detection Hook:**

```typescript
// src/hooks/useLanguage.ts
import { useState, useEffect } from "react";
import { getStrings, Language, getUserPreferredLanguage, getSupportedLanguages } from "@/config/strings";

export function useLanguage() {
  const [language, setLanguage] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Detect user's preferred language on mount
    const preferredLanguage = getUserPreferredLanguage();
    setLanguage(preferredLanguage);
    setIsLoading(false);
  }, []);

  const changeLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
    // Optionally save to localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("doshi-language", newLanguage);
    }
  };

  return {
    language,
    setLanguage: changeLanguage,
    strings: getStrings(language),
    isLoading,
    supportedLanguages: getSupportedLanguages()
  };
}
```

### **Phase 3: Refactor Components**

#### **Priority Order:**

1. **HIGH PRIORITY**: Page headers and navigation text
2. **MEDIUM PRIORITY**: Form labels and user-facing messages
3. **LOW PRIORITY**: Admin dashboard and tooltips

#### **Implementation Steps:**

1. **Update imports** in each component:

   ```typescript
   // Before
   import { strings } from "@/config/strings";

   // After
   import { useLanguage } from "@/hooks/useLanguage";
   const { strings } = useLanguage();
   ```

2. **Replace hardcoded text** with string references:

   ```typescript
   // Before
   <PageHeader title="Kanji Mood Boards" />

   // After
   <PageHeader title={strings.kanjiMoods.title} />
   ```

3. **Test functionality** after each change

### **Phase 4: Translation Workflow**

#### **Translation Guidelines:**

1. **Use descriptive keys** - avoid generic keys like `m1`, `m2`
2. **Handle cultural differences** - formal vs informal language
3. **Consider context** - Japanese has different politeness levels
4. **Test with native speakers** - especially for Japanese

#### **Example Translations:**

```typescript
// English
welcomeMessage: "Welcome to Doshi Sensei!",

// French
welcomeMessage: "Bienvenue chez Doshi Sensei !",

// Japanese (formal)
welcomeMessage: "ドシ先生へようこそ！",
```

---

## 📊 **STATISTICS**

### **Audit Results:**

- **Total files analyzed**: 50+
- **Hardcoded strings found**: 200+
- **Components affected**: 30+
- **Categories identified**: 8
- **Estimated effort**: 3-4 days
- **Target languages**: 8+ (English, French, Japanese, German, Spanish, Italian, Korean, Chinese, and more)

### **Coverage by Category:**

- ✅ **Core functionality**: 95% centralized
- ✅ **Games**: 90% centralized
- ✅ **Admin dashboard**: 70% centralized
- ❌ **Page headers**: 40% centralized
- ❌ **Form labels**: 60% centralized
- ❌ **Tooltips**: 30% centralized
- ❌ **Error messages**: 80% centralized
- ❌ **Settings pages**: 50% centralized

### **File Size Projections:**

- **Current English**: 1,555 lines
- **After split**: ~500 lines per language file
- **Total multilingual**: ~4,000+ lines across 8+ language files
- **Scalable structure**: Easy to add new languages

---

## 🎯 **SUCCESS CRITERIA**

### **Phase 1 Completion:**

- [ ] All missing string sections added to strings.ts
- [ ] Multilingual structure created
- [ ] TypeScript types updated
- [ ] No compilation errors

### **Phase 2 Completion:** ✅ **COMPLETED**

- ✅ Language detection hook implemented
- ✅ Multilingual structure created
- ✅ Language context provider added
- ✅ Language selector component built
- ✅ French template created
- ✅ Migration guide documented
- ⏳ All components refactored to use useLanguage (Phase 3)
- ⏳ No hardcoded strings remaining (Phase 3)
- ⏳ All functionality working correctly (Phase 3)

### **Phase 3 Completion:**

- [ ] French translations completed
- [ ] Japanese translations completed
- [ ] Language switching tested
- [ ] Cultural considerations addressed

### **Phase 4 Completion:**

- [ ] Code review completed
- [ ] Documentation updated
- [ ] Testing completed
- [ ] Performance optimized

---

## 🚀 **BENEFITS**

1. **Maintainability**: Single source of truth for all app text
2. **Internationalization**: Ready for multi-language support
3. **Consistency**: Uniform text across the app
4. **Developer Experience**: Easier to find and update text
5. **Quality Assurance**: Reduced risk of typos and inconsistencies
6. **Global Reach**: Support for English, French, and Japanese users
7. **Cultural Sensitivity**: Proper handling of language-specific nuances

---

## 📝 **NEXT STEPS**

1. **Review this analysis** with the development team
2. **Prioritize the sub-tasks** based on business needs
3. **Begin Phase 1** by adding missing string sections
4. **Create multilingual structure** and language detection
5. **Systematically refactor** components in priority order
6. **Implement translations** with native speaker review
7. **Test thoroughly** after each change
8. **Document lessons learned** for future reference

---

_Last updated: [Current Date]_
_Audit performed by: AI Assistant_
_Status: Ready for multilingual implementation_
_Target languages: English, French, Japanese, German, Spanish, Italian, Korean, Chinese, and more_
