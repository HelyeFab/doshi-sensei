# Post-Migration Validation Tests

## Automated Validation Script

Create this validation script to run after migration:

```javascript
// scripts/validate-migration.js
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function validateMigration() {
  console.log('🔍 Starting migration validation...\n');
  
  const results = {
    total: 0,
    clean: 0,
    issues: [],
    nested: 0,
    missingPlan: 0,
    wrongStructure: 0
  };
  
  const users = await db.collection('users').get();
  
  for (const doc of users.docs) {
    const userData = doc.data();
    results.total++;
    
    // Check for clean structure
    if (userData.subscription) {
      // Check for nested structure (BAD)
      if (userData.subscription.subscription) {
        results.nested++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Nested subscription structure found'
        });
        continue;
      }
      
      // Check for required fields
      if (!userData.subscription.plan) {
        results.missingPlan++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Missing plan field'
        });
        continue;
      }
      
      // Check for old fields that shouldn't exist
      if (userData.subscription.limits || userData.subscription.currentUsage) {
        results.wrongStructure++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: 'Old fields (limits/currentUsage) still present'
        });
        continue;
      }
      
      // Validate plan values
      const validPlans = ['free', 'monthly', 'yearly'];
      if (!validPlans.includes(userData.subscription.plan)) {
        results.wrongStructure++;
        results.issues.push({
          userId: doc.id,
          email: userData.email,
          issue: `Invalid plan value: ${userData.subscription.plan}`
        });
        continue;
      }
    }
    
    results.clean++;
  }
  
  // Print results
  console.log('📊 VALIDATION RESULTS');
  console.log('====================');
  console.log(`Total users: ${results.total}`);
  console.log(`Clean users: ${results.clean} ✅`);
  console.log(`Issues found: ${results.issues.length} ❌`);
  console.log(`- Nested structures: ${results.nested}`);
  console.log(`- Missing plan: ${results.missingPlan}`);
  console.log(`- Wrong structure: ${results.wrongStructure}`);
  
  if (results.issues.length > 0) {
    console.log('\n❌ ISSUES DETAIL:');
    results.issues.forEach(issue => {
      console.log(`- ${issue.email || issue.userId}: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ ALL USERS HAVE CLEAN STRUCTURE!');
  }
  
  return results;
}

validateMigration()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
```

## Manual Validation Checklist

### 1. Firebase Structure Validation

- [ ] Open Firebase Console
- [ ] Check 5 random users
- [ ] Verify NO nested subscription.subscription
- [ ] Verify subscription.plan exists
- [ ] Verify NO limits or currentUsage in subscription

### 2. Stripe Webhook Test

#### 2.1 Create Test Subscription
- [ ] Use Stripe test mode
- [ ] Create new subscription
- [ ] Note subscription ID: _______

#### 2.2 Check Firebase Update
- [ ] Find user in Firebase
- [ ] Verify structure:
  ```json
  {
    "subscription": {
      "status": "active",
      "plan": "monthly",
      "stripeSubscriptionId": "sub_test_xxx",
      "stripeCustomerId": "cus_test_xxx",
      "stripePriceId": "price_xxx",
      "currentPeriodEnd": "2025-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "metadata": {
        "source": "stripe",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-01T00:00:00Z"
      }
    }
  }
  ```

### 3. Three-Pillar Integration Test

#### 3.1 Test Access Control
```bash
# Login as test user
# Try to access premium feature
# Should work if subscription.plan = 'monthly'
```

#### 3.2 Test Limit Enforcement
- [ ] Free user: 3 drills limit enforced
- [ ] Monthly user: Unlimited drills allowed
- [ ] Yearly user: Unlimited drills allowed

### 4. End-to-End Flow Test

#### 4.1 New User Signup
- [ ] Create new account
- [ ] Verify starts as 'free' plan
- [ ] Can do 3 drills

#### 4.2 Upgrade to Premium
- [ ] Purchase monthly subscription
- [ ] Verify Firebase updates within 10 seconds
- [ ] Can do unlimited drills immediately

#### 4.3 Cancel Subscription
- [ ] Cancel in Stripe
- [ ] Verify Firebase updates to canceled
- [ ] Still premium until period end

## Performance Tests

### 1. Webhook Response Time
- Target: < 1 second
- Actual: _____ seconds

### 2. Access Check Speed
- Target: < 100ms
- Actual: _____ ms

### 3. Concurrent Users
- Test with 10 simultaneous subscriptions
- All should update correctly

## Integration Tests

### 1. Admin Dashboard
- [ ] /admin/features shows correct data
- [ ] Can edit limits dynamically
- [ ] Changes apply immediately

### 2. User Account Page
- [ ] Shows correct subscription status
- [ ] Upgrade/cancel buttons work
- [ ] Displays correct plan name

### 3. Mobile App
- [ ] PWA recognizes subscription
- [ ] Offline mode respects limits
- [ ] Sync works for premium users

## Edge Case Tests

### 1. Expired Subscription
- [ ] Status changes to 'past_due'
- [ ] User becomes 'free' type
- [ ] Limited to 3 drills

### 2. Failed Payment
- [ ] Webhook updates status
- [ ] User notified
- [ ] Grace period works

### 3. Multiple Devices
- [ ] Login on 2 devices
- [ ] Both see same subscription
- [ ] Limits shared across devices

## Security Tests

### 1. Direct Database Edit
- [ ] Change plan in Firebase Console
- [ ] App should NOT grant premium
- [ ] Only Stripe changes are trusted

### 2. Webhook Signature
- [ ] Send unsigned webhook
- [ ] Should be rejected
- [ ] No database changes

## Success Criteria

All tests must pass:
- ✅ No nested structures remain
- ✅ All users have valid plan field
- ✅ Webhooks create clean structure
- ✅ Three-Pillar correctly enforces access
- ✅ No performance degradation
- ✅ All integrations working

---

Next: [Rollback Procedures →](07-ROLLBACK-PROCEDURES.md)