# Detailed Migration Plan

## Overview
Complete reset of subscription system to use Three-Pillar Architecture as single source of truth.

## Phase 1: Preparation (Day 1)

### 1.1 Backup Everything
```bash
# Run backup script
node scripts/clean-slate-subscription-migration.js

# Verify backups created:
# - subscription-backups/full-backup-[timestamp].json
# - subscription-backups/premium-users-[timestamp].json
# - subscription-backups/refund-list-[timestamp].csv
```

### 1.2 Analyze Premium Users
- Count total premium users
- Verify Stripe customer IDs
- Calculate refund amounts
- Prepare communication

### 1.3 Disable New Subscriptions
- Add maintenance mode flag to prevent new signups
- Update UI to show "Subscription system under maintenance"

## Phase 2: Clean Firebase Data (Day 1)

### 2.1 Dry Run First
```bash
# See what would be changed
node scripts/clean-slate-subscription-migration.js
```

### 2.2 Execute Cleanup
```bash
# Actually clean the data
node scripts/clean-slate-subscription-migration.js --execute
```

### 2.3 Verify Cleanup
- Check Firebase Console
- Confirm all subscription fields removed
- Verify user data intact (email, displayName, etc.)

## Phase 3: Deploy New Clean Webhook (Day 1)

### 3.1 Prepare New Webhook
```bash
# Copy clean webhook to main file
cp functions/src/index-clean.ts functions/src/index.ts
```

### 3.2 Deploy to Firebase
```bash
cd functions
npm run deploy
```

### 3.3 Update Stripe Dashboard
1. Go to Stripe Dashboard → Webhooks
2. Update endpoint URL (if changed)
3. Verify webhook secret matches

## Phase 4: Process Refunds (Day 2)

### 4.1 Cancel Stripe Subscriptions
```bash
# Use Stripe CLI or dashboard
# For each subscription in refund-list.csv:
stripe subscriptions cancel sub_xxx
```

### 4.2 Issue Refunds
- Calculate prorated refunds
- Process through Stripe
- Document each refund

### 4.3 Notify Users
Email template:
```
Subject: Important: Subscription System Update & Refund

Dear [Name],

We're upgrading our subscription system to provide better service. 
As part of this upgrade, we've issued a full refund for your subscription.

Refund amount: $[amount]
Processing time: 5-10 business days

You can resubscribe with our improved system at any time.

We apologize for any inconvenience.
```

## Phase 5: Test New System (Day 2)

### 5.1 Create Test Subscription
1. Use Stripe test mode
2. Create new subscription
3. Verify Firebase structure:
```javascript
{
  subscription: {
    status: "active",
    plan: "monthly",
    stripeSubscriptionId: "sub_test_xxx",
    stripeCustomerId: "cus_test_xxx",
    stripePriceId: "price_xxx",
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: false,
    metadata: {
      source: "stripe",
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
  }
}
```

### 5.2 Test Three-Pillar Access
```javascript
// Should return correct limits
const access = await checkAccess('drill_practice');
// monthly user should get unlimited (-1)
```

## Phase 6: Enable for All Users (Day 3)

### 6.1 Remove Maintenance Mode
- Enable subscription UI
- Update messaging

### 6.2 Monitor First Subscriptions
- Watch Firebase logs
- Check webhook responses
- Verify user access

### 6.3 Support Ready
- FAQ prepared
- Support team briefed
- Quick fix procedures ready

## Migration Timeline

```
Day 1 Morning:
- [ ] Run backups
- [ ] Analyze data
- [ ] Disable new subscriptions

Day 1 Afternoon:
- [ ] Execute cleanup
- [ ] Deploy new webhook
- [ ] Initial testing

Day 2 Morning:
- [ ] Process refunds
- [ ] Send notifications
- [ ] Test thoroughly

Day 2 Afternoon:
- [ ] Fix any issues found
- [ ] Prepare for launch

Day 3:
- [ ] Enable for all users
- [ ] Monitor closely
- [ ] Handle support
```

## Success Metrics

1. **Zero nested structures** in Firebase
2. **All webhooks create clean structure**
3. **Three-Pillar correctly identifies user types**
4. **No access issues for new subscribers**
5. **Support tickets < 5**

## Contingency Plans

### If Migration Fails
1. Restore from backups
2. Revert webhook code
3. Communicate delay to users

### If Users Can't Resubscribe
1. Manual subscription creation
2. Direct support line
3. Extended free premium as compensation

---

Next: [Pre-Migration Checklist →](03-PRE-MIGRATION-CHECKLIST.md)