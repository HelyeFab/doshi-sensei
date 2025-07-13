# AI Story Generation - Implementation Guide

## Quick Start

### Prerequisites
1. Admin access to Doshi Sensei
2. OpenAI API key with GPT-4 and DALL-E 3 access
3. Environment variable: `OPEN_AI_API_KEY=sk-proj-...`

### Generating Your First Story

1. **Navigate to Admin Dashboard**
   ```
   https://your-domain.com/admin
   ```

2. **Access Story Management**
   - Click "Stories" in the sidebar
   - Click the "✨ Generate with AI" button

3. **Configure Story Parameters**
   - **Theme**: Select from dropdown (e.g., "School Life")
   - **JLPT Level**: Choose difficulty (N5 = easiest)
   - **Pages**: Use slider (start with 3 pages)

4. **Generate and Review**
   - Click "Generate Story"
   - Watch real-time progress
   - Review generated content
   - Click "Publish Story" when satisfied

## Code Examples

### Using the Story Generation API

```typescript
// Example: Generate a custom story programmatically
async function generateCustomStory() {
  const token = await auth.currentUser?.getIdToken();
  
  // Step 1: Generate structure
  const structureResponse = await fetch('/api/admin/generate-story', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      theme: 'Traditional Culture',
      jlptLevel: 'N4',
      pages: 5
    })
  });
  
  const { characterSheet, outline } = await structureResponse.json();
  
  // Step 2: Generate pages
  const pages = [];
  for (let i = 0; i < outline.length; i++) {
    const pageResponse = await fetch('/api/admin/generate-story-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pageNumber: i + 1,
        pageSummary: outline[i].summary,
        imagePrompt: outline[i].imagePrompt,
        previousPages: pages,
        characterSheet,
        theme: 'Traditional Culture',
        jlptLevel: 'N4'
      })
    });
    
    const { page } = await pageResponse.json();
    pages.push(page);
  }
  
  // Step 3: Generate quiz
  const quizResponse = await fetch('/api/admin/generate-story-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      storyTitle: 'Tea Ceremony Adventure',
      storyPages: pages,
      jlptLevel: 'N4',
      questionCount: 5
    })
  });
  
  const { quiz } = await quizResponse.json();
  
  return { characterSheet, pages, quiz };
}
```

### Extending the Generation System

#### Adding Custom Themes

```typescript
// 1. Update story types
// src/types/story.ts
export const STORY_THEMES = [
  // ... existing themes
  'Mythology',      // Add new theme
  'Technology',     // Add new theme
  'Environment'     // Add new theme
] as const;

// 2. Add theme-specific guidelines
// src/app/api/admin/generate-story/route.ts
const THEME_GUIDELINES: Record<string, string> = {
  'Mythology': 'Include Japanese folklore elements like yokai, kami, or legendary heroes. Make it educational about Japanese mythology.',
  'Technology': 'Feature modern technology in daily Japanese life. Include vocabulary about gadgets, apps, and digital culture.',
  'Environment': 'Focus on nature, conservation, and Japanese environmental practices. Include eco-friendly vocabulary.'
};

// 3. Use in generation prompt
const themeGuideline = THEME_GUIDELINES[theme] || '';
const characterPrompt = `
Create a character sheet for a Japanese story with the theme: ${theme}
${themeGuideline}
${CONTENT_GUIDELINES}
...
`;
```

#### Implementing Story Templates

```typescript
// src/utils/storyTemplates.ts
export interface StoryTemplate {
  id: string;
  name: string;
  theme: string;
  structure: {
    introduction: string;
    development: string[];
    climax: string;
    resolution: string;
  };
  characterTypes: string[];
  vocabularyFocus: string[];
}

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'first-day-school',
    name: 'First Day at School',
    theme: 'School Life',
    structure: {
      introduction: 'New student arrives at school feeling nervous',
      development: [
        'Meeting the teacher and classmates',
        'Finding their desk and unpacking',
        'First lesson experience'
      ],
      climax: 'Making a first friend during lunch',
      resolution: 'Going home happy about the new school'
    },
    characterTypes: ['New Student', 'Kind Teacher', 'Friendly Classmate'],
    vocabularyFocus: ['School supplies', 'Classroom objects', 'Basic greetings']
  },
  {
    id: 'festival-adventure',
    name: 'Festival Adventure',
    theme: 'Traditional Culture',
    structure: {
      introduction: 'Family prepares to visit local festival',
      development: [
        'Putting on yukata/traditional clothes',
        'Walking through festival stalls',
        'Playing traditional games'
      ],
      climax: 'Watching fireworks with new friends',
      resolution: 'Returning home with happy memories'
    },
    characterTypes: ['Child Protagonist', 'Parents', 'Festival Vendor', 'New Friend'],
    vocabularyFocus: ['Festival items', 'Traditional clothing', 'Food names', 'Games']
  }
];

// Using templates in generation
export function applyTemplate(template: StoryTemplate, pageCount: number): AIStoryOutline[] {
  const outline: AIStoryOutline[] = [];
  const structureElements = [
    template.structure.introduction,
    ...template.structure.development,
    template.structure.climax,
    template.structure.resolution
  ];
  
  // Distribute structure across requested pages
  const elementsPerPage = Math.ceil(structureElements.length / pageCount);
  
  for (let i = 0; i < pageCount; i++) {
    const pageElements = structureElements.slice(
      i * elementsPerPage,
      (i + 1) * elementsPerPage
    );
    
    outline.push({
      pageNumber: i + 1,
      summary: pageElements.join(' '),
      imagePrompt: `Illustration showing: ${pageElements[0]}. Style: ${template.theme}`
    });
  }
  
  return outline;
}
```

#### Adding Regeneration Capabilities

```typescript
// Component for regenerating specific pages
export function PageRegenerator({ 
  page, 
  pageIndex, 
  characterSheet,
  theme,
  jlptLevel,
  onRegenerate 
}: PageRegeneratorProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateOptions, setRegenerateOptions] = useState({
    text: true,
    image: true
  });
  
  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const response = await fetch('/api/admin/generate-story-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          pageNumber: pageIndex + 1,
          pageSummary: page.summary,
          imagePrompt: page.imagePrompt,
          characterSheet,
          theme,
          jlptLevel,
          regenerateText: regenerateOptions.text,
          regenerateImage: regenerateOptions.image
        })
      });
      
      const { page: newPage } = await response.json();
      onRegenerate(pageIndex, newPage);
    } catch (error) {
      console.error('Regeneration failed:', error);
    } finally {
      setRegenerating(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={regenerateOptions.text}
          onChange={(e) => setRegenerateOptions(prev => ({
            ...prev,
            text: e.target.checked
          }))}
        />
        Regenerate Text
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={regenerateOptions.image}
          onChange={(e) => setRegenerateOptions(prev => ({
            ...prev,
            image: e.target.checked
          }))}
        />
        Regenerate Image
      </label>
      <button
        onClick={handleRegenerate}
        disabled={regenerating || (!regenerateOptions.text && !regenerateOptions.image)}
        className="px-3 py-1 bg-primary text-primary-foreground rounded disabled:opacity-50"
      >
        {regenerating ? 'Regenerating...' : 'Regenerate'}
      </button>
    </div>
  );
}
```

### Monitoring and Analytics

```typescript
// src/utils/aiStoryAnalytics.ts
interface GenerationMetrics {
  storyId: string;
  generationTime: number;
  tokensUsed: {
    characterSheet: number;
    outline: number;
    pages: number[];
    quiz: number;
    total: number;
  };
  costs: {
    gpt4: number;
    dalle: number;
    total: number;
  };
  errors: string[];
  retries: number;
}

export class AIStoryAnalytics {
  private metrics: GenerationMetrics;
  
  constructor(storyId: string) {
    this.metrics = {
      storyId,
      generationTime: Date.now(),
      tokensUsed: {
        characterSheet: 0,
        outline: 0,
        pages: [],
        quiz: 0,
        total: 0
      },
      costs: {
        gpt4: 0,
        dalle: 0,
        total: 0
      },
      errors: [],
      retries: 0
    };
  }
  
  logTokenUsage(component: string, tokens: number) {
    if (component === 'characterSheet') {
      this.metrics.tokensUsed.characterSheet = tokens;
    } else if (component === 'outline') {
      this.metrics.tokensUsed.outline = tokens;
    } else if (component.startsWith('page-')) {
      const pageIndex = parseInt(component.split('-')[1]);
      this.metrics.tokensUsed.pages[pageIndex] = tokens;
    } else if (component === 'quiz') {
      this.metrics.tokensUsed.quiz = tokens;
    }
    
    this.calculateTotalTokens();
    this.calculateCosts();
  }
  
  private calculateTotalTokens() {
    this.metrics.tokensUsed.total = 
      this.metrics.tokensUsed.characterSheet +
      this.metrics.tokensUsed.outline +
      this.metrics.tokensUsed.pages.reduce((a, b) => a + b, 0) +
      this.metrics.tokensUsed.quiz;
  }
  
  private calculateCosts() {
    // GPT-4 Turbo pricing (approximate)
    const gpt4CostPer1k = 0.01; // input
    const gpt4OutputCostPer1k = 0.03; // output
    
    // Estimate 30% input, 70% output
    const inputTokens = this.metrics.tokensUsed.total * 0.3;
    const outputTokens = this.metrics.tokensUsed.total * 0.7;
    
    this.metrics.costs.gpt4 = 
      (inputTokens / 1000 * gpt4CostPer1k) +
      (outputTokens / 1000 * gpt4OutputCostPer1k);
    
    // DALL-E 3 pricing
    const dalleCostPerImage = 0.04;
    this.metrics.costs.dalle = this.metrics.tokensUsed.pages.length * dalleCostPerImage;
    
    this.metrics.costs.total = this.metrics.costs.gpt4 + this.metrics.costs.dalle;
  }
  
  async saveMetrics() {
    const endTime = Date.now();
    this.metrics.generationTime = endTime - this.metrics.generationTime;
    
    // Save to Firestore
    await addDoc(collection(db, 'aiGenerationMetrics'), {
      ...this.metrics,
      timestamp: serverTimestamp()
    });
    
    // Log summary
    console.log('Story Generation Complete:', {
      storyId: this.metrics.storyId,
      timeSeconds: this.metrics.generationTime / 1000,
      totalTokens: this.metrics.tokensUsed.total,
      estimatedCost: `$${this.metrics.costs.total.toFixed(2)}`,
      errors: this.metrics.errors.length
    });
  }
}

// Usage in API routes
const analytics = new AIStoryAnalytics(storyId);

// After each API call
analytics.logTokenUsage('characterSheet', response.usage.total_tokens);

// At the end
await analytics.saveMetrics();
```

### Error Handling and Recovery

```typescript
// src/utils/aiStoryErrorHandler.ts
export class AIStoryErrorHandler {
  static async handleGenerationError(
    error: any,
    context: {
      stage: 'character' | 'outline' | 'page' | 'quiz';
      storyId: string;
      attemptNumber: number;
    }
  ) {
    console.error(`Error in ${context.stage} generation:`, error);
    
    // Categorize error
    const errorType = this.categorizeError(error);
    
    switch (errorType) {
      case 'rate_limit':
        // Wait and retry
        const waitTime = this.extractWaitTime(error) || 60000;
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return { retry: true, error: 'rate_limit' };
        
      case 'content_filter':
        // Modify prompt and retry
        console.log('Content filtered. Adjusting prompt...');
        return { 
          retry: true, 
          error: 'content_filter',
          suggestion: 'Adjust content guidelines' 
        };
        
      case 'invalid_api_key':
        // Critical error - stop
        return { 
          retry: false, 
          error: 'invalid_api_key',
          message: 'Please check your OpenAI API key configuration'
        };
        
      case 'timeout':
        // Retry with backoff
        if (context.attemptNumber < 3) {
          const backoff = Math.pow(2, context.attemptNumber) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoff));
          return { retry: true, error: 'timeout' };
        }
        return { retry: false, error: 'timeout_exceeded' };
        
      default:
        // Unknown error - log and possibly retry
        await this.logError(error, context);
        return { 
          retry: context.attemptNumber < 2, 
          error: 'unknown',
          details: error.message 
        };
    }
  }
  
  private static categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('rate limit')) return 'rate_limit';
    if (message.includes('content_filter')) return 'content_filter';
    if (message.includes('api key')) return 'invalid_api_key';
    if (message.includes('timeout')) return 'timeout';
    if (error.code === 'ECONNREFUSED') return 'connection_refused';
    
    return 'unknown';
  }
  
  private static extractWaitTime(error: any): number | null {
    // Try to extract wait time from rate limit error
    const match = error.message?.match(/try again in (\d+)s/);
    return match ? parseInt(match[1]) * 1000 : null;
  }
  
  private static async logError(error: any, context: any) {
    try {
      await addDoc(collection(db, 'aiGenerationErrors'), {
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        },
        context,
        timestamp: serverTimestamp()
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}

// Usage in generation functions
const generateWithRetry = async (generateFn: Function, context: any) => {
  let attemptNumber = 0;
  const maxAttempts = 3;
  
  while (attemptNumber < maxAttempts) {
    try {
      return await generateFn();
    } catch (error) {
      attemptNumber++;
      const { retry, error: errorType, suggestion } = 
        await AIStoryErrorHandler.handleGenerationError(error, {
          ...context,
          attemptNumber
        });
      
      if (!retry) {
        throw new Error(`Generation failed: ${errorType}`);
      }
      
      if (suggestion === 'Adjust content guidelines') {
        // Modify the generation function parameters
        generateFn = () => generateFn({ saferContent: true });
      }
    }
  }
  
  throw new Error('Max retry attempts exceeded');
};
```

## Testing and Quality Assurance

### Unit Tests

```typescript
// __tests__/aiStoryGeneration.test.ts
import { generateCharacterSheet, generateOutline } from '@/utils/aiStoryGeneration';

describe('AI Story Generation', () => {
  it('should generate valid character sheet', async () => {
    const characterSheet = await generateCharacterSheet({
      theme: 'School Life',
      jlptLevel: 'N5'
    });
    
    expect(characterSheet).toHaveProperty('mainCharacter');
    expect(characterSheet.mainCharacter).toHaveProperty('name');
    expect(characterSheet.mainCharacter).toHaveProperty('nameJa');
    expect(characterSheet.mainCharacter.nameJa).toMatch(/<ruby>/);
  });
  
  it('should respect JLPT level in vocabulary', async () => {
    const n5Story = await generateStoryPage({
      jlptLevel: 'N5',
      theme: 'Daily Life'
    });
    
    // Check vocabulary complexity
    const n5Vocab = ['です', 'ます', 'これ', 'それ'];
    const hasSimpleVocab = n5Vocab.some(word => 
      n5Story.text.includes(word)
    );
    
    expect(hasSimpleVocab).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/storyGeneration.test.ts
describe('Story Generation Flow', () => {
  it('should generate complete story', async () => {
    // Mock admin authentication
    const mockToken = 'test-admin-token';
    
    // Test full generation flow
    const story = await request(app)
      .post('/api/admin/generate-story')
      .set('Authorization', `Bearer ${mockToken}`)
      .send({
        theme: 'Adventure',
        jlptLevel: 'N4',
        pages: 3
      });
    
    expect(story.status).toBe(200);
    expect(story.body).toHaveProperty('characterSheet');
    expect(story.body).toHaveProperty('outline');
    expect(story.body.outline).toHaveLength(3);
  });
});
```

## Performance Optimization

### Caching Strategy

```typescript
// src/utils/aiStoryCache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export class AIStoryCache {
  // Cache character sheets for reuse
  static async getCachedCharacterSheet(
    theme: string,
    visualStyle: string
  ): Promise<AICharacterSheet | null> {
    const key = `character-sheet:${theme}:${visualStyle}`;
    return await redis.get(key);
  }
  
  static async cacheCharacterSheet(
    theme: string,
    visualStyle: string,
    characterSheet: AICharacterSheet
  ) {
    const key = `character-sheet:${theme}:${visualStyle}`;
    // Cache for 7 days
    await redis.set(key, characterSheet, { ex: 604800 });
  }
  
  // Cache common prompts
  static async getCachedPromptResponse(
    promptHash: string
  ): Promise<string | null> {
    return await redis.get(`prompt:${promptHash}`);
  }
  
  static async cachePromptResponse(
    promptHash: string,
    response: string
  ) {
    // Cache for 1 day
    await redis.set(`prompt:${promptHash}`, response, { ex: 86400 });
  }
}
```

### Batch Processing

```typescript
// Process multiple stories in queue
export class StoryGenerationQueue {
  private queue: GenerateStoryRequest[] = [];
  private processing = false;
  
  async addToQueue(request: GenerateStoryRequest) {
    this.queue.push(request);
    if (!this.processing) {
      this.processQueue();
    }
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, 3); // Process 3 at a time
      
      await Promise.all(
        batch.map(request => this.processStory(request))
      );
      
      // Rate limit between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    this.processing = false;
  }
  
  private async processStory(request: GenerateStoryRequest) {
    try {
      // Generate story
      const result = await generateCompleteStory(request);
      
      // Notify completion
      await this.notifyCompletion(request.userId, result);
    } catch (error) {
      await this.notifyError(request.userId, error);
    }
  }
}
```

## Security Best Practices

### API Key Management

```typescript
// Never expose API keys in client code
// Always validate in server-side routes

// Bad ❌
const response = await fetch('https://api.openai.com/v1/...', {
  headers: {
    'Authorization': `Bearer ${process.env.OPEN_AI_API_KEY}` // Exposed!
  }
});

// Good ✅
const response = await fetch('/api/admin/generate-story', {
  headers: {
    'Authorization': `Bearer ${userAuthToken}` // User token only
  }
});
```

### Input Validation

```typescript
// Validate all inputs before sending to OpenAI
export function validateStoryRequest(request: GenerateStoryRequest) {
  const errors: string[] = [];
  
  // Theme validation
  if (!STORY_THEMES.includes(request.theme as any)) {
    errors.push('Invalid theme selected');
  }
  
  // JLPT level validation
  if (!JLPT_LEVELS.includes(request.jlptLevel)) {
    errors.push('Invalid JLPT level');
  }
  
  // Page count validation
  if (request.pages < 1 || request.pages > 10) {
    errors.push('Page count must be between 1 and 10');
  }
  
  // Sanitize character sheet if reusing
  if (request.characterSheet) {
    request.characterSheet = sanitizeCharacterSheet(request.characterSheet);
  }
  
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
  
  return request;
}
```

## Deployment Checklist

- [ ] Set `OPEN_AI_API_KEY` in production environment
- [ ] Configure rate limiting for API endpoints
- [ ] Set up error monitoring (Sentry, LogRocket)
- [ ] Implement cost alerts for OpenAI usage
- [ ] Create admin user management system
- [ ] Set up backup for generated stories
- [ ] Configure CDN for generated images
- [ ] Implement request queuing for high load
- [ ] Add analytics tracking for generation metrics
- [ ] Create documentation for content moderators

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [DALL-E 3 Guidelines](https://platform.openai.com/docs/guides/images)
- [GPT-4 Best Practices](https://platform.openai.com/docs/guides/gpt)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Next.js App Router](https://nextjs.org/docs/app)