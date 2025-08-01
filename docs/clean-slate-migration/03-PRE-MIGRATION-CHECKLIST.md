# Pre-Migration Checklist

## ⚠️ DO NOT PROCEED UNTIL ALL ITEMS ARE CHECKED

### 1. Environment Verification

- [ ] **Firebase Admin Key** exists at `/firebase-admin-key.json`
- [ ] **Node.js version** >= 16.x
- [ ] **Firebase CLI** installed and authenticated
- [ ] **Stripe CLI** installed (for subscription management)

### 2. Access Verification

- [ ] **Firebase Console** access with admin privileges
- [ ] **Stripe Dashboard** access with refund permissions
- [ ] **Production database** access confirmed
- [ ] **Backup location** has sufficient space

### 3. Code Preparation

- [ ] **Migration script** reviewed and understood
  ```bash
  cat scripts/clean-slate-subscription-migration.js
  ```
- [ ] **Clean webhook** code reviewed
  ```bash
  cat functions/src/index-clean.ts
  ```
- [ ] **Three-Pillar system** verified working
- [ ] **Git branch** created for migration
  ```bash
  git checkout -b clean-slate-migration
  ```

### 4. Communication Prepared

- [ ] **User notification** email template ready
- [ ] **Support team** briefed on migration
- [ ] **FAQ document** prepared for common questions
- [ ] **Status page** update ready

### 5. Stripe Verification

- [ ] **Webhook endpoint** URL confirmed
- [ ] **Webhook secret** in environment variables
- [ ] **Price IDs** mapped correctly:
  - Monthly: `price_1RakzXHdrJomitOwZc0HJC4J`
  - Yearly: `price_1RakzXHdrJomitOwE7B56erf`
- [ ] **Test mode** credentials available

### 6. Backup Verification

- [ ] **Backup script** tested in dry-run mode
- [ ] **Backup location** accessible and writable
- [ ] **Restoration process** documented
- [ ] **Backup integrity** can be verified

### 7. Monitoring Setup

- [ ] **Firebase Console** open in browser
- [ ] **Stripe Dashboard** open in browser
- [ ] **Application logs** accessible
- [ ] **Error tracking** ready (Sentry/etc)

### 8. Testing Environment

- [ ] **Test user account** available
- [ ] **Test credit card** for Stripe testing
- [ ] **Local environment** can run scripts
- [ ] **VPN/Firewall** won't block operations

### 9. Risk Assessment

- [ ] **User count** documented: _____ total users
- [ ] **Premium count** documented: _____ premium users
- [ ] **Revenue impact** calculated: $_____ in refunds
- [ ] **Downtime window** communicated: _____ hours

### 10. Final Checks

- [ ] **No active marketing campaigns** running
- [ ] **No scheduled user communications** conflicting
- [ ] **Database backup** automated backups running
- [ ] **Team availability** for migration window

## Critical Environment Variables

Verify these are set:
```bash
echo $STRIPE_SECRET_KEY
echo $STRIPE_WEBHOOK_SECRET
echo $NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

## Test Commands

Run these to verify setup:
```bash
# Test Firebase connection
node -e "const admin = require('firebase-admin'); console.log('Firebase OK');"

# Test script syntax
node scripts/clean-slate-subscription-migration.js --help

# Check disk space
df -h

# Verify Git status
git status
```

## Emergency Contacts

- **Technical Lead**: _____________
- **Stripe Support**: _____________
- **Firebase Support**: ____________
- **Customer Support Manager**: _____

## Final Confirmation

By proceeding with this migration, I confirm:

- [ ] All checklist items are completed
- [ ] Backups are verified
- [ ] Team is ready
- [ ] Users have been notified
- [ ] I understand the risks
- [ ] Rollback plan is ready

**Signed by**: _______________________
**Date**: ___________________________
**Time**: ___________________________

---

⚠️ **STOP** - Do not proceed unless EVERY box is checked!

Next: [Migration Execution Log →](04-MIGRATION-EXECUTION-LOG.md)