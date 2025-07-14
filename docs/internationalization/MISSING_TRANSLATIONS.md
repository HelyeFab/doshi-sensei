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
