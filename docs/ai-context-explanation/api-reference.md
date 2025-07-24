# API Reference

## Components

### AIExplanationTrigger

The main component for adding AI explanation functionality.

```typescript
import { AIExplanationTrigger } from '@/components/AIExplanation';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | required | The Japanese text to explain |
| `contextType` | `'word' \| 'phrase' \| 'sentence' \| 'paragraph'` | `'sentence'` | Type of content being explained |
| `surroundingContext` | `string` | `undefined` | Additional context for better AI understanding |
| `className` | `string` | `''` | Additional CSS classes |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Size of the trigger button |
| `variant` | `'icon' \| 'inline' \| 'floating'` | `'icon'` | Visual style of the trigger |

#### Examples

```tsx
// Basic usage
<AIExplanationTrigger text="こんにちは" />

// With all options
<AIExplanationTrigger 
  text="元気ですか"
  contextType="phrase"
  surroundingContext="お久しぶりですね。元気ですか？"
  className="ml-2"
  size="md"
  variant="icon"
/>

// Inline variant
<AIExplanationTrigger 
  text="難しい"
  variant="inline"
  size="sm"
/>

// Floating variant
<AIExplanationTrigger 
  text={selectedText}
  variant="floating"
  className="bottom-24 right-6"
/>
```

### AIExplanationModal

Internal component that displays the explanation. Not typically used directly.

```typescript
interface AIExplanationModalProps {
  text: string;
  contextType?: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;
  onClose: () => void;
}
```

## API Endpoint

### POST /api/ai/explain

Get AI-powered explanation for Japanese text.

#### Request

```typescript
interface ExplainRequest {
  text: string;               // Required: Text to explain
  contextType?: string;       // Optional: Type of content
  surroundingContext?: string; // Optional: Additional context
}
```

#### Response

```typescript
interface ExplainResponse {
  explanation: {
    meaning: string;           // English translation/meaning
    breakdown?: Array<{        // Character/word breakdown
      part: string;
      reading: string;
      meaning: string;
    }>;
    grammar?: string;          // Grammar explanation
    usage?: string;            // Usage notes
    cultural_notes?: string;   // Cultural context
    examples?: Array<{         // Usage examples
      japanese: string;
      english: string;
      romaji?: string;
    }>;
  };
}
```

#### Example Request

```bash
curl -X POST https://doshisensei.com/api/ai/explain \
  -H "Content-Type: application/json" \
  -d '{
    "text": "いただきます",
    "contextType": "phrase",
    "surroundingContext": "食事の前に「いただきます」と言います。"
  }'
```

#### Example Response

```json
{
  "explanation": {
    "meaning": "Expression said before eating (literally: 'I humbly receive')",
    "breakdown": [
      {
        "part": "いただき",
        "reading": "itadaki",
        "meaning": "humble form of 'receive'"
      },
      {
        "part": "ます",
        "reading": "masu",
        "meaning": "polite verb ending"
      }
    ],
    "grammar": "This is the polite form of the verb いただく (itadaku), which is the humble form of もらう (morau, 'to receive').",
    "usage": "Said before eating meals as an expression of gratitude for the food.",
    "cultural_notes": "This phrase reflects the Japanese cultural value of gratitude and respect for food, acknowledging all who contributed to the meal.",
    "examples": [
      {
        "japanese": "いただきます！",
        "english": "Let's eat! / Thank you for the meal!",
        "romaji": "Itadakimasu!"
      },
      {
        "japanese": "みんなで「いただきます」を言いましょう。",
        "english": "Let's all say 'itadakimasu' together.",
        "romaji": "Minna de 'itadakimasu' wo iimashou."
      }
    ]
  }
}
```

## Access Control

### Feature ID
`ai_context_explanation`

### Permissions
- No authentication required for basic access
- Respects daily limits based on user type

### Daily Limits
| User Type | Daily Limit | Features |
|-----------|-------------|----------|
| Guest | 5 explanations | Basic explanation |
| Free | 10 explanations | Basic + grammar analysis |
| Premium | Unlimited | All features + cultural notes |

### Checking Access Programmatically

```typescript
import { useAccess } from '@/hooks/useAccess';

function MyComponent() {
  const { checkAndTrack } = useAccess();
  
  const handleExplain = async () => {
    const hasAccess = await checkAndTrack('ai_context_explanation');
    if (hasAccess) {
      // User has access, proceed with explanation
    }
    // Modal shown automatically if no access
  };
}
```

## Error Handling

### Error Responses

```typescript
interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}
```

### Common Error Codes

| Code | Description | User Message |
|------|-------------|--------------|
| `RATE_LIMIT` | User exceeded daily limit | "You've reached your daily limit for AI explanations" |
| `INVALID_TEXT` | Empty or invalid input | "Please provide valid Japanese text" |
| `API_ERROR` | OpenAI API error | "Unable to generate explanation. Please try again" |
| `CONTEXT_TOO_LONG` | Text exceeds max length | "Text is too long. Please select a shorter passage" |

### Error Handling Example

```tsx
const [error, setError] = useState<string | null>(null);

try {
  const response = await fetch('/api/ai/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, contextType })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get explanation');
  }
  
  const data = await response.json();
  // Handle success
} catch (err) {
  setError(err.message);
  // Show user-friendly error
}
```

## Customization

### Custom Styling

```tsx
// Custom styled trigger
<AIExplanationTrigger 
  text="カスタム"
  className="bg-blue-500 text-white rounded-full p-2 hover:bg-blue-600"
/>

// With Tailwind classes
<div className="group relative">
  <span>Hover for AI help</span>
  <AIExplanationTrigger 
    text="..."
    className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
  />
</div>
```

### Custom Icons

While the component uses the robot.svg by default, you can wrap it for custom styling:

```tsx
<div className="relative">
  <AIExplanationTrigger text="..." className="opacity-0 pointer-events-none" />
  <button className="custom-ai-button">
    <MyCustomIcon />
  </button>
</div>
```

## Performance Considerations

### Caching
Explanations are cached in Firestore to reduce API calls:
- Cache key: Hash of (text + contextType)
- Cache duration: 30 days
- Popular explanations served from cache

### Debouncing
The component includes built-in debouncing to prevent rapid API calls.

### Lazy Loading
The modal component is lazy-loaded to reduce initial bundle size:

```tsx
const AIExplanationModal = lazy(() => import('./AIExplanationModal'));
```

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support with touch-optimized UI

## TypeScript Types

```typescript
// Component props type
type AIExplanationTriggerProps = {
  text: string;
  contextType?: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'inline' | 'floating';
};

// API types
type ExplainRequest = {
  text: string;
  contextType?: string;
  surroundingContext?: string;
};

type ExplainResponse = {
  explanation: Explanation;
};

type Explanation = {
  meaning: string;
  breakdown?: BreakdownItem[];
  grammar?: string;
  usage?: string;
  cultural_notes?: string;
  examples?: Example[];
};

type BreakdownItem = {
  part: string;
  reading: string;
  meaning: string;
};

type Example = {
  japanese: string;
  english: string;
  romaji?: string;
};
```