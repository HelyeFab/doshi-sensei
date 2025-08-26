# Component Integration Examples

## Table of Contents
1. [Basic Components](#basic-components)
2. [Learning Components](#learning-components)
3. [Game Components](#game-components)
4. [Content Components](#content-components)
5. [Advanced Patterns](#advanced-patterns)

## Basic Components

### Simple View Tracking
The most basic form of tracking - just noting that something was viewed.

```typescript
// components/kanji/SimpleKanjiCard.tsx
import { useLearnTracking } from '@/hooks/useLearnTracking';

export function SimpleKanjiCard({ kanji }: { kanji: string }) {
  const { track } = useLearnTracking();
  
  useEffect(() => {
    track({
      type: 'view',
      category: 'kanji',
      content: { value: kanji }
    });
  }, [kanji]);
  
  return <div className="kanji-card">{kanji}</div>;
}
```

### Click Tracking
Track when users interact with elements.

```typescript
// components/vocabulary/VocabCard.tsx
export function VocabCard({ word, meaning }) {
  const { track } = useLearnTracking();
  
  const handleClick = () => {
    track({
      type: 'view',
      category: 'vocabulary',
      content: { 
        value: word,
        metadata: { meaning }
      },
      metrics: { interaction: 'click' }
    });
  };
  
  return (
    <div onClick={handleClick} className="vocab-card">
      <span>{word}</span>
      <span>{meaning}</span>
    </div>
  );
}
```

## Learning Components

### Kana Practice Chart
Track which kana characters users practice and how long they spend.

```typescript
// components/kana/KanaChart.tsx
import { useState, useRef, useEffect } from 'react';
import { useLearnTracking } from '@/hooks/useLearnTracking';

export function KanaChart({ type }: { type: 'hiragana' | 'katakana' }) {
  const { track } = useLearnTracking();
  const [selectedKana, setSelectedKana] = useState<string | null>(null);
  const viewStartTime = useRef<number>(Date.now());
  
  // Track overall chart view
  useEffect(() => {
    track({
      type: 'view',
      category: 'kana',
      content: { 
        value: `${type}_chart`,
        metadata: { type }
      }
    });
    
    return () => {
      // Track duration on unmount
      track({
        type: 'complete',
        category: 'kana',
        content: { value: `${type}_chart` },
        metrics: { 
          duration: Date.now() - viewStartTime.current 
        }
      });
    };
  }, [type]);
  
  // Track individual kana selection
  const handleKanaClick = (kana: string, romaji: string) => {
    track({
      type: 'practice',
      category: 'kana',
      content: { 
        value: kana,
        metadata: { 
          romaji,
          type,
          position: getKanaPosition(kana)
        }
      }
    });
    setSelectedKana(kana);
  };
  
  return (
    <div className="kana-chart">
      {kanaData.map(kana => (
        <KanaCell 
          key={kana.char}
          kana={kana.char}
          romaji={kana.romaji}
          onClick={() => handleKanaClick(kana.char, kana.romaji)}
        />
      ))}
    </div>
  );
}
```

### Vocabulary Search with Results Tracking
Track searches and which results users click on.

```typescript
// components/vocabulary/VocabularySearch.tsx
export function VocabularySearch() {
  const { track } = useLearnTracking();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const searchStartTime = useRef<number>();
  
  const performSearch = async (searchTerm: string) => {
    searchStartTime.current = Date.now();
    
    // Track search initiation
    track({
      type: 'search',
      category: 'vocabulary',
      content: { 
        value: searchTerm,
        metadata: { 
          searchLength: searchTerm.length,
          hasKanji: /[\u4e00-\u9faf]/.test(searchTerm),
          hasKana: /[\u3040-\u309f\u30a0-\u30ff]/.test(searchTerm)
        }
      }
    });
    
    const searchResults = await searchVocabulary(searchTerm);
    setResults(searchResults);
    
    // Track search completion
    track({
      type: 'complete',
      category: 'vocabulary',
      content: { value: searchTerm },
      metrics: {
        duration: Date.now() - searchStartTime.current,
        resultsCount: searchResults.length
      }
    });
  };
  
  const handleResultClick = (result: VocabResult, index: number) => {
    track({
      type: 'view',
      category: 'vocabulary',
      content: {
        id: result.id,
        value: result.word,
        jlptLevel: result.jlptLevel,
        metadata: {
          searchQuery: query,
          resultIndex: index,
          resultTotal: results.length,
          meanings: result.meanings,
          readings: result.readings
        }
      }
    });
  };
  
  return (
    <div>
      <SearchInput 
        value={query}
        onChange={setQuery}
        onSearch={performSearch}
      />
      <SearchResults 
        results={results}
        onResultClick={handleResultClick}
      />
    </div>
  );
}
```

### Drill Practice with Success/Failure Tracking
Track practice sessions with detailed performance metrics.

```typescript
// components/drills/DrillPractice.tsx
export function DrillPractice({ drillType, questions }) {
  const { track } = useLearnTracking();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const sessionStartTime = useRef(Date.now());
  const questionStartTime = useRef(Date.now());
  
  useEffect(() => {
    // Track session start
    track({
      type: 'practice',
      category: 'drill',
      content: {
        id: `drill_${drillType}`,
        value: drillType,
        metadata: {
          questionCount: questions.length,
          estimatedDuration: questions.length * 30000 // 30s per question
        }
      }
    });
  }, []);
  
  const handleAnswer = (answer: string, isCorrect: boolean) => {
    const question = questions[currentQuestion];
    const responseTime = Date.now() - questionStartTime.current;
    
    // Track individual answer
    track({
      type: isCorrect ? 'success' : 'failure',
      category: 'drill',
      content: {
        value: question.prompt,
        metadata: {
          questionType: question.type,
          userAnswer: answer,
          correctAnswer: question.correctAnswer,
          questionNumber: currentQuestion + 1,
          totalQuestions: questions.length
        }
      },
      metrics: {
        duration: responseTime,
        accuracy: isCorrect ? 100 : 0
      }
    });
    
    if (isCorrect) setScore(score + 1);
    
    // Move to next question or complete
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      questionStartTime.current = Date.now();
    } else {
      completeDrill();
    }
  };
  
  const completeDrill = () => {
    const totalDuration = Date.now() - sessionStartTime.current;
    const accuracy = (score / questions.length) * 100;
    
    track({
      type: 'complete',
      category: 'drill',
      content: {
        id: `drill_${drillType}`,
        value: drillType
      },
      metrics: {
        duration: totalDuration,
        accuracy: accuracy,
        score: score,
        attempts: questions.length
      }
    });
  };
  
  return (
    <DrillInterface 
      question={questions[currentQuestion]}
      onAnswer={handleAnswer}
    />
  );
}
```

## Game Components

### Kana Drop Game
Track game sessions, moves, and performance.

```typescript
// components/games/KanaDropGame.tsx
export function KanaDropGame() {
  const { track } = useLearnTracking();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const gameStartTime = useRef<number>();
  const correctAnswers = useRef<string[]>([]);
  const mistakes = useRef<Array<{kana: string, answer: string}>>([]);
  
  const startGame = (difficulty: 'easy' | 'medium' | 'hard') => {
    gameStartTime.current = Date.now();
    correctAnswers.current = [];
    mistakes.current = [];
    
    track({
      type: 'practice',
      category: 'game',
      content: {
        id: 'kana_drop',
        value: 'Kana Drop',
        metadata: { 
          difficulty,
          gameMode: 'classic'
        }
      }
    });
    
    setGameState('playing');
  };
  
  const handleCorrectAnswer = (kana: string, romaji: string) => {
    correctAnswers.current.push(kana);
    
    track({
      type: 'success',
      category: 'game',
      content: {
        value: kana,
        metadata: {
          romaji,
          gameId: 'kana_drop',
          level,
          combo: calculateCombo()
        }
      }
    });
  };
  
  const handleMistake = (kana: string, userAnswer: string, correctAnswer: string) => {
    mistakes.current.push({ kana, answer: userAnswer });
    
    track({
      type: 'failure',
      category: 'game',
      content: {
        value: kana,
        metadata: {
          userAnswer,
          correctAnswer,
          gameId: 'kana_drop',
          level
        }
      }
    });
  };
  
  const endGame = (reason: 'complete' | 'gameover') => {
    const duration = Date.now() - gameStartTime.current!;
    
    track({
      type: reason === 'complete' ? 'complete' : 'abandon',
      category: 'game',
      content: {
        id: 'kana_drop',
        value: 'Kana Drop'
      },
      metrics: {
        duration,
        score,
        level,
        accuracy: calculateAccuracy(),
        attempts: correctAnswers.current.length + mistakes.current.length
      },
      metadata: {
        correctKana: correctAnswers.current,
        mistakes: mistakes.current,
        highScore: isNewHighScore(score)
      }
    });
    
    setGameState('gameover');
  };
  
  return <Game onEnd={endGame} />;
}
```

## Content Components

### Article Reader with Scroll Tracking
Track reading progress and engagement.

```typescript
// components/articles/ArticleReader.tsx
export function ArticleReader({ article }) {
  const { track } = useLearnTracking();
  const [scrollDepth, setScrollDepth] = useState(0);
  const [wordsLookedUp, setWordsLookedUp] = useState<string[]>([]);
  const readStartTime = useRef(Date.now());
  const lastScrollTime = useRef(Date.now());
  const totalReadTime = useRef(0);
  
  useEffect(() => {
    // Track article open
    track({
      type: 'view',
      category: 'article',
      content: {
        id: article.id,
        value: article.title,
        metadata: {
          source: article.source,
          difficulty: article.difficulty,
          wordCount: article.wordCount,
          estimatedReadTime: article.estimatedReadTime,
          tags: article.tags
        }
      }
    });
    
    return () => {
      // Track article close with final stats
      const finalReadTime = totalReadTime.current + (Date.now() - lastScrollTime.current);
      
      track({
        type: scrollDepth >= 90 ? 'complete' : 'abandon',
        category: 'article',
        content: { id: article.id },
        metrics: {
          duration: finalReadTime,
          scrollDepth,
          wordsLookedUp: wordsLookedUp.length
        },
        metadata: {
          lookedUpWords: wordsLookedUp,
          readingSpeed: calculateReadingSpeed(article.wordCount, finalReadTime)
        }
      });
    };
  }, [article.id]);
  
  const handleScroll = (event: ScrollEvent) => {
    const depth = calculateScrollDepth(event);
    
    // Track reading time
    const now = Date.now();
    if (now - lastScrollTime.current > 1000) { // User paused for > 1 second
      totalReadTime.current += now - lastScrollTime.current;
    }
    lastScrollTime.current = now;
    
    // Track scroll milestones
    if (depth > scrollDepth) {
      setScrollDepth(depth);
      
      if ([25, 50, 75, 90].includes(Math.floor(depth))) {
        track({
          type: 'view',
          category: 'article',
          content: { id: article.id },
          metrics: { 
            scrollDepth: depth,
            duration: totalReadTime.current
          }
        });
      }
    }
  };
  
  const handleWordLookup = (word: string, selection: Selection) => {
    setWordsLookedUp([...wordsLookedUp, word]);
    
    track({
      type: 'search',
      category: 'vocabulary',
      content: {
        value: word,
        metadata: {
          source: 'article',
          articleId: article.id,
          context: getSelectionContext(selection),
          position: getReadingPosition()
        }
      }
    });
  };
  
  return (
    <ArticleView 
      article={article}
      onScroll={handleScroll}
      onWordLookup={handleWordLookup}
    />
  );
}
```

### YouTube Shadowing Player
Track video watching and shadowing practice.

```typescript
// components/youtube/YouTubeShadowingPlayer.tsx
export function YouTubeShadowingPlayer({ videoId, transcript }) {
  const { track } = useLearnTracking();
  const [currentTime, setCurrentTime] = useState(0);
  const [shadowingMode, setShadowingMode] = useState(false);
  const viewedSegments = useRef(new Set<number>());
  const repeatCount = useRef<Record<number, number>>({});
  
  useEffect(() => {
    track({
      type: 'view',
      category: 'video',
      content: {
        id: videoId,
        value: videoTitle,
        metadata: {
          source: 'youtube',
          duration: videoDuration,
          hasTranscript: !!transcript,
          language: 'japanese'
        }
      }
    });
  }, [videoId]);
  
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    
    // Track which transcript segments were viewed
    const segmentIndex = getTranscriptSegmentIndex(time);
    if (!viewedSegments.current.has(segmentIndex)) {
      viewedSegments.current.add(segmentIndex);
      
      track({
        type: 'view',
        category: 'sentence',
        content: {
          value: transcript[segmentIndex].text,
          metadata: {
            videoId,
            segmentIndex,
            timestamp: time
          }
        }
      });
    }
  };
  
  const handleSegmentRepeat = (segmentIndex: number) => {
    repeatCount.current[segmentIndex] = (repeatCount.current[segmentIndex] || 0) + 1;
    
    track({
      type: 'practice',
      category: 'sentence',
      content: {
        value: transcript[segmentIndex].text,
        metadata: {
          videoId,
          segmentIndex,
          repeatCount: repeatCount.current[segmentIndex],
          practiceType: shadowingMode ? 'shadowing' : 'listening'
        }
      }
    });
  };
  
  const handleVideoComplete = () => {
    const watchedPercentage = (viewedSegments.current.size / transcript.length) * 100;
    
    track({
      type: watchedPercentage >= 80 ? 'complete' : 'abandon',
      category: 'video',
      content: { id: videoId },
      metrics: {
        duration: currentTime * 1000,
        watchedPercentage,
        segmentsViewed: viewedSegments.current.size,
        totalSegments: transcript.length
      },
      metadata: {
        mostRepeated: getMostRepeatedSegments(repeatCount.current),
        shadowingUsed: shadowingMode
      }
    });
  };
  
  return (
    <VideoPlayer 
      onTimeUpdate={handleTimeUpdate}
      onComplete={handleVideoComplete}
      onSegmentRepeat={handleSegmentRepeat}
    />
  );
}
```

## Advanced Patterns

### Composite Tracking with Context
Track related events together with shared context.

```typescript
// hooks/useCompositeTracking.ts
export function useCompositeTracking(context: string) {
  const { track } = useLearnTracking();
  const sessionId = useRef(generateSessionId());
  
  const trackWithContext = (event: Partial<LearningEvent>) => {
    track({
      ...event,
      context: {
        ...event.context,
        session: sessionId.current,
        feature: context
      }
    });
  };
  
  return { track: trackWithContext, sessionId: sessionId.current };
}

// Usage in component
export function KanjiLearningSession() {
  const { track, sessionId } = useCompositeTracking('kanji_learning_session');
  
  // All events will have the same session context
  track({ type: 'view', category: 'kanji', content: { value: '愛' } });
  track({ type: 'practice', category: 'kanji', content: { value: '愛' } });
  track({ type: 'success', category: 'kanji', content: { value: '愛' } });
}
```

### Performance-Optimized Tracking
Debounce and batch events for better performance.

```typescript
// components/optimized/OptimizedScrollTracker.tsx
import { useMemo } from 'react';
import { debounce, throttle } from 'lodash';

export function OptimizedScrollTracker({ children }) {
  const { track } = useLearnTracking();
  
  // Debounce scroll depth tracking
  const trackScrollDepth = useMemo(
    () => debounce((depth: number) => {
      track({
        type: 'view',
        metrics: { scrollDepth: depth }
      });
    }, 1000),
    []
  );
  
  // Throttle mouse movement tracking
  const trackMouseActivity = useMemo(
    () => throttle((x: number, y: number) => {
      track({
        type: 'view',
        metrics: { mousePosition: { x, y } }
      });
    }, 5000),
    []
  );
  
  return (
    <div 
      onScroll={(e) => trackScrollDepth(calculateDepth(e))}
      onMouseMove={(e) => trackMouseActivity(e.clientX, e.clientY)}
    >
      {children}
    </div>
  );
}
```

### Tracking Higher-Order Component
Wrap any component with automatic tracking.

```typescript
// hocs/withTracking.tsx
export function withTracking<P extends object>(
  Component: React.ComponentType<P>,
  trackingConfig: {
    category: ContentCategory;
    getContent: (props: P) => ContentData;
  }
) {
  return function TrackedComponent(props: P) {
    const { track } = useLearnTracking();
    const startTime = useRef(Date.now());
    
    useEffect(() => {
      track({
        type: 'view',
        category: trackingConfig.category,
        content: trackingConfig.getContent(props)
      });
      
      return () => {
        track({
          type: 'complete',
          category: trackingConfig.category,
          content: trackingConfig.getContent(props),
          metrics: {
            duration: Date.now() - startTime.current
          }
        });
      };
    }, []);
    
    return <Component {...props} />;
  };
}

// Usage
const TrackedKanjiCard = withTracking(KanjiCard, {
  category: 'kanji',
  getContent: (props) => ({
    value: props.kanji,
    jlptLevel: props.level
  })
});
```

### Tracking Provider Pattern
Provide tracking context to child components.

```typescript
// contexts/TrackingContext.tsx
const TrackingContext = createContext<{
  trackingSession: string;
  parentCategory: ContentCategory;
}>({});

export function TrackingProvider({ 
  children, 
  category, 
  contentId 
}: {
  children: React.ReactNode;
  category: ContentCategory;
  contentId: string;
}) {
  const { track } = useLearnTracking();
  const trackingSession = useRef(generateSessionId());
  
  useEffect(() => {
    track({
      type: 'view',
      category,
      content: { id: contentId },
      context: { session: trackingSession.current }
    });
  }, []);
  
  return (
    <TrackingContext.Provider 
      value={{ 
        trackingSession: trackingSession.current,
        parentCategory: category 
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
}
```

---

**Next Steps**: Check the [API Reference](../api/reference.md) for complete documentation of all tracking methods.