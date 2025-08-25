# APP Features & Monitoring Guide

## Overview
This document outlines critical features and monitoring requirements for Doshi Sensei, a comprehensive Japanese language learning application with tiered access levels.

## 1. Users & Access Management

### User Types
- **Guest**: Unauthenticated users with limited access
- **Free**: Registered users without subscription
- **Monthly**: Active monthly subscription
- **Yearly**: Active yearly subscription
- **Trial**: Time-limited premium access (future)
- **Lifetime**: One-time purchase (future)

### Key Monitoring Points

#### Authentication & Sessions
- Login/logout events and patterns
- Session duration and timeout handling
- Multi-device concurrent sessions
- Failed authentication attempts
- Password reset requests
- Account creation rate
- Account deletion/deactivation

#### User Entitlements
- Feature access per user type
- Daily/total usage limits enforcement
- Subscription status verification
- Grace period handling for expired subscriptions
- Trial expiration management

#### Access Control Metrics
- Unauthorized access attempts
- Permission escalation attempts
- Feature usage vs entitlement mismatches
- API rate limit violations per user

### Implementation Requirements
```typescript
// Track in real-time
- Active sessions count
- Authentication failures (>5 in 10 min = alert)
- Subscription status changes
- User type transitions

// Daily reports
- New user registrations
- User type distribution
- Active users by subscription tier
- Session analytics (avg duration, devices)
```

## 2. Payment & Revenue

### Payment Providers
- **Stripe**: Primary payment processor
- **PayPal**: Secondary option
- **Google Play**: Mobile subscriptions (future)
- **Apple App Store**: iOS subscriptions (future)

### Critical Payment Events

#### Transaction Monitoring
- Successful payments (immediate notification)
- Failed payments (retry strategy)
- Refunds (manual and automatic)
- Chargebacks (dispute management)
- Payment method updates
- Currency conversion issues

#### Subscription Lifecycle
- New subscriptions
- Renewals (successful/failed)
- Upgrades (free→premium, monthly→yearly)
- Downgrades (yearly→monthly)
- Cancellations (immediate vs end of period)
- Reactivations
- Trial conversions

#### Revenue Metrics
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Average Revenue Per User (ARPU)
- Customer Lifetime Value (LTV)
- Churn rate by subscription type
- Payment failure rate
- Refund rate

### Webhook Monitoring
```typescript
// Critical webhooks to monitor
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- payment_intent.succeeded
- payment_intent.payment_failed
- charge.refunded
- charge.dispute.created

// Alert thresholds
- Webhook delivery failure > 3 consecutive
- Payment failure rate > 10%
- Churn rate spike > 20% above average
- Refund rate > 5% monthly
```

## 3. Feature Usage & Limits

### Feature Categories (80+ Total Features)

#### Learning Features (25+ features)
**Kana System**
- **Hiragana Practice**: Character recognition and writing
- **Katakana Practice**: Character recognition and writing
- **Kana Charts**: Reference materials (unlimited)
- **Kana Audio**: Pronunciation practice

**Kanji System**
- **Kanji Browser**: JLPT level browsing (unlimited)
- **Kanji Study**: Individual kanji learning
- **Kanji Mastery**: SRS-based comprehensive system
- **Kanji Families**: Component-based learning
- **Kanji Moods**: Visual memory aids
- **Stroke Order Practice**: Writing practice

**Vocabulary & Dictionary**
- **Vocabulary Search**: JMdict access (22,569+ entries)
- **Textbook Vocabulary**: Genki/Minna no Nihongo integration
- **Word Learning Session**: Structured vocabulary SRS
- **JMdict Practice**: Dictionary entry practice

**Grammar & Conjugation**
- **Verb Conjugation**: Interactive conjugation tool
- **Conjugation Practice**: Dedicated drill system
- **Drill Practice**: Multi-type grammar drills

**Flashcard & SRS**
- **Flashcard Review**: Core SRS system
- **Unified Review System**: Cross-content reviews
- **Review Sessions**: Structured study sessions
- **Advanced SRS Algorithms**: FSRS implementation (premium)

#### Games (11+ features)
**Memory & Pattern Games**
- **Kanji Quest**: RPG with Pokémon mechanics
- **Kanji Simon**: Memory sequence game
- **Memory Match**: Card matching
- **Matching Game**: Advanced vocabulary pairing

**Action & Reflex Games**
- **Kana Drop**: Tetris-style kana game
- **Reading Routes**: Path-based kanji reading

**Word & Sentence Games**
- **Sentence Scramble**: Grammar practice
- **Word Assembly**: Phonetic building
- **Listening Quiz**: Audio recognition

**Achievement System**
- **Pokédex View**: Collection tracking
- **Achievement Tracking**: Progress monitoring

#### Tools & Premium Features (15+ features)
**AI-Powered Features**
- **AI Stories**: Personalized story generation
- **Story Generation**: Custom difficulty stories
- **AI Context Explanation**: Grammar/vocab help

**Media & Shadowing**
- **YouTube Shadowing**: Video transcript practice
- **YouTube Series**: Curated channels
- **My Videos**: Personal collection
- **Popular Videos**: Community favorites

**Reading & News**
- **News Reader**: Japanese news with furigana
- **Article Reading**: Individual article study
- **NHK News**: Real-time news feed
- **Article Quality**: Difficulty ratings

**External Integrations**
- **Anki Import**: Deck synchronization (premium)
- **WaniKani Proxy**: External SRS integration
- **Jisho Proxy**: Dictionary API

#### Storage & Progress Features (10+ features)
**Study Management**
- **Study Lists**: Custom vocabulary/kanji lists
- **Saved Items**: Bookmarked vocabulary/kanji
- **Bookmarks**: General content bookmarking
- **Article Bookmarks**: News article saves

**Progress Tracking**
- **Progress Dashboard**: Learning analytics
- **Study Progress**: Completion tracking
- **Learning Analytics**: Pattern insights
- **Stats Tracking**: Performance metrics

#### System Features (20+ features)
**Sync & Offline**
- **Cloud Sync**: Cross-device synchronization (premium)
- **Cross-Device Sync**: Advanced sync features (premium)
- **Offline Mode**: No-internet access (premium)
- **PWA Support**: Progressive Web App capabilities

**User Experience**
- **Theme System**: 12 color schemes
- **Multi-language Support**: EN/JP localization
- **Mobile Navigation**: Optimized mobile UI
- **Smart Navigation**: Context-aware routing

**Notifications**
- **Review Notifications**: SRS reminders
- **Push Notifications**: PWA notifications
- **Study Reminders**: Custom alerts

#### Admin & Management (15+ features)
**Content Management**
- **Story Management**: AI story administration
- **Resource Management**: Learning materials
- **Mood Board Management**: Kanji visuals
- **Blog Management**: Content creation
- **Media Management**: Asset handling

**User Administration**
- **User Management**: Account administration
- **User Entitlements**: Permission control
- **Subscription Management**: Premium handling
- **Feature Matrix**: Access control visual

**Analytics**
- **Feature Analytics**: Usage tracking
- **User Behavior Analytics**: Pattern analysis
- **Content Analytics**: Performance monitoring
- **Conversion Analytics**: Subscription tracking
- **System Health**: Performance monitoring

### Usage Tracking Requirements

#### Real-time Monitoring
- Feature usage vs limits (per user)
- API quota consumption (OpenAI, YouTube)
- Storage usage per user
- Concurrent feature usage
- Rate limit violations

#### Usage Patterns
- Most/least used features
- Peak usage times
- Feature adoption rate
- Average session per feature
- Completion rates

### Limit Enforcement by Feature Category

**Guest User Philosophy**: Since guests can't save progress, limits should be generous enough to showcase value and create desire to sign up, while still protecting against API abuse and costs. The goal is conversion, not frustration.

```typescript
// Guest limits (daily/total)
LEARNING:
- Hiragana/Katakana: Unlimited
- Kanji Browser: Unlimited (read-only)
- Vocabulary Search: 20 daily (API protection)
- Verb Conjugation: Unlimited (no saving)
- Drill Practice: 3 daily (taste of the feature)

GAMES:
- Memory games: 3 daily each (enough to get hooked)
- Action games: 3 daily each
- Achievement viewing: Unlimited
- Pokédex: View only (no saving anyway)

TOOLS:
- AI Stories: 0 (high cost, auth required)
- YouTube Shadowing: 1 daily (API costs)
- News Reader: 3 articles daily
- External integrations: 0

STORAGE:
- Study Lists: 0 (can't persist anyway)
- Saved Items: 0 (no account to save to)
- Bookmarks: 0 (no persistence)
- Progress: Not tracked (session only)

// Free user limits (daily/total)
LEARNING:
- All basic features: Unlimited
- Advanced SRS: Limited algorithm
- Kanji Mastery: 10 daily reviews
- Drill Practice: 5 daily

GAMES:
- Memory games: 5 daily each
- Action games: 3 daily each
- Achievement system: Full access
- Pokémon catching: 3 daily

TOOLS:
- AI Stories: 1 daily
- YouTube Shadowing: 3 daily
- News Reader: 5 articles daily
- Anki Import: 0 (premium only)

STORAGE:
- Study Lists: 3 total
- Saved Items: 20 total
- Bookmarks: 10 total

// Premium users
ALL FEATURES: Unlimited access
- Priority API processing
- Advanced SRS algorithms
- Cloud sync enabled
- Offline mode enabled
- Unlimited storage
- All integrations active
```

### Feature Monitoring Priority Matrix

```typescript
// CRITICAL - Real-time monitoring required
HIGH_COST_FEATURES = [
  'ai_stories',           // OpenAI API costs
  'youtube_shadowing',    // YouTube API quota
  'story_generation',     // GPT token usage
  'ai_context_explanation'
]

HIGH_LOAD_FEATURES = [
  'vocabulary_search',    // Database queries
  'kanji_browser',       // Large dataset access
  'flashcard_review',    // Frequent DB updates
  'cloud_sync'          // Server resources
]

REVENUE_CRITICAL = [
  'subscription_management',
  'payment_processing',
  'premium_features',
  'trial_conversion'
]

// MEDIUM - Hourly monitoring
USER_ENGAGEMENT = [
  'kanji_quest',        // Primary game
  'drill_practice',     // Core learning
  'review_sessions',    // Retention driver
  'achievement_system'  // Gamification
]

CONTENT_FEATURES = [
  'news_reader',
  'textbook_vocabulary',
  'blog_content',
  'resource_management'
]

// LOW - Daily monitoring
UTILITY_FEATURES = [
  'theme_system',
  'notifications',
  'bookmarks',
  'settings'
]
```

## 4. Performance & Reliability

### Application Performance

#### Frontend Metrics
- Page load time (target: <1.5s)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- JavaScript error rate
- Bundle size monitoring

#### Backend Performance
- API response times (p50, p95, p99)
- Database query performance
- Cache hit rates
- CDN performance
- WebSocket connection stability

### System Reliability

#### Uptime Monitoring
- Application availability (99.9% target)
- API endpoint health
- Database connectivity
- Third-party service status
  - Firebase Auth
  - Firestore
  - Stripe API
  - OpenAI API
  - YouTube API

#### Error Tracking
- 4xx error rates by endpoint
- 5xx error rates (alert > 1%)
- JavaScript exceptions
- Unhandled promise rejections
- Network timeout rates

### Infrastructure Metrics
```typescript
// Real-time alerts
- Response time > 3s
- Error rate > 5%
- Memory usage > 90%
- CPU usage > 80%
- Database connections > 80% pool

// Hourly checks
- SSL certificate expiry
- Domain registration status
- Backup completion
- Log rotation
- Disk space usage
```

## 5. Security & Compliance

### Authentication Security

#### Access Control
- Failed login attempts tracking
- Brute force detection (>5 attempts = lockout)
- Suspicious login patterns
- Account sharing detection
- Session hijacking prevention
- CSRF token validation

#### API Security
- API key rotation schedule
- Rate limiting per IP/user
- CORS policy violations
- Unauthorized API access attempts
- Webhook signature validation
- Request origin verification

### Data Protection

#### Privacy Compliance
- GDPR compliance monitoring
- Data retention policy enforcement
- User data export requests
- Deletion request processing
- Cookie consent tracking
- Privacy policy acceptance

#### Data Security
- Encryption at rest verification
- TLS/SSL certificate monitoring
- Database access logging
- Sensitive data exposure checks
- PII handling compliance
- Backup encryption status

### Security Monitoring
```typescript
// Immediate alerts
- Multiple failed auth from same IP
- API key used from unexpected location
- Unusual data access patterns
- Mass data export attempts
- SQL injection attempts
- XSS attempt detection

// Daily security reports
- Failed authentication summary
- API usage anomalies
- New IP addresses accessing admin
- Unusual user behavior patterns
- Security header compliance
```

## 6. User Behavior & Engagement

### Learning Progress Metrics

#### Activity Tracking
- Daily active users (DAU)
- Monthly active users (MAU)
- Session frequency and duration
- Feature interaction sequence
- Learning streak tracking
- Achievement completion rates

#### Progress Indicators
- Lessons completed per user
- Average time per lesson
- Skill progression rate
- Vocabulary retention rate
- Practice consistency
- Level advancement speed

### Engagement Metrics

#### Content Interaction
- Most visited pages/features
- Content completion rates
- Video watch time (YouTube feature)
- Story reading completion
- Game participation rates
- Social features usage

#### User Retention
- Day 1, 7, 30 retention rates
- Cohort retention analysis
- Churn prediction indicators
- Re-engagement success rate
- Feature-specific retention
- Subscription retention vs free

### Behavioral Analytics
```typescript
// Key engagement indicators
- Average session duration > 10 min
- Features used per session > 3
- Return rate within 24h > 40%
- Weekly active rate > 60%
- Content completion > 70%

// Churn risk indicators
- No login > 7 days
- Decreased session frequency
- Failed payment + no update
- Support ticket without resolution
- Low feature engagement
```

## Implementation Priority

### Phase 1 (Critical - Immediate)
1. User authentication monitoring
2. Payment transaction tracking
3. Basic error logging
4. Uptime monitoring

### Phase 2 (High - Week 1-2)
1. Feature usage limits
2. Performance metrics
3. Security alerts
4. User engagement basics

### Phase 3 (Medium - Month 1)
1. Advanced analytics
2. Predictive metrics
3. Automated reporting
4. A/B testing framework

### Phase 4 (Enhancement - Month 2+)
1. Machine learning for churn prediction
2. Personalization metrics
3. Advanced security monitoring
4. Business intelligence dashboards

## Monitoring Tools Stack

### Recommended Services
- **Application Monitoring**: Sentry, LogRocket
- **Analytics**: Google Analytics, Mixpanel
- **Performance**: Lighthouse CI, Web Vitals
- **Uptime**: UptimeRobot, Pingdom
- **Error Tracking**: Sentry
- **User Analytics**: Posthog, Amplitude
- **Payment Analytics**: Stripe Dashboard, Baremetrics
- **Security**: Cloudflare, Snyk

## Alert Configuration

### Critical Alerts (Immediate)
- Payment system down
- Authentication service failure
- Database connection lost
- Security breach detected
- API rate limit exceeded

### Warning Alerts (15 min)
- High error rate
- Slow response times
- Low cache hit rate
- Unusual traffic spike
- Failed webhook delivery

### Info Alerts (Daily)
- User registration summary
- Feature usage report
- Revenue summary
- Performance metrics
- Security scan results

## Dashboard Requirements

### Executive Dashboard
- MRR/ARR trends
- User growth
- Churn rate
- System health
- Top features

### Operations Dashboard
- Real-time errors
- API status
- Performance metrics
- Active users
- Infrastructure health

### Security Dashboard
- Failed auth attempts
- API usage anomalies
- Security alerts
- Compliance status
- Audit logs

## Compliance Checklist

- [ ] GDPR compliance monitoring
- [ ] Payment PCI compliance
- [ ] Data retention policies
- [ ] Privacy policy updates
- [ ] Terms of service tracking
- [ ] Cookie consent management
- [ ] Audit log retention
- [ ] Security incident response plan
- [ ] Data breach notification process
- [ ] Regular security audits

## Success Metrics

### Business KPIs
- MRR growth > 10% monthly
- User retention > 40% at day 30
- Payment success rate > 95%
- Free to paid conversion > 5%
- Churn rate < 5% monthly

### Technical KPIs
- Uptime > 99.9%
- Page load < 2 seconds
- API response < 200ms
- Error rate < 1%
- Cache hit rate > 80%

### User Experience KPIs
- Daily active users growth
- Feature adoption > 60%
- Session duration > 10 minutes
- User satisfaction > 4.5/5
- Support ticket resolution < 24h