# AI Context Explanation Feature

## Overview
The AI Context Explanation feature provides instant, AI-powered explanations for any Japanese text throughout the Doshi Sensei app. Users can click a trigger button/icon to get grammar explanations, usage examples, and cultural context for words, phrases, or sentences.

## How It Works

### 1. User Interaction
- User sees Japanese text with an AI explanation trigger (lightbulb icon)
- Clicks the trigger
- System checks access limits (5/day for guests, 10/day for free users, unlimited for premium)
- Modal opens with AI-generated explanation

### 2. Technical Flow
```
User clicks trigger → Access check → OpenAI API call → Display explanation
```

## Implementation Guide

### Basic Integration
To add AI explanation capabilities to any component displaying Japanese text:

```typescript
import { AIExplanationTrigger } from '@/components/AIExplanation';

// In your component
<div className="flex items-center gap-2">
  <p className="text-lg">{japaneseText}</p>
  <AIExplanationTrigger
    text={japaneseText}
    contextType="sentence"  // or 'word', 'phrase', 'paragraph'
    size="sm"              // or 'md', 'lg'
  />
</div>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| text | string | required | The Japanese text to explain |
| contextType | 'word' \| 'phrase' \| 'sentence' \| 'paragraph' | 'sentence' | Type of text being explained |
| surroundingContext | string | undefined | Additional context to help AI understand |
| className | string | '' | Additional CSS classes |
| size | 'sm' \| 'md' \| 'lg' | 'sm' | Size of the trigger icon |
| variant | 'icon' \| 'inline' \| 'floating' | 'icon' | Display style of trigger |

### Examples

#### 1. Word-level explanation in vocabulary list
```typescript
<div className="vocabulary-item">
  <span className="japanese-word">食べる</span>
  <AIExplanationTrigger
    text="食べる"
    contextType="word"
    size="sm"
  />
</div>
```

#### 2. Sentence explanation with context
```typescript
<AIExplanationTrigger
  text="昨日、友達と一緒に寿司を食べました。"
  contextType="sentence"
  surroundingContext="This is from a diary entry about weekend activities"
  size="md"
/>
```

#### 3. Floating trigger for reading mode
```typescript
<AIExplanationTrigger
  text={selectedText}
  contextType="phrase"
  variant="floating"
  className="z-50"
/>
```

## Feature Access Control

### Usage Limits
- **Guest Users**: 5 explanations per day
- **Free Users**: 10 explanations per day  
- **Premium Users**: Unlimited explanations

### Three-Pillar Integration
The feature is registered in the feature registry as `ai_context_explanation` with:
- Daily limit tracking
- Automatic modal prompts when limits exceeded
- Usage analytics tracking

## AI Response Format

The AI provides structured explanations including:

```typescript
{
  meaning: string;           // Translation/meaning
  grammar?: string;          // Grammar points explained
  usage?: string;            // Common usage patterns
  examples?: string[];       // Example sentences
  culturalNotes?: string;    // Cultural context when relevant
}
```

## Best Practices

### 1. Strategic Placement
- Add triggers next to complex sentences or technical terms
- Avoid cluttering UI with too many triggers
- Consider user workflow when placing triggers

### 2. Context Matters
- Provide surrounding context when available
- Use appropriate contextType for better explanations
- Consider user level (future enhancement)

### 3. Performance
- Explanations are cached to avoid duplicate API calls
- Consider batch loading for multiple items
- Monitor API usage costs

## Future Enhancements

1. **User Level Detection**
   - Adjust explanation complexity based on user's Japanese level
   - Track which explanations users find most helpful

2. **Offline Support**
   - Cache common explanations
   - Pre-generate explanations for study materials

3. **Enhanced UI**
   - Inline popover option
   - Text selection trigger
   - Keyboard shortcuts

4. **Learning Integration**
   - Save explanations to study lists
   - Create flashcards from explanations
   - Track learning progress

## Troubleshooting

### Common Issues

1. **"Failed to get explanation" error**
   - Check OpenAI API key configuration
   - Verify internet connection
   - Check API rate limits

2. **Trigger not appearing**
   - Ensure component is imported correctly
   - Check if text prop is provided
   - Verify CSS isn't hiding the trigger

3. **Access denied**
   - User has exceeded daily limits
   - Feature requires authentication
   - Check feature registry configuration

## Analytics Events

The feature tracks:
- `ai_explanation_requested` - When user clicks trigger
- `ai_explanation_success` - When explanation loads successfully
- Usage patterns for admin dashboard

## Code Organization

```
/src/
├── components/AIExplanation/
│   ├── AIExplanationTrigger.tsx    # Main trigger component
│   └── AIExplanationModal.tsx      # Modal display component
├── services/openai/
│   └── contextExplanation.ts       # OpenAI integration
└── lib/features/
    └── registry.ts                 # Feature registration
```