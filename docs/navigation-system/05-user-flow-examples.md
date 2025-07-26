# User Flow Examples

## Overview

This document illustrates common navigation scenarios and how the new system handles them, comparing with the current behavior to highlight improvements.

## Flow 1: Game to Vocabulary Lookup

### Scenario
User is playing Kanji Quest and needs to check the meaning of a word they encountered.

### Current System ❌
```
1. User playing Kanji Quest (Level 3, Score: 250)
   → Game state in memory only

2. Sees unfamiliar word "建築" 
   → Clicks "Check Vocabulary"
   → Navigates to /vocabulary

3. Back button on vocabulary page
   → Returns to Home (/)
   → Game progress lost
   → User frustration 😞

4. User must:
   → Navigate to Games
   → Select Kanji Quest
   → Start from Level 1
```

### New System ✅
```
1. User playing Kanji Quest (Level 3, Score: 250)
   → Game state automatically preserved
   → Stack: [Home, Games, KanjiQuest]

2. Sees unfamiliar word "建築"
   → Clicks "Check Vocabulary" (SmartNavigationLink)
   → State saved: {level: 3, score: 250, currentWord: "建築"}
   → Navigates to /vocabulary
   → Stack: [Home, Games, KanjiQuest, Vocabulary]

3. Back button shows "← Back to Kanji Quest"
   → Click back
   → Returns to game
   → State restored automatically
   → Continues from exactly where they left 🎉

Navigation Stack:
[
  {path: "/", title: "Home"},
  {path: "/games", title: "Games"},
  {path: "/games/kanji-quest", title: "Kanji Quest", metadata: {gameState: {...}}},
  {path: "/vocabulary", title: "Vocabulary", metadata: {from: "/games/kanji-quest"}}
]
```

## Flow 2: Multi-Step Learning Journey

### Scenario
User exploring related content across multiple pages.

### Current System ❌
```
1. Reading article about Japanese food
2. Clicks linked vocabulary → /vocabulary
3. Clicks related kanji → /kanji-browser
4. Wants to go back to vocabulary
   → Back button → Home (/)
   → Lost context
   → Can't retrace steps
```

### New System ✅
```
1. Reading article → Stack: [Home, News, Article]
2. Clicks vocabulary → Stack: [..., Vocabulary]
3. Clicks kanji → Stack: [..., Vocabulary, KanjiBrowser]

Back button behavior:
- First click: "← Back to Vocabulary"
- Second click: "← Back to Article"
- Can navigate freely through history

Breadcrumbs shown:
Home > News > "Japanese Food Culture" > Vocabulary > Kanji Browser
```

## Flow 3: Form Data Preservation

### Scenario
User creating a study list, needs to check existing lists.

### Current System ❌
```
1. Creating new study list
   → Filled in name, description, added 10 words
2. Wants to check existing lists for duplicates
   → Navigates to Lists page
3. Back button → Home
   → Form data lost
   → Must re-enter everything
```

### New System ✅
```
1. Creating study list
   → Form state auto-saved to preservation service
2. Navigates to check lists
   → Stack: [Home, Practice, CreateList, Lists]
3. Back shows "← Back to Create List"
   → Form data restored
   → Continues where left off

Preserved State:
{
  formData: {
    name: "N3 Verbs",
    description: "Common verbs for JLPT N3",
    words: [...10 items]
  },
  scrollPosition: 450
}
```

## Flow 4: Mobile Quick Actions

### Scenario
Mobile user using swipe gestures for navigation.

### Current System ❌
```
- No swipe support
- Small back button target
- Must reach top of screen
- Often mis-taps
```

### New System ✅
```
Gesture: Swipe right from left edge
→ Animated preview of previous page
→ Complete swipe to navigate back
→ Cancel by swiping back left

Visual Feedback:
[====>                  ] 
"Swipe to go back to Games"

Alternative: Long-press back button
→ Shows navigation stack
→ Jump to any previous page
```

## Flow 5: Deep Admin Navigation

### Scenario
Admin editing multiple mood boards.

### Current System ❌
```
1. Admin Dashboard
2. Mood Boards List
3. Edit Mood Board A
4. Save → Returns to list
5. Edit Mood Board B
6. Wants to compare with A
   → Must navigate through entire flow again
```

### New System ✅
```
Navigation Stack (max depth: 5 for admin):
1. Admin Dashboard
2. Mood Boards
3. Edit "Spring Kanji"
4. Mood Boards (via breadcrumb)
5. Edit "Summer Kanji"

Can quickly switch between boards:
- Breadcrumbs: Admin > Mood Boards > Edit
- Back stack preserved
- State saved for each edit session
```

## Flow 6: Search Results Navigation

### Scenario
User searching through vocabulary, opening multiple results.

### Current System ❌
```
1. Search for "食"
2. Open first result
3. Back → Home (search lost)
4. Must search again
5. Repeat for each result
```

### New System ✅
```
1. Search for "食" → 25 results
   → Search state preserved
2. Open "食べる"
   → Stack: [Home, Vocabulary, Search("食"), Word("食べる")]
3. Back → Returns to search results
   → Search still active
   → Scroll position maintained
4. Open "食事"
   → Previous word state cleared (memory management)
   → Can still return to search
```

## Flow 7: Tutorial/Onboarding Flow

### Scenario
New user going through app tutorial.

### Current System ❌
```
- Fixed linear flow
- Can't go back to previous steps
- Leaving tutorial loses progress
```

### New System ✅
```
Tutorial Navigation:
1. Welcome → Stack: [Welcome]
2. Choose Level → Stack: [Welcome, ChooseLevel]
3. Try Sample → Stack: [Welcome, ChooseLevel, Sample]

Special Rules:
- Can go back within tutorial
- Leaving preserves progress
- Return shows "Continue Tutorial?"
- Complete or skip options
```

## Flow 8: Error Recovery

### Scenario
User encounters error page during navigation.

### Current System ❌
```
1. Navigating to practice
2. Error occurs
3. Error page shown
4. Only option: Go to Home
5. Lost context
```

### New System ✅
```
1. Error occurs
2. Error page shows:
   - "Go Back" (to previous working page)
   - "Go Home" (full reset)
   - Navigation stack intact
3. Can retry or choose different path
4. Stack cleaned if page repeatedly fails
```

## Navigation Patterns Summary

### Pattern 1: Temporary Detour
```
Game → Resource → Game
List → Help → List  
Form → Reference → Form
```
**Solution**: State preservation + smart back button

### Pattern 2: Progressive Exploration
```
Article → Vocabulary → Kanji → Examples
Overview → Detail → Related → Deep Dive
```
**Solution**: Breadcrumbs + navigation stack

### Pattern 3: Comparison Shopping
```
Item A → List → Item B → List → Item C
Board 1 → Index → Board 2 → Index
```
**Solution**: Quick navigation via stack

### Pattern 4: Interrupted Flow
```
Long Form → Interruption → Resume Form
Game → Phone Call → Resume Game
```
**Solution**: Persistent state preservation

## Metrics for Success

For each flow, we measure:
1. **Task Completion Rate**: % who complete intended action
2. **Navigation Efficiency**: # of clicks to complete task
3. **Error Rate**: # of wrong navigations
4. **Time to Complete**: Average time for flow
5. **User Satisfaction**: Post-task rating

Target improvements:
- -50% navigation errors
- -30% time to complete
- +40% task completion
- +35% satisfaction scores