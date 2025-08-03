# Share with Friends - Analytics & Tracking Guide

## Overview

This document details the analytics implementation for the Share with Friends feature, including event tracking, metrics, dashboards, and reporting.

## Table of Contents

1. [Key Metrics](#key-metrics)
2. [Event Tracking](#event-tracking)
3. [Analytics Implementation](#analytics-implementation)
4. [Dashboard Design](#dashboard-design)
5. [Reporting & Insights](#reporting--insights)
6. [A/B Testing Framework](#ab-testing-framework)
7. [Privacy & Compliance](#privacy--compliance)

## Key Metrics

### Primary KPIs

#### 1. Viral Coefficient (K-Factor)
```
K = i × c
where:
- i = average number of invites sent per user
- c = conversion rate of invites
```

**Target**: K > 1.0 for viral growth

#### 2. Share-to-Signup Conversion Rate
```
Conversion Rate = (New Signups from Referrals / Total Shares) × 100
```

**Target**: 5-10% conversion rate

#### 3. Time to Conversion
Average time between share and signup completion.

**Target**: < 24 hours for 50% of conversions

### Secondary Metrics

```typescript
interface ShareMetrics {
  // Engagement Metrics
  dailyActiveSharers: number;
  averageSharesPerUser: number;
  shareMethodDistribution: Record<ShareMethod, number>;
  
  // Conversion Metrics
  referralSignups: number;
  referralActivations: number; // Completed onboarding
  referralRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  
  // Value Metrics
  ltv: {
    referredUsers: number;
    organicUsers: number;
    uplift: number; // % increase
  };
  revenueFromReferrals: number;
  
  // Quality Metrics
  referralChurnRate: number;
  nps: {
    referredUsers: number;
    referrers: number;
  };
}
```

## Event Tracking

### Core Events

#### 1. Share Events
```typescript
// Event: share_initiated
analytics.track('share_initiated', {
  userId: string;
  method: ShareMethod;
  content_type: ShareTemplateType;
  referral_code: string;
  source_screen: string;
  has_premium: boolean;
});

// Event: share_completed
analytics.track('share_completed', {
  userId: string;
  method: ShareMethod;
  success: boolean;
  error_reason?: string;
  time_to_complete: number; // ms
});

// Event: share_link_copied
analytics.track('share_link_copied', {
  userId: string;
  referral_code: string;
  copy_method: 'button' | 'manual_selection';
});
```

#### 2. Referral Events
```typescript
// Event: referral_link_clicked
analytics.track('referral_link_clicked', {
  referral_code: string;
  source: string; // utm_source
  medium: string; // utm_medium
  device_type: string;
  timestamp: string;
});

// Event: referral_signup_started
analytics.track('referral_signup_started', {
  referral_code: string;
  referrer_id: string;
  signup_method: 'email' | 'google' | 'apple';
});

// Event: referral_signup_completed
analytics.track('referral_signup_completed', {
  referral_code: string;
  referrer_id: string;
  new_user_id: string;
  time_to_convert: number; // seconds from first click
});
```

#### 3. Reward Events
```typescript
// Event: referral_reward_earned
analytics.track('referral_reward_earned', {
  user_id: string;
  reward_type: 'premium_days' | 'points' | 'achievement';
  reward_amount: number;
  total_referrals: number;
});

// Event: referral_reward_claimed
analytics.track('referral_reward_claimed', {
  user_id: string;
  reward_type: string;
  reward_amount: number;
});
```

### Custom Events

```typescript
// Track share content performance
analytics.track('share_content_viewed', {
  template_id: string;
  personalization_used: boolean;
  user_stats_included: boolean;
});

// Track social proof impact
analytics.track('referral_leaderboard_viewed', {
  user_id: string;
  user_rank: number;
  top_referrer_count: number;
});
```

## Analytics Implementation

### Google Analytics 4 Setup

```typescript
// Initialize GA4 with custom dimensions
gtag('config', 'G-XXXXXXXXXX', {
  custom_map: {
    dimension1: 'referral_code',
    dimension2: 'share_method',
    dimension3: 'user_type', // organic | referred
    dimension4: 'referrer_id'
  }
});

// Enhanced ecommerce for referral conversions
gtag('event', 'begin_checkout', {
  currency: 'USD',
  value: 9.99,
  items: [{
    item_id: 'premium_monthly',
    item_name: 'Premium Monthly',
    affiliation: 'referral',
    discount: 3.00,
    item_category: 'subscription',
    price: 9.99,
    quantity: 1
  }],
  coupon: 'FRIEND30' // Referral discount
});
```

### Mixpanel Implementation

```typescript
// Initialize Mixpanel with super properties
mixpanel.register({
  'Referral Status': user.referredBy ? 'Referred' : 'Organic',
  'Referrer ID': user.referredBy || null,
  'Total Referrals': user.totalReferrals || 0
});

// Track funnel events
mixpanel.track('Share Funnel', {
  step: 1,
  action: 'View Share Modal'
});

// Create cohorts
mixpanel.track('User Cohort', {
  cohort: getReferralCohort(user),
  signup_date: user.createdAt,
  referral_source: user.referralSource
});
```

### Custom Analytics Service

```typescript
// /src/services/analytics/ShareAnalyticsService.ts
export class ShareAnalyticsService {
  private events: ShareEvent[] = [];
  
  async trackShareEvent(event: ShareEvent): Promise<void> {
    // Local tracking
    this.events.push(event);
    
    // Send to multiple providers
    await Promise.all([
      this.sendToGA4(event),
      this.sendToMixpanel(event),
      this.sendToFirestore(event),
      this.sendToCustomEndpoint(event)
    ]);
  }
  
  async calculateMetrics(userId: string): Promise<UserShareMetrics> {
    const events = await this.getUserEvents(userId);
    
    return {
      viralCoefficient: this.calculateKFactor(events),
      conversionRate: this.calculateConversionRate(events),
      avgTimeToConvert: this.calculateAvgConversionTime(events),
      topPerformingContent: this.getTopContent(events),
      shareVelocity: this.calculateShareVelocity(events)
    };
  }
}
```

## Dashboard Design

### Admin Dashboard Components

#### 1. Real-Time Metrics
```typescript
// Real-time share activity feed
interface ShareActivityFeed {
  recentShares: Array<{
    userId: string;
    method: ShareMethod;
    timestamp: Date;
    location?: string;
  }>;
  activeSharers: number;
  sharesLastHour: number;
  trendsDirection: 'up' | 'down' | 'stable';
}
```

#### 2. Conversion Funnel
```
Share Modal Opened     → 10,000 (100%)
     ↓
Share Method Selected  → 8,000 (80%)
     ↓
Share Completed        → 6,000 (60%)
     ↓
Link Clicked           → 1,200 (12%)
     ↓
Signup Started         → 600 (6%)
     ↓
Signup Completed       → 300 (3%)
```

#### 3. Performance Metrics Grid
```typescript
interface PerformanceGrid {
  methodPerformance: {
    method: ShareMethod;
    shares: number;
    conversions: number;
    conversionRate: number;
    avgTimeToConvert: number;
  }[];
  
  contentPerformance: {
    templateType: ShareTemplateType;
    shares: number;
    engagement: number;
    viralCoefficient: number;
  }[];
  
  userSegmentPerformance: {
    segment: string;
    shareRate: number;
    conversionRate: number;
    ltv: number;
  }[];
}
```

### User-Facing Analytics

#### Personal Share Dashboard
```typescript
// Component: /src/components/sharing/PersonalShareDashboard.tsx
export function PersonalShareDashboard() {
  return (
    <div className="share-dashboard">
      {/* Impact Summary */}
      <ImpactCard
        friendsJoined={stats.conversions}
        peopleReached={stats.totalClicks}
        premiumEarned={stats.rewardDays}
      />
      
      {/* Share History */}
      <ShareHistoryTimeline
        events={stats.shareHistory}
        conversions={stats.conversionEvents}
      />
      
      {/* Leaderboard Position */}
      <LeaderboardWidget
        userRank={stats.leaderboardRank}
        percentile={stats.percentile}
        nextMilestone={stats.nextAchievement}
      />
      
      {/* Best Performing Content */}
      <TopContentWidget
        bestMethod={stats.topMethod}
        bestTime={stats.bestShareTime}
        suggestions={stats.improvements}
      />
    </div>
  );
}
```

## Reporting & Insights

### Automated Reports

#### 1. Daily Share Report
```typescript
interface DailyShareReport {
  date: string;
  summary: {
    totalShares: number;
    uniqueSharers: number;
    newReferrals: number;
    conversionRate: number;
  };
  trends: {
    sharesVsYesterday: number;
    conversionsVsLastWeek: number;
    topGrowthMethod: string;
  };
  alerts: Array<{
    type: 'success' | 'warning' | 'info';
    message: string;
  }>;
}
```

#### 2. Weekly Cohort Analysis
```typescript
interface CohortAnalysis {
  cohortWeek: string;
  metrics: {
    cohortSize: number;
    shareRate: number;
    conversionRate: number;
    retention: {
      week1: number;
      week2: number;
      week4: number;
    };
    revenue: {
      total: number;
      perUser: number;
    };
  };
}
```

### Custom Insights Engine

```typescript
// Generate actionable insights
class InsightsEngine {
  async generateInsights(data: ShareData): Promise<Insights[]> {
    const insights: Insights[] = [];
    
    // Timing insights
    if (data.bestHours.conversion > 2 * data.avgConversion) {
      insights.push({
        type: 'timing',
        priority: 'high',
        message: `Shares at ${data.bestHours.hour}:00 convert ${data.bestHours.multiplier}x better`,
        action: 'Schedule share reminders for optimal times'
      });
    }
    
    // Method insights
    const topMethod = this.getTopPerformingMethod(data);
    if (topMethod.dominance > 0.6) {
      insights.push({
        type: 'method',
        priority: 'medium',
        message: `${topMethod.name} drives ${topMethod.percentage}% of conversions`,
        action: 'Prioritize this method in share UI'
      });
    }
    
    // Content insights
    const viralContent = this.getViralContent(data);
    if (viralContent.kFactor > 1.5) {
      insights.push({
        type: 'content',
        priority: 'high',
        message: `"${viralContent.template}" has ${viralContent.kFactor} viral coefficient`,
        action: 'Feature this template prominently'
      });
    }
    
    return insights;
  }
}
```

## A/B Testing Framework

### Test Configuration

```typescript
interface ShareABTest {
  id: string;
  name: string;
  hypothesis: string;
  variants: {
    control: ShareVariant;
    treatment: ShareVariant;
  };
  allocation: number; // % of users
  metrics: string[]; // Primary and secondary metrics
  duration: {
    min: number; // Minimum days
    max: number; // Maximum days
  };
}

// Example test: Reward amounts
const rewardTest: ShareABTest = {
  id: 'reward_amount_test_v1',
  name: 'Optimal Reward Amount',
  hypothesis: 'Increasing referrer reward from 7 to 14 days will increase share rate by 25%',
  variants: {
    control: {
      referrerReward: 7,
      referredReward: 3
    },
    treatment: {
      referrerReward: 14,
      referredReward: 3
    }
  },
  allocation: 50,
  metrics: ['share_rate', 'conversion_rate', 'cost_per_acquisition'],
  duration: { min: 14, max: 28 }
};
```

### Test Analysis

```typescript
class ABTestAnalyzer {
  async analyzeTest(testId: string): Promise<TestResults> {
    const data = await this.getTestData(testId);
    
    // Statistical significance
    const significance = this.calculateSignificance(
      data.control,
      data.treatment
    );
    
    // Effect size
    const effectSize = this.calculateEffectSize(
      data.control,
      data.treatment
    );
    
    // Business impact
    const impact = this.calculateBusinessImpact(
      data,
      effectSize
    );
    
    return {
      winner: significance.pValue < 0.05 ? 
        (effectSize.direction > 0 ? 'treatment' : 'control') : 
        'inconclusive',
      confidence: significance.confidence,
      impact: impact,
      recommendation: this.generateRecommendation(data, significance, impact)
    };
  }
}
```

## Privacy & Compliance

### Data Collection Policy

```typescript
interface PrivacyCompliantTracking {
  // Required consent levels
  consent: {
    analytics: boolean;
    marketing: boolean;
    personalization: boolean;
  };
  
  // Data minimization
  collectOnly: string[]; // Whitelist of allowed fields
  
  // Anonymization rules
  anonymize: {
    ipAddress: boolean;
    userId: boolean; // Use hashed IDs
    deviceId: boolean;
  };
  
  // Retention policy
  retention: {
    events: 90; // days
    aggregated: 365; // days
    userLevel: 30; // days after account deletion
  };
}
```

### GDPR Compliance

```typescript
// User data export
async function exportShareData(userId: string): Promise<UserShareData> {
  return {
    shares: await getShareEvents(userId),
    referrals: await getReferrals(userId),
    rewards: await getRewards(userId),
    analytics: await getAnalytics(userId),
    exportDate: new Date().toISOString()
  };
}

// Data deletion
async function deleteShareData(userId: string): Promise<void> {
  await Promise.all([
    deleteShareEvents(userId),
    anonymizeReferrals(userId), // Keep for referred users
    deleteRewards(userId),
    deleteAnalytics(userId)
  ]);
}
```

### Security Measures

```typescript
// Prevent referral fraud
interface FraudDetection {
  checks: {
    velocityLimit: number; // Max shares per hour
    uniqueIPRequired: boolean;
    emailVerification: boolean;
    captchaThreshold: number;
  };
  
  signals: {
    suspiciousPatterns: string[];
    blacklistedDomains: string[];
    geoBlocking: string[]; // Country codes
  };
  
  actions: {
    flag: 'review' | 'block' | 'restrict';
    notification: boolean;
    logging: boolean;
  };
}
```