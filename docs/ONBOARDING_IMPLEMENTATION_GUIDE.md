# 🚀 Doshi Sensei Onboarding Experience - Technical Implementation Guide

## 📋 Overview

This document provides complete technical specifications for implementing an engaging 5-screen onboarding tutorial that introduces users to Doshi Sensei's Japanese conjugation learning features.

**Target Audience**: New users (beginners to advanced Japanese learners)
**Duration**: 2-3 minutes
**Tone**: Friendly, humorous, encouraging
**Technical Goal**: High user activation and feature discovery

---

## 🎯 Onboarding Flow Strategy

### Core Learning Path
```
Welcome → Conjugation Demo → List Creation → Practice Flow → Success & Settings
```

### Key Messages per Screen
1. **Welcome** - "Japanese verbs are tricky, but we've got your back!"
2. **Conjugation Magic** - "Watch our engine work its grammar wizardry"
3. **Organization** - "Save words like a digital hoarder (but organized)"
4. **Practice** - "From study mode to drill sergeant mode"
5. **Success** - "You're ready to conjugate like a boss!"

---

## 🏗️ Technical Architecture

### Component Structure
```typescript
src/components/onboarding/
├── OnboardingWrapper.tsx       // Main container with state management
├── OnboardingModal.tsx         // Modal overlay component
├── screens/
│   ├── WelcomeScreen.tsx      // Screen 1
│   ├── ConjugationScreen.tsx  // Screen 2
│   ├── ListsScreen.tsx        // Screen 3
│   ├── PracticeScreen.tsx     // Screen 4
│   └── SuccessScreen.tsx      // Screen 5
├── components/
│   ├── AnimatedWord.tsx       // Animated conjugation display
│   ├── ProgressBar.tsx        // Tutorial progress indicator
│   ├── TutorialButton.tsx     // Consistent button styling
│   └── MockInterface.tsx      // Simulated app interface
└── hooks/
    ├── useOnboardingState.ts  // State management
    ├── useOnboardingProgress.ts // Progress tracking
    └── useOnboardingStorage.ts // Completion persistence
```

### State Management
```typescript
interface OnboardingState {
  currentScreen: number;
  isActive: boolean;
  hasCompleted: boolean;
  userInteractions: {
    demoWordClicked: boolean;
    listCreated: boolean;
    practiceStarted: boolean;
  };
  animationStates: {
    conjugationDemo: 'idle' | 'playing' | 'complete';
    listDemo: 'idle' | 'playing' | 'complete';
    practiceDemo: 'idle' | 'playing' | 'complete';
  };
}
```

---

## 📱 Screen-by-Screen Implementation

### Screen 1: Welcome & Introduction

#### Visual Design
```typescript
// WelcomeScreen.tsx
export function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 p-8">
      {/* Hero Section */}
      <div className="relative">
        <div className="text-6xl mb-4 animate-bounce">🗾</div>
        <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">✨</div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 max-w-md">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome to Doshi Sensei!
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Japanese verbs are like that friend who changes personality depending on the situation.
          <span className="font-semibold text-primary"> Don't worry—we speak their language! </span>
        </p>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <p className="text-sm text-primary font-medium">
            🎯 Master 127+ conjugation forms<br/>
            📚 Create custom study lists<br/>
            ⚡ Practice with smart drills<br/>
            🏆 Track your progress like a ninja
          </p>
        </div>
      </div>

      {/* CTA */}
      <TutorialButton
        onClick={onNext}
        variant="primary"
        size="large"
        className="animate-pulse"
      >
        Let's Conjugate! 🚀
      </TutorialButton>

      <p className="text-xs text-muted-foreground">
        (Don't worry, no verbs were harmed in the making of this tutorial)
      </p>
    </div>
  );
}
```

#### Technical Requirements
- **Animation**: Gentle bounce on emoji, subtle sparkle rotation
- **Responsive**: Adapts to mobile/desktop layouts
- **Accessibility**: Focus management, screen reader friendly
- **Tracking**: Record tutorial start event

---

### Screen 2: Conjugation Engine Demo

#### Interactive Demonstration
```typescript
// ConjugationScreen.tsx
export function ConjugationScreen({ onNext }: { onNext: () => void }) {
  const [selectedWord] = useState<JapaneseWord>({
    kanji: '食べる',
    kana: 'たべる',
    meaning: 'to eat',
    type: 'Ichidan'
  });

  const [animationPhase, setAnimationPhase] = useState<'word' | 'processing' | 'results'>('word');
  const [visibleConjugations, setVisibleConjugations] = useState<string[]>([]);

  const conjugations = ConjugationEngine.conjugate(selectedWord);

  const demonstrateConjugation = async () => {
    setAnimationPhase('processing');

    // Simulate processing with visual feedback
    await sleep(1000);

    setAnimationPhase('results');

    // Animate conjugations appearing one by one
    const forms = ['present', 'past', 'polite', 'teForm', 'negative'];
    for (let i = 0; i < forms.length; i++) {
      await sleep(300);
      setVisibleConjugations(prev => [...prev, forms[i]]);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Watch the Magic Happen ✨
        </h2>
        <p className="text-muted-foreground">
          Our conjugation engine is like a grammar wizard—it takes one word and
          <span className="font-semibold text-primary"> POOF! </span>
          Transforms it into dozens of forms.
        </p>
      </div>

      {/* Demo Area */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        {/* Input Word */}
        <div className="text-center">
          <div className="inline-block bg-blue-500/20 border border-blue-500/40 rounded-lg p-4">
            <div className="text-2xl japanese-text font-bold text-blue-400">
              {selectedWord.kanji}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedWord.kana} - "{selectedWord.meaning}"
            </div>
          </div>
        </div>

        {/* Processing Animation */}
        {animationPhase === 'processing' && (
          <div className="flex justify-center">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results Grid */}
        {animationPhase === 'results' && (
          <div className="grid grid-cols-2 gap-3">
            {visibleConjugations.map((form, index) => (
              <div
                key={form}
                className="bg-green-500/20 border border-green-500/40 rounded p-3 text-center animate-slideIn"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-sm text-green-400 font-medium">
                  {(strings.conjugation.forms as any)[form]}
                </div>
                <div className="japanese-text text-lg font-bold text-foreground">
                  {(conjugations as any)[form]}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Button */}
      {animationPhase === 'word' && (
        <div className="text-center">
          <TutorialButton
            onClick={demonstrateConjugation}
            variant="secondary"
            className="mb-4"
          >
            🪄 Cast Conjugation Spell!
          </TutorialButton>
          <p className="text-xs text-muted-foreground">
            (No vocabulary was harmed in this demonstration)
          </p>
        </div>
      )}

      {/* Continue Button */}
      {animationPhase === 'results' && (
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">
            🎉 Ta-da! One word became five forms instantly!
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            That's Impressive! What's Next? →
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
```

#### Technical Features
- **Real Conjugation Engine**: Uses actual `ConjugationEngine.conjugate()`
- **Staged Animation**: Word → Processing → Results with delays
- **Interactive Demo**: User triggers the conjugation demonstration
- **Visual Feedback**: Color-coded forms with smooth animations

---

### Screen 3: Lists & Organization Demo

#### Mock Interface Interaction
```typescript
// ListsScreen.tsx
export function ListsScreen({ onNext }: { onNext: () => void }) {
  const [demoPhase, setDemoPhase] = useState<'intro' | 'search' | 'save' | 'list' | 'complete'>('intro');
  const [mockSearchTerm, setMockSearchTerm] = useState('');
  const [savedWords, setSavedWords] = useState<string[]>([]);

  const demoWords = [
    { kanji: '読む', kana: 'よむ', meaning: 'to read' },
    { kanji: '書く', kana: 'かく', meaning: 'to write' },
    { kanji: '話す', kana: 'はなす', meaning: 'to speak' }
  ];

  const runListDemo = async () => {
    // Search simulation
    setDemoPhase('search');
    setMockSearchTerm('読');
    await sleep(800);
    setMockSearchTerm('読む');
    await sleep(1000);

    // Save simulation
    setDemoPhase('save');
    await sleep(1000);
    setSavedWords(['読む']);

    // Continue saving
    await sleep(800);
    setSavedWords(['読む', '書く']);
    await sleep(800);
    setSavedWords(['読む', '書く', '話す']);

    setDemoPhase('list');
    await sleep(1000);
    setDemoPhase('complete');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Become a Word Collector! 📚
        </h2>
        <p className="text-muted-foreground">
          Think of this as Pokémon, but instead of catching creatures, you're catching Japanese words.
          <span className="font-semibold text-primary"> Gotta learn 'em all! </span>
        </p>
      </div>

      {/* Mock App Interface */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Mock Navigation */}
        <div className="bg-primary/10 border-b border-border px-4 py-2">
          <div className="text-sm font-medium text-primary">Vocabulary Browser</div>
        </div>

        <div className="p-4 space-y-4">
          {/* Mock Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={mockSearchTerm}
                readOnly
                placeholder="Search Japanese words..."
                className="w-full px-3 py-2 border border-input rounded bg-background text-foreground"
              />
              {demoPhase === 'search' && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full"></div>
                </div>
              )}
            </div>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded">
              Search
            </button>
          </div>

          {/* Mock Search Results */}
          {(demoPhase === 'save' || demoPhase === 'list' || demoPhase === 'complete') && (
            <div className="space-y-2">
              {demoWords.slice(0, demoPhase === 'save' ? 1 : 3).map((word, index) => (
                <div
                  key={word.kanji}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded border animate-slideIn"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div>
                    <div className="japanese-text font-medium">{word.kanji}</div>
                    <div className="text-sm text-muted-foreground">
                      {word.kana} - {word.meaning}
                    </div>
                  </div>
                  <button
                    className={`px-3 py-1 text-xs rounded transition-all ${
                      savedWords.includes(word.kanji)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30'
                    }`}
                  >
                    {savedWords.includes(word.kanji) ? '✓ Saved!' : 'Save to List'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Mock List Pill */}
          {(demoPhase === 'list' || demoPhase === 'complete') && (
            <div className="pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground mb-2">Your Lists:</div>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-full animate-slideIn"
              >
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium text-blue-400">
                  Reading Verbs
                </span>
                <span className="text-xs text-muted-foreground">
                  ({savedWords.length})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {demoPhase === 'intro' && (
        <div className="text-center">
          <TutorialButton
            onClick={runListDemo}
            variant="secondary"
          >
            🔍 Show Me How Lists Work!
          </TutorialButton>
        </div>
      )}

      {demoPhase === 'complete' && (
        <div className="text-center space-y-2">
          <p className="text-primary font-medium">
            🎯 Perfect! You're now a certified word wrangler!
          </p>
          <p className="text-sm text-muted-foreground">
            Pro tip: Words in lists can be used for focused drill sessions
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            Ready for Practice Mode! 💪
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
```

#### Technical Highlights
- **Simulated User Flow**: Realistic search → save → organize sequence
- **Progressive Disclosure**: Information revealed step-by-step
- **State-Driven Animation**: Each phase triggers specific visual changes
- **Authentic UI**: Uses actual app styling and components

---

### Screen 4: Practice & Drill Flow

#### Dual Mode Demonstration
```typescript
// PracticeScreen.tsx
export function PracticeScreen({ onNext }: { onNext: () => void }) {
  const [currentMode, setCurrentMode] = useState<'intro' | 'practice' | 'drill' | 'complete'>('intro');
  const [drillQuestion, setDrillQuestion] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showResult, setShowResult] = useState(false);

  const demoWord = {
    kanji: '行く',
    kana: 'いく',
    meaning: 'to go',
    type: 'Irregular' as const
  };

  const runPracticeDemo = async () => {
    setCurrentMode('practice');
    await sleep(2000);
    setCurrentMode('drill');

    // Generate actual drill question
    const conjugations = ConjugationEngine.conjugate(demoWord);
    const question = {
      word: demoWord,
      targetForm: 'past',
      correctAnswer: conjugations.past,
      options: [conjugations.past, 'いった', 'いかった', 'いきた']
    };
    setDrillQuestion(question);
  };

  const handleAnswerSelect = async (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);
    await sleep(1500);
    setCurrentMode('complete');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-foreground">
          Two Ways to Master Japanese! 🥋
        </h2>
        <p className="text-muted-foreground">
          Choose your fighter: <span className="font-semibold text-blue-400">Study Mode</span> (the gentle sensei)
          or <span className="font-semibold text-red-400">Drill Mode</span> (the drill sergeant).
        </p>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'practice'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-border hover:border-blue-500/50'
        }`}>
          <div className="text-3xl mb-2">📚</div>
          <div className="font-medium text-blue-400">Practice Mode</div>
          <div className="text-xs text-muted-foreground mt-1">
            Study all conjugations peacefully
          </div>
        </div>

        <div className={`p-4 border rounded-lg text-center transition-all ${
          currentMode === 'drill'
            ? 'border-red-500 bg-red-500/10'
            : 'border-border hover:border-red-500/50'
        }`}>
          <div className="text-3xl mb-2">⚡</div>
          <div className="font-medium text-red-400">Drill Mode</div>
          <div className="text-xs text-muted-foreground mt-1">
            Test yourself with quizzes
          </div>
        </div>
      </div>

      {/* Demo Area */}
      <div className="bg-card border border-border rounded-lg p-6 min-h-[300px]">
        {currentMode === 'intro' && (
          <div className="text-center space-y-4 py-8">
            <div className="text-4xl">🤔</div>
            <p className="text-muted-foreground">
              Let's see both modes in action with the tricky verb "行く" (to go)
            </p>
            <TutorialButton
              onClick={runPracticeDemo}
              variant="secondary"
            >
              🎬 Start Demo!
            </TutorialButton>
          </div>
        )}

        {currentMode === 'practice' && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-2xl japanese-text font-bold text-foreground mb-2">
                {demoWord.kanji}
              </div>
              <div className="text-muted-foreground">
                {demoWord.kana} - "{demoWord.meaning}"
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {['Present: 行く', 'Past: 行った', 'Polite: 行きます', 'Te-form: 行って'].map((form, index) => (
                <div
                  key={form}
                  className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-center animate-slideIn"
                  style={{ animationDelay: `${index * 0.2}s` }}
                >
                  <div className="text-sm text-blue-400 font-medium">
                    {form.split(': ')[0]}
                  </div>
                  <div className="japanese-text text-lg font-bold">
                    {form.split(': ')[1]}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              📖 Study all forms at your own pace...
            </div>
          </div>
        )}

        {currentMode === 'drill' && drillQuestion && (
          <div className="space-y-4 animate-slideIn">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Quiz Time!</div>
              <div className="text-lg mb-4">
                <span className="japanese-text font-bold">{drillQuestion.word.kanji}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="text-red-400 font-bold">Past form?</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {drillQuestion.options.map((option: string, index: number) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === drillQuestion.correctAnswer;
                const showColors = showResult;

                return (
                  <button
                    key={index}
                    onClick={() => !showResult && handleAnswerSelect(option)}
                    disabled={showResult}
                    className={`p-3 border rounded text-center transition-all ${
                      showColors
                        ? isCorrect
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : isSelected
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-muted border-border text-muted-foreground'
                        : 'bg-background border-border hover:border-primary hover:bg-primary/10'
                    }`}
                  >
                    <div className="japanese-text font-bold">{option}</div>
                  </button>
                );
              })}
            </div>

            {showResult && (
              <div className="text-center">
                <p className={`font-medium ${
                  selectedAnswer === drillQuestion.correctAnswer
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}>
                  {selectedAnswer === drillQuestion.correctAnswer
                    ? '🎉 Correct! You nailed it!'
                    : '❌ Close! The answer was ' + drillQuestion.correctAnswer
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {currentMode === 'complete' && (
        <div className="text-center space-y-4">
          <div className="text-4xl">🏆</div>
          <p className="text-primary font-medium">
            Now you've seen both learning styles in action!
          </p>
          <p className="text-sm text-muted-foreground">
            Practice Mode = detailed study • Drill Mode = quick testing
          </p>
          <TutorialButton onClick={onNext} variant="primary">
            I'm Ready to Learn! 🚀
          </TutorialButton>
        </div>
      )}
    </div>
  );
}
```

#### Interactive Elements
- **Real Conjugation Logic**: Uses actual `ConjugationEngine`
- **Authentic Quiz Experience**: Simulates real drill questions
- **Progressive Reveal**: Shows practice → drill → results
- **Visual Feedback**: Color-coded correct/incorrect answers

---

### Screen 5: Success & Settings

#### Completion & Configuration
```typescript
// SuccessScreen.tsx
export function SuccessScreen({ onComplete }: { onComplete: () => void }) {
  const [settingsShown, setSettingsShown] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ColorScheme>('default');
  const [showRomaji, setShowRomaji] = useState(true);

  const themes: { name: ColorScheme; color: string; label: string }[] = [
    { name: 'default', color: '#6366f1', label: 'Classic' },
    { name: 'ocean', color: '#0ea5e9', label: 'Ocean' },
    { name: 'forest', color: '#22c55e', label: 'Forest' },
    { name: 'sunset', color: '#f97316', label: 'Sunset' }
  ];

  const handleSettingsDemo = () => {
    setSettingsShown(true);
  };

  const handleFinish = async () => {
    // Save onboarding completion
    if (typeof window !== 'undefined') {
      localStorage.setItem('doshi_onboarding_completed', 'true');
      localStorage.setItem('doshi_onboarding_date', new Date().toISOString());
    }

    // Apply selected settings if changed
    if (selectedTheme !== 'default' || !showRomaji) {
      // Would integrate with actual settings context
      console.log('Applying user preferences:', { selectedTheme, showRomaji });
    }

    onComplete();
  };

  return (
    <div className="space-y-6 p-6">
      {!settingsShown ? (
        // Success Screen
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="text-6xl animate-bounce">🎌</div>
            <div className="absolute -top-2 -right-2 text-2xl animate-pulse">🌟</div>
            <div className="absolute -bottom-2 -left-2 text-2xl animate-pulse delay-300">✨</div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">
              おめでとう！ Congratulations!
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              You're now equipped with the knowledge to conquer Japanese conjugations.
              <span className="font-semibold text-primary"> The verbs don't stand a chance! </span>
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-foreground">🎯 You're ready to:</h3>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Browse and save Japanese vocabulary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Study detailed conjugation patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Practice with intelligent drills</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Track your learning progress</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <TutorialButton
              onClick={handleSettingsDemo}
              variant="secondary"
              className="mb-2"
            >
              🎨 Quick Settings Preview
            </TutorialButton>
            <p className="text-xs text-muted-foreground">
              (Optional: Customize your experience)
            </p>
          </div>
        </div>
      ) : (
        // Settings Demo
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Make It Yours! 🎨
            </h2>
            <p className="text-muted-foreground">
              Quick settings to personalize your learning experience
            </p>
          </div>

          {/* Theme Selection Demo */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Choose Your Vibe:</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.name}
                  onClick={() => setSelectedTheme(theme.name)}
                  className={`p-3 border rounded-lg transition-all text-center ${
                    selectedTheme === theme.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  style={{
                    backgroundColor: selectedTheme === theme.name ? `${theme.color}10` : undefined,
                    borderColor: selectedTheme === theme.name ? theme.color : undefined
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: theme.color }}
                  ></div>
                  <div className="text-sm font-medium">{theme.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Romaji Toggle Demo */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-3">Learning Preferences:</h3>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="font-medium text-foreground">Show Romaji</div>
                <div className="text-sm text-muted-foreground">
                  Display romanized pronunciation (たべる → taberu)
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={showRomaji}
                  onChange={(e) => setShowRomaji(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    showRomaji ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      showRomaji ? 'translate-x-6' : 'translate-x-0.5'
                    } mt-0.5`}
                  ></div>
                </div>
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-2">Preview:</div>
            <div className="space-y-1">
              <div className="text-lg japanese-text font-bold" style={{ color: themes.find(t => t.name === selectedTheme)?.color }}>
                食べる
              </div>
              {showRomaji && (
                <div className="text-sm text-muted-foreground">taberu</div>
              )}
              <div className="text-sm text-foreground">"to eat"</div>
            </div>
          </div>
        </div>
      )}

      {/* Final Action */}
      <div className="text-center pt-4">
        {!settingsShown ? (
          <TutorialButton onClick={handleFinish} variant="primary" size="large">
            🚀 Start Learning Japanese!
          </TutorialButton>
        ) : (
          <div className="space-y-3">
            <TutorialButton onClick={handleFinish} variant="primary" size="large">
              Perfect! Let's Start Learning! 🎌
            </TutorialButton>
            <p className="text-xs text-muted-foreground">
              You can always change these settings later in the Settings page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Technical Features
- **Live Theme Preview**: Shows real-time color changes
- **Setting Persistence**: Stores user preferences
- **Smooth Transitions**: Animated theme switching
- **Accessibility**: Proper toggle controls and labels

---

## 🔧 Integration Guide

### Main App Integration

```typescript
// src/app/layout.tsx - Add onboarding check
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SettingsProvider>
          <AuthProvider>
            <OnboardingWrapper>
              {children}
            </OnboardingWrapper>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

// src/components/onboarding/OnboardingWrapper.tsx
export function OnboardingWrapper({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem('doshi_onboarding_completed');
    const isFirstVisit = !hasCompleted;

    // Show onboarding for new users or if manually triggered
    if (isFirstVisit || window.location.search.includes('tutorial=true')) {
      setShowOnboarding(true);
    }
  }, []);

  return (
    <>
      {children}
      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            setShowOnboarding(false);
            // Optional: redirect to specific page
            window.location.href = '/vocabulary';
          }}
        />
      )}
    </>
  );
}
```

### State Management Integration

```typescript
// src/hooks/useOnboardingState.ts
export function useOnboardingState() {
  const [state, setState] = useState<OnboardingState>({
    currentScreen: 0,
    isActive: false,
    hasCompleted: false,
    userInteractions: {
      demoWordClicked: false,
      listCreated: false,
      practiceStarted: false,
    },
    animationStates: {
      conjugationDemo: 'idle',
      listDemo: 'idle',
      practiceDemo: 'idle',
    },
  });

  const nextScreen = () => {
    setState(prev => ({
      ...prev,
      currentScreen: Math.min(prev.currentScreen + 1, 4)
    }));
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, hasCompleted: true }));

    // Track completion
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_completed', {
        event_category: 'engagement',
        event_label: 'tutorial_completion',
        screen_count: 5
      });
    }
  };

  return { state, nextScreen, completeOnboarding, setState };
}
```

---

## 📊 Analytics & Tracking

### Event Tracking Implementation

```typescript
// src/utils/onboardingAnalytics.ts
export class OnboardingAnalytics {
  static trackScreenView(screenIndex: number, screenName: string) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_screen_view', {
        event_category: 'onboarding',
        event_label: screenName,
        screen_index: screenIndex,
        custom_parameter_1: 'tutorial_flow'
      });
    }
  }

  static trackInteraction(interactionType: string, screenIndex: number) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_interaction', {
        event_category: 'onboarding',
        event_label: interactionType,
        screen_index: screenIndex
      });
    }
  }

  static trackDropOff(screenIndex: number, timeSpent: number) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_drop_off', {
        event_category: 'onboarding',
        event_label: 'tutorial_exit',
        screen_index: screenIndex,
        time_spent: timeSpent
      });
    }
  }

  static trackCompletion(totalTime: number, interactionCount: number) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'onboarding_completed', {
        event_category: 'onboarding',
        event_label: 'tutorial_success',
        total_time: totalTime,
        interaction_count: interactionCount,
        value: 1 // Successful onboarding has value
      });
    }
  }
}
```

### Key Metrics to Track

1. **Completion Rate**: % of users who finish all 5 screens
2. **Drop-off Points**: Which screens lose the most users
3. **Time per Screen**: Average time spent on each screen
4. **Interaction Rate**: % of users who engage with demos
5. **Setting Adoption**: Which themes/preferences users choose
6. **Return Engagement**: App usage after onboarding completion

---

## ♿ Accessibility Implementation

### Screen Reader Support

```typescript
// src/components/onboarding/AccessibleOnboarding.tsx
export function AccessibleOnboarding() {
  const [announcements, setAnnouncements] = useState<string>('');

  const announceScreenChange = (screenName: string, description: string) => {
    setAnnouncements(`${screenName}. ${description}`);
  };

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcements}
      </div>

      {/* Skip navigation for power users */}
      <button
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded"
        onClick={() => completeOnboarding()}
      >
        Skip Tutorial
      </button>

      {/* Main onboarding content with proper heading hierarchy */}
      <div role="dialog" aria-labelledby="onboarding-title" aria-modal="true">
        <h1 id="onboarding-title" className="sr-only">
          Doshi Sensei Tutorial
        </h1>
        {/* Screen content */}
      </div>
    </>
  );
}
```

### Keyboard Navigation

```typescript
// src/hooks/useKeyboardNavigation.ts
export function useKeyboardNavigation(onNext: () => void, onPrevious: () => void) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'Space':
        case 'Enter':
          event.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'Escape':
          // Allow users to exit tutorial
          if (confirm('Exit tutorial? You can restart it later from Settings.')) {
            window.location.reload();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [onNext, onPrevious]);
}
```

---

## ⚡ Performance Optimization

### Lazy Loading & Code Splitting

```typescript
// src/components/onboarding/index.ts
export const OnboardingModal = lazy(() => import('./OnboardingModal'));

// Use React.Suspense for loading states
function OnboardingWrapper() {
  return (
    <Suspense fallback={<OnboardingLoadingSpinner />}>
      <OnboardingModal />
    </Suspense>
  );
}
```

### Animation Performance

```css
/* src/styles/onboarding.css */
@media (prefers-reduced-motion: reduce) {
  .onboarding-container * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Optimize animations for 60fps */
.animate-slideIn {
  animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateZ(0); /* Force hardware acceleration */
}

.animate-bounce {
  animation: bounce 1s infinite;
  will-change: transform;
}

/* Efficient keyframes */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translate3d(0, 20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}
```

---

## 🚀 Deployment Guide

### Testing Checklist

```typescript
// __tests__/onboarding/onboarding-flow.test.tsx
describe('Onboarding Flow', () => {
  test('completes full 5-screen journey', async () => {
    render(<OnboardingModal onComplete={jest.fn()} />);

    // Screen 1: Welcome
    expect(screen.getByText('Welcome to Doshi Sensei!')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Let\'s Conjugate! 🚀'));

    // Screen 2: Conjugation Demo
    await waitFor(() => {
      expect(screen.getByText('Watch the Magic Happen ✨')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('🪄 Cast Conjugation Spell!'));

    // Continue through all screens...
    // Test each interaction and transition
  });

  test('tracks analytics events correctly', async () => {
    const mockGtag = jest.fn();
    (window as any).gtag = mockGtag;

    render(<OnboardingModal onComplete={jest.fn()} />);

    expect(mockGtag).toHaveBeenCalledWith('event', 'onboarding_screen_view', {
      event_category: 'onboarding',
      event_label: 'welcome',
      screen_index: 0
    });
  });

  test('handles keyboard navigation', async () => {
    render(<OnboardingModal onComplete={jest.fn()} />);

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByText('Watch the Magic Happen ✨')).toBeInTheDocument();
    });
  });
});
```

### A/B Testing Setup

```typescript
// src/utils/onboardingExperiments.ts
export function getOnboardingVariant(): 'control' | 'variant_a' | 'variant_b' {
  const userId = getUserId();
  const hash = simpleHash(userId);

  if (hash % 3 === 0) return 'control';
  if (hash % 3 === 1) return 'variant_a';
  return 'variant_b';
}

// Different variants for testing
export const ONBOARDING_VARIANTS = {
  control: {
    screenCount: 5,
    humor: 'high',
    interactivity: 'medium'
  },
  variant_a: {
    screenCount: 3,
    humor: 'low',
    interactivity: 'high'
  },
  variant_b: {
    screenCount: 4,
    humor: 'medium',
    interactivity: 'low'
  }
};
```

### Launch Strategy

1. **Soft Launch (10% of users)**
   - Monitor completion rates and drop-off points
   - Track performance metrics and error rates
   - Gather user feedback through post-tutorial survey

2. **Gradual Rollout (50% of users)**
   - Implement improvements based on soft launch data
   - A/B test different content variations
   - Monitor server load and client performance

3. **Full Release (100% of users)**
   - Deploy optimized version to all users
   - Set up automated monitoring alerts
   - Prepare rollback plan if issues arise

---

## 📝 Content Localization

### Text Management

```typescript
// src/config/onboardingStrings.ts
export const onboardingStrings = {
  en: {
    welcome: {
      title: "Welcome to Doshi Sensei!",
      subtitle: "Japanese verbs are like that friend who changes personality depending on the situation. Don't worry—we speak their language!",
      cta: "Let's Conjugate! 🚀"
    },
    conjugation: {
      title: "Watch the Magic Happen ✨",
      subtitle: "Our conjugation engine is like a grammar wizard—it takes one word and POOF! Transforms it into dozens of forms.",
      demo: "🪄 Cast Conjugation Spell!"
    }
    // ... more screens
  },
  ja: {
    welcome: {
      title: "動詞先生へようこそ！",
      subtitle: "日本語の動詞は状況によって姿を変える友達のようです。心配しないで—私たちは彼らの言語を話します！",
      cta: "活用しましょう！ 🚀"
    }
    // ... Japanese translations
  }
};
```

---

## 🎯 Success Metrics & KPIs

### Primary Metrics
- **Onboarding Completion Rate**: Target > 70%
- **Feature Adoption**: Users who create lists within 24h > 40%
- **Retention**: Day-7 retention for onboarded users > 50%

### Secondary Metrics
- **Time to Complete**: Average 2-3 minutes
- **Screen Drop-off**: No single screen > 20% drop-off
- **User Satisfaction**: Post-tutorial rating > 4.0/5.0

### Optimization Levers
1. **Reduce friction**: Fewer required interactions
2. **Increase engagement**: More interactive demonstrations
3. **Improve clarity**: Clearer explanations and visual cues
4. **Personalize content**: Dynamic content based on user level

---

## 🛠️ Technical Requirements Summary

### Dependencies
```json
{
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^3.3.0",
  "framer-motion": "^10.0.0", // For advanced animations
  "@testing-library/react": "^13.0.0",
  "@testing-library/jest-dom": "^5.16.0"
}
```

### Browser Support
- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: 60fps animations, <2s initial load

### File Size Budget
- **Total onboarding bundle**: <150KB gzipped
- **Individual screen components**: <20KB each
- **Animation assets**: <30KB total
- **Images/icons**: WebP format, <5KB each

---

## 📚 Developer Resources

### Quick Start Commands
```bash
# Create onboarding components
mkdir -p src/components/onboarding/{screens,components,hooks}

# Run tests
npm test -- --testPathPattern=onboarding

# Build with bundle analysis
npm run build && npm run analyze

# A11y testing
npm run test:a11y
```

### Useful Debugging

```typescript
// Debug onboarding state
window.debugOnboarding = {
  resetTutorial: () => localStorage.removeItem('doshi_onboarding_completed'),
  showTutorial: () => window.location.search = '?tutorial=true',
  skipToScreen: (n: number) => setState(prev => ({ ...prev, currentScreen: n }))
};
```

---

## 🎉 Conclusion

This onboarding implementation transforms new user experience from confusion to confidence through:

🎯 **Strategic Design**: 5 focused screens that build understanding progressively
🎨 **Engaging Content**: Humor and interactivity keep users interested
⚡ **Technical Excellence**: Real app integration with performance optimization
📊 **Data-Driven**: Comprehensive analytics for continuous improvement
♿ **Inclusive**: Accessibility-first design for all users

The result is a memorable first impression that turns curious visitors into engaged Japanese learners, setting the foundation for long-term app success.

*Ready to implement? Start with the `OnboardingWrapper` component and build screen by screen. The Japanese learning revolution begins with a single "Let's Conjugate!" click! 🚀*
