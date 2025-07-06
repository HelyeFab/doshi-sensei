# Subscription System Documentation

This folder contains all documentation related to the subscription, payment, and entitlements systems.

## 🚨 Critical Documents for Production

1. **[SUBSCRIPTION_ISSUES_FIXES.md](./SUBSCRIPTION_ISSUES_FIXES.md)** ⭐
   - **MUST READ BEFORE PRODUCTION**
   - Contains all critical issues found and their fixes
   - Production readiness assessment
   - Instructions for fixing broken subscriptions

## 📋 System Documentation

### Core System Docs
- **[FREEMIUM_SYSTEM_DOCUMENTATION.md](./FREEMIUM_SYSTEM_DOCUMENTATION.md)** - Complete freemium system overview
- **[SUBSCRIPTION_STRIPE_FLOW.md](./SUBSCRIPTION_STRIPE_FLOW.md)** - How Stripe integration works
- **[USER_ENTITLEMENTS.md](./USER_ENTITLEMENTS.md)** - Visual guide to user access levels

### Entitlements System
- **[ENTITLEMENTS_SYSTEM.md](./ENTITLEMENTS_SYSTEM.md)** - Technical documentation of the entitlements system
- **[ENTITLEMENTS_MIGRATION_PLAN.md](./ENTITLEMENTS_MIGRATION_PLAN.md)** - Plan for migrating to centralized entitlements
- **[ENTITLEMENTS_TEST_PLAN.md](./ENTITLEMENTS_TEST_PLAN.md)** - Testing strategy for entitlements
- **[ENTITLEMENTS_TESTING_CHECKLIST.md](./ENTITLEMENTS_TESTING_CHECKLIST.md)** - Detailed testing checklist

### Setup Guides
- **[STRIPE_SETUP_GUIDE.md](./STRIPE_SETUP_GUIDE.md)** - How to set up Stripe
- **[STRIPE_DOMAIN_UPDATE_GUIDE.md](./STRIPE_DOMAIN_UPDATE_GUIDE.md)** - Updating Stripe for new domains

### Technical References
- **[PREMIUM_TYPE_REFERENCES.md](./PREMIUM_TYPE_REFERENCES.md)** - Where 'monthly'/'yearly' types are used
- **[app_subscription_auth_sync_plan.md](./app_subscription_auth_sync_plan.md)** - Architecture plan
- **[doshi_freemium_flow_plan.md](./doshi_freemium_flow_plan.md)** - Freemium flow design

## 🔧 Quick Reference

### Current Issues Status
- ❌ **Stripe Webhook Reliability** - Critical issue, webhooks not updating Firebase
- ❌ **Data Structure Consistency** - Subscription data can have incorrect nesting
- ✅ **Admin Dashboard** - Fixed but needs testing

### Before Going to Production
1. Read **SUBSCRIPTION_ISSUES_FIXES.md** completely
2. Fix all existing user subscriptions
3. Test Stripe webhooks thoroughly
4. Set up monitoring and alerts
5. Have emergency response plan ready

### Key Scripts
- `scripts/fix-subscription-structure.js` - Fix all users with nested structures
- `scripts/fix-emmanuel-subscription.js` - Fix specific user subscription
- `scripts/fix-bruno-subscription.js` - Fix Stripe payment without Firebase update

## 📞 Emergency Contacts
- Stripe Support: [dashboard.stripe.com/support](https://dashboard.stripe.com/support)
- Firebase Support: [firebase.google.com/support](https://firebase.google.com/support)

## ⚠️ WARNING
The subscription system handles real money. Do not deploy to production until all issues in SUBSCRIPTION_ISSUES_FIXES.md are resolved.