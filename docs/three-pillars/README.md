# Three Pillars Architecture Documentation

This folder contains comprehensive documentation for the Three Pillars architecture that powers the Doshi Sensei subscription and access control system.

## 🏗️ Architecture Overview

The Three Pillars architecture separates concerns into three distinct components:

```
Your App
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
┌─────────────────────────────────────────────────┐
│              Firestore Database                  │
│  • users/{uid}/subscription                     │
│  • users/{uid}/usage                           │
│  • config/entitlement_rules_v1  (Dynamic!)     │
└─────────────────────────────────────────────────┘
```

## 📚 Documentation Index

### Core Architecture
- **[01_ARCHITECTURE_OVERVIEW.md](./01_ARCHITECTURE_OVERVIEW.md)** - Complete system architecture and implementation plan
- **[02_ADMIN_DASHBOARD_DESIGN.md](./02_ADMIN_DASHBOARD_DESIGN.md)** - Admin dashboard for dynamic configuration

### The Three Pillars
- **[03_ENTITLEMENTS_PILLAR.md](./03_ENTITLEMENTS_PILLAR.md)** - User permissions and access control system
- **[04_FEATURES_PILLAR.md](./04_FEATURES_PILLAR.md)** - Feature registry and configuration management
- **[05_SUBSCRIPTIONS_PILLAR.md](./05_SUBSCRIPTIONS_PILLAR.md)** - Payment status and Stripe integration

### Implementation & Migration
- **[06_IMPLEMENTATION_CHECKLIST.md](./06_IMPLEMENTATION_CHECKLIST.md)** - Step-by-step implementation guide
- **[07_MIGRATION_STATUS.md](./07_MIGRATION_STATUS.md)** - Current migration status and progress
- **[08_USER_ENTITLEMENTS_GUIDE.md](./08_USER_ENTITLEMENTS_GUIDE.md)** - Visual guide to user entitlements

### Business & User Experience
- **[09_FEATURE_COMPENDIUM.md](./09_FEATURE_COMPENDIUM.md)** - Complete feature overview and business impact
- **[10_MODAL_SYSTEM_GUIDE.md](./10_MODAL_SYSTEM_GUIDE.md)** - User conversion and modal system guide

## 🎯 Key Benefits

### 1. **Clean Architecture**
- Three pillars clearly separated with distinct responsibilities
- Single source of truth for all access control
- No more scattered limits across the codebase

### 2. **Dynamic Configuration**
- Change limits without code deployments
- Admin dashboard for real-time configuration
- Feature flags and A/B testing support

### 3. **Automatic Tracking**
- Usage tracked automatically with `checkAndTrack()`
- No manual increment functions needed
- Centralized usage analytics

### 4. **Developer Experience**
- Simple hooks: `useAccess()`, `useFeature()`, `useSubscription2()`
- Type-safe access control
- Consistent patterns across components

## 🚀 Quick Start

### For React Components
```typescript
import { useAccess } from '@/hooks/useAccess';
import { useFeature } from '@/hooks/useFeature';
import { useSubscription2 } from '@/hooks/useSubscription2';

// Check access (automatically tracks usage)
const { checkAndTrack } = useAccess();
const canPlay = await checkAndTrack('kanji_quest');
if (!canPlay) {
  return; // Modals shown automatically
}

// Get feature info
const { feature, access, remaining } = useFeature('drill_practice');

// Get subscription status
const { isPremium, userType } = useSubscription2();
```

### For API Routes
```typescript
import { entitlementManager } from '@/lib/entitlements/manager';
import { subscriptionManager } from '@/lib/subscriptions/manager';
import { dynamicRules } from '@/lib/entitlements/dynamic-rules';

// Get user entitlements
const rules = await dynamicRules.getRules();
const userType = subscriptionManager.getUserType(subscription);
```

## 📁 Key Files in Codebase

### Core System
- `/src/lib/entitlements/` - Entitlement rules and manager
- `/src/lib/features/` - Feature registry and definitions
- `/src/lib/subscriptions/` - Subscription management
- `/src/lib/access/` - Unified access API

### React Hooks
- `/src/hooks/useAccess.ts` - Main access control hook
- `/src/hooks/useFeature.ts` - Feature-specific data
- `/src/hooks/useSubscription2.ts` - New subscription hook

### Admin Dashboard
- `/src/app/admin/features/page.tsx` - Feature matrix view
- `/src/components/admin/feature-matrix/` - Matrix components

## 🔄 Migration Status

### ✅ Completed Migrations
- News/Articles Pages
- Games (KanjiQuest, KanaDrop)
- Drill Page
- Stripe Webhooks
- All major components

### 🎉 System Health
- **Build Status**: ✅ Clean build, no errors
- **Old Code**: ✅ Completely removed
- **Production Ready**: ✅ Yes, fully operational
- **Admin Dashboard**: ✅ Dynamic limit editing active

## 🛠️ Admin Dashboard Features

The admin dashboard at `/admin/features` provides:

1. **Feature Matrix View** - See all features and limits across user types
2. **Dynamic Limit Editing** - Click any limit to change it (applies immediately)
3. **Export Functionality** - Export feature matrix as CSV or JSON
4. **Real-time Updates** - Changes propagate to all users instantly
5. **Usage Analytics** - Track feature usage and conversion impact

## 📊 User Types

- **Guest**: Non-registered users (limited access)
- **Free**: Registered users (basic limits)
- **Monthly/Yearly**: Premium users (unlimited access)
- **Admin**: Special role with dashboard access

## 🔍 Testing Checklist

- [x] Premium users can access all features
- [x] Free users see correct limits
- [x] Guest users see login prompts
- [x] Usage tracking works correctly
- [x] Admin dashboard functions properly
- [x] Dynamic limit changes apply immediately

## 📖 Additional Resources

- **Main Docs**: `/docs/CLAUDE.md` - Contains three pillars section
- **Subscription System**: `/docs/subscription-system/` - Original documentation
- **Implementation Notes**: Check git history for migration examples

---

**Last Updated**: January 2025
**Status**: ✅ Fully Implemented and Operational
**Architecture**: Three Pillars (Entitlements, Features, Subscriptions)
