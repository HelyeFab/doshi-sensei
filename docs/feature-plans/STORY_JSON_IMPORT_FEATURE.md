# Story JSON Import Feature

## Overview

This feature allows administrators to import pre-written stories from JSON files into the Doshi Sensei story creation system. Stories can be written offline, divided into pages, and then imported into the platform. After import, administrators can optionally add images to any or all pages.

## JSON Structure

### Required Fields

```json
{
  "title": "string",           // English title of the story
  "titleJa": "string",         // Japanese title with ruby tags for furigana
  "jlptLevel": "N5",           // One of: N5, N4, N3, N2, N1
  "theme": "string",           // One of the predefined themes
  "pages": [                   // Array of story pages (minimum 1, maximum 20)
    {
      "pageNumber": 1,         // Sequential page number
      "text": "string",        // Japanese text with ruby tags
      "translation": "string", // English translation
      "imageAlt": "string"     // Optional: Alt text for future image
    }
  ]
}
```

### Optional Fields

```json
{
  "description": "string",     // Brief story description
  "tags": ["string"],          // Array of predefined tags
  "quiz": [                    // Array of quiz questions (maximum 10)
    {
      "question": "string",
      "options": ["string"],   // Exactly 4 options
      "correctIndex": 0,       // Index 0-3 of correct answer
      "explanation": "string"  // Optional explanation
    }
  ],
  "seoTitle": "string",        // Custom SEO title
  "seoDescription": "string"   // Custom SEO description
}
```

### Ruby Tag Format for Furigana

Japanese text should use HTML ruby tags for furigana readings:
```html
<ruby>漢字<rt>かんじ</rt></ruby>
```

### Example Complete JSON

```json
{
  "title": "The Kind Neighbor",
  "titleJa": "<ruby>優<rt>やさ</rt></ruby>しい<ruby>隣人<rt>りんじん</rt></ruby>",
  "description": "A heartwarming story about helping neighbors",
  "jlptLevel": "N5",
  "theme": "Slice of Life",
  "tags": ["Beginner Friendly", "Daily Life"],
  "pages": [
    {
      "pageNumber": 1,
      "text": "<ruby>田中<rt>たなか</rt></ruby>さんは<ruby>新<rt>あたら</rt></ruby>しいアパートに<ruby>引<rt>ひ</rt></ruby>っ<ruby>越<rt>こ</rt></ruby>しました。",
      "translation": "Mr. Tanaka moved to a new apartment.",
      "imageAlt": "A man carrying boxes into an apartment building"
    },
    {
      "pageNumber": 2,
      "text": "<ruby>隣<rt>となり</rt></ruby>の<ruby>部屋<rt>へや</rt></ruby>から<ruby>優<rt>やさ</rt></ruby>しい<ruby>声<rt>こえ</rt></ruby>が<ruby>聞<rt>き</rt></ruby>こえました。",
      "translation": "A kind voice could be heard from the next room.",
      "imageAlt": "A friendly elderly woman at her doorway"
    }
  ],
  "quiz": [
    {
      "question": "Where did Mr. Tanaka move to?",
      "options": [
        "A new house",
        "A new apartment",
        "A hotel",
        "His parents' home"
      ],
      "correctIndex": 1,
      "explanation": "The text mentions 新しいアパート (new apartment)"
    }
  ]
}
```

## Implementation Plan

### Phase 1: JSON Import UI (Current)
1. ✅ Create JSON validator utility (`storyJsonValidator.ts`)
2. ✅ Add file input controls to story creation page
3. ⏳ Implement JSON file parsing and validation
4. ⏳ Display validation errors and warnings
5. ⏳ Import validated data into form fields

### Phase 2: Image Management
1. ⏳ Add image upload section for each imported page
2. ⏳ Create visual page manager showing text + image status
3. ⏳ Implement drag-and-drop image upload
4. ⏳ Add image preview and removal functionality

### Phase 3: Enhanced Features
1. ⏳ Add JSON export functionality for existing stories
2. ⏳ Create batch import for multiple stories
3. ⏳ Add JSON validation CLI tool
4. ⏳ Implement story preview before final save

## User Workflow

1. **Prepare JSON File**: Author writes story offline using the provided template
2. **Import JSON**: Click "Import from JSON" button on story creation page
3. **Validation**: System validates JSON and shows any errors/warnings
4. **Review Content**: Imported content populates all form fields
5. **Add Images**: Optionally upload images for each page
6. **Preview**: Review the complete story with images
7. **Publish**: Save as draft or publish immediately

## Validation Rules

### Errors (Prevent Import)
- Missing required fields (title, titleJa, jlptLevel, theme, pages)
- Invalid JLPT level or theme values
- Empty pages array or more than 20 pages
- Missing page text or translation
- Invalid quiz format (wrong number of options, invalid correctIndex)
- More than 10 quiz questions

### Warnings (Allow Import)
- Missing ruby tags in Japanese text
- Page numbers not sequential (auto-corrected)
- Tags not in predefined list
- Missing optional fields

## Benefits

1. **Efficiency**: Bulk content creation offline
2. **Flexibility**: Add images when available, not required upfront
3. **Quality Control**: Validation ensures consistent content structure
4. **Reusability**: Template can be shared with content creators
5. **Version Control**: JSON files can be tracked in git

## Technical Implementation

### File Upload Component
```typescript
const handleJsonImport = async (file: File) => {
  // Parse JSON file
  const { data, error } = await parseStoryJson(file);
  
  // Validate structure
  const validation = validateStoryJson(data);
  
  // Import if valid
  if (validation.isValid) {
    importStoryData(validation.data);
  }
};
```

### Image Management State
```typescript
interface PageImageState {
  pageNumber: number;
  imageUrl?: string;
  uploadProgress?: number;
  error?: string;
}
```

## Future Enhancements

1. **AI Integration**: Generate images from imageAlt descriptions
2. **Translation Helpers**: Auto-generate translations or furigana
3. **Template Library**: Pre-made story templates by level/theme
4. **Collaborative Editing**: Multiple authors working on stories
5. **Version History**: Track changes to imported stories