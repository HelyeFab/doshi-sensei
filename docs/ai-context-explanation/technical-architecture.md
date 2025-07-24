# Technical Architecture

## System Overview

```
User Clicks Robot Icon
        ↓
AIExplanationTrigger Component
        ↓
Access Control Check (checkAndTrack)
        ↓
AIExplanationModal Opens
        ↓
API Call to /api/ai/explain
        ↓
OpenAI GPT-4 Processing
        ↓
Formatted Response Display
```

## Components

### 1. AIExplanationTrigger (`/src/components/AIExplanation/AIExplanationTrigger.tsx`)

The main component that handles user interaction and access control.

**Key Features:**
- Three variants: `icon`, `inline`, `floating`
- Three sizes: `sm`, `md`, `lg`
- Integrates with Three-Pillar Architecture
- Shows modal on successful access check

**Props:**
```typescript
interface AIExplanationTriggerProps {
  text: string;                    // Text to explain
  contextType?: 'word' | 'phrase' | 'sentence' | 'paragraph';
  surroundingContext?: string;     // Additional context
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'inline' | 'floating';
}
```

### 2. AIExplanationModal (`/src/components/AIExplanation/AIExplanationModal.tsx`)

Displays the AI explanation in a modal dialog.

**Features:**
- Loading states with skeleton UI
- Error handling
- Formatted response display
- Copy to clipboard functionality
- Mobile-responsive design

### 3. API Endpoint (`/src/app/api/ai/explain/route.ts`)

Handles the OpenAI API integration.

**Request Format:**
```json
{
  "text": "お元気ですか",
  "contextType": "phrase",
  "surroundingContext": "久しぶりですね。お元気ですか？"
}
```

**Response Format:**
```json
{
  "explanation": {
    "meaning": "How are you? / Are you well?",
    "breakdown": [
      { "part": "お", "reading": "o", "meaning": "honorific prefix" },
      { "part": "元気", "reading": "genki", "meaning": "healthy, energetic" },
      { "part": "ですか", "reading": "desu ka", "meaning": "copula + question marker" }
    ],
    "grammar": "This is a polite question using です (desu) copula...",
    "usage": "Common greeting used when meeting someone...",
    "cultural_notes": "In Japanese culture, asking about someone's well-being...",
    "examples": [
      { "japanese": "お元気ですか？", "english": "How are you?" },
      { "japanese": "はい、元気です。", "english": "Yes, I'm fine." }
    ]
  }
}
```

## Access Control Integration

The feature uses the `ai_context_explanation` feature ID in the Three-Pillar Architecture:

### Feature Registry Entry
```typescript
'ai_context_explanation': {
  id: 'ai_context_explanation',
  name: 'AI Context Explanation',
  description: 'Get instant AI-powered explanations for any Japanese text',
  category: 'learning',
  icon: '💡',
  limitType: 'daily',
  requiresAuth: false,
  requiresSubscription: false,
  status: 'active',
  metadata: {
    maxRequestsPerDay: { guest: 5, free: 10, premium: -1 },
    features: {
      guest: ['basic_explanation'],
      free: ['basic_explanation', 'grammar_analysis'],
      premium: ['basic_explanation', 'grammar_analysis', 'cultural_notes', 'unlimited_requests']
    }
  }
}
```

### Daily Limits
- **Guest**: 5 explanations/day
- **Free**: 10 explanations/day  
- **Premium**: Unlimited

## OpenAI Integration

### Model Configuration
- **Model**: GPT-4 (or GPT-3.5-turbo for cost optimization)
- **Temperature**: 0.3 (for consistent, factual responses)
- **Max Tokens**: 1000 (to control response length)

### Prompt Engineering
The system uses a carefully crafted prompt that:
1. Identifies the user's learning level
2. Provides context-appropriate explanations
3. Includes furigana for kanji
4. Gives practical usage examples
5. Explains cultural nuances when relevant

### Error Handling
- Rate limiting protection
- Fallback to simpler model if GPT-4 fails
- Graceful error messages for users
- Retry logic with exponential backoff

## Security Considerations

1. **Input Sanitization**: All user input is sanitized before sending to OpenAI
2. **API Key Protection**: OpenAI API key stored in environment variables
3. **Rate Limiting**: Implemented at both application and API levels
4. **Content Filtering**: Responses checked for inappropriate content

## Performance Optimizations

1. **Response Caching**: Common explanations cached in Firestore
2. **Debouncing**: Prevents multiple rapid API calls
3. **Lazy Loading**: Modal components loaded on demand
4. **Streaming Responses**: For longer explanations (future enhancement)

## Database Schema

### Cache Collection: `ai_explanations_cache`
```typescript
{
  id: string;           // Hash of text + contextType
  text: string;
  contextType: string;
  explanation: object;  // Full explanation object
  createdAt: timestamp;
  accessCount: number;
  lastAccessed: timestamp;
}
```

## Monitoring & Analytics

Events tracked:
- `ai_explanation_requested` - When user clicks the robot icon
- `ai_explanation_success` - Successful explanation delivered
- `ai_explanation_error` - API or system errors
- `ai_explanation_limit_reached` - User hit daily limit

## Future Enhancements

1. **Batch Mode**: Explain multiple items at once
2. **Voice Output**: TTS for pronunciation
3. **Study Mode**: Save explanations for review
4. **Offline Support**: Cache common explanations
5. **Custom Models**: Fine-tuned models for Japanese learning