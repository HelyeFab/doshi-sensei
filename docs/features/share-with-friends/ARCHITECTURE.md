# Share with Friends - Technical Architecture

## Overview

This document details the technical architecture of the Share with Friends feature, including data flow, component structure, and integration with existing systems.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Data Models](#data-models)
3. [Component Architecture](#component-architecture)
4. [Integration Points](#integration-points)
5. [Security Considerations](#security-considerations)
6. [Performance Optimization](#performance-optimization)

## System Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   User Device   │────▶│  Next.js App     │────▶│ Firebase        │
│                 │     │                  │     │ Backend         │
│ - Share Modal   │     │ - Share Service  │     │                 │
│ - QR Display    │     │ - Referral API   │     │ - Functions     │
│ - Social Links  │     │ - Analytics      │     │ - Firestore     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ▼                         ▼
         │              ┌──────────────────┐     ┌─────────────────┐
         └─────────────▶│ Social Platforms │     │ Analytics       │
                        │                  │     │ Dashboard       │
                        │ - Twitter       │     │                 │
                        │ - Facebook      │     │ - Conversions   │
                        │ - WhatsApp      │     │ - Share Metrics │
                        └──────────────────┘     └─────────────────┘
```

### Data Flow Diagram

```
1. User Initiates Share
         │
         ▼
2. Generate Referral Code
         │
         ▼
3. Create Share Content
         │
    ┌────┴────┐
    │         │
    ▼         ▼
4a. Native   4b. Social
   Share        Media
    │         │
    └────┬────┘
         │
         ▼
5. Track Share Event
         │
         ▼
6. Monitor Conversions
         │
         ▼
7. Distribute Rewards
```

## Data Models

### Firestore Collections

#### 1. Referrals Collection
```typescript
interface Referral {
  id: string;
  referrerId: string;           // User who shared
  referralCode: string;         // Unique 8-char code
  createdAt: Timestamp;
  expiresAt: Timestamp;         // Optional expiration
  status: 'active' | 'expired';
  metadata: {
    source?: string;            // Where it was shared from
    campaign?: string;          // If part of a campaign
  };
}
```

#### 2. Referral Conversions
```typescript
interface ReferralConversion {
  id: string;
  referralCode: string;
  referrerId: string;
  referredUserId: string;       // New user who signed up
  convertedAt: Timestamp;
  rewardsDistributed: {
    referrer: boolean;
    referred: boolean;
  };
  rewards: {
    referrerDays: number;       // Premium days for referrer
    referredDays: number;       // Premium days for new user
  };
}
```

#### 3. Share Analytics
```typescript
interface ShareEvent {
  id: string;
  userId: string;
  timestamp: Timestamp;
  method: 'native' | 'clipboard' | 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'email' | 'qr';
  content: {
    type: 'general' | 'achievement' | 'progress' | 'streak';
    context?: any;              // Additional context data
  };
  referralCode: string;
  deviceInfo: {
    platform: string;
    userAgent: string;
  };
}
```

#### 4. Share Templates
```typescript
interface ShareTemplate {
  id: string;
  type: 'achievement' | 'progress' | 'streak' | 'general';
  title: string;
  message: string;
  variables: string[];          // e.g., ['userName', 'achievementName']
  platforms: {
    twitter?: string;
    facebook?: string;
    whatsapp?: string;
    email?: {
      subject: string;
      body: string;
    };
  };
}
```

## Component Architecture

### Frontend Components

```
/src/components/sharing/
├── ShareButton.tsx              # Main share trigger button
├── ShareModal.tsx               # Full-featured share modal
├── ShareMethodGrid.tsx          # Grid of share options
├── QRCodeDisplay.tsx           # QR code generation
├── ReferralLinkInput.tsx       # Copy-able referral link
├── ShareAnalytics.tsx          # User's share stats
└── hooks/
    ├── useShare.ts             # Main sharing hook
    ├── useReferral.ts          # Referral management
    └── useShareAnalytics.ts    # Analytics tracking
```

### Service Layer

```typescript
// /src/services/sharing/ShareService.ts
export class ShareService {
  // Generate unique referral code
  generateReferralCode(userId: string): string;
  
  // Create shareable link
  createShareLink(referralCode: string, campaign?: string): string;
  
  // Track share event
  trackShare(userId: string, method: string, content: ShareContent): Promise<void>;
  
  // Get share templates
  getShareTemplates(type: string): Promise<ShareTemplate[]>;
  
  // Format message for platform
  formatShareMessage(template: ShareTemplate, data: any, platform: string): string;
}

// /src/services/sharing/ReferralService.ts
export class ReferralService {
  // Create new referral
  createReferral(userId: string): Promise<Referral>;
  
  // Validate referral code
  validateReferralCode(code: string): Promise<boolean>;
  
  // Process referral conversion
  processConversion(referralCode: string, newUserId: string): Promise<void>;
  
  // Distribute rewards
  distributeRewards(conversion: ReferralConversion): Promise<void>;
  
  // Get user's referral stats
  getUserReferralStats(userId: string): Promise<ReferralStats>;
}
```

### API Endpoints

```typescript
// /src/app/api/share/create-referral/route.ts
POST /api/share/create-referral
Request: { userId: string }
Response: { referralCode: string, shareLink: string }

// /src/app/api/share/track/route.ts
POST /api/share/track
Request: { 
  userId: string,
  method: string,
  content: ShareContent,
  referralCode: string
}
Response: { success: boolean }

// /src/app/api/share/validate-referral/route.ts
GET /api/share/validate-referral?code=XXXXXXXX
Response: { valid: boolean, referrerId?: string }

// /src/app/api/share/stats/route.ts
GET /api/share/stats/:userId
Response: { 
  totalShares: number,
  conversions: number,
  rewardsEarned: number,
  topPlatform: string
}
```

## Integration Points

### 1. Three-Pillar Architecture Integration

```typescript
// Add to Feature Registry
'share_referral': {
  id: 'share_referral',
  name: 'Share & Referral',
  description: 'Share app and earn rewards',
  category: 'system',
  icon: '🔗',
  limitType: 'daily',
  requiresAuth: true,
  requiresSubscription: false,
  status: 'active'
}

// Add to Entitlement Rules
daily: {
  share_referral: 10,  // Free users: 10 shares/day
}

// Premium users get unlimited shares
daily: {
  share_referral: -1,  // Unlimited
}
```

### 2. Achievement System Integration

```typescript
// Share-related achievements
const shareAchievements = [
  {
    id: 'first_share',
    name: 'Social Butterfly',
    description: 'Share Doshi Sensei for the first time',
    icon: '🦋',
    requirement: { shares: 1 }
  },
  {
    id: 'referral_master',
    name: 'Referral Master',
    description: 'Successfully refer 5 friends',
    icon: '🏆',
    requirement: { conversions: 5 }
  },
  {
    id: 'viral_sensation',
    name: 'Viral Sensation',
    description: 'Get 20 people to sign up through your referrals',
    icon: '🚀',
    requirement: { conversions: 20 }
  }
];
```

### 3. Notification System Integration

```typescript
// Notify on successful referral
await notificationService.send({
  userId: referrerId,
  type: 'referral_success',
  title: 'New Referral! 🎉',
  body: `Someone just signed up using your referral link! You've earned 7 days of premium.`,
  data: {
    conversionId,
    rewardDays: 7
  }
});

// Welcome notification for referred user
await notificationService.send({
  userId: newUserId,
  type: 'referral_welcome',
  title: 'Welcome to Doshi Sensei! 🎌',
  body: `Thanks for joining through a friend! Enjoy 3 days of premium features.`,
  data: {
    referrerId,
    rewardDays: 3
  }
});
```

### 4. Analytics Integration

```typescript
// Track in Google Analytics
gtag('event', 'share', {
  method: shareMethod,
  content_type: contentType,
  value: referralCode
});

// Custom analytics dashboard
const shareMetrics = {
  dailyShares: number,
  weeklyShares: number,
  monthlyShares: number,
  conversionRate: number,
  viralCoefficient: number,
  topShareMethods: string[],
  bestPerformingContent: string
};
```

## Security Considerations

### 1. Referral Code Generation
```typescript
// Secure code generation
function generateSecureReferralCode(userId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}-${timestamp}-${random}`)
    .digest('hex');
  
  // Take first 8 characters and make URL-safe
  return hash.substring(0, 8).toUpperCase();
}
```

### 2. Rate Limiting
```typescript
// Prevent spam sharing
const shareRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 shares per minute
  message: 'Too many share attempts'
});

// Prevent referral abuse
const referralRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 referral attempts per day
  keyGenerator: (req) => req.body.referralCode
});
```

### 3. Validation Rules
```typescript
// Validate referral conversions
async function validateConversion(referralCode: string, newUserId: string) {
  // Check if code exists and is active
  const referral = await getReferral(referralCode);
  if (!referral || referral.status !== 'active') {
    throw new Error('Invalid referral code');
  }
  
  // Prevent self-referrals
  if (referral.referrerId === newUserId) {
    throw new Error('Cannot refer yourself');
  }
  
  // Check for existing account
  const existingUser = await getUser(newUserId);
  if (existingUser.createdAt < referral.createdAt) {
    throw new Error('User existed before referral');
  }
  
  // Check for duplicate conversions
  const existingConversion = await getConversion(referralCode, newUserId);
  if (existingConversion) {
    throw new Error('Referral already claimed');
  }
}
```

## Performance Optimization

### 1. Caching Strategy
```typescript
// Cache referral codes
const referralCache = new Map<string, Referral>();

// Cache share templates
const templateCache = new Map<string, ShareTemplate>();

// Redis for distributed caching
const redis = new Redis({
  keyPrefix: 'share:',
  ttl: 3600 // 1 hour
});
```

### 2. Lazy Loading
```typescript
// Lazy load QR code library
const QRCodeGenerator = lazy(() => import('qrcode'));

// Lazy load social share SDKs
const FacebookSDK = lazy(() => import('@/lib/facebook-sdk'));
const TwitterSDK = lazy(() => import('@/lib/twitter-sdk'));
```

### 3. Database Indexes
```typescript
// Firestore indexes needed
{
  "indexes": [
    {
      "collectionGroup": "referrals",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "referrerId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "referralConversions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "referralCode", "order": "ASCENDING" },
        { "fieldPath": "convertedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### 4. Batch Operations
```typescript
// Batch reward distribution
async function distributeRewardsBatch(conversions: ReferralConversion[]) {
  const batch = firestore.batch();
  
  for (const conversion of conversions) {
    // Update referrer's premium days
    const referrerRef = firestore.doc(`users/${conversion.referrerId}`);
    batch.update(referrerRef, {
      premiumDays: FieldValue.increment(7)
    });
    
    // Update referred user's premium days
    const referredRef = firestore.doc(`users/${conversion.referredUserId}`);
    batch.update(referredRef, {
      premiumDays: FieldValue.increment(3)
    });
    
    // Mark rewards as distributed
    const conversionRef = firestore.doc(`referralConversions/${conversion.id}`);
    batch.update(conversionRef, {
      'rewardsDistributed.referrer': true,
      'rewardsDistributed.referred': true
    });
  }
  
  await batch.commit();
}
```