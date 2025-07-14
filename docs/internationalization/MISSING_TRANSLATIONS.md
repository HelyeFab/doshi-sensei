# Missing Translations

This document tracks missing translations and translation issues in the Doshi Sensei internationalization system.

## Current Status

### Translation Coverage

- **English (en)**: Base language - 100% complete
- **Spanish (es)**: 100% complete
- **French (fr)**: 100% complete
- **German (de)**: 100% complete
- **Italian (it)**: 100% complete
- **Arabic (ar)**: 100% complete
- **Korean (ko)**: 100% complete

### Known Issues

#### 1. RTL Support for Arabic

- **Issue**: Arabic text may not display correctly in RTL layout
- **Status**: Needs testing and potential CSS adjustments
- **Priority**: Medium

#### 2. Long Text Overflow

- **Issue**: German translations are longer than English and may cause layout issues
- **Status**: Needs responsive design testing
- **Priority**: Low

#### 3. Special Characters

- **Issue**: Some special characters may not render correctly in all fonts
- **Status**: Needs font testing across languages
- **Priority**: Low

## Missing Translations

### Homepage (/)

#### Stats Bar

- **Issue**: Stats bar elements are not translated
- **UI Element**: Statistics display bar
- **Context**: Shows user progress/statistics on the main homepage
- **Priority**: High (visible on main page)
- **Status**: Needs translation keys added to string files

### Navigation Menus (Mobile & Desktop)

#### Moodboards Menu Item

- **Issue**: "Moodboards" menu item is not translated
- **UI Element**: Navigation menu item
- **Context**: Appears in both mobile and desktop navigation menus
- **Priority**: High (visible in main navigation)
- **Status**: Needs translation key added to string files
- **Languages Needed**: All supported languages (es, fr, de, it, ar, ko)

### Practice Page (/practice/)

#### Page Content

- **Issue**: Practice page content is not translated
- **UI Element**: Page content and navigation
- **Context**: Main practice page for language learning exercises
- **Priority**: High (core learning feature)
- **Status**: Needs translation keys added to string files
- **Languages Needed**: All supported languages (es, fr, de, it, ar, ko)

### Drill Page (/drill/)

#### Page Content

- **Issue**: Drill page content is not translated
- **UI Element**: Page content and navigation
- **Context**: Main drill page for focused language practice exercises
- **Priority**: High (core learning feature)
- **Status**: Needs translation keys added to string files
- **Languages Needed**: All supported languages (es, fr, de, it, ar, ko)

### Vocabulary Page (/vocabulary/)

#### Page Content

- **Issue**: Vocabulary page content is not translated
- **UI Element**: Page content and navigation
- **Context**: Main vocabulary page for word learning and management
- **Priority**: High (core learning feature)
- **Status**: Needs translation keys added to string files
- **Languages Needed**: All supported languages (es, fr, de, it, ar, ko)

### Kanji Browser Page (/kanji-browser/)

#### Page Title Translation

- **Issue**: Page title shows "Browser di kanji" instead of "Kanji Browser"
- **UI Element**: Page title and navigation
- **Context**: Kanji browsing and study page
- **Priority**: High (visible in navigation and page header)
- **Status**: Needs correction in translation files
- **Languages Needed**: All supported languages (es, fr, de, it, ar, ko)
- **Note**: Should be "Kanji Browser" in all languages, not "Browser di kanji"

## Translation Scripts

### Check Missing Translations

```bash
node scripts/translate-unified.js --check
```

### Translate Specific Language

```bash
node scripts/translate-unified.js fr
```

### Translate All Languages

```bash
node scripts/translate-unified.js all
```

### Force Re-translate

```bash
node scripts/translate-unified.js it --force
```

## File Structure

```
src/config/strings/
├── en.ts                    # English (base)
└── translations/
    ├── es.ts               # Spanish
    ├── fr.ts               # French
    ├── de.ts               # German
    ├── it.ts               # Italian
    ├── ar.ts               # Arabic
    └── ko.ts               # Korean
```

## Translation Process

1. Add new strings to `en.ts` first
2. Run translation script to update other languages
3. Review and test translations
4. Commit changes

## Quality Assurance

- All translations use OpenAI GPT-4o-mini
- Technical terms are preserved (not translated)
- Context is maintained across languages
- Regular quality checks are performed

## Maintenance

- Check for missing translations weekly
- Update this document when new issues are found
- Test new features in all supported languages
- Monitor translation quality and user feedback
