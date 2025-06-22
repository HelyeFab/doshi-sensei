# 🎯 Freemium Access Flow & Conversion Strategy for Doshi Sensei

## 📘 Overview

This document outlines the ideal **user access flow and feature gating strategy** for your freemium Japanese learning app — Doshi Sensei. The goal is to strike a balance between:
- Allowing non-logged-in users to explore and enjoy the app
- Encouraging them to **register and log in**
- Gently nudging **conversion to premium** with natural incentives

---

## 🧩 User Types

| Type           | Can Access Features?                | Can Save Progress?  | Notes |
|----------------|-------------------------------------|----------------------|-------|
| Guest (no login) | ✅ Partial (limited access)         | ❌ No local save      | Encouraged to log in |
| Logged-in Free | ✅ Most (limited features)           | ✅ Local or synced    | Limit drill count, list size |
| Premium        | ✅ All                              | ✅ Cloud sync         | Unlocks all limitations |

---

## 🧭 Pages & Flows

### 1. 🧠 **Drill Page**

#### Features:
- Run drills from:
  - 📋 Saved lists (user-generated)
  - 🎲 Random drills (pre-defined word pool)

#### Flow:
| User Type | Access | Restrictions |
|-----------|--------|--------------|
| Guest     | ✅     | 2 drills per day, no saving |
| Free      | ✅     | 3 drills per day, up to 3 lists |
| Premium   | ✅     | Unlimited drills & lists, synced |

#### UX Suggestions:
- Show "You've reached your daily drill limit" toast/modal
- Show a counter: `Drills left today: 1 / 3`
- Use a friendly nudge: “Log in to save your progress” before the session ends

---

### 2. 📚 **Vocabulary Page**

#### Features:
- 🔍 Search any word
- 💾 Save to lists
- 🗃️ Create & organize vocab lists

#### Flow:
| User Type | Access | Restrictions |
|-----------|--------|--------------|
| Guest     | ✅     | No saving, no lists |
| Free      | ✅     | Max 3 lists |
| Premium   | ✅     | Unlimited lists, synced cloud storage |

#### UX Suggestions:
- Show banner: “Create a list to keep track of your vocab — Login required!”
- When user tries to save → show login modal

---

### 3. 🀄 **Kanji Page**

#### Features:
- JLPT kanji browser
- Mood board clusters
- Drill / practice mode per kanji

#### Flow:
| User Type | Access | Restrictions |
|-----------|--------|--------------|
| Guest     | ✅     | View-only, no favorites |
| Free      | ✅     | Save to 3 lists only |
| Premium   | ✅     | Full save + sync |

---

### 4. 📰 **News Page**

#### Features:
- Curated NHK Easy / Watanoc reading content
- Hover-to-translate
- Bookmark article or word

#### Flow:
| User Type | Access | Restrictions |
|-----------|--------|--------------|
| Guest     | ✅     | Read-only |
| Free      | ✅     | Bookmark up to 5 articles |
| Premium   | ✅     | Unlimited bookmarks, sync words from article to lists |

---

## 🎣 Key Engagement & Conversion Points

| Moment | Prompt | Reason |
|--------|--------|--------|
| After 2 drills (guest) | “Save your progress with a free account” | Natural break point |
| On first save attempt | Modal login prompt | Establish account for persistence |
| On reaching 3rd list | “Upgrade to Premium to create unlimited lists” | Encourages subscription |
| On syncing | “Cloud sync is a Premium feature” | Tangible benefit |

---

## 🛠️ Technical Implementation

### 1. `UserContext`

Track:
```ts
{
  status: 'guest' | 'free' | 'premium',
  drillsToday: number,
  vocabLists: KanjiList[],
  maxDrills: 2 | 3 | Infinity
}
```

### 2. `FeatureGate` Component

Wrap UI elements:
```tsx
<FeatureGate level="free">
  <DrillButton />
</FeatureGate>
```

### 3. Toast + Modal Nudges

Use component like:
```tsx
if (drillsToday >= maxDrills) {
  showToast("Drill limit reached. Login to continue!");
}
```

Or:
```tsx
if (!user.loggedIn) {
  showLoginModal("Save your results by creating an account.");
}
```

---

## 💰 Premium Value Reminders

- ✅ Cloud sync of lists and drills
- 📈 Unlimited study sessions
- 🏞️ Kanji Mood Boards unlocked early
- 🔒 Priority access to new features

Use soft onboarding and feature nudging to reinforce these benefits.

---

## ✅ Summary

| Page       | Guest Access | Free Access             | Premium Unlocks             |
|------------|--------------|--------------------------|------------------------------|
| Drill      | Limited drills, no save | 3 drills, 3 lists        | Unlimited + sync             |
| Vocabulary | Search only     | 3 vocab lists             | Unlimited lists              |
| Kanji      | Browse only     | Save to 3 lists           | Full save + practice         |
| News       | Read-only       | Bookmark 5 articles       | Unlimited + vocab sync       |

Implement this using a simple permission tier system (`guest`, `free`, `premium`) and show progressive unlock UX to nudge conversions naturally.
