# i18n Quick Reference Guide

## Adding a New Feature - Step by Step

### 1️⃣ Add English strings first
```typescript
// src/config/strings/en.ts
myFeature: {
  title: "My Feature",
  description: "Feature description"
}
```

### 2️⃣ Use in component
```typescript
import { useStrings } from "@/contexts/LanguageContext";

const strings = useStrings();
<h1>{strings.myFeature.title}</h1>
```

### 3️⃣ Run translations
```bash
node scripts/translate-unified.js --check    # Check coverage
node scripts/translate-unified.js all        # Translate all languages
```

## String Organization

```
common/           # Shared across app (buttons, messages)
├── buttons/     # save, cancel, delete, etc.
├── messages/    # loading, error, success
└── labels/      # form labels

pages/           # Page-specific strings
├── homePage/
├── settings/
└── admin/

features/        # Feature-specific strings  
├── games/
├── drill/
└── vocabulary/

components/      # Reusable component strings
├── modals/
├── navigation/
└── forms/
```

## Common Patterns

### Dynamic Content
```typescript
// String with placeholder
welcome: "Welcome, {{name}}!"

// Usage
strings.welcome.replace('{{name}}', userName)
```

### Pluralization
```typescript
// Strings
itemCount: "{{count}} item"
itemCountPlural: "{{count}} items"

// Usage
count === 1 ? strings.itemCount : strings.itemCountPlural
```

### Conditional Text
```typescript
status: {
  online: "Online",
  offline: "Offline"
}

// Usage
strings.status[isOnline ? 'online' : 'offline']
```

## Do's and Don'ts

### ✅ DO
- Start with English (en.ts)
- Use descriptive key names
- Group related strings
- Test in multiple languages
- Use placeholders for dynamic content

### ❌ DON'T
- Hardcode text in components
- Concatenate strings to form sentences
- Put HTML in strings
- Forget to run translations
- Use deeply nested structures (>4 levels)

## Scripts Cheatsheet

```bash
# Check what needs translation
node scripts/translate-unified.js --check

# Translate specific language
node scripts/translate-unified.js fr

# Translate all languages
node scripts/translate-unified.js all

# Force re-translate for quality
node scripts/translate-unified.js it --force

# Test all translations
node scripts/test-translations.js

# Extract strings for manual translation
node scripts/extract-strings.js --language es --missing-only
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Strings not updating | Hard refresh (Ctrl+Shift+R), check imports from `@/contexts/LanguageContext` |
| TypeScript errors | Restart TS server, ensure strings added to en.ts first |
| Missing translations | Run coverage check, use translation scripts |
| Special characters broken | Check UTF-8 encoding, font support |
| Layout issues with translations | Test with longer languages (German), consider responsive design |

## File Locations

- **English strings**: `/src/config/strings/en.ts`
- **Other languages**: `/src/config/strings/translations/[lang].ts`
- **Language Context**: `/src/contexts/LanguageContext.tsx`
- **Main Script**: `/scripts/translate-unified.js`
- **This guide**: `/docs/internationalization/`

## Emergency Fixes

### String not showing?
```typescript
// Quick debug
console.log(strings.myFeature); // Check if section exists
console.log(currentLanguage);    // Check active language
```

### Force English fallback
```typescript
const text = strings.myFeature?.title || en.myFeature.title || "Fallback Text";
```

### Find where string is used
```bash
grep -r "myFeature.title" src/
```