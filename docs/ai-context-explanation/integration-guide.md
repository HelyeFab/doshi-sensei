# Integration Guide

This guide shows how to add AI context explanations to any component in Doshi Sensei.

## Basic Integration

### Step 1: Import the Component

```tsx
import { AIExplanationTrigger } from '@/components/AIExplanation';
```

### Step 2: Add to Your Component

```tsx
export default function MyComponent() {
  const japaneseText = "こんにちは";
  
  return (
    <div className="flex items-center gap-2">
      <p>{japaneseText}</p>
      <AIExplanationTrigger 
        text={japaneseText}
        contextType="word"
      />
    </div>
  );
}
```

## Integration Examples

### 1. Article Reader Integration

```tsx
// In ArticleReader component
function ArticleParagraph({ paragraph }: { paragraph: string }) {
  return (
    <div className="mb-4 relative group">
      <p className="text-lg leading-relaxed">
        {paragraph}
      </p>
      <AIExplanationTrigger 
        text={paragraph}
        contextType="paragraph"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
        size="sm"
      />
    </div>
  );
}
```

### 2. Vocabulary List Integration

```tsx
// In vocabulary item
function VocabularyItem({ word, reading, meaning }: VocabItem) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg">
      <div>
        <h3 className="text-xl font-medium">{word}</h3>
        <p className="text-sm text-gray-500">{reading}</p>
        <p className="text-sm">{meaning}</p>
      </div>
      <AIExplanationTrigger 
        text={word}
        contextType="word"
        surroundingContext={`${word} (${reading}) - ${meaning}`}
        size="md"
      />
    </div>
  );
}
```

### 3. Story Reader with Sentence Selection

```tsx
// Interactive story reader
function StoryReader({ content }: { content: string }) {
  const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
  
  const sentences = content.split('。').filter(s => s.trim());
  
  return (
    <div>
      {sentences.map((sentence, index) => (
        <span
          key={index}
          className="cursor-pointer hover:bg-yellow-100 transition-colors"
          onClick={() => setSelectedSentence(sentence)}
        >
          {sentence}。
          {selectedSentence === sentence && (
            <AIExplanationTrigger 
              text={sentence}
              contextType="sentence"
              surroundingContext={content}
              variant="inline"
              className="ml-1"
            />
          )}
        </span>
      ))}
    </div>
  );
}
```

### 4. Kanji Browser Integration

```tsx
// In kanji details view
function KanjiDetails({ kanji, readings, meanings }: KanjiData) {
  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-4xl font-bold mb-2">{kanji}</h2>
          <p className="text-gray-600">
            {readings.join(', ')}
          </p>
          <p className="mt-2">{meanings.join(', ')}</p>
        </div>
        <AIExplanationTrigger 
          text={kanji}
          contextType="word"
          surroundingContext={`${kanji} - ${readings.join(', ')} - ${meanings.join(', ')}`}
          size="lg"
        />
      </div>
    </div>
  );
}
```

### 5. Game Integration

```tsx
// In a quiz game
function QuizQuestion({ question, userAnswer, isCorrect }: QuizData) {
  return (
    <div className="text-center">
      <h3 className="text-2xl mb-4">{question.text}</h3>
      
      {userAnswer && !isCorrect && (
        <div className="mt-4">
          <p className="text-red-500 mb-2">Incorrect. Try again!</p>
          <AIExplanationTrigger 
            text={question.text}
            contextType="sentence"
            variant="inline"
            className="text-sm"
          />
          <span className="text-sm text-gray-500 ml-2">
            Need help? Click for explanation
          </span>
        </div>
      )}
    </div>
  );
}
```

### 6. Floating Button for Reading Pages

```tsx
// Global floating AI assistant
function ReadingLayout({ children }: { children: React.ReactNode }) {
  const [selectedText, setSelectedText] = useState('');
  
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 0) {
        setSelectedText(selection);
      }
    };
    
    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, []);
  
  return (
    <div>
      {children}
      {selectedText && (
        <AIExplanationTrigger 
          text={selectedText}
          contextType="phrase"
          variant="floating"
          className="z-50"
        />
      )}
    </div>
  );
}
```

## Best Practices

### 1. Choose the Right Context Type
- `word` - Single words or kanji
- `phrase` - Short expressions (2-10 characters)
- `sentence` - Complete sentences
- `paragraph` - Multiple sentences or full paragraphs

### 2. Provide Surrounding Context
Always include `surroundingContext` when available for better AI understanding:

```tsx
<AIExplanationTrigger 
  text="それ"  // "that"
  contextType="word"
  surroundingContext="それは私の本です。" // "That is my book"
/>
```

### 3. UI/UX Considerations

**Visibility**: Make the AI button discoverable but not intrusive
```tsx
// Show on hover for reading content
className="opacity-0 group-hover:opacity-100 transition-opacity"

// Always visible for learning tools
className="text-blue-500"
```

**Size Guidelines**:
- `sm` - Inline with text or tight spaces
- `md` - Standard buttons and cards
- `lg` - Featured placements or touch targets

**Variant Selection**:
- `icon` - Default, works everywhere
- `inline` - Within text flow
- `floating` - Global helper button

### 4. Performance Tips

**Debounce Rapid Clicks**:
```tsx
const handleExplain = useMemo(
  () => debounce(async () => {
    await checkAndTrack('ai_context_explanation');
  }, 300),
  []
);
```

**Lazy Load for Large Lists**:
```tsx
const AITrigger = lazy(() => import('@/components/AIExplanation/AIExplanationTrigger'));
```

### 5. Accessibility

Always include proper ARIA labels:
```tsx
<AIExplanationTrigger 
  text={text}
  aria-label={`Get AI explanation for ${text}`}
/>
```

## Testing Your Integration

1. **Test with Different User Types**:
   - Guest users (5 daily limit)
   - Free users (10 daily limit)
   - Premium users (unlimited)

2. **Test Edge Cases**:
   - Empty text
   - Very long text
   - Special characters
   - Mixed Japanese/English

3. **Test UI States**:
   - Loading state
   - Error handling
   - Limit reached modal

## Common Issues & Solutions

### Issue: Button not visible
**Solution**: Check z-index and positioning:
```tsx
className="relative z-10"
```

### Issue: Modal appears behind other elements
**Solution**: The modal uses a portal, but ensure no parent has `transform`:
```tsx
style={{ isolation: 'isolate' }}
```

### Issue: Rapid API calls
**Solution**: The component has built-in debouncing, but you can add extra protection:
```tsx
const [isProcessing, setIsProcessing] = useState(false);

if (isProcessing) return;
setIsProcessing(true);
// ... make request
setIsProcessing(false);
```

## Next Steps

1. Choose components to enhance with AI explanations
2. Follow the integration patterns above
3. Test with different user types
4. Monitor usage analytics
5. Gather user feedback

Remember: The goal is to make Japanese learning more accessible, not to overwhelm users with AI buttons everywhere. Place them strategically where users need help most.