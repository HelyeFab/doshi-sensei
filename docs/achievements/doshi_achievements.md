# 🏆 Achievements System – Doshi Sensei

A comprehensive feature to gamify learning and boost user engagement through titles, badges, and stats tracking.

---

## 🎯 Goals

Encourage:
- ✅ Daily engagement
- ✅ Habit-building and repetition
- ✅ Learning by doing
- ✅ Collection behaviour (titles, badges, XP)

---

## 📦 Achievement Categories

| Category          | Trigger                        | Sample Achievement         | Reward         |
|------------------|--------------------------------|----------------------------|----------------|
| 🔥 Streaks        | Consecutive study days         | "Streak Master – 7 Days"   | Title           |
| 🧠 Drills         | Total drills completed         | "Drill Devotee – 100"      | Badge           |
| 💾 Word Saves     | Words saved to list            | "Word Collector – 500"     | Avatar          |
| 📝 Sentences Read | Sentences browsed/read         | "Reading Rookie – 50"      | XP              |
| 📚 Story Complete | Pages/stories read             | "Story Fan – 10 stories"   | Title           |
| 🔓 Hidden         | Easter egg actions             | "Curious Cat – Hidden"     | Secret title    |

---

## 🗃️ Firebase Firestore Structure

### ➤ Achievements Document

```json
/users/{uid}/achievements/{achievement_id} {
  "title": "Streak Master",
  "category": "streaks",
  "condition": "streak >= 7",
  "rewardType": "title",
  "rewardValue": "Streak Master",
  "unlocked": true,
  "unlockedAt": "2025-07-23T08:45:00Z"
}
```

### ➤ User Stats Document

```json
/users/{uid}/stats {
  "currentStreak": 5,
  "longestStreak": 10,
  "drillsCompleted": 87,
  "wordsSaved": 136,
  "sentencesRead": 40,
  "storiesCompleted": 3
}
```

---

## 🛠️ Trigger Logic

### ➤ On App Open (Login/Start of Day)
- If `lastStudyDate === yesterday`, increment `currentStreak`
- If not, reset `currentStreak` to 1
- Update `longestStreak` if necessary

### ➤ On Actions (e.g., Save Word, Finish Drill)
- Increment corresponding stat
- Compare to defined achievements
- If condition is met, unlock & assign reward

---

## 🧩 Reusable Definition

```ts
type Achievement = {
  id: string;
  category: string;
  condition: (stats: UserStats) => boolean;
  title: string;
  rewardType: "title" | "badge" | "xp" | "cosmetic";
  rewardValue: string;
};
```

```ts
const achievements: Achievement[] = [
  {
    id: "streak_7",
    category: "streaks",
    condition: (stats) => stats.currentStreak >= 7,
    title: "Streak Master",
    rewardType: "title",
    rewardValue: "Streak Master"
  },
  ...
];
```

---

## 👓 UI Suggestions

| UI Element         | Description                           |
|--------------------|---------------------------------------|
| 🏅 Achievements Page | Grid of unlocked & locked badges     |
| 🎉 Unlock Animation | Confetti when achievement is earned   |
| 🔔 Toasts           | "🎉 You unlocked: Streak Master!"     |
| 🧑 Profile Titles    | User can display earned titles        |
| 🎯 Progress Bars     | Visual counters for goals in progress |

---

## 📤 Notifications

- 🎉 Toast pop-up on unlock
- 📊 Optional: weekly email summary of progress (e.g., “3 new badges this week!”)

---

## 🚀 Phase 2 Ideas

- 🔁 Repeatable levels: “Drill Hero – Level 1 / 2 / 3”
- 🧩 Kanji-Quest unlockables
- 🎁 Cosmetic rewards (wallpapers, avatars)
- 🧭 Leaderboard for community bragging rights (opt-in)

---

_Last updated: 2025-07-23_