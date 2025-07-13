# Internationalization (i18n) Developer Guide

This guide provides comprehensive instructions for developers on how to work with the internationalization system in Doshi Sensei. It covers adding new features, editing existing content, managing translations, and best practices.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Adding New Features](#adding-new-features)
3. [Editing Existing Content](#editing-existing-content)
4. [String Organization Guidelines](#string-organization-guidelines)
5. [Translation Workflow](#translation-workflow)
6. [Best Practices](#best-practices)
7. [Common Scenarios](#common-scenarios)
8. [Troubleshooting](#troubleshooting)
9. [Scripts and Tools](#scripts-and-tools)

## Architecture Overview

### Supported Languages

The app currently supports the following languages, all translated using OpenAI GPT-4o-mini:

| Language | Code | Status | Quality |
|----------|------|--------|---------|
| English | en | Base language | Native |
| Spanish | es | ✅ 100% | OpenAI GPT-4 |
| French | fr | ✅ 100% | OpenAI GPT-4 |
| German | de | ✅ 100% | OpenAI GPT-4 |
| Italian | it | ✅ 100% | OpenAI GPT-4 |
| Arabic | ar | ✅ 100% | OpenAI GPT-4 (RTL support needed) |
| Korean | ko | ✅ 100% | OpenAI GPT-4 |

### Core Components

1. **String Files Structure**
   ```
   src/config/strings/
   ├── en.ts                    # English (base language)
   ├── index.ts                 # Exports and type definitions
   └── translations/            # All other languages
       ├── es.ts               # Spanish
       ├── fr.ts               # French
       ├── de.ts               # German
       ├── it.ts               # Italian
       ├── ar.ts               # Arabic
       └── ko.ts               # Korean
   ```

2. **Language Context** (`/src/contexts/LanguageContext.tsx`)
   - Manages current language state
   - Provides `useLanguage()` and `useStrings()` hooks
   - Persists language preference to localStorage

3. **Language Selector** (`/src/components/LanguageSelector.tsx`)
   - UI component for language switching
   - Triggers page reload on language change

### How It Works

1. **LanguageProvider** wraps the app in `layout.tsx`
2. Components import `useStrings` from `LanguageContext`
3. Strings are accessed via dot notation: `strings.section.key`
4. Language changes trigger a page reload to update all components

## Adding New Features

### Step 1: Add English Strings First

**ALWAYS start with English (`en.ts`) as it's the base language.**

```typescript
// src/config/strings/en.ts

export const en = {
  // ... existing sections ...
  
  // Add your new feature section
  myNewFeature: {
    title: "My New Feature",
    description: "This feature does amazing things",
    buttons: {
      start: "Start",
      stop: "Stop",
      reset: "Reset"
    },
    messages: {
      success: "Operation completed successfully!",
      error: "Something went wrong. Please try again.",
      loading: "Loading..."
    },
    settings: {
      enableNotifications: "Enable notifications",
      soundEffects: "Sound effects",
      darkMode: "Dark mode"
    }
  }
};
```

### Step 2: Use Strings in Your Component

```typescript
// src/app/my-new-feature/page.tsx

"use client";

import { useStrings } from "@/contexts/LanguageContext";

export default function MyNewFeaturePage() {
  const strings = useStrings();
  
  return (
    <div>
      <h1>{strings.myNewFeature.title}</h1>
      <p>{strings.myNewFeature.description}</p>
      
      <button>{strings.myNewFeature.buttons.start}</button>
      <button>{strings.myNewFeature.buttons.stop}</button>
      
      {/* Nested access for deeper structures */}
      <label>
        <input type="checkbox" />
        {strings.myNewFeature.settings.enableNotifications}
      </label>
    </div>
  );
}
```

### Step 3: Add Type Safety

The TypeScript types are automatically inferred from the English strings, but you should verify they're working:

```typescript
// Your IDE should provide autocomplete for:
strings.myNewFeature.title
strings.myNewFeature.buttons.start
// etc.
```

### Step 4: Run Translation Scripts

After adding English strings, run the translation scripts to update other languages:

```bash
# Check current translation coverage
node scripts/translate-unified.js --check

# Translate missing strings for a specific language
node scripts/translate-unified.js fr

# Translate all languages at once
node scripts/translate-unified.js all

# Force re-translate a language (useful for quality improvements)
node scripts/translate-unified.js it --force
```

## Editing Existing Content

### Scenario 1: Fixing a Typo or Improving Text

1. **Edit the English string first:**
```typescript
// src/config/strings/en.ts
practice: {
  conjugationPrompt: "Type the correct conjugation", // Changed from "Enter conjugation"
}
```

2. **Update translations** to match the new meaning:
```typescript
// src/config/strings/translations/es.ts
practice: {
  conjugationPrompt: "Escribe la conjugación correcta", // Updated Spanish
}
```

### Scenario 2: Adding New Options to Existing Features

1. **Add to existing section:**
```typescript
// src/config/strings/en.ts
games: {
  // ... existing game strings ...
  
  // Add new difficulty levels
  difficulty: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    extreme: "Extreme" // New addition
  }
}
```

2. **No need to change component imports** - just use the new string:
```typescript
<option value="extreme">{strings.games.difficulty.extreme}</option>
```

### Scenario 3: Renaming or Restructuring

**⚠️ WARNING: Renaming keys breaks all existing translations!**

If you must rename:

1. **Use find-and-replace across all language files**
2. **Update all component references**
3. **Test thoroughly**

Better approach: Add new keys and deprecate old ones gradually.

## String Organization Guidelines

### 1. Logical Grouping

Group strings by feature or page:

```typescript
export const en = {
  // Common/shared strings
  common: {
    buttons: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete"
    },
    messages: {
      loading: "Loading...",
      error: "An error occurred"
    }
  },
  
  // Page-specific strings
  homePage: {
    title: "Welcome to Doshi Sensei",
    subtitle: "Learn Japanese with us"
  },
  
  // Feature-specific strings
  drill: {
    title: "Conjugation Practice",
    instructions: "Type the correct form"
  },
  
  // Component-specific strings
  components: {
    navbar: {
      home: "Home",
      about: "About"
    }
  }
};
```

### 2. Naming Conventions

- Use **camelCase** for keys: `myFeatureName`
- Use **descriptive names**: `confirmDeleteMessage` not `msg1`
- Group related strings: `buttons.save`, `buttons.cancel`
- Avoid deep nesting (max 3-4 levels)

### 3. String Placement Decision Tree

```
Is the string used in multiple places?
├─ YES → Put in 'common' section
└─ NO → Is it page-specific?
    ├─ YES → Put in page section (e.g., 'homePage')
    └─ NO → Is it feature-specific?
        ├─ YES → Put in feature section (e.g., 'games')
        └─ NO → Put in 'components' section
```

## Translation Workflow

### Automated Translation Process

1. **Check Coverage**
```bash
node scripts/translate-unified.js --check
```

Output shows:
```
Translation Coverage Report
==========================
Spanish (es): 1468/1468 (100.00%)
French (fr): 1312/1468 (89.37%) - Missing: 156
German (de): 1312/1468 (89.37%) - Missing: 156
```

2. **Translate Missing Strings**

Using OpenAI (all translations now use OpenAI GPT-4o-mini):
```bash
# Translate a specific language
node scripts/translate-unified.js fr

# Translate all languages
node scripts/translate-unified.js all

# Force re-translate for better quality
node scripts/translate-unified.js de --force
```

3. **Verify Translations**
```bash
node scripts/test-translations.js
```

### Manual Translation Process

For critical UI text or when automated translation fails:

1. **Export strings for translator:**
```bash
node scripts/extract-strings.js --language es --missing-only
```

2. **Send to translator** with context:
```
String Key: games.instructions.dragAndDrop
English: "Drag the character to match its reading"
Context: Instruction text for a kanji learning game where users drag characters
Please translate to Spanish: _____________
```

3. **Import translations back:**
```javascript
// Manually update the translation file
// src/config/strings/translations/es.ts
games: {
  instructions: {
    dragAndDrop: "Arrastra el carácter para coincidir con su lectura"
  }
}
```

## Best Practices

### 1. String Content Guidelines

**DO:**
- ✅ Use complete sentences when possible
- ✅ Include punctuation in strings
- ✅ Use placeholders for dynamic content
- ✅ Keep strings concise but clear

**DON'T:**
- ❌ Concatenate strings to form sentences
- ❌ Put HTML in strings (use React components)
- ❌ Hardcode language-specific formatting

### 2. Dynamic Content with Placeholders

```typescript
// Good: Use template literals
const welcomeMessage = strings.home.welcome.replace('{{name}}', userName);

// String definition:
home: {
  welcome: "Welcome back, {{name}}!"
}

// Better: Use a formatting function
function formatString(str: string, params: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => params[key] || match);
}

const message = formatString(strings.home.welcome, { name: userName });
```

### 3. Pluralization

```typescript
// Simple approach for English:
messages: {
  itemCount: "{{count}} item",
  itemCountPlural: "{{count}} items"
}

// In component:
const message = count === 1 
  ? strings.messages.itemCount.replace('{{count}}', count)
  : strings.messages.itemCountPlural.replace('{{count}}', count);
```

### 4. Date and Number Formatting

```typescript
// Use Intl API for locale-specific formatting
const formattedDate = new Intl.DateTimeFormat(currentLanguage).format(date);
const formattedNumber = new Intl.NumberFormat(currentLanguage).format(number);
```

### 5. Component-Specific Strings

For components used in multiple places:

```typescript
// src/components/ConfirmDialog.tsx
interface ConfirmDialogProps {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

function ConfirmDialog({ 
  title, 
  message, 
  confirmText, 
  cancelText 
}: ConfirmDialogProps) {
  const strings = useStrings();
  
  return (
    <Dialog>
      <h2>{title || strings.common.dialogs.confirmTitle}</h2>
      <p>{message || strings.common.dialogs.confirmMessage}</p>
      <button>{confirmText || strings.common.buttons.confirm}</button>
      <button>{cancelText || strings.common.buttons.cancel}</button>
    </Dialog>
  );
}
```

## Common Scenarios

### Scenario 1: Adding a New Game

```typescript
// 1. Add to en.ts
games: {
  kanjiMemory: {
    title: "Kanji Memory Game",
    instructions: "Match kanji with their meanings",
    score: "Score: {{score}}",
    timeLeft: "Time: {{time}}s",
    gameOver: "Game Over!",
    newHighScore: "New High Score!",
    playAgain: "Play Again"
  }
}

// 2. Create game component
export function KanjiMemoryGame() {
  const strings = useStrings();
  const [score, setScore] = useState(0);
  
  return (
    <div>
      <h1>{strings.games.kanjiMemory.title}</h1>
      <p>{strings.games.kanjiMemory.instructions}</p>
      <div>{formatString(strings.games.kanjiMemory.score, { score })}</div>
    </div>
  );
}

// 3. Run translations
node scripts/translate-unified.js all
```

### Scenario 2: Adding Admin Features

```typescript
// 1. Add admin section if not exists
admin: {
  userManagement: {
    title: "User Management",
    searchPlaceholder: "Search users...",
    columns: {
      email: "Email",
      joinDate: "Joined",
      subscription: "Plan",
      lastActive: "Last Active"
    },
    actions: {
      viewDetails: "View Details",
      upgradeToPremium: "Upgrade to Premium",
      sendEmail: "Send Email"
    },
    filters: {
      all: "All Users",
      premium: "Premium Only",
      free: "Free Only",
      inactive: "Inactive"
    }
  }
}
```

### Scenario 3: Error Messages

```typescript
// Centralize error messages
errors: {
  network: {
    offline: "You appear to be offline. Please check your connection.",
    timeout: "Request timed out. Please try again.",
    serverError: "Server error. Please try again later."
  },
  validation: {
    required: "This field is required",
    email: "Please enter a valid email address",
    minLength: "Must be at least {{min}} characters",
    maxLength: "Must be no more than {{max}} characters"
  },
  auth: {
    invalidCredentials: "Invalid email or password",
    accountLocked: "Account locked. Please contact support.",
    emailNotVerified: "Please verify your email address"
  }
}
```

### Scenario 4: Dynamic Lists

```typescript
// For dynamic content like API responses
const processApiResponse = (items: ApiItem[]) => {
  return items.map(item => ({
    ...item,
    // Translate status values
    statusText: strings.statuses[item.status] || item.status,
    // Translate categories
    categoryText: strings.categories[item.category] || item.category
  }));
};
```

## Troubleshooting

### Issue: Strings Not Updating

**Symptoms:** Changed strings but still seeing old text

**Solutions:**
1. Check browser cache - hard refresh (Ctrl+Shift+R)
2. Verify import path is from `@/contexts/LanguageContext`
3. Ensure component is wrapped in LanguageProvider
4. Check for hardcoded text in component

### Issue: TypeScript Errors

**Symptoms:** Type errors when accessing strings

**Solutions:**
1. Restart TypeScript server in VS Code
2. Check that new strings are added to `en.ts` first
3. Verify string key spelling matches exactly

### Issue: Missing Translations

**Symptoms:** English text showing for non-English languages

**Solutions:**
1. Run `node scripts/translate-unified.js --check`
2. Use translation scripts to fill gaps
3. Check console for specific missing keys

### Issue: Special Characters Not Displaying

**Symptoms:** �, ?, or boxes instead of characters

**Solutions:**
1. Ensure files saved as UTF-8
2. Check font support for language (especially Arabic, Korean)
3. Verify HTML lang attribute matches current language

### Issue: RTL Languages (Arabic)

**Symptoms:** Layout broken for Arabic

**Solutions:**
1. Add RTL support to layout:
```typescript
<html dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}>
```

2. Use logical CSS properties:
```css
/* Instead of: */ margin-left: 10px;
/* Use: */ margin-inline-start: 10px;
```

## Scripts and Tools

### Main Translation Script

**translate-unified.js** - The unified translation tool for all languages:

```bash
# Check translation coverage for all languages
node scripts/translate-unified.js --check

# Translate missing strings for a specific language
node scripts/translate-unified.js fr

# Translate all languages at once
node scripts/translate-unified.js all

# Force re-translate a language (replaces all existing translations)
node scripts/translate-unified.js it --force
```

**Features:**
- Uses OpenAI GPT-4o-mini for consistent, high-quality translations
- Supports: Spanish, French, German, Italian, Arabic, Korean
- Preserves placeholders ({{name}}, {{count}}, etc.)
- Maintains technical terms (JLPT, Doshi Sensei, etc.)
- Chunks large translation jobs for API efficiency
- Automatic retry on failures
- Context-aware translations for UI/UX

**Important:** All languages have been re-translated with OpenAI as of January 2025. Previous Google Translate content has been replaced.

### Legacy Scripts (Deprecated)

These scripts are no longer maintained and should not be used:

1. **check-translation-coverage.js** - Use `translate-unified.js --check` instead
2. **translate-fresh-openai.js** - Replaced by translate-unified.js
3. **simple-google-translate.js** - No longer used
4. **extract-strings.js**
   - Exports strings for manual translation
   - Can filter by language or missing only
   - Outputs CSV or JSON format

5. **test-translations.js**
   - Validates translation file syntax
   - Checks for common issues
   - Ensures all placeholders match

### Creating Custom Scripts

Example: Script to find unused strings

```javascript
// scripts/find-unused-strings.js
const fs = require('fs');
const path = require('path');
const { en } = require('../src/config/strings/en');

function findUnusedStrings() {
  const allKeys = extractKeys(en);
  const usedKeys = new Set();
  
  // Scan all component files
  scanDirectory('../src', (content, filepath) => {
    allKeys.forEach(key => {
      if (content.includes(key)) {
        usedKeys.add(key);
      }
    });
  });
  
  // Report unused
  const unused = allKeys.filter(key => !usedKeys.has(key));
  console.log(`Found ${unused.length} potentially unused strings:`);
  unused.forEach(key => console.log(`  - ${key}`));
}
```

## Adding New Languages

### Step 1: Create Language File

```typescript
// src/config/strings/translations/ja.ts
export const ja = {
  common: {
    buttons: {
      save: "保存",
      cancel: "キャンセル",
      delete: "削除"
    }
  }
  // ... translate all sections from en.ts
};
```

### Step 2: Add to Index

```typescript
// src/config/strings/index.ts
import { ja } from './translations/ja';

export const strings = {
  en,
  es,
  fr,
  de,
  it,
  ar,
  ko,
  ja // Add new language
} as const;

export type Language = keyof typeof strings;
```

### Step 3: Add to Language Selector

```typescript
// src/components/LanguageSelector.tsx
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  // ... other languages ...
  { code: 'ja', name: '日本語', flag: '🇯🇵' } // Add new
];
```

### Step 4: Consider Special Requirements

- **RTL Languages** (Arabic, Hebrew): Need layout adjustments
- **CJK Languages** (Chinese, Japanese, Korean): May need font adjustments
- **Long Translations** (German, Finnish): May break layouts

## Performance Considerations

### 1. Bundle Size

Each language adds ~50-100KB to bundle. Consider:
- Dynamic imports for languages
- Splitting rare languages into separate bundles

### 2. Initial Load

Current approach loads all strings at once. For large apps, consider:
- Loading only active language
- Lazy loading feature-specific strings

### 3. Translation Updates

When updating translations:
- Use version control to track changes
- Consider translation memory tools
- Implement staging environment for translation testing

## Migration Guide (For Existing Features)

### Step 1: Identify Hardcoded Strings

```bash
# Find potential hardcoded strings
grep -r "[\"\'].*[A-Z].*[\"\']" src/ | grep -v ".test" | grep -v "strings"
```

### Step 2: Extract to String File

```typescript
// Before:
<h1>Welcome to Doshi Sensei</h1>
<p>Start learning Japanese today!</p>

// After:
// 1. Add to en.ts:
landing: {
  title: "Welcome to Doshi Sensei",
  subtitle: "Start learning Japanese today!"
}

// 2. Update component:
const strings = useStrings();
<h1>{strings.landing.title}</h1>
<p>{strings.landing.subtitle}</p>
```

### Step 3: Test All Languages

```bash
# Test each language manually or create automated tests
npm test -- --testNamePattern="language"
```

## Summary Checklist

When adding new features:
- [ ] Add English strings to `en.ts` first
- [ ] Import `useStrings` from `@/contexts/LanguageContext`
- [ ] Use descriptive key names
- [ ] Group related strings logically
- [ ] Run translation scripts
- [ ] Test in at least 2 languages
- [ ] Check RTL layout if supporting Arabic
- [ ] Update this guide if adding new patterns

When editing existing features:
- [ ] Update English first
- [ ] Consider impact on other languages
- [ ] Re-run translation scripts if meaning changed
- [ ] Test all affected components
- [ ] Check for layout issues with longer translations

Remember: **Always start with English, maintain consistency, and test thoroughly!**