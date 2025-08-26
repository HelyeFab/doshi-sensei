# Authentication System Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing and testing the new authentication system.

## 1. Initial Setup

### Prerequisites

- Node.js 18+ installed
- Firebase project created
- Environment variables configured

### Installation Steps

1. **Verify Firebase Configuration**
```bash
# Check .env.local has all required variables
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

2. **Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

3. **Start Development Server**
```bash
npm run dev
```

## 2. Testing Authentication Flows

### Magic Link Flow

1. Navigate to `/login`
2. Enter email address
3. Click "Send Magic Link"
4. Check email inbox
5. Click link in email
6. Verify automatic sign-in

### Google OAuth Flow

1. Navigate to `/login`
2. Click "Sign in with Google"
3. Select Google account
4. Verify automatic sign-in
5. Check profile picture loaded

### Email Verification Flow

1. Sign in with magic link
2. Check for verification reminder
3. Click "Send Verification Email"
4. Open verification email
5. Click verification link
6. Verify status updated

## 3. Admin Security Monitoring

### Accessing the Dashboard

1. Sign in as admin (mate.fizir@gmail.com)
2. Navigate to `/admin/security`
3. Review security metrics

### Dashboard Sections

#### Overview Cards
- **Total Events**: All authentication events in last 24h
- **Critical Events**: High-risk security events
- **Failed Logins**: Failed authentication attempts
- **High Risk Events**: Events requiring attention

#### Filters
- **Event Type**: Filter by specific event types
- **Time Range**: 1 hour, 24 hours, 7 days, 30 days
- **User Search**: Find events by user ID

#### Rate Limits
- View active rate limits
- See blocked users
- Monitor cooldown timers

#### Event Distribution
- Breakdown by event type
- Visual representation of activity

## 4. Common Implementation Patterns

### Using Magic Links in Components

```typescript
import { useAuth } from '@/contexts/AuthContext';

function LoginComponent() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  
  const handleLogin = async () => {
    const result = await sendMagicLink(email);
    if (result.success) {
      // Show success message
    } else {
      // Handle error
    }
  };
  
  return (
    <div>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={handleLogin}>
        Send Magic Link
      </button>
    </div>
  );
}
```

### Checking Email Verification

```typescript
import { useAuth } from '@/contexts/AuthContext';

function ProtectedFeature() {
  const { isEmailVerified, sendVerificationEmail } = useAuth();
  
  if (!isEmailVerified()) {
    return (
      <div>
        <p>Please verify your email to access this feature</p>
        <button onClick={sendVerificationEmail}>
          Send Verification Email
        </button>
      </div>
    );
  }
  
  return <div>Feature content</div>;
}
```

### GDPR Data Export

```typescript
import { useAuth } from '@/contexts/AuthContext';

function AccountSettings() {
  const { exportUserData, requestAccountDeletion } = useAuth();
  
  const handleDataExport = async () => {
    const result = await exportUserData();
    if (result.success && result.downloadUrl) {
      // Provide download link
      window.open(result.downloadUrl, '_blank');
    }
  };
  
  const handleDeleteAccount = async () => {
    const result = await requestAccountDeletion('User requested');
    if (result.success) {
      // Show confirmation with scheduled date
      alert(`Account will be deleted on ${result.scheduledDate}`);
    }
  };
  
  return (
    <div>
      <button onClick={handleDataExport}>Export My Data</button>
      <button onClick={handleDeleteAccount}>Delete Account</button>
    </div>
  );
}
```

## 5. Security Best Practices

### Rate Limiting

The system automatically enforces rate limits:

```typescript
// Automatic rate limiting applied
const result = await sendMagicLink(email);

if (!result.success && result.message.includes('too many')) {
  // User is rate limited
  // Show appropriate message
}
```

### Session Management

Sessions are automatically managed:

```typescript
// Session info available in context
const { session } = useAuth();

if (session) {
  console.log('Session expires:', session.expiresAt);
  console.log('Session ID:', session.sessionId);
}
```

### Trust Score Monitoring

```typescript
// Admin only: Check user trust scores
const { authUser } = useAuth();

if (authUser?.metadata?.trustScore < 30) {
  // Suspicious activity detected
  // Take appropriate action
}
```

## 6. Troubleshooting

### Issue: Magic Link Not Working

**Symptoms:**
- Link shows "Invalid or expired"
- Automatic sign-in fails

**Solutions:**
1. Check link expiry (15 minutes)
2. Verify email matches
3. Check Firestore rules deployed
4. Verify domain authorized in Firebase

### Issue: Rate Limited Too Quickly

**Symptoms:**
- "Too many attempts" error
- Cannot send magic links

**Solutions:**
1. Wait for cooldown period
2. Check rate limit configuration
3. Admin can reset via dashboard
4. Review suspicious activity

### Issue: Google Sign-In Popup Blocked

**Symptoms:**
- Nothing happens on click
- Popup warning in browser

**Solutions:**
1. Allow popups for domain
2. Fallback to redirect flow
3. Check OAuth configuration
4. Verify redirect URIs

### Issue: Email Verification Not Updating

**Symptoms:**
- Status remains unverified
- Features still blocked

**Solutions:**
1. Reload user data
2. Check verification link clicked
3. Review Firestore permissions
4. Check email service status

## 7. Development Tips

### Enable Debug Logging

```javascript
// In browser console
localStorage.setItem('AUTH_DEBUG', 'true');

// View detailed auth logs
console.log('[Auth] ...');
```

### Test Different User Types

```typescript
// Test as guest (logged out)
await logout();

// Test as unverified user
// Sign up but don't verify

// Test as verified free user
// Sign up and verify

// Test as premium user
// Upgrade subscription
```

### Simulate Security Events

```typescript
// Trigger rate limiting
for (let i = 0; i < 10; i++) {
  await sendMagicLink('test@example.com');
}

// Trigger suspicious activity
// Rapid login attempts from different IPs
```

### Monitor Firestore Collections

Key collections to monitor:
- `security_events` - All auth events
- `sessions` - Active user sessions
- `magic_links` - Pending magic links
- `email_verifications` - Verification status

## 8. Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Firebase auth methods enabled
- [ ] Authorized domains added
- [ ] Email templates customized
- [ ] Firestore rules deployed
- [ ] Security monitoring tested
- [ ] Rate limits configured
- [ ] GDPR compliance verified

### Deployment Steps

1. **Build Production Bundle**
```bash
npm run build
```

2. **Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

3. **Deploy to Hosting**
```bash
# Vercel
vercel --prod

# Firebase Hosting
firebase deploy --only hosting
```

4. **Post-Deployment Verification**
- Test magic link flow
- Test Google OAuth
- Verify email sending
- Check security dashboard
- Monitor error logs

### Production Monitoring

1. **Daily Checks**
   - Security dashboard review
   - Failed login patterns
   - Rate limit triggers
   - Critical events

2. **Weekly Analysis**
   - Trust score trends
   - User verification rates
   - Session patterns
   - Security alerts

3. **Monthly Review**
   - Authentication metrics
   - User feedback
   - Performance analysis
   - Security audit

## 9. API Integration

### External Service Integration

```typescript
// Example: Webhook for security events
app.post('/webhook/security-event', async (req, res) => {
  const { userId, eventType, riskLevel } = req.body;
  
  if (riskLevel === 'critical') {
    // Send alert to admin
    await sendAdminAlert({
      subject: 'Critical Security Event',
      userId,
      eventType
    });
  }
  
  res.json({ received: true });
});
```

### Custom Authentication Flows

```typescript
// Example: Custom magic link handler
async function customMagicLinkHandler(email: string) {
  // Add custom logic
  await logCustomEvent('magic_link_requested', { email });
  
  // Call standard handler
  const result = await sendMagicLink(email);
  
  // Post-processing
  if (result.success) {
    await trackAnalytics('auth.magic_link_sent');
  }
  
  return result;
}
```

## 10. Maintenance

### Regular Tasks

#### Daily
- Review security alerts
- Check rate limit blocks
- Monitor failed logins

#### Weekly
- Analyze trust scores
- Review security events
- Update rate limits if needed

#### Monthly
- Security audit
- Performance review
- User feedback analysis
- Documentation updates

### Emergency Procedures

#### Account Lockout
1. Access admin dashboard
2. Find user in security events
3. Reset rate limits
4. Unlock account if needed

#### Suspicious Activity Spike
1. Check security dashboard
2. Identify pattern
3. Adjust rate limits
4. Block IPs if necessary
5. Notify affected users

#### System Compromise
1. Disable authentication
2. Reset all sessions
3. Force password resets
4. Audit security logs
5. Implement fixes
6. Notify users

---

*For additional support, refer to the main [Authentication Documentation](./README.md)*