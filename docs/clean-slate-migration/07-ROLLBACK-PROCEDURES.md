# Emergency Rollback Procedures

## ⚠️ WHEN TO USE THESE PROCEDURES

Execute rollback if ANY of these occur:
- More than 10% of users can't access features
- Payment processing completely fails
- Data corruption detected
- Critical bug in new system

## Rollback Decision Tree

```
Issue Detected
    ↓
Is it affecting < 5 users?
    → YES: Use individual fixes (Section A)
    → NO: Continue ↓
    
Is it a webhook issue only?
    → YES: Rollback webhook only (Section B)
    → NO: Continue ↓
    
Is it a data structure issue?
    → YES: Full rollback needed (Section C)
    → NO: Investigate further
```

## Section A: Individual User Fixes

### Fix Single User Subscription
```javascript
// scripts/fix-single-user.js
const userId = 'USER_ID_HERE';
const userEmail = 'USER_EMAIL_HERE';

// Restore from backup
const backup = require('./subscription-backups/full-backup-TIMESTAMP.json');
const userBackup = backup.find(u => u.userId === userId);

if (userBackup) {
  await db.collection('users').doc(userId).update({
    subscription: userBackup.subscription,
    entitlements: userBackup.entitlements
  });
}
```

### Manual Premium Grant (Emergency)
```javascript
await db.collection('users').doc(userId).update({
  subscription: {
    status: 'active',
    plan: 'monthly',
    metadata: {
      source: 'admin-emergency',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      reason: 'Rollback compensation'
    }
  }
});
```

## Section B: Webhook Rollback Only

### 1. Revert Webhook Code
```bash
# Go to functions directory
cd functions

# Revert to old webhook
git checkout HEAD~1 src/index.ts

# Deploy immediately
npm run deploy
```

### 2. Update Stripe Dashboard
- Go to Stripe Dashboard → Webhooks
- Verify endpoint URL correct
- Send test event
- Monitor logs

### 3. Keep Clean Data Structure
- Do NOT restore old nested structures
- Fix webhook to write clean structure
- Test thoroughly before re-deploying

## Section C: Full System Rollback

### ⚠️ LAST RESORT - Full Data Restoration

### 1. Stop All Operations
```bash
# Add maintenance flag immediately
firebase functions:config:set maintenance.enabled=true
firebase functions:deploy
```

### 2. Restore User Data
```javascript
// scripts/full-rollback.js
const admin = require('firebase-admin');
const backup = require('./subscription-backups/full-backup-TIMESTAMP.json');

const serviceAccount = require('../firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function rollbackAll() {
  console.log('⚠️  STARTING FULL ROLLBACK...');
  
  const batch = db.batch();
  let count = 0;
  
  for (const userBackup of backup) {
    const userRef = db.collection('users').doc(userBackup.userId);
    
    batch.update(userRef, {
      subscription: userBackup.subscription,
      entitlements: userBackup.entitlements,
      limits: userBackup.limits || null,
      currentUsage: userBackup.currentUsage || null,
      rollbackAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    count++;
    
    // Firestore batch limit
    if (count % 500 === 0) {
      await batch.commit();
      console.log(`Rolled back ${count} users...`);
      batch = db.batch();
    }
  }
  
  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`✅ Rolled back ${count} total users`);
}

rollbackAll()
  .catch(err => {
    console.error('ROLLBACK FAILED:', err);
    process.exit(1);
  });
```

### 3. Revert All Code
```bash
# Full git revert
git checkout main
git pull origin main

# Deploy everything
npm run build
npm run deploy

# Deploy functions
cd functions
npm run deploy
```

### 4. Restore Stripe Subscriptions
```bash
# For each user in premium-users-TIMESTAMP.json:
# Use Stripe Dashboard to:
# 1. Find customer
# 2. Reactivate subscription
# 3. Apply credit for downtime
```

## Communication Templates

### Minor Issue Communication
```
Subject: Brief Service Interruption - Resolved

We experienced a brief issue with subscription processing that has been resolved. If you're experiencing any access issues, please contact support.

No action needed on your part.
```

### Major Rollback Communication
```
Subject: Subscription System Update Postponed

We've postponed our subscription system update to ensure the best experience for you. Your subscription remains active and unchanged.

If you received a refund notification, please disregard it. No charges or refunds will be processed.

We apologize for any confusion.
```

## Post-Rollback Checklist

- [ ] All premium users have access restored
- [ ] Webhook processing normally
- [ ] No error logs in last hour
- [ ] Support tickets addressed
- [ ] Team debriefed
- [ ] Lessons learned documented

## Monitoring After Rollback

### Critical Metrics to Watch
1. Webhook success rate (target: >99%)
2. User login success (target: 100%)
3. Payment processing (target: 100%)
4. Support ticket volume (target: normal)

### Alert Thresholds
- Set up alerts for:
  - Webhook failures > 5 in 5 minutes
  - Login failures > 10 in 5 minutes
  - Support tickets mentioning "subscription" > 5 in 1 hour

## Recovery Timeline

```
T+0: Issue detected
T+5min: Decision made (fix vs rollback)
T+15min: Rollback started (if needed)
T+45min: Rollback completed
T+60min: Validation complete
T+2hr: User communication sent
T+24hr: Post-mortem meeting
```

## Prevent Future Issues

After any rollback:
1. Document what went wrong
2. Add validation test for that case
3. Update pre-migration checklist
4. Consider staged rollout next time

---

Next: [Post-Migration Cleanup →](08-POST-MIGRATION-CLEANUP.md)