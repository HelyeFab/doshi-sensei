# Share with Friends - API Reference

## Overview

This document provides a comprehensive API reference for all endpoints, data structures, and interfaces used in the Share with Friends feature.

## Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [Data Types & Interfaces](#data-types--interfaces)
3. [Firebase Functions](#firebase-functions)
4. [Client SDK Methods](#client-sdk-methods)
5. [Webhook Events](#webhook-events)
6. [Error Codes](#error-codes)

## REST API Endpoints

### Referral Management

#### POST /api/share/create-referral
Creates or retrieves a referral code for the authenticated user.

**Request:**
```typescript
{
  userId: string;
  campaign?: string;  // Optional campaign identifier
}
```

**Response:**
```typescript
{
  referralCode: string;
  shareLink: string;
  expiresAt?: string; // ISO date if expiration is set
}
```

**Example:**
```bash
curl -X POST https://doshisensei.com/api/share/create-referral \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"userId": "user123"}'
```

#### GET /api/share/validate-referral
Validates a referral code and returns referrer information.

**Query Parameters:**
- `code` (required): The referral code to validate

**Response:**
```typescript
{
  valid: boolean;
  referrerId?: string;
  campaign?: string;
  expiresAt?: string;
}
```

**Example:**
```bash
curl https://doshisensei.com/api/share/validate-referral?code=ABCD1234
```

### Share Tracking

#### POST /api/share/track
Records a share event for analytics.

**Request:**
```typescript
{
  userId: string;
  method: 'native' | 'clipboard' | 'twitter' | 'facebook' | 'whatsapp' | 'telegram' | 'email' | 'qr';
  content: {
    type: 'general' | 'achievement' | 'progress' | 'streak';
    templateId?: string;
    context?: any;
  };
  referralCode: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  eventId: string;
}
```

### Analytics

#### GET /api/share/stats/:userId
Retrieves sharing statistics for a specific user.

**Response:**
```typescript
{
  totalShares: number;
  sharesByMethod: {
    [method: string]: number;
  };
  conversions: number;
  conversionRate: number;
  rewardsEarned: number;
  topPlatform: string;
  lastShareDate: string;
  referralChain: {
    directReferrals: number;
    indirectReferrals: number;
  };
}
```

#### GET /api/share/leaderboard
Returns the top referrers.

**Query Parameters:**
- `period`: 'daily' | 'weekly' | 'monthly' | 'all-time'
- `limit`: number (default: 10, max: 100)

**Response:**
```typescript
{
  period: string;
  leaderboard: Array<{
    userId: string;
    displayName: string;
    avatar?: string;
    referrals: number;
    points: number;
    rank: number;
  }>;
  updatedAt: string;
}
```

### Rewards

#### POST /api/share/claim-reward
Claims pending referral rewards.

**Request:**
```typescript
{
  userId: string;
  conversionIds: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  claimedRewards: {
    premiumDays: number;
    achievements: string[];
    points: number;
  };
}
```

## Data Types & Interfaces

### Core Types

```typescript
// Share content types
interface ShareContent {
  title: string;
  text: string;
  url: string;
  image?: string;
  hashtags?: string[];
}

// Share method enumeration
type ShareMethod = 
  | 'native'
  | 'clipboard' 
  | 'twitter' 
  | 'facebook' 
  | 'whatsapp' 
  | 'telegram' 
  | 'email' 
  | 'qr';

// Share template types
type ShareTemplateType = 
  | 'general' 
  | 'achievement' 
  | 'progress' 
  | 'streak';
```

### Database Models

```typescript
// Referral document
interface Referral {
  id: string;
  referrerId: string;
  referralCode: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  status: 'active' | 'expired' | 'disabled';
  metadata: {
    source?: string;
    campaign?: string;
    customData?: Record<string, any>;
  };
  stats: {
    views: number;
    clicks: number;
    conversions: number;
  };
}

// Referral conversion document
interface ReferralConversion {
  id: string;
  referralCode: string;
  referrerId: string;
  referredUserId: string;
  convertedAt: Timestamp;
  rewardsDistributed: {
    referrer: boolean;
    referred: boolean;
  };
  rewards: {
    referrerDays: number;
    referredDays: number;
    referrerPoints?: number;
    referredPoints?: number;
  };
  metadata: {
    signupMethod: string;
    device: string;
    location?: string;
  };
}

// Share event document
interface ShareEvent {
  id: string;
  userId: string;
  timestamp: Timestamp;
  method: ShareMethod;
  content: {
    type: ShareTemplateType;
    templateId?: string;
    context?: any;
  };
  referralCode: string;
  result: {
    success: boolean;
    error?: string;
  };
  deviceInfo: {
    platform: string;
    userAgent: string;
    appVersion: string;
  };
  analytics: {
    sessionId: string;
    previousShares: number;
  };
}

// User share stats
interface UserShareStats {
  userId: string;
  totalShares: number;
  successfulShares: number;
  totalConversions: number;
  conversionRate: number;
  rewardsEarned: {
    premiumDays: number;
    points: number;
    achievements: string[];
  };
  sharesByMethod: Record<ShareMethod, number>;
  sharesByContent: Record<ShareTemplateType, number>;
  bestPerformingMethod: ShareMethod;
  bestPerformingContent: ShareTemplateType;
  streaks: {
    current: number;
    longest: number;
  };
  lastUpdated: Timestamp;
}
```

## Firebase Functions

### Triggered Functions

#### onReferralConversion
Triggered when a new referral conversion is created.

```typescript
export const onReferralConversion = functions.firestore
  .document('referralConversions/{conversionId}')
  .onCreate(async (snapshot, context) => {
    const conversion = snapshot.data() as ReferralConversion;
    
    // Process rewards
    await distributeRewards(conversion);
    
    // Update analytics
    await updateReferralAnalytics(conversion);
    
    // Send notifications
    await sendReferralNotifications(conversion);
  });
```

#### scheduledRewardProcessor
Runs daily to process pending rewards.

```typescript
export const scheduledRewardProcessor = functions.pubsub
  .schedule('0 2 * * *')  // 2 AM daily
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    await processPendingRewards();
    await cleanupExpiredReferrals();
    await generateDailyReports();
  });
```

### Callable Functions

#### generateShareLink
Generates a custom share link with tracking.

```typescript
export const generateShareLink = functions.https.onCall(async (data, context) => {
  const { content, campaign } = data;
  const userId = context.auth?.uid;
  
  if (!userId) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const referralCode = await getReferralCode(userId);
  const shareLink = await createShareLink(referralCode, content, campaign);
  
  return { shareLink, referralCode };
});
```

## Client SDK Methods

### ShareService Class

```typescript
class ShareService {
  /**
   * Initialize the share service
   */
  constructor(config?: ShareConfig);
  
  /**
   * Share content using specified method
   */
  share(content: ShareContent, method: ShareMethod): Promise<ShareResult>;
  
  /**
   * Get user's referral code
   */
  getReferralCode(): Promise<string>;
  
  /**
   * Get share templates
   */
  getTemplates(type?: ShareTemplateType): Promise<ShareTemplate[]>;
  
  /**
   * Track custom share event
   */
  trackShare(event: CustomShareEvent): Promise<void>;
  
  /**
   * Get user's share statistics
   */
  getStats(): Promise<UserShareStats>;
}
```

### React Hooks

```typescript
// useShare hook
function useShare(): {
  share: (method: ShareMethod, content?: ShareContent) => Promise<boolean>;
  shareLink: string;
  referralCode: string;
  isLoading: boolean;
  error: Error | null;
};

// useReferral hook
function useReferral(): {
  referralCode: string;
  referralLink: string;
  stats: ReferralStats;
  generateNewCode: () => Promise<string>;
  isLoading: boolean;
};

// useShareAnalytics hook
function useShareAnalytics(): {
  stats: UserShareStats;
  leaderboard: LeaderboardEntry[];
  refreshStats: () => Promise<void>;
  isLoading: boolean;
};
```

## Webhook Events

### Referral Events

#### referral.created
Fired when a new referral link is generated.

```json
{
  "event": "referral.created",
  "data": {
    "referralId": "ref_123",
    "userId": "user_123",
    "referralCode": "ABCD1234",
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

#### referral.converted
Fired when a referral results in a new user signup.

```json
{
  "event": "referral.converted",
  "data": {
    "conversionId": "conv_123",
    "referralCode": "ABCD1234",
    "referrerId": "user_123",
    "referredUserId": "user_456",
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

#### referral.rewarded
Fired when referral rewards are distributed.

```json
{
  "event": "referral.rewarded",
  "data": {
    "conversionId": "conv_123",
    "referrerId": "user_123",
    "rewards": {
      "premiumDays": 7,
      "points": 100
    },
    "timestamp": "2024-01-15T12:05:00Z"
  }
}
```

## Error Codes

### API Error Responses

```typescript
interface APIError {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Error Code Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_REFERRAL_CODE` | The provided referral code is invalid or expired | 400 |
| `REFERRAL_ALREADY_USED` | User has already used a referral code | 400 |
| `SELF_REFERRAL` | Users cannot refer themselves | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many share attempts | 429 |
| `UNAUTHORIZED` | User is not authenticated | 401 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions | 403 |
| `REFERRAL_NOT_FOUND` | Referral code does not exist | 404 |
| `REWARD_ALREADY_CLAIMED` | Rewards have already been claimed | 409 |
| `SERVICE_UNAVAILABLE` | Share service is temporarily unavailable | 503 |

### Example Error Response

```json
{
  "error": {
    "code": "INVALID_REFERRAL_CODE",
    "message": "The referral code 'XXXX' is invalid or has expired",
    "details": {
      "providedCode": "XXXX",
      "expirationDate": "2024-01-01T00:00:00Z"
    }
  }
}
```

## Rate Limiting

### Endpoint Limits

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| `/api/share/create-referral` | 10 requests | 1 hour |
| `/api/share/track` | 60 requests | 1 minute |
| `/api/share/validate-referral` | 100 requests | 1 minute |
| `/api/share/stats/*` | 30 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248000
```

## Versioning

The API uses URL versioning. Current version: `v1`

Example: `https://doshisensei.com/api/v1/share/create-referral`

### Deprecation Policy

- Deprecated endpoints will be marked with `Deprecation` header
- Minimum 3 months notice before removal
- Migration guide provided for breaking changes