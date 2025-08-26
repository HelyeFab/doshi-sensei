# Authentication System Documentation

## Overview

This document describes the completely rewritten authentication system for Dōshi Sensei, implementing industry-standard security practices with a focus on user experience, security, and GDPR compliance.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Features](#key-features)
3. [Security Implementation](#security-implementation)
4. [GDPR Compliance](#gdpr-compliance)
5. [Admin Security Monitoring](#admin-security-monitoring)
6. [API Reference](#api-reference)
7. [Configuration Guide](#configuration-guide)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The authentication system follows a modular, service-oriented architecture with clear separation of concerns:

```
/src/lib/auth/
├── types.ts              # TypeScript type definitions
├── constants.ts          # Configuration and constants
├── auth-service.ts       # Main authentication orchestrator
├── magic-link.ts         # Passwordless authentication
├── email-verification.ts # Email verification system
├── gdpr-compliance.ts    # GDPR data handling
├── security-monitor.ts   # Threat detection system
└── rate-limiter.ts       # Rate limiting protection
```

### Core Principles

1. **Passwordless First**: Magic links as primary authentication
2. **Security by Default**: Built-in rate limiting, threat detection
3. **Privacy Focused**: GDPR compliance, data minimization
4. **User Experience**: Simple, frictionless authentication flow
5. **Monitoring**: Real-time security event tracking

## Key Features

### 1. Magic Link Authentication

**No passwords required** - Users receive secure sign-in links via email.

**Benefits:**
- Eliminates password-related vulnerabilities
- No password resets needed
- Improved user experience
- Reduced support burden

**Flow:**
1. User enters email on login page
2. System sends magic link to email
3. User clicks link in email
4. Automatic sign-in with session creation

### 2. Google OAuth Integration

**Social login** with profile picture support.

**Features:**
- One-click sign-in
- Profile picture synchronization
- Automatic account creation
- Secure token management

### 3. Email Verification

**Mandatory email verification** with smart reminders.

**Implementation:**
- Verification required for feature access
- Automatic reminder after 3 days
- Re-send capability
- Grace period for new users

### 4. Rate Limiting

**Protection against brute force attacks** with configurable limits.

**Default Limits:**
- Login: 5 attempts per 15 minutes
- Magic Link: 3 requests per hour
- Password Reset: 3 attempts per hour

**Features:**
- Automatic blocking on limit exceed
- Progressive delays
- IP-based tracking
- Suspicious activity detection

### 5. Session Management

**Secure session handling** with automatic refresh.

**Configuration:**
- 7-day session duration
- Automatic refresh when < 1 day remaining
- Device fingerprinting
- Concurrent session limits (5 max)

## Security Implementation

### Threat Detection System

The security monitor tracks and analyzes user behavior to detect threats:

#### Trust Score Calculation

Each user has a trust score (0-100) based on:

- **Positive Factors:**
  - Verified email (+15)
  - Consistent device usage (+10)
  - Long-term user (+10)

- **Negative Factors:**
  - High failed login ratio (-20)
  - Multiple location changes (-15)
  - Rapid attempts (-25)
  - Unusual hours activity (-10)

#### Security Events Tracked

- `login_attempt` - Login attempt initiated
- `login_success` - Successful authentication
- `login_failed` - Failed authentication
- `magic_link_sent` - Magic link requested
- `magic_link_used` - Magic link consumed
- `suspicious_activity` - Anomaly detected
- `account_locked` - Account security lock
- `email_verified` - Email verification completed

#### Risk Level Assessment

Events are classified by risk level:

- **Critical**: Account locks, suspicious patterns
- **High**: Password/email changes, low trust score
- **Medium**: Failed logins, new devices
- **Low**: Normal activity

### Rate Limiter Implementation

In-memory rate limiting with automatic cleanup:

```typescript
// Configuration
RATE_LIMITS: {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,    // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  },
  magicLink: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000,    // 1 hour
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  }
}
```

### Device Fingerprinting

Tracks device changes for security:

- User agent analysis
- Screen resolution
- Language settings
- Timezone
- Platform detection

## GDPR Compliance

### Data Export

Users can request complete data export including:

- Profile information
- Activity history
- Study data
- Preferences
- All associated records

**Format**: JSON export with 7-day retention

### Account Deletion

**30-day grace period** for account deletion:

1. User requests deletion
2. Data export generated automatically
3. 30-day countdown begins
4. Reminder emails sent
5. Cancellation allowed anytime
6. Permanent deletion after 30 days

### Data Minimization

- Only essential data collected
- Automatic cleanup of old records
- No password storage
- Minimal session data

## Admin Security Monitoring

### Dashboard Location

Access at: `/admin/security`

### Dashboard Features

#### Real-Time Metrics
- Total events (24h)
- Critical events count
- Failed login tracking
- Suspicious activities
- Locked accounts
- Unique users affected

#### Event Monitoring
- Live event stream
- Risk level indicators
- User identification
- Metadata inspection
- Time-based filtering

#### Rate Limit Visualization
- Active rate limits
- Blocked users
- Attempt counters
- Time until unblock

#### Filtering Options
- Event type filtering
- Time range selection (1h, 24h, 7d, 30d)
- User search
- Risk level filtering

### Security Alerts

Critical events trigger immediate alerts:

1. Stored in `security_alerts` collection
2. Dashboard notification
3. Admin email (configurable)
4. Automatic response actions

## API Reference

### Authentication Endpoints

#### Send Magic Link
```typescript
POST /api/auth/magic-link
Body: { email: string }
Response: { success: boolean, message: string }
```

#### Verify Magic Link
```typescript
GET /auth/verify?token=xxx&email=xxx
Automatic redirect on success
```

#### Security Events
```typescript
POST /api/auth/security/suspicious
Body: { identifier, action, timestamp, type }
Response: { success: boolean }
```

#### Security Alerts
```typescript
POST /api/auth/security/alert
Body: { userId, event, timestamp }
Response: { success: boolean }
```

### AuthContext Methods

```typescript
interface AuthContextType {
  // Authentication
  sendMagicLink(email: string): Promise<Result>
  verifyMagicLink(email, token, link?): Promise<Result>
  signInWithGoogle(): Promise<Result>
  logout(): Promise<void>
  
  // Email Verification
  sendVerificationEmail(): Promise<Result>
  isEmailVerified(): boolean
  
  // GDPR Compliance
  requestAccountDeletion(reason?): Promise<Result>
  cancelAccountDeletion(): Promise<Result>
  exportUserData(): Promise<Result>
  
  // Profile Management
  updateProfile(updates): Promise<Result>
  refreshSubscription(): Promise<void>
}
```

## Configuration Guide

### Environment Variables

```env
# Required Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

### Firebase Console Setup

1. **Enable Authentication Methods:**
   - Email/Password (for magic links)
   - Google OAuth

2. **Configure Authorized Domains:**
   - Add production domain
   - Add localhost for development

3. **Email Templates:**
   - Customize magic link email
   - Set sender name and address

4. **OAuth Consent Screen:**
   - Configure for Google sign-in
   - Add required scopes

### Firestore Security Rules

The system requires specific Firestore collections with appropriate security rules:

```javascript
// Key collections added:
- magic_links         // Server-only access
- security_events     // Admin read only
- security_alerts     // Admin read only
- sessions           // Users read own
- email_verifications // Users read own
- account_deletion_requests // Users read own
- user_data_exports  // Users read own
```

## Troubleshooting

### Common Issues

#### Magic Link Not Received
- Check spam folder
- Verify email configuration in Firebase
- Check rate limits (3 per hour max)
- Verify domain is authorized

#### Google Sign-In Fails
- Check OAuth configuration
- Verify redirect URIs
- Check popup blocker settings
- Verify domain authorization

#### Session Expired
- Sessions last 7 days
- Automatic refresh when < 1 day
- Re-authentication required after expiry

#### Rate Limited
- Wait for cooldown period
- Check security dashboard for blocks
- Admin can manually reset limits

### Debug Tools

#### Security Monitor Dashboard
- Real-time event monitoring
- User trust scores
- Rate limit status
- Failed attempt tracking

#### Console Logging
Enable debug mode:
```javascript
localStorage.setItem('AUTH_DEBUG', 'true')
```

#### Firestore Inspection
Check collections:
- `security_events` - All security events
- `sessions` - Active sessions
- `magic_links` - Pending links

### Support Escalation

1. Check security dashboard for patterns
2. Review security_events collection
3. Check rate limiter status
4. Verify Firebase configuration
5. Review Firestore rules

## Best Practices

### For Developers

1. **Never bypass rate limits** in production
2. **Always validate email format** before sending links
3. **Monitor trust scores** for unusual patterns
4. **Test with all user types** (guest, free, premium)
5. **Handle edge cases** (expired links, network issues)

### For Administrators

1. **Review security dashboard daily**
2. **Investigate critical events immediately**
3. **Monitor failed login patterns**
4. **Adjust rate limits based on usage**
5. **Keep Firebase configuration secure**

### For Users

1. **Use unique email addresses**
2. **Verify email promptly**
3. **Report suspicious activity**
4. **Keep browser updated**
5. **Use secure network connections**

## Migration Notes

When migrating from the old authentication system:

1. **User accounts preserved** - Existing users can sign in
2. **Passwords deprecated** - Users use magic links going forward
3. **Sessions migrated** - Active sessions remain valid
4. **Subscriptions maintained** - No impact on paid users
5. **Data intact** - All user data preserved

## Security Compliance

The authentication system complies with:

- **GDPR** - Full data export and deletion rights
- **CCPA** - California privacy requirements
- **COPPA** - Age verification capabilities
- **SOC 2** - Security monitoring and logging
- **ISO 27001** - Information security standards

## Future Enhancements

Planned improvements:

1. **Biometric authentication** - Face/Touch ID
2. **WebAuthn support** - Hardware security keys
3. **SMS backup** - Alternative to email
4. **IP allowlisting** - Enterprise features
5. **Advanced analytics** - ML-based threat detection

---

*Last Updated: 2024*
*Version: 1.0.0*
*Author: Dōshi Sensei Development Team*