# Share with Friends - Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for the Share with Friends feature, organized into phases for incremental development and testing.

## Table of Contents

1. [Implementation Phases](#implementation-phases)
2. [Phase 1: Basic Sharing](#phase-1-basic-sharing-week-1)
3. [Phase 2: Referral System](#phase-2-referral-system-week-2)
4. [Phase 3: Social Media Integration](#phase-3-social-media-integration-week-3)
5. [Phase 4: Rewards & Analytics](#phase-4-rewards--analytics-week-4)
6. [Phase 5: Polish & Optimization](#phase-5-polish--optimization-week-5)
7. [Testing Strategy](#testing-strategy)
8. [Rollout Plan](#rollout-plan)

## Implementation Phases

```
Week 1: Basic Sharing ──────┐
                           │
Week 2: Referral System ────┼──────┐
                           │      │
Week 3: Social Integration ─┼──────┼────┐
                           │      │    │
Week 4: Rewards & Analytics ┼──────┼────┤
                           │      │    │
Week 5: Polish & Launch ────┴──────┴────┘
```

## Phase 1: Basic Sharing (Week 1)

### Day 1-2: Enhanced Share Button & Modal

#### 1. Create Share Service
```typescript
// /src/services/sharing/ShareService.ts
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
      if (method === 'native' && navigator.share) {
        await navigator.share({
          title: content.title,
          text: content.text,
          url: content.url
        });
        return true;
      }
      
      // Fallback methods
      return this.fallbackShare(content, method);
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }
  
  private fallbackShare(content: ShareContent, method: ShareMethod): boolean {
    switch (method) {
      case 'clipboard':
        return this.copyToClipboard(content);
      case 'twitter':
        return this.shareToTwitter(content);
      // ... other methods
    }
  }
}
```

#### 2. Create Share Modal Component
```typescript
// /src/components/sharing/ShareModal.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShare } from '@/hooks/useShare';

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { shareLink, isLoading, share } = useShare();
  const [selectedMethod, setSelectedMethod] = useState<ShareMethod>('native');
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Share Doshi Sensei</h2>
            
            {/* Share methods grid */}
            <ShareMethodGrid
              onSelect={setSelectedMethod}
              selected={selectedMethod}
            />
            
            {/* Share link input */}
            <ReferralLinkInput
              link={shareLink}
              onCopy={() => share('clipboard')}
            />
            
            {/* Share button */}
            <ShareButton
              method={selectedMethod}
              onClick={() => share(selectedMethod)}
              isLoading={isLoading}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

### Day 3-4: Share Hook & Integration

#### 1. Create useShare Hook
```typescript
// /src/hooks/useShare.ts
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ShareService } from '@/services/sharing/ShareService';

export function useShare() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const shareService = ShareService.getInstance();
  
  const shareLink = user 
    ? `${window.location.origin}?ref=${user.uid.slice(0, 8)}`
    : window.location.origin;
  
  const share = useCallback(async (method: ShareMethod) => {
    setIsLoading(true);
    try {
      const content = {
        title: 'Doshi Sensei - Learn Japanese',
        text: 'Check out this amazing app for learning Japanese!',
        url: shareLink
      };
      
      const success = await shareService.share(content, method);
      
      // Track share event
      if (success && user) {
        await trackShare(user.uid, method);
      }
      
      return success;
    } finally {
      setIsLoading(false);
    }
  }, [shareLink, user]);
  
  return { share, shareLink, isLoading };
}
```

#### 2. Update Settings Page
```typescript
// Update /src/app/settings/SettingsPage.tsx
import { ShareModal } from '@/components/sharing/ShareModal';

// Add state
const [showShareModal, setShowShareModal] = useState(false);

// Update share handler
const handleShareApp = () => {
  setShowShareModal(true);
};

// Add modal to JSX
<ShareModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
/>
```

### Day 5: Three-Pillar Integration

#### 1. Add to Feature Registry
```typescript
// /src/lib/features/registry.ts
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
}
```

#### 2. Add to Entitlement Rules
```typescript
// /src/lib/entitlements/rules.ts
// Guest users
daily: {
  share_app: 3,  // 3 shares per day
}

// Free users
daily: {
  share_app: 10, // 10 shares per day
}

// Premium users
daily: {
  share_app: -1, // Unlimited
}
```

## Phase 2: Referral System (Week 2)

### Day 6-7: Referral Code Generation

#### 1. Create Referral Service
```typescript
// /src/services/sharing/ReferralService.ts
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export class ReferralService {
  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a code
    const existing = await this.getUserReferralCode(userId);
    if (existing) return existing;
    
    // Generate new code
    const code = this.createUniqueCode(userId);
    
    // Save to Firestore
    await db.collection('referrals').add({
      referrerId: userId,
      referralCode: code,
      createdAt: new Date(),
      status: 'active'
    });
    
    return code;
  }
  
  private createUniqueCode(userId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}-${timestamp}-${random}`)
      .digest('hex');
    
    return hash.substring(0, 8).toUpperCase();
  }
}
```

#### 2. Create API Endpoints
```typescript
// /src/app/api/share/create-referral/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ReferralService } from '@/services/sharing/ReferralService';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    const referralService = new ReferralService();
    const referralCode = await referralService.generateReferralCode(userId);
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}?ref=${referralCode}`;
    
    return NextResponse.json({
      referralCode,
      shareLink
    });
  } catch (error) {
    console.error('Create referral error:', error);
    return NextResponse.json(
      { error: 'Failed to create referral' },
      { status: 500 }
    );
  }
}
```

### Day 8-9: Referral Tracking

#### 1. Track Referral on Signup
```typescript
// /src/app/auth/AuthWrapper.tsx
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function AuthWrapper({ children }) {
  const searchParams = useSearchParams();
  const referralCode = searchParams.get('ref');
  
  useEffect(() => {
    if (referralCode) {
      // Store in session for later use
      sessionStorage.setItem('referralCode', referralCode);
    }
  }, [referralCode]);
  
  return <>{children}</>;
}
```

#### 2. Process Referral on Account Creation
```typescript
// Update signup handler
async function handleSignup(email: string, password: string) {
  try {
    // Create account
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

### Day 10: Firestore Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Referrals collection
    match /referrals/{referralId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.referrerId;
      allow update: if false; // Referrals cannot be updated
    }
    
    // Referral conversions
    match /referralConversions/{conversionId} {
      allow read: if request.auth != null 
        && (request.auth.uid == resource.data.referrerId 
            || request.auth.uid == resource.data.referredUserId);
      allow create: if request.auth != null;
      allow update: if false; // Conversions cannot be updated
    }
  }
}
```

## Phase 3: Social Media Integration (Week 3)

### Day 11-12: Social Share Components

#### 1. Social Share URLs
```typescript
// /src/utils/socialShareUrls.ts
export const socialShareUrls = {
  twitter: (url: string, text: string) => 
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  
  facebook: (url: string) => 
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  
  whatsapp: (url: string, text: string) => 
    `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
  
  telegram: (url: string, text: string) => 
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  
  linkedin: (url: string, title: string) => 
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  
  email: (url: string, subject: string, body: string) => 
    `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body + '\n\n' + url)}`
};
```

#### 2. Social Share Button Component
```typescript
// /src/components/sharing/SocialShareButton.tsx
import { socialShareUrls } from '@/utils/socialShareUrls';

interface SocialShareButtonProps {
  platform: keyof typeof socialShareUrls;
  url: string;
  text?: string;
  title?: string;
  className?: string;
}

export function SocialShareButton({ 
  platform, 
  url, 
  text, 
  title,
  className 
}: SocialShareButtonProps) {
  const handleClick = () => {
    let shareUrl: string;
    
    switch (platform) {
      case 'twitter':
        shareUrl = socialShareUrls.twitter(url, text || '');
        break;
      case 'facebook':
        shareUrl = socialShareUrls.facebook(url);
        break;
      // ... other platforms
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    
    // Track social share
    trackShare(platform, url);
  };
  
  return (
    <button
      onClick={handleClick}
      className={`social-share-button ${platform} ${className}`}
      aria-label={`Share on ${platform}`}
    >
      <SocialIcon platform={platform} />
      <span>{platform}</span>
    </button>
  );
}
```

### Day 13-14: QR Code Generation

#### 1. Install QR Code Library
```bash
npm install qrcode react-qr-code
```

#### 2. Create QR Code Component
```typescript
// /src/components/sharing/QRCodeDisplay.tsx
import { QRCodeSVG } from 'qrcode';
import { useState } from 'react';

interface QRCodeDisplayProps {
  url: string;
  size?: number;
  includeImage?: boolean;
}

export function QRCodeDisplay({ url, size = 200, includeImage }: QRCodeDisplayProps) {
  const [imageError, setImageError] = useState(false);
  
  return (
    <div className="qr-code-container">
      <QRCodeSVG
        value={url}
        size={size}
        level="M"
        includeMargin={true}
        imageSettings={
          includeImage && !imageError
            ? {
                src: '/icon-192x192.png',
                x: undefined,
                y: undefined,
                height: 24,
                width: 24,
                excavate: true,
              }
            : undefined
        }
      />
      <p className="text-sm text-gray-600 mt-2">
        Scan to share Doshi Sensei
      </p>
    </div>
  );
}
```

### Day 15: Share Templates

#### 1. Create Template System
```typescript
// /src/utils/shareTemplates.ts
export interface ShareTemplate {
  id: string;
  type: 'achievement' | 'progress' | 'streak' | 'general';
  getMessage: (data: any) => string;
  getTitle: (data: any) => string;
}

export const shareTemplates: Record<string, ShareTemplate> = {
  achievement: {
    id: 'achievement',
    type: 'achievement',
    getMessage: (data) => 
      `I just unlocked "${data.achievementName}" on Doshi Sensei! 🏆`,
    getTitle: () => 'Achievement Unlocked!'
  },
  
  progress: {
    id: 'progress',
    type: 'progress',
    getMessage: (data) => 
      `I've learned ${data.kanjiCount} kanji and ${data.wordCount} words on Doshi Sensei! 📚`,
    getTitle: () => 'My Japanese Progress'
  },
  
  streak: {
    id: 'streak',
    type: 'streak',
    getMessage: (data) => 
      `${data.days} day learning streak on Doshi Sensei! 🔥 Join me in learning Japanese!`,
    getTitle: () => 'Learning Streak!'
  },
  
  general: {
    id: 'general',
    type: 'general',
    getMessage: () => 
      'Learning Japanese with Doshi Sensei - the best app for mastering conjugations! 🇯🇵',
    getTitle: () => 'Learn Japanese with Doshi Sensei'
  }
};
```

## Phase 4: Rewards & Analytics (Week 4)

### Day 16-17: Reward System

#### 1. Implement Reward Distribution
```typescript
// /src/services/sharing/RewardService.ts
import { db, FieldValue } from '@/lib/firebase';

export class RewardService {
  private readonly REFERRER_REWARD_DAYS = 7;
  private readonly REFERRED_REWARD_DAYS = 3;
  
  async distributeRewards(conversion: ReferralConversion): Promise<void> {
    const batch = db.batch();
    
    try {
      // Reward referrer
      const referrerRef = db.doc(`users/${conversion.referrerId}`);
      batch.update(referrerRef, {
        premiumDays: FieldValue.increment(this.REFERRER_REWARD_DAYS),
        totalReferrals: FieldValue.increment(1),
        lastReferralAt: new Date()
      });
      
      // Reward referred user
      const referredRef = db.doc(`users/${conversion.referredUserId}`);
      batch.update(referredRef, {
        premiumDays: FieldValue.increment(this.REFERRED_REWARD_DAYS),
        referredBy: conversion.referrerId,
        referredAt: new Date()
      });
      
      // Update conversion record
      const conversionRef = db.doc(`referralConversions/${conversion.id}`);
      batch.update(conversionRef, {
        rewardsDistributed: {
          referrer: true,
          referred: true
        },
        distributedAt: new Date()
      });
      
      await batch.commit();
      
      // Send notifications
      await this.sendRewardNotifications(conversion);
      
    } catch (error) {
      console.error('Failed to distribute rewards:', error);
      throw error;
    }
  }
}
```

#### 2. Create Cloud Function for Reward Processing
```typescript
// /functions/src/referralRewards.ts
import * as functions from 'firebase-functions';
import { RewardService } from './services/RewardService';

export const processReferralRewards = functions.firestore
  .document('referralConversions/{conversionId}')
  .onCreate(async (snapshot, context) => {
    const conversion = snapshot.data() as ReferralConversion;
    const rewardService = new RewardService();
    
    try {
      // Wait a bit to ensure user creation is complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Distribute rewards
      await rewardService.distributeRewards({
        ...conversion,
        id: context.params.conversionId
      });
      
      console.log(`Rewards distributed for conversion ${context.params.conversionId}`);
    } catch (error) {
      console.error('Failed to process referral rewards:', error);
      // Could implement retry logic here
    }
  });
```

### Day 18-19: Analytics Dashboard

#### 1. Create Analytics Service
```typescript
// /src/services/sharing/ShareAnalytics.ts
export class ShareAnalytics {
  async getUserShareStats(userId: string): Promise<UserShareStats> {
    const [shares, conversions] = await Promise.all([
      this.getShareEvents(userId),
      this.getConversions(userId)
    ]);
    
    return {
      totalShares: shares.length,
      sharesByMethod: this.groupByMethod(shares),
      totalConversions: conversions.length,
      conversionRate: conversions.length / shares.length || 0,
      rewardsEarned: conversions.length * 7, // 7 days per referral
      topPerformingMethod: this.getTopMethod(shares, conversions),
      recentActivity: this.getRecentActivity(shares, conversions)
    };
  }
  
  private groupByMethod(shares: ShareEvent[]): Record<string, number> {
    return shares.reduce((acc, share) => {
      acc[share.method] = (acc[share.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}
```

#### 2. Create Analytics Component
```typescript
// /src/components/sharing/ShareAnalytics.tsx
import { useShareAnalytics } from '@/hooks/useShareAnalytics';
import { BarChart, LineChart } from '@/components/charts';

export function ShareAnalytics() {
  const { stats, isLoading } = useShareAnalytics();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="share-analytics">
      <div className="stats-grid">
        <StatCard
          title="Total Shares"
          value={stats.totalShares}
          icon="🔗"
        />
        <StatCard
          title="Successful Referrals"
          value={stats.totalConversions}
          icon="👥"
        />
        <StatCard
          title="Conversion Rate"
          value={`${(stats.conversionRate * 100).toFixed(1)}%`}
          icon="📈"
        />
        <StatCard
          title="Premium Days Earned"
          value={stats.rewardsEarned}
          icon="🎁"
        />
      </div>
      
      <div className="charts">
        <BarChart
          data={stats.sharesByMethod}
          title="Shares by Method"
        />
        <LineChart
          data={stats.recentActivity}
          title="Share Activity (30 days)"
        />
      </div>
    </div>
  );
}
```

### Day 20: Achievement Integration

#### 1. Add Share Achievements
```typescript
// /src/lib/achievements/shareAchievements.ts
export const shareAchievements = [
  {
    id: 'first_share',
    category: 'sharing',
    name: 'Social Butterfly',
    description: 'Share Doshi Sensei for the first time',
    icon: '🦋',
    points: 10,
    requirement: {
      type: 'share_count',
      value: 1
    }
  },
  {
    id: 'share_streak_7',
    category: 'sharing',
    name: 'Consistent Sharer',
    description: 'Share 7 days in a row',
    icon: '📅',
    points: 25,
    requirement: {
      type: 'share_streak',
      value: 7
    }
  },
  {
    id: 'referral_champion',
    category: 'sharing',
    name: 'Referral Champion',
    description: 'Successfully refer 10 friends',
    icon: '🏆',
    points: 100,
    requirement: {
      type: 'referral_count',
      value: 10
    }
  }
];
```

## Phase 5: Polish & Optimization (Week 5)

### Day 21-22: UI Polish

#### 1. Add Loading States
#### 2. Error Handling
#### 3. Success Animations
#### 4. Mobile Optimization

### Day 23-24: Performance Optimization

#### 1. Implement Caching
#### 2. Lazy Loading
#### 3. Bundle Optimization
#### 4. Image Optimization

### Day 25: Testing & Bug Fixes

## Testing Strategy

### Unit Tests
```typescript
// Example test for referral code generation
describe('ReferralService', () => {
  it('should generate unique referral codes', async () => {
    const service = new ReferralService();
    const code1 = await service.generateReferralCode('user1');
    const code2 = await service.generateReferralCode('user2');
    
    expect(code1).toHaveLength(8);
    expect(code2).toHaveLength(8);
    expect(code1).not.toBe(code2);
  });
});
```

### Integration Tests
- Test share flow end-to-end
- Test referral conversion process
- Test reward distribution
- Test analytics tracking

### E2E Tests
- User shares via different methods
- New user signs up with referral code
- Rewards are properly distributed
- Analytics are accurately tracked

## Rollout Plan

### Phase 1: Internal Testing (Week 5)
- Deploy to staging environment
- Internal team testing
- Fix critical bugs

### Phase 2: Beta Release (Week 6)
- Release to 10% of users
- Monitor metrics and feedback
- Iterate on UI/UX

### Phase 3: Full Release (Week 7)
- Release to all users
- Marketing campaign
- Monitor performance

### Success Metrics
- Share rate > 10% of MAU
- Conversion rate > 5%
- No critical bugs in first week
- Positive user feedback

## Post-Launch Improvements

1. **A/B Testing**
   - Different reward amounts
   - Various share messages
   - UI variations

2. **Advanced Features**
   - Referral leaderboards
   - Time-limited campaigns
   - Tiered rewards

3. **Platform Expansion**
   - iOS/Android app integration
   - Browser extensions
   - API for partners