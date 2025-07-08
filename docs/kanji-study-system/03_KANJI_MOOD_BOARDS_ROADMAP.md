# 🗺️ Kanji Mood Boards MVP - Implementation Roadmap

## 📋 Project Overview

**Goal**: Implement a minimal viable version of kanji mood boards with 3 themed boards to test user engagement and learning effectiveness.

**Timeline**: 6-10 hours of development
**Branch**: `duo-doshi`
**Target Completion**: End of current development session

---

## 🎯 MVP Scope

### ✅ **Included in MVP**
- 3 mood boards (Nature, Daily Life, Numbers)
- Simple grid layout (no map visualization yet)
- Basic kanji flip cards with readings/examples
- Progress tracking per board
- Mobile-responsive design
- Integration with existing navigation

### ❌ **Not Included in MVP**
- Full map visualization
- Complex unlock systems
- Advanced study modes
- Audio pronunciations
- Spaced repetition integration
- Multiple JLPT levels

---

## 📁 File Structure

```
src/
├── app/
│   └── kanji-moods/
│       ├── page.tsx                    # Main mood boards grid
│       └── [boardId]/
│           └── page.tsx                # Individual mood board view
├── components/
│   └── kanji-moods/
│       ├── MoodBoardCard.tsx           # Board preview card
│       ├── MoodBoard.tsx               # Individual board layout
│       ├── KanjiCard.tsx               # Flip card component
│       └── ProgressIndicator.tsx       # Progress visualization
├── data/
│   └── moodBoards.json                 # Board definitions & kanji data
├── utils/
│   ├── moodBoardProgress.ts            # Progress tracking logic
│   └── moodBoardData.ts                # Data access utilities
└── types/
    └── moodBoard.ts                    # TypeScript interfaces
```

---

## 🚀 Implementation Phases

### **Phase 1: Core Data Structure** ⏱️ 30 mins
- [ ] Create TypeScript interfaces for mood boards
- [ ] Design JSON data structure for 3 mood boards
- [ ] Create sample data with N5 kanji
- [ ] Add data access utilities

### **Phase 2: Basic Components** ⏱️ 2 hours
- [ ] Create `MoodBoardCard` component (preview card)
- [ ] Create `KanjiCard` component with flip animation
- [ ] Create `ProgressIndicator` component
- [ ] Basic styling with existing design system

### **Phase 3: Main Pages** ⏱️ 2 hours
- [ ] Create main mood boards grid page (`/kanji-moods`)
- [ ] Create individual mood board page (`/kanji-moods/[boardId]`)
- [ ] Add navigation integration
- [ ] Implement routing logic

### **Phase 4: Functionality** ⏱️ 2 hours
- [ ] Implement progress tracking
- [ ] Add kanji flip interactions
- [ ] Board completion logic
- [ ] Local storage persistence

### **Phase 5: Polish & Testing** ⏱️ 1 hour
- [ ] Mobile responsiveness
- [ ] Animation polish
- [ ] Error handling
- [ ] Basic testing on different screen sizes

---

## 🎨 Design Specifications

### **Color Scheme per Board**
- 🌿 **Nature**: Green gradient (`#667eea` → `#764ba2`)
- 🏠 **Daily Life**: Blue gradient (`#ffecd2` → `#fcb69f`)
- 🔢 **Numbers**: Purple gradient (`#a8edea` → `#fed6e3`)

### **Component Layouts**

#### Mood Board Grid (Desktop)
```
┌─────────────────────────────────────────┐
│           Kanji Mood Boards             │
├─────────────┬─────────────┬─────────────┤
│     🌿      │     🏠      │     🔢      │
│   Nature    │ Daily Life  │  Numbers    │
│     N5      │     N5      │     N5      │
│  ●●●○○ 60%  │  ●●○○○ 40%  │  ○○○○○ 0%   │
└─────────────┴─────────────┴─────────────┘
```

#### Individual Mood Board
```
┌─────────────────────────────────────────┐
│  ← Back     🌿 Nature Board       3/5   │
├─────┬─────┬─────┬─────┬─────────────────┤
│  木 │  山 │  川 │  水 │       火        │
│tree │mount│river│water│      fire       │
│ ✓  │  ✓  │  ?  │  ?  │        ?        │
└─────┴─────┴─────┴─────┴─────────────────┘
```

---

## 📊 Data Structure

### **Mood Board JSON Schema**
```typescript
interface MoodBoard {
  id: string;
  title: string;
  emoji: string;
  jlpt: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
  background: string;
  description: string;
  kanji: KanjiItem[];
}

interface KanjiItem {
  char: string;
  meaning: string;
  readings: {
    on: string[];
    kun: string[];
  };
  examples: string[];
  difficulty: number; // 1-5
}
```

### **Progress Schema**
```typescript
interface BoardProgress {
  boardId: string;
  learnedKanji: string[]; // kanji characters
  completedAt?: Date;
  lastStudied: Date;
  totalKanji: number;
  progressPercentage: number;
}
```

---

## 🗃️ Sample Data Preview

### **Nature Board (5 Kanji)**
- 木 (tree) - Basic, very common
- 山 (mountain) - Geographic, fundamental
- 川 (river) - Geographic, pairs with 山
- 水 (water) - Element, essential daily vocab
- 火 (fire) - Element, complements 水

### **Daily Life Board (5 Kanji)**
- 人 (person) - Most fundamental
- 手 (hand) - Body part, high frequency
- 口 (mouth) - Body part, used in many compounds
- 目 (eye) - Body part, visual connection
- 耳 (ear) - Body part, completes sensory set

### **Numbers Board (5 Kanji)**
- 一 (one) - Most basic number
- 二 (two) - Pattern recognition
- 三 (three) - Completes basic sequence
- 四 (four) - Common daily number
- 五 (five) - Rounds out basic counting

---

## 🔗 Integration Points

### **Navigation Integration**
- Add "Mood Boards" to main navigation menu
- Use existing `PageHeader` component
- Follow current routing patterns

### **Styling Integration**
- Use existing CSS variables and design tokens
- Follow current component patterns
- Maintain consistency with existing cards/layouts

### **Data Integration**
- Use existing localStorage patterns
- Follow current progress tracking patterns
- Consider future integration with existing kanji data

---

## ✅ Definition of Done

### **Functional Requirements**
- [ ] User can view 3 mood boards in a grid
- [ ] User can click into individual mood boards
- [ ] User can flip kanji cards to see readings/examples
- [ ] User can mark kanji as learned
- [ ] Progress is tracked and persisted locally
- [ ] Board completion is tracked (5/5 kanji learned)

### **Technical Requirements**
- [ ] All TypeScript interfaces defined
- [ ] Components are reusable and well-structured
- [ ] Responsive design works on mobile/desktop
- [ ] No console errors or warnings
- [ ] Code follows existing patterns in the app

### **User Experience Requirements**
- [ ] Smooth animations for card flips
- [ ] Clear visual feedback for progress
- [ ] Intuitive navigation between views
- [ ] Loading states where appropriate
- [ ] Accessible design (keyboard navigation, screen readers)

---

## 🚀 Post-MVP Enhancements

### **Phase 2 Features** (Future)
- Full map visualization
- More mood boards (expand to 6-8 per JLPT level)
- Advanced study modes (MCQ, drawing practice)
- Audio pronunciations
- Spaced repetition integration

### **Phase 3 Features** (Future)
- Multi-JLPT level support
- Custom mood board creation
- Social features (sharing progress)
- Advanced analytics and insights
- Gamification elements (badges, streaks)

---

## 📝 Development Notes

### **Technical Decisions**
- Start with simple CSS animations instead of complex libraries
- Use localStorage for MVP, design for easy migration to IndexedDB/Firebase
- Keep components atomic and reusable for future expansion
- Follow existing app patterns for consistency

### **User Testing Goals**
- Measure engagement vs traditional flashcards
- Test intuitiveness of thematic groupings
- Validate progression satisfaction
- Identify most valuable features for Phase 2

---

*This roadmap will be updated as development progresses and new requirements emerge.*
