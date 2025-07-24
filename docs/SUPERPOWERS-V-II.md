# 🚀 SUPERPOWERS-V-II.md - The Complete Doshi Sensei Technical Bible

> **The Definitive Guide to Doshi Sensei's Architecture, Systems, and Implementation**  
> *Everything you need to know, from architecture to implementation details*

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [The Three-Pillar Architecture](#the-three-pillar-architecture)
3. [Storage Systems Deep Dive](#storage-systems-deep-dive)
4. [Analytics & Metrics](#analytics--metrics)
5. [Anki Integration & Flashcards](#anki-integration--flashcards)
6. [User Entitlements & Access Control](#user-entitlements--access-control)
7. [Implementation Patterns](#implementation-patterns)
8. [Admin Dashboard & Features](#admin-dashboard--features)
9. [Security & Performance](#security--performance)
10. [Development Workflow](#development-workflow)

---

## 🎯 System Overview

**Doshi Sensei** is a comprehensive Japanese language learning platform built with:
- **Next.js 15** with App Router and static export
- **TypeScript** in strict mode  
- **Tailwind CSS v4** with CSS variables
- **Firebase** for auth, database, and storage
- **IndexedDB** with localStorage fallback
- **Three-Pillar Architecture** for access control

### Key Statistics
- **User Types**: Guest, Free, Monthly ($3.99), Yearly ($39.99)
- **Features**: 20+ learning tools, 6 games, analytics, flashcards
- **Storage**: 8 IndexedDB stores, automatic migration
- **Offline**: Full PWA with smart caching
- **Analytics**: Admin-only aggregated insights

---

## 🏛️ The Three-Pillar Architecture

### Overview
The heart of Doshi Sensei - three interconnected systems working in harmony:

```
Your Component
    ↓
useAccess() / useFeature() / useSubscription2()
    ↓
Access Control API
    ↓
┌─────────────┐ ┌──────────────┐ ┌────────────────┐
│ Entitlements│ │   Features   │ │ Subscriptions  │
│   Manager   │ │   Registry   │ │    Manager     │
└─────────────┘ └──────────────┘ └────────────────┘
    ↓               ↓                   ↓
         Firestore Database + Admin Dashboard
```

### 1. **Entitlements Manager** (`/src/lib/entitlements/`)
- **Purpose**: Controls what users can do
- **Key Files**: `manager.ts`, `rules.ts`, `dynamic-rules.ts`
- **Dynamic Rules**: Admin can change limits without deployment
- **Usage Tracking**: Automatic increment and reset

### 2. **Features Registry** (`/src/lib/features/`)
- **Purpose**: Central catalog of all features
- **Key Files**: `registry.ts`, `manager.ts`, `types.ts`
- **Feature Definition**: Metadata, limits, requirements
- **Categories**: learning, games, storage, system

### 3. **Subscriptions Manager** (`/src/lib/subscriptions/`)
- **Purpose**: Payment status and user type management
- **Integration**: Stripe webhooks, subscription validation
- **User Types**: Maps subscription to entitlements

### The Magic Pattern
```typescript
// This ONE line handles EVERYTHING
const canProceed = await checkAndTrack('feature_name');

if (canProceed) {
  // User has access AND usage is tracked
  doTheWork();
}
// Modals shown automatically if no access
```

---

## 💾 Storage Systems Deep Dive

### Enhanced Storage Architecture

#### IndexedDB Structure (Primary)
```
DoshiSenseiDB
├── settings         // User preferences
├── progress         // Learning progress with SRS
├── studySessions    // Analytics data
├── recentlyViewed   // Quick access (100 items max)
├── vocabularyCache  // Offline support (7-day TTL)
├── apiCache         // Performance (1-hour TTL)
├── words            // Local vocabulary
└── drillSessions    // Session state

DoshiSenseiLargeData (Anki/Large Data)
└── savedStudyItems  // Anki cards and large datasets
```

#### Key Features
- **Automatic Fallback**: IndexedDB → localStorage
- **Migration**: Seamless upgrade from localStorage
- **Performance**: Strategic indexing, batch operations
- **Cache Management**: Auto-cleanup, TTL support
- **Storage Monitoring**: Usage analytics

#### Usage Pattern
```typescript
// Initialize once
await EnhancedStorageManager.initialize();

// Save/Load with automatic best storage selection
await EnhancedStorageManager.saveSettings(settings);
const settings = await EnhancedStorageManager.loadSettings();

// Advanced features (IndexedDB only)
await EnhancedStorageManager.cacheVocabularyData('N5', words);
const cachedWords = await EnhancedStorageManager.getCachedVocabularyData('N5');
```

### Firebase Storage Strategy

#### User Type Storage Matrix
| Feature | Guest | Free | Premium |
|---------|-------|------|---------|
| Storage Type | localStorage | IndexedDB | IndexedDB + Firebase |
| Sync | ❌ | ❌ | ✅ |
| Lists | 0 | 3 | Unlimited |
| Bookmarks | 0 | 5 | Unlimited |
| Cloud Backup | ❌ | ❌ | ✅ |

#### Firebase Collections
```
users/{uid}/
├── profile              // User data
├── subscription         // Payment info
├── userBookmarks        // Saved articles/stories
├── readingProgress      // Progress tracking
├── usageTracking        // Daily limits
├── featureUsage         // Feature counters
├── gameProgress         // Game saves
└── flashcardSRS         // SRS data (premium)

site-analytics/{date}/   // Admin-only
└── daily/aggregated     // All metrics in one doc
```

---

## 📊 Analytics & Metrics

### Admin-Only Analytics System

#### Architecture
```
User Activity → Analytics Events → Batching (5min/50 events)
    ↓
Firebase (site-analytics/{date}/daily/aggregated)
    ↓
Admin Dashboard (5 dedicated pages)
```

#### What Gets Tracked

**Content Metrics**
- Article/Story views and completions
- Reading time and scroll depth
- Moodboard and kanji views
- Content discovery patterns

**Feature Metrics**
- Game plays, scores, accuracy
- Drill completions and performance
- Flashcard sessions and retention
- List creation and usage

**Behavior Metrics**
- Page views and navigation
- Session duration and frequency
- Device types and regions
- Feature discovery

**Conversion Metrics**
- Feature limit events
- Upgrade modal interactions
- Registration sources
- Conversion funnels

#### Privacy & Implementation
```typescript
// Guest users - fully anonymous
{
  userId: 'anon_session_id',
  noPersonalData: true,
  aggregatedOnly: true
}

// Registered users - with consent
{
  userId: 'actual_user_id',
  respectsPrivacy: true,
  adminAccessOnly: true
}
```

#### Viewing Analytics
1. Firebase Console → Firestore
2. Navigate: `/site-analytics/2025-01-21/daily/aggregated`
3. See real-time aggregated metrics
4. Build visualizations in admin dashboard

---

## 📚 Anki Integration & Flashcards

### Overview
Premium-only feature bringing Anki's proven SRS to Doshi Sensei.

### Key Components

#### 1. **Import System**
- Drag-drop .apkg files (up to 200MB)
- Progress tracking during import
- Media files support (temporarily disabled)
- List count validation

#### 2. **Enhanced SRS Algorithm**
```typescript
// Anki-accurate SM-2 implementation
{
  learningSteps: [1, 10],        // minutes
  graduatingInterval: 1,         // days
  easyBonus: 1.3,               // multiplier
  intervalModifier: 1.0,         // 100%
  maximumInterval: 36500,        // days
  hardInterval: 1.2,            // multiplier
  
  // Lapses
  relearningSteps: [10],        // minutes
  minimumInterval: 1,           // days
  leechThreshold: 8,            // failures
  
  // Features
  fuzzFactor: true,             // Prevent same-day bunching
  overdueHandling: true,        // Delay adjustment
  previewNextReview: true       // Show on buttons
}
```

#### 3. **Storage Architecture**
```typescript
// Dual storage system
LocalStorage: {
  indexedDB: 'DoshiSenseiLargeData',
  store: 'savedStudyItems',
  fallback: 'localStorage'
}

CloudStorage: {
  premium: 'users/{uid}/flashcardSRS',
  sync: 'automatic',
  conflictResolution: 'last_write_wins'
}
```

#### 4. **Security**
- HTML sanitization (XSS prevention)
- Whitelist of safe tags/attributes
- CSS property filtering
- Event handler stripping

#### 5. **UI Components**
- `AnkiImportModal` - Import interface
- `FlashcardDisplay` - Sanitized rendering
- `SRSSettingsModal` - Algorithm config
- `SessionStats` - Progress tracking

### Integration with Three-Pillar
- Feature: `anki_import` (premium only)
- Usage: `flashcard_review` (shares drill limits)
- Access: Automatic modal prompts

---

## 👤 User Entitlements & Access Control

### User Types & Limits

#### Guest (Not Logged In)
```typescript
{
  storage: 'localStorage_only',
  sync: false,
  limits: {
    lists: 0,
    drillsPerDay: 3,
    gamesPerDay: 3,      // Each game separate
    storiesPerDay: 3,
    articlesPerDay: 3,
    bookmarks: 0,
    flashcardSessions: 3  // Shares with drills
  }
}
```

#### Free (Registered)
```typescript
{
  storage: 'indexedDB_only',
  sync: false,
  limits: {
    lists: 3,
    drillsPerDay: 3,
    gamesPerDay: 3,      // Each game separate
    storiesPerDay: 3,
    articlesPerDay: 3,
    bookmarks: 5,
    flashcardSessions: 3  // Shares with drills
  }
}
```

#### Premium (Monthly/Yearly)
```typescript
{
  storage: 'indexedDB_and_firebase',
  sync: true,
  limits: {
    all: 'unlimited',
    cloudBackup: true,
    ankiImport: true,
    advancedAnalytics: true,
    prioritySupport: true
  }
}
```

### Dynamic Limit Management

**🎯 CRITICAL UPDATE (January 2025)**: The system now uses **dynamic rules from Firestore**, not hardcoded values!

#### How It Works
1. **Initial Deployment**: Uses default limits from `/src/lib/entitlements/rules.ts`
2. **First Load**: Copies defaults to Firestore at `/config/entitlement_rules_v1`
3. **Runtime**: Always uses Firestore values (with 1-minute cache)
4. **Admin Edits**: Changes save to Firestore immediately
5. **User Access**: Next request uses updated limits

#### Admin Dashboard Features
Admin dashboard at `/admin/features` allows:
- **Real-time limit editing** - Click any number to change
- **Instant application** - No deployment needed
- **A/B testing** - Test different limits on the fly
- **Usage analytics** - See what limits work best
- **Export feature matrix** - CSV/JSON for analysis

#### Technical Implementation
```typescript
// Dynamic rules are loaded from Firestore
const rules = await dynamicRules.getRules();

// Falls back to hardcoded defaults only if Firestore fails
// Changes made in admin dashboard override all hardcoded values
```

#### Best Practices
1. **Set reasonable defaults** in code for new features
2. **Fine-tune via admin dashboard** based on usage
3. **Monitor analytics** to optimize limits
4. **Document changes** in admin activity log

---

## 🛠️ Implementation Patterns

### Component Pattern
```typescript
'use client';

import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';

export default function MyFeature() {
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining } = useFeature('my_feature');
  const { isPremium, userType } = useSubscription2();

  const handleAction = async () => {
    // One line handles everything!
    const canUse = await checkAndTrack('my_feature');
    
    if (canUse) {
      // Access granted, usage tracked
      performAction();
    }
    // Modals shown automatically
  };

  return (
    <div>
      {remaining && <p>Uses left today: {remaining}</p>}
      <button onClick={handleAction}>Use Feature</button>
    </div>
  );
}
```

### Storage Pattern
```typescript
// Always use Enhanced Storage Manager
import EnhancedStorageManager from '@/utils/storage';

// ✅ Correct - handles everything
await EnhancedStorageManager.saveData('key', data);

// ❌ Wrong - bypasses system
localStorage.setItem('key', JSON.stringify(data));
```

### Analytics Pattern
```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

function GameComponent() {
  const { trackGameComplete } = useAnalytics();
  
  const onGameEnd = (score: number, accuracy: number) => {
    trackGameComplete('kanji_quest', score, accuracy);
  };
}
```

---

## 🎛️ Admin Dashboard & Features

### Current Implementation
**✅ Fully Implemented:**
- User statistics and analytics
- Premium user management
- Mood board CRUD operations
- Activity logging and audit trails
- Mobile-responsive design
- Real-time data updates
- Feature matrix with dynamic editing
- 5 analytics dashboard pages

### Admin Pages
```
/admin/
├── overview          // Stats and user metrics
├── users            // User management
├── features         // Dynamic limit editing
├── analytics/       // 5 sub-pages
│   ├── overview     // Registration stats
│   ├── content      // Article/story metrics
│   ├── features     // Usage analytics
│   ├── behavior     // User patterns
│   └── conversions  // Upgrade funnels
├── mood-boards      // Content management
├── resources        // Resource CRUD
└── debug           // System diagnostics
```

### Feature Matrix Management
- Click any limit to edit in real-time
- Changes apply immediately (no deployment)
- Export as CSV/JSON
- A/B testing support

---

## 🔒 Security & Performance

### Security Measures

#### Access Control
- Firebase rules enforce permissions
- Admin-only collections protected
- User data isolation
- API endpoint validation

#### Content Security
- HTML sanitization for Anki cards
- XSS prevention in user content
- CORS configuration
- Input validation

#### Data Privacy
- Anonymous guest tracking
- No PII in analytics
- Encrypted transmission
- GDPR considerations

### Performance Optimizations

#### Storage
- IndexedDB with strategic indexes
- Batch operations for bulk data
- Cache expiration strategies
- Lazy loading for large datasets

#### Network
- API response caching (1 hour)
- Vocabulary caching (7 days)
- Delta sync for changes only
- Offline-first architecture

#### UI/UX
- Progressive enhancement
- Code splitting
- Image optimization
- Mobile-first design

---

## 💻 Development Workflow

### Quick Start Commands
```bash
# Development
npm run dev              # Start dev server
npm run test            # Run tests
npm run test:coverage   # Coverage report
npm run lint            # ESLint

# Production
npm run build           # Production build
npm run analyze         # Bundle analysis
npm run prepare-deploy  # Deployment prep
```

### Adding New Features - Complete Checklist

#### 1. Register in Feature Registry
```typescript
// /src/lib/features/registry.ts
'my_new_feature': {
  id: 'my_new_feature',
  name: 'My New Feature',
  description: 'Does something amazing',
  category: 'learning',  // learning, games, storage, system
  icon: '🌟',
  limitType: 'daily',    // 'daily', 'total', or 'none'
  requiresAuth: true,
  requiresSubscription: false,
  status: 'active',
  sharedLimitGroup: undefined  // Optional: share limits with other features
}
```

#### 2. Add Permission Mapping
```typescript
// /src/lib/access/index.ts
// In the permissionMap object within checkPermission method:
const permissionMap: Record<string, string> = {
  // ... existing mappings
  'my_new_feature': 'do_something',  // Map to appropriate permission
};
```

#### 3. Set Default Limits (CRITICAL - Now Dynamic!)
**Important**: Limits are now stored in Firestore and can be edited via admin dashboard.

**Option A - Quick Start (Use Admin Dashboard):**
1. Deploy with feature in registry
2. Go to `/admin/features`
3. Click "Edit Limits"
4. Set limits for each user type
5. Changes apply immediately

**Option B - Set Initial Defaults in Code:**
```typescript
// /src/lib/entitlements/rules.ts
// In ENTITLEMENT_RULES, add to each user type's limits:

// Guest limits
daily: {
  my_new_feature: 0,  // or appropriate limit
}

// Free limits
daily: {
  my_new_feature: 3,  // or appropriate limit
}

// Premium limits
daily: {
  my_new_feature: -1,  // -1 for unlimited, or specific number
}
```

**Note**: After first deployment, these become just initial defaults. All future changes should be made via admin dashboard at `/admin/features`.

#### 4. Build Component with Access Control
```typescript
export default function MyNewFeature() {
  const { checkAndTrack } = useAccess();
  const { feature, access, remaining } = useFeature('my_new_feature');
  
  const handleUse = async () => {
    // This ONE line checks access AND tracks usage
    if (await checkAndTrack('my_new_feature')) {
      // Feature logic here
    }
    // Modals shown automatically if no access
  };

  return (
    <div>
      {/* Show remaining uses for non-guest users */}
      {remaining !== undefined && (
        <p>Uses remaining today: {remaining}</p>
      )}
      <button onClick={handleUse}>Use Feature</button>
    </div>
  );
}
```

#### 5. Add Analytics (Optional but Recommended)
```typescript
const { track } = useAnalytics();

// Track when feature is used
track('feature_used', { 
  feature: 'my_new_feature',
  additionalData: 'if needed'
});

// Track specific events
track('my_feature_specific_event', {
  action: 'user_did_something',
  value: 42
});
```

#### 6. Test & Verify
- [ ] Feature appears in `/admin/features` matrix
- [ ] Limits can be edited dynamically
- [ ] Guest users see appropriate access restrictions
- [ ] Free users hit daily limits correctly
- [ ] Premium users get configured access
- [ ] Usage tracking increments properly
- [ ] Analytics events fire correctly
- [ ] Modals appear when limits reached

#### 7. Files That May Need Updates

**Required Files:**
1. `/src/lib/features/registry.ts` - Add feature definition
2. `/src/lib/access/index.ts` - Add permission mapping
3. Your component file - Implement with access control

**Optional Files (if setting initial defaults):**
4. `/src/lib/entitlements/rules.ts` - Initial limit values

**Files That Update Automatically:**
- Admin dashboard feature matrix - Auto-populated
- Usage tracking - Handled by checkAndTrack
- Analytics - If you use the hook
- Access modals - Shown automatically

**Dynamic Configuration:**
After deployment, all limit changes should be made via:
- Admin Dashboard: `/admin/features`
- Click "Edit Limits" → Click any number → Enter new value
- Changes save to Firestore and apply immediately
- No code changes or redeployment needed!

### Storage Development

#### Adding New Storage
```typescript
// 1. Update types
interface MyNewData {
  id: string;
  // ... fields
}

// 2. Create manager in indexedDB.ts
class MyDataManager {
  static async save(data: MyNewData) {
    // Implementation
  }
}

// 3. Add to EnhancedStorageManager
async saveMyData(data: MyNewData) {
  if (this.dbAvailable) {
    return MyDataManager.save(data);
  }
  // localStorage fallback
}
```

### Testing Patterns
```typescript
// Mock the three-pillar hooks
jest.mock('@/hooks/useAccess', () => ({
  useAccess: () => ({
    checkAndTrack: jest.fn().mockResolvedValue(true)
  })
}));

// Test storage with fake IndexedDB
import 'fake-indexeddb/auto';

// Test analytics
const mockTrack = jest.fn();
jest.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: () => ({ track: mockTrack })
}));
```

---

## 🚀 Advanced Topics

### PWA Configuration
```typescript
// next.config.ts
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    // Smart caching strategies
  }
});
```

### Migration Status
- ✅ Core three-pillar architecture
- ✅ Major features migrated
- ✅ Admin dashboard complete
- ✅ Analytics system live
- ✅ Anki integration complete
- ✅ 100% components migrated to new system

### Performance Benchmarks
- IndexedDB operations: <50ms
- Analytics batching: 5min/50 events
- Storage quota: ~50MB typical
- Firebase costs: <$1/month/user

---

## 📚 Key Files Reference

### Three-Pillar System
- `/src/lib/entitlements/` - User permissions
- `/src/lib/features/` - Feature definitions
- `/src/lib/subscriptions/` - Payment management
- `/src/lib/access/` - Unified API
- `/src/hooks/useAccess.ts` - Main hook
- `/src/hooks/useFeature.ts` - Feature data
- `/src/hooks/useSubscription2.ts` - User type

### Storage System
- `/src/utils/storage.ts` - Enhanced manager
- `/src/utils/indexedDB.ts` - Database implementation
- `/src/utils/largeDataStorage.ts` - Anki storage
- `/src/utils/cloudSync.ts` - Premium sync

### Analytics System
- `/src/lib/analytics/analyticsTracker.ts` - Core tracker
- `/src/hooks/useAnalytics.ts` - React hook
- `/src/app/admin/analytics/` - Dashboard pages

### Anki/Flashcards
- `/src/utils/ankiImporter.ts` - Import logic
- `/src/utils/ankiSRSImproved.ts` - Algorithm
- `/src/utils/flashcardSRSManager.ts` - Storage
- `/src/utils/htmlSanitizer.ts` - Security

### Admin Dashboard
- `/src/app/admin/` - All admin pages
- `/src/components/admin/` - Admin components
- `/src/hooks/useAdminStats.ts` - Real-time stats
- `/src/utils/adminStats.ts` - Calculations

---

## 🎯 Quick Decision Tree

### "Should I use localStorage or EnhancedStorageManager?"
**Always use EnhancedStorageManager** - it handles fallbacks automatically.

### "How do I add a new limited feature?"
1. Add to feature registry
2. Use `checkAndTrack()` 
3. That's it!

### "Where do I view analytics data?"
Firebase Console → site-analytics → {date} → daily → aggregated

### "How do I change feature limits?"
Admin dashboard → Features → Click any number to edit

### "Can free users sync data?"
No, only premium users get Firebase sync.

### "How do I test different user types?"
Use different accounts or mock the hooks in tests.

---

## 🎉 Conclusion

Doshi Sensei is a sophisticated, well-architected platform that balances powerful features with clean code. The three-pillar architecture ensures scalability, the storage system provides reliability, and the analytics give insights without compromising privacy.

**Remember the golden rule**: When in doubt, use the established patterns. The architecture is designed to guide you toward good decisions.

**Your mission**: Build features that delight users while maintaining the high standards set by this architecture.

---

*Last Updated: July 2025*  
*Version: 2.0*  
*Status: Production Ready*  
*Built with ❤️ for Japanese language learners worldwide*