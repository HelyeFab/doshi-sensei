# AI Context Explanation Feature

## Overview

The AI Context Explanation feature provides instant, intelligent explanations for Japanese text using OpenAI's GPT models. Users can click on the AI robot icon to get detailed explanations including meaning, grammar, cultural context, and usage examples.

## Key Features

- 🤖 **Instant AI-powered explanations** for any Japanese text
- 📝 **Context-aware analysis** - considers surrounding text for better understanding
- 🎯 **Multiple explanation types**: word, phrase, sentence, or paragraph
- 🔒 **Access control integration** - respects daily usage limits
- 🎨 **Flexible UI components** - icon, inline, or floating button variants
- 🌐 **Works across the platform** - can be integrated anywhere

## Quick Start

```tsx
import { AIExplanationTrigger } from '@/components/AIExplanation';

// Basic usage
<AIExplanationTrigger 
  text="食べる"
  contextType="word"
/>

// With surrounding context
<AIExplanationTrigger 
  text="お元気ですか"
  contextType="phrase"
  surroundingContext="久しぶりですね。お元気ですか？"
  size="md"
/>
```

## Documentation

- [Technical Architecture](./technical-architecture.md) - Implementation details and system design
- [Integration Guide](./integration-guide.md) - How to add AI explanations to your components
- [API Reference](./api-reference.md) - Component props and API endpoints
- [Usage Limits](./usage-limits.md) - Access control and daily limits

## Current Integration

The AI explanation feature is currently integrated in:
- **YouTube Shadowing** - Helps users understand transcript lines
- **Test Page** - `/test-ai-explanation` for testing

## Future Plans

- Integration with article/story readers
- Vocabulary and kanji browsers
- Practice drills and games
- Batch explanation mode
- Offline caching of common explanations