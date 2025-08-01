# Quick Reference - Clean Slate Migration

## 🚀 Migration Commands

```bash
# 1. Backup (DRY RUN)
node scripts/clean-slate-subscription-migration.js

# 2. Execute cleanup
node scripts/clean-slate-subscription-migration.js --execute

# 3. Validate migration
node scripts/validate-migration.js

# 4. Deploy new webhook
cd functions
cp src/index-clean.ts src/index.ts
npm run deploy
```

## 📋 Critical Checks

### Before Migration
- [ ] Firebase admin key exists
- [ ] All scripts are executable
- [ ] Backups created successfully
- [ ] Premium users documented

### After Migration
- [ ] No nested structures remain
- [ ] Webhook creates clean structure
- [ ] Three-Pillar recognizes user types
- [ ] Test subscription works

## 🏗️ Clean Structure

```javascript
{
  subscription: {
    status: 'active',
    plan: 'monthly',  // 'free' | 'monthly' | 'yearly'
    stripeSubscriptionId: 'sub_xxx',
    stripeCustomerId: 'cus_xxx',
    stripePriceId: 'price_xxx',
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: false,
    metadata: {
      source: 'stripe',
      createdAt: Timestamp,
      updatedAt: Timestamp
    }
  }
}
```

## ❌ What NOT to have
- NO `subscription.subscription`
- NO `limits` in subscription
- NO `currentUsage` in subscription
- NO `entitlements` in user doc

## 🔍 Problem Users

### esfabiani@outlook.com
- Has nested structure
- Plan conflicts (outer: monthly, inner: free)
- Wrong limits applied

## 💰 Stripe Price IDs
- Monthly: `price_1RakzXHdrJomitOwZc0HJC4J` → $3.99
- Yearly: `price_1RakzXHdrJomitOwE7B56erf` → $39.99

## 🚨 Emergency Contacts
- Stripe Support: support@stripe.com
- Firebase Support: https://firebase.google.com/support

## 📊 Success Metrics
- ✅ 0 nested structures
- ✅ 100% webhook success
- ✅ All premium users can access features
- ✅ < 5 support tickets

---

**Remember**: This migration is VITAL for fixing payment issues!