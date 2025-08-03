# Share with Friends - Migration Guide

## Overview

This guide provides step-by-step instructions for migrating from the current basic share implementation to the comprehensive Share with Friends feature.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Migration Strategy](#migration-strategy)
3. [Phase 1: Backend Setup](#phase-1-backend-setup)
4. [Phase 2: Frontend Migration](#phase-2-frontend-migration)
5. [Phase 3: Feature Integration](#phase-3-feature-integration)
6. [Phase 4: Testing & Validation](#phase-4-testing--validation)
7. [Rollback Plan](#rollback-plan)
8. [Post-Migration Checklist](#post-migration-checklist)

## Current State Analysis

### Existing Implementation
Location: `/src/app/settings/SettingsPage.tsx` (lines 263-280)

```typescript
const handleShareApp = () => {
  if (navigator.share) {
    navigator.share({
      title: 'Doshi Sensei - Japanese Conjugation Practice',
      text: 'Check out this amazing app for learning Japanese verb and adjective conjugations!',
      url: window.location.origin
    });
  } else {
    const shareText = `Check out Doshi Sensei - an amazing app for learning Japanese conjugations! ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setSyncModal({
      show: true,
      type: 'success',
      title: 'Share Link Copied',
      message: 'Share link has been copied to your clipboard!'
    });
  }
};
```

### What's Missing
- ❌ Referral tracking
- ❌ Social media integration
- ❌ Analytics
- ❌ Rewards system
- ❌ Share templates
- ❌ QR codes
- ❌ User dashboard

## Migration Strategy

### Approach: Progressive Enhancement
1. **Keep existing functionality** working throughout migration
2. **Add new features** incrementally
3. **Test at each phase** before proceeding
4. **Monitor metrics** to ensure no regression

### Timeline
- Week 1: Backend infrastructure
- Week 2: Enhanced UI components
- Week 3: Referral system
- Week 4: Analytics & rewards
- Week 5: Testing & optimization

## Phase 1: Backend Setup

### Step 1.1: Database Schema

```bash
# 1. Add Firestore collections
```

```typescript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Add new rules for referrals
    match /referrals/{referralId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.referrerId;
    }
    
    match /referralConversions/{conversionId} {
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.referrerId 
            || request.auth.uid == resource.data.referredUserId);
      allow create: if request.auth != null;
    }
    
    match /shareEvents/{eventId} {
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.userId;
    }
  }
}
```

### Step 1.2: Add to Three-Pillar Architecture

```typescript
// 1. Update /src/lib/features/registry.ts
export const FEATURE_REGISTRY: FeatureRegistry = {
  // ... existing features
  
  'share_app': {
    id: 'share_app',
    name: 'Share App',
    description: 'Share Doshi Sensei with friends',
    category: 'system',
    icon: '🔗',
    limitType: 'daily',
    requiresAuth: false,
    requiresSubscription: false,
    status: 'active'
  },
  
  'referral_rewards': {
    id: 'referral_rewards',
    name: 'Referral Rewards',
    description: 'Earn rewards for successful referrals',
    category: 'system',
    icon: '🎁',
    limitType: 'none',
    requiresAuth: true,
    requiresSubscription: false,
    status: 'active'
  }
};

// 2. Update /src/lib/entitlements/rules.ts
// Guest users
guest: {
  daily: {
    share_app: 3,
  }
},

// Free users
free: {
  daily: {
    share_app: 10,
  }
},

// Premium users
premium: {
  daily: {
    share_app: -1, // Unlimited
  }
}

// 3. Update /src/lib/access/index.ts
const permissionMap: Record<string, string> = {
  // ... existing mappings
  'share_app': 'share_content',
  'referral_rewards': 'earn_rewards',
};
```

### Step 1.3: Create Services

```bash
# Create service directories
mkdir -p src/services/sharing
mkdir -p src/app/api/share
```

```typescript
// /src/services/sharing/ShareService.ts
import { db } from '@/lib/firebase';
import { ShareContent, ShareMethod } from '@/types/sharing';

export class ShareService {
  private static instance: ShareService;
  
  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }
  
  async share(content: ShareContent, method: ShareMethod): Promise<boolean> {
    try {
      // Track share event
      await this.trackShare(method, content);
      
      // Execute share
      if (method === 'native' && navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url
        });
        return true;
      }
      
      return this.fallbackShare(content, method);
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }
  
  private async trackShare(method: ShareMethod, content: ShareContent): Promise<void> {
    // Implementation from architecture doc
  }
}
```

## Phase 2: Frontend Migration

### Step 2.1: Create Component Structure

```bash
# Create component directories
mkdir -p src/components/sharing
mkdir -p src/components/sharing/hooks
```

### Step 2.2: Update Settings Page

```typescript
// /src/app/settings/SettingsPage.tsx

// 1. Add imports
import { ShareModal } from '@/components/sharing/ShareModal';
import { useShare } from '@/components/sharing/hooks/useShare';

// 2. Add state
const [showShareModal, setShowShareModal] = useState(false);

// 3. Update handler (backward compatible)
const handleShareApp = () => {
  // Check if new modal is enabled via feature flag
  if (process.env.NEXT_PUBLIC_NEW_SHARE_ENABLED === 'true') {
    setShowShareModal(true);
  } else {
    // Keep existing implementation
    if (navigator.share) {
      navigator.share({
        title: 'Doshi Sensei - Japanese Conjugation Practice',
        text: 'Check out this amazing app for learning Japanese verb and adjective conjugations!',
        url: window.location.origin
      });
    } else {
      const shareText = `Check out Doshi Sensei - an amazing app for learning Japanese conjugations! ${window.location.origin}`;
      navigator.clipboard.writeText(shareText);
      setSyncModal({
        show: true,
        type: 'success',
        title: 'Share Link Copied',
        message: 'Share link has been copied to your clipboard!'
      });
    }
  }
};

// 4. Add modal to JSX
{process.env.NEXT_PUBLIC_NEW_SHARE_ENABLED === 'true' && (
  <ShareModal
    isOpen={showShareModal}
    onClose={() => setShowShareModal(false)}
  />
)}
```

### Step 2.3: Implement Share Modal

```typescript
// /src/components/sharing/ShareModal.tsx
// Implementation from UI-COMPONENTS.md
```

## Phase 3: Feature Integration

### Step 3.1: Add Referral Tracking

```typescript
// 1. Update auth wrapper to capture referral codes
// /src/app/layout.tsx
import { ReferralProvider } from '@/contexts/ReferralContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ReferralProvider>
          {children}
        </ReferralProvider>
      </body>
    </html>
  );
}

// 2. Create referral context
// /src/contexts/ReferralContext.tsx
export function ReferralProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  useEffect(() => {
    if (referralCode) {
      // Store for later use
      sessionStorage.setItem('referralCode', referralCode);
      
      // Track click
      trackReferralClick(referralCode);
    }
  }, [referralCode]);
  
  return <>{children}</>;
}
```

### Step 3.2: Update Signup Flow

```typescript
// Update signup handler to process referrals
async function handleSignup(email: string, password: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Check for referral code
    const referralCode = sessionStorage.getItem('referralCode');
    if (referralCode) {
      await processReferralConversion(referralCode, user.uid);
      sessionStorage.removeItem('referralCode');
    }
    
    // Continue with normal signup flow
  } catch (error) {
    console.error('Signup error:', error);
  }
}
```

### Step 3.3: Add Cloud Functions

```typescript
// /functions/src/index.ts
import { processReferralRewards } from './referralRewards';
import { generateShareAnalytics } from './shareAnalytics';

export {
  processReferralRewards,
  generateShareAnalytics
};
```

```bash
# Deploy functions
firebase deploy --only functions:processReferralRewards,functions:generateShareAnalytics
```

## Phase 4: Testing & Validation

### Step 4.1: Create Test Suite

```typescript
// /src/components/sharing/__tests__/ShareModal.test.tsx
describe('ShareModal', () => {
  it('should display all share methods', () => {
    // Test implementation
  });
  
  it('should track share events', () => {
    // Test implementation
  });
  
  it('should generate correct referral links', () => {
    // Test implementation
  });
});
```

### Step 4.2: E2E Testing

```typescript
// /cypress/e2e/sharing.cy.ts
describe('Share with Friends', () => {
  it('should complete full share flow', () => {
    cy.visit('/settings');
    cy.contains('Share with Friends').click();
    cy.get('[data-testid="share-modal"]').should('be.visible');
    // ... continue test
  });
});
```

### Step 4.3: A/B Testing Setup

```typescript
// Enable gradual rollout
const ShareButton = () => {
  const variant = useABTest('share_modal_v2');
  
  if (variant === 'control') {
    return <OldShareButton />;
  }
  
  return <NewShareButton />;
};
```

## Rollback Plan

### Quick Rollback

```bash
# 1. Disable feature flag
NEXT_PUBLIC_NEW_SHARE_ENABLED=false

# 2. Revert cloud functions if needed
firebase functions:delete processReferralRewards
firebase functions:delete generateShareAnalytics

# 3. Keep data for analysis but disable UI
```

### Data Preservation

```typescript
// Keep collected data but disable features
const FEATURES_ENABLED = {
  referralTracking: false,
  shareAnalytics: false,
  rewardDistribution: false
};
```

## Post-Migration Checklist

### Technical Validation

- [ ] All share methods working
- [ ] Referral codes generating correctly
- [ ] Analytics tracking all events
- [ ] Rewards distributing properly
- [ ] No performance regression
- [ ] Mobile experience smooth
- [ ] Accessibility standards met

### Business Validation

- [ ] Share rate maintained or improved
- [ ] Conversion tracking accurate
- [ ] User feedback positive
- [ ] No increase in support tickets
- [ ] Analytics dashboards populated

### Monitoring Setup

```typescript
// Set up alerts
const alerts = {
  shareRateDropped: {
    threshold: 0.8, // 20% drop
    action: 'notify-team'
  },
  conversionRateAnomaly: {
    threshold: 0.5, // 50% change
    action: 'investigate'
  },
  errorRateHigh: {
    threshold: 0.05, // 5% errors
    action: 'rollback'
  }
};
```

### Documentation Updates

- [ ] Update user documentation
- [ ] Create admin guide
- [ ] Document API changes
- [ ] Update changelog
- [ ] Notify team of changes

## Migration Complete! 🎉

Once all phases are complete and validated:

1. Remove feature flags
2. Delete old code
3. Update documentation
4. Celebrate increased growth! 🚀