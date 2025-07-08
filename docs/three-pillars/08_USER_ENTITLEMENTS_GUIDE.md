# Doshi Sensei User Entitlements

## User Types & Progression

```mermaid
flowchart TD
    Guest["Guest<br/>No login<br/>LocalStorage only"]
    Free["Free User<br/>Login required<br/>LocalStorage + Firestore"]
    Premium["Premium User<br/>Paid subscription<br/>Firestore (cloud sync)"]
    Guest -->|"Register"| Free
    Free -->|"Upgrade"| Premium
    style Guest fill:#f9f,stroke:#333,stroke-width:2px
    style Free fill:#bbf,stroke:#333,stroke-width:2px
    style Premium fill:#bfb,stroke:#333,stroke-width:2px
```

---

## Feature Matrix

| Feature                | Guest      | Free         | Premium      |
|------------------------|------------|--------------|--------------|
| Word Lists             | 0 (view)   | 3            | Unlimited    |
| Drills per Day         | 3          | 3            | Unlimited    |
| Kanji Quest/Day        | 3          | 3            | Unlimited    |
| Stories/Day            | 3          | 3            | Unlimited    |
| Articles/Day           | 3          | 3            | Unlimited    |
| Bookmarks (Articles)   | 0          | 5            | Unlimited    |
| **Games:**             |            |              |              |
| - Kana Drop Game/Day   | 3          | 3            | Unlimited    |
| - Pokemon Kanji Quest/Day | 3      | 3            | Unlimited    |
| - Other Games/Day      | 3          | 3            | Unlimited    |
| Save Progress          | ❌         | ✅ (local)    | ✅ (cloud)   |
| Cloud Sync             | ❌         | ❌           | ✅           |
| Advanced Analytics     | ❌         | ❌           | ✅           |
| Priority Support       | ❌         | ❌           | ✅           |

---

## Feature Breakdown by Page

```mermaid
flowchart TD
    Drill["Drill Page"]
    Vocab["Vocabulary Page"]
    Kanji["Kanji Page"]
    News["News Page"]
    Guest["Guest"]
    Free["Free"]
    Premium["Premium"]
    Drill -->|"Guest: 2-3/day, no save\nFree: 3/day, 3 lists\nPremium: Unlimited, synced"| Guest
    Drill --> Free
    Drill --> Premium
    Vocab -->|"Guest: No save\nFree: 3 lists\nPremium: Unlimited lists, sync"| Guest
    Vocab --> Free
    Vocab --> Premium
    Kanji -->|"Guest: View only\nFree: Save to 3 lists\nPremium: Full save + sync"| Guest
    Kanji --> Free
    Kanji --> Premium
    News -->|"Guest: Read only\nFree: 5 bookmarks\nPremium: Unlimited, sync words"| Guest
    News --> Free
    News --> Premium
    style Guest fill:#f9f,stroke:#333,stroke-width:2px
    style Free fill:#bbf,stroke:#333,stroke-width:2px
    style Premium fill:#bfb,stroke:#333,stroke-width:2px
```

---

## Usage Limits (Visual)

```mermaid
flowchart TD
    Guest["Guest"]
    Free["Free"]
    Premium["Premium"]
    Guest --> GLists["Lists: 0"]
Guest --> GDrills["Drills/day: 3"]
Guest --> GSave["Save: ❌"]
Guest --> GSync["Sync: ❌"]
Guest --> GBookmarks["Bookmarks: 0"]
Guest --> GGames["Games/day: 3"]
Free --> FLists["Lists: 3"]
Free --> FDrills["Drills/day: 3"]
Free --> FSave["Save: ✅ (local)"]
Free --> FSync["Sync: ❌"]
Free --> FBookmarks["Bookmarks: 5"]
Free --> FGames["Games/day: 3"]
Premium --> PLists["Lists: ∞"]
Premium --> PDrills["Drills/day: ∞"]
Premium --> PSave["Save: ✅ (cloud)"]
Premium --> PSync["Sync: ✅"]
Premium --> PBookmarks["Bookmarks: ∞"]
Premium --> PGames["Games/day: ∞"]
    style Guest fill:#f9f,stroke:#333,stroke-width:2px
    style Free fill:#bbf,stroke:#333,stroke-width:2px
    style Premium fill:#bfb,stroke:#333,stroke-width:2px
```

---

## How Entitlements Are Enforced

```mermaid
flowchart TD
    FeatureGate["FeatureGate Component"]
    SubscriptionContext["SubscriptionContext"]
    FirestoreRules["Firestore Security Rules"]
    API["/api/validate-feature-access"]
    UI["UI/UX Prompts"]
    FeatureGate -->|"Checks userType, feature, usage"| SubscriptionContext
    SubscriptionContext -->|"Reads limits, usage, plan"| FirestoreRules
    FeatureGate -->|"Blocks/Prompts if denied"| UI
    UI -->|"Show login/upgrade modal"| FeatureGate
    API -->|"Server-side validation"| FirestoreRules
    API -->|"Used for critical actions"| FeatureGate
    style FeatureGate fill:#bbf,stroke:#333,stroke-width:2px
    style SubscriptionContext fill:#bfb,stroke:#333,stroke-width:2px
    style FirestoreRules fill:#f9f,stroke:#333,stroke-width:2px
    style API fill:#ffd,stroke:#333,stroke-width:2px
    style UI fill:#fff,stroke:#333,stroke-width:2px
```

- **Frontend:**
  - `FeatureGate` and hooks like `useFreemiumLimits` check user type, plan, and usage before allowing actions.
  - If a user hits a limit, the UI shows a login or upgrade prompt.
- **Backend:**
  - Firestore security rules enforce limits at the data layer.
  - Critical actions (like incrementing usage) are validated server-side via API endpoints.

---

## Admin Entitlements

```mermaid
flowchart TD
    Admin["Admin"]
    GrantPremium["Grant Premium Access"]
    User["User"]
    Admin -->|"Run script or dashboard"| GrantPremium
    GrantPremium -->|"Update Firestore: unlimited lists, drills, sync"| User
    style Admin fill:#ffd,stroke:#333,stroke-width:2px
    style GrantPremium fill:#bbf,stroke:#333,stroke-width:2px
    style User fill:#bfb,stroke:#333,stroke-width:2px
```

- Admins can grant premium access to any user (via script or dashboard).
- Premium grants provide unlimited lists, drills, and enable cloud sync.

---

## Security & Best Practices

- **Firestore rules**: Only allow users to access their own data; only premium users get unlimited features and sync.
- **Server-side validation**: All critical feature checks are validated on the backend.
- **Upgrade/Conversion UX**: Users are gently nudged to register or upgrade when they hit limits.

---

**For more technical details or code snippets, see the relevant files in `src/contexts/SubscriptionContext.tsx`, `src/components/FeatureGate.tsx`, and `src/types/subscription.ts`.**
