# AI Story Generation System

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Technical Implementation](#technical-implementation)
5. [API Endpoints](#api-endpoints)
6. [Security & Access Control](#security--access-control)
7. [Cost Management](#cost-management)
8. [Development Guide](#development-guide)
9. [Deployment Considerations](#deployment-considerations)
10. [Troubleshooting](#troubleshooting)
11. [Future Enhancements](#future-enhancements)

## Overview

The AI Story Generation System allows administrators to create educational Japanese stories using OpenAI's GPT-4 and DALL-E 3. Stories are generated with:
- Japanese text with furigana (ruby tags) via dedicated API
- English translations
- Consistent character illustrations using ID-based references
- Comprehension quizzes with stats integration
- JLPT-appropriate vocabulary and grammar
- Individual image regeneration with editable prompts

### Key Benefits
- **Educational Focus**: Stories tailored for language learners
- **Consistency**: Character descriptions maintained across pages
- **Safety**: Content filtering ensures age-appropriate material
- **Flexibility**: Support for various themes and difficulty levels

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Interface                           │
│  /admin/stories/generate - Story Generation UI                │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                    API Layer                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-story                           │    │
│  │ - Creates character sheets and story outlines       │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-character-model-sheet           │    │
│  │ - Creates visual reference for consistency          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-page-text                       │    │
│  │ - Generates text with furigana API                  │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-image-prompt                    │    │
│  │ - Creates detailed prompts from story text          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-page-image-consistent           │    │
│  │ - Generates images with character ID references     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/generate-story-quiz                      │    │
│  │ - Creates comprehension questions (JSON format)      │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ /api/admin/regenerate-story-image                   │    │
│  │ - Regenerates individual images with new prompts    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                 External Services & APIs                      │
│  ┌─────────────────────┐ ┌─────────────────────────────┐    │
│  │ OpenAI GPT-4o-mini  │ │ DALL-E 3 Image Generation  │    │
│  └─────────────────────┘ └─────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Furigana API - Ruby tag generation                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Story Configuration** → Admin selects theme, JLPT level, page count
2. **Character Generation** → GPT-4 creates consistent character descriptions
3. **Character Model Sheet** → Visual reference generated with unique character ID
4. **Outline Creation** → Story structure planned with page summaries
5. **Page Text Generation** → Japanese text (without ruby tags) and English translations
6. **Furigana Processing** → Ruby tags added via dedicated API (same as articles)
7. **Image Prompt Generation** → Detailed prompts created from actual story text
8. **Image Generation** → DALL-E 3 creates illustrations with character ID references
9. **Quiz Creation** → Comprehension questions generated with JSON validation
10. **Review & Publish** → Admin reviews all content including quiz questions
11. **Individual Regeneration** → Any image can be regenerated with edited prompts

## Features

### Content Generation
- **Themes**: Adventure, School Life, Traditional Culture, Modern Life, Fantasy, etc.
- **JLPT Levels**: N5 (beginner) through N1 (advanced)
- **Page Count**: 1-10 pages per story
- **Character Consistency**: Reusable character sheets for series

### Safety Features
- Content filtering for inappropriate material
- Age-appropriate story generation
- Cultural sensitivity checks
- No violence, politics, or controversial topics

### Educational Features
- Vocabulary appropriate to JLPT level
- Grammar complexity matching learner level
- Furigana (reading hints) for all kanji
- Natural language patterns for real-world usage

## Technical Implementation

### File Structure
```
src/
├── app/
│   ├── admin/stories/generate/
│   │   └── page.tsx              # AI generation UI
│   └── api/admin/
│       ├── generate-story/
│       │   └── route.ts          # Character & outline generation
│       ├── generate-story-page/
│       │   └── route.ts          # Page text & image generation
│       └── generate-story-quiz/
│           └── route.ts          # Quiz question generation
├── types/
│   └── ai-story.ts               # TypeScript interfaces
└── config/strings/
    └── en.ts                     # UI strings (i18n ready)
```

### Key Types

```typescript
interface AICharacterSheet {
  mainCharacter: {
    name: string;
    nameJa: string;        // Japanese with furigana
    description: string;   // Personality/role
    visualDescription: string; // For DALL-E
  };
  supportingCharacters: Array<{...}>;
  setting: {
    location: string;
    time: string;
    atmosphere: string;
  };
  visualStyle: string;     // Art style for consistency
  saveForReuse?: boolean;  // Flag for character library
}

interface AIStoryDraft {
  id: string;
  title: string;
  titleJa: string;
  description: string;
  theme: string;
  jlptLevel: JLPTLevel;
  characterSheet: AICharacterSheet;
  outline: AIStoryOutline[];
  pages: StoryPage[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    openAiModel: string;
    isAIGenerated: boolean;
  };
  status: 'generating' | 'draft' | 'review' | 'published';
}
```

## API Endpoints

### 1. Generate Story Structure
**POST** `/api/admin/generate-story`

```javascript
// Request
{
  theme: "School Life",
  jlptLevel: "N5",
  pages: 3,
  characterSheet?: {...} // Optional: reuse existing characters
}

// Response
{
  success: true,
  characterSheet: {...},
  outline: [
    {
      pageNumber: 1,
      summary: "Introduction to the school",
      imagePrompt: "Japanese elementary school entrance..."
    }
  ],
  metadata: {...}
}
```

### 2. Generate Story Page
**POST** `/api/admin/generate-story-page`

```javascript
// Request
{
  pageNumber: 1,
  pageSummary: "Introduction to the school",
  imagePrompt: "Japanese elementary school...",
  previousPages: [...], // For story continuity
  characterSheet: {...},
  theme: "School Life",
  jlptLevel: "N5",
  regenerateText?: true,
  regenerateImage?: true
}

// Response
{
  success: true,
  page: {
    pageNumber: 1,
    text: "<ruby>学校<rt>がっこう</rt></ruby>に...",
    translation: "At school...",
    imageUrl: "https://dalle-url...",
    imageAlt: "School entrance scene"
  }
}
```

### 3. Generate Quiz
**POST** `/api/admin/generate-story-quiz`

```javascript
// Request
{
  storyTitle: "First Day at School",
  storyPages: [...],
  jlptLevel: "N5",
  questionCount: 5
}

// Response
{
  success: true,
  quiz: [
    {
      id: "q1",
      question: "What did Yuki find at school?",
      options: ["A cat", "A book", "A friend", "A toy"],
      correctIndex: 2,
      explanation: "Yuki made a new friend named Kenji"
    }
  ]
}
```

### 4. Regenerate Individual Image
**POST** `/api/admin/regenerate-story-image`

```javascript
// Request
{
  pageNumber: 2,
  imagePrompt: "Aiko exploring the magical forest with the glowing map",
  characterName: "Aiko",
  characterDescription: "young girl with black hair",
  visualStyle: "anime illustration style",
  modelSheetUrl: "https://...",
  characterId: "aiko-1737400123456",
  sessionId: "1737400123457"
}

// Response
{
  success: true,
  imageUrl: "https://dalle-url...",
  revisedPrompt: "...",
  originalPrompt: "...",
  finalPrompt: "[CONTINUE CHARACTER aiko-1737400123456] ..."
}
```

## Security & Access Control

### Authentication Flow
```typescript
// All API routes use withFirebaseAdmin wrapper
export const POST = withFirebaseAdmin(async (request: NextRequest) => {
  const admin = (request as any).firebaseAdmin;
  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(token);
  
  // Admin check
  const isAdmin = decodedToken.admin === true || 
                  decodedToken.email === 'admin@example.com';
  
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... continue with generation
});
```

### Environment Variables
```bash
# Required in .env
OPEN_AI_API_KEY=sk-proj-...

# Firebase Admin (auto-configured)
FIREBASE_ADMIN_PRIVATE_KEY=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PROJECT_ID=...
```

## Cost Management

### API Usage Estimates
| Component | Model | Cost per 1K tokens | Typical Usage |
|-----------|-------|-------------------|---------------|
| Character Sheet | GPT-4 Turbo | $0.01 input / $0.03 output | ~500 tokens |
| Story Outline | GPT-4 Turbo | $0.01 input / $0.03 output | ~800 tokens |
| Page Text (each) | GPT-4 Turbo | $0.01 input / $0.03 output | ~1,000 tokens |
| Image (each) | DALL-E 3 | $0.040 per image | 1 per page |
| Quiz | GPT-4 Turbo | $0.01 input / $0.03 output | ~1,200 tokens |

### Cost per Story (Approximate)
- 3-page story: $0.50 - $1.00
- 5-page story: $1.00 - $2.00
- 10-page story: $2.00 - $4.00

### Cost Optimization Strategies
1. **Cache character sheets** for reuse across stories
2. **Batch page generation** to reduce API calls
3. **Use GPT-3.5 for drafts**, GPT-4 for final
4. **Implement rate limiting** to prevent abuse
5. **Monitor usage** via OpenAI dashboard

## Development Guide

### Adding New Features

#### 1. Adding New Themes
```typescript
// src/types/story.ts
export const STORY_THEMES = [
  'Adventure',
  'School Life',
  'Traditional Culture',
  'Modern Life',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Slice of Life',
  'Historical',
  'Comedy',
  'Sports',        // Add new theme
  'Cooking'        // Add new theme
] as const;
```

#### 2. Customizing Generation Prompts
```typescript
// Modify content guidelines
const CONTENT_GUIDELINES = `
IMPORTANT CONTENT GUIDELINES:
- NO sexual content or innuendo
- NO violence or graphic descriptions
- NO racial, gender, or cultural stereotypes
- NO political or controversial topics
- NO religious content
- Focus on educational, wholesome content
- Include cultural learning opportunities  // Add custom guideline
- Emphasize environmental awareness      // Add custom guideline
`;
```

#### 3. Adding Character Persistence
```typescript
// Implement character library
interface SavedCharacterSheet {
  id: string;
  name: string;
  characterSheet: AICharacterSheet;
  usedInStories: string[];
  createdAt: Date;
  tags?: string[];
}

// Add to Firestore
const saveCharacterSheet = async (sheet: AICharacterSheet) => {
  const docRef = await addDoc(collection(db, 'characterSheets'), {
    ...sheet,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};
```

#### 4. Implementing Story Templates
```typescript
interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  theme: string;
  plotPoints: string[];
  characterArchetypes: string[];
  defaultPageCount: number;
}

// Use templates for consistent story structures
const templates: StoryTemplate[] = [
  {
    id: 'hero-journey',
    name: 'Hero\'s Journey',
    description: 'Classic adventure structure',
    theme: 'Adventure',
    plotPoints: ['Call to adventure', 'Meeting mentor', 'Challenges', 'Victory'],
    characterArchetypes: ['Hero', 'Mentor', 'Ally', 'Challenge'],
    defaultPageCount: 5
  }
];
```

### Testing AI Generation

```typescript
// Mock OpenAI for testing
const mockOpenAI = {
  chat: {
    completions: {
      create: async (params: any) => ({
        choices: [{
          message: {
            content: JSON.stringify({
              mainCharacter: {
                name: "Test Character",
                nameJa: "<ruby>テスト<rt>てすと</rt></ruby>",
                description: "Test description",
                visualDescription: "Test visual"
              },
              // ... rest of mock data
            })
          }
        }]
      })
    }
  }
};
```

## Deployment Considerations

### Environment Setup
1. **Development**: Use `.env.local` for API keys
2. **Staging**: Separate OpenAI account with lower rate limits
3. **Production**: 
   - Dedicated OpenAI account
   - Environment variables in hosting platform
   - Rate limiting implementation
   - Cost monitoring alerts

### Performance Optimization
```typescript
// Implement caching for generated content
const cacheKey = `story-${theme}-${jlptLevel}-${pages}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;

// Generate new content
const result = await generateStory(...);
await redis.set(cacheKey, result, 'EX', 3600); // 1 hour cache
```

### Monitoring
```typescript
// Log generation metrics
const logGeneration = async (storyId: string, metrics: {
  tokensUsed: number,
  cost: number,
  generationTime: number,
  errors?: string[]
}) => {
  await addDoc(collection(db, 'aiGenerationLogs'), {
    storyId,
    ...metrics,
    timestamp: serverTimestamp()
  });
};
```

## Recent Improvements (January 2025)

### Character Consistency System
- **Character IDs**: Each character gets a unique ID (e.g., `kaito-1737400123456`)
- **Model Sheets**: Visual reference generated before story pages
- **ID References**: All prompts include character ID for consistency
- **Simplified Prompts**: Direct format that works better with DALL-E 3

### Furigana Integration
- **No GPT Ruby Tags**: Removed unreliable ruby tag generation from prompts
- **API Post-Processing**: Same furigana API used by articles
- **Consistent Results**: Accurate furigana across all stories

### Quiz System Improvements
- **JSON Validation**: Added `response_format: { type: "json_object" }`
- **Structured Output**: Enforced consistent quiz question format
- **Stats Integration**: Quiz results tracked via `trackStoryQuizCompleted()`
- **Display in Review**: Quiz questions shown before publishing

### UI Enhancements
- **Theme-Aware Components**: All modals respect light/dark theme
- **Image Regeneration**: Hover buttons to regenerate any image
- **Editable Prompts**: Modal allows prompt editing before regeneration
- **Character Info Display**: Shows character ID and consistency status

## Troubleshooting

### Common Issues

#### 1. OpenAI API Key Issues
```bash
# Check if key is loaded
console.log('API Key exists:', !!process.env.OPEN_AI_API_KEY);

# Verify key format (should start with sk-)
console.log('Key prefix:', process.env.OPEN_AI_API_KEY?.substring(0, 3));
```

#### 2. Generation Failures
```typescript
// Add retry logic
const retryGeneration = async (fn: Function, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

#### 3. Image Generation Issues
- DALL-E may reject prompts with people's names
- Simplify visual descriptions
- Avoid specific cultural references that might be misinterpreted

### Debug Mode
```typescript
// Enable detailed logging
const DEBUG_AI_GENERATION = process.env.NODE_ENV === 'development';

if (DEBUG_AI_GENERATION) {
  console.log('Prompt sent:', prompt);
  console.log('Response received:', response);
  console.log('Tokens used:', response.usage);
}
```

## Future Enhancements

### 1. Advanced Features
- **Story Series**: Link multiple stories with same characters
- **Branching Narratives**: Choose-your-own-adventure format
- **Audio Narration**: Generate with OpenAI TTS
- **Collaborative Stories**: Multiple admins contribute
- **Story Analytics**: Track which stories are most popular

### 2. Educational Enhancements
- **Grammar Highlighting**: Automatic grammar pattern detection
- **Vocabulary Lists**: Export key words for study
- **Cultural Notes**: Inline explanations of cultural elements
- **Pronunciation Guide**: Audio for difficult words
- **Progress Tracking**: Monitor learner comprehension

### 3. Content Management
```typescript
// Story versioning system
interface StoryVersion {
  id: string;
  storyId: string;
  version: number;
  changes: string[];
  editedBy: string;
  editedAt: Date;
  content: Story;
}

// Story approval workflow
interface StoryApproval {
  storyId: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
}
```

### 4. Integration Ideas
- **Anki Export**: Generate flashcards from story vocabulary
- **Reading Progress API**: Track where users struggle
- **Community Translations**: Allow users to contribute translations
- **Story Recommendations**: ML-based story suggestions
- **Voice Recording**: Users record themselves reading

### 5. Optimization Opportunities
```typescript
// Parallel generation for faster results
const generatePagesParallel = async (outline: StoryOutline[]) => {
  const pagePromises = outline.map((page, index) => 
    generateStoryPage({
      pageNumber: index + 1,
      pageSummary: page.summary,
      imagePrompt: page.imagePrompt,
      // ... other params
    })
  );
  
  return Promise.all(pagePromises);
};

// Background job processing
const queueStoryGeneration = async (params: GenerateStoryParams) => {
  const jobId = await jobQueue.add('generate-story', params);
  return { jobId, status: 'queued' };
};
```

## Conclusion

The AI Story Generation system provides a powerful tool for creating educational Japanese content. By following the patterns established here and considering the enhancement opportunities, developers can extend the system to meet evolving educational needs while maintaining quality and safety standards.

### Key Takeaways
1. **Modular Design**: Each generation step is independent
2. **Safety First**: Content filtering at every stage
3. **Educational Focus**: JLPT-appropriate content generation
4. **Cost Awareness**: Monitor and optimize API usage
5. **Extensibility**: Clear patterns for adding features

For questions or contributions, please refer to the main project documentation or submit a pull request with proposed enhancements.